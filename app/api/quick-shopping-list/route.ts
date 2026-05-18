import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    const result = await pool.query(
      "SELECT * FROM quick_shopping_list WHERE user_id = $1 ORDER BY created_at",
      [userId]
    )
    return NextResponse.json({ items: result.rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch quick shopping list" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, recipeId, recipeTitle, ingredients } = await request.json()
    if (!userId || !recipeId || !ingredients?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const values = ingredients.map((_: any, i: number) => {
      const base = i * 2
      return `($1, $2, $3, $${base + 4}, $${base + 5})`
    })
    const params: any[] = [userId, recipeId, recipeTitle]
    ingredients.forEach((ing: { name: string; amount?: string }) => {
      params.push(ing.name, ing.amount ?? "")
    })
    await pool.query(
      `INSERT INTO quick_shopping_list (user_id, recipe_id, recipe_title, ingredient_name, ingredient_amount)
       VALUES ${values.join(", ")}`,
      params
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to add to quick shopping list" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, itemId } = await request.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
    if (itemId) {
      await pool.query("DELETE FROM quick_shopping_list WHERE id = $1 AND user_id = $2", [itemId, userId])
    } else {
      await pool.query("DELETE FROM quick_shopping_list WHERE user_id = $1", [userId])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
