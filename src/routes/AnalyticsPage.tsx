import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, Users, AlertTriangle, CheckCircle,
  Lightbulb, RefreshCw, Filter
} from 'lucide-react'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
)

interface KPIValue { value: number; delta: number; trend: 'up' | 'down' | 'flat' }
interface DeptStat {
  department: string; userCount: number; averageScore: number
  passRate: number; lowScoreCount: number; totalAttempts: number
}
interface TimePoint { date: string; responses: number; averageScore: number }
interface RecentEntry {
  id: string; email: string; department: string
  score: number; sessionId: string; completedAt: string
}
interface AnalyticsData {
  kpi: {
    averageScore: KPIValue; passRate: KPIValue; riskIndex: KPIValue
    improvementRate: KPIValue; totalParticipants: KPIValue
  }
  deptStats: DeptStat[]
  timeSeries: TimePoint[]
  scoreDistribution: Record<string, number>
  insights: string[]
  recentActivity: RecentEntry[]
  meta: {
    totalSessions: number; departments: string[]
    sessions: Array<{ id: string; name: string }>
    timeRange: string; filterDept: string | null; filterSession: string | null
  }
}

const CHART_COLORS = {
  red: '#cc2200', blue: '#0052a5', green: '#16a34a', amber: '#d97706',
  purple: '#7c3aed', teal: '#0891b2', gray: '#6b7280'
}

