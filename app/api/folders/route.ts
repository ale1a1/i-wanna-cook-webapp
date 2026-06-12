import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_folders (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      list_type TEXT NOT NULL CHECK (list_type IN ('toTry', 'tried')),
      folder_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, list_type, folder_name)
    )
  `)
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    await ensureTable()
    const result = await pool.query(
      "SELECT list_type, folder_name FROM recipe_folders WHERE user_id = $1 ORDER BY created_at ASC",
      [userId]
    )
    return NextResponse.json({ folders: result.rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable()
    const { userId, listType, folderName } = await request.json()
    if (!userId || !listType || !folderName) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      "INSERT INTO recipe_folders (user_id, list_type, folder_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [userId, listType, folderName]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTable()
    const { userId, listType, folderName } = await request.json()
    if (!userId || !listType || !folderName) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      "DELETE FROM recipe_folders WHERE user_id = $1 AND list_type = $2 AND folder_name = $3",
      [userId, listType, folderName]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureTable()
    const { userId, listType, oldName, newName } = await request.json()
    if (!userId || !listType || !oldName || !newName) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    await pool.query(
      "UPDATE recipe_folders SET folder_name = $4 WHERE user_id = $1 AND list_type = $2 AND folder_name = $3",
      [userId, listType, oldName, newName]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 })
  }
}
