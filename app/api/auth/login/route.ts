import { NextRequest, NextResponse } from "next/server"
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"
import pool from "@/lib/db"

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
      "SELECT id, email, username, theme FROM users WHERE email = $1",
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const user = result.rows[0]

    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, theme: user.theme },
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
