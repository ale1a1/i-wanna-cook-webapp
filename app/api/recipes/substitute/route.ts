import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const ingredient = request.nextUrl.searchParams.get("ingredient")
  if (!ingredient) return NextResponse.json({ error: "ingredient param required" }, { status: 400 })

  try {
    const url = `https://api.spoonacular.com/food/ingredients/substitutes?ingredientName=${encodeURIComponent(ingredient)}&apiKey=${process.env.SPOONACULAR_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message ?? "Failed to fetch substitutes" }, { status: res.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch substitutes" }, { status: 500 })
  }
}
