import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    const result = await pool.query(
      "SELECT * FROM active_recipe_session WHERE user_id = $1",
      [userId]
    )
    return NextResponse.json({ session: result.rows[0] ?? null })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, recipeId, recipeTitle, recipeData, substitutions, source } = await request.json()
    if (!userId || !recipeId || !recipeData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    await pool.query(
      `INSERT INTO active_recipe_session (user_id, recipe_id, recipe_title, recipe_data, substitutions, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         recipe_id = EXCLUDED.recipe_id,
         recipe_title = EXCLUDED.recipe_title,
         recipe_data = EXCLUDED.recipe_data,
         substitutions = EXCLUDED.substitutions,
         source = EXCLUDED.source,
         updated_at = NOW()`,
      [userId, recipeId, recipeTitle, JSON.stringify(recipeData), JSON.stringify(substitutions ?? []), source ?? "scan"]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
    await pool.query("DELETE FROM active_recipe_session WHERE user_id = $1", [userId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
