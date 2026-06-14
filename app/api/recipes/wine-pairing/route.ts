import { NextRequest, NextResponse } from "next/server"
import { checkClaudeError } from "@/lib/alertOwner"

function isEmpty(data: any) {
  return !data || (!data.pairedWines?.length && !data.productMatches?.length)
}

async function claudeFallback(food: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = `You are a sommelier. Suggest exactly 3 wines that pair well with "${food}".
Return ONLY a valid JSON array, no explanation:
[
  { "name": "Wine Name", "reason": "One sentence why it pairs well." },
  { "name": "Wine Name", "reason": "One sentence why it pairs well." },
  { "name": "Wine Name", "reason": "One sentence why it pairs well." }
]`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) {
      await checkClaudeError(res.status, "/api/recipes/wine-pairing")
      return null
    }

    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() ?? ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return null
    const suggestions = JSON.parse(match[0])
    return { aiSuggestions: suggestions }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const food = request.nextUrl.searchParams.get("food")
  if (!food) return NextResponse.json({ error: "food param required" }, { status: 400 })

  try {
    const url = `https://api.spoonacular.com/food/wine/pairing?food=${encodeURIComponent(food)}&apiKey=${process.env.SPOONACULAR_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message ?? "Failed to fetch wine pairing" }, { status: res.status })

    if (isEmpty(data)) {
      const fallback = await claudeFallback(food)
      if (fallback) return NextResponse.json(fallback)
      return NextResponse.json(data)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch wine pairing" }, { status: 500 })
  }
}
