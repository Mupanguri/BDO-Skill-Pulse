import { Router } from 'express'
import fs from 'fs'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { LOG_FILE, ERROR_LOG_FILE } from '../middleware/logging.js'

const router = Router()

router.get('/api/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const lines = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(-500)
      : []
    res.json({ logs: lines })
  } catch {
    res.status(500).json({ error: 'Failed to read logs' })
  }
})

router.delete('/api/logs/clear', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '')
    if (fs.existsSync(ERROR_LOG_FILE)) fs.writeFileSync(ERROR_LOG_FILE, '')
    res.json({ message: 'Logs cleared successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to clear logs' })
  }
})

export default router
