import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  let body: { base64: string; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { base64, mimeType = "image/jpeg" } = body
  if (!base64) {
    return NextResponse.json({ error: "Missing base64 image data" }, { status: 400 })
  }

  const buffer = Buffer.from(base64, "base64")
  const blob = new Blob([buffer], { type: mimeType })

  const formData = new FormData()
  formData.append("file", blob, "image.jpg")

  try {
    const res = await fetch(
      `https://api.spoonacular.com/food/images/analyze?apiKey=${apiKey}`,
      { method: "POST", body: formData }
    )

    const data = await res.json()

    if (!res.ok || data?.status === "failure") {
      const code: number = data?.code ?? res.status
      let message: string
      if (code === 402) message = "Daily photo scan limit reached. Try again tomorrow or upgrade your plan."
      else if (code === 401) message = "API key invalid."
      else message = data?.message ?? "Spoonacular error"
      return NextResponse.json({ error: message }, { status: code })
    }

    const categoryName: string = data?.category?.name ?? ""
    const ingredient = categoryName.split("_")[0]
    return NextResponse.json({ ingredient })
  } catch {
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 })
  }
}
