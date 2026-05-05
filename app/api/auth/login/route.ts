import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const result = await pool.query(
      "SELECT id, email, username, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username }
    })
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
