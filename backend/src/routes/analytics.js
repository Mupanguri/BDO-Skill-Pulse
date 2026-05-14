import { Router } from 'express'
import { authenticateToken, requireAdminOrHR } from '../middleware/auth.js'
import { ONE_DAY_MS } from '../constants.js'
import { fetchSessions, fetchResponses } from './sessions.js'
import { prisma } from '../db.js'

const router = Router()

function computeKPIs(bestResponses, allResponses) {
  const total = bestResponses.length
  const passing = bestResponses.filter(r => r.score >= 45).length
  const failing = bestResponses.filter(r => r.score < 45).length
  const avgScore = total
    ? Math.round((bestResponses.reduce((s, r) => s + r.score, 0) / total) * 10) / 10
    : 0
  const passRate = total ? Math.round((passing / total) * 1000) / 10 : 0
  const riskIndex = total ? Math.round((failing / total) * 1000) / 10 : 0

  // Improvement rate: % of users whose latest score > their first score
  const userScores = {}
  allResponses.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt)).forEach(r => {
    const email = r.user?.email
    if (!email) return
    if (!userScores[email]) userScores[email] = []
    userScores[email].push(r.score)
  })
  const multiQuiz = Object.values(userScores).filter(arr => arr.length >= 2)
  const improved = multiQuiz.filter(arr => arr[arr.length - 1] > arr[0]).length
  const improvementRate = multiQuiz.length ? Math.round((improved / multiQuiz.length) * 1000) / 10 : 0

  return { avgScore, passRate, riskIndex, improvementRate, total, passing, failing }
}

function buildTimeSeries(bestResponses, days) {
  const map = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * ONE_DAY_MS)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key, responses: 0, totalScore: 0, averageScore: 0 }
  }
  bestResponses.forEach(r => {
    const key = new Date(r.completedAt).toISOString().slice(0, 10)
    if (map[key]) {
      map[key].responses++
      map[key].totalScore += r.score
    }
  })
  return Object.values(map).map(d => ({
    date: d.date,
    responses: d.responses,
    averageScore: d.responses ? Math.round((d.totalScore / d.responses) * 10) / 10 : 0
  }))
}

function buildDeptStats(bestResponses) {
  const deptMap = {}
  bestResponses.forEach(r => {
    const dept = r.user?.department || 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { scores: [], users: new Set() }
    deptMap[dept].scores.push(r.score)
    if (r.user?.email) deptMap[dept].users.add(r.user.email)
  })
  return Object.entries(deptMap).map(([department, data]) => {
    const avg = data.scores.length ? Math.round(data.scores.reduce((s, x) => s + x, 0) / data.scores.length) : 0
    const passing = data.scores.filter(s => s >= 45).length
    const passRate = data.scores.length ? Math.round((passing / data.scores.length) * 100) : 0
    const lowScore = data.scores.filter(s => s < 45).length
    return {
      department,
      userCount: data.users.size,
      averageScore: avg,
      passRate,
      lowScoreCount: lowScore,
      totalAttempts: data.scores.length
    }
  }).sort((a, b) => b.averageScore - a.averageScore)
}

function buildScoreDistribution(bestResponses) {
  const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
  bestResponses.forEach(r => {
    if (r.score <= 20) dist['0-20']++
    else if (r.score <= 40) dist['21-40']++
    else if (r.score <= 60) dist['41-60']++
    else if (r.score <= 80) dist['61-80']++
    else dist['81-100']++
  })
  return dist
}

function generateInsights(kpi, deptStats, timeSeries) {
  const insights = []
  if (kpi.avgScore >= 70) insights.push(`Overall performance is strong — average score of ${kpi.avgScore}% across all participants.`)
  else if (kpi.avgScore >= 50) insights.push(`Average score is ${kpi.avgScore}%. There is room for targeted improvement across cohorts.`)
  else insights.push(`Average score of ${kpi.avgScore}% is below the passing threshold. Urgent intervention may be needed.`)

  if (kpi.riskIndex >= 30) insights.push(`${kpi.riskIndex}% of participants scored below 45% — consider remedial sessions.`)
  else if (kpi.riskIndex >= 15) insights.push(`${kpi.riskIndex}% of participants are at risk of failure.`)

  if (kpi.improvementRate >= 60) insights.push(`${kpi.improvementRate}% of repeat participants are showing improvement over time.`)
  else if (kpi.improvementRate > 0 && kpi.improvementRate < 40) insights.push(`Only ${kpi.improvementRate}% of repeat participants are improving — review training material quality.`)

  const topDept = deptStats[0]
  const bottomDept = deptStats[deptStats.length - 1]
  if (topDept && bottomDept && topDept.department !== bottomDept.department) {
    insights.push(`${topDept.department} leads with ${topDept.averageScore}% avg; ${bottomDept.department} trails at ${bottomDept.averageScore}%.`)
  }

  const latestWeek = timeSeries.slice(-7).filter(d => d.responses > 0)
  if (latestWeek.length >= 2) {
    const first = latestWeek[0].averageScore
    const last = latestWeek[latestWeek.length - 1].averageScore
    const diff = Math.round((last - first) * 10) / 10
    if (diff > 5) insights.push(`Recent trend is positive — average score has risen by ${diff} points over the past week.`)
    else if (diff < -5) insights.push(`Recent trend is declining — average score has dropped by ${Math.abs(diff)} points this week.`)
  }

  return insights
}

