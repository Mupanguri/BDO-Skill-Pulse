import { Pool } from 'pg'
import bcrypt from 'bcrypt'

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function main() {
  console.log('Creating single admin account...')

  // Single admin user credentials
  const adminEmail = 'admin@bdo.co.zw'
  const adminPassword = 'Admin2024!' // Secure password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  try {
    // Check if admin already exists
    const existingAdminResult = await pool.query(
      'SELECT email FROM "User" WHERE email = $1',
      [adminEmail]
    )

    if (existingAdminResult.rows.length > 0) {
      console.log(`Admin user already exists: ${adminEmail}`)
      console.log('Admin credentials:')
      console.log(`  Email: ${adminEmail}`)
      console.log(`  Password: ${adminPassword}`)
      console.log('No changes made to existing admin account.')
    } else {
      // Create the admin user
      const now = new Date().toISOString()
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const adminUserResult = await pool.query(
        `INSERT INTO "User" (id, email, password, department, "isAdmin", "displayName", "darkMode", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, department, "isAdmin"`,
        [userId, adminEmail, hashedPassword, 'Admin', true, 'System Administrator', false, now]
      )

      const adminUser = adminUserResult.rows[0]
      console.log(`Admin user created successfully: ${adminUser.email}`)
      console.log('Admin credentials:')
      console.log(`  Email: ${adminUser.email}`)
      console.log(`  Password: ${adminPassword}`)
      console.log(`  Department: ${adminUser.department}`)
      console.log(`  Is Admin: ${adminUser.isAdmin}`)
    }
  } catch (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
