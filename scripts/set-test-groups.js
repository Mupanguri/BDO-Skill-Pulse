import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: './backend/.env' })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system'
})

const GROUP_A = [
  'wmundaita@bdo.co.zw',
  'clungu@bdo.co.mw',
  'nmusvaire@bdo.co.zw',
  'tmangena@bdo.co.zw',
  'pshoniwa@bdo.co.zw',
  'tmakaya@bdo.co.zw',
  'mkawiya@bdo.co.mw',
  'jmunyimi@bdo.co.zw',
  'nmukura@bdo.co.zw',
  'rtsveta@bdo.co.zw',
  'tchirwa@bdo.co.mw',
  'nmunjoma@bdo.co.zw',
  'echabooka@bdo.co.zw',
  'echikuruwo@bdo.co.zw',
  'kmapepa@bdo.co.zw',
  'rgwitima@bdo.co.zw',
  'gmambariza@bdo.co.zw',
  'vmurwisi@bdo.co.zw',
  'smusiyiwa@bdo.co.zw',
  'gdziva@bdo.co.zw',
]

const GROUP_B = [
  'msibanda@bdo.co.zw',
  'angwebu@bdo.co.zw',
  'lchidarara@bdo.co.zw',
  'amaereka@bdo.co.zw',
  'tchiropa@bdo.co.zw',
  'rkakumura@bdo.co.zw',
  'bkundiwona@bdo.co.zw',
  'njijita@bdo.co.zw',
  'jndou@bdo.co.zw',
  'isigudu@bdo.co.zw',
  'mdumba@bdo.co.zw',
  'rmakowa@bdo.co.zw',
  'tdzimbanhete@bdo.co.zw',
  'aharuzikanwi@bdo.co.zw',
  'rmapara@bdo.co.zw',
  'hchirambiwa@bdo.co.zw',
  'trukwanda@bdo.co.zw',
  'kmangwiro@bdo.co.zw',
  'tkayitano@bdo.co.zw',
  'cdhaveta@bdo.co.zw',
]

async function setGroup(emails, label) {
  let updated = 0, missing = 0
  for (const email of emails) {
    const r = await pool.query(
      `UPDATE "User" SET department = $1 WHERE email = $2 RETURNING email`,
      [label, email]
    )
    if (r.rowCount > 0) {
      console.log(`  ✓ ${email.padEnd(42)} → ${label}`)
      updated++
    } else {
      console.log(`  ✗ ${email.padEnd(42)} NOT FOUND`)
      missing++
    }
  }
  return { updated, missing }
}

console.log('\n── Setting Test Sample A ──────────────────────────────────────')
const a = await setGroup(GROUP_A, 'Test Sample A')

console.log('\n── Setting Test Sample B ──────────────────────────────────────')
const b = await setGroup(GROUP_B, 'Test Sample B')

console.log('\n──────────────────────────────────────────────────────────────')
console.log(`Group A: ${a.updated} updated, ${a.missing} not found`)
console.log(`Group B: ${b.updated} updated, ${b.missing} not found`)
console.log()

await pool.end()
