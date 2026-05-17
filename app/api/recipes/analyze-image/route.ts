import { NextRequest, NextResponse } from "next/server"

// Generic labels that Vision returns but are useless as search ingredients
const GENERIC_LABELS = new Set([
  "food", "ingredient", "ingredients", "produce", "natural foods", "whole food",
  "superfood", "food group", "staple food", "vegetable", "fruit", "meat", "fish",
  "seafood", "dairy", "cuisine", "dish", "meal", "recipe", "cooking", "raw",
  "organic", "fresh", "frozen", "processed food", "plant", "grass", "leaf",
  "still life", "photography", "tableware", "cutting board", "bowl", "plate",
  "kitchen", "wood", "surface", "white", "red", "green", "yellow", "orange",
  "colour", "color", "pattern", "texture", "macro photography", "close up",
])

// Specific ingredient names Vision commonly returns correctly
const SPECIFIC_INGREDIENTS = new Set([
  "egg", "eggs", "chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham", "steak",
  "salmon", "tuna", "shrimp", "prawn", "crab", "lobster", "cod", "tilapia",
  "tomato", "onion", "garlic", "potato", "carrot", "broccoli", "spinach", "lettuce",
  "pepper", "mushroom", "cucumber", "zucchini", "eggplant", "corn", "pea", "bean",
  "lemon", "lime", "orange", "apple", "banana", "strawberry", "blueberry", "avocado",
  "grape", "mango", "pineapple", "peach", "pear", "cherry", "raspberry", "melon", "watermelon",
  "courgette", "aubergine", "beetroot", "radish", "turnip", "parsnip", "sweet potato",
  "chorizo", "salami", "pepperoni", "prosciutto", "pancetta", "anchovy", "sardine",
  "coriander", "turmeric", "paprika", "cumin", "oregano", "mint", "dill", "tarragon",
  "feta", "brie", "gouda", "ricotta", "mascarpone", "halloumi",
  "oat", "quinoa", "barley", "couscous", "polenta",
  "celery", "leek", "cauliflower", "asparagus", "artichoke", "kale", "arugula",
  "cheese", "milk", "butter", "cream", "yogurt", "mozzarella", "parmesan", "cheddar",
  "bread", "flour", "rice", "pasta", "noodle", "tortilla",
  "oil", "vinegar", "honey", "sugar", "salt",
  "chocolate", "vanilla", "cinnamon", "ginger", "basil", "parsley", "thyme", "rosemary",
  "almond", "walnut", "cashew", "peanut", "hazelnut",
  "tofu", "tempeh", "lentil", "chickpea",
])

function isUsefulIngredientLabel(label: string): boolean {
  const lower = label.toLowerCase()
  // Reject if it's a known generic label
  if (GENERIC_LABELS.has(lower)) return false
  // Accept if it exactly matches or contains a specific ingredient
  for (const ing of SPECIFIC_INGREDIENTS) {
    if (lower === ing || lower.includes(ing)) return true
  }
  return false
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_VISION_CLIENT_EMAIL
  const rawKey = process.env.GOOGLE_VISION_PRIVATE_KEY
  if (!clientEmail || !rawKey) throw new Error(`Google Vision credentials not configured — email: ${!!clientEmail}, key: ${!!rawKey}`)
  // Handle both literal \n and actual newlines
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

    // Only keep specific named ingredients, reject generic category labels
    const foodLabels = labels
      .filter(l => l.score > 0.75 && isUsefulIngredientLabel(l.description))
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
