import { NextRequest, NextResponse } from "next/server"
import { checkClaudeError } from "@/lib/alertOwner"

export async function POST(request: NextRequest) {
  let body: { ingredient: string; amount?: string; recipeTitle?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { ingredient, amount, recipeTitle } = body
  if (!ingredient) return NextResponse.json({ error: "ingredient required" }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })

  const ingredientFull = amount ? `${amount} (${ingredient})` : ingredient

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
        max_tokens: 80,
        messages: [{
          role: "user",
          content: `Suggest one practical cooking substitute for "${ingredientFull}"${recipeTitle ? ` in a recipe for "${recipeTitle}"` : ""}. Reply with TWO lines only:
Line 1: the substitute name only (e.g. "walnuts")
Line 2: the equivalent quantity and any prep note (e.g. "100g walnuts, roughly chopped")
No extra text.`,
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      await checkClaudeError(res.status, "/api/recipes/suggest-substitute")
      return NextResponse.json({ error: data.error?.message ?? "AI error" }, { status: res.status })
    }

    const text = data.content?.[0]?.text?.trim() ?? ""
    const lines = text.split("\n").map((l: string) => l.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
    const display = lines[0] ?? ""
    const substitute = lines[1] ?? lines[0] ?? ""
    if (!substitute) return NextResponse.json({ error: "No substitute found" }, { status: 422 })

    return NextResponse.json({ substitute, display })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to suggest substitute" }, { status: 500 })
  }
}
