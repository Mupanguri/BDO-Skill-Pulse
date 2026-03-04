import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { createRequire } from 'module'
import logger from './src/lib/utils/logger.js'

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
        rejectUnauthorized: false,
        // Supabase uses self-signed certificates
        ca: undefined,
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

// Comprehensive request logging middleware
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
    body: req.body || {},
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
const logSystemHealth = () => {
  const healthData = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    activeConnections: userSessions.length,
    activeUsers: Object.keys(userCredentials).length,
    databaseStatus: 'PostgreSQL Connected'
  }

  logToFile(SYSTEM_HEALTH_LOG_FILE, `HEALTH: ${JSON.stringify(healthData)}`)
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'bdo-quiz-system-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bdo-quiz-refresh-secret-key-change-in-production'
const JWT_EXPIRES_IN = '1h' // 1 hour for access token
const JWT_REFRESH_EXPIRES_IN = '7d' // 7 days for refresh token
const SESSION_TIMEOUT = 60 * 60 * 1000 // 60 minutes (1 hour) in milliseconds

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
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(logRequest) // Add comprehensive logging middleware

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

    console.log(`Loaded ${result.rows.length} users from PostgreSQL database`)
    return credentials
  } catch (err) {
    console.error('Error loading users from database:', err)
    return {}
  }
}

// Global user credentials (will be initialized on server start)
let userCredentials = {}

// User warnings tracking
let userWarnings = {}

// User retake tracking
let userRetakes = {}

// User notifications
let userNotifications = {}

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
        JOIN "User" u ON r."userId" = u.id
        ORDER BY r."completedAt" DESC
      `)

      const responses = result.rows.map(row => ({
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
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('Token decoded:', JSON.stringify(decoded))
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(403).json({ error: 'Invalid token' })
  }
}

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
    console.log('Fetching session with id:', req.params.id)
    const sessions = await getSessionsFromDB()
    const responses = await getResponsesFromDB()

    console.log('Available sessions:', sessions.map(s => s.id))
    const session = sessions.find(s => s.id === req.params.id)
    if (!session) {
      console.log('Session not found:', req.params.id)
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
  console.log(`PATCH /api/sessions/${req.params.id} received`)
  console.log('Request body:', req.body)

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
      console.log('Session not found')
      return res.status(404).json({ error: 'Session not found' })
    }

    console.log('Session updated successfully')
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
app.get('/api/user/:email/warnings', (req, res) => {
  const { email } = req.params
  const warnings = userWarnings[email] || []
  res.json({ warnings })
})

// POST /api/user/:email/warn - Add warning to user
app.post('/api/user/:email/warn', authenticateToken, async (req, res) => {
  const { email } = req.params
  const { reason, adminEmail, quizName } = req.body

  if (!userCredentials[email]) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (!userWarnings[email]) {
    userWarnings[email] = []
  }

  const warning = {
    id: `warning-${Date.now()}`,
    reason: reason || 'Performance flagged - improvement needed',
    adminEmail: adminEmail,
    timestamp: new Date().toISOString(),
    acknowledged: false
  }

  userWarnings[email].push(warning)

  // Log audit action
  await logAuditAction(
    req.user.email,
    'warn_user',
    {
      warnedUser: email,
      reason: reason,
      quizName: quizName
    },
    req
  )

  // Create notification for the user
  const adminName = adminEmail.split('@')[0].replace('.', ' ').toUpperCase()
  const notificationMessage = `${adminName} has raised a flag for your performance in ${quizName || 'a quiz'} and requests you improve in your performance as this will affect your overall weight your self development performance key indicator.`

  // Send notification to the user
  fetch(`http://localhost:3001/api/user/${email}/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'warning',
      title: 'Performance Warning',
      message: notificationMessage,
      adminEmail: adminEmail,
      quizName: quizName
    })
  }).catch(err => console.error('Failed to send warning notification:', err))

  res.status(201).json({ message: 'Warning added successfully', warning })
})

