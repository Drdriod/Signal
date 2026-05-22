import crypto        from 'crypto'
import { supabase }  from '../_lib/supabase.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const { data: user } = await supabase.from('users').select('id,name').eq('email', email.toLowerCase().trim()).maybeSingle()

  // Always respond the same to prevent email enumeration
  if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' })

  const token   = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 3_600_000).toISOString() // 1 hour

  // Clear old tokens
  await supabase.from('password_reset_tokens').delete().eq('user_id', user.id)
  await supabase.from('password_reset_tokens').insert({ user_id: user.id, token, expires_at: expires, used: false })

  // TODO: send email via Resend / SendGrid / Nodemailer
  // For now token is returned in dev mode only
  console.log(`🔑 Reset token for ${email}: ${token}`)

  res.json({
    message:   'If this email exists, a reset link has been sent.',
    dev_token: process.env.NODE_ENV !== 'production' ? token : undefined,
  })
}