router.get('/api/analytics', authenticateToken, requireAdminOrHR, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '30d'
    const filterDept = req.query.department || null
    const filterSession = req.query.sessionId || null
    const now = new Date()
    const days = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 }[timeRange] || 30
    const startDate = new Date(now.getTime() - days * ONE_DAY_MS)
    const prevStart = new Date(startDate.getTime() - days * ONE_DAY_MS)

    const [sessions, responses] = await Promise.all([fetchSessions(), fetchResponses()])

    const visibleSessions = req.user.isHR
      ? sessions
      : sessions.filter(s => s.createdBy === req.user.email)

    const currentSessions = visibleSessions.filter(s => {
      const ok = new Date(s.createdAt) >= startDate
      if (filterDept && s.department !== filterDept) return false
      if (filterSession && s.id !== filterSession) return false
      return ok
    })
    const prevSessions = visibleSessions.filter(s =>
      new Date(s.createdAt) >= prevStart && new Date(s.createdAt) < startDate
    )

    const currentIds = new Set(currentSessions.map(s => s.id))
    const prevIds = new Set(prevSessions.map(s => s.id))

    const getFiltered = (ids, all) => all.filter(r => {
      if (!ids.has(r.sessionId)) return false
      if (filterDept && r.user?.department !== filterDept) return false
      return true
    })

    const currentResponses = getFiltered(currentIds, responses)
    const prevResponses = getFiltered(prevIds, responses)

    const bestOf = (arr) => {
      const best = {}
      arr.forEach(r => {
        const key = `${r.user?.email}_${r.sessionId}`
        if (!best[key] || r.score > best[key].score) best[key] = r
      })
      return Object.values(best)
    }

    const bestCurrent = bestOf(currentResponses)
    const bestPrev = bestOf(prevResponses)

    const kpiCur = computeKPIs(bestCurrent, currentResponses)
    const kpiPrev = computeKPIs(bestPrev, prevResponses)

    const delta = (cur, prev) => {
      const d = Math.round((cur - prev) * 10) / 10
      return { delta: d, trend: d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'flat' }
    }

    const kpi = {
      averageScore: { value: kpiCur.avgScore, ...delta(kpiCur.avgScore, kpiPrev.avgScore) },
      passRate: { value: kpiCur.passRate, ...delta(kpiCur.passRate, kpiPrev.passRate) },
      riskIndex: { value: kpiCur.riskIndex, ...delta(kpiCur.riskIndex, kpiPrev.riskIndex) },
      improvementRate: { value: kpiCur.improvementRate, ...delta(kpiCur.improvementRate, kpiPrev.improvementRate) },
      totalParticipants: { value: kpiCur.total, ...delta(kpiCur.total, kpiPrev.total) },
    }

    const deptStats = buildDeptStats(bestCurrent)
    const timeSeries = buildTimeSeries(bestCurrent, Math.min(days, 60))
    const scoreDistribution = buildScoreDistribution(bestCurrent)
    const insights = generateInsights(kpiCur, deptStats, timeSeries)

    // recentActivity — include nested user object for backward compat with ResultsPage
    const recentActivity = [...bestCurrent]
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        email: r.user?.email || 'Unknown',
        department: r.user?.department || 'Unknown',
        user: { email: r.user?.email || 'Unknown', department: r.user?.department || 'Unknown' },
        score: r.score,
        sessionId: r.sessionId,
        completedAt: r.completedAt
      }))

    // responsesByDepartment — backward compat for ResultsPage
    const responsesByDepartment = {}
    deptStats.forEach(d => { responsesByDepartment[d.department] = d.totalAttempts })

    // sessionsByDepartment — backward compat
    const sessionsByDepartment = {}
    currentSessions.forEach(s => {
      const d = s.department || 'Unknown'
      sessionsByDepartment[d] = (sessionsByDepartment[d] || 0) + 1
    })

    const departments = [...new Set(visibleSessions.map(s => s.department).filter(Boolean))].sort()
    const sessionList = visibleSessions.map(s => ({ id: s.id, name: s.name }))

    res.json({
      // New enterprise fields
      kpi,
      deptStats,
      timeSeries,
      scoreDistribution,
      insights,
      recentActivity,
      meta: {
        totalSessions: currentSessions.length,
        departments,
        sessions: sessionList,
        timeRange,
        filterDept,
        filterSession
      },
      // Backward-compat flat fields — ResultsPage still reads these
      totalSessions: currentSessions.length,
      totalResponses: kpiCur.total,
      averageScore: kpiCur.avgScore,
      sessionsByDepartment,
      responsesByDepartment,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    res.status(500).json({ error: 'Failed to get analytics data' })
  }
})

export default router
