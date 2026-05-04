import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/${params.id}/information?apiKey=${apiKey}&includeNutrition=true`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 })
  }
}
