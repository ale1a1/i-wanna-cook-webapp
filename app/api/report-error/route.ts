import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Simple in-memory rate limit: max 1 report per IP per 5 minutes
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
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

  try {
    await resend.emails.send({
      from: "What Should I Cook App <onboarding@resend.dev>",
      to: "alessandro.dev.ladu@gmail.com",
      subject: `🚨 App Error Report — ${screen ?? "unknown screen"}`,
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
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("Failed to send error report email:", err)
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 })
  }
}
