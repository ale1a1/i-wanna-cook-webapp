import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const result = await pool.query(
      "UPDATE users SET age_verified_at = NOW() WHERE id = $1 RETURNING age_verified_at",
      [userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ age_verified_at: result.rows[0].age_verified_at })
  } catch (err) {
    console.error("Age verify error:", err)
    return NextResponse.json({ error: "Failed to record age verification" }, { status: 500 })
  }
}
