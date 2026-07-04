import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { checkClaudeError } from "@/lib/alertOwner"

const FREE_SCAN_LIMIT = 3

// Detect the real image type from base64 magic bytes — client-reported mimeType
// (from expo-image-picker) is unreliable and can mismatch the actual file content,
// which Claude's API rejects outright.
function detectMediaType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg"
  if (base64.startsWith("iVBORw0KGgo")) return "image/png"
  if (base64.startsWith("R0lGOD")) return "image/gif"
  if (base64.startsWith("UklGR")) return "image/webp"
  return "image/jpeg"
}

export async function POST(request: NextRequest) {
  let body: { base64: string; mimeType?: string; userId?: string; isPremium?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { base64, userId, isPremium } = body
  if (!base64) return NextResponse.json({ error: "Missing base64 image data" }, { status: 400 })
  const mediaType = detectMediaType(base64)

  if (userId && !isPremium) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split("T")[0]

    const usage = await pool.query(
      "SELECT count FROM scan_usage WHERE user_id = $1 AND week_start = $2",
      [userId, weekStartStr]
    ).catch(() => ({ rows: [] }))

    const currentCount = usage.rows[0]?.count ?? 0
    if (currentCount >= FREE_SCAN_LIMIT) {
      return NextResponse.json({ error: "Weekly scan limit reached", code: "SCAN_LIMIT", limit: FREE_SCAN_LIMIT, used: currentCount }, { status: 429 })
    }
    await pool.query(
      `INSERT INTO scan_usage (user_id, week_start, count) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, week_start) DO UPDATE SET count = scan_usage.count + 1`,
      [userId, weekStartStr]
    ).catch(() => {})
  }

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
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Identify the cooking ingredients visible in this image. Use short generic names suitable for recipe searches — no colours, no adjectives, no brands (e.g. "bell pepper" not "yellow bell pepper", "cheddar" not "cheddar cheese block", "chicken breast" not "raw boneless chicken"). Reply with ONLY a raw JSON array of lowercase strings, no markdown, no explanation. Example: ["egg","tomato","chicken","bell pepper","cheddar"]. If no ingredients are visible, reply with exactly: []`,
            },
          ],
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      await checkClaudeError(res.status, "/api/recipes/analyze-image")
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
