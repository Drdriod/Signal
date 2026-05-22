import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'GET') {
    const { data } = await supabase.from('users').select('*').eq('role','user').order('created_at', { ascending: false })
    return res.json((data || []).map(({ password_hash, ...u }) => u))
  }
  res.status(405).json({ error: 'Method not allowed' })
})
