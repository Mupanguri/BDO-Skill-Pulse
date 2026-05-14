import { Router } from 'express'
import { prisma } from '../db.js'
import { authenticateToken, requireAdmin, requireAdminOrHR } from '../middleware/auth.js'

const router = Router()

router.post('/api/feedback', async (req, res) => {
  const { userEmail, sessionId, rating, comments } = req.body
  try {
    const existing = await prisma.quizFeedback.findFirst({ where: { userEmail, sessionId } })
    if (existing) return res.status(400).json({ error: 'Feedback already submitted for this quiz' })

    const feedback = await prisma.quizFeedback.create({
      data: { userEmail, sessionId, rating, comments: comments || null }
    })
    res.status(201).json({ message: 'Feedback submitted successfully', feedback })
  } catch {
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

router.get('/api/feedback/check/:userEmail/:sessionId', async (req, res) => {
  try {
    const feedback = await prisma.quizFeedback.findFirst({
      where: { userEmail: req.params.userEmail, sessionId: req.params.sessionId }
    })
    res.json({ hasFeedback: !!feedback, feedback: feedback || null })
  } catch {
    res.status(500).json({ error: 'Failed to check feedback status' })
  }
})

router.get('/api/feedback/admin', authenticateToken, requireAdminOrHR, async (req, res) => {
  try {
    const where = req.query.sessionId ? { sessionId: req.query.sessionId } : {}
    const feedback = await prisma.quizFeedback.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: { id: true, sessionId: true, rating: true, comments: true, submittedAt: true }
    })
    res.json({ feedback })
  } catch {
    res.status(500).json({ error: 'Failed to get feedback' })
  }
})

router.get('/api/feedback/stats', authenticateToken, requireAdminOrHR, async (req, res) => {
  try {
    const [total, avgResult, recent] = await Promise.all([
      prisma.quizFeedback.count(),
      prisma.quizFeedback.aggregate({ _avg: { rating: true } }),
      prisma.quizFeedback.findMany({ orderBy: { submittedAt: 'desc' }, take: 5, select: { id: true, sessionId: true, rating: true, comments: true, submittedAt: true } })
    ])
    const dist = await Promise.all([1, 2, 3, 4, 5].map(r => prisma.quizFeedback.count({ where: { rating: r } })))
    res.json({
      totalFeedback: total,
      averageRating: Math.round((avgResult._avg.rating || 0) * 10) / 10,
      ratingDistribution: { 1: dist[0], 2: dist[1], 3: dist[2], 4: dist[3], 5: dist[4] },
      recentFeedback: recent
    })
  } catch {
    res.status(500).json({ error: 'Failed to get feedback statistics' })
  }
})

export default router
