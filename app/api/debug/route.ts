import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  try {
    const result = await pool.query("SELECT NOW()")
    return NextResponse.json({ ok: true, time: result.rows[0].now, dbUrl: dbUrl ? "set" : "missing" })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, dbUrl: dbUrl ? "set" : "missing" }, { status: 500 })
  }
}