function TrendBadge({ kpi, reverse = false }: { kpi: KPIValue; reverse?: boolean }) {
  const isGood = reverse ? kpi.trend === 'down' : kpi.trend === 'up'
  const isBad = reverse ? kpi.trend === 'up' : kpi.trend === 'down'
  if (kpi.trend === 'flat') return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <Minus className="h-3 w-3" /> {kpi.delta === 0 ? 'No change' : `${Math.abs(kpi.delta)}%`}
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isGood ? 'text-green-600 dark:text-green-400' : isBad ? 'text-red-500' : 'text-gray-500'}`}>
      {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(kpi.delta)}% vs prior period
    </span>
  )
}

function GradeBadge({ score }: { score: number }) {
  if (score >= 70) return <span className="ui-pill bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Distinction</span>
  if (score >= 60) return <span className="ui-pill bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Merit</span>
  if (score >= 45) return <span className="ui-pill bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pass</span>
  if (score >= 30) return <span className="ui-pill bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Warning</span>
  return <span className="ui-pill bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Fail</span>
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100)
  const color = score >= 70 ? CHART_COLORS.green : score >= 45 ? CHART_COLORS.amber : CHART_COLORS.red
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--ui-border)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color: 'var(--ui-text)' }}>{score}%</span>
    </div>
  )
}

function KPICard({ title, kpi, suffix = '%', reverse = false, icon: Icon }: {
  title: string; kpi: KPIValue; suffix?: string; reverse?: boolean; icon: React.ElementType
}) {
  return (
    <div className="ui-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--ui-text-muted)' }}>{title}</p>
        <Icon className="h-5 w-5 opacity-40" style={{ color: 'var(--ui-text)' }} />
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--ui-text)' }}>
        {kpi.value}{suffix}
      </p>
      <TrendBadge kpi={kpi} reverse={reverse} />
    </div>
  )
}

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('30d')
  const [filterDept, setFilterDept] = useState('')
  const [filterSession, setFilterSession] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ timeRange })
      if (filterDept) params.set('department', filterDept)
      if (filterSession) params.set('sessionId', filterSession)
      const res = await fetch(`/api/analytics?${params}`, { credentials: 'include' })
      if (res.ok) {
        setData(await res.json())
      } else {
        const e = await res.json().catch(() => ({}))
        setError(e.error || 'Failed to load analytics')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [timeRange, filterDept, filterSession])

  useEffect(() => {
    if (!user?.isAdmin && !user?.isHR) { navigate('/app/dashboard'); return }
    fetchAnalytics()
  }, [user, navigate, fetchAnalytics])

  if (!user?.isAdmin && !user?.isHR) return null

  const isDark = document.documentElement.classList.contains('dark')
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const tickColor = isDark ? '#94a3b8' : '#6b7280'
  const legendColor = isDark ? '#e2e8f0' : '#1e293b'

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: legendColor, font: { size: 12 } } },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor }, beginAtZero: true, max: 100 }
    }
  }

  return (
    <div className="ui-page page-enter space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/app/admin' }, { label: 'Analytics' }]} />

      {/* Header + Filters */}
      <div className="ui-card p-5">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ui-text)' }}>Analytics Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>Enterprise performance intelligence</p>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="ui-label mb-1 flex items-center gap-1"><Filter className="h-3 w-3" />Time Range</label>
              <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="ui-field text-sm">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            {data?.meta?.departments?.length ? (
              <div>
                <label className="ui-label mb-1">Department</label>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="ui-field text-sm">
                  <option value="">All Departments</option>
                  {data.meta.departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : null}
            {data?.meta?.sessions?.length ? (
              <div>
                <label className="ui-label mb-1">Session</label>
                <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className="ui-field text-sm">
                  <option value="">All Sessions</option>
                  {data.meta.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : null}
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--ui-surface-muted)', color: 'var(--ui-text)' }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner text="Computing analytics…" />}

      {!loading && error && (
        <div className="ui-card p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="font-semibold" style={{ color: 'var(--ui-text)' }}>{error}</p>
          <button onClick={fetchAnalytics} className="mt-4 px-4 py-2 rounded-lg text-sm text-white" style={{ background: CHART_COLORS.red }}>Try Again</button>
        </div>
      )}

      {!loading && !error && data && !data.kpi && (
        <div className="ui-card p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold" style={{ color: 'var(--ui-text)' }}>Analytics server returned an outdated response.</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ui-text-muted)' }}>Please restart the backend server and try again.</p>
          <button onClick={fetchAnalytics} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: CHART_COLORS.red }}>Retry</button>
        </div>
      )}

      {!loading && !error && data && data.kpi && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard title="Average Score" kpi={data.kpi.averageScore} icon={TrendingUp} />
            <KPICard title="Pass Rate" kpi={data.kpi.passRate} icon={CheckCircle} />
            <KPICard title="Risk Index" kpi={data.kpi.riskIndex} icon={AlertTriangle} reverse />
            <KPICard title="Improvement Rate" kpi={data.kpi.improvementRate} icon={TrendingUp} />
            <KPICard title="Total Participants" kpi={data.kpi.totalParticipants} suffix="" icon={Users} />
          </div>

          {/* Insights Panel */}
          {data.insights.length > 0 && (
            <div className="ui-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-text)' }}>Auto Insights</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--ui-surface-muted)', border: '1px solid var(--ui-border)' }}>
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ui-text)' }}>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row 1: Line + Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Over Time */}
            <div className="ui-card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ui-text)' }}>Performance Trend</h3>
              <div style={{ height: 260 }}>
                <Line
                  data={{
                    labels: data.timeSeries.map(d => d.date.slice(5)),
                    datasets: [
                      {
                        label: 'Avg Score (%)',
                        data: data.timeSeries.map(d => d.averageScore),
                        borderColor: CHART_COLORS.red,
                        backgroundColor: 'rgba(204,34,0,0.10)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Submissions',
                        data: data.timeSeries.map(d => d.responses),
                        borderColor: CHART_COLORS.blue,
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: 'y2'
                      }
                    ]
                  }}
                  options={{
                    ...chartDefaults,
                    scales: {
                      x: chartDefaults.scales.x,
                      y: { ...chartDefaults.scales.y, position: 'left' as const, title: { display: true, text: 'Score %', color: tickColor } },
                      y2: { grid: { color: 'transparent' }, ticks: { color: tickColor }, beginAtZero: true, position: 'right' as const, title: { display: true, text: 'Count', color: tickColor } }
                    }
                  }}
                />
              </div>
            </div>

            {/* Score Distribution */}
            <div className="ui-card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ui-text)' }}>Score Distribution</h3>
              <div style={{ height: 260 }}>
                <Bar
                  data={{
                    labels: Object.keys(data.scoreDistribution),
                    datasets: [{
                      label: 'Participants',
                      data: Object.values(data.scoreDistribution),
                      backgroundColor: [
                        'rgba(220,38,38,0.75)', 'rgba(234,88,12,0.75)', 'rgba(234,179,8,0.75)',
                        'rgba(22,163,74,0.75)', 'rgba(21,128,61,0.9)'
                      ],
                      borderRadius: 6
                    }]
                  }}
                  options={{
                    ...chartDefaults,
                    scales: {
                      x: chartDefaults.scales.x,
                      y: { ...chartDefaults.scales.y, max: undefined, title: { display: true, text: 'Count', color: tickColor } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Charts Row 2: Radar + Doughnut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar: Department performance vs firm avg */}
            <div className="ui-card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ui-text)' }}>Department Radar</h3>
              <div style={{ height: 280 }}>
                {data.deptStats.length >= 3 ? (
                  <Radar
                    data={{
                      labels: data.deptStats.map(d => d.department),
                      datasets: [
                        {
                          label: 'Avg Score',
                          data: data.deptStats.map(d => d.averageScore),
                          backgroundColor: 'rgba(204,34,0,0.15)',
                          borderColor: CHART_COLORS.red,
                          pointBackgroundColor: CHART_COLORS.red,
                          pointRadius: 4
                        },
                        {
                          label: 'Pass Rate',
                          data: data.deptStats.map(d => d.passRate),
                          backgroundColor: 'rgba(0,82,165,0.12)',
                          borderColor: CHART_COLORS.blue,
                          pointBackgroundColor: CHART_COLORS.blue,
                          pointRadius: 4
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          min: 0, max: 100,
                          grid: { color: gridColor },
                          ticks: { color: tickColor, stepSize: 20, backdropColor: 'transparent' },
                          pointLabels: { color: legendColor, font: { size: 11 } }
                        }
                      },
                      plugins: {
                        legend: { labels: { color: legendColor, font: { size: 12 } } }
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Need ≥3 departments for radar chart</p>
                  </div>
                )}
              </div>
            </div>

            {/* Doughnut: Pass vs Fail */}
            <div className="ui-card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ui-text)' }}>Pass vs At-Risk</h3>
              <div className="flex items-center gap-6 h-[280px]">
                <div className="flex-1" style={{ height: 240 }}>
                  <Doughnut
                    data={{
                      labels: ['Passed (≥45%)', 'At Risk (<45%)'],
                      datasets: [{
                        data: [
                          Math.round(data.kpi.passRate.value),
                          Math.round(data.kpi.riskIndex.value)
                        ],
                        backgroundColor: [CHART_COLORS.green, CHART_COLORS.red],
                        borderWidth: 0,
                        hoverOffset: 6
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '68%',
                      plugins: {
                        legend: { position: 'bottom', labels: { color: legendColor, padding: 16 } }
                      }
                    }}
                  />
                </div>
                <div className="space-y-3 flex-shrink-0">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Pass Rate</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.kpi.passRate.value}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>At Risk</p>
                    <p className="text-2xl font-bold text-red-500">{data.kpi.riskIndex.value}%</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Improvement</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--ui-text)' }}>{data.kpi.improvementRate.value}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="ui-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--ui-text)' }}>Department Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ borderColor: 'var(--ui-border)' }}>
                <thead style={{ background: 'var(--ui-surface-muted)' }}>
                  <tr>
                    {['Department', 'Users', 'Avg Score', 'Pass Rate', 'At Risk', 'Grade'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--ui-border)' }}>
                  {data.deptStats.map((dept) => (
                    <tr key={dept.department} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-4 font-medium" style={{ color: 'var(--ui-text)' }}>{dept.department}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--ui-text-muted)' }}>{dept.userCount}</td>
                      <td className="px-5 py-4 w-40">
                        <ScoreBar score={dept.averageScore} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>{dept.passRate}%</td>
                      <td className="px-5 py-4">
                        {dept.lowScoreCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-500">
                            <AlertTriangle className="h-3.5 w-3.5" />{dept.lowScoreCount}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle className="h-3.5 w-3.5 inline mr-1" />0
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4"><GradeBadge score={dept.averageScore} /></td>
                    </tr>
                  ))}
                  {data.deptStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ui-text-muted)' }}>No department data for this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          {data.recentActivity.length > 0 && (
            <div className="ui-card p-5">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--ui-text)' }}>Recent Submissions</h3>
              <div className="space-y-2">
                {data.recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ui-surface-muted)', border: '1px solid var(--ui-border)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ui-border)' }}>
                        <Users className="h-4 w-4" style={{ color: 'var(--ui-text-muted)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ui-text)' }}>{entry.email}</p>
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                          {entry.department} &bull; {new Date(entry.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <ScoreBar score={entry.score} />
                      <GradeBadge score={entry.score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}

export default AnalyticsPage
