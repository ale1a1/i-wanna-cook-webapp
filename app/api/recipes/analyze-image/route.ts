import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let body: { base64: string; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { base64, mimeType = "image/jpeg" } = body
  if (!base64) return NextResponse.json({ error: "Missing base64 image data" }, { status: 400 })

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
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            {
              type: "text",
              text: `Identify the cooking ingredients visible in this image. Reply with ONLY a raw JSON array of lowercase strings, no markdown, no explanation. Example: ["egg","tomato","chicken"]. If no ingredients are visible, reply with exactly: []`,
            },
          ],
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message ?? "AI error" }, { status: res.status })
    }

    const raw = data.content?.[0]?.text ?? "[]"
    const text = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim()
    let ingredients: string[] = []
    try {
      const parsed = JSON.parse(text)
      ingredients = Array.isArray(parsed) ? parsed.map((s: string) => String(s).toLowerCase()) : []
    } catch {
      const matches = text.match(/"([^"]+)"/g)
      ingredients = matches ? matches.map((m: string) => m.replace(/"/g, "").toLowerCase()) : []
    }

    if (ingredients.length === 0) {
      return NextResponse.json({ error: "No ingredients detected. Try a clearer photo of a single ingredient." }, { status: 422 })
    }

    return NextResponse.json({ ingredient: ingredients[0], all: ingredients })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to analyze image" }, { status: 500 })
  }
}
