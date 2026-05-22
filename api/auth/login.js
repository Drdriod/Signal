import bcrypt        from 'bcryptjs'
import { supabase }  from '../_lib/supabase.js'
import { makeToken } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data: user } = await supabase
    .from('users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle()

  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  // Update last_seen
  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

  const { password_hash, ...safeUser } = user
  res.json({ token: makeToken(user), user: safeUser })
}
