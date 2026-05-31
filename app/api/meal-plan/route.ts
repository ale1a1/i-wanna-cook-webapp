import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const isPremium = searchParams.get("isPremium") === "true"
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  try {
    if (!isPremium) {
      const result = await pool.query(
        "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1",
        [userId]
      )
      return NextResponse.json({ plans: result.rows, historyLocked: true })
    }
    const result = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT 20",
      [userId]
    )
    return NextResponse.json({ plans: result.rows, historyLocked: false })
  } catch {
    return NextResponse.json({ error: "Failed to fetch meal plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, weekStart, planData, name, folder, filtersJson } = await request.json()
    if (!userId || !weekStart || !planData) {
      return NextResponse.json({ error: "userId, weekStart, planData required" }, { status: 400 })
    }
    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, week_start, plan_data, name, folder, filters_json, is_modified)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET plan_data = $3, name = COALESCE($4, meal_plans.name),
         folder = COALESCE($5, meal_plans.folder),
         filters_json = COALESCE($6, meal_plans.filters_json),
         created_at = NOW()
       RETURNING *`,
      [userId, weekStart, JSON.stringify(planData), name ?? null, folder ?? null, filtersJson ? JSON.stringify(filtersJson) : null]
    )
    return NextResponse.json({ plan: result.rows[0] })
  } catch {
    return NextResponse.json({ error: "Failed to save meal plan" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  // Update plan_data (after a replace swap) and mark is_modified if filters were overridden
  try {
    const { userId, planId, planData, isModified } = await request.json()
    if (!userId || !planId || !planData) {
      return NextResponse.json({ error: "userId, planId, planData required" }, { status: 400 })
    }
    const result = await pool.query(
      `UPDATE meal_plans
       SET plan_data = $3, is_modified = CASE WHEN $4 THEN TRUE ELSE is_modified END
       WHERE id = $2 AND user_id = $1
       RETURNING *`,
      [userId, planId, JSON.stringify(planData), isModified ?? false]
    )
    if (result.rowCount === 0) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    return NextResponse.json({ plan: result.rows[0] })
  } catch {
    return NextResponse.json({ error: "Failed to update meal plan" }, { status: 500 })
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
