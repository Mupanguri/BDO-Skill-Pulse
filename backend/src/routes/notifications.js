import { Router } from 'express'
import { pool, prisma } from '../db.js'

const router = Router()

router.get('/api/user/:email/notifications', async (req, res) => {
  try {
    const notifications = await prisma.userNotification.findMany({
      where: { userEmail: req.params.email },
      orderBy: { timestamp: 'desc' }
    })
    res.json({ notifications })
  } catch {
    res.status(500).json({ error: 'Failed to get notifications' })
  }
})

router.post('/api/user/:email/notifications', async (req, res) => {
  const { email } = req.params
  const { type, title, message, adminEmail, quizName, departmentName } = req.body

  const exists = await pool.query('SELECT email FROM "User" WHERE email=$1', [email])
  if (!exists.rows.length) return res.status(404).json({ error: 'User not found' })

  try {
    const notification = await prisma.userNotification.create({
      data: { userEmail: email, type, title, message, adminEmail: adminEmail || null, quizName: quizName || null, departmentName: departmentName || null }
    })
    res.status(201).json({ message: 'Notification created successfully', notification })
  } catch {
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

router.post('/api/department/:department/notifications', async (req, res) => {
  const { department } = req.params
  const { type, title, message, adminEmail, quizName } = req.body

  try {
    const whereClause = department === 'everyone' ? '"isAdmin"=false' : `department=$1 AND "isAdmin"=false`
    const params = department === 'everyone' ? [] : [department]
    const users = await pool.query(`SELECT email FROM "User" WHERE ${whereClause}`, params)

    const deptName = department === 'everyone' ? 'All Departments' : department
    const data = users.rows.map(u => ({
      userEmail: u.email, type, title, message,
      adminEmail: adminEmail || null, quizName: quizName || null, departmentName: deptName
    }))

    const result = await prisma.userNotification.createMany({ data })
    res.json({ message: `Notifications sent to ${result.count} users`, count: result.count })
  } catch {
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

router.patch('/api/user/:email/notifications/:notificationId/read', async (req, res) => {
  try {
    await prisma.userNotification.update({ where: { id: req.params.notificationId }, data: { read: true } })
    res.json({ message: 'Notification marked as read' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Notification not found' })
    res.status(500).json({ error: 'Failed to update notification' })
  }
})

export default router
