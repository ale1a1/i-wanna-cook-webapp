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

  try {
    // Always fetch plan A
    const planA = await fetchOnePlan(apiKey, targetCalories, diet, exclude)

    let merged = planA

    if (mealsPerDay > 3) {
      // Fetch plan B for extra meals — use slightly lower calories to avoid doubling
      const extraCalories = String(Math.round(parseInt(targetCalories) * 0.5))
      const planB = await fetchOnePlan(apiKey, extraCalories, diet, exclude)

      // Stitch: take first 3 meals from planA, add (mealsPerDay - 3) meals from planB per day
      const extraCount = mealsPerDay - 3
      merged = { week: {} as any }

      for (const day of DAY_KEYS) {
        const dayA = planA.week[day]
        const dayB = planB.week[day]
        if (!dayA) continue

        const extraMeals = dayB?.meals?.slice(0, extraCount) ?? []
        // deduplicate by id
        const seen = new Set(dayA.meals.map((m: any) => m.id))
        const unique = extraMeals.filter((m: any) => !seen.has(m.id))

        merged.week[day] = {
          meals: [...dayA.meals, ...unique],
          nutrients: {
            calories: (dayA.nutrients?.calories ?? 0) + (dayB?.nutrients?.calories ?? 0) * (extraCount / 3),
            protein: (dayA.nutrients?.protein ?? 0) + (dayB?.nutrients?.protein ?? 0) * (extraCount / 3),
            fat: (dayA.nutrients?.fat ?? 0) + (dayB?.nutrients?.fat ?? 0) * (extraCount / 3),
            carbohydrates: (dayA.nutrients?.carbohydrates ?? 0) + (dayB?.nutrients?.carbohydrates ?? 0) * (extraCount / 3),
          }
        }
      }
    }

    return NextResponse.json(merged)
  } catch (e: any) {
    if (e.message === "QUOTA") return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
    return NextResponse.json({ error: e.message ?? "Failed to generate meal plan" }, { status: 500 })
  }
}
