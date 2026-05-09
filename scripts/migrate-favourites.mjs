import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favourites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipe_id TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      recipe_image TEXT,
      ready_in_minutes INTEGER,
      servings INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, recipe_id)
    )
  `)
  console.log("✅ favourites table created")
} catch (err) {
  console.error("❌ Error:", err.message)
} finally {
  await pool.end()
}
