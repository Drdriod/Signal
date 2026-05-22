import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan, currency, tx_hash, wallet_address } = req.body
  if (!plan || !currency || !tx_hash) return res.status(400).json({ error: 'Plan, currency and transaction ID required' })
  if (!['basic','premium','vip'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' })

  // Prevent duplicate tx_hash
  const { data: dup } = await supabase.from('crypto_payments').select('id').eq('tx_hash', tx_hash.trim()).maybeSingle()
  if (dup) return res.status(409).json({ error: 'This transaction ID has already been submitted' })

  const { data: priceRow } = await supabase.from('settings').select('value').eq('key', `plan_${plan}_price`).maybeSingle()
  const amount = parseFloat(priceRow?.value || 0)

  const { data, error } = await supabase.from('crypto_payments').insert({
    user_id: req.user.id, plan, amount, currency: currency.toUpperCase(),
    wallet_address: wallet_address || '', tx_hash: tx_hash.trim(), status: 'pending',
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('users').update({ plan, subscription_status: 'pending' }).eq('id', req.user.id)

  res.json({ message: 'Payment submitted. Admin will verify shortly.', paymentId: data.id })
})
