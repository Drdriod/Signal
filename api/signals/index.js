import { supabase }              from '../_lib/supabase.js'
import { requireAuth, requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions }  from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'GET')  return requireAuth(getSignals)(req, res)
  if (req.method === 'POST') return requireAdmin(postSignal)(req, res)
  res.status(405).json({ error: 'Method not allowed' })
}

async function getSignals(req, res) {
  const user = req.user
  // Verify subscription
  const { data: u } = await supabase.from('users').select('role,subscription_approved').eq('id', user.id).single()
  if (u?.role !== 'admin' && !u?.subscription_approved)
    return res.status(403).json({ error: 'Active subscription required' })

  let query = supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(Number(req.query.limit) || 100)
  if (req.query.status   && req.query.status   !== 'all') query = query.eq('status',   req.query.status)
  if (req.query.category && req.query.category !== 'all') query = query.eq('category', req.query.category)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function postSignal(req, res) {
  const { title, type, asset, entry, sl, tp, pips, confidence, category, notes } = req.body
  if (!title || !type || !asset) return res.status(400).json({ error: 'Title, type and asset required' })

  const { data: signal, error } = await supabase.from('signals').insert({
    title, type, asset,
    entry:      entry      || '',
    sl:         sl         || '',
    tp:         tp         || '',
    pips:       pips       || '',
    confidence: confidence || 80,
    category:   category   || 'forex',
    notes:      notes      || '',
    status:     'active',
    posted_by:  req.user.id,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Supabase Realtime broadcast — clients subscribed to 'signals' channel receive this automatically
  // No manual WebSocket needed — Supabase handles it via the client-side useRealtime hook
  await supabase.channel('signals').send({
    type:    'broadcast',
    event:   'new_signal',
    payload: signal,
  }).catch(() => {}) // non-blocking

  res.json({ signal })
}
