import XLSX from 'xlsx'
import pg from 'pg'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config()

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system'
})

const DEPT_MAP = {
  'Admin.': 'Administration',
  'Admin': 'Administration',
  'Audit': 'Audit',
  'Tax': 'Tax',
  'Finance': 'Finance',
  'IT': 'Information Technology',
  'Business Dev.': 'Business Development',
  'Corpfin': 'Corporate Finance',
  'Corp Fin': 'Corporate Finance',
  'Partners': 'Partners',
  'ARA Harare': 'ARA Harare',
  'ARA Byo': 'ARA Bulawayo',
  'Chinese Desk': 'Chinese Desk',
}

function isAdminTitle(title) {
  const t = title.toLowerCase()
  return t.includes('partner') || t.includes('director')
}

function isHRTitle(title, dept) {
  const t = title.toLowerCase()
  const d = (dept || '').toLowerCase()
  return t.includes('hr ') || t.includes(' hr') || t === 'hr specialist' ||
    t.includes('human capital') || t.includes('payroll') ||
    d === 'admin.' || d === 'admin' || d === 'administration'
}

function toEmail(surname, firstName) {
  const cleanSurname = surname.replace(/\(.*?\)/g, '').trim().replace(/[\s\-]/g, '')
  const firstInitial = firstName.trim()[0]
  return (firstInitial + cleanSurname).toLowerCase().replace(/[^a-z]/g, '') + '@bdo.co.zw'
}

async function main() {
  const wb = XLSX.readFile('BDOListZim.xlsx')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  // Row 0 is the label row ("Surname", "First Name", etc.) — skip it
  // Actual columns: __EMPTY=Surname, __EMPTY_1=First Name, __EMPTY_2=Dept., SALARY SCHEDULE=Job Title
  const data = rows.slice(1)

  console.log(`\nFound ${data.length} staff records`)
  console.log('─'.repeat(70))

  let inserted = 0, skipped = 0, errors = 0

  for (const row of data) {
    const surname   = String(row['__EMPTY']          || '').trim()
    const firstName = String(row['__EMPTY_1']        || '').trim()
    const rawDept   = String(row['__EMPTY_2']        || '').trim()
    const jobTitle  = String(row['SALARY SCHEDULE']  || '').trim()

    if (!surname || !firstName) continue
    // Skip rows that are sub-headers or totals
    if (surname === 'Surname' || surname.toUpperCase() === surname && surname.length > 3) continue

    const email      = toEmail(surname, firstName)
    const department = DEPT_MAP[rawDept] || rawDept || 'General'
    const isAdmin    = isAdminTitle(jobTitle)
    const isHR       = !isAdmin && isHRTitle(jobTitle, rawDept)
    const displayName = `${firstName} ${surname.replace(/\(.*?\)/g, '').trim()}`
    const id         = `seed-${randomUUID().slice(0, 8)}`

    try {
      const exists = await pool.query('SELECT 1 FROM "User" WHERE email = $1', [email])
      if (exists.rows.length > 0) { skipped++; continue }

      await pool.query(
        `INSERT INTO "User" (id, email, password, department, "isAdmin", "isHR", "isSuperAdmin", "displayName", "darkMode", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, email, null, department, isAdmin, isHR, false, displayName, false, new Date()]
      )

      const role = isAdmin ? ' [ADMIN]' : isHR ? ' [HR]' : ''
      const titleLabel = jobTitle ? ` — ${jobTitle}` : ''
      console.log(`  ✓ ${email.padEnd(42)} ${department}${role}${titleLabel}`)
      inserted++
    } catch (err) {
      console.error(`  ✗ ${email}: ${err.message}`)
      errors++
    }
  }

  console.log('─'.repeat(70))
  console.log(`Done: ${inserted} inserted, ${skipped} already exist, ${errors} errors\n`)

  await pool.end()
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
