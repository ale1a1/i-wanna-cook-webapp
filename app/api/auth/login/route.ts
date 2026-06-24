import { NextRequest, NextResponse } from "next/server"
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"
import pool from "@/lib/db"
import { Resend } from "resend"

const PORTFOLIO_USERNAME = "alessandro.dev.ladu@gmail.com"
const NOTIFY_EMAIL = "alessandro.dev.ladu@gmail.com"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Authenticate with Cognito
    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email.toLowerCase(),
        PASSWORD: password,
      },
    }))

    const tokens = authResult.AuthenticationResult
    if (!tokens?.IdToken) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Get user profile from RDS
    const result = await pool.query(
      "SELECT id, email, username, theme, subscription_tier, trial_started_at, trial_warning_sent_at, age_verified_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const user = result.rows[0]

    if (user.email === PORTFOLIO_USERNAME && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
        const ua = request.headers.get("user-agent") ?? "unknown"
        const emailResult = await resend.emails.send({
          from: "I Wanna Cook App <onboarding@resend.dev>",
          to: NOTIFY_EMAIL,
          subject: "Portfolio login — someone just signed in as you",
          html: `
            <h2>Portfolio Demo Login</h2>
            <p>Someone just logged in using the demo credentials on your portfolio app.</p>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Time</td><td>${new Date().toUTCString()}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">IP</td><td>${ip}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Browser</td><td>${ua}</td></tr>
            </table>
          `,
        })
        if (emailResult.error) {
          console.error("Portfolio notify email error:", JSON.stringify(emailResult.error))
        } else {
          console.log("Portfolio notify email sent:", emailResult.data?.id)
        }
      } catch (emailErr) {
        console.error("Portfolio notify email exception:", emailErr)
      }
    }

    const trialStarted = user.trial_started_at ? new Date(user.trial_started_at) : null
    const trialExpiresAt = trialStarted ? new Date(trialStarted.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null
    const trialActive = trialExpiresAt ? new Date() < new Date(trialExpiresAt) : false
    const isPremium = user.subscription_tier === 'premium' || trialActive

    // Send trial warning email if trial ends within 2 days and hasn't been sent yet
    if (trialActive && trialExpiresAt && process.env.RESEND_API_KEY && !user.trial_warning_sent_at) {
      const msLeft = new Date(trialExpiresAt).getTime() - Date.now()
      const daysLeft = msLeft / (1000 * 60 * 60 * 24)
      if (daysLeft <= 2) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        resend.emails.send({
          from: "I Wanna Cook App <onboarding@resend.dev>",
          to: user.email,
          subject: "Your free trial ends in 2 days",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h1 style="font-size:22px;margin-bottom:8px">Your trial ends soon ⏳</h1>
              <p style="color:#374151">Hey ${user.username}, your 14-day Premium trial expires on <strong>${new Date(trialExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</strong>.</p>
              <p style="color:#374151">After that you'll be on the free plan — 10 searches/week, 3 scans/week. Upgrade to keep unlimited access for just <strong>$2.49/month</strong>.</p>
            </div>
          `,
        }).catch((err) => console.error("Trial warning email failed:", err))
        pool.query("UPDATE users SET trial_warning_sent_at = NOW() WHERE id = $1", [user.id]).catch(() => {})
      }
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, theme: user.theme, subscriptionTier: user.subscription_tier, trialExpiresAt, trialActive, isPremium, ageVerifiedAt: user.age_verified_at ?? null },
      tokens: {
        idToken: tokens.IdToken,
        accessToken: tokens.AccessToken,
        refreshToken: tokens.RefreshToken,
        expiresIn: tokens.ExpiresIn,
      },
    })
  } catch (err: any) {
    console.error("Login error:", err)
    if (err.name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }
    if (err.name === "UserNotConfirmedException") {
      return NextResponse.json({ error: "Please verify your email before logging in", code: "EMAIL_NOT_VERIFIED" }, { status: 403 })
    }
    if (err.name === "UserNotFoundException") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
