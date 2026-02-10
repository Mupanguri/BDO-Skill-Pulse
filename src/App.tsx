import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/contexts/AuthContext'
import ProtectedRoute from './lib/components/ProtectedRoute'
import Layout from './routes/Layout'
import HomePage from './routes/HomePage'
import LoginPage from './routes/LoginPage'
import QuizPage from './routes/QuizPage'
import DashboardPage from './routes/DashboardPage'
import AdminPage from './routes/AdminPage'
import CreateSessionPage from './routes/CreateSessionPage'
import ResultsPage from './routes/ResultsPage'
import SessionPage from './routes/SessionPage'
import HistoryPage from './routes/HistoryPage'
import ParticipantsPage from './routes/ParticipantsPage'
import RegisterPage from './routes/RegisterPage'
import PasswordResetPage from './routes/PasswordResetPage'
import AuditLogsPage from './routes/AuditLogsPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth pages without Layout */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="password-reset" element={<PasswordResetPage />} />

        {/* All other pages with Layout */}
        <Route path="/" element={<Layout />}>
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
              <SessionPage />
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
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
