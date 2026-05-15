import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool, prisma } from '../db.js'
import { authenticateToken, requireAdmin, requireAdminOrHR, requireHR, requireSuperAdmin } from '../middleware/auth.js'
import { logAuditAction } from '../middleware/logging.js'
import { PASSWORD_REGEX, OFFICIAL_DEPARTMENTS } from '../constants.js'
import { getUserCredentials } from './auth.js'

const router = Router()

router.get('/api/users', authenticateToken, requireAdminOrHR, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, department, "isAdmin", "isHR", "isSuperAdmin", "displayName", "darkMode", "profileImage", "lastPasswordChange", "createdAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `)
    res.json(result.rows.map(r => ({ ...r, isAdmin: Boolean(r.isAdmin), isHR: Boolean(r.isHR), isSuperAdmin: Boolean(r.isSuperAdmin), darkMode: Boolean(r.darkMode) })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.get('/api/user/:email/profile', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) return res.status(403).json({ error: 'Access denied' })

  try {
    const result = await pool.query(
      `SELECT id, email, department, "isAdmin", "darkMode", "profileImage", "displayName", "lastPasswordChange", "createdAt",
              (password IS NOT NULL) AS "hasPassword"
       FROM "User" WHERE email = $1`,
      [email]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' })
    const row = result.rows[0]
    res.json({ ...row, isAdmin: Boolean(row.isAdmin), darkMode: Boolean(row.darkMode), hasPassword: Boolean(row.hasPassword) })
  } catch {
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

router.patch('/api/user/:email/profile', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) return res.status(403).json({ error: 'Access denied' })

  const { darkMode, profileImage, displayName } = req.body
  const updates = []
  const values = []
  let p = 1

  if (darkMode !== undefined) { updates.push(`"darkMode"=$${p++}`); values.push(darkMode) }
  if (profileImage !== undefined) { updates.push(`"profileImage"=$${p++}`); values.push(profileImage) }
  if (displayName !== undefined) { updates.push(`"displayName"=$${p++}`); values.push(displayName) }

  if (!updates.length) return res.status(400).json({ error: 'No updates provided' })

  values.push(email)
  try {
    const result = await pool.query(
      `UPDATE "User" SET ${updates.join(', ')} WHERE email=$${p} RETURNING id, email, department, "isAdmin", "darkMode", "profileImage", "displayName", "lastPasswordChange", "createdAt"`,
      values
    )
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' })

    const creds = getUserCredentials()
    if (creds[email]) {
      if (darkMode !== undefined) creds[email].darkMode = darkMode
      if (profileImage !== undefined) creds[email].profileImage = profileImage
      if (displayName !== undefined) creds[email].displayName = displayName
    }

    const row = result.rows[0]
    res.json({ message: 'Profile updated successfully', profile: { ...row, isAdmin: Boolean(row.isAdmin), darkMode: Boolean(row.darkMode) } })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

router.patch('/api/user/:email/password', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { currentPassword, newPassword, otpCode } = req.body
  if (req.user.email !== email && !req.user.isAdmin) return res.status(403).json({ error: 'Access denied' })
  if (!newPassword) return res.status(400).json({ error: 'New password is required' })
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&).' })
  }

  try {
    const creds = getUserCredentials()
    if (req.user.email === email) {
      if (!creds[email]) return res.status(404).json({ error: 'User not found' })
      if (otpCode) {
        const otpRow = await prisma.otpCode.findFirst({
          where: { email, code: otpCode, used: false, expiresAt: { gt: new Date() } }
        })
        if (!otpRow) return res.status(401).json({ error: 'Invalid or expired code. Request a new one.' })
        await prisma.otpCode.update({ where: { id: otpRow.id }, data: { used: true } })
      } else if (creds[email].password !== null) {
        const valid = await bcrypt.compare(currentPassword, creds[email].password)
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })
      } else {
        return res.status(400).json({ error: 'A verification code is required to set your password.' })
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query(`UPDATE "User" SET password=$1, "lastPasswordChange"=$2 WHERE email=$3`, [hashed, new Date().toISOString(), email])

    if (creds[email]) creds[email].password = hashed

    await logAuditAction(req.user.email, 'change_password', { changedUser: email, adminChange: req.user.email !== email }, req)

    if (req.user.email !== email) {
      await prisma.userNotification.create({
        data: {
          userEmail: email, type: 'security', title: 'Password Changed by Admin',
          message: 'An administrator has changed your password. If you did not request this, contact IT support immediately.',
          adminEmail: req.user.email
        }
      }).catch(() => {})
    }

    res.json({ message: 'Password changed successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to change password' })
  }
})

router.get('/api/user/:email/warnings', async (req, res) => {
  try {
    const warnings = await prisma.userWarning.findMany({ where: { userEmail: req.params.email }, orderBy: { timestamp: 'desc' } })
    res.json({ warnings })
  } catch {
    res.status(500).json({ error: 'Failed to fetch warnings' })
  }
})

router.post('/api/user/:email/warn', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { reason, adminEmail, quizName } = req.body

  const exists = await pool.query('SELECT email FROM "User" WHERE email=$1', [email])
  if (!exists.rows.length) return res.status(404).json({ error: 'User not found' })

  try {
    const warning = await prisma.userWarning.create({
      data: { userEmail: email, reason: reason || 'Performance flagged', adminEmail, quizName: quizName || null }
    })
    await logAuditAction(req.user.email, 'warn_user', { warnedUser: email, reason, quizName }, req)

    const adminName = adminEmail.split('@')[0].replace('.', ' ').toUpperCase()
    await prisma.userNotification.create({
      data: {
        userEmail: email, type: 'warning', title: 'Performance Warning',
        message: `${adminName} has raised a flag for your performance in ${quizName || 'a quiz'} and requests you improve.`,
        adminEmail, quizName: quizName || null
      }
    })
    res.status(201).json({ message: 'Warning added successfully', warning })
  } catch {
    res.status(500).json({ error: 'Failed to add warning' })
  }
})

router.delete('/api/user/:email/warnings/:warningId', async (req, res) => {
  try {
    await prisma.userWarning.delete({ where: { id: req.params.warningId } })
    res.json({ message: 'Warning removed successfully' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Warning not found' })
    res.status(500).json({ error: 'Failed to delete warning' })
  }
})

router.patch('/api/user/:email/promote', authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.params
  const creds = getUserCredentials()
  if (!creds[email]) return res.status(404).json({ error: 'User not found' })
  if (creds[email].isAdmin) return res.status(400).json({ error: 'User is already an administrator' })

  try {
    await pool.query(`UPDATE "User" SET "isAdmin"=true WHERE email=$1`, [email])
    creds[email].isAdmin = true
    await logAuditAction(req.user.email, 'promote_user', { promotedUser: email, reason: req.body.reason || 'Admin promotion' }, req)
    res.json({ message: 'User promoted to administrator', email, isAdmin: true })
  } catch {
    res.status(500).json({ error: 'Failed to promote user' })
  }
})

router.patch('/api/user/:email/demote', authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.params
  if (req.user.email === email) return res.status(400).json({ error: 'Cannot demote yourself' })
  const creds = getUserCredentials()
  if (!creds[email]) return res.status(404).json({ error: 'User not found' })
  if (!creds[email].isAdmin) return res.status(400).json({ error: 'User is not an administrator' })

  try {
    await pool.query(`UPDATE "User" SET "isAdmin"=false WHERE email=$1`, [email])
    creds[email].isAdmin = false
    await logAuditAction(req.user.email, 'demote_user', { demotedUser: email, reason: req.body.reason || 'Admin demotion' }, req)
    res.json({ message: 'User removed from administrator status', email, isAdmin: false })
  } catch {
    res.status(500).json({ error: 'Failed to demote user' })
  }
})

// Legacy elevate route (same as promote)
router.post('/api/user/:email/elevate', authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.params
  const creds = getUserCredentials()
  if (!creds[email]) return res.status(404).json({ error: 'User not found' })
  if (creds[email].isAdmin) return res.status(400).json({ error: 'User is already an administrator' })

  try {
    await pool.query(`UPDATE "User" SET "isAdmin"=true WHERE email=$1`, [email])
    creds[email].isAdmin = true
    await logAuditAction(req.user.email, 'elevate_user', { elevatedUser: email }, req)
    res.json({ message: 'User elevated to administrator status', email, isAdmin: true })
  } catch {
    res.status(500).json({ error: 'Failed to elevate user' })
  }
})

router.delete('/api/user/:email/account', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) return res.status(403).json({ error: 'Access denied' })

  try {
    await pool.query(
      `UPDATE "User" SET email=$1, password=$2, "displayName"=$3, "profileImage"=NULL, "deletedAt"=$4 WHERE email=$5`,
      [`deleted_${Date.now()}@deleted.invalid`, 'DELETED', 'Deleted User', new Date(), email]
    )
    await prisma.userSession.deleteMany({ where: { userEmail: email } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    await logAuditAction(req.user.email, 'account_deleted', { targetEmail: email }, req)
    res.json({ message: 'Account deleted and data anonymised' })
  } catch {
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

// Grant or revoke isAdmin / isHR flags — HR only
router.patch('/api/user/:email/role', authenticateToken, requireHR, async (req, res) => {
  const { email } = req.params
  if (req.user.email === email) return res.status(400).json({ error: 'Cannot change your own role' })

  const creds = getUserCredentials()
  if (!creds[email]) return res.status(404).json({ error: 'User not found' })

  const { isAdmin, isHR } = req.body
  const updates = []
  const values = []
  let p = 1

  if (typeof isAdmin === 'boolean') { updates.push(`"isAdmin"=$${p++}`); values.push(isAdmin) }
  if (typeof isHR === 'boolean') { updates.push(`"isHR"=$${p++}`); values.push(isHR) }

  if (!updates.length) return res.status(400).json({ error: 'No role changes specified' })

  values.push(email)
  try {
    await pool.query(`UPDATE "User" SET ${updates.join(', ')} WHERE email=$${p}`, values)
    if (typeof isAdmin === 'boolean') creds[email].isAdmin = isAdmin
    if (typeof isHR === 'boolean') creds[email].isHR = isHR

    await logAuditAction(req.user.email, 'change_role', { targetEmail: email, isAdmin, isHR }, req)
    res.json({ message: 'User role updated', email, isAdmin: creds[email].isAdmin, isHR: creds[email].isHR })
  } catch {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

// Super admin: create a new user
router.post('/api/users/create', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { email, department, displayName, isAdmin, isHR, password } = req.body
  if (!email || !department || !password) return res.status(400).json({ error: 'Email, department, and password are required' })
  if (!OFFICIAL_DEPARTMENTS.includes(department)) return res.status(400).json({ error: 'Invalid department' })

  const creds = getUserCredentials()
  if (creds[email]) return res.status(409).json({ error: 'User already exists' })

  const autoIsHR = department === 'Human Resources' || Boolean(isHR)
  try {
    const hashed = await bcrypt.hash(password, 10)
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    await pool.query(
      `INSERT INTO "User" (id, email, password, department, "isAdmin", "isHR", "displayName", "darkMode", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, email, hashed, department, Boolean(isAdmin), autoIsHR, displayName || null, false, new Date().toISOString()]
    )
    creds[email] = { password: hashed, department, isAdmin: Boolean(isAdmin), isHR: autoIsHR, isSuperAdmin: false }
    await logAuditAction(req.user.email, 'create_user', { createdEmail: email, department, isAdmin: Boolean(isAdmin), isHR: autoIsHR }, req)
    res.status(201).json({ message: 'User created successfully', email, department, isAdmin: Boolean(isAdmin), isHR: autoIsHR })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Super admin: hard-delete a user
router.delete('/api/users/:email/delete', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { email } = req.params
  if (req.user.email === email) return res.status(400).json({ error: 'Cannot delete yourself' })

  const creds = getUserCredentials()
  try {
    await pool.query(`DELETE FROM "User" WHERE email=$1`, [email])
    delete creds[email]
    await logAuditAction(req.user.email, 'delete_user', { deletedEmail: email }, req)
    res.json({ message: 'User deleted permanently' })
  } catch {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

router.get('/api/user/:email/export', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) return res.status(403).json({ error: 'Access denied' })

  try {
    const [userRow, responses, warnings, notifications, feedback] = await Promise.all([
      pool.query(`SELECT id, email, department, "isAdmin", "displayName", "createdAt" FROM "User" WHERE email=$1`, [email]),
      pool.query(`SELECT r.score, r."timeSpent", r."completedAt", r."sessionId" FROM "QuizResponse" r JOIN "User" u ON u.id=r."userId" WHERE u.email=$1`, [email]),
      prisma.userWarning.findMany({ where: { userEmail: email } }),
      prisma.userNotification.findMany({ where: { userEmail: email } }),
      prisma.quizFeedback.findMany({ where: { userEmail: email } })
    ])
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.json"`)
    res.json({ profile: userRow.rows[0], quizResponses: responses.rows, warnings, notifications, feedback })
  } catch {
    res.status(500).json({ error: 'Failed to export data' })
  }
})

export default router
