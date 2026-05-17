import { NextRequest, NextResponse } from "next/server"

const FOOD_KEYWORDS = new Set([
  "food", "ingredient", "vegetable", "fruit", "meat", "fish", "seafood", "dairy",
  "egg", "cheese", "milk", "butter", "cream", "bread", "flour", "rice", "pasta",
  "chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham",
  "tomato", "onion", "garlic", "potato", "carrot", "broccoli", "spinach", "lettuce",
  "pepper", "mushroom", "cucumber", "zucchini", "eggplant", "corn", "pea", "bean",
  "lemon", "lime", "orange", "apple", "banana", "strawberry", "blueberry",
  "salmon", "tuna", "shrimp", "prawn", "crab", "lobster",
  "oil", "vinegar", "sauce", "herb", "spice", "salt", "sugar", "honey",
  "chocolate", "vanilla", "cinnamon", "ginger", "basil", "parsley", "thyme",
  "avocado", "celery", "leek", "cauliflower", "asparagus", "artichoke",
  "almond", "walnut", "cashew", "peanut", "hazelnut",
  "yogurt", "cream cheese", "mozzarella", "parmesan", "cheddar",
])

function isFoodLabel(label: string): boolean {
  const lower = label.toLowerCase()
  for (const keyword of FOOD_KEYWORDS) {
    if (lower.includes(keyword)) return true
  }
  return false
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_VISION_CLIENT_EMAIL
  const rawKey = process.env.GOOGLE_VISION_PRIVATE_KEY
  if (!clientEmail || !rawKey) throw new Error("Google Vision credentials not configured")
  const privateKey = rawKey.replace(/\\n/g, "\n")

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
          features: [
            { type: "LABEL_DETECTION", maxResults: 20 },
          ],
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Vision API error" }, { status: res.status })

    const labels: { description: string; score: number }[] = data.responses?.[0]?.labelAnnotations ?? []

    // Filter to food-related labels with decent confidence
    const foodLabels = labels
      .filter(l => l.score > 0.7 && isFoodLabel(l.description))
      .map(l => l.description.toLowerCase())

    if (foodLabels.length === 0) {
      return NextResponse.json({ error: "No ingredients detected. Try a clearer photo." }, { status: 422 })
    }

    // Return the best match as the ingredient
    return NextResponse.json({ ingredient: foodLabels[0], all: foodLabels })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to analyze image" }, { status: 500 })
  }
}
