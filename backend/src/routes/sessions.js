import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { pool, prisma } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import { logAuditAction } from '../middleware/logging.js'
import { sendQuizNotification } from '../utils/mailer.js'

const router = Router()

const fetchSessions = async () => {
  const result = await pool.query(`
    SELECT s.*, COUNT(r.id) AS "responseCount"
    FROM "QuizSession" s
    LEFT JOIN "QuizResponse" r ON s.id = r."sessionId"
    GROUP BY s.id
    ORDER BY s."createdAt" DESC
  `)
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    department: row.department || null,
    timeLimitMinutes: row.timeLimitMinutes || 30,
    questions: JSON.parse(row.questions || '[]'),
    _count: { responses: parseInt(row.responseCount) || 0 }
  }))
}

const fetchResponses = async () => {
  const result = await pool.query(`
    SELECT r.*, u.email, u.department
    FROM "QuizResponse" r
    LEFT JOIN "User" u ON r."userId" = u.id
    ORDER BY r."completedAt" DESC
  `)
  return result.rows.map(row => ({
    id: row.id,
    sessionId: row.sessionId,
    score: row.score,
    timeSpent: row.timeSpent,
    completedAt: row.completedAt,
    answers: row.answers,
    user: row.email ? { email: row.email, department: row.department } : null
  }))
}

// GET /api/sessions/active — must be registered BEFORE /api/sessions/:id
router.get('/api/sessions/active', async (req, res) => {
  try {
    const sessions = await fetchSessions()
    res.json(sessions.find(s => s.isActive) || null)
  } catch {
    res.status(500).json({ error: 'Failed to fetch active session' })
  }
})

router.get('/api/sessions', async (req, res) => {
  try {
    // Optional auth — annotate canViewMetrics for admin/HR callers
    let caller = null
    try {
      const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1]
      if (token) caller = jwt.verify(token, process.env.JWT_SECRET)
    } catch {}

    const sessions = await fetchSessions()

    if (caller?.isAdmin || caller?.isHR) {
      return res.json(sessions.map(s => ({
        ...s,
        canViewMetrics: Boolean(caller.isHR || s.createdBy === caller.email)
      })))
    }

    // Regular users: only show active sessions matching their department (or 'everyone' / no dept)
    const userDept = caller?.department || null
    const visible = sessions.filter(s => {
      if (!s.isActive) return false
      if (!s.department || s.department === 'everyone') return true
      return s.department === userDept
    })
    res.json(visible)
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

router.get('/api/sessions/:id', async (req, res) => {
  try {
    const sessions = await fetchSessions()
    const session = sessions.find(s => s.id === req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const responses = await fetchResponses()
    let sessionResponses = responses.filter(r => r.sessionId === session.id)
    if (req.query.userEmail) {
      sessionResponses = sessionResponses.filter(r => r.user?.email === req.query.userEmail)
    }

    res.json({ ...session, responses: sessionResponses })
  } catch {
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

router.post('/api/sessions', authenticateToken, async (req, res) => {
  const data = req.body
  const newSession = {
    id: `session-${Date.now()}`,
    ...data,
    isActive: false,
    createdAt: new Date().toISOString(),
    _count: { responses: 0 }
  }

  try {
    await pool.query(
      `INSERT INTO "QuizSession" (id, name, date, time, "isActive", "createdAt", "createdBy", department, questions, "timeLimitMinutes")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [newSession.id, newSession.name, newSession.date, newSession.time, false, newSession.createdAt, newSession.createdBy, data.department || null, JSON.stringify(newSession.questions || []), data.timeLimitMinutes || 30]
    )

    await logAuditAction(req.user.email, 'create_quiz', { sessionId: newSession.id, sessionName: newSession.name, questionCount: (newSession.questions || []).length }, req)

    // Notify department (fire-and-forget)
    if (data.department) {
      fetch(`http://localhost:${process.env.PORT || 3001}/api/department/${data.department}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz_posted',
          title: 'New Quiz Available',
          message: `${req.user.email.split('@')[0].toUpperCase()} has posted a quiz for the ${data.department === 'everyone' ? 'all departments' : data.department + ' department'} to be completed within the stated time lines.`,
          adminEmail: req.user.email,
          quizName: newSession.name
        })
      }).catch(() => {})
    }

    res.status(201).json(newSession)
  } catch (err) {
    console.error('Create session error:', err)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

router.patch('/api/sessions/:id', authenticateToken, async (req, res) => {
  const { isActive } = req.body
  try {
    // Fetch current state before update
    const before = await pool.query(`SELECT name, "isActive", "createdBy", department, questions FROM "QuizSession" WHERE id=$1`, [req.params.id])
    if (!before.rows.length) return res.status(404).json({ error: 'Session not found' })
    const session = before.rows[0]

    const result = await pool.query(
      `UPDATE "QuizSession" SET "isActive"=$1, "updatedAt"=$2 WHERE id=$3 RETURNING id, name, "isActive"`,
      [isActive, new Date().toISOString(), req.params.id]
    )

    // Send notifications when activating a session (fire-and-forget)
    if (isActive && !session.isActive) {
      const dept = session.department || null

      // Get users matching the session's target department
      const usersResult = (!dept || dept === 'everyone')
        ? await pool.query(`SELECT email FROM "User" WHERE "isAdmin"=false AND "deletedAt" IS NULL`)
        : await pool.query(`SELECT email FROM "User" WHERE department=$1 AND "isAdmin"=false AND "deletedAt" IS NULL`, [dept])
      const emails = usersResult.rows.map(r => r.email)

      // Create in-app notifications for each user
      for (const email of emails) {
        prisma.userNotification.create({
          data: {
            userEmail: email,
            type: 'quiz_posted',
            title: 'New Quiz Available',
            message: `${session.createdBy.split('@')[0]} has published "${session.name}". Go to your dashboard to submit your responses.`,
            adminEmail: req.user.email,
            quizName: session.name
          }
        }).catch(() => {})
      }

      // Send email notifications
      sendQuizNotification(emails, session.name, session.createdBy, dept || 'everyone').catch(() => {})
    }

    res.json({ message: 'Session updated successfully', id: req.params.id, isActive: result.rows[0].isActive })
  } catch {
    res.status(500).json({ error: 'Failed to update session' })
  }
})

router.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM "QuizSession" WHERE id=$1 RETURNING id', [req.params.id])
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' })
    await logAuditAction(req.user.email, 'delete_quiz', { sessionId: req.params.id }, req)
    res.json({ message: 'Session deleted successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

export { fetchSessions, fetchResponses }
export default router
