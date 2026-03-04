import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/contexts/AuthContext'
import ProtectedRoute from './lib/components/ProtectedRoute'
import Layout from './routes/Layout'
import HomePage from './routes/HomePage'
import LoginPage from './routes/LoginPage'
import DashboardPage from './routes/DashboardPage'
import AdminPage from './routes/AdminPage'
import CreateSessionPage from './routes/CreateSessionPage'
import ResultsPage from './routes/ResultsPage'
import QuizPage from './routes/QuizPage'
import AnalyticsPage from './routes/AnalyticsPage'
import HistoryPage from './routes/HistoryPage'
import ParticipantsPage from './routes/ParticipantsPage'
import RegisterPage from './routes/RegisterPage'
import PasswordResetPage from './routes/PasswordResetPage'
import AuditLogsPage from './routes/AuditLogsPage'
import UserManagementPage from './routes/UserManagementPage'
import ProfilePage from './routes/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Base route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth pages without Layout */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="password-reset" element={<PasswordResetPage />} />

        {/* All other pages with Layout */}
        <Route path="app" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="history" element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } />
          <Route path="quiz/:sessionId" element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="admin/create" element={
            <ProtectedRoute requireAdmin={true}>
              <CreateSessionPage />
            </ProtectedRoute>
          } />
          <Route path="admin/results" element={
            <ProtectedRoute requireAdmin={true}>
              <ResultsPage />
            </ProtectedRoute>
          } />
          {/* User results page - accessible to regular users for viewing their own results */}
          <Route path="results" element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          } />
          <Route path="admin/participants" element={
            <ProtectedRoute requireAdmin={true}>
              <ParticipantsPage />
            </ProtectedRoute>
          } />
          <Route path="admin/audit-logs" element={
            <ProtectedRoute requireAdmin={true}>
              <AuditLogsPage />
            </ProtectedRoute>
          } />
          <Route path="admin/analytics" element={
            <ProtectedRoute requireAdmin={true}>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="admin/users" element={
            <ProtectedRoute requireAdmin={true}>
              <UserManagementPage />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Remove legacy routes - all routes should be under /app/ */}
        {/* Routing redirects for common incorrect URLs */}
        <Route path="results/:sessionId" element={<Navigate to="/app/admin/results?session=:sessionId" replace />} />
        <Route path="admin/results/:sessionId" element={<Navigate to="/app/admin/results?session=:sessionId" replace />} />
        <Route path="quiz/:sessionId" element={<Navigate to="/app/quiz/:sessionId" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
