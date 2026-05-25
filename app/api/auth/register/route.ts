import { NextRequest, NextResponse } from "next/server"
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"
import pool from "@/lib/db"

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, disclaimerAcceptedAt } = await request.json()

    if (!email || !username || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }
    if (!strongPassword.test(password)) {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }

    // Check if username is already taken in RDS
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

    // Store profile in RDS immediately with the real Cognito sub
    await pool.query(
      `INSERT INTO users (cognito_sub, email, username, disclaimer_accepted_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET cognito_sub = EXCLUDED.cognito_sub, username = EXCLUDED.username, disclaimer_accepted_at = EXCLUDED.disclaimer_accepted_at`,
      [cognitoSub, email.toLowerCase(), username, disclaimerAcceptedAt ?? null]
    )

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
