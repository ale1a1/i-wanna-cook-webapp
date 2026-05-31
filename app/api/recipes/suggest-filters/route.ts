import { NextRequest, NextResponse } from "next/server"
import { checkClaudeError } from "@/lib/alertOwner"

export async function POST(request: NextRequest) {
  const { goal } = await request.json()
  if (!goal?.trim()) return NextResponse.json({ error: "goal required" }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })

  const prompt = `You are a nutrition and recipe expert. A user wants recipes for: "${goal.trim()}"

Return ONLY a valid JSON object with Spoonacular complexSearch parameters that best match this goal.
Only include params that are genuinely relevant. Use these exact param names:
- minCalories, maxCalories (number, kcal per serving)
- minProtein, maxProtein (number, grams per serving)
- minCarbs, maxCarbs (number, grams per serving)
- minFat, maxFat (number, grams per serving)
- minFiber, maxFiber (number, grams)
- minSugar, maxSugar (number, grams)
- minSodium, maxSodium (number, mg)
- minSaturatedFat, maxSaturatedFat (number, grams)
- diet (string: "vegetarian", "vegan", "gluten free", "ketogenic", "paleo")
- maxReadyTime (number, minutes)
- sort (string: "calories", "protein", "carbohydrates", "fat", "healthiness", "time", "popularity")
- sortDirection (string: "asc" or "desc")

Example for "bulking high protein": {"minProtein":40,"minCalories":600,"sort":"protein","sortDirection":"desc"}

Return ONLY the JSON object, no explanation.`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      await checkClaudeError(res.status, "/api/recipes/suggest-filters")
      console.error("Anthropic error:", JSON.stringify(data))
      return NextResponse.json({ error: data.error?.message ?? "AI request failed" }, { status: 500 })
    }
    const text = data.content?.[0]?.text?.trim() ?? ""

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 })

    const params = JSON.parse(match[0])
    return NextResponse.json({ params })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "AI request failed" }, { status: 500 })
  }
}
