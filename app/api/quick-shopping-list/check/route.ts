import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const { userId, itemId, checked } = await request.json()
    if (!userId || !itemId) return NextResponse.json({ error: "userId and itemId required" }, { status: 400 })
    await pool.query(
      "UPDATE quick_shopping_list SET checked = $1 WHERE id = $2 AND user_id = $3",
      [checked, itemId, userId]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}
