import bcrypt        from 'bcryptjs'
import { supabase }  from '../_lib/supabase.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, newPassword } = req.body
  if (!token || !newPassword)   return res.status(400).json({ error: 'Token and new password required' })
  if (newPassword.length < 8)   return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const { data: record } = await supabase.from('password_reset_tokens')
    .select('*').eq('token', token).eq('used', false).maybeSingle()

  if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' })
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Reset token has expired' })

  const hash = await bcrypt.hash(newPassword, 12)
  await supabase.from('users').update({ password_hash: hash }).eq('id', record.user_id)
  await supabase.from('password_reset_tokens').update({ used: true }).eq('id', record.id)

  res.json({ message: 'Password reset successfully. You can now log in.' })
}