// DELETE /api/user/:email/warnings/:warningId - Remove warning from user
app.delete('/api/user/:email/warnings/:warningId', (req, res) => {
  const { email, warningId } = req.params

  if (!userWarnings[email]) {
    return res.status(404).json({ error: 'No warnings found for user' })
  }

  const warningIndex = userWarnings[email].findIndex(w => w.id === warningId)
  if (warningIndex === -1) {
    return res.status(404).json({ error: 'Warning not found' })
  }

  userWarnings[email].splice(warningIndex, 1)
  res.json({ message: 'Warning removed successfully' })
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
app.get('/api/user/:email/session/:sessionId/retake-status', (req, res) => {
  const { email, sessionId } = req.params

  if (!userRetakes[email]) {
    userRetakes[email] = {}
  }

  if (!userRetakes[email][sessionId]) {
    userRetakes[email][sessionId] = {
      attempts: 0,
      cooldownUntil: null,
      retakeWindowStart: null,
      retakeWindowEnd: null,
      canRetake: false,
      passed: false,
      finalScore: null
    }
  }

  const retakeStatus = userRetakes[email][sessionId]
  const now = Date.now()

  // Check if cooldown has expired and start retake window
  if (retakeStatus.cooldownUntil) {
    const cooldownEnd = new Date(retakeStatus.cooldownUntil).getTime()
    if (now >= cooldownEnd && retakeStatus.attempts < 2) {
      // Cooldown expired, start 2-hour retake window
      retakeStatus.cooldownUntil = null
      retakeStatus.retakeWindowStart = new Date().toISOString()
      retakeStatus.retakeWindowEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      retakeStatus.canRetake = true
    }
  }

  // Check if retake window has expired
  if (retakeStatus.retakeWindowEnd) {
    const windowEnd = new Date(retakeStatus.retakeWindowEnd).getTime()
    if (now >= windowEnd) {
      // Retake window expired
      retakeStatus.canRetake = false
      retakeStatus.retakeWindowEnd = null
    }
  }

  // Check if max attempts reached
  if (retakeStatus.attempts >= 2) {
    retakeStatus.canRetake = false
    retakeStatus.cooldownUntil = null
    retakeStatus.retakeWindowEnd = null
  }

  res.json(retakeStatus)
})

// POST /api/user/:email/session/:sessionId/start-retake - Start retake cooldown
app.post('/api/user/:email/session/:sessionId/start-retake', (req, res) => {
  const { email, sessionId } = req.params
  const { score } = req.body

  if (!userCredentials[email]) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Only allow retakes for scores below 45
  if (score >= 45) {
    return res.status(400).json({ error: 'Retakes only allowed for scores below 45' })
  }

  if (!userRetakes[email]) {
    userRetakes[email] = {}
  }

  if (!userRetakes[email][sessionId]) {
    userRetakes[email][sessionId] = {
      attempts: 0,
      cooldownUntil: null,
      retakeWindowStart: null,
      retakeWindowEnd: null,
      canRetake: false,
      passed: false,
      finalScore: score
    }
  }

  const retakeData = userRetakes[email][sessionId]

  // Check if user already used their 2 retake attempts
  if (retakeData.attempts >= 2) {
    return res.status(400).json({ error: 'Maximum retake attempts (2) reached' })
  }

  // Start 30-minute cooldown
  const cooldownEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now

  retakeData.cooldownUntil = cooldownEnd
  retakeData.canRetake = false
  retakeData.finalScore = score

  res.json({
    message: 'Retake cooldown started',
    cooldownUntil: cooldownEnd,
    attemptsRemaining: 2 - retakeData.attempts,
    nextStatus: 'retake_window'
  })
})

// POST /api/user/:email/session/:sessionId/complete-retake - Mark retake as completed
app.post('/api/user/:email/session/:sessionId/complete-retake', (req, res) => {
  const { email, sessionId } = req.params

  if (!userRetakes[email] || !userRetakes[email][sessionId]) {
    return res.status(404).json({ error: 'No retake data found' })
  }

  const retakeData = userRetakes[email][sessionId]
  retakeData.canRetake = false
  retakeData.cooldownUntil = null

  res.json({ message: 'Retake marked as completed' })
})

// GET /api/user/:email/notifications - Get user's notifications
app.get('/api/user/:email/notifications', (req, res) => {
  const { email } = req.params
  const notifications = userNotifications[email] || []
  res.json({ notifications })
})

// POST /api/user/:email/notifications - Create notification for user
app.post('/api/user/:email/notifications', (req, res) => {
  const { email } = req.params
  const { type, title, message, adminEmail, quizName, departmentName } = req.body

  if (!userCredentials[email]) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (!userNotifications[email]) {
    userNotifications[email] = []
  }

  const notification = {
    id: `notification-${Date.now()}`,
    type: type,
    title: title,
    message: message,
    adminEmail: adminEmail,
    quizName: quizName,
    departmentName: departmentName,
    timestamp: new Date().toISOString(),
    read: false
  }

  userNotifications[email].push(notification)
  res.status(201).json({ message: 'Notification created successfully', notification })
})

// POST /api/department/:department/notifications - Send notification to entire department
app.post('/api/department/:department/notifications', (req, res) => {
  const { department } = req.params
  const { type, title, message, adminEmail, quizName } = req.body

  const targetUsers = Object.keys(userCredentials).filter(email => {
    if (department === 'everyone') return true
    return userCredentials[email].department === department && !userCredentials[email].isAdmin
  })

  let createdCount = 0
  targetUsers.forEach(email => {
    if (!userNotifications[email]) {
      userNotifications[email] = []
    }

    const notification = {
      id: `notification-${Date.now()}-${email}`,
      type: type,
      title: title,
      message: message,
      adminEmail: adminEmail,
      quizName: quizName,
      departmentName: department === 'everyone' ? 'All Departments' : department,
      timestamp: new Date().toISOString(),
      read: false
    }

    userNotifications[email].push(notification)
    createdCount++
  })

  res.json({
    message: `Notifications sent to ${createdCount} users in ${department === 'everyone' ? 'all departments' : department} department`,
    count: createdCount
  })
})

// PATCH /api/user/:email/notifications/:notificationId/read - Mark notification as read
app.patch('/api/user/:email/notifications/:notificationId/read', (req, res) => {
  const { email, notificationId } = req.params

  if (!userNotifications[email]) {
    return res.status(404).json({ error: 'No notifications found for user' })
  }

  const notification = userNotifications[email].find(n => n.id === notificationId)
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  notification.read = true
  res.json({ message: 'Notification marked as read' })
})

// Audit logging utility function (in-memory for demo)
let auditLogs = []
const logAuditAction = async (adminEmail, action, details, req) => {
  const logEntry = {
    id: `audit-${Date.now()}`,
    adminEmail,
    action,
    details: JSON.stringify(details || {}),
    ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString()
  }
  auditLogs.push(logEntry)
}

// POST /api/feedback - Submit quiz feedback (in-memory)
let quizFeedback = []
app.post('/api/feedback', async (req, res) => {
  const { userEmail, sessionId, rating, comments } = req.body

  try {
    // Ensure quizFeedback is initialized
    if (!quizFeedback || !Array.isArray(quizFeedback)) {
      quizFeedback = []
    }
    
    // Check if feedback already exists
    const existingFeedback = quizFeedback.find(f => f.userEmail === userEmail && f.sessionId === sessionId)

    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted for this quiz' })
    }

    // Create new feedback
    const feedback = {
      id: `feedback-${Date.now()}`,
      userEmail: userEmail,
      sessionId: sessionId,
      rating: rating,
      comments: comments || null,
      submittedAt: new Date().toISOString()
    }

    quizFeedback.push(feedback)

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: feedback
    })

  } catch (error) {
    console.error('Failed to submit feedback:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// GET /api/feedback/check/:userEmail/:sessionId - Check if feedback was submitted (in-memory)
app.get('/api/feedback/check/:userEmail/:sessionId', async (req, res) => {
  const { userEmail, sessionId } = req.params

  try {
    // Ensure quizFeedback is initialized
    if (!quizFeedback || !Array.isArray(quizFeedback)) {
      quizFeedback = []
    }
    
    const feedback = quizFeedback.find(f => f.userEmail === userEmail && f.sessionId === sessionId)

    res.json({
      hasFeedback: !!feedback,
      feedback: feedback || null
    })

  } catch (error) {
    console.error('Failed to check feedback status:', error)
    res.status(500).json({ error: 'Failed to check feedback status' })
  }
})

// GET /api/feedback/admin - Get all feedback for admin (requires authentication) (in-memory)
app.get('/api/feedback/admin', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Ensure quizFeedback is initialized
    if (!quizFeedback || !Array.isArray(quizFeedback)) {
      quizFeedback = []
    }

    const feedback = quizFeedback.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

    res.json({ feedback })

  } catch (error) {
    console.error('Failed to get admin feedback:', error)
    res.status(500).json({ error: 'Failed to get feedback' })
  }
})

// GET /api/feedback/stats - Get feedback statistics for admin (in-memory)
app.get('/api/feedback/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Ensure quizFeedback is initialized
    if (!quizFeedback || !Array.isArray(quizFeedback)) {
      quizFeedback = []
    }

    const feedback = quizFeedback

    const stats = {
      totalFeedback: feedback.length,
      averageRating: feedback.length > 0
        ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 10) / 10
        : 0,
      ratingDistribution: {
        1: feedback.filter(f => f.rating === 1).length,
        2: feedback.filter(f => f.rating === 2).length,
        3: feedback.filter(f => f.rating === 3).length,
        4: feedback.filter(f => f.rating === 4).length,
        5: feedback.filter(f => f.rating === 5).length
      },
      recentFeedback: feedback.slice(0, 5) // Last 5 feedback entries
    }

    res.json(stats)

  } catch (error) {
    console.error('Failed to get feedback stats:', error)
    res.status(500).json({ error: 'Failed to get feedback statistics' })
  }
})

