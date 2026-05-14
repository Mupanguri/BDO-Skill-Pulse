import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/api/audit/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 500 })
    res.json({ logs })
  } catch {
    res.status(500).json({ error: 'Failed to get audit logs' })
  }
})

export default router
