import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { channels, whatsapp, telegram, push_token, name, phone } = req.body

  if (phone?.trim()) {
    const { data: exist } = await supabase.from('users').select('id').eq('phone', phone.trim()).neq('id', req.user.id).maybeSingle()
    if (exist) return res.status(409).json({ error: 'Phone number already in use' })
  }

  const updates = {}
  if (channels   !== undefined) updates.channels   = channels
  if (whatsapp   !== undefined) updates.whatsapp   = whatsapp
  if (telegram   !== undefined) updates.telegram   = telegram
  if (push_token !== undefined) updates.push_token = push_token
  if (name?.trim())             updates.name       = name.trim()
  if (phone?.trim())            updates.phone      = phone.trim()

  const { data: user, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single()
  if (error) return res.status(500).json({ error: error.message })

  const { password_hash, ...safe } = user
  res.json(safe)
})
