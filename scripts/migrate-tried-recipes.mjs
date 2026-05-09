import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tried_recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipe_id TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      tried_on TEXT NOT NULL,
      estimated_time INTEGER,
      satisfaction INTEGER,
      time_accuracy INTEGER,
      difficulty TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, recipe_id)
    )
  `)
  console.log("✅ tried_recipes table created")
} catch (err) {
  console.error("❌ Error:", err.message)
} finally {
  await pool.end()
}
