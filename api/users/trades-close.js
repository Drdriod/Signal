import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { id }                    = req.query
  const { exit_price, pnl, notes } = req.body

  await supabase.from('trade_history').update({
    status: 'closed', exit_price: exit_price || null, pnl: pnl || null,
    notes: notes || null, closed_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', req.user.id)

  res.json({ message: 'Trade closed' })
})
