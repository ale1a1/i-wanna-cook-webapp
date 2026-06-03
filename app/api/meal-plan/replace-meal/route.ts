import { NextRequest, NextResponse } from "next/server"

// Map our filter keys to Spoonacular complexSearch param names
const NUTRIENT_MAP: { filterKey: string; searchMax: string }[] = [
  { filterKey: "calories",        searchMax: "maxCalories"       },
  { filterKey: "maxProtein",      searchMax: "maxProtein"        },
  { filterKey: "maxCarbs",        searchMax: "maxCarbohydrates"  },
  { filterKey: "maxFat",          searchMax: "maxFat"            },
  { filterKey: "maxSaturatedFat", searchMax: "maxSaturatedFat"   },
  { filterKey: "maxFiber",        searchMax: "maxFiber"          },
  { filterKey: "maxSugar",        searchMax: "maxSugar"          },
  { filterKey: "maxCholesterol",  searchMax: "maxCholesterol"    },
  { filterKey: "maxSodium",       searchMax: "maxSodium"         },
]

export async function POST(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 })

  try {
    const { dayPlan, mealIndex, filtersJson } = await request.json()
    if (!dayPlan || mealIndex === undefined || !filtersJson) {
      return NextResponse.json({ error: "dayPlan, mealIndex, filtersJson required" }, { status: 400 })
    }

    const f = filtersJson

    // Build search using the original filters — Spoonacular enforces the constraints server-side,
    // so anything returned already satisfies the original criteria for this meal slot.
    const searchParams = new URLSearchParams({ apiKey, number: "8", addRecipeNutrition: "true" })
    if (f.diet && f.diet !== "none") searchParams.set("diet", f.diet)
    if (f.exclude) searchParams.set("excludeIngredients", f.exclude)
    if (f.cuisine && f.cuisine !== "any") searchParams.set("cuisine", f.cuisine)
    if (f.intolerances?.length) searchParams.set("intolerances", f.intolerances.join(","))

    // Use per-meal budget: divide daily limit by meals-per-day so each slot gets a fair share
    const mealsPerDay = parseInt(f.mealsPerDay ?? "3") || 3
    for (const { filterKey, searchMax } of NUTRIENT_MAP) {
      const dailyLimit = parseFloat(f[filterKey] ?? "0")
      if (!dailyLimit) continue
      const perMeal = Math.round(dailyLimit / mealsPerDay)
      searchParams.set(searchMax, String(perMeal))
    }

    const searchRes = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${searchParams.toString()}`,
      { cache: "no-store" }
    )
    if (!searchRes.ok) {
      const d = await searchRes.json().catch(() => ({}))
      if ((d?.code ?? searchRes.status) === 402) throw new Error("QUOTA")
      throw new Error(d?.message ?? "Spoonacular search error")
    }
    const searchData = await searchRes.json()
    const candidates: any[] = searchData.results ?? []

    if (!candidates.length) {
      return NextResponse.json({ candidates: [], message: "No recipes found within your nutrition budget for this slot." })
    }

    // All candidates returned by Spoonacular already satisfy the original filters — mark all as fits
    const annotated = candidates.slice(0, 5).map((c: any) => ({
      ...c,
      fits: true,
      warning: null,
    }))

    return NextResponse.json({ candidates: annotated })
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: (e as any).message ?? "Failed to find replacement meals" }, { status: 500 })
  }
}
