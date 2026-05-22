import { supabase }    from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const [total, active, closed, today] = await Promise.all([
    supabase.from('signals').select('id', { count:'exact', head:true }),
    supabase.from('signals').select('id', { count:'exact', head:true }).eq('status','active'),
    supabase.from('signals').select('id', { count:'exact', head:true }).eq('status','closed'),
    supabase.from('signals').select('id', { count:'exact', head:true }).gte('created_at', new Date().toISOString().slice(0,10)),
  ])

  res.json({
    total:  total.count  || 0,
    active: active.count || 0,
    closed: closed.count || 0,
    today:  today.count  || 0,
  })
})
