import { NextRequest, NextResponse } from "next/server"
import { ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (!strongPassword.test(newPassword)) {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }

    await cognitoClient.send(new ConfirmForgotPasswordCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email.toLowerCase(),
      ConfirmationCode: code.trim(),
      Password: newPassword,
    }))

    return NextResponse.json({ message: "Password reset successfully. You can now log in." })
  } catch (err: any) {
    console.error("Reset password error:", err)
    if (err.name === "CodeMismatchException") {
      return NextResponse.json({ error: "Invalid reset code" }, { status: 400 })
    }
    if (err.name === "ExpiredCodeException") {
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 })
    }
    if (err.name === "InvalidPasswordException") {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 })
  }
}
