import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let body: { ingredient: string; recipeTitle?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { ingredient, recipeTitle } = body
  if (!ingredient) return NextResponse.json({ error: "ingredient required" }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })

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
        max_tokens: 60,
        messages: [{
          role: "user",
          content: `Suggest one practical cooking substitute for "${ingredient}"${recipeTitle ? ` in a recipe for "${recipeTitle}"` : ""}. Reply with ONLY the substitute name, nothing else. Example: "Greek yogurt"`,
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message ?? "AI error" }, { status: res.status })
    }

    const substitute = data.content?.[0]?.text?.trim().replace(/^["']|["']$/g, "") ?? ""
    if (!substitute) return NextResponse.json({ error: "No substitute found" }, { status: 422 })

    return NextResponse.json({ substitute })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to suggest substitute" }, { status: 500 })
  }
}
