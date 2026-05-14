import { Router } from 'express'
import { prisma } from '../db.js'
import { RETAKE_COOLDOWN_MS, RETAKE_WINDOW_MS } from '../constants.js'

const router = Router()

router.get('/api/user/:email/session/:sessionId/retake-status', async (req, res) => {
  const { email, sessionId } = req.params
  const now = Date.now()

  try {
    let retake = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })

    if (!retake) return res.json({ attempts: 0, cooldownUntil: null, retakeWindowEnd: null, canRetake: false })

    let retakeWindowEnd = retake.cooldownUntil
      ? new Date(new Date(retake.cooldownUntil).getTime() + RETAKE_WINDOW_MS).toISOString()
      : null

    if (retake.cooldownUntil && now >= new Date(retake.cooldownUntil).getTime() && retake.attempts < 2) {
      if (now < new Date(retakeWindowEnd).getTime()) {
        if (!retake.canRetake) {
          retake = await prisma.userRetake.update({
            where: { userEmail_sessionId: { userEmail: email, sessionId } },
            data: { canRetake: true, cooldownUntil: null }
          })
          retakeWindowEnd = null
        }
      } else {
        retake = await prisma.userRetake.update({
          where: { userEmail_sessionId: { userEmail: email, sessionId } },
          data: { canRetake: false, cooldownUntil: null }
        })
        retakeWindowEnd = null
      }
    }

    res.json({ ...retake, retakeWindowEnd })
  } catch {
    res.status(500).json({ error: 'Failed to get retake status' })
  }
})

router.post('/api/user/:email/session/:sessionId/start-retake', async (req, res) => {
  const { email, sessionId } = req.params
  const { score } = req.body

  if (score >= 45) return res.status(400).json({ error: 'Retakes only allowed for scores below 45' })

  try {
    const existing = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })
    if (existing && existing.attempts >= 2) return res.status(400).json({ error: 'Maximum retake attempts (2) reached' })

    const cooldownEnd = new Date(Date.now() + RETAKE_COOLDOWN_MS)
    const retake = await prisma.userRetake.upsert({
      where: { userEmail_sessionId: { userEmail: email, sessionId } },
      update: { cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() },
      create: { userEmail: email, sessionId, attempts: 0, cooldownUntil: cooldownEnd, canRetake: false, lastAttempt: new Date() }
    })

    res.json({ message: 'Retake cooldown started', cooldownUntil: cooldownEnd.toISOString(), attemptsRemaining: 2 - retake.attempts })
  } catch {
    res.status(500).json({ error: 'Failed to start retake' })
  }
})

router.post('/api/user/:email/session/:sessionId/complete-retake', async (req, res) => {
  const { email, sessionId } = req.params
  try {
    const retake = await prisma.userRetake.findUnique({
      where: { userEmail_sessionId: { userEmail: email, sessionId } }
    })
    if (!retake) return res.status(404).json({ error: 'No retake data found' })

    await prisma.userRetake.update({
      where: { userEmail_sessionId: { userEmail: email, sessionId } },
      data: { canRetake: false, cooldownUntil: null, attempts: { increment: 1 } }
    })
    res.json({ message: 'Retake marked as completed' })
  } catch {
    res.status(500).json({ error: 'Failed to complete retake' })
  }
})

export default router
