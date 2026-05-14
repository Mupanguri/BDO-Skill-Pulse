import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool, prisma } from '../db.js'
import { getUserCredentials } from './auth.js'

const router = Router()

router.get('/api/password-reset/check/:email', async (req, res) => {
  const { email } = req.params
  try {
    const now = new Date()
    let record = await prisma.passwordReset.findUnique({ where: { userEmail: email } })

    if (!record) {
      record = await prisma.passwordReset.create({
        data: { userEmail: email, resetCount: 0, monthlyCount: 0, monthlyResetDate: now }
      })
    }

    let monthlyCount = record.monthlyCount
    if (record.monthlyResetDate) {
      const d = new Date(record.monthlyResetDate)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
        monthlyCount = 0
        await prisma.passwordReset.update({ where: { userEmail: email }, data: { monthlyCount: 0, monthlyResetDate: now } })
      }
    }

    res.json({
      canReset: monthlyCount < 3,
      remainingResets: 3 - monthlyCount,
      monthlyCount,
      nextResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    })
  } catch {
    res.status(500).json({ error: 'Failed to check reset eligibility' })
  }
})

router.post('/api/password-reset/reset', async (req, res) => {
  const { email, newPassword } = req.body
  const exists = await pool.query('SELECT email FROM "User" WHERE email=$1', [email])
  if (!exists.rows.length) return res.status(404).json({ error: 'User not found' })

  try {
    const now = new Date()
    let record = await prisma.passwordReset.findUnique({ where: { userEmail: email } })
    let monthlyCount = 0
    if (record?.monthlyResetDate) {
      const d = new Date(record.monthlyResetDate)
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        monthlyCount = record.monthlyCount
      }
    }
    if (monthlyCount >= 3) return res.status(400).json({ error: 'Monthly reset limit exceeded' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query(`UPDATE "User" SET password=$1, "lastPasswordChange"=$2 WHERE email=$3`, [hashed, now, email])

    await prisma.passwordReset.upsert({
      where: { userEmail: email },
      update: { resetCount: { increment: 1 }, monthlyCount: { increment: 1 }, lastReset: now, monthlyResetDate: now },
      create: { userEmail: email, resetCount: 1, monthlyCount: 1, lastReset: now, monthlyResetDate: now }
    })

    const creds = getUserCredentials()
    if (creds[email]) creds[email].password = hashed

    res.json({ message: 'Password reset successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

router.post('/api/password-reset/contact-admin', async (req, res) => {
  const { userEmail, reason } = req.body
  try {
    const request = await prisma.adminResetRequest.create({
      data: { userEmail, reason: reason || 'Monthly password reset limit exceeded', status: 'pending' }
    })
    res.json({ message: 'Admin contact request submitted successfully', requestId: request.id })
  } catch {
    res.status(500).json({ error: 'Failed to submit request' })
  }
})

export default router
