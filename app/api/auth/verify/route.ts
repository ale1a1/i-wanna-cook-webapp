import { NextRequest, NextResponse } from "next/server"
import {
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    await cognitoClient.send(new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email.toLowerCase(),
      ConfirmationCode: code.trim(),
    }))

    // cognito_sub was stored at register time — nothing more to do in RDS
    return NextResponse.json({ message: "Email verified successfully. You can now log in." })
  } catch (err: any) {
    console.error("Verify error:", err)
    if (err.name === "CodeMismatchException") {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }
    if (err.name === "ExpiredCodeException") {
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 })
    }
    if (err.name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Account already verified. Please log in." }, { status: 400 })
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    await cognitoClient.send(new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email.toLowerCase(),
    }))

    return NextResponse.json({ message: "Verification code resent" })
  } catch (err: any) {
    console.error("Resend error:", err)
    return NextResponse.json({ error: "Failed to resend code" }, { status: 500 })
  }
}
