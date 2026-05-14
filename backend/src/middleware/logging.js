import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LOG_DIR = path.resolve(__dirname, '../../logs')
export const LOG_FILE = path.join(LOG_DIR, 'api-requests.log')
export const ERROR_LOG_FILE = path.join(LOG_DIR, 'errors.log')

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

export const logToFile = (filePath, message) => {
  try {
    fs.appendFileSync(filePath, `[${new Date().toISOString()}] ${message}\n`)
  } catch {
    // Non-fatal — don't crash the server if logging fails
  }
}

const SENSITIVE_FIELDS = ['password', 'newPassword', 'oldPassword', 'currentPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken']

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body
  const sanitized = { ...body }
  SENSITIVE_FIELDS.forEach(k => { if (sanitized[k] !== undefined) sanitized[k] = '[REDACTED]' })
  return sanitized
}

export const sendError = (res, status, message, code = null) =>
  res.status(status).json({ error: message, ...(code ? { code } : {}) })

export const logRequest = (req, res, next) => {
  const startTime = Date.now()
  const requestId = `req-${startTime}-${Math.random().toString(36).slice(2, 9)}`

  logToFile(LOG_FILE, `REQUEST: ${JSON.stringify({
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: sanitizeBody(req.body),
    query: req.query
  })}`)

  const originalJson = res.json
  res.json = function (data) {
    const ms = Date.now() - startTime
    if (res.statusCode >= 400) {
      logToFile(ERROR_LOG_FILE, `ERROR ${res.statusCode}: ${req.method} ${req.originalUrl} ${ms}ms — ${data?.error || ''}`)
    }
    return originalJson.call(this, data)
  }

  next()
}

export const logAuditAction = async (adminEmail, action, details, req) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail,
        action,
        details: JSON.stringify(details || {}),
        ipAddress: req?.ip || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown'
      }
    })
  } catch {
    // Non-fatal
  }
}
