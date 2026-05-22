import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'GET') {
    let query = supabase.from('trade_history')
      .select('*, signals!signal_id(title,asset,type,category,entry,sl,tp,pips)')
      .eq('user_id', req.user.id)
      .order('opened_at', { ascending: false })

    if (req.query.status && req.query.status !== 'all') query = query.eq('status', req.query.status)

    const { data } = await query
    return res.json((data || []).map(t => ({
      ...t,
      title:        t.signals?.title,
      asset:        t.signals?.asset,
      type:         t.signals?.type,
      category:     t.signals?.category,
      signal_entry: t.signals?.entry,
      sl:           t.signals?.sl,
      tp:           t.signals?.tp,
      signal_pips:  t.signals?.pips,
    })))
  }

  if (req.method === 'POST') {
    const { signal_id, entry_price } = req.body
    if (!signal_id) return res.status(400).json({ error: 'signal_id required' })
    const { data: sig } = await supabase.from('signals').select('entry').eq('id', signal_id).single()
    const { data, error } = await supabase.from('trade_history').insert({
      user_id: req.user.id, signal_id, entry_price: entry_price || sig?.entry, status: 'active',
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
})
