import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const [total, active, pending, free] = await Promise.all([
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user'),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('subscription_approved',true),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('subscription_status','pending'),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('plan','free'),
  ])

  res.json({ total: total.count||0, active: active.count||0, pending: pending.count||0, free: free.count||0 })
})
