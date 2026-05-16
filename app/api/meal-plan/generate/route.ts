import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const targetCalories = searchParams.get("targetCalories") || "2000"
  const diet = searchParams.get("diet") || ""
  const exclude = searchParams.get("exclude") || ""
  const timeFrame = searchParams.get("timeFrame") || "week"

  const params = new URLSearchParams({ apiKey, targetCalories, timeFrame })
  if (diet) params.set("diet", diet)
  if (exclude) params.set("exclude", exclude)

  try {
    const res = await fetch(
      `https://api.spoonacular.com/mealplanner/generate?${params.toString()}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const code: number = data?.code ?? res.status
      if (code === 402) return NextResponse.json({ error: "Daily API limit reached. Try again tomorrow." }, { status: 402 })
      return NextResponse.json({ error: data?.message ?? "Failed to generate meal plan" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 500 })
  }
}
