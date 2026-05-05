import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json()

    if (!email || !username || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
    if (!strongPassword.test(password)) {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 })
    }

    // Check if email already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email.toLowerCase(), username, password_hash]
    )

    return NextResponse.json({ user: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error("Register error:", err)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
