import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 30 * 1000

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured")
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const now = Date.now()
  const last = rateLimitMap.get(ip) ?? 0
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 })
  }
  rateLimitMap.set(ip, now)

  const body = await request.json().catch(() => ({}))
  const { error, screen, platform } = body

  if (!error || typeof error !== "string") {
    return NextResponse.json({ error: "Missing error field" }, { status: 400 })
  }

  const resend = new Resend(apiKey)

  try {
    const result = await resend.emails.send({
      from: "What Should I Cook App <onboarding@resend.dev>",
      to: "alessandro.dev.ladu@gmail.com",
      subject: `App Error Report — ${screen ?? "unknown screen"}`,
      html: `
        <h2 style="color:#ef4444">App Error Report</h2>
        <p><strong>Screen:</strong> ${screen ?? "unknown"}</p>
        <p><strong>Platform:</strong> ${platform ?? "unknown"}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <hr/>
        <h3>Error</h3>
        <pre style="background:#f1f5f9;padding:12px;border-radius:6px;white-space:pre-wrap">${error}</pre>
      `,
    })
    if (result.error) {
      console.error("Resend error:", result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("Failed to send error report email:", err)
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 })
  }
}
