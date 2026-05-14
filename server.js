import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { doubleCsrf } from 'csrf-csrf'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { createRequire } from 'module'
import logger from './src/lib/utils/logger.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
})

const app = express()
const PORT = process.env.PORT || 3001

// Use PostgreSQL database
let pool = null
let usePostgres = true

// Database connection with logging
const connectToDatabase = async () => {
  const dbStartTime = logger.startPerformance('database_connection')
  try {
    const { Pool } = await import('pg')
    
    // Build connection options
    const connectionOptions = {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:windows@localhost:5432/bdo_quiz_system'
    }
    
    // For production (Supabase), configure SSL properly
    if (process.env.NODE_ENV === 'production') {
      connectionOptions.ssl = {
        rejectUnauthorized: true,
        servername: 'db.gcqocoyqmzwzkfpehbju.supabase.co'
      }
    } else {
      connectionOptions.ssl = false
    }
    
    pool = new Pool(connectionOptions)

    // Test database connection
    await pool.query('SELECT NOW()')
    const duration = logger.endPerformance('database_connection')
    logger.info('PostgreSQL connected successfully', { duration })
    return true
  } catch (err) {
    const duration = logger.endPerformance('database_connection')
    logger.error('PostgreSQL connection failed', err, { duration })
    return false
  }
}

// Initialize database connection
const dbConnected = await connectToDatabase()
if (!dbConnected) {
  process.exit(1)
}

// Comprehensive Logging System
const fs = await import('fs')
const path = await import('path')
const { fileURLToPath } = await import('url')

// Logging configuration
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOG_DIR = path.resolve(__dirname, 'logs')
const LOG_FILE = path.join(LOG_DIR, 'api-requests.log')
const ERROR_LOG_FILE = path.join(LOG_DIR, 'errors.log')
const PERFORMANCE_LOG_FILE = path.join(LOG_DIR, 'performance.log')
const BUTTON_ACTIONS_LOG_FILE = path.join(LOG_DIR, 'button-actions.log')
const SYSTEM_HEALTH_LOG_FILE = path.join(LOG_DIR, 'system-health.log')

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// Logging utilities
const logToFile = (filePath, message) => {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${message}\n`

  try {
    fs.appendFileSync(filePath, logEntry)
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

// Standardised error response helper
const sendError = (res, status, message, code = null) =>
  res.status(status).json({ error: message, ...(code ? { code } : {}) })

// Comprehensive request logging middleware
const SENSITIVE_FIELDS = ['password', 'newPassword', 'oldPassword', 'currentPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken']
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body
  const sanitized = { ...body }
  SENSITIVE_FIELDS.forEach(key => { if (sanitized[key] !== undefined) sanitized[key] = '[REDACTED]' })
  return sanitized
}

const logRequest = (req, res, next) => {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Extract request details
  const requestDetails = {
    requestId,
    timestamp,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    contentType: req.get('Content-Type') || 'Unknown',
    contentLength: req.get('Content-Length') || 'Unknown',
    headers: {
      authorization: req.get('Authorization') ? 'Bearer [TOKEN_PRESENT]' : 'None',
      'x-forwarded-for': req.get('X-Forwarded-For') || 'None',
      'x-real-ip': req.get('X-Real-IP') || 'None'
    },
    body: sanitizeBody(req.body),
    query: req.query || {},
    params: req.params || {}
  }

  // Log request details
  logToFile(LOG_FILE, `REQUEST: ${JSON.stringify(requestDetails)}`)

  // Log button actions based on URL patterns
  if (req.originalUrl.includes('/api/sessions') && req.method === 'PATCH') {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: Session Toggle - ${req.originalUrl} - ${req.body.isActive ? 'ACTIVATE' : 'DEACTIVATE'} - User: ${req.user?.email || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/users') && req.method === 'POST') {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: User Elevate - ${req.originalUrl} - User: ${req.body.email || 'Unknown'} - Admin: ${req.user?.email || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/user') && req.originalUrl.includes('/password')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: Password Change - ${req.originalUrl} - User: ${req.user?.email || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/user') && req.originalUrl.includes('/profile')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: Profile Update - ${req.originalUrl} - User: ${req.user?.email || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/responses')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: Quiz Submit - ${req.originalUrl} - User: ${req.body.userEmail || 'Unknown'} - Score: ${req.body.score || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/feedback')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: Feedback Submit - ${req.originalUrl} - User: ${req.body.userEmail || 'Unknown'} - Rating: ${req.body.rating || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/login')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: User Login - ${req.originalUrl} - Email: ${req.body.email || 'Unknown'}`)
  } else if (req.originalUrl.includes('/api/register')) {
    logToFile(BUTTON_ACTIONS_LOG_FILE, `BUTTON_ACTION: User Register - ${req.originalUrl} - Email: ${req.body.email || 'Unknown'} - Department: ${req.body.department || 'Unknown'}`)
  }

  // Override res.json to capture response
  const originalJson = res.json
  res.json = function (data) {
    const endTime = process.hrtime.bigint()
    const responseTime = Number(endTime - BigInt(startTime)) / 1000000 // Convert to milliseconds

    // Log response details
    const responseDetails = {
      requestId,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      responseTime: `${Math.round(responseTime)}ms`,
      responseBody: data || {}
    }

    logger.api(req.method, req.originalUrl, Math.round(responseTime), res.statusCode, responseDetails)

    // Log errors
    if (res.statusCode >= 400) {
      logger.error(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, null, {
        statusCode: res.statusCode,
        errorMessage: data?.error || 'Unknown error',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        requestBody: req.body
      })
    }

    return originalJson.call(this, data)
  }

  // Handle errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const errorDetails = {
        requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      }
      logToFile(ERROR_LOG_FILE, `ERROR: ${JSON.stringify(errorDetails)}`)
    }
  })

  next()
}

// System health monitoring
const logSystemHealth = async () => {
  const healthData = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    activeConnections: await prisma.userSession.count().catch(() => 0),
    activeUsers: Object.keys(userCredentials).length,
    databaseStatus: 'PostgreSQL Connected'
  }

  logToFile(SYSTEM_HEALTH_LOG_FILE, `HEALTH: ${JSON.stringify(healthData)}`)
}

// JWT Configuration
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set as environment variables.')
  console.error('Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
  process.exit(1)
}
const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ONE_MINUTE_MS = 60 * 1000
const ONE_DAY_MS = 24 * 60 * ONE_MINUTE_MS
const JWT_EXPIRES_IN = '1h'
const JWT_REFRESH_EXPIRES_IN = '7d'
const SESSION_TIMEOUT = 60 * ONE_MINUTE_MS
const ACCESS_TOKEN_TTL_MS = 15 * ONE_MINUTE_MS
const REFRESH_TOKEN_TTL_MS = 7 * ONE_DAY_MS
const RETAKE_COOLDOWN_MS = 30 * ONE_MINUTE_MS
const RETAKE_WINDOW_MS = 2 * 60 * ONE_MINUTE_MS

