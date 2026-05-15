import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: './backend/.env' })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system'
})

const { rows } = await pool.query(`
  SELECT email, "displayName", department
  FROM "User"
  WHERE "isAdmin" = false
    AND "isSuperAdmin" = false
    AND "isHR" = false
    AND "deletedAt" IS NULL
  ORDER BY RANDOM()
  LIMIT 40
`)

if (rows.length < 40) {
  console.warn(`\nWarning: only ${rows.length} eligible users found (need 40 for two full groups of 20).`)
}

const groupA = rows.slice(0, Math.min(20, rows.length))
const groupB = rows.slice(20, rows.length)

console.log(`\n${'═'.repeat(80)}`)
console.log(`  TEST SAMPLE A  (Quiz A)   —  ${groupA.length} participants`)
console.log(`${'═'.repeat(80)}`)
groupA.forEach((u, i) => {
  const name = (u.displayName || u.email).padEnd(35)
  const dept = u.department.padEnd(28)
  console.log(`  ${String(i + 1).padStart(2)}.  ${name}  ${dept}  ${u.email}`)
})

console.log(`\n${'═'.repeat(80)}`)
console.log(`  TEST SAMPLE B  (Quiz B)   —  ${groupB.length} participants`)
console.log(`${'═'.repeat(80)}`)
groupB.forEach((u, i) => {
  const name = (u.displayName || u.email).padEnd(35)
  const dept = u.department.padEnd(28)
  console.log(`  ${String(i + 1).padStart(2)}.  ${name}  ${dept}  ${u.email}`)
})

console.log(`\nTotal selected: ${rows.length}  (${groupA.length} Group A, ${groupB.length} Group B)\n`)

await pool.end()
