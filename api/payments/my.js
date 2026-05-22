import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const { data } = await supabase.from('crypto_payments')
    .select('*').eq('user_id', req.user.id).order('submitted_at', { ascending: false })
  res.json(data || [])
})
