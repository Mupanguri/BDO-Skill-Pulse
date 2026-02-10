import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Initialize SQLite database connection
const dbPath = path.resolve(__dirname, 'prisma', 'dev.db')
console.log('Database path:', dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err)
  } else {
    console.log('Database connected successfully')
  }
})

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

// Initialize user credentials from database
const initializeUserCredentials = async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT email, password, department, isAdmin FROM User', [], (err, rows) => {
      if (err) {
        console.error('Error loading users from database:', err)
        resolve({})
        return
      }

      const credentials = {}
      for (const user of rows) {
        credentials[user.email] = {
          password: user.password, // Already hashed in database
          department: user.department,
          isAdmin: Boolean(user.isAdmin)
        }
      }

      console.log(`Loaded ${rows.length} users from database`)
      resolve(credentials)
    })
  })
}

// Global user credentials (will be initialized on server start)
let userCredentials = {}

// User warnings tracking
let userWarnings = {}

// User retake tracking
let userRetakes = {}

// User notifications
let userNotifications = {}

// Mock data for demonstration
let mockSessions = [
  {
    id: 'session-1',
    name: 'Q1 2024 Tax Quiz',
    date: '2024-03-15T10:00:00.000Z',
    time: '10:00',
    isActive: true,
    createdAt: '2024-03-01T09:00:00.000Z',
    createdBy: 'admin@bdo.co.zw',
    questions: [
      {
        id: 'q1',
        text: 'What is the current corporate tax rate in Zimbabwe?',
        options: ['25%', '30%', '35%', '40%'],
        correctAnswer: 1,
        type: 'multiple-choice'
      },
      {
        id: 'q2',
        text: 'Which of the following is considered a tax-deductible expense?',
        options: ['Personal travel costs', 'Business entertainment', 'Employee salaries', 'Dividends paid'],
        correctAnswer: 2,
        type: 'multiple-choice'
      },
      {
        id: 'q3',
        text: 'What is the VAT rate in Zimbabwe?',
        options: ['12%', '14%', '15%', '16%'],
        correctAnswer: 1,
        type: 'multiple-choice'
      }
    ],
    _count: { responses: 5 }
  },
  {
    id: 'session-2',
    name: 'Q2 2024 Audit Procedures Quiz',
    date: '2024-06-20T14:00:00.000Z',
    time: '14:00',
    isActive: false,
    createdAt: '2024-05-15T11:00:00.000Z',
    createdBy: 'admin@bdo.co.zw',
    questions: [
      {
        id: 'q1',
        text: 'What is the primary objective of an audit?',
        options: ['To detect fraud', 'To express an opinion on financial statements', 'To prepare tax returns', 'To manage company finances'],
        correctAnswer: 1,
        type: 'multiple-choice'
      },
      {
        id: 'q2',
        text: 'Which of the following is a type of audit evidence?',
        options: ['Physical inspection', 'Reperformance', 'Observation', 'All of the above'],
        correctAnswer: 3,
        type: 'multiple-choice'
      }
    ],
    _count: { responses: 0 }
  }
]

let mockResponses = [
  {
    id: 'response-1',
    sessionId: 'session-1',
    score: 80,
    timeSpent: 450, // 7.5 minutes
    completedAt: '2024-03-15T10:45:00.000Z',
    user: {
      email: 'john.doe@bdo.co.zw',
      department: 'Tax'
    }
  },
  {
    id: 'response-2',
    sessionId: 'session-1',
    score: 90,
    timeSpent: 380,
    completedAt: '2024-03-15T11:00:00.000Z',
    user: {
      email: 'jane.smith@bdo.co.zw',
      department: 'Audit'
    }
  },
  {
    id: 'response-3',
    sessionId: 'session-1',
    score: 70,
    timeSpent: 520,
    completedAt: '2024-03-15T11:15:00.000Z',
    user: {
      email: 'mike.johnson@bdo.co.zw',
      department: 'IT'
    }
  },
  {
    id: 'response-4',
    sessionId: 'session-2',
    score: 85,
    timeSpent: 420,
    completedAt: '2024-06-20T15:30:00.000Z',
    user: {
      email: 'john.doe@bdo.co.zw',
      department: 'Tax'
    }
  },
  {
    id: 'response-5',
    sessionId: 'session-2',
    score: 75,
    timeSpent: 480,
    completedAt: '2024-06-20T16:00:00.000Z',
    user: {
      email: 'jane.smith@bdo.co.zw',
      department: 'Audit'
    }
  }
]

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'bdo-quiz-system-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bdo-quiz-refresh-secret-key-change-in-production'
const JWT_EXPIRES_IN = '15m' // 15 minutes for access token
const JWT_REFRESH_EXPIRES_IN = '7d' // 7 days for refresh token
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

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

// GET /api/users - Get all users
app.get('/api/users', (req, res) => {
  const users = Object.keys(userCredentials).map(email => ({
    email,
    department: userCredentials[email].department,
    isAdmin: userCredentials[email].isAdmin
  }))
  res.json(users)
})

// GET /api/sessions - Get all sessions
app.get('/api/sessions', (req, res) => {
  res.json(mockSessions)
})