// Log system startup
logToFile(LOG_FILE, `SYSTEM_STARTUP: BDO Skills Pulse API server starting on http://localhost:${PORT}`)
logToFile(LOG_FILE, `SYSTEM_CONFIG: JWT_EXPIRES_IN=${JWT_EXPIRES_IN}, JWT_REFRESH_EXPIRES_IN=${JWT_REFRESH_EXPIRES_IN}, SESSION_TIMEOUT=${SESSION_TIMEOUT}`)

// Set up periodic health logging
setInterval(logSystemHealth, 60000) // Log every minute

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    // For production, add your Vercel domain here
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://bdoskillpulse.vercel.app'
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    }
  }
}))
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json({ limit: '100kb' }))
app.use(logRequest) // Add comprehensive logging middleware

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * ONE_MINUTE_MS,
  max: 10,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
const registerLimiter = rateLimit({
  windowMs: 60 * ONE_MINUTE_MS,
  max: 5,
  message: { error: 'Too many registrations from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
})
const resetLimiter = rateLimit({
  windowMs: 60 * ONE_MINUTE_MS,
  max: 5,
  message: { error: 'Too many reset requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// CSRF protection using double-submit cookie pattern
// Only enforced once cookies are the primary auth mechanism (CSRF_ENABLED=true)
let doubleCsrfProtection = null
if (process.env.CSRF_ENABLED === 'true') {
  if (!process.env.CSRF_SECRET) {
    console.error('FATAL: CSRF_SECRET must be set when CSRF_ENABLED=true')
    process.exit(1)
  }
  const csrf = doubleCsrf({ getSecret: () => process.env.CSRF_SECRET, cookieName: 'x-csrf-token' })
  doubleCsrfProtection = csrf.doubleCsrfProtection
  app.use(doubleCsrfProtection)
  logger.info('CSRF protection enabled')
}

// Initialize user credentials from database
const initializeUserCredentials = async () => {
  try {
    const result = await pool.query('SELECT email, password, department, "isAdmin", "displayName", "darkMode", "profileImage", "lastPasswordChange" FROM "User"')
    const credentials = {}

    for (const user of result.rows) {
      credentials[user.email] = {
        password: user.password, // Already hashed in database
        department: user.department,
        isAdmin: Boolean(user.isAdmin),
        displayName: user.displayName,
        darkMode: Boolean(user.darkMode),
        profileImage: user.profileImage,
        lastPasswordChange: user.lastPasswordChange
      }
    }


    return credentials
  } catch (err) {
    console.error('Error loading users from database:', err)
    return {}
  }
}

// Global user credentials (will be initialized on server start)
let userCredentials = {}

// Warnings, retakes, and notifications are persisted via Prisma (UserWarning, UserRetake, UserNotification tables)

// Database queries for sessions and responses
const getSessionsFromDB = async () => {
  try {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT s.*, COUNT(r.id) as responseCount
        FROM "QuizSession" s
        LEFT JOIN "QuizResponse" r ON s.id = r."sessionId"
        GROUP BY s.id
        ORDER BY s."createdAt" DESC
      `)

      const sessions = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        date: row.date,
        time: row.time,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        questions: JSON.parse(row.questions || '[]'),
        _count: { responses: row.responseCount || 0 }
      }))

      return sessions
    } else {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT s.*, COUNT(r.id) as responseCount
          FROM QuizSession s
          LEFT JOIN QuizResponse r ON s.id = r.sessionId
          GROUP BY s.id
          ORDER BY s.createdAt DESC
        `, [], (err, rows) => {
          if (err) {
            console.error('Error fetching sessions:', err)
            reject(err)
          } else {
            const sessions = rows.map(row => ({
              id: row.id,
              name: row.name,
              date: row.date,
              time: row.time,
              isActive: Boolean(row.isActive),
              createdAt: row.createdAt,
              createdBy: row.createdBy,
              questions: JSON.parse(row.questions || '[]'),
              _count: { responses: row.responseCount || 0 }
            }))
            resolve(sessions)
          }
        })
      })
    }
  } catch (err) {
    console.error('Error fetching sessions:', err)
    throw err
  }
}

const getResponsesFromDB = async () => {
  try {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT r.*, u.email, u.department
        FROM "QuizResponse" r
        LEFT JOIN "User" u ON r."userId" = u.id
        ORDER BY r."completedAt" DESC
      `)

      const responses = result.rows.map(row => ({
        id: row.id,
        sessionId: row.sessionId,
        score: row.score,
        timeSpent: row.timeSpent,
        completedAt: row.completedAt,
        user: row.email ? {
          email: row.email,
          department: row.department
        } : null
      }))

      return responses
    } else {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT r.*, u.email, u.department
          FROM QuizResponse r
          JOIN User u ON r.userId = u.id
          ORDER BY r.completedAt DESC
        `, [], (err, rows) => {
          if (err) {
            console.error('Error fetching responses:', err)
            reject(err)
          } else {
            const responses = rows.map(row => ({
              id: row.id,
              sessionId: row.sessionId,
              score: row.score,
              timeSpent: row.timeSpent,
              completedAt: row.completedAt,
              user: {
                email: row.email,
                department: row.department
              }
            }))
            resolve(responses)
          }
        })
      })
    }
  } catch (err) {
    console.error('Error fetching responses:', err)
    throw err
  }
}

// Generate tokens
const generateTokens = (user) => {
  const payload = {
    email: user.email,
    department: user.department,
    isAdmin: user.isAdmin
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  const refreshToken = jwt.sign({ email: user.email }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })

  return { accessToken, refreshToken }
}

// Middleware to verify JWT token (in-memory)
const authenticateToken = async (req, res, next) => {
  // Accept token from httpOnly cookie OR Authorization header (for backward compatibility)
  const token = req.cookies?.accessToken || (req.headers['authorization']?.split(' ')[1])

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(403).json({ error: 'Invalid token' })
  }
}

// Health check endpoint (no auth required — used by Render and uptime monitors)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() })
  }
})

// API Routes

