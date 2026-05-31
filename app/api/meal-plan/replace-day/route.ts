import { NextRequest, NextResponse } from "next/server"

// Re-generates a single day using the original plan filters.
// Falls back to duplicating the most nutrient-similar other day if Spoonacular returns nothing usable.
export async function POST(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 })

  try {
    const { day, filtersJson, currentWeek } = await request.json()
    // day: "monday" | "tuesday" | ...
    // filtersJson: the filters_json stored with the plan
    // currentWeek: the full week plan data (to use as fallback)
    if (!day || !filtersJson) {
      return NextResponse.json({ error: "day and filtersJson required" }, { status: 400 })
    }

    const f = filtersJson
    const mealsPerDay = Math.min(6, Math.max(3, parseInt(f.mealsPerDay ?? "3")))

    const fetchDay = async (targetCalories: string) => {
      const params = new URLSearchParams({ apiKey, targetCalories, timeFrame: "week" })
      if (f.diet && f.diet !== "none") params.set("diet", f.diet)
      if (f.exclude) params.set("exclude", f.exclude)
      params.set("_ts", Date.now().toString() + Math.random().toString(36).slice(2))
      const res = await fetch(`https://api.spoonacular.com/mealplanner/generate?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if ((d?.code ?? res.status) === 402) throw new Error("QUOTA")
        throw new Error(d?.message ?? "Spoonacular error")
      }
      const data = await res.json()
      return data.week?.[day] ?? null
    }

    let newDay = await fetchDay(f.calories ?? "2000")

    // If >3 meals per day, fetch a second plan and stitch extra meals
    if (newDay && mealsPerDay > 3) {
      const extraCalories = String(Math.round(parseInt(f.calories ?? "2000") * 0.5))
      const extraPlan = await fetchDay(extraCalories).catch(() => null)
      if (extraPlan) {
        const extraCount = mealsPerDay - 3
        const seen = new Set(newDay.meals.map((m: any) => m.id))
        const extras = (extraPlan.meals ?? []).slice(0, extraCount).filter((m: any) => !seen.has(m.id))
        newDay = {
          meals: [...newDay.meals, ...extras],
          nutrients: {
            calories: (newDay.nutrients?.calories ?? 0) + (extraPlan.nutrients?.calories ?? 0) * (extraCount / 3),
            protein: (newDay.nutrients?.protein ?? 0) + (extraPlan.nutrients?.protein ?? 0) * (extraCount / 3),
            fat: (newDay.nutrients?.fat ?? 0) + (extraPlan.nutrients?.fat ?? 0) * (extraCount / 3),
            carbohydrates: (newDay.nutrients?.carbohydrates ?? 0) + (extraPlan.nutrients?.carbohydrates ?? 0) * (extraCount / 3),
          }
        }
      }
    }

    // Fallback: duplicate most nutrient-similar other day from current week
    if (!newDay && currentWeek) {
      const targetCal = parseFloat(f.calories ?? "2000")
      let bestDay = null
      let bestDiff = Infinity
      for (const [k, v] of Object.entries(currentWeek as Record<string, any>)) {
        if (k === day) continue
        const diff = Math.abs((v?.nutrients?.calories ?? 0) - targetCal)
        if (diff < bestDiff) { bestDiff = diff; bestDay = v }
      }
      newDay = bestDay
    }

    if (!newDay) return NextResponse.json({ error: "Could not generate replacement day" }, { status: 422 })

    return NextResponse.json({ day: newDay })
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: e.message ?? "Failed to replace day" }, { status: 500 })
  }
}
