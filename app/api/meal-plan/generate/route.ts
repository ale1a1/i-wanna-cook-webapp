import { NextRequest, NextResponse } from "next/server"

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

async function fetchWeekPlan(apiKey: string, targetCalories: string, diet: string, exclude: string): Promise<any> {
  const params = new URLSearchParams({ apiKey, targetCalories, timeFrame: "week" })
  if (diet) params.set("diet", diet)
  if (exclude) params.set("exclude", exclude)
  params.set("_ts", Date.now().toString() + Math.random().toString(36).slice(2))
  const res = await fetch(`https://api.spoonacular.com/mealplanner/generate?${params.toString()}`, { cache: "no-store" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if ((data?.code ?? res.status) === 402) throw new Error("QUOTA")
    throw new Error(data?.message ?? "Failed to generate meal plan")
  }
  return res.json()
}

// Search for small snack/extra meals that fit within a calorie budget
async function fetchExtraMeals(apiKey: string, maxCalories: number, diet: string, exclude: string, excludeIds: Set<number>): Promise<any[]> {
  const params = new URLSearchParams({
    apiKey,
    number: "20",
    maxCalories: String(Math.round(maxCalories)),
    minCalories: String(Math.round(maxCalories * 0.3)),
    addRecipeInformation: "true",
    sort: "random",
  })
  if (diet && diet !== "none") params.set("diet", diet)
  if (exclude) params.set("excludeIngredients", exclude)

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`, { cache: "no-store" })
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).filter((r: any) => !excludeIds.has(r.id))
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const targetCalories = searchParams.get("targetCalories") || "2000"
  const diet = searchParams.get("diet") || ""
  const exclude = searchParams.get("exclude") || ""
  const mealsPerDay = Math.min(6, Math.max(3, parseInt(searchParams.get("mealsPerDay") || "3")))
  const dailyCalories = parseInt(targetCalories)

  try {
    // Always fetch the main plan at the exact daily target — Spoonacular splits this
    // into 3 meals (breakfast/lunch/dinner) that together hit the calorie goal
    const mainPlan = await fetchWeekPlan(apiKey, targetCalories, diet, exclude)

    if (mealsPerDay === 3) {
      return NextResponse.json(mainPlan)
    }

    // For extra meals (4-6): each main plan day already covers the full calorie target
    // across 3 meals. Extra meals are snacks/small meals carved OUT of that budget —
    // not added on top. We redistribute: reduce each main meal's calorie contribution
    // and fill the gap with small extras.
    //
    // Strategy: extra meals budget = 15% of daily target per extra slot
    // (a snack is typically ~200-400 kcal for a 2000-2500 kcal diet)
    const extraCount = mealsPerDay - 3
    const extraBudgetPerMeal = Math.round(dailyCalories * 0.15)

    // Collect all recipe IDs from the main plan to avoid duplicates
    const allMainIds = new Set<number>()
    for (const day of DAY_KEYS) {
      for (const meal of (mainPlan.week?.[day]?.meals ?? [])) {
        allMainIds.add(meal.id)
      }
    }

    // Fetch a pool of snack-sized recipes once, reuse across days
    const extraPool = await fetchExtraMeals(apiKey, extraBudgetPerMeal, diet, exclude, allMainIds)

    const merged: any = { week: {} }
    let poolIndex = 0

    for (const day of DAY_KEYS) {
      const dayData = mainPlan.week?.[day]
      if (!dayData) continue

      const extras: any[] = []
      const usedThisDay = new Set(dayData.meals.map((m: any) => m.id))

      for (let i = 0; i < extraCount; i++) {
        // Find next pool entry not already used today
        let found = false
        for (let attempt = 0; attempt < extraPool.length; attempt++) {
          const candidate = extraPool[(poolIndex + attempt) % extraPool.length]
          if (!usedThisDay.has(candidate.id)) {
            extras.push({
              id: candidate.id,
              title: candidate.title,
              readyInMinutes: candidate.readyInMinutes ?? 0,
              servings: candidate.servings ?? 1,
            })
            usedThisDay.add(candidate.id)
            poolIndex = (poolIndex + attempt + 1) % Math.max(extraPool.length, 1)
            found = true
            break
          }
        }
        // If pool exhausted, reuse a main meal as placeholder
        if (!found && dayData.meals.length > 0) {
          extras.push(dayData.meals[i % dayData.meals.length])
        }
      }

      merged.week[day] = {
        meals: [...dayData.meals, ...extras],
        // Nutrients stay exactly as Spoonacular returned for the 3 main meals —
        // extras are snacks carved from the same budget, not additions
        nutrients: dayData.nutrients,
      }
    }

    return NextResponse.json(merged)
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: e.message ?? "Failed to generate meal plan" }, { status: 500 })
  }
}
