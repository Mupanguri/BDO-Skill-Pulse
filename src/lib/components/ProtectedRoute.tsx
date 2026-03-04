import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
}

function ProtectedRoute({ children, requireAuth = true, requireAdmin = false }: ProtectedRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (requireAuth && !user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && (!user || !user.isAdmin)) {
    // Redirect to dashboard if user is logged in but not admin
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
