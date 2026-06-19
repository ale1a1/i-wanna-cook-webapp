import { NextRequest, NextResponse } from "next/server"
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"
import pool from "@/lib/db"
import { Resend } from "resend"

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, marketingConsent } = await request.json()
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null

    if (!email || !username || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }
    if (!strongPassword.test(password)) {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }

    // Fetch current v1 document IDs — all three must exist or registration is blocked
    const docsResult = await pool.query(
      `SELECT id, document_type FROM legal_documents WHERE version = 'v1' AND document_type IN ('disclaimer', 'privacy_policy', 'terms_of_service')`
    )
    const docs: Record<string, string> = {}
    for (const row of docsResult.rows) docs[row.document_type] = row.id
    if (!docs.disclaimer || !docs.privacy_policy || !docs.terms_of_service) {
      console.error("Legal documents not seeded — cannot register user")
      return NextResponse.json({ error: "Service configuration error" }, { status: 500 })
    }

    // Check if email is already taken in RDS
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Register in Cognito — returns UserSub directly, no admin call needed
    const signUpResult = await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email.toLowerCase(),
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email.toLowerCase() },
        { Name: "preferred_username", Value: username },
      ],
    }))

    const cognitoSub = signUpResult.UserSub!
    const now = new Date()

    // Store profile in RDS
    const userResult = await pool.query(
      `INSERT INTO users (cognito_sub, email, username, disclaimer_accepted_at, marketing_consent_at, subscription_tier, trial_started_at)
       VALUES ($1, $2, $3, $4, $5, 'free', NOW())
       ON CONFLICT (email) DO UPDATE SET cognito_sub = EXCLUDED.cognito_sub, username = EXCLUDED.username,
         disclaimer_accepted_at = EXCLUDED.disclaimer_accepted_at, marketing_consent_at = EXCLUDED.marketing_consent_at
       RETURNING id`,
      [cognitoSub, email.toLowerCase(), username, now, marketingConsent ? now : null]
    )
    const userId = userResult.rows[0].id

    // Record acceptance of disclaimer and terms — required documents
    // Privacy policy is shown as a link; acceptance is implied by registration (common practice)
    const requiredDocs = [docs.disclaimer, docs.terms_of_service, docs.privacy_policy]
    for (const docId of requiredDocs) {
      await pool.query(
        `INSERT INTO user_legal_acceptances (user_id, legal_document_id, accepted_at, ip_address)
         VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, legal_document_id) DO NOTHING`,
        [userId, docId, now, ip]
      )
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      resend.emails.send({
        from: "What Should I Cook App <onboarding@resend.dev>",
        to: email.toLowerCase(),
        subject: "Welcome to What Should I Cook! 🍳",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h1 style="font-size:24px;margin-bottom:8px">Welcome, ${username}! 👋</h1>
            <p style="color:#374151">You're in. Your 14-day free trial has started — you get full Premium access until <strong>${trialEnd}</strong>. No card required.</p>
            <h2 style="font-size:16px;margin-top:24px;margin-bottom:8px">What's included in your trial:</h2>
            <ul style="color:#374151;padding-left:20px;line-height:1.8">
              <li>Unlimited recipe searches</li>
              <li>Unlimited AI ingredient photo scans</li>
              <li>Weekly AI meal planner with full history</li>
              <li>All premium filters (intolerances, meal type, sport presets)</li>
            </ul>
            <p style="color:#374151;margin-top:24px">After your trial, you'll move to the free plan (10 searches/week, 3 scans/week). Upgrade any time to keep full access for <strong>$2.49/month</strong>.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:32px">Nutrition info on this app is approximate and for informational purposes only — not a substitute for professional dietary advice.</p>
          </div>
        `,
      }).catch((err) => console.error("Welcome email failed:", err))
    }

    return NextResponse.json({ message: "Registration successful. Check your email for the verification code." }, { status: 201 })
  } catch (err: any) {
    console.error("Register error:", err)
    if (err.name === "UsernameExistsException") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    if (err.name === "InvalidPasswordException") {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
