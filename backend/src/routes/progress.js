import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.post('/api/quiz-progress', async (req, res) => {
  const { userEmail, sessionId, answers, timeRemaining } = req.body
  try {
    const progress = await prisma.quizProgress.upsert({
      where: { userEmail_sessionId: { userEmail, sessionId } },
      update: { answers: JSON.stringify(answers), timeRemaining, lastSaved: new Date() },
      create: { userEmail, sessionId, answers: JSON.stringify(answers), timeRemaining, lastSaved: new Date() }
    })
    res.json({ message: 'Progress saved successfully', progress: { ...progress, answers } })
  } catch {
    res.status(500).json({ error: 'Failed to save progress' })
  }
})

router.get('/api/quiz-progress/:userEmail/:sessionId', async (req, res) => {
  try {
    const progress = await prisma.quizProgress.findUnique({
      where: { userEmail_sessionId: { userEmail: req.params.userEmail, sessionId: req.params.sessionId } }
    })
    if (!progress) return res.json(null)
    res.json({ ...progress, answers: JSON.parse(progress.answers) })
  } catch {
    res.status(500).json({ error: 'Failed to get progress' })
  }
})

export default router
