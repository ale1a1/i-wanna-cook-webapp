import { NextRequest, NextResponse } from "next/server"
import {
  ChangePasswordCommand,
  DeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient } from "@/lib/cognito"
import pool from "@/lib/db"
import { Resend } from "resend"

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function PATCH(request: NextRequest) {
  try {
    const { userId, username, theme, currentPassword, newPassword, accessToken } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Update username and/or theme in RDS
    if (username !== undefined || theme !== undefined) {
      const updates: string[] = []
      const values: any[] = []
      let idx = 1

      if (username !== undefined) {
        if (username.length < 3) {
          return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
        }
        updates.push(`username = $${idx++}`)
        values.push(username)
      }
      if (theme !== undefined) {
        updates.push(`theme = $${idx++}`)
        values.push(theme)
      }

      values.push(userId)
      await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      )
    }

    // Change password in Cognito
    if (currentPassword && newPassword && accessToken) {
      if (!strongPassword.test(newPassword)) {
        return NextResponse.json({ error: "New password does not meet requirements" }, { status: 400 })
      }
      await cognitoClient.send(new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      }))
    }

    // Return updated user
    const result = await pool.query(
      "SELECT id, email, username, theme FROM users WHERE id = $1",
      [userId]
    )

    return NextResponse.json({ user: result.rows[0] })
  } catch (err: any) {
    console.error("Update user error:", err)
    if (err.name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }
    if (err.name === "InvalidPasswordException") {
      return NextResponse.json({ error: "New password does not meet requirements" }, { status: 400 })
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, accessToken } = await request.json()

    if (!userId || !accessToken) {
      return NextResponse.json({ error: "User ID and access token are required" }, { status: 400 })
    }

    // Fetch email/username before deletion for the confirmation email
    const userResult = await pool.query("SELECT email, username FROM users WHERE id = $1", [userId])
    const deletedUser = userResult.rows[0]

    // Delete from Cognito using the user's own access token — no IAM needed
    await cognitoClient.send(new DeleteUserCommand({
      AccessToken: accessToken,
    }))

    // Delete from RDS (cascades to all related data)
    await pool.query("DELETE FROM users WHERE id = $1", [userId])

    if (deletedUser && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      resend.emails.send({
        from: "I Wanna Cook App <onboarding@resend.dev>",
        to: deletedUser.email,
        subject: "Your account has been deleted",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h1 style="font-size:22px;margin-bottom:8px">Account deleted</h1>
            <p style="color:#374151">Hi ${deletedUser.username}, your account and all associated data have been permanently deleted.</p>
            <p style="color:#374151">If you didn't request this, please contact us immediately.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">This action cannot be undone.</p>
          </div>
        `,
      }).catch((err) => console.error("Deletion confirmation email failed:", err))
    }

    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (err: any) {
    console.error("Delete user error:", err)
    if (err.name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 })
    }
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 })
  }
}