// GET /api/analytics - Get analytics data (admin access required)
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    // Log the decoded user for debugging
    console.log('Analytics request - user:', JSON.stringify(req.user))
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      console.log('Admin access denied for:', req.user.email)
      return res.status(403).json({ error: 'Admin access required' })
    }

    const timeRange = req.query.timeRange || '7d'
    const now = new Date()
    let startDate

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
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

// GET /api/audit/logs - Get audit logs (super admin access) (in-memory)
app.get('/api/audit/logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const logs = auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.json({ logs })

  } catch (error) {
    console.error('Failed to get audit logs:', error)
    res.status(500).json({ error: 'Failed to get audit logs' })
  }
})

// GET /api/password-reset/check/:email - Check password reset eligibility (in-memory)
let passwordResets = {}
app.get('/api/password-reset/check/:email', async (req, res) => {
  const { email } = req.params

  try {
    let resetRecord = passwordResets[email]

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Create record if it doesn't exist
    if (!resetRecord) {
      resetRecord = {
        userEmail: email,
        resetCount: 0,
        monthlyCount: 0,
        monthlyResetDate: now.toISOString(),
        lastReset: null
      }
      passwordResets[email] = resetRecord
    }

    // Check if we need to reset monthly count
    const recordMonth = new Date(resetRecord.monthlyResetDate).getMonth()
    const recordYear = new Date(resetRecord.monthlyResetDate).getFullYear()

    let monthlyCount = resetRecord.monthlyCount
    let nextResetDate = resetRecord.monthlyResetDate

    if (recordMonth !== currentMonth || recordYear !== currentYear) {
      // Reset monthly count for new month
      monthlyCount = 0
      nextResetDate = new Date(currentYear, currentMonth + 1, 1).toISOString() // First day of next month

      // Update the record
      resetRecord.monthlyCount = 0
      resetRecord.monthlyResetDate = now.toISOString()
    }

    const canReset = monthlyCount < 3
    const remainingResets = 3 - monthlyCount

    res.json({
      canReset,
      remainingResets,
      monthlyCount,
      nextResetDate: nextResetDate
    })

  } catch (error) {
    console.error('Failed to check password reset eligibility:', error)
    res.status(500).json({ error: 'Failed to check reset eligibility' })
  }
})

