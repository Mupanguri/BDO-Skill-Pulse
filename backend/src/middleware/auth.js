import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Access token required' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(403).json({ error: 'Invalid token' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' })
  next()
}

export const requireHR = (req, res, next) => {
  if (!req.user?.isHR) return res.status(403).json({ error: 'HR access required' })
  next()
}

export const requireAdminOrHR = (req, res, next) => {
  if (!req.user?.isAdmin && !req.user?.isHR) return res.status(403).json({ error: 'Admin or HR access required' })
  next()
}

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) return res.status(403).json({ error: 'Super admin access required' })
  next()
}
