import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { id }         = req.query
  const { admin_note } = req.body

  await supabase.from('crypto_payments').update({
    status: 'rejected', admin_note: admin_note || 'Payment could not be verified',
    verified_at: new Date().toISOString(),
  }).eq('id', id)

  const { data: p } = await supabase.from('crypto_payments').select('user_id').eq('id', id).single()
  if (p) {
    await supabase.from('users').update({ subscription_status: 'inactive' }).eq('id', p.user_id)
    await supabase.channel(`user_${p.user_id}`).send({
      type: 'broadcast', event: 'subscription_rejected',
      payload: { message: 'Your payment could not be verified. Please contact support.' },
    }).catch(() => {})
  }

  res.json({ message: 'Payment rejected' })
})
