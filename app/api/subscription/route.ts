import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId, tier, expiresAt } = await request.json()
    if (!userId || !tier) return NextResponse.json({ error: "userId and tier required" }, { status: 400 })

    await pool.query(
      `UPDATE users SET subscription_tier = $1, subscription_expires_at = $2 WHERE id = $3`,
      [tier, expiresAt ?? null, userId]
    )

    const result = await pool.query(
      "SELECT id, subscription_tier, subscription_expires_at, trial_started_at FROM users WHERE id = $1",
      [userId]
    )
    return NextResponse.json({ user: result.rows[0] })
  } catch {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  try {
    const result = await pool.query(
      "SELECT subscription_tier, subscription_expires_at, trial_started_at FROM users WHERE id = $1",
      [userId]
    )
    if (!result.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { subscription_tier, subscription_expires_at, trial_started_at } = result.rows[0]
    const now = new Date()
    const isExpired = subscription_expires_at && new Date(subscription_expires_at) < now
    const effectiveTier = isExpired ? "free" : subscription_tier

    return NextResponse.json({ tier: effectiveTier, expiresAt: subscription_expires_at, trialStartedAt: trial_started_at })
  } catch {
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
  }
}
