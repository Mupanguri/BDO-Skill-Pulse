import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { pool, prisma } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import {
  ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS, SESSION_TIMEOUT,
  JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, PASSWORD_REGEX, EMAIL_DOMAIN, OFFICIAL_DEPARTMENTS
} from '../constants.js'

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

const router = Router()

// Shared state injected by server.js
let userCredentials = {}
export const setUserCredentials = (creds) => { userCredentials = creds }
export const getUserCredentials = () => userCredentials

const generateTokens = (user) => {
  const payload = { email: user.email, department: user.department, isAdmin: user.isAdmin, isHR: Boolean(user.isHR), isSuperAdmin: Boolean(user.isSuperAdmin) }
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  const refreshToken = jwt.sign({ email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
  return { accessToken, refreshToken }
}

const cookieOpts = (req) => ({
  httpOnly: true,
  secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  sameSite: 'strict'
})

router.post('/api/register', async (req, res) => {
  const { email, password, department, displayName } = req.body

  if (!email || !password || !department) {
    return res.status(400).json({ error: 'Email, password, and department are required' })
  }

  if (!OFFICIAL_DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: `Invalid department. Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}` })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' })
  if (email.split('@')[1] !== EMAIL_DOMAIN) {
    return res.status(400).json({ error: `Only @${EMAIL_DOMAIN} email addresses are allowed` })
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' })
  }

  // HR department users automatically receive HR oversight role
  const autoIsHR = department === 'Human Resources'

  try {
    const existing = await pool.query('SELECT email, password FROM "User" WHERE email = $1', [email])
    if (existing.rows.length) {
      const existingUser = existing.rows[0]
      if (existingUser.password === null) {
        // Pre-seeded account — tell the frontend to use email code login
        return res.status(409).json({
          error: 'This email is already registered. Sign in using your email code.',
          useOtp: true,
        })
      }
      return res.status(409).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    await pool.query(
      `INSERT INTO "User" (id, email, password, department, "isAdmin", "isHR", "displayName", "darkMode", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, email, hashedPassword, department, false, autoIsHR, displayName || null, false, new Date().toISOString()]
    )

    userCredentials[email] = { password: hashedPassword, department, isAdmin: false, isHR: autoIsHR, isSuperAdmin: false }

    res.status(201).json({ message: 'User registered successfully', email, department, isAdmin: false, isHR: autoIsHR, displayName: displayName || null, darkMode: false })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/api/verify-password', authenticateToken, async (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Password required' })
  const user = userCredentials[req.user.email]
  if (!user) return res.status(401).json({ error: 'User not found' })
  try {
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })
    res.json({ verified: true })
  } catch {
    res.status(500).json({ error: 'Verification failed' })
  }
})

router.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

  const user = userCredentials[email]
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  try {
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const { accessToken, refreshToken } = generateTokens({ email, ...user })
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

    await prisma.userSession.create({
      data: { userEmail: email, sessionToken: accessToken, refreshToken, expiresAt, lastActivity: new Date() }
    })

    const opts = cookieOpts(req)
    res.cookie('accessToken', accessToken, { ...opts, maxAge: ACCESS_TOKEN_TTL_MS })
    res.cookie('refreshToken', refreshToken, { ...opts, maxAge: REFRESH_TOKEN_TTL_MS })

    res.json({ email, department: user.department, isAdmin: user.isAdmin, isHR: Boolean(user.isHR), isSuperAdmin: Boolean(user.isSuperAdmin), darkMode: Boolean(user.darkMode), accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/api/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' })

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const session = await prisma.userSession.findFirst({ where: { userEmail: decoded.email, refreshToken } })
    if (!session) return res.status(403).json({ error: 'Invalid refresh token' })

    if (Date.now() - new Date(session.lastActivity).getTime() > SESSION_TIMEOUT) {
      await prisma.userSession.delete({ where: { id: session.id } })
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    const user = userCredentials[decoded.email]
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens({ email: decoded.email, ...user })

    await prisma.userSession.update({
      where: { id: session.id },
      data: { sessionToken: newAccess, refreshToken: newRefresh, expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS), lastActivity: new Date() }
    })

    const opts = cookieOpts(req)
    res.cookie('accessToken', newAccess, { ...opts, maxAge: ACCESS_TOKEN_TTL_MS })
    res.cookie('refreshToken', newRefresh, { ...opts, maxAge: REFRESH_TOKEN_TTL_MS })

    res.json({ accessToken: newAccess, refreshToken: newRefresh, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 })
  } catch {
    res.status(403).json({ error: 'Invalid refresh token' })
  }
})

router.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1]
    await prisma.userSession.deleteMany({ where: { userEmail: req.user.email, sessionToken: token } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  } catch {
    res.status(500).json({ error: 'Logout failed' })
  }
})

router.post('/api/logout-all', authenticateToken, async (req, res) => {
  try {
    await prisma.userSession.deleteMany({ where: { userEmail: req.user.email } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out from all devices successfully' })
  } catch {
    res.status(500).json({ error: 'Logout failed' })
  }
})

router.get('/api/session-status', authenticateToken, async (req, res) => {
  try {
    const user = userCredentials[req.user.email]
    if (!user) return res.status(401).json({ error: 'User not found' })

    const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1]
    const session = await prisma.userSession.findFirst({ where: { userEmail: req.user.email, sessionToken: token } })
    if (!session) return res.status(401).json({ error: 'Session not found' })

    const timeSince = Date.now() - new Date(session.lastActivity).getTime()
    if (timeSince > SESSION_TIMEOUT) {
      await prisma.userSession.delete({ where: { id: session.id } })
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    await prisma.userSession.update({ where: { id: session.id }, data: { lastActivity: new Date() } })

    res.json({
      valid: true,
      user: { email: req.user.email, department: req.user.department, isAdmin: req.user.isAdmin, isHR: Boolean(req.user.isHR), isSuperAdmin: Boolean(req.user.isSuperAdmin) },
      timeUntilExpiry: SESSION_TIMEOUT - timeSince
    })
  } catch {
    res.status(500).json({ error: 'Failed to check session status' })
  }
})

// POST /api/auth/otp/request
// Body: { email, forgot?: true }
// Pre-seeded users (password=null) always get an OTP.
// Password users only get an OTP when forgot=true (password reset flow).
// Returns { sent: true } | { hasPassword: true }
router.post('/api/auth/otp/request', async (req, res) => {
  const { email, forgot } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    const result = await pool.query(
      'SELECT password FROM "User" WHERE email = $1 AND "deletedAt" IS NULL',
      [email]
    )

    if (!result.rows.length) {
      // Silent: don't reveal whether the email exists
      return res.json({ sent: true })
    }

    const user = result.rows[0]

    if (user.password !== null && !forgot) {
      // Has a local password and not a forgot-password request → use password flow
      return res.json({ hasPassword: true })
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

    // Invalidate any previous unused OTPs for this email
    await pool.query(
      'UPDATE "OtpCode" SET used = true WHERE email = $1 AND used = false',
      [email]
    )

    await prisma.otpCode.create({ data: { email, code, expiresAt } })

    if (process.env.SMTP_USER) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || `BDO Skills Pulse <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your BDO Skills Pulse Login Code',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <img src="https://bdo-quiz-system.onrender.com/BDO%20Corner%20preview.png" alt="BDO" style="height:48px;margin-bottom:24px" />
            <h2 style="color:#0a1628;margin:0 0 8px">Your one-time login code</h2>
            <p style="color:#555;margin:0 0 24px">Use this code to sign in to BDO Skills Pulse. It expires in 10 minutes.</p>
            <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#cc2200;padding:20px;background:#f8f8f8;text-align:center;border-radius:8px;border:1px solid #e5e5e5">
              ${code}
            </div>
            <p style="color:#999;font-size:12px;margin-top:24px">Do not share this code with anyone. BDO staff will never ask for it.</p>
          </div>
        `,
      })
    } else {
      // Dev mode: print OTP to console when SMTP is not configured
      console.log(`[OTP DEV] Code for ${email}: ${code}`)
    }

    res.json({ sent: true })
  } catch (err) {
    console.error('OTP request error:', err)
    res.status(500).json({ error: 'Failed to send login code' })
  }
})

// POST /api/auth/otp/verify
// Body: { email, code }
// Verifies OTP, issues JWT (same shape as /api/login), sets httpOnly cookies.
router.post('/api/auth/otp/verify', async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' })

  try {
    const otpRow = await prisma.otpCode.findFirst({
      where: { email, code, used: false, expiresAt: { gt: new Date() } },
    })

    if (!otpRow) {
      return res.status(401).json({ error: 'Invalid or expired code. Please request a new one.' })
    }

    // Mark OTP as used
    await prisma.otpCode.update({ where: { id: otpRow.id }, data: { used: true } })

    // Load user from DB
    const userRow = await pool.query(
      'SELECT * FROM "User" WHERE email = $1 AND "deletedAt" IS NULL',
      [email]
    )
    if (!userRow.rows.length) return res.status(404).json({ error: 'User not found' })

    const u = userRow.rows[0]

    // Warm the credentials cache
    userCredentials[email] = {
      password: u.password,
      department: u.department,
      isAdmin: Boolean(u.isAdmin),
      isHR: Boolean(u.isHR),
      isSuperAdmin: Boolean(u.isSuperAdmin),
      displayName: u.displayName,
      darkMode: Boolean(u.darkMode),
    }

    const { accessToken, refreshToken } = generateTokens({ email, ...userCredentials[email] })
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

    await prisma.userSession.create({
      data: { userEmail: email, sessionToken: accessToken, refreshToken, expiresAt, lastActivity: new Date() },
    })

    const opts = cookieOpts(req)
    res.cookie('accessToken', accessToken, { ...opts, maxAge: ACCESS_TOKEN_TTL_MS })
    res.cookie('refreshToken', refreshToken, { ...opts, maxAge: REFRESH_TOKEN_TTL_MS })

    res.json({
      email,
      department: u.department,
      isAdmin: Boolean(u.isAdmin),
      isHR: Boolean(u.isHR),
      isSuperAdmin: Boolean(u.isSuperAdmin),
      hasPassword: Boolean(u.password),
      darkMode: Boolean(u.darkMode),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
    })
  } catch (err) {
    console.error('OTP verify error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

export default router
