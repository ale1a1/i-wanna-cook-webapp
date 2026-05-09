import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)

  const number = searchParams.get("number") || "24"
  const offset = searchParams.get("offset") || "0"
  const params = new URLSearchParams({ apiKey, number, offset, addRecipeInformation: "true" })

  const maxReadyTime = searchParams.get("maxReadyTime")
  if (maxReadyTime) params.set("maxReadyTime", maxReadyTime)

  const minReadyTime = searchParams.get("minReadyTime")
  if (minReadyTime) params.set("minReadyTime", minReadyTime)

  const diet = searchParams.get("diet")
  if (diet) params.set("diet", diet)

  const cuisine = searchParams.get("cuisine")
  if (cuisine) params.set("cuisine", cuisine)

  const includeIngredients = searchParams.get("includeIngredients")
  if (includeIngredients) params.set("includeIngredients", includeIngredients)

  const maxPricePerServing = searchParams.get("maxPricePerServing")
  if (maxPricePerServing) params.set("maxPricePerServing", maxPricePerServing)

  const minPricePerServing = searchParams.get("minPricePerServing")
  if (minPricePerServing) params.set("minPricePerServing", minPricePerServing)

  const minHealthScore = searchParams.get("minHealthScore")
  if (minHealthScore) params.set("minHealthScore", minHealthScore)

  const maxHealthScore = searchParams.get("maxHealthScore")
  if (maxHealthScore) params.set("maxHealthScore", maxHealthScore)

  // taste
  const minSweetness = searchParams.get("minSweetness")
  if (minSweetness) params.set("minSweetness", minSweetness)

  const minSaltiness = searchParams.get("minSaltiness")
  if (minSaltiness) params.set("minSaltiness", minSaltiness)

  const minSpiciness = searchParams.get("minSpiciness")
  if (minSpiciness) params.set("minSpiciness", minSpiciness)

  const query = searchParams.get("query")
  if (query) params.set("query", query)

  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
  }
}