// GET /api/users - Get all users with enhanced profile data
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    let users = []

    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, email, department, "isAdmin", "displayName", "darkMode", "profileImage", "lastPasswordChange", "createdAt"
        FROM "User"
        ORDER BY "createdAt" DESC
      `)
      users = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        department: row.department,
        isAdmin: Boolean(row.isAdmin),
        displayName: row.displayName,
        darkMode: Boolean(row.darkMode),
        profileImage: row.profileImage,
        lastPasswordChange: row.lastPasswordChange,
        createdAt: row.createdAt
      }))
    } else {
      users = await new Promise((resolve, reject) => {
        db.all(`
          SELECT id, email, department, isAdmin, displayName, darkMode, profileImage, lastPasswordChange, createdAt
          FROM User
          ORDER BY createdAt DESC
        `, [], (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              email: row.email,
              department: row.department,
              isAdmin: Boolean(row.isAdmin),
              displayName: row.displayName,
              darkMode: Boolean(row.darkMode),
              profileImage: row.profileImage,
              lastPasswordChange: row.lastPasswordChange,
              createdAt: row.createdAt
            })))
          }
        })
      })
    }

    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// GET /api/sessions - Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await getSessionsFromDB()
    res.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// GET /api/sessions/:id - Get a specific session with responses
app.get('/api/sessions/:id', async (req, res) => {
  try {

    const sessions = await getSessionsFromDB()
    const responses = await getResponsesFromDB()


    const session = sessions.find(s => s.id === req.params.id)
    if (!session) {

      return res.status(404).json({ error: 'Session not found' })
    }

    // Filter responses by userEmail if provided (for review mode)
    const userEmail = req.query.userEmail
    let sessionResponses = responses.filter(r => r.sessionId === session.id)
    
    if (userEmail) {
      sessionResponses = sessionResponses.filter(r => r.user?.email === userEmail)
    }
    
    const sessionWithResponses = {
      ...session,
      responses: sessionResponses
    }

    res.json(sessionWithResponses)
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

// POST /api/sessions - Create a new session
app.post('/api/sessions', authenticateToken, async (req, res) => {
  const sessionData = req.body
  const newSession = {
    id: `session-${Date.now()}`,
    ...sessionData,
    isActive: false,
    createdAt: new Date().toISOString(),
    _count: { responses: 0 }
  }

  try {
    if (usePostgres) {
      // Insert into PostgreSQL database
      await pool.query(`
        INSERT INTO "QuizSession" (id, name, date, time, "isActive", "createdAt", "createdBy", questions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        newSession.id,
        newSession.name,
        newSession.date,
        newSession.time,
        newSession.isActive,
        newSession.createdAt,
        newSession.createdBy,
        JSON.stringify(newSession.questions || [])
      ])
    } else {
      // Insert into database
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO QuizSession (id, name, date, time, isActive, createdAt, createdBy, questions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newSession.id,
          newSession.name,
          newSession.date,
          newSession.time,
          newSession.isActive,
          newSession.createdAt,
          newSession.createdBy,
          JSON.stringify(newSession.questions || [])
        ], (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }

    // Log audit action
    logAuditAction(
      req.user.email,
      'create_quiz',
      {
        sessionId: newSession.id,
        sessionName: newSession.name,
        department: newSession.department,
        questionCount: newSession.questions.length
      },
      req
    )

    // Send notifications to target department
    if (newSession.department) {
      try {
        fetch(`http://localhost:3001/api/department/${newSession.department}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'quiz_posted',
            title: 'New Quiz Available',
            message: `${req.user.email.split('@')[0].toUpperCase()} has posted a quiz for the ${newSession.department === 'everyone' ? 'all departments' : newSession.department + ' department'} to be completed within the stated time lines. please address this ticket.`,
            adminEmail: req.user.email,
            quizName: newSession.name
          })
        })
      } catch (error) {
        console.error('Failed to send quiz notification:', error)
      }
    }

    res.status(201).json(newSession)
  } catch (err) {
    console.error('Error creating session:', err)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// PATCH /api/sessions/:id - Update session (e.g., activate/deactivate)
app.patch('/api/sessions/:id', authenticateToken, async (req, res) => {



  const { isActive } = req.body

  try {
    let result
    if (usePostgres) {
      // Update in PostgreSQL database
      result = await pool.query(`
        UPDATE "QuizSession" 
        SET "isActive" = $1, "updatedAt" = $2
        WHERE id = $3
        RETURNING id, name, "isActive"
      `, [isActive, new Date().toISOString(), req.params.id])
    } else {
      // Update in database
      result = await new Promise((resolve, reject) => {
        db.run(`
          UPDATE QuizSession 
          SET isActive = ?, updatedAt = ?
          WHERE id = ?
        `, [isActive, new Date().toISOString(), req.params.id], function (err) {
          if (err) {
            reject(err)
          } else {
            // Get the updated record
            db.get(`SELECT id, name, isActive FROM QuizSession WHERE id = ?`, [req.params.id], (err, row) => {
              if (err) {
                reject(err)
              } else {
                resolve({ rows: [row] })
              }
            })
          }
        })
      })
    }

    if (!result.rows || result.rows.length === 0) {

      return res.status(404).json({ error: 'Session not found' })
    }


    res.json({
      message: 'Session updated successfully',
      id: req.params.id,
      isActive: result.rows[0].isActive
    })
  } catch (err) {
    console.error('Error updating session:', err)
    res.status(500).json({ error: 'Failed to update session' })
  }
})

// GET /api/sessions/active - Get the currently active session
app.get('/api/sessions/active', async (req, res) => {
  try {
    const sessions = await getSessionsFromDB()
    const activeSession = sessions.find(s => s.isActive)
    res.json(activeSession || null)
  } catch (error) {
    console.error('Error fetching active session:', error)
    res.status(500).json({ error: 'Failed to fetch active session' })
  }
})

// GET /api/user/:email/submissions - Get user's quiz submissions
app.get('/api/user/:email/submissions', async (req, res) => {
  try {
    const responses = await getResponsesFromDB()
    const userEmail = req.params.email
    const userSubmissions = responses.filter(response => response.user.email === userEmail)
    res.json(userSubmissions)
  } catch (error) {
    console.error('Error fetching user submissions:', error)
    res.status(500).json({ error: 'Failed to fetch user submissions' })
  }
})

// GET /api/user/:email/session/:sessionId/submission - Check if user has submitted specific session
app.get('/api/user/:email/session/:sessionId/submission', async (req, res) => {
  try {
    const responses = await getResponsesFromDB()
    const { email, sessionId } = req.params
    const hasSubmitted = responses.some(response => response.user.email === email && response.sessionId === sessionId)
    res.json({ hasSubmitted })
  } catch (error) {
    console.error('Error checking submission:', error)
    res.status(500).json({ error: 'Failed to check submission' })
  }
})

// GET /api/user/:email/warnings - Get user's warning status
app.get('/api/user/:email/warnings', async (req, res) => {
  const { email } = req.params
  try {
    const warnings = await prisma.userWarning.findMany({ where: { userEmail: email }, orderBy: { timestamp: 'desc' } })
    res.json({ warnings })
  } catch (error) {
    console.error('Error fetching warnings:', error)
    res.status(500).json({ error: 'Failed to fetch warnings' })
  }
})

// POST /api/user/:email/warn - Add warning to user
app.post('/api/user/:email/warn', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { reason, adminEmail, quizName } = req.body

  const userExists = await pool.query('SELECT email FROM "User" WHERE email = $1', [email])
  if (!userExists.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    const warning = await prisma.userWarning.create({
      data: {
        userEmail: email,
        reason: reason || 'Performance flagged - improvement needed',
        adminEmail: adminEmail,
        quizName: quizName || null
      }
    })

    await logAuditAction(req.user.email, 'warn_user', { warnedUser: email, reason, quizName }, req)

    const adminName = adminEmail.split('@')[0].replace('.', ' ').toUpperCase()
    const notificationMessage = `${adminName} has raised a flag for your performance in ${quizName || 'a quiz'} and requests you improve in your performance as this will affect your overall weight your self development performance key indicator.`

    await prisma.userNotification.create({
      data: {
        userEmail: email,
        type: 'warning',
        title: 'Performance Warning',
        message: notificationMessage,
        adminEmail: adminEmail,
        quizName: quizName || null
      }
    })

    res.status(201).json({ message: 'Warning added successfully', warning })
  } catch (error) {
    console.error('Failed to add warning:', error)
    res.status(500).json({ error: 'Failed to add warning' })
  }
})

// DELETE /api/user/:email/warnings/:warningId - Remove warning from user
app.delete('/api/user/:email/warnings/:warningId', async (req, res) => {
  const { warningId } = req.params
  try {
    await prisma.userWarning.delete({ where: { id: warningId } })
    res.json({ message: 'Warning removed successfully' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Warning not found' })
    console.error('Failed to delete warning:', error)
    res.status(500).json({ error: 'Failed to delete warning' })
  }
})

// POST /api/user/:email/elevate - Elevate user to admin status
app.post('/api/user/:email/elevate', authenticateToken, async (req, res) => {
  const { email } = req.params

  if (!userCredentials[email]) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Check if requesting admin has admin privileges
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized: Only administrators can elevate users' })
  }

  // Prevent elevating existing admins
  if (userCredentials[email].isAdmin) {
    return res.status(400).json({ error: 'User is already an administrator' })
  }

  // Elevate the user
  userCredentials[email].isAdmin = true

  // Log audit action
  await logAuditAction(
    req.user.email,
    'elevate_user',
    {
      elevatedUser: email,
      previousRole: 'user',
      newRole: 'admin'
    },
    req
  )

  res.json({
    message: 'User elevated to administrator status successfully',
    email: email,
    isAdmin: true
  })
})

// GET /api/user/:email/session/:sessionId/retake-status - Get retake status for user session
app.get('/api/user/:email/session/:sessionId/retake-status', async (req, res) => {
  const { email, sessionId } = req.params
  const now = Date.now()
  try {
    let retake = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })

    if (!retake) {
      return res.json({ attempts: 0, cooldownUntil: null, retakeWindowEnd: null, canRetake: false })
    }

    // Derive retake window end (2 hours after cooldown ends)
    let retakeWindowEnd = retake.cooldownUntil
      ? new Date(new Date(retake.cooldownUntil).getTime() + RETAKE_WINDOW_MS).toISOString()
      : null

    // If cooldown expired and we're within the 2-hour window, allow retake
    if (retake.cooldownUntil && now >= new Date(retake.cooldownUntil).getTime() && retake.attempts < 2) {
      if (now < new Date(retakeWindowEnd).getTime()) {
        if (!retake.canRetake) {
          retake = await prisma.userRetake.update({
            where: { userEmail_sessionId: { userEmail: email, sessionId } },
            data: { canRetake: true, cooldownUntil: null }
          })
          retakeWindowEnd = null
        }
      } else {
        // Window expired
        retake = await prisma.userRetake.update({
          where: { userEmail_sessionId: { userEmail: email, sessionId } },
          data: { canRetake: false, cooldownUntil: null }
        })
        retakeWindowEnd = null
      }
    }

    res.json({ ...retake, retakeWindowEnd })
  } catch (error) {
    console.error('Failed to get retake status:', error)
    res.status(500).json({ error: 'Failed to get retake status' })
  }
})

// POST /api/user/:email/session/:sessionId/start-retake - Start retake cooldown
app.post('/api/user/:email/session/:sessionId/start-retake', async (req, res) => {
  const { email, sessionId } = req.params
  const { score } = req.body

  if (score >= 45) {
    return res.status(400).json({ error: 'Retakes only allowed for scores below 45' })
  }

  try {
    const existing = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })

    if (existing && existing.attempts >= 2) {
      return res.status(400).json({ error: 'Maximum retake attempts (2) reached' })
    }

    const cooldownEnd = new Date(Date.now() + RETAKE_COOLDOWN_MS)
    const retake = await prisma.userRetake.upsert({
      where: { userEmail_sessionId: { userEmail: email, sessionId } },
      update: { cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() },
      create: { userEmail: email, sessionId, attempts: 0, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() }
    })

    res.json({
      message: 'Retake cooldown started',
      cooldownUntil: cooldownEnd.toISOString(),
      attemptsRemaining: 2 - retake.attempts,
      nextStatus: 'retake_window'
    })
  } catch (error) {
    console.error('Failed to start retake:', error)
    res.status(500).json({ error: 'Failed to start retake' })
  }
})

// POST /api/user/:email/session/:sessionId/complete-retake - Mark retake as completed
app.post('/api/user/:email/session/:sessionId/complete-retake', async (req, res) => {
  const { email, sessionId } = req.params
  try {
    const retake = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })
    if (!retake) return res.status(404).json({ error: 'No retake data found' })

    await prisma.userRetake.update({
      where: { userEmail_sessionId: { userEmail: email, sessionId } },
      data: { canRetake: false, cooldownUntil: null, attempts: { increment: 1 } }
    })
    res.json({ message: 'Retake marked as completed' })
  } catch (error) {
    console.error('Failed to complete retake:', error)
    res.status(500).json({ error: 'Failed to complete retake' })
  }
})

// GET /api/user/:email/notifications - Get user's notifications
app.get('/api/user/:email/notifications', async (req, res) => {
  const { email } = req.params
  try {
    const notifications = await prisma.userNotification.findMany({
      where: { userEmail: email },
      orderBy: { timestamp: 'desc' }
    })
    res.json({ notifications })
  } catch (error) {
    console.error('Failed to get notifications:', error)
    res.status(500).json({ error: 'Failed to get notifications' })
  }
})

// POST /api/user/:email/notifications - Create notification for user
app.post('/api/user/:email/notifications', async (req, res) => {
  const { email } = req.params
  const { type, title, message, adminEmail, quizName, departmentName } = req.body

  const userExists = await pool.query('SELECT email FROM "User" WHERE email = $1', [email])
  if (!userExists.rows.length) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    const notification = await prisma.userNotification.create({
      data: { userEmail: email, type, title, message, adminEmail: adminEmail || null, quizName: quizName || null, departmentName: departmentName || null }
    })
    res.status(201).json({ message: 'Notification created successfully', notification })
  } catch (error) {
    console.error('Failed to create notification:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

// POST /api/department/:department/notifications - Send notification to entire department
app.post('/api/department/:department/notifications', async (req, res) => {
  const { department } = req.params
  const { type, title, message, adminEmail, quizName } = req.body

  try {
    const whereClause = department === 'everyone'
      ? '"isAdmin" = false'
      : `"department" = $1 AND "isAdmin" = false`
    const params = department === 'everyone' ? [] : [department]
    const usersResult = await pool.query(`SELECT email FROM "User" WHERE ${whereClause}`, params)

    const deptName = department === 'everyone' ? 'All Departments' : department
    const data = usersResult.rows.map(u => ({
      userEmail: u.email, type, title, message,
      adminEmail: adminEmail || null, quizName: quizName || null, departmentName: deptName
    }))

    const result = await prisma.userNotification.createMany({ data })
    res.json({ message: `Notifications sent to ${result.count} users in ${deptName} department`, count: result.count })
  } catch (error) {
    console.error('Failed to send department notifications:', error)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

// PATCH /api/user/:email/notifications/:notificationId/read - Mark notification as read
app.patch('/api/user/:email/notifications/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params
  try {
    await prisma.userNotification.update({ where: { id: notificationId }, data: { read: true } })
    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Notification not found' })
    console.error('Failed to mark notification as read:', error)
    res.status(500).json({ error: 'Failed to update notification' })
  }
})

// Audit logging utility function - persists to AuditLog table
const logAuditAction = async (adminEmail, action, details, req) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail,
        action,
        details: JSON.stringify(details || {}),
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown'
      }
    })
  } catch (err) {
    logger.error('Failed to write audit log', err)
  }
}

// POST /api/feedback - Submit quiz feedback
app.post('/api/feedback', async (req, res) => {
  const { userEmail, sessionId, rating, comments } = req.body
  try {
    const existing = await prisma.quizFeedback.findFirst({ where: { userEmail, sessionId } })
    if (existing) return res.status(400).json({ error: 'Feedback already submitted for this quiz' })

    const feedback = await prisma.quizFeedback.create({
      data: { userEmail, sessionId, rating, comments: comments || null }
    })
    res.status(201).json({ message: 'Feedback submitted successfully', feedback })
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// GET /api/feedback/check/:userEmail/:sessionId - Check if feedback was submitted
app.get('/api/feedback/check/:userEmail/:sessionId', async (req, res) => {
  const { userEmail, sessionId } = req.params
  try {
    const feedback = await prisma.quizFeedback.findFirst({ where: { userEmail, sessionId } })
    res.json({ hasFeedback: !!feedback, feedback: feedback || null })
  } catch (error) {
    console.error('Failed to check feedback status:', error)
    res.status(500).json({ error: 'Failed to check feedback status' })
  }
})

// GET /api/feedback/admin - Get all feedback for admin
app.get('/api/feedback/admin', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' })
  try {
    const feedback = await prisma.quizFeedback.findMany({ orderBy: { submittedAt: 'desc' } })
    res.json({ feedback })
  } catch (error) {
    console.error('Failed to get admin feedback:', error)
    res.status(500).json({ error: 'Failed to get feedback' })
  }
})

// GET /api/feedback/stats - Get feedback statistics for admin
app.get('/api/feedback/stats', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' })
  try {
    const [total, avgResult, dist] = await Promise.all([
      prisma.quizFeedback.count(),
      prisma.quizFeedback.aggregate({ _avg: { rating: true } }),
      Promise.all([1, 2, 3, 4, 5].map(r => prisma.quizFeedback.count({ where: { rating: r } })))
    ])
    const recent = await prisma.quizFeedback.findMany({ orderBy: { submittedAt: 'desc' }, take: 5 })
    res.json({
      totalFeedback: total,
      averageRating: Math.round((avgResult._avg.rating || 0) * 10) / 10,
      ratingDistribution: { 1: dist[0], 2: dist[1], 3: dist[2], 4: dist[3], 5: dist[4] },
      recentFeedback: recent
    })
  } catch (error) {
    console.error('Failed to get feedback stats:', error)
    res.status(500).json({ error: 'Failed to get feedback statistics' })
  }
})

// GET /api/analytics - Get analytics data (admin access required)
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    // Log the decoded user for debugging

    
    // Check if user is admin
    if (!req.user.isAdmin) {

      return res.status(403).json({ error: 'Admin access required' })
    }

    const timeRange = req.query.timeRange || '7d'
    const now = new Date()
    let startDate

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * ONE_DAY_MS)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * ONE_DAY_MS)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * ONE_DAY_MS)
        break
      default:
        startDate = new Date(now.getTime() - 7 * ONE_DAY_MS)
    }

    // Get sessions and responses from database
    const sessions = await getSessionsFromDB()
    const responses = await getResponsesFromDB()

    // Filter data by date range
    const filteredSessions = sessions.filter(s => new Date(s.createdAt) >= startDate)
    const filteredResponses = responses.filter(r => new Date(r.completedAt) >= startDate)

    // Calculate analytics
    // Filter responses to only include the highest score per user per session
    const userSessionBestScores = {}
    filteredResponses.forEach(response => {
      const key = `${response.userId}_${response.sessionId}`
      if (!userSessionBestScores[key] || response.score > userSessionBestScores[key].score) {
        userSessionBestScores[key] = response
      }
    })
    const bestResponses = Object.values(userSessionBestScores)

    const stats = {
      totalSessions: filteredSessions.length,
      totalResponses: bestResponses.length, // Only count best score per user per session
      averageScore: bestResponses.length > 0
        ? Math.round((bestResponses.reduce((sum, r) => sum + r.score, 0) / bestResponses.length) * 10) / 10
        : 0,
      sessionsByDepartment: {},
      responsesByDepartment: {},
      scoreDistribution: {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
      },
      recentActivity: bestResponses.slice(0, 10)
    }

    // Calculate department breakdowns
    filteredSessions.forEach(session => {
      const dept = session.department || 'Unknown'
      stats.sessionsByDepartment[dept] = (stats.sessionsByDepartment[dept] || 0) + 1
    })

    // Use bestResponses for department stats to only count highest score per user per session
    bestResponses.forEach(response => {
      const dept = response.user.department || 'Unknown'
      stats.responsesByDepartment[dept] = (stats.responsesByDepartment[dept] || 0) + 1
    })

    // Calculate score distribution using best scores
    bestResponses.forEach(response => {
      const score = response.score
      if (score <= 20) stats.scoreDistribution['0-20']++
      else if (score <= 40) stats.scoreDistribution['21-40']++
      else if (score <= 60) stats.scoreDistribution['41-60']++
      else if (score <= 80) stats.scoreDistribution['61-80']++
      else stats.scoreDistribution['81-100']++
    })

    res.json(stats)
  } catch (error) {
    console.error('Failed to get analytics:', error)
    res.status(500).json({ error: 'Failed to get analytics data' })
  }
})

// GET /api/audit/logs - Get audit logs (super admin access)
app.get('/api/audit/logs', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' })
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 500 })
    res.json({ logs })
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    res.status(500).json({ error: 'Failed to get audit logs' })
  }
})

// GET /api/password-reset/check/:email - Check password reset eligibility
app.get('/api/password-reset/check/:email', async (req, res) => {
  const { email } = req.params
  try {
    const now = new Date()
    let record = await prisma.passwordReset.findUnique({ where: { userEmail: email } })

    if (!record) {
      record = await prisma.passwordReset.create({
        data: { userEmail: email, resetCount: 0, monthlyCount: 0, monthlyResetDate: now }
      })
    }

    // Reset monthly count if we're in a new month
    let monthlyCount = record.monthlyCount
    if (record.monthlyResetDate) {
      const recordDate = new Date(record.monthlyResetDate)
      if (recordDate.getMonth() !== now.getMonth() || recordDate.getFullYear() !== now.getFullYear()) {
        monthlyCount = 0
        await prisma.passwordReset.update({ where: { userEmail: email }, data: { monthlyCount: 0, monthlyResetDate: now } })
      }
    }

    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    res.json({ canReset: monthlyCount < 3, remainingResets: 3 - monthlyCount, monthlyCount, nextResetDate })
  } catch (error) {
    console.error('Failed to check password reset eligibility:', error)
    res.status(500).json({ error: 'Failed to check reset eligibility' })
  }
})

// POST /api/password-reset/reset - Perform password reset
app.post('/api/password-reset/reset', resetLimiter, async (req, res) => {
  const { email, newPassword } = req.body

  const userExists = await pool.query('SELECT email FROM "User" WHERE email = $1', [email])
  if (!userExists.rows.length) return res.status(404).json({ error: 'User not found' })

  try {
    const now = new Date()
    let record = await prisma.passwordReset.findUnique({ where: { userEmail: email } })

    // Determine current month's count
    let monthlyCount = 0
    if (record && record.monthlyResetDate) {
      const recordDate = new Date(record.monthlyResetDate)
      if (recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()) {
        monthlyCount = record.monthlyCount
      }
    }

    if (monthlyCount >= 3) return res.status(400).json({ error: 'Monthly reset limit exceeded' })

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE "User" SET password = $1, "lastPasswordChange" = $2 WHERE email = $3', [hashedPassword, now, email])

    await prisma.passwordReset.upsert({
      where: { userEmail: email },
      update: { resetCount: { increment: 1 }, monthlyCount: { increment: 1 }, lastReset: now, monthlyResetDate: now },
      create: { userEmail: email, resetCount: 1, monthlyCount: 1, lastReset: now, monthlyResetDate: now }
    })

    // Update in-memory credentials cache
    if (userCredentials[email]) userCredentials[email].password = hashedPassword

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Failed to reset password:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// POST /api/password-reset/contact-admin - Contact admin for help
app.post('/api/password-reset/contact-admin', resetLimiter, async (req, res) => {
  const { userEmail, reason } = req.body
  try {
    const request = await prisma.adminResetRequest.create({
      data: { userEmail, reason: reason || 'Monthly password reset limit exceeded', status: 'pending' }
    })
    res.json({ message: 'Admin contact request submitted successfully', requestId: request.id })
  } catch (error) {
    console.error('Failed to submit admin contact request:', error)
    res.status(500).json({ error: 'Failed to submit request' })
  }
})

// POST /api/quiz-progress - Auto-save quiz progress
app.post('/api/quiz-progress', async (req, res) => {
  const { userEmail, sessionId, answers, timeRemaining, questionOrder } = req.body
  try {
    const updateData = { answers: JSON.stringify(answers), lastSaved: new Date() }
    if (timeRemaining !== undefined) updateData.timeRemaining = timeRemaining
    if (questionOrder !== undefined) updateData.questionOrder = JSON.stringify(questionOrder)

    const progress = await prisma.quizProgress.upsert({
      where: { userEmail_sessionId: { userEmail, sessionId } },
      update: updateData,
      create: {
        userEmail, sessionId,
        answers: JSON.stringify(answers),
        timeRemaining: timeRemaining ?? 1800,
        questionOrder: JSON.stringify(questionOrder || []),
        lastSaved: new Date()
      }
    })
    res.json({ message: 'Progress saved successfully', progress: { ...progress, answers } })
  } catch (error) {
    console.error('Failed to save quiz progress:', error)
    res.status(500).json({ error: 'Failed to save progress' })
  }
})

// GET /api/quiz-progress/:userEmail/:sessionId - Get saved quiz progress
app.get('/api/quiz-progress/:userEmail/:sessionId', async (req, res) => {
  const { userEmail, sessionId } = req.params
  try {
    const progress = await prisma.quizProgress.findUnique({
      where: { userEmail_sessionId: { userEmail, sessionId } }
    })
    if (!progress) return res.json(null)
    res.json({
      ...progress,
      answers: JSON.parse(progress.answers || '{}'),
      questionOrder: JSON.parse(progress.questionOrder || '[]')
    })
  } catch (error) {
    console.error('Failed to get quiz progress:', error)
    res.status(500).json({ error: 'Failed to get progress' })
  }
})

// POST /api/register - User registration
app.post('/api/register', registerLimiter, async (req, res) => {
  const { email, password, department, displayName } = req.body

  if (!email || !password || !department) {
    return res.status(400).json({ error: 'Email, password, and department are required' })
  }

  // Validate email domain
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  const domain = email.split('@')[1]
  if (domain !== 'bdo.co.zw') {
    return res.status(400).json({ error: 'Only @bdo.co.zw email addresses are allowed' })
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&).' })
  }

  try {
    // Check if user already exists in database
    const result = await pool.query('SELECT email FROM "User" WHERE email = $1', [email])
    const existingUser = result.rows[0]

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Add to database with profile fields
    const now = new Date().toISOString()
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await pool.query(`
      INSERT INTO "User" (id, email, password, department, "isAdmin", "displayName", "darkMode", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, email, hashedPassword, department, false, displayName || null, false, now])

    // Add to in-memory credentials
    userCredentials[email] = {
      password: hashedPassword,
      department: department,
      isAdmin: false
    }

    res.status(201).json({
      message: 'User registered successfully',
      email: email,
      department: department,
      isAdmin: false,
      displayName: displayName || null,
      darkMode: false
    })
  } catch (error) {
    // Log the actual error to file for debugging
    const errorDetails = {
      requestId: req.requestId || `req-${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: 500,
      errorMessage: error.message,
      errorStack: error.stack,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      requestBody: { email, department, password: '***' }
    }
    logToFile(ERROR_LOG_FILE, JSON.stringify(errorDetails))
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/login - User authentication with JWT
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = userCredentials[email]
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  try {
    const isValidPassword = await bcrypt.compare(password, typeof user.password === 'string' ? user.password : user.password.toString())
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { accessToken, refreshToken } = generateTokens({ email, ...user })
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

    await prisma.userSession.create({
      data: { userEmail: email, sessionToken: accessToken, refreshToken, expiresAt, lastActivity: new Date() }
    })

    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }
    res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: ACCESS_TOKEN_TTL_MS })
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: REFRESH_TOKEN_TTL_MS })

    res.json({
      email,
      department: user.department,
      isAdmin: user.isAdmin,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MS / 1000
    })
  } catch (error) {
    logToFile(ERROR_LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), url: req.originalUrl, error: error.message, email }))
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/refresh - Refresh access token
app.post('/api/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' })

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)

    const session = await prisma.userSession.findFirst({
      where: { userEmail: decoded.email, refreshToken }
    })

    if (!session) return res.status(403).json({ error: 'Invalid refresh token' })

    const timeSinceActivity = Date.now() - new Date(session.lastActivity).getTime()
    if (timeSinceActivity > SESSION_TIMEOUT) {
      await prisma.userSession.delete({ where: { id: session.id } })
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    const user = userCredentials[decoded.email]
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user)
    const newExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

    await prisma.userSession.update({
      where: { id: session.id },
      data: { sessionToken: newAccessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt, lastActivity: new Date() }
    })

    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }
    res.cookie('accessToken', newAccessToken, { ...cookieOpts, maxAge: ACCESS_TOKEN_TTL_MS })
    res.cookie('refreshToken', newRefreshToken, { ...cookieOpts, maxAge: REFRESH_TOKEN_TTL_MS })

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(403).json({ error: 'Invalid refresh token' })
  }
})

// POST /api/logout - Logout and invalidate session
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.cookies?.accessToken || (req.headers['authorization']?.split(' ')[1])
    await prisma.userSession.deleteMany({ where: { userEmail: req.user.email, sessionToken: token } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// POST /api/logout-all - Logout from all devices
app.post('/api/logout-all', authenticateToken, async (req, res) => {
  try {
    await prisma.userSession.deleteMany({ where: { userEmail: req.user.email } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out from all devices successfully' })
  } catch (error) {
    console.error('Logout all error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// GET /api/session-status - Check if session is still valid
app.get('/api/session-status', authenticateToken, async (req, res) => {
  try {
    const user = userCredentials[req.user.email]
    if (!user) return res.status(401).json({ error: 'User not found' })

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    const session = await prisma.userSession.findFirst({
      where: { userEmail: req.user.email, sessionToken: token }
    })

    if (!session) return res.status(401).json({ error: 'Session not found' })

    const timeSinceActivity = Date.now() - new Date(session.lastActivity).getTime()
    if (timeSinceActivity > SESSION_TIMEOUT) {
      await prisma.userSession.delete({ where: { id: session.id } })
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    await prisma.userSession.update({ where: { id: session.id }, data: { lastActivity: new Date() } })

    res.json({
      valid: true,
      user: { email: req.user.email, department: req.user.department, isAdmin: req.user.isAdmin },
      timeUntilExpiry: SESSION_TIMEOUT - timeSinceActivity
    })
  } catch (error) {
    console.error('Session status error:', error)
    res.status(500).json({ error: 'Failed to check session status' })
  }
})

// POST /api/responses - Submit quiz response
app.post('/api/responses', authenticateToken, async (req, res) => {
  const responseData = req.body

  try {
    // Get user department and ID from credentials
    const user = userCredentials[responseData.userEmail]
    const department = user ? user.department : 'Unknown'

    // Look up user ID from email
    const userResult = await pool.query('SELECT id FROM "User" WHERE email = $1', [responseData.userEmail])
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    const newResponse = {
      id: `response-${Date.now()}`,
      ...responseData,
      completedAt: responseData.completedAt || new Date().toISOString()
    }

    // Insert into PostgreSQL database
    await pool.query(`
      INSERT INTO "QuizResponse" (id, "sessionId", "userId", answers, score, "timeSpent", "completedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      newResponse.id,
      newResponse.sessionId,
      userId,
      JSON.stringify(newResponse.answers || {}),
      newResponse.score,
      newResponse.timeSpent,
      newResponse.completedAt
    ])

    // Update retake record based on score
    if (responseData.score < 45) {
      const cooldownEnd = new Date(Date.now() + RETAKE_COOLDOWN_MS)
      await prisma.userRetake.upsert({
        where: { userEmail_sessionId: { userEmail: responseData.userEmail, sessionId: responseData.sessionId } },
        update: { attempts: { increment: 1 }, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() },
        create: { userEmail: responseData.userEmail, sessionId: responseData.sessionId, attempts: 1, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() }
      })
    } else {
      // Passed — close any open retake window
      await prisma.userRetake.updateMany({
        where: { userEmail: responseData.userEmail, sessionId: responseData.sessionId },
        data: { canRetake: false, cooldownUntil: null }
      })
    }

    res.status(201).json(newResponse)
  } catch (err) {
    console.error('Error creating response:', err)
    res.status(500).json({ error: 'Failed to submit response' })
  }
})

