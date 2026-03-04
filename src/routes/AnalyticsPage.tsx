import { useState, useEffect } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, AlertTriangle, CheckCircle, Clock, FileText, LogOut } from 'lucide-react'
import Button from '../lib/components/Button'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'

interface AnalyticsData {
  totalUsers: number
  totalSessions: number
  totalResponses: number
  averageScore: number
  completionRate: number
  lowScoreCount: number
  departmentStats: DepartmentStats[]
  timeSeriesData: TimeSeriesData[]
  questionStats: QuestionStats[]
  recentActivity: RecentActivity[]
}

interface DepartmentStats {
  department: string
  userCount: number
  averageScore: number
  completionRate: number
  lowScoreCount: number
}

interface TimeSeriesData {
  date: string
  responses: number
  averageScore: number
  newUsers: number
}

interface QuestionStats {
  question: string
  correctRate: number
  averageTime: number
  totalAttempts: number
}

interface RecentActivity {
  id: string
  action: string
  user: string
  timestamp: string
  details: string
}

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('7d')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard')
      return
    }
    fetchAnalytics()
  }, [user, navigate, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      console.log('Fetching analytics with token:', token ? 'present' : 'missing')
      const response = await fetch(`http://localhost:3001/api/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('Analytics response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Analytics error:', errorData)
        setError(errorData.error || 'Failed to load analytics data')
      }
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user?.isAdmin) {
    return null
  }

  if (loading) {
    return <LoadingSpinner text="Loading analytics dashboard..." />
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load analytics"
        description={error}
        action={{
          label: 'Try Again',
          onClick: fetchAnalytics
        }}
      />
    )
  }

  if (!analytics) {
    return <EmptyState title="No analytics data available" description="Start creating quizzes to see analytics." />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-bdo-navy">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bdo-red focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-bdo-navy">{analytics.totalUsers}</p>
            </div>
            <Users className="h-12 w-12 text-bdo-red opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-bdo-navy">{analytics.totalSessions}</p>
            </div>
            <FileText className="h-12 w-12 text-bdo-red opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-bdo-navy">{analytics.totalResponses}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-bdo-red opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Score</p>
              <p className="text-2xl font-bold text-bdo-navy">{analytics.averageScore}%</p>
            </div>
            <TrendingUp className="h-12 w-12 text-bdo-red opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-bdo-navy mb-4">Performance Trends</h3>
          <div className="space-y-4">
            {analytics.timeSeriesData.slice(0, 7).map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-16">{data.date}</span>
                <div className="flex-1 mx-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getScoreColor(data.averageScore)}`}
                        style={{ width: `${Math.min(data.averageScore, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{data.averageScore}%</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{data.responses} responses</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-bdo-navy mb-4">Department Performance</h3>
          <div className="space-y-4">
            {analytics.departmentStats.map((dept, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{dept.department}</span>
                  <span className="text-sm text-gray-600">{dept.userCount} users</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${getScoreColor(dept.averageScore)}`}
                      style={{ width: `${Math.min(dept.averageScore, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-16">{dept.averageScore}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getCompletionColor(dept.completionRate)}`}
                      style={{ width: `${Math.min(dept.completionRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-16">{dept.completionRate}% completion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Difficulty Analysis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-bdo-navy mb-4">Question Performance</h3>
          <div className="space-y-3">
            {analytics.questionStats.slice(0, 5).map((question, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <span className="text-xs text-gray-600">{question.totalAttempts} attempts</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreColor(question.correctRate)}`}
                      style={{ width: `${Math.min(question.correctRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{question.correctRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-bdo-navy mb-4">Completion Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completed</span>
              <span className="text-sm text-gray-600">{analytics.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="h-4 bg-green-500 rounded-full"
                style={{ width: `${Math.min(analytics.completionRate, 100)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Pending</span>
              <span className="text-sm text-gray-600">{100 - analytics.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="h-4 bg-red-500 rounded-full"
                style={{ width: `${Math.max(0, 100 - analytics.completionRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-bdo-navy mb-4">Risk Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-700">Low Scores</p>
                  <p className="text-sm text-red-600">{analytics.lowScoreCount} users need attention</p>
                </div>
              </div>
              <Button variant="secondary" size="sm">
                View Details
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-700">Time Analysis</p>
                  <p className="text-sm text-yellow-600">Average completion time: 12min</p>
                </div>
              </div>
              <Button variant="secondary" size="sm">
                Optimize
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-bdo-navy mb-4">Department Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Users</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Avg Score</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Completion Rate</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Low Scores</th>
              </tr>
            </thead>
            <tbody>
              {analytics.departmentStats.map((dept, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{dept.department}</td>
                  <td className="py-3 px-4">{dept.userCount}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-sm ${
                      dept.averageScore >= 80 ? 'bg-green-100 text-green-700' :
                      dept.averageScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {dept.averageScore}%
                    </span>
                  </td>
                  <td className="py-3 px-4">{dept.completionRate}%</td>
                  <td className="py-3 px-4 text-red-600 font-medium">{dept.lowScoreCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-bdo-navy mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {analytics.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-bdo-red rounded-full"></div>
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.user} • {activity.timestamp}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{activity.details}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage