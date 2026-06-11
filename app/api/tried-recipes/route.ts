import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    const result = await pool.query(
      "SELECT * FROM tried_recipes WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    )
    return NextResponse.json({ triedRecipes: result.rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch tried recipes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, recipeId, recipeTitle, recipeImage, readyInMinutes, servings, triedOn, estimatedTime, folder, searchFilters } = await request.json()
    if (!userId || !recipeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      `INSERT INTO tried_recipes (user_id, recipe_id, recipe_title, tried_on, estimated_time, folder, search_filters)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, recipe_id) DO UPDATE SET
         recipe_title = EXCLUDED.recipe_title,
         tried_on = EXCLUDED.tried_on,
         estimated_time = EXCLUDED.estimated_time,
         folder = EXCLUDED.folder,
         search_filters = EXCLUDED.search_filters`,
      [userId, String(recipeId), recipeTitle, triedOn ?? new Date().toISOString().split("T")[0], estimatedTime ?? readyInMinutes ?? null, folder ?? null, searchFilters ? JSON.stringify(searchFilters) : null]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to add tried recipe" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, recipeId, satisfaction, timeAccuracy, difficulty, folder, targetFolder } = await request.json()
    if (!userId || !recipeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    if (targetFolder !== undefined) {
      await pool.query(
        "UPDATE tried_recipes SET folder = $3 WHERE user_id = $1 AND recipe_id = $2",
        [userId, String(recipeId), targetFolder ?? null]
      )
    } else if (folder !== undefined) {
      await pool.query(
        "UPDATE tried_recipes SET folder = $3 WHERE user_id = $1 AND recipe_id = $2",
        [userId, String(recipeId), folder ?? null]
      )
    } else {
      await pool.query(
        `UPDATE tried_recipes SET satisfaction = $3, time_accuracy = $4, difficulty = $5
         WHERE user_id = $1 AND recipe_id = $2`,
        [userId, String(recipeId), satisfaction, timeAccuracy, difficulty]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? "Failed to update tried recipe" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, recipeId } = await request.json()
    if (!userId || !recipeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      "DELETE FROM tried_recipes WHERE user_id = $1 AND recipe_id = $2",
      [userId, String(recipeId)]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete tried recipe" }, { status: 500 })
  }
}
