import { NextRequest, NextResponse } from "next/server"
import { ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID } from "@/lib/cognito"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    await cognitoClient.send(new ForgotPasswordCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email.toLowerCase(),
    }))

    // Always return success to avoid email enumeration
    return NextResponse.json({ message: "If an account exists, a reset code has been sent to your email." })
  } catch (err: any) {
    console.error("Forgot password error:", err)
    // Still return 200 to avoid email enumeration
    return NextResponse.json({ message: "If an account exists, a reset code has been sent to your email." })
  }
}
