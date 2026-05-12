import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(`
    ALTER TABLE tried_recipes
      ADD COLUMN IF NOT EXISTS satisfaction INTEGER,
      ADD COLUMN IF NOT EXISTS time_accuracy INTEGER,
      ADD COLUMN IF NOT EXISTS difficulty TEXT
  `)
  console.log("✅ Rating columns added to tried_recipes")
} catch (err) {
  console.error("❌ Error:", err.message)
} finally {
  await pool.end()
}
