import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TutorialAssistant from './TutorialAssistant'
import { tutorials } from '../tutorials'

export default function TutorialManager() {
  const { pathname } = useLocation()
  const { user, portalMode } = useAuth()

  if (!user) return null

  const isAdminPortal = portalMode === 'admin' && (user.isAdmin || user.isHR)
  const isSuperAdmin = portalMode === 'superadmin' && user.isSuperAdmin

  // Match pathname to a tutorial key + steps
  let pageKey: string | null = null

  if (pathname === '/app/portal-select') {
    pageKey = 'portal_select'
  } else if (pathname === '/app/dashboard') {
    pageKey = 'dashboard_user'
  } else if (pathname === '/app/history') {
    pageKey = 'history'
  } else if (pathname.startsWith('/app/quiz/')) {
    pageKey = 'quiz'
  } else if (pathname === '/app/results') {
    pageKey = 'results_user'
  } else if (pathname === '/app/profile') {
    pageKey = 'profile'
  } else if (pathname === '/app/admin' && isAdminPortal) {
    pageKey = user.isHR ? 'hr_dashboard' : 'admin_dashboard'
  } else if (pathname === '/app/admin/participants') {
    pageKey = 'participants'
  } else if (pathname === '/app/admin/results') {
    pageKey = isAdminPortal ? 'results_admin' : 'results_user'
  } else if (pathname === '/app/admin/analytics') {
    pageKey = 'analytics'
  } else if (pathname === '/app/admin/audit-logs') {
    pageKey = 'audit_logs'
  } else if (pathname === '/app/admin/create') {
    pageKey = 'create_session'
  } else if (pathname === '/app/admin/users' || pathname === '/app/superadmin') {
    pageKey = 'user_management'
  }

  if (!pageKey || !tutorials[pageKey]) return null

  return (
    <TutorialAssistant
      key={pageKey}
      pageKey={pageKey}
      steps={tutorials[pageKey]}
    />
  )
}
