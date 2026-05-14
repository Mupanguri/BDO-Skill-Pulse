import { Router } from 'express'
import { pool, prisma } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import { RETAKE_COOLDOWN_MS } from '../constants.js'
import { getUserCredentials } from './auth.js'

const router = Router()

router.post('/api/responses', authenticateToken, async (req, res) => {
  const data = req.body

  try {
    const userRow = await pool.query('SELECT id FROM "User" WHERE email = $1', [data.userEmail])
    if (!userRow.rows.length) return res.status(404).json({ error: 'User not found' })
    const userId = userRow.rows[0].id

    const newResponse = {
      id: `response-${Date.now()}`,
      ...data,
      completedAt: data.completedAt || new Date().toISOString()
    }

    await pool.query(
      `INSERT INTO "QuizResponse" (id, "sessionId", "userId", answers, score, "timeSpent", "completedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newResponse.id, newResponse.sessionId, userId, JSON.stringify(newResponse.answers || {}), newResponse.score, newResponse.timeSpent, newResponse.completedAt]
    )

    if (data.score < 45) {
      const cooldownEnd = new Date(Date.now() + RETAKE_COOLDOWN_MS)
      await prisma.userRetake.upsert({
        where: { userEmail_sessionId: { userEmail: data.userEmail, sessionId: data.sessionId } },
        update: { attempts: { increment: 1 }, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() },
        create: { userEmail: data.userEmail, sessionId: data.sessionId, attempts: 1, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() }
      })
    } else {
      await prisma.userRetake.updateMany({
        where: { userEmail: data.userEmail, sessionId: data.sessionId },
        data: { canRetake: false, cooldownUntil: null }
      })
    }

    res.status(201).json(newResponse)
  } catch (err) {
    console.error('Submit response error:', err)
    res.status(500).json({ error: 'Failed to submit response' })
  }
})

router.get('/api/user/:email/submissions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r."sessionId", r.score, r."timeSpent", r."completedAt", u.email, u.department
      FROM "QuizResponse" r
      LEFT JOIN "User" u ON r."userId" = u.id
      WHERE u.email = $1
      ORDER BY r."completedAt" DESC
    `, [req.params.email])
    res.json(result.rows.map(row => ({
      id: row.id, sessionId: row.sessionId, score: row.score,
      timeSpent: row.timeSpent, completedAt: row.completedAt,
      user: { email: row.email, department: row.department }
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

router.get('/api/user/:email/session/:sessionId/submission', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id FROM "QuizResponse" r
      JOIN "User" u ON r."userId" = u.id
      WHERE u.email = $1 AND r."sessionId" = $2
    `, [req.params.email, req.params.sessionId])
    res.json({ hasSubmitted: result.rows.length > 0 })
  } catch {
    res.status(500).json({ error: 'Failed to check submission' })
  }
})

export default router