// GET /api/sessions/:id - Get a specific session with responses
app.get('/api/sessions/:id', (req, res) => {
  const session = mockSessions.find(s => s.id === req.params.id)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  // Add responses to the session
  const sessionWithResponses = {
    ...session,
    responses: mockResponses
  }

  res.json(sessionWithResponses)
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

  mockSessions.push(newSession)

  // Log audit action
  await logAuditAction(
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
      await fetch(`http://localhost:3001/api/department/${newSession.department}/notifications`, {
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
})

// PATCH /api/sessions/:id - Update session (e.g., activate/deactivate)
app.patch('/api/sessions/:id', (req, res) => {
  console.log(`PATCH /api/sessions/${req.params.id} received`)
  console.log('Request body:', req.body)

  const sessionIndex = mockSessions.findIndex(s => s.id === req.params.id)
  if (sessionIndex === -1) {
    console.log('Session not found')
    return res.status(404).json({ error: 'Session not found' })
  }

  const oldSession = mockSessions[sessionIndex]
  mockSessions[sessionIndex] = {
    ...mockSessions[sessionIndex],
    ...req.body
  }

  const newSession = mockSessions[sessionIndex]
  console.log('Session updated from:', { isActive: oldSession.isActive }, 'to:', { isActive: newSession.isActive })
  console.log('Updated session:', newSession)

  res.json(mockSessions[sessionIndex])
})

// GET /api/sessions/active - Get the currently active session
app.get('/api/sessions/active', (req, res) => {
  const activeSession = mockSessions.find(s => s.isActive)
  res.json(activeSession || null)
})

// GET /api/user/:email/submissions - Get user's quiz submissions
app.get('/api/user/:email/submissions', (req, res) => {
  const userEmail = req.params.email
  const userSubmissions = mockResponses.filter(response => response.user.email === userEmail)
  res.json(userSubmissions)
})

// GET /api/user/:email/session/:sessionId/submission - Check if user has submitted specific session
app.get('/api/user/:email/session/:sessionId/submission', (req, res) => {
  const { email, sessionId } = req.params
  const hasSubmitted = mockResponses.some(response => response.user.email === email && response.sessionId === sessionId)
  res.json({ hasSubmitted })
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
      canRetake: false
    }
  }

  const retakeStatus = userRetakes[email][sessionId]
  const now = Date.now()
  const cooldownEnd = retakeStatus.cooldownUntil ? new Date(retakeStatus.cooldownUntil).getTime() : 0

  // Check if cooldown has expired
  if (cooldownEnd > 0 && now >= cooldownEnd) {
    retakeStatus.canRetake = retakeStatus.attempts < 1
    retakeStatus.cooldownUntil = null
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
      canRetake: false
    }
  }

  const retakeData = userRetakes[email][sessionId]

  // Check if user already used their retake attempt
  if (retakeData.attempts >= 1) {
    return res.status(400).json({ error: 'Maximum retake attempts reached' })
  }

  // Start 30-minute cooldown
  const cooldownEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now

  retakeData.cooldownUntil = cooldownEnd
  retakeData.canRetake = false
  retakeData.attempts = 1

  res.json({
    message: 'Retake cooldown started',
    cooldownUntil: cooldownEnd,
    attemptsRemaining: 0
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
    const feedback = quizFeedback.find(f => f.userEmail === userEmail && f.sessionId === sessionId)

    res.json({
      hasFeedback: !!feedback,
      feedback: feedback
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
    // Find existing progress
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
  const { email, password, department } = req.body

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

  // Check if user already exists
  if (userCredentials[email]) {
    return res.status(409).json({ error: 'User already exists' })
  }

  try {
    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Add to user credentials (in production, this would be saved to database)
    userCredentials[email] = {
      password: hashedPassword,
      department: department,
      isAdmin: false // New users are not admins by default
    }

    res.status(201).json({
      message: 'User registered successfully',
      email: email,
      department: department,
      isAdmin: false
    })
  } catch (error) {
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
    const { accessToken, refreshToken } = generateTokens(user)

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

    // Check if refresh token exists in memory and is valid
    const sessionIndex = userSessions.findIndex(s => s.userEmail === decoded.email && s.refreshToken === refreshToken)

    if (sessionIndex === -1) {
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
app.post('/api/responses', (req, res) => {
  const responseData = req.body
  const newResponse = {
    id: `response-${Date.now()}`,
    ...responseData,
    completedAt: responseData.completedAt || new Date().toISOString()
  }

  // Get user department from credentials
  const user = userCredentials[responseData.userEmail]
  const department = user ? user.department : 'Unknown'

  // Add to mock responses
  mockResponses.push({
    id: newResponse.id,
    sessionId: newResponse.sessionId,
    score: newResponse.score,
    timeSpent: newResponse.timeSpent,
    completedAt: newResponse.completedAt,
    user: {
      email: newResponse.userEmail,
      department: department
    }
  })

  // Check if this is a low score that needs retake cooldown
  if (responseData.score < 45) {
    // Start retake cooldown immediately for warning zone scores
    if (!userRetakes[responseData.userEmail]) {
      userRetakes[responseData.userEmail] = {}
    }

    if (!userRetakes[responseData.userEmail][responseData.sessionId]) {
      userRetakes[responseData.userEmail][responseData.sessionId] = {
        attempts: 0,
        cooldownUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        canRetake: false
      }
    } else {
      // If they already have retake data, update cooldown if not already set
      const retakeData = userRetakes[responseData.userEmail][responseData.sessionId]
      if (!retakeData.cooldownUntil) {
        retakeData.cooldownUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        retakeData.canRetake = false
      }
    }
  }

  // Update the response count for the session
  const sessionIndex = mockSessions.findIndex(s => s.id === newResponse.sessionId)
  if (sessionIndex !== -1) {
    const sessionResponseCount = mockResponses.filter(r => r.sessionId === newResponse.sessionId).length
    mockSessions[sessionIndex]._count.responses = sessionResponseCount
  }

  res.status(201).json(newResponse)
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
