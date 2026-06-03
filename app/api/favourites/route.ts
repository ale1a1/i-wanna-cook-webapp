import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    const result = await pool.query(
      "SELECT * FROM favourites WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    )
    return NextResponse.json({ favourites: result.rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch favourites" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, recipeId, recipeTitle, recipeImage, readyInMinutes, servings, tags } = await request.json()
    if (!userId || !recipeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      `INSERT INTO favourites (user_id, recipe_id, recipe_title, recipe_image, ready_in_minutes, servings, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, recipe_id) DO UPDATE SET tags = $7`,
      [userId, String(recipeId), recipeTitle, recipeImage, readyInMinutes, servings, tags ?? []]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to add favourite" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, recipeId, tags } = await request.json()
    if (!userId || !recipeId || !Array.isArray(tags)) return NextResponse.json({ error: "userId, recipeId, tags required" }, { status: 400 })
    await pool.query(
      "UPDATE favourites SET tags = $3 WHERE user_id = $1 AND recipe_id = $2",
      [userId, String(recipeId), tags]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, recipeId } = await request.json()
    if (!userId || !recipeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      "DELETE FROM favourites WHERE user_id = $1 AND recipe_id = $2",
      [userId, String(recipeId)]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to remove favourite" }, { status: 500 })
  }
}