// GET /api/user/:email/profile - Get user profile
app.get('/api/user/:email/profile', authenticateToken, async (req, res) => {
  const { email } = req.params

  try {
    // Users can only view their own profile, or admins can view any profile

    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    let userProfile = null

    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, email, department, "isAdmin", "darkMode", "profileImage", "displayName", "lastPasswordChange", "createdAt"
        FROM "User"
        WHERE email = $1
      `, [email])

      if (result.rows.length > 0) {
        const row = result.rows[0]
        userProfile = {
          id: row.id,
          email: row.email,
          department: row.department,
          isAdmin: Boolean(row.isAdmin),
          darkMode: Boolean(row.darkMode),
          profileImage: row.profileImage,
          displayName: row.displayName,
          lastPasswordChange: row.lastPasswordChange,
          createdAt: row.createdAt
        }
      }
    } else {
      userProfile = await new Promise((resolve, reject) => {
        db.get(`
          SELECT id, email, department, isAdmin, darkMode, profileImage, displayName, lastPasswordChange, createdAt
          FROM User
          WHERE email = ?
        `, [email], (err, row) => {
          if (err) {
            reject(err)
          } else {
            if (row) {
              resolve({
                id: row.id,
                email: row.email,
                department: row.department,
                isAdmin: Boolean(row.isAdmin),
                darkMode: Boolean(row.darkMode),
                profileImage: row.profileImage,
                displayName: row.displayName,
                lastPasswordChange: row.lastPasswordChange,
                createdAt: row.createdAt
              })
            } else {
              resolve(null)
            }
          }
        })
      })
    }

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(userProfile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// PATCH /api/user/:email/profile - Update user profile
app.patch('/api/user/:email/profile', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { darkMode, profileImage, displayName } = req.body

  try {
    // Users can only update their own profile, or admins can update any profile
    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const updates = []
    const values = []
    let paramCount = 1

    if (darkMode !== undefined) {
      updates.push(`"darkMode" = $${paramCount++}`)
      values.push(darkMode)
    }

    if (profileImage !== undefined) {
      updates.push(`"profileImage" = $${paramCount++}`)
      values.push(profileImage)
    }

    if (displayName !== undefined) {
      updates.push(`"displayName" = $${paramCount++}`)
      values.push(displayName)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    values.push(email)
    let result
    result = await pool.query(`
      UPDATE "User"
      SET ${updates.join(', ')}
      WHERE email = $${values.length}
      RETURNING id, email, department, "isAdmin", "darkMode", "profileImage", "displayName", "lastPasswordChange", "createdAt"
    `, values)

    if (!result.rows || result.rows.length === 0 || !result.rows[0]) {
      return res.status(404).json({ error: 'User not found' })
    }

    const updatedUser = result.rows[0]
    const userProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      department: updatedUser.department,
      isAdmin: Boolean(updatedUser.isAdmin),
      darkMode: Boolean(updatedUser.darkMode),
      profileImage: updatedUser.profileImage,
      displayName: updatedUser.displayName,
      lastPasswordChange: updatedUser.lastPasswordChange,
      createdAt: updatedUser.createdAt
    }

    // Update in-memory credentials
    if (userCredentials[email]) {
      if (darkMode !== undefined) userCredentials[email].darkMode = darkMode
      if (profileImage !== undefined) userCredentials[email].profileImage = profileImage
      if (displayName !== undefined) userCredentials[email].displayName = displayName
    }

    res.json({ message: 'Profile updated successfully', profile: userProfile })
  } catch (error) {
    console.error('Error updating user profile:', error)
    res.status(500).json({ error: 'Failed to update user profile' })
  }
})

// PATCH /api/user/:email/password - Change user password
app.patch('/api/user/:email/password', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { currentPassword, newPassword } = req.body

  try {
    // Users can only change their own password, or admins can change any password
    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&).' })
    }

    // For admin password changes, skip current password verification
    if (req.user.email === email) {
      // Regular user changing their own password - verify current password
      const user = userCredentials[email]
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' })
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password in database
    await pool.query(`
      UPDATE "User"
      SET password = $1, "lastPasswordChange" = $2
      WHERE email = $3
    `, [hashedPassword, new Date().toISOString(), email])

    // Update in-memory credentials
    if (userCredentials[email]) {
      userCredentials[email].password = hashedPassword
    }

    await logAuditAction(req.user.email, 'change_password', { changedUser: email, adminChange: req.user.email !== email }, req)

    // Notify the user if an admin changed their password
    if (req.user.email !== email) {
      await prisma.userNotification.create({
        data: {
          userEmail: email,
          type: 'security',
          title: 'Password Changed by Admin',
          message: `An administrator has changed your password. If you did not request this, contact IT support immediately.`,
          adminEmail: req.user.email
        }
      }).catch(() => {})
    }

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// DELETE /api/user/:email/account - GDPR right-to-erasure: anonymise and soft-delete user
app.delete('/api/user/:email/account', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const anonEmail = `deleted_${Date.now()}@deleted.invalid`
    await pool.query(
      `UPDATE "User" SET email = $1, password = $2, "displayName" = $3, "profileImage" = NULL, "deletedAt" = $4 WHERE email = $5`,
      [anonEmail, 'DELETED', 'Deleted User', new Date(), email]
    )
    await prisma.userSession.deleteMany({ where: { userEmail: email } })
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    await logAuditAction(req.user.email, 'account_deleted', { targetEmail: email }, req)
    res.json({ message: 'Account deleted and data anonymised' })
  } catch (error) {
    console.error('Failed to delete account:', error)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

// GET /api/user/:email/export - GDPR data portability: export all user data
app.get('/api/user/:email/export', authenticateToken, async (req, res) => {
  const { email } = req.params
  if (req.user.email !== email && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const [userRow, responses, warnings, notifications, feedback] = await Promise.all([
      pool.query('SELECT id, email, department, "isAdmin", "displayName", "createdAt" FROM "User" WHERE email = $1', [email]),
      pool.query('SELECT score, "timeSpent", "completedAt", "sessionId" FROM "QuizResponse" qr JOIN "User" u ON u.id = qr."userId" WHERE u.email = $1', [email]),
      prisma.userWarning.findMany({ where: { userEmail: email } }),
      prisma.userNotification.findMany({ where: { userEmail: email } }),
      prisma.quizFeedback.findMany({ where: { userEmail: email } })
    ])
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.json"`)
    res.json({ profile: userRow.rows[0], quizResponses: responses.rows, warnings, notifications, feedback })
  } catch (error) {
    console.error('Failed to export user data:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
})

// PATCH /api/user/:email/promote - Promote user to admin (enhanced)
app.patch('/api/user/:email/promote', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { reason } = req.body

  try {
    // Only admins can promote users
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!userCredentials[email]) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent promoting existing admins
    if (userCredentials[email].isAdmin) {
      return res.status(400).json({ error: 'User is already an administrator' })
    }

    // Update in database
    await pool.query(`
      UPDATE "User"
      SET "isAdmin" = true
      WHERE email = $1
    `, [email])

    // Update in-memory credentials
    userCredentials[email].isAdmin = true

    // Log audit action
    await logAuditAction(
      req.user.email,
      'promote_user',
      {
        promotedUser: email,
        reason: reason || 'Admin promotion',
        previousRole: 'user',
        newRole: 'admin'
      },
      req
    )

    res.json({
      message: 'User promoted to administrator status successfully',
      email: email,
      isAdmin: true
    })
  } catch (error) {
    console.error('Error promoting user:', error)
    res.status(500).json({ error: 'Failed to promote user' })
  }
})

