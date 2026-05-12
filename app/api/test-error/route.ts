import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "This is a test error — delete /api/test-error when done" }, { status: 500 })
}
