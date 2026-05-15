import pg from 'pg'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config({ path: './backend/.env' })

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system'
})

const EMAIL_DOMAIN = 'bdo.co.mw'

function toEmail(surname, firstName) {
  const cleanSurname = surname.replace(/\(.*?\)/g, '').trim().replace(/[\s\-]/g, '')
  const firstInitial = firstName.trim()[0]
  return (firstInitial + cleanSurname).toLowerCase().replace(/[^a-z]/g, '') + '@' + EMAIL_DOMAIN
}

const MALAWI_STAFF = [
  // Audit – Level 7 (Assistant Audit Manager)
  { firstName: 'Emmanuel',  surname: 'Chipeta',    dept: 'Audit', title: 'Assistant Audit Manager', isAdmin: false, isHR: false },
  { firstName: 'Taonga',    surname: 'Mwenda',     dept: 'Audit', title: 'Assistant Audit Manager', isAdmin: false, isHR: false },
  { firstName: 'Ruth',      surname: 'Gonani',     dept: 'Audit', title: 'Assistant Audit Manager', isAdmin: false, isHR: false },
  { firstName: 'Ronald',    surname: 'Chinkhu',    dept: 'Audit', title: 'Assistant Audit Manager', isAdmin: false, isHR: false },
  { firstName: 'Lehman',    surname: 'Kamwendo',   dept: 'Audit', title: 'Assistant Audit Manager', isAdmin: false, isHR: false },
  // Audit – Level 6 (Audit Manager L9)
  { firstName: 'Chifuniro', surname: 'Lungu',      dept: 'Audit', title: 'Audit Manager',           isAdmin: false, isHR: false },
  { firstName: 'Francis',   surname: 'Huwa',       dept: 'Audit', title: 'Audit Manager',           isAdmin: false, isHR: false },
  { firstName: 'Tafadzwa',  surname: 'Mushava',    dept: 'Audit', title: 'Audit Manager',           isAdmin: false, isHR: false },
  // Audit – Level 5 (Audit Senior L5)
  { firstName: 'Prisca',    surname: 'Banda',      dept: 'Audit', title: 'Audit Senior',            isAdmin: false, isHR: false },
  { firstName: 'Stephan',   surname: 'Mfune',      dept: 'Audit', title: 'Audit Senior',            isAdmin: false, isHR: false },
  // Audit – Level 4 (Audit Supervisor L7)
  { firstName: 'Talandira', surname: 'Maguza',     dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  { firstName: 'Pendo',     surname: 'Chikalamba', dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  { firstName: 'Matamando', surname: 'Kawiya',     dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  { firstName: 'Rowland',   surname: 'Msukwa',     dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  { firstName: 'Mzati',     surname: 'Matiya',     dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  { firstName: 'Chisomo',   surname: 'Phambana',   dept: 'Audit', title: 'Audit Supervisor',        isAdmin: false, isHR: false },
  // Audit – Level 3 (Audit Senior L6)
  { firstName: 'Linda',     surname: 'Kalinga',    dept: 'Audit', title: 'Audit Senior',            isAdmin: false, isHR: false },
  { firstName: 'Noel',      surname: 'Magawa',     dept: 'Audit', title: 'Audit Senior',            isAdmin: false, isHR: false },
  // Audit – Level 2 (Senior Audit Associate L4)
  { firstName: 'Samuel',    surname: 'Kangoni',    dept: 'Audit', title: 'Senior Audit Associate',  isAdmin: false, isHR: false },
  // Audit Partners & Directors
  { firstName: 'Ngoni',      surname: 'Kudenga',   dept: 'Audit', title: 'Partner',            isAdmin: true,  isHR: false },
  { firstName: 'Martin',     surname: 'Makaya',    dept: 'Audit', title: 'Partner',            isAdmin: true,  isHR: false },
  { firstName: 'Kudakwashe', surname: 'Chima',     dept: 'Audit', title: 'Partner',            isAdmin: true,  isHR: false },
  { firstName: 'Lydia',      surname: 'Mbale',     dept: 'Audit', title: 'Director',           isAdmin: true,  isHR: false },
  { firstName: 'Steve',      surname: 'Nyedula',   dept: 'Audit', title: 'Director',           isAdmin: true,  isHR: false },
  { firstName: 'Fawza',      surname: 'Kamoto',    dept: 'Audit', title: 'Director',           isAdmin: true,  isHR: false },
  { firstName: 'Maggie',     surname: 'Sambo',     dept: 'Audit', title: 'Director',           isAdmin: true,  isHR: false },
  { firstName: 'Tikhale',    surname: 'Kanthungo', dept: 'Audit', title: 'Director',           isAdmin: true,  isHR: false },
  { firstName: 'Tinkhani',   surname: 'Botha',     dept: 'Audit', title: 'Associate Director', isAdmin: true,  isHR: false },
  // Tax
  { firstName: 'Maxwell', surname: 'Ngorima',    dept: 'Tax',                  title: 'Partner',            isAdmin: true,  isHR: false },
  { firstName: 'Ngwiro',  surname: 'Mchakama',   dept: 'Tax',                  title: 'Associate Director', isAdmin: true,  isHR: false },
  { firstName: 'Carron',  surname: 'Gopani',     dept: 'Tax',                  title: 'Senior Manager',     isAdmin: false, isHR: false },
  { firstName: 'Tadeyo',  surname: 'Mwaungulu',  dept: 'Tax',                  title: 'Tax Supervisor',     isAdmin: false, isHR: false },
  // Advisory / Business Development
  { firstName: 'Robin',   surname: 'Mkandawire', dept: 'Business Development', title: 'Advisory Director',  isAdmin: true,  isHR: false },
  // Administration
  { firstName: 'Mphatso', surname: 'Lusiyano',   dept: 'Administration', title: 'Admin Director',           isAdmin: true,  isHR: false },
  { firstName: 'Beatrice',surname: 'Kaluluma',   dept: 'Administration', title: 'Finance & Admin Manager',  isAdmin: false, isHR: true  },
  { firstName: 'Marrium', surname: 'Injesi',     dept: 'Administration', title: 'Finance & Admin Manager',  isAdmin: false, isHR: true  },
  { firstName: 'Deborah', surname: 'Mitochi',    dept: 'Administration', title: 'Admin Accounts Senior',    isAdmin: false, isHR: true  },
  { firstName: 'Tabonga', surname: 'Chirwa',     dept: 'Administration', title: 'Admin Accounts Assistant', isAdmin: false, isHR: false },
]

async function main() {
  console.log(`\nSeeding ${MALAWI_STAFF.length} Malawi staff (@${EMAIL_DOMAIN})`)
  console.log('─'.repeat(80))

  let inserted = 0, skipped = 0, errors = 0

  for (const person of MALAWI_STAFF) {
    const email       = toEmail(person.surname, person.firstName)
    const displayName = `${person.firstName} ${person.surname}`
    const id          = `mw-${randomUUID().slice(0, 8)}`

    try {
      const exists = await pool.query('SELECT 1 FROM "User" WHERE email = $1', [email])
      if (exists.rows.length > 0) {
        console.log(`  ~ ${email.padEnd(40)} already exists`)
        skipped++
        continue
      }

      await pool.query(
        `INSERT INTO "User" (id, email, password, department, "isAdmin", "isHR", "isSuperAdmin", "displayName", "darkMode", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, email, null, person.dept, person.isAdmin, person.isHR, false, displayName, false, new Date()]
      )

      const role = person.isAdmin ? ' [ADMIN]' : person.isHR ? ' [HR]' : ''
      console.log(`  ✓ ${email.padEnd(40)} ${person.dept.padEnd(25)} — ${person.title}${role}`)
      inserted++
    } catch (err) {
      console.error(`  ✗ ${email}: ${err.message}`)
      errors++
    }
  }

  console.log('─'.repeat(80))
  console.log(`Done: ${inserted} inserted, ${skipped} already exist, ${errors} errors\n`)

  await pool.end()
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
