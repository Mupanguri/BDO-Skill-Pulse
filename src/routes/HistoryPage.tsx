import { useState, useEffect } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { BarChart3, TrendingUp, Target, Clock, Award, AlertTriangle } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'

interface QuizResult {
  id: string
  sessionId: string
  sessionName: string
  score: number
  timeSpent: number
  completedAt: string
  totalQuestions: number
}

interface PerformanceStats {
  totalQuizzes: number
  averageScore: number
  averageTime: number
  bestScore: number
  improvement: number
  consistency: number
}

function HistoryPage() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserHistory()
      fetchUserWarnings()
    }
  }, [user])

  const fetchUserHistory = async () => {
    if (!user) return

    try {
      // Fetch user's submissions from API
      const submissionsResponse = await fetch(`http://localhost:3001/api/user/${user.email}/submissions`)
      const sessionsResponse = await fetch('http://localhost:3001/api/sessions')

      if (submissionsResponse.ok && sessionsResponse.ok) {
        const submissions = await submissionsResponse.json()
        const sessions = await sessionsResponse.json()

        // Map submissions to include session names and question counts
        const userResults: QuizResult[] = submissions.map((submission: any) => {
          const session = sessions.find((s: any) => s.id === submission.sessionId)
          return {
            id: submission.id,
            sessionId: submission.sessionId,
            sessionName: session ? session.name : 'Unknown Session',
            score: submission.score,
            timeSpent: submission.timeSpent,
            completedAt: submission.completedAt,
            totalQuestions: session ? session.questions.length : 0
          }
        })

        setResults(userResults)
        calculateStats(userResults)
      } else {
        console.error('Failed to fetch user history')
        setResults([])
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (quizResults: QuizResult[]) => {
    if (quizResults.length === 0) return

    const totalScore = quizResults.reduce((sum, result) => sum + result.score, 0)
    const averageScore = totalScore / quizResults.length
    const averageTime = quizResults.reduce((sum, result) => sum + result.timeSpent, 0) / quizResults.length
    const bestScore = Math.max(...quizResults.map(r => r.score))

    // Calculate improvement (comparing first half vs second half)
    const midPoint = Math.floor(quizResults.length / 2)
    const firstHalf = quizResults.slice(0, midPoint)
    const secondHalf = quizResults.slice(midPoint)

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length
      : 0
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length
      : 0

    const improvement = secondHalfAvg - firstHalfAvg

    // Calculate consistency (lower variance = higher consistency)
    const variance = quizResults.reduce((sum, result) => {
      return sum + Math.pow(result.score - averageScore, 2)
    }, 0) / quizResults.length
    const consistency = Math.max(0, 100 - Math.sqrt(variance))

    setStats({
      totalQuizzes: quizResults.length,
      averageScore: Math.round(averageScore),
      averageTime: Math.round(averageTime),
      bestScore,
      improvement: Math.round(improvement),
      consistency: Math.round(consistency)
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Average'
    return 'Needs Improvement'
  }

  const getWarningThreshold = (score: number) => {
    return score < 60
  }

  const fetchUserWarnings = async () => {
    if (!user) return

    try {
      const response = await fetch(`http://localhost:3001/api/user/${user.email}/warnings`)
      if (response.ok) {
        const data = await response.json()
        setWarnings(data.warnings)
      }
    } catch (error) {
      console.error('Failed to fetch warnings:', error)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading your quiz history..." />
  }

  // Prepare chart data for trend visualization
  const trendChartData = {
    labels: results.map(r => new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Score %',
      data: results.map(r => r.score),
      borderColor: '#0066CC',
      backgroundColor: 'rgba(0, 102, 204, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Score: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Score (%)' }
      },
      x: {
        title: { display: true, text: 'Quiz Date' }
      }
    }
  }

  return (
    <div className="ui-page page-enter">
      {/* Header */}
      <div className="ui-page-header mb-6">
        <div>
          <h1 className="ui-page-title">Quiz History</h1>
          <p className="ui-page-subtitle">Track your performance and improvement over time</p>
        </div>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-red-900 mb-2">Performance Warning</h3>
              <p className="text-red-800 mb-4">
                Your performance has been flagged. Please review your quiz results and focus on improvement.
              </p>
              <div className="space-y-2">
                {warnings.map((warning: any) => (
                  <div key={warning.id} className="bg-red-100 rounded-lg p-3">
                    <p className="text-sm text-red-800">{warning.reason}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Issued on {new Date(warning.timestamp).toLocaleDateString()} by {warning.adminEmail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-full w-full" />}
          title="No Quiz History"
          description="You haven't taken any quizzes yet. Complete your first quiz to start tracking your performance!"
        />
      ) : (
        <>
          {/* Performance Trend Chart */}
          <div className="ui-card-strong mb-8">
            <h2 className="text-xl font-bold text-bdo-navy mb-4">Performance Trend</h2>
            <div className="h-64 sm:h-80">
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </div>

          {/* Performance Overview Stats */}
          {stats && (
            <div className="ui-grid-stats mb-8">
              <div className="ui-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Quizzes</p>
                    <p className="text-3xl font-bold text-bdo-navy">{stats.totalQuizzes}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
                      {stats.averageScore}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getPerformanceLevel(stats.averageScore)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Best Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(stats.bestScore)}`}>
                      {stats.bestScore}%
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Award className="h-6 w-6 text-purple-600" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg. Time</p>
                    <p className="text-3xl font-bold text-bdo-navy">
                      {Math.floor(stats.averageTime / 60)}:{(stats.averageTime % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Insights */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="ui-card-strong">
                <h3 className="text-lg font-bold text-bdo-navy mb-4">Performance Insights</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Improvement Trend</span>
                    <span className={`text-sm font-semibold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Consistency Score</span>
                    <span className="text-sm font-semibold text-bdo-blue">{stats.consistency}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Performance Level</span>
                    <span className={`text-sm font-semibold ${getScoreColor(stats.averageScore)}`}>
                      {getPerformanceLevel(stats.averageScore)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ui-card-strong">
                <h3 className="text-lg font-bold text-bdo-navy mb-4">Next Goals</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-bdo-navy">Score Target</p>
                      <p className="text-xs text-gray-600">
                        Aim for {Math.max(80, stats.averageScore + 5)}% on your next quiz
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-bdo-navy">Time Efficiency</p>
                      <p className="text-xs text-gray-600">
                        Try to complete quizzes in under {Math.floor(stats.averageTime / 60) + 1} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quiz History Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Quizzes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quiz Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result, index) => (
                    <tr key={result.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{result.sessionName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{result.totalQuestions} questions</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${getScoreColor(result.score)}`}>
                          {result.score}%
                        </div>
                        {getWarningThreshold(result.score) && (
                          <div className="flex items-center text-xs text-red-600 dark:text-red-400 mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Below threshold
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.score >= 80
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : result.score >= 60
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          {getPerformanceLevel(result.score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HistoryPage
