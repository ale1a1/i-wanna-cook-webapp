import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  try {
    const result = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT 4",
      [userId]
    )
    return NextResponse.json({ plans: result.rows })
  } catch {
    return NextResponse.json({ error: "Failed to fetch meal plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, weekStart, planData } = await request.json()
    if (!userId || !weekStart || !planData) {
      return NextResponse.json({ error: "userId, weekStart, planData required" }, { status: 400 })
    }
    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, week_start, plan_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, week_start) DO UPDATE SET plan_data = $3, created_at = NOW()
       RETURNING *`,
      [userId, weekStart, JSON.stringify(planData)]
    )
    return NextResponse.json({ plan: result.rows[0] })
  } catch {
    return NextResponse.json({ error: "Failed to save meal plan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, planId } = await request.json()
    if (!userId || !planId) return NextResponse.json({ error: "userId, planId required" }, { status: 400 })
    await pool.query("DELETE FROM meal_plans WHERE id = $1 AND user_id = $2", [planId, userId])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete meal plan" }, { status: 500 })
  }
}
