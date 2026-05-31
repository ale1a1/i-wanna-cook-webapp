import { Resend } from "resend"

// Dedup: don't spam the same alert more than once per hour per key
const sentAlerts = new Map<string, number>()
const ALERT_COOLDOWN_MS = 60 * 60 * 1000

export async function alertOwner(subject: string, body: string, dedupeKey: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const now = Date.now()
  const last = sentAlerts.get(dedupeKey) ?? 0
  if (now - last < ALERT_COOLDOWN_MS) return
  sentAlerts.set(dedupeKey, now)

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: "What Should I Cook App <onboarding@resend.dev>",
    to: "alessandro.dev.ladu@gmail.com",
    subject: `🚨 ${subject}`,
    html: `
      <h2 style="color:#ef4444">🚨 ${subject}</h2>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr/>
      <pre style="background:#f1f5f9;padding:12px;border-radius:6px;white-space:pre-wrap">${body}</pre>
    `,
  }).catch(() => {}) // never let alerting crash the request
}

// Call this after every Claude API response
export async function checkClaudeError(status: number, route: string) {
  if (status === 401) {
    await alertOwner(
      "Claude API key invalid or missing",
      `Route: ${route}\nStatus: 401\n\nUsers cannot use AI features. Check ANTHROPIC_API_KEY in Amplify env vars.`,
      `claude-401`
    )
  } else if (status === 429) {
    await alertOwner(
      "Claude rate limit hit — users blocked",
      `Route: ${route}\nStatus: 429\n\nYou have hit the Claude API rate limit. AI features are returning errors to users.`,
      `claude-429`
    )
  } else if (status === 529 || status === 503) {
    await alertOwner(
      "Claude API overloaded — users affected",
      `Route: ${route}\nStatus: ${status}\n\nAnthropic is overloaded. AI features may be degraded for users.`,
      `claude-${status}`
    )
  }
}