// PATCH /api/user/:email/demote - Remove user from admin (demote)
app.patch('/api/user/:email/demote', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { reason } = req.body

  try {
    // Only admins can demote users
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Prevent admin from demoting themselves
    if (req.user.email === email) {
      return res.status(400).json({ error: 'Cannot demote yourself' })
    }

    if (!userCredentials[email]) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent demoting non-admins
    if (!userCredentials[email].isAdmin) {
      return res.status(400).json({ error: 'User is not an administrator' })
    }

    // Update in database
    await pool.query(`
      UPDATE "User"
      SET "isAdmin" = false
      WHERE email = $1
    `, [email])

    // Update in-memory credentials
    userCredentials[email].isAdmin = false

    // Log audit action
    await logAuditAction(
      req.user.email,
      'demote_user',
      {
        demotedUser: email,
        reason: reason || 'Admin demotion',
        previousRole: 'admin',
        newRole: 'user'
      },
      req
    )

    res.json({
      message: 'User removed from administrator status successfully',
      email: email,
      isAdmin: false
    })
  } catch (error) {
    console.error('Error demoting user:', error)
    res.status(500).json({ error: 'Failed to demote user' })
  }
})

// Initialize user credentials synchronously before starting server
let httpServer = null

const startServer = async () => {
  try {
    userCredentials = await initializeUserCredentials()
    logger.info(`Loaded ${Object.keys(userCredentials).length} users from database`)

    httpServer = app.listen(PORT, () => {
      logger.info(`BDO Skills Pulse API server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`)
  if (httpServer) {
    httpServer.close(async () => {
      await pool.end().catch(() => {})
      await prisma.$disconnect().catch(() => {})
      logger.info('Server closed cleanly')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

startServer()