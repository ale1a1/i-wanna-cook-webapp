import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

// Fetch full nutrition for a list of recipe IDs from Spoonacular
async function fetchNutritionBulk(apiKey: string, ids: number[]): Promise<Record<number, any>> {
  if (!ids.length) return {}
  const res = await fetch(
    `https://api.spoonacular.com/recipes/informationBulk?ids=${ids.join(",")}&includeNutrition=true&apiKey=${apiKey}`,
    { cache: "no-store" }
  )
  if (!res.ok) return {}
  const data: any[] = await res.json()
  const map: Record<number, any> = {}
  for (const r of data) map[r.id] = r
  return map
}

function getNutrient(recipe: any, name: string): number {
  const n = recipe?.nutrition?.nutrients?.find((x: any) => x.name.toLowerCase() === name.toLowerCase())
  const amount = n?.amount ?? 0
  const servings = recipe?.servings ?? 1
  return amount * servings
}

// Map our filter keys to Spoonacular complexSearch param names and nutrient display names
const NUTRIENT_MAP: { filterKey: string; searchMax: string; nutrientName: string }[] = [
  { filterKey: "calories",       searchMax: "maxCalories",      nutrientName: "Calories" },
  { filterKey: "maxProtein",     searchMax: "maxProtein",        nutrientName: "Protein" },
  { filterKey: "maxCarbs",       searchMax: "maxCarbohydrates",  nutrientName: "Carbohydrates" },
  { filterKey: "maxFat",         searchMax: "maxFat",            nutrientName: "Fat" },
  { filterKey: "maxSaturatedFat",searchMax: "maxSaturatedFat",   nutrientName: "Saturated Fat" },
  { filterKey: "maxFiber",       searchMax: "maxFiber",          nutrientName: "Fiber" },
  { filterKey: "maxSugar",       searchMax: "maxSugar",          nutrientName: "Sugar" },
  { filterKey: "maxCholesterol", searchMax: "maxCholesterol",    nutrientName: "Cholesterol" },
  { filterKey: "maxSodium",      searchMax: "maxSodium",         nutrientName: "Sodium" },
]

export async function POST(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 })

  try {
    const { dayPlan, mealIndex, filtersJson } = await request.json()
    // dayPlan: the full DayPlan object { meals: [...], nutrients: {...} }
    // mealIndex: which meal slot is being replaced (0, 1, 2, ...)
    // filtersJson: original filters stored with the plan
    if (!dayPlan || mealIndex === undefined || !filtersJson) {
      return NextResponse.json({ error: "dayPlan, mealIndex, filtersJson required" }, { status: 400 })
    }

    const f = filtersJson
    const otherMealIds: number[] = dayPlan.meals
      .filter((_: any, i: number) => i !== mealIndex)
      .map((m: any) => m.id)

    // Step 1 — fetch full nutrition for the other meals in this day
    const nutritionMap = await fetchNutritionBulk(apiKey, otherMealIds)

    // Step 2 — calculate remaining budget for each constrained nutrient
    const searchParams = new URLSearchParams({ apiKey, number: "10", addRecipeNutrition: "true" })
    if (f.diet && f.diet !== "none") searchParams.set("diet", f.diet)
    if (f.exclude) searchParams.set("excludeIngredients", f.exclude)
    if (f.cuisine && f.cuisine !== "any") searchParams.set("cuisine", f.cuisine)
    if (f.intolerances?.length) searchParams.set("intolerances", f.intolerances.join(","))

    for (const { filterKey, searchMax, nutrientName } of NUTRIENT_MAP) {
      const dailyLimit = parseFloat(f[filterKey] ?? "0")
      if (!dailyLimit) continue
      const alreadyUsed = otherMealIds.reduce((sum, id) => {
        return sum + getNutrient(nutritionMap[id], nutrientName)
      }, 0)
      const remaining = Math.max(50, dailyLimit - alreadyUsed)
      searchParams.set(searchMax, String(Math.round(remaining)))
    }

    // Step 3 — search for candidates
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

    // Step 4 — Claude validates the top candidates fit within ±10% of all active daily constraints
    const dailyBudgetSummary = NUTRIENT_MAP
      .filter(({ filterKey }) => parseFloat(f[filterKey] ?? "0") > 0)
      .map(({ filterKey, nutrientName }) => `${nutrientName}: ${f[filterKey]}`)
      .join(", ")

    const otherMealsSummary = otherMealIds.map(id => {
      const r = nutritionMap[id]
      if (!r) return ""
      return `${r.title}: ${getNutrient(r, "Calories").toFixed(0)} kcal, ${getNutrient(r, "Protein").toFixed(1)}g protein`
    }).filter(Boolean).join("; ")

    const candidateSummaries = candidates.slice(0, 5).map((c: any, i: number) => {
      const n = c.nutrition?.nutrients ?? []
      const get = (name: string) => (n.find((x: any) => x.name.toLowerCase() === name.toLowerCase())?.amount ?? 0)
      const servings = c.servings ?? 1
      return `${i + 1}. ${c.title} — ${(get("calories") * servings).toFixed(0)} kcal, ${(get("protein") * servings).toFixed(1)}g protein, ${(get("carbohydrates") * servings).toFixed(1)}g carbs, ${(get("fat") * servings).toFixed(1)}g fat`
    }).join("\n")

    const prompt = `You are validating meal replacement candidates for a meal plan.

Daily nutrition targets: ${dailyBudgetSummary || "calories: " + f.calories}
Other meals already in this day: ${otherMealsSummary || "none"}

Replacement candidates (nutrition per full serving):
${candidateSummaries}

For each candidate, check if adding it to the existing meals keeps the day within ±10% of each set daily target.
Reply ONLY as JSON: { "results": [ { "index": 1, "fits": true, "warning": null }, { "index": 2, "fits": false, "warning": "Exceeds daily calories by ~180 kcal" }, ... ] }`

    const aiRes = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })

    let validations: { index: number; fits: boolean; warning: string | null }[] = []
    try {
      const raw = (aiRes.content[0] as any).text ?? ""
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
      validations = parsed.results ?? []
    } catch { /* validation unavailable — surface all candidates */ }

    // Annotate candidates with validation result
    const annotated = candidates.slice(0, 5).map((c: any, i: number) => {
      const v = validations.find(x => x.index === i + 1)
      return { ...c, fits: v?.fits ?? true, warning: v?.warning ?? null }
    })

    return NextResponse.json({ candidates: annotated })
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: e.message ?? "Failed to find replacement meals" }, { status: 500 })
  }
}
