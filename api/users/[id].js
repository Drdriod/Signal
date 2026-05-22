import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'DELETE') return requireAdmin(del)(req, res)
  if (req.method === 'PATCH')  return requireAdmin(revoke)(req, res)
  if (req.method === 'GET')    return requireAdmin(getTrades)(req, res)
  res.status(405).json({ error: 'Method not allowed' })
}

async function del(req, res) {
  const { id } = req.query
  await supabase.from('users').delete().eq('id', id).neq('role','admin')
  res.json({ message: 'User deleted' })
}

async function revoke(req, res) {
  const { id } = req.query
  await supabase.from('users').update({ subscription_approved: false, subscription_status: 'inactive' }).eq('id', id)
  await supabase.from('subscriptions').update({ status: 'suspended' }).eq('user_id', id)
  res.json({ message: 'Subscription revoked' })
}

async function getTrades(req, res) {
  const { id } = req.query
  const { data } = await supabase.from('trade_history')
    .select('*, signals!signal_id(title,asset,type,category)')
    .eq('user_id', id)
    .order('opened_at', { ascending: false })
  res.json((data || []).map(t => ({
    ...t, title: t.signals?.title, asset: t.signals?.asset, type: t.signals?.type, category: t.signals?.category,
  })))
}
