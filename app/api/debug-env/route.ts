import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSpoonacularKey: !!process.env.SPOONACULAR_API_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  })
}
