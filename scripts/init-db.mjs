import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const schema = fs.readFileSync(path.join(__dirname, "../lib/schema.sql"), "utf-8")

try {
  await pool.query(schema)
  console.log("✅ Database schema created successfully")
} catch (err) {
  console.error("❌ Error creating schema:", err.message)
} finally {
  await pool.end()
}
