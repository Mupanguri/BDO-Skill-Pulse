import { Routes, Route, Navigate } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { AuthProvider, useAuth } from './lib/contexts/AuthContext'
import { HeartbeatProvider } from './lib/contexts/HeartbeatContext'
import ProtectedRoute from './lib/components/ProtectedRoute'
import NotificationBell from './lib/components/NotificationBell'
import Layout from './routes/Layout'
import HomePage from './routes/HomePage'
import LoginPage from './routes/LoginPage'
import DashboardPage from './routes/DashboardPage'
import AdminPage from './routes/AdminPage'
import PortalSelectPage from './routes/PortalSelectPage'
import CreateSessionPage from './routes/CreateSessionPage'
import ResultsPage from './routes/ResultsPage'
import QuizPage from './routes/QuizPage'
import HistoryPage from './routes/HistoryPage'
import ParticipantsPage from './routes/ParticipantsPage'
import RegisterPage from './routes/RegisterPage'
import PasswordResetPage from './routes/PasswordResetPage'
import AuditLogsPage from './routes/AuditLogsPage'
import UserManagementPage from './routes/UserManagementPage'
import ProfilePage from './routes/ProfilePage'
import AnalyticsPage from './routes/AnalyticsPage'

function ThemedRoutes() {
  const { isDarkMode, user } = useAuth()

  return (
    <Theme
      accentColor="red"
      grayColor="slate"
      radius="medium"
      scaling="100%"
      appearance={isDarkMode ? 'dark' : 'light'}
    >
      {/* Fixed top-right notification bell — shown to all logged-in users */}
      {user && <NotificationBell />}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="password-reset" element={<PasswordResetPage />} />

        <Route path="app" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="portal-select" element={<ProtectedRoute><PortalSelectPage /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="quiz/:sessionId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="admin" element={<ProtectedRoute requireAdmin={true}><AdminPage /></ProtectedRoute>} />
          <Route path="admin/create" element={<ProtectedRoute requireAdmin={true}><CreateSessionPage /></ProtectedRoute>} />
          <Route path="admin/results" element={<ProtectedRoute requireAdmin={true}><ResultsPage /></ProtectedRoute>} />
          <Route path="results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="admin/participants" element={<ProtectedRoute requireAdmin={true}><ParticipantsPage /></ProtectedRoute>} />
          <Route path="admin/audit-logs" element={<ProtectedRoute requireAdmin={true}><AuditLogsPage /></ProtectedRoute>} />
          <Route path="admin/analytics" element={<ProtectedRoute requireAdmin={true}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagementPage /></ProtectedRoute>} />
          <Route path="superadmin" element={<ProtectedRoute requireSuperAdmin={true}><UserManagementPage superAdminMode={true} /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>

        <Route path="results/:sessionId" element={<Navigate to="/app/admin/results?session=:sessionId" replace />} />
        <Route path="admin/results/:sessionId" element={<Navigate to="/app/admin/results?session=:sessionId" replace />} />
        <Route path="quiz/:sessionId" element={<Navigate to="/app/quiz/:sessionId" replace />} />
      </Routes>
    </Theme>
  )
}

function App() {
  return (
    <HeartbeatProvider>
      <AuthProvider>
        <ThemedRoutes />
      </AuthProvider>
    </HeartbeatProvider>
  )
}

export default App
