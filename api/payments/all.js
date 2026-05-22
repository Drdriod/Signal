import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const { data } = await supabase.from('crypto_payments')
    .select('*, users!user_id(name,email,avatar)')
    .order('submitted_at', { ascending: false })

  res.json((data || []).map(p => ({ ...p, name: p.users?.name, email: p.users?.email, avatar: p.users?.avatar })))
})
