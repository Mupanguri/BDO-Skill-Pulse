import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'

import { connectToDatabase, loadUserCredentials } from './db.js'
import { logRequest } from './middleware/logging.js'
import { ONE_MINUTE_MS } from './constants.js'

// Routes
import healthRouter from './routes/health.js'
import authRouter, { setUserCredentials } from './routes/auth.js'
import usersRouter from './routes/users.js'
import sessionsRouter from './routes/sessions.js'
import responsesRouter from './routes/responses.js'
import retakesRouter from './routes/retakes.js'
import notificationsRouter from './routes/notifications.js'
import feedbackRouter from './routes/feedback.js'
import progressRouter from './routes/progress.js'
import analyticsRouter from './routes/analytics.js'
import auditRouter from './routes/audit.js'
import passwordResetRouter from './routes/passwordReset.js'
import logsRouter from './routes/logs.js'

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables.')
  process.exit(1)
}

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:9000',
  'http://127.0.0.1:9000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
]

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"]
    }
  }
}))

app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(logRequest)

const authLimiter = rateLimit({ windowMs: 15 * ONE_MINUTE_MS, max: 10, message: { error: 'Too many attempts, please try again later.' }, standardHeaders: true, legacyHeaders: false })
const registerLimiter = rateLimit({ windowMs: 60 * ONE_MINUTE_MS, max: 5, message: { error: 'Too many registrations from this IP.' }, standardHeaders: true, legacyHeaders: false })
const resetLimiter = rateLimit({ windowMs: 60 * ONE_MINUTE_MS, max: 5, message: { error: 'Too many reset requests.' }, standardHeaders: true, legacyHeaders: false })

// Apply rate limiters to specific paths
app.post('/api/login', authLimiter)
app.post('/api/register', registerLimiter)
app.post('/api/password-reset/reset', resetLimiter)
app.post('/api/password-reset/contact-admin', resetLimiter)
app.post('/api/auth/otp/request', authLimiter)
app.post('/api/auth/otp/verify', authLimiter)

// Mount all routers
app.use(healthRouter)
app.use(authRouter)
app.use(usersRouter)
app.use(sessionsRouter)
app.use(responsesRouter)
app.use(retakesRouter)
app.use(notificationsRouter)
app.use(feedbackRouter)
app.use(progressRouter)
app.use(analyticsRouter)
app.use(auditRouter)
app.use(passwordResetRouter)
app.use(logsRouter)

let httpServer = null

const start = async () => {
  const connected = await connectToDatabase()
  if (!connected) process.exit(1)

  // Backfill: ensure all Human Resources department users have isHR=true
  try {
    const { pool } = await import('./db.js')
    const result = await pool.query(
      `UPDATE "User" SET "isHR" = true WHERE department = 'Human Resources' AND "isHR" = false`
    )
    if (result.rowCount > 0)
      console.log(`[MIGRATION] Set isHR=true for ${result.rowCount} existing HR department user(s)`)
  } catch (err) {
    console.warn('[MIGRATION] HR backfill failed (non-fatal):', err.message)
  }

  const creds = await loadUserCredentials()
  setUserCredentials(creds)
  console.log(`[AUTH] Loaded ${Object.keys(creds).length} users from database`)

  httpServer = app.listen(PORT, () => {
    console.log(`[SERVER] BDO Skills Pulse API running on http://localhost:${PORT}`)
  })
}

const shutdown = async (signal) => {
  console.log(`[SERVER] ${signal} received — shutting down`)
  const { pool, prisma } = await import('./db.js')
  if (httpServer) {
    httpServer.close(async () => {
      await pool.end().catch(() => {})
      await prisma.$disconnect().catch(() => {})
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => { console.error('[SERVER] Uncaught exception:', err.message) })
process.on('unhandledRejection', (reason) => { console.error('[SERVER] Unhandled rejection:', reason) })

start()
