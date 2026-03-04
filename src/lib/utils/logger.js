import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Logging configuration
const LOG_DIR = path.resolve(__dirname, '../../../logs')
const LOG_FILE = path.join(LOG_DIR, 'logs.txt')

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// Performance tracking
const performanceMetrics = new Map()

// Enhanced logging utility
const logger = {
  // Format timestamp
  getTimestamp: () => {
    const now = new Date()
    return now.toISOString()
  },

  // Format log entry
  formatEntry: (level, message, metadata = {}) => {
    const timestamp = logger.getTimestamp()
    const entry = {
      timestamp,
      level,
      message,
      metadata,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
    return JSON.stringify(entry)
  },

  // Write to main log file
  writeLog: (level, message, metadata = {}) => {
    const logEntry = logger.formatEntry(level, message, metadata)
    try {
      fs.appendFileSync(LOG_FILE, logEntry + '\n')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  },

  // Info level logging
  info: (message, metadata = {}) => {
    console.log(`[INFO] ${message}`)
    logger.writeLog('INFO', message, metadata)
  },

  // Error level logging
  error: (message, error = null, metadata = {}) => {
    const errorDetails = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...metadata
      }
    } : metadata
    
    console.error(`[ERROR] ${message}`, error)
    logger.writeLog('ERROR', message, errorDetails)
  },

  // Warning level logging
  warn: (message, metadata = {}) => {
    console.warn(`[WARN] ${message}`)
    logger.writeLog('WARN', message, metadata)
  },

  // Debug level logging
  debug: (message, metadata = {}) => {
    console.log(`[DEBUG] ${message}`)
    logger.writeLog('DEBUG', message, metadata)
  },

  // Performance logging
  performance: (operation, duration, metadata = {}) => {
    const perfData = {
      operation,
      duration,
      ...metadata
    }
    console.log(`[PERF] ${operation}: ${duration}ms`)
    logger.writeLog('PERFORMANCE', `Operation completed`, perfData)
  },

  // Database operation logging
  db: (operation, table, duration, metadata = {}) => {
    const dbData = {
      operation,
      table,
      duration,
      ...metadata
    }
    console.log(`[DB] ${operation} on ${table}: ${duration}ms`)
    logger.writeLog('DATABASE', `${operation} on ${table}`, dbData)
  },

  // API request logging
  api: (method, url, duration, statusCode, metadata = {}) => {
    const apiData = {
      method,
      url,
      duration,
      statusCode,
      ...metadata
    }
    console.log(`[API] ${method} ${url}: ${statusCode} - ${duration}ms`)
    logger.writeLog('API', `${method} ${url}`, apiData)
  },

  // Authentication logging
  auth: (action, email, success, metadata = {}) => {
    const authData = {
      action,
      email,
      success,
      ...metadata
    }
    const status = success ? 'SUCCESS' : 'FAILED'
    console.log(`[AUTH] ${action} for ${email}: ${status}`)
    logger.writeLog('AUTHENTICATION', `${action}: ${status}`, authData)
  },

  // User action logging
  userAction: (action, email, details = {}) => {
    const userData = {
      action,
      email,
      details
    }
    console.log(`[USER] ${action} by ${email}`)
    logger.writeLog('USER_ACTION', action, userData)
  },

  // System health logging
  systemHealth: () => {
    const healthData = {
      timestamp: logger.getTimestamp(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    }
    console.log(`[HEALTH] System health check`)
    logger.writeLog('SYSTEM_HEALTH', 'Health check', healthData)
  },

  // Start performance tracking
  startPerformance: (operation) => {
    const startTime = process.hrtime.bigint()
    performanceMetrics.set(operation, startTime)
    return startTime
  },

  // End performance tracking and log
  endPerformance: (operation) => {
    const startTime = performanceMetrics.get(operation)
    if (startTime) {
      const endTime = process.hrtime.bigint()
      const duration = Number(endTime - startTime) / 1000000 // Convert to milliseconds
      performanceMetrics.delete(operation)
      logger.performance(operation, Math.round(duration))
      return Math.round(duration)
    }
    return 0
  },

  // Log system startup
  systemStartup: (port) => {
    const startupData = {
      port,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    }
    console.log(`[STARTUP] BDO Skills Pulse API server starting on http://localhost:${port}`)
    logger.writeLog('SYSTEM_STARTUP', `Server started on port ${port}`, startupData)
  },

  // Log system shutdown
  systemShutdown: () => {
    console.log(`[SHUTDOWN] BDO Skills Pulse API server shutting down`)
    logger.writeLog('SYSTEM_SHUTDOWN', 'Server shutdown initiated', {})
  }
}

// Log system startup
logger.systemStartup(3001)

// Log system health every 30 seconds
setInterval(() => {
  logger.systemHealth()
}, 30000)

export default logger