import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const food = request.nextUrl.searchParams.get("food")
  if (!food) return NextResponse.json({ error: "food param required" }, { status: 400 })

  try {
    const url = `https://api.spoonacular.com/food/wine/pairing?food=${encodeURIComponent(food)}&apiKey=${process.env.SPOONACULAR_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message ?? "Failed to fetch wine pairing" }, { status: res.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch wine pairing" }, { status: 500 })
  }
}
