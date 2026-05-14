import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const { Pool } = pg

const connectionOptions = {
  connectionString: process.env.DATABASE_URL
}

if (process.env.NODE_ENV === 'production') {
  connectionOptions.ssl = {
    rejectUnauthorized: true,
    servername: process.env.DB_SSL_SERVERNAME || ''
  }
} else {
  connectionOptions.ssl = false
}

export const pool = new Pool(connectionOptions)

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })

export const connectToDatabase = async () => {
  try {
    await pool.query('SELECT NOW()')
    console.log('[DB] PostgreSQL connected successfully')
    return true
  } catch (err) {
    console.error('[DB] Connection failed:', err.message)
    return false
  }
}

// Load all user credentials into memory at startup (used for fast auth lookups)
export const loadUserCredentials = async () => {
  try {
    const result = await pool.query(`
      SELECT email, password, department, "isAdmin", "isHR", "isSuperAdmin", "displayName", "darkMode", "profileImage", "lastPasswordChange"
      FROM "User"
    `)
    const credentials = {}
    for (const row of result.rows) {
      credentials[row.email] = {
        password: row.password,
        department: row.department,
        isAdmin: Boolean(row.isAdmin),
        isHR: Boolean(row.isHR),
        isSuperAdmin: Boolean(row.isSuperAdmin),
        displayName: row.displayName,
        darkMode: Boolean(row.darkMode),
        profileImage: row.profileImage,
        lastPasswordChange: row.lastPasswordChange
      }
    }
    return credentials
  } catch (err) {
    console.error('[DB] Failed to load user credentials:', err.message)
    return {}
  }
}
