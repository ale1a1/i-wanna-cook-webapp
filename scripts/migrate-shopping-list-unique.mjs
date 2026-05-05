import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(`
    ALTER TABLE shopping_list
    ADD CONSTRAINT shopping_list_user_recipe_ingredient_unique
    UNIQUE (user_id, recipe_id, ingredient_name)
  `)
  console.log("✅ Unique constraint added")
} catch (err) {
  if (err.code === "42710") {
    console.log("✅ Constraint already exists")
  } else {
    console.error("❌ Error:", err.message)
  }
} finally {
  await pool.end()
}
