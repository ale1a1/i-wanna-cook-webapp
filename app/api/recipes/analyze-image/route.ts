import { NextRequest, NextResponse } from "next/server"

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_VISION_CLIENT_EMAIL
  const rawKey = process.env.GOOGLE_VISION_PRIVATE_KEY
  if (!clientEmail || !rawKey) throw new Error(`Google Vision credentials not configured — email: ${!!clientEmail}, key: ${!!rawKey}`)
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url")

  const { createSign } = await import("crypto")
  const sign = createSign("RSA-SHA256")
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, "base64url")
  const jwt = `${header}.${payload}.${signature}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  })
  const data = await res.json()
  return data.access_token
}

async function extractIngredientsWithClaude(labels: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Anthropic API key not configured")

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
        content: `From this list of image labels, return ONLY the ones that are specific cooking ingredients (e.g. "chicken", "tomato", "egg"). Exclude generic words like "food", "meat", "vegetable", "ingredient", "produce", "natural foods", "dish" etc. Return a JSON array of strings only, nothing else. If none are specific ingredients return [].

Labels: ${JSON.stringify(labels)}`,
      }],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text ?? "[]"
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.map((s: string) => s.toLowerCase()) : []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  let body: { base64: string; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { base64, mimeType = "image/jpeg" } = body
  if (!base64) return NextResponse.json({ error: "Missing base64 image data" }, { status: 400 })

  try {
    const accessToken = await getAccessToken()

    const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: "LABEL_DETECTION", maxResults: 20 }],
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Vision API error" }, { status: res.status })

    const labels: { description: string; score: number }[] = data.responses?.[0]?.labelAnnotations ?? []
    const rawLabels = labels.filter(l => l.score > 0.7).map(l => l.description)

    if (rawLabels.length === 0) {
      return NextResponse.json({ error: "No ingredients detected. Try a clearer photo of a single ingredient." }, { status: 422 })
    }

    const ingredients = await extractIngredientsWithClaude(rawLabels)

    if (ingredients.length === 0) {
      return NextResponse.json({ error: "No ingredients detected. Try a clearer photo of a single ingredient." }, { status: 422 })
    }

    return NextResponse.json({ ingredient: ingredients[0], all: ingredients })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to analyze image" }, { status: 500 })
  }
}