// POST /api/password-reset/reset - Perform password reset (in-memory)
app.post('/api/password-reset/reset', async (req, res) => {
  const { email, newPassword } = req.body

  if (!userCredentials[email]) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    // Check eligibility first
    const eligibilityResponse = await fetch(`http://localhost:3001/api/password-reset/check/${email}`)
    const eligibilityData = await eligibilityResponse.json()

    if (!eligibilityData.canReset) {
      return res.status(400).json({ error: 'Monthly reset limit exceeded' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password in memory (in production, this would update database)
    userCredentials[email].password = hashedPassword

    // Update reset count (in-memory)
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let resetRecord = passwordResets[email]

    if (resetRecord) {
      const recordMonth = new Date(resetRecord.monthlyResetDate).getMonth()
      const recordYear = new Date(resetRecord.monthlyResetDate).getFullYear()

      if (recordMonth === currentMonth && recordYear === currentYear) {
        // Increment monthly count
        resetRecord.resetCount += 1
        resetRecord.monthlyCount += 1
        resetRecord.lastReset = now.toISOString()
      } else {
        // Reset for new month
        resetRecord.resetCount += 1
        resetRecord.monthlyCount = 1
        resetRecord.lastReset = now.toISOString()
        resetRecord.monthlyResetDate = now.toISOString()
      }
    }

    res.json({ message: 'Password reset successfully' })

  } catch (error) {
    console.error('Failed to reset password:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// POST /api/password-reset/contact-admin - Contact admin for help (in-memory)
let adminResetRequests = []
app.post('/api/password-reset/contact-admin', async (req, res) => {
  const { userEmail, reason } = req.body

  try {
    // Create admin reset request
    const request = {
      id: `reset-request-${Date.now()}`,
      userEmail,
      reason: reason || 'Monthly password reset limit exceeded',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null
    }

    adminResetRequests.push(request)

    res.json({
      message: 'Admin contact request submitted successfully',
      requestId: request.id
    })

  } catch (error) {
    console.error('Failed to submit admin contact request:', error)
    res.status(500).json({ error: 'Failed to submit request' })
  }
})

// POST /api/quiz-progress - Auto-save quiz progress (in-memory)
let quizProgress = []
app.post('/api/quiz-progress', async (req, res) => {
  const { userEmail, sessionId, answers, timeRemaining } = req.body

  try {
    // If using PostgreSQL, save to database
    if (usePostgres) {
      const answersJson = JSON.stringify(answers)
      
      // Check if progress exists
      const existingResult = await pool.query(
        `SELECT id FROM "QuizProgress" WHERE "userEmail" = $1 AND "sessionId" = $2`,
        [userEmail, sessionId]
      )
      
      if (existingResult.rows.length > 0) {
        // Update existing progress
        await pool.query(
          `UPDATE "QuizProgress" SET answers = $1, "timeRemaining" = $2, "lastSaved" = $3 WHERE "userEmail" = $4 AND "sessionId" = $5`,
          [answersJson, timeRemaining, new Date(), userEmail, sessionId]
        )
      } else {
        // Insert new progress
        await pool.query(
          `INSERT INTO "QuizProgress" ("userEmail", "sessionId", answers, "timeRemaining", "lastSaved") VALUES ($1, $2, $3, $4, $5)`,
          [userEmail, sessionId, answersJson, timeRemaining, new Date()]
        )
      }
      
      const progress = { userEmail, sessionId, answers, timeRemaining, lastSaved: new Date().toISOString() }
      return res.json({ message: 'Progress saved successfully', progress })
    }
    
    // In-memory fallback
    let progress = quizProgress.find(p => p.userEmail === userEmail && p.sessionId === sessionId)

    if (progress) {
      // Update existing progress
      progress.answers = answers
      progress.timeRemaining = timeRemaining
      progress.lastSaved = new Date().toISOString()
    } else {
      // Create new progress
      progress = {
        id: `progress-${Date.now()}`,
        userEmail: userEmail,
        sessionId: sessionId,
        answers: answers,
        timeRemaining: timeRemaining,
        lastSaved: new Date().toISOString()
      }
      quizProgress.push(progress)
    }

    res.json({ message: 'Progress saved successfully', progress })
  } catch (error) {
    console.error('Failed to save quiz progress:', error)
    res.status(500).json({ error: 'Failed to save progress' })
  }
})

// GET /api/quiz-progress/:userEmail/:sessionId - Get saved quiz progress (in-memory)
app.get('/api/quiz-progress/:userEmail/:sessionId', async (req, res) => {
  const { userEmail, sessionId } = req.params

  try {
    // If using PostgreSQL, get from database
    if (usePostgres) {
      const result = await pool.query(
        `SELECT * FROM "QuizProgress" WHERE "userEmail" = $1 AND "sessionId" = $2`,
        [userEmail, sessionId]
      )
      
      if (result.rows.length === 0) {
        return res.json(null)
      }
      
      const row = result.rows[0]
      return res.json({
        id: row.id,
        userEmail: row.userEmail,
        sessionId: row.sessionId,
        answers: JSON.parse(row.answers),
        timeRemaining: row.timeRemaining,
        lastSaved: row.lastSaved
      })
    }
    
    const progress = quizProgress.find(p => p.userEmail === userEmail && p.sessionId === sessionId)

    if (!progress) {
      return res.json(null)
    }

    res.json(progress)
  } catch (error) {
    console.error('Failed to get quiz progress:', error)
    res.status(500).json({ error: 'Failed to get progress' })
  }
})

// POST /api/register - User registration
app.post('/api/register', async (req, res) => {
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

// POST /api/login - User authentication with JWT (in-memory)
let userSessions = []
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = userCredentials[email]

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  try {
    // Check password
    const isValidPassword = await bcrypt.compare(password, typeof user.password === 'string' ? user.password : user.password.toString())

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({ email, ...user })

    // Store session in memory
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    const session = {
      id: `session-${Date.now()}`,
      userEmail: email,
      sessionToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: expiresAt.toISOString(),
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    userSessions.push(session)

    // Return user data with tokens
    res.json({
      email: email,
      department: user.department,
      isAdmin: user.isAdmin,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
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
      requestBody: { email, password: '***' }
    }
    logToFile(ERROR_LOG_FILE, JSON.stringify(errorDetails))
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/refresh - Refresh access token (in-memory)
app.post('/api/refresh', async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' })
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    console.log('Refresh token decoded:', decoded.email)

    // Check if refresh token exists in memory and is valid
    const sessionIndex = userSessions.findIndex(s => s.userEmail === decoded.email && s.refreshToken === refreshToken)
    
    console.log('User sessions:', userSessions.map(s => ({ email: s.userEmail, refreshToken: s.refreshToken ? 'present' : 'missing' })))

    if (sessionIndex === -1) {
      console.log('Refresh token not found in memory for:', decoded.email)
      return res.status(403).json({ error: 'Invalid refresh token' })
    }

    const session = userSessions[sessionIndex]

    // Check if session has expired due to inactivity
    const lastActivity = new Date(session.lastActivity)
    const now = new Date()
    const timeSinceActivity = now.getTime() - lastActivity.getTime()

    if (timeSinceActivity > SESSION_TIMEOUT) {
      // Session expired due to inactivity
      userSessions.splice(sessionIndex, 1)
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    // Generate new tokens
    const user = userCredentials[decoded.email]
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user)

    // Update session in memory
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    userSessions[sessionIndex] = {
      ...session,
      sessionToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt.toISOString(),
      lastActivity: new Date().toISOString()
    }

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(403).json({ error: 'Invalid refresh token' })
  }
})

// POST /api/logout - Logout and invalidate session (in-memory)
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    // Delete the current session from memory
    const sessionIndex = userSessions.findIndex(s => s.userEmail === req.user.email && s.sessionToken === token)
    if (sessionIndex !== -1) {
      userSessions.splice(sessionIndex, 1)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// POST /api/logout-all - Logout from all devices (in-memory)
app.post('/api/logout-all', authenticateToken, async (req, res) => {
  try {
    // Delete all sessions for this user from memory
    userSessions = userSessions.filter(s => s.userEmail !== req.user.email)

    res.json({ message: 'Logged out from all devices successfully' })
  } catch (error) {
    console.error('Logout all error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// GET /api/session-status - Check if session is still valid (in-memory)
app.get('/api/session-status', authenticateToken, async (req, res) => {
  try {
    // Check if user still exists and is active
    const user = userCredentials[req.user.email]
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Check session activity in memory
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    const session = userSessions.find(s => s.userEmail === req.user.email && s.sessionToken === token)

    if (!session) {
      return res.status(401).json({ error: 'Session not found' })
    }

    const lastActivity = new Date(session.lastActivity)
    const now = new Date()
    const timeSinceActivity = now.getTime() - lastActivity.getTime()

    if (timeSinceActivity > SESSION_TIMEOUT) {
      // Session expired due to inactivity
      const sessionIndex = userSessions.findIndex(s => s.id === session.id)
      if (sessionIndex !== -1) {
        userSessions.splice(sessionIndex, 1)
      }
      return res.status(401).json({ error: 'Session expired due to inactivity', code: 'SESSION_EXPIRED' })
    }

    res.json({
      valid: true,
      user: {
        email: req.user.email,
        department: req.user.department,
        isAdmin: req.user.isAdmin
      },
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

    // Check if this is a low score that needs retake cooldown
    if (responseData.score < 45) {
      // Start retake cooldown immediately for warning zone scores
      if (!userRetakes[responseData.userEmail]) {
        userRetakes[responseData.userEmail] = {}
      }

      if (!userRetakes[responseData.userEmail][responseData.sessionId]) {
        userRetakes[responseData.userEmail][responseData.sessionId] = {
          attempts: 1,
          cooldownUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          retakeWindowStart: null,
          retakeWindowEnd: null,
          canRetake: false,
          passed: false,
          finalScore: responseData.score
        }
      } else {
        // If they already have retake data, increment attempts if not passed
        const retakeData = userRetakes[responseData.userEmail][responseData.sessionId]
        if (!retakeData.passed) {
          retakeData.attempts += 1
          retakeData.finalScore = responseData.score
          // After first retake failure, start 30-min cooldown then 2-hour window
          if (retakeData.attempts <= 2) {
            retakeData.cooldownUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
            retakeData.canRetake = false
            retakeData.retakeWindowStart = null
            retakeData.retakeWindowEnd = null
          }
        }
      }
    } else {
      // Score >= 45 - user passed! Update retake data
      if (userRetakes[responseData.userEmail] && userRetakes[responseData.userEmail][responseData.sessionId]) {
        const retakeData = userRetakes[responseData.userEmail][responseData.sessionId]
        retakeData.passed = true
        retakeData.canRetake = false
        retakeData.cooldownUntil = null
        retakeData.finalScore = responseData.score
        retakeData.retakeWindowEnd = new Date().toISOString() // Close window
      }
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
    console.log('Profile access check:', { userEmail: req.user.email, requestedEmail: email, isAdmin: req.user.isAdmin })
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

    let result
    // Use direct string interpolation for email to avoid type issues
    result = await pool.query(`
      UPDATE "User"
      SET ${updates.join(', ')}
      WHERE email = '${email}'
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

    // Log audit action
    await logAuditAction(
      req.user.email,
      'change_password',
      {
        changedUser: email,
        adminChange: req.user.email !== email
      },
      req
    )

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ error: 'Failed to change password' })
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
const startServer = async () => {
  try {
    console.log('Initializing user credentials...')
    userCredentials = await initializeUserCredentials()
    console.log('User credentials initialized successfully')

    app.listen(PORT, () => {
      console.log(`BDO Skills Pulse API server running on http://localhost:${PORT}`)
      console.log('Note: Using mock data for demonstration purposes')
      console.log('Admin accounts initialized with secure passwords')
      console.log('Professional training effectiveness and competency validation platform')
    })
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

startServer()