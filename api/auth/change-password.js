import bcrypt        from 'bcryptjs'
import { supabase }  from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { currentPassword, newPassword } = req.body
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' })

  const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single()
  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

  await supabase.from('users').update({ password_hash: await bcrypt.hash(newPassword, 12) }).eq('id', req.user.id)
  res.json({ message: 'Password updated successfully' })
})
