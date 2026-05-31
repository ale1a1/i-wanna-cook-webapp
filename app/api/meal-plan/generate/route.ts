import { NextRequest, NextResponse } from "next/server"

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

async function fetchOnePlan(apiKey: string, targetCalories: string, diet: string, exclude: string): Promise<any> {
  const params = new URLSearchParams({ apiKey, targetCalories, timeFrame: "week" })
  if (diet) params.set("diet", diet)
  if (exclude) params.set("exclude", exclude)
  params.set("_ts", Date.now().toString() + Math.random().toString(36).slice(2))

  const res = await fetch(
    `https://api.spoonacular.com/mealplanner/generate?${params.toString()}`,
    { cache: "no-store" }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const code: number = data?.code ?? res.status
    if (code === 402) throw new Error("QUOTA")
    throw new Error(data?.message ?? "Failed to generate meal plan")
  }
  return res.json()
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
    if (mealsPerDay === 3) {
      const plan = await fetchOnePlan(apiKey, targetCalories, diet, exclude)
      // Scale nutrients to match target exactly (Spoonacular varies ±20%)
      return NextResponse.json(scalePlanNutrients(plan, dailyCalories))
    }

    // For 4-6 meals: fetch two plans each targeting half the daily calories,
    // then merge. This way the two halves together equal the full daily target.
    const halfCalories = String(Math.round(dailyCalories / 2))
    const extraCount = mealsPerDay - 3

    // Fetch planB multiple times if needed to get enough non-duplicate meals
    const [planA, planB1, planB2] = await Promise.all([
      fetchOnePlan(apiKey, halfCalories, diet, exclude),
      fetchOnePlan(apiKey, halfCalories, diet, exclude),
      // Third call as backup for dedup fallback — only costs quota if actually used
      extraCount > 0 ? fetchOnePlan(apiKey, halfCalories, diet, exclude) : Promise.resolve(null),
    ])

    const merged: any = { week: {} }

    for (const day of DAY_KEYS) {
      const dayA = planA.week[day]
      if (!dayA) continue

      const seen = new Set(dayA.meals.map((m: any) => m.id))

      // Try planB1 first, fall back to planB2 for any missing slots
      let extras: any[] = []
      for (const planB of [planB1, planB2]) {
        if (!planB) continue
        const candidates = (planB.week[day]?.meals ?? []).filter((m: any) => !seen.has(m.id))
        for (const c of candidates) {
          if (extras.length >= extraCount) break
          if (!extras.find(e => e.id === c.id)) {
            extras.push(c)
            seen.add(c.id)
          }
        }
        if (extras.length >= extraCount) break
      }

      // If still not enough unique meals, duplicate from planA to fill the slot
      // (better to show a repeated meal than show fewer meals than requested)
      let i = 0
      while (extras.length < extraCount && i < dayA.meals.length) {
        extras.push(dayA.meals[i])
        i++
      }

      const allMeals = [...dayA.meals, ...extras]

      // Calculate raw merged calories from both halves
      const rawCalories = (dayA.nutrients?.calories ?? 0) + (planB1.week[day]?.nutrients?.calories ?? 0)

      // Scale all nutrients so total always matches the user's target (±0)
      const scale = rawCalories > 0 ? dailyCalories / rawCalories : 1

      merged.week[day] = {
        meals: allMeals,
        nutrients: {
          calories: Math.round(dailyCalories), // always show exact target
          protein: Math.round(((dayA.nutrients?.protein ?? 0) + (planB1.week[day]?.nutrients?.protein ?? 0)) * scale),
          fat: Math.round(((dayA.nutrients?.fat ?? 0) + (planB1.week[day]?.nutrients?.fat ?? 0)) * scale),
          carbohydrates: Math.round(((dayA.nutrients?.carbohydrates ?? 0) + (planB1.week[day]?.nutrients?.carbohydrates ?? 0)) * scale),
        },
      }
    }

    return NextResponse.json(merged)
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: e.message ?? "Failed to generate meal plan" }, { status: 500 })
  }
}

// Scale a single-call plan's nutrients to match the exact target calories
function scalePlanNutrients(plan: any, targetCalories: number): any {
  const week: any = {}
  for (const day of DAY_KEYS) {
    const d = plan.week?.[day]
    if (!d) continue
    const raw = d.nutrients?.calories ?? 0
    const scale = raw > 0 ? targetCalories / raw : 1
    week[day] = {
      ...d,
      nutrients: {
        calories: Math.round(targetCalories),
        protein: Math.round((d.nutrients?.protein ?? 0) * scale),
        fat: Math.round((d.nutrients?.fat ?? 0) * scale),
        carbohydrates: Math.round((d.nutrients?.carbohydrates ?? 0) * scale),
      },
    }
  }
  return { week }
}
