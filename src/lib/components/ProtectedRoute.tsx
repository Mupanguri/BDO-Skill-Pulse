import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
}

function ProtectedRoute({ children, requireAuth = true, requireAdmin = false, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, portalMode } = useAuth()
  const location = useLocation()

  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Privileged users must select a portal before accessing any route except portal-select itself
  if (user && (user.isAdmin || user.isHR || user.isSuperAdmin) && portalMode === null && !location.pathname.includes('/portal-select')) {
    return <Navigate to="/app/portal-select" replace />
  }

  // Super admin routes: require isSuperAdmin
  if (requireSuperAdmin && !user?.isSuperAdmin) {
    return <Navigate to="/app/portal-select" replace />
  }

  // Admin routes: require admin privilege
  if (requireAdmin && (!user || (!user.isAdmin && !user.isHR))) {
    return <Navigate to="/app/dashboard" replace />
  }

  // Admin routes: blocked when the user chose the User portal
  if (requireAdmin && portalMode === 'user') {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
