import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const { data: user, error } = await supabase
    .from('users').select('*').eq('id', req.user.id).single()
  if (error || !user) return res.status(404).json({ error: 'User not found' })

  const { password_hash, ...safeUser } = user
  res.json(safeUser)
})
