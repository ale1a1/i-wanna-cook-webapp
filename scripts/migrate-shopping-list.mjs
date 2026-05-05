import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopping_list (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipe_id TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      ingredient_amount TEXT,
      checked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log("✅ shopping_list table created")
} catch (err) {
  console.error("❌ Error:", err.message)
} finally {
  await pool.end()
}
