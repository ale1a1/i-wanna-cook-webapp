import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

const FREE_SEARCH_LIMIT = 10

const MIN_RESULTS = 12
const BATCH_SIZE = 24
const MAX_PAGES = 5 // safety cap — never fetch more than 5 pages per request

function hasGoodInstructions(recipe: any): boolean {
  const steps: any[] = recipe.analyzedInstructions?.[0]?.steps ?? []
  if (steps.length < 4) return false

  const ingredients: string[] = (recipe.extendedIngredients ?? []).map((i: any) =>
    (i.name ?? "").toLowerCase()
  )
  if (ingredients.length === 0) return true // no ingredients to check against, allow it

  const stepsText = steps.map((s: any) => (s.step ?? "").toLowerCase()).join(" ")
  const mentioned = ingredients.filter(ing => ing.length > 2 && stepsText.includes(ing))
  const coverage = mentioned.length / ingredients.length

  return coverage >= 0.5
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)

  // Rate limiting for free users
  const userId = searchParams.get("userId")
  const isPremium = searchParams.get("isPremium") === "true"
  const isLoadMore = parseInt(searchParams.get("offset") || "0", 10) > 0

  if (userId && !isPremium && !isLoadMore) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split("T")[0]

    const usage = await pool.query(
      "SELECT count FROM search_usage WHERE user_id = $1 AND week_start = $2",
      [userId, weekStartStr]
    )
    const currentCount = usage.rows[0]?.count ?? 0
    if (currentCount >= FREE_SEARCH_LIMIT) {
      return NextResponse.json({ error: "Weekly search limit reached", code: "SEARCH_LIMIT", limit: FREE_SEARCH_LIMIT, used: currentCount }, { status: 429 })
    }
    await pool.query(
      `INSERT INTO search_usage (user_id, week_start, count) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, week_start) DO UPDATE SET count = search_usage.count + 1`,
      [userId, weekStartStr]
    )
  }

  // Client passes offset for "Load more" — we use it as our starting page
  const clientOffset = parseInt(searchParams.get("offset") || "0", 10)
  const requestedNumber = parseInt(searchParams.get("number") || "24", 10)

  const buildSpoonacularParams = (offset: number) => {
    const params = new URLSearchParams({ apiKey, number: String(BATCH_SIZE), offset: String(offset), addRecipeInformation: "true", fillIngredients: "true", addRecipeInstructions: "true" })

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
    const minSweetness = searchParams.get("minSweetness")
    if (minSweetness) params.set("minSweetness", minSweetness)
    const minSaltiness = searchParams.get("minSaltiness")
    if (minSaltiness) params.set("minSaltiness", minSaltiness)
    const minSpiciness = searchParams.get("minSpiciness")
    if (minSpiciness) params.set("minSpiciness", minSpiciness)
    const query = searchParams.get("query")
    if (query) params.set("query", query)
    const sort = searchParams.get("sort")
    if (sort) params.set("sort", sort)
    const ignorePantry = searchParams.get("ignorePantry")
    if (ignorePantry) params.set("ignorePantry", ignorePantry)
    const minCalories = searchParams.get("minCalories")
    if (minCalories) params.set("minCalories", minCalories)
    const maxCalories = searchParams.get("maxCalories")
    if (maxCalories) params.set("maxCalories", maxCalories)
    const minProtein = searchParams.get("minProtein")
    if (minProtein) params.set("minProtein", minProtein)
    const intolerances = searchParams.get("intolerances")
    if (intolerances) params.set("intolerances", intolerances)
    const type = searchParams.get("type")
    if (type) params.set("type", type)
    const excludeIngredients = searchParams.get("excludeIngredients")
    if (excludeIngredients) params.set("excludeIngredients", excludeIngredients)

    return params
  }

  try {
    const good: any[] = []
    let offset = clientOffset
    let totalAvailable = Infinity
    let pages = 0

    while (good.length < MIN_RESULTS && offset < totalAvailable && pages < MAX_PAGES) {
      const params = buildSpoonacularParams(offset)
      const res = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`,
        { cache: "no-store" }
      )

      if (!res.ok) {
        const error = await res.text()
        return NextResponse.json({ error }, { status: res.status })
      }

      const data = await res.json()
      totalAvailable = data.totalResults ?? 0
      const batch: any[] = data.results ?? []

      if (batch.length === 0) break

      const filtered = batch.filter(hasGoodInstructions)
      good.push(...filtered)
      offset += BATCH_SIZE
      pages++
    }

    return NextResponse.json({
      results: good.slice(0, requestedNumber),
      totalResults: totalAvailable,
      nextOffset: offset < totalAvailable ? offset : null,
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
  }
}
