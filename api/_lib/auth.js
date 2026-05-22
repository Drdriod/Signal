import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export const verifyToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header?.startsWith('Bearer ')) throw new Error('NO_TOKEN')
  try {
    return jwt.verify(header.split(' ')[1], JWT_SECRET)
  } catch {
    throw new Error('INVALID_TOKEN')
  }
}

export const requireAuth = (handler) => async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    req.user = verifyToken(req)
    return handler(req, res)
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export const requireAdmin = (handler) => async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    req.user = verifyToken(req)
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    return handler(req, res)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export const makeToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
