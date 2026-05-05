import pg from "pg"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const email = "ale1a184@gmail.com"
const username = "TestChef"
const password = "TestChef123!"

try {
  const hash = await bcrypt.hash(password, 12)
  await pool.query(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET username = $2, password_hash = $3`,
    [email, username, hash]
  )
  console.log("✅ Test user seeded:", email)
} catch (err) {
  console.error("❌ Error:", err.message)
} finally {
  await pool.end()
}
