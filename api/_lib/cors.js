// Tiny CORS helper for Vercel serverless functions
export const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('X-Content-Type-Options',       'nosniff')
  res.setHeader('X-Frame-Options',              'DENY')
}

export const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(200).end(); return true }
  return false
}
