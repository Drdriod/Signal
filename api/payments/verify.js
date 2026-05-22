import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAdmin(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { id }        = req.query
  const { admin_note } = req.body

  const { data: payment } = await supabase.from('crypto_payments').select('*').eq('id', id).single()
  if (!payment) return res.status(404).json({ error: 'Payment not found' })

  const { data: durRow } = await supabase.from('settings').select('value').eq('key', `plan_${payment.plan}_duration`).maybeSingle()
  const days      = parseInt(durRow?.value || 30)
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()

  const { data: commRow } = await supabase.from('settings').select('value').eq('key','referral_commission_rate').maybeSingle()
  const commRate = parseFloat(commRow?.value || 10) / 100

  // Update payment
  await supabase.from('crypto_payments').update({
    status: 'verified', admin_note: admin_note || null, verified_at: new Date().toISOString(),
  }).eq('id', id)

  // Activate subscription
  await supabase.from('users').update({
    plan: payment.plan, subscription_approved: true, subscription_status: 'active',
  }).eq('id', payment.user_id)

  // Upsert subscription record
  await supabase.from('subscriptions').upsert({
    user_id: payment.user_id, plan: payment.plan, status: 'active',
    payment_ref: payment.tx_hash, amount: payment.amount, currency: payment.currency,
    expires_at: expiresAt,
  }, { onConflict: 'user_id' })

  // Referral commission
  const { data: newUser } = await supabase.from('users').select('referred_by').eq('id', payment.user_id).single()
  if (newUser?.referred_by) {
    const { data: referrer } = await supabase.from('users').select('id').eq('referral_code', newUser.referred_by).maybeSingle()
    if (referrer) {
      const commission = parseFloat((payment.amount * commRate).toFixed(2))
      await supabase.from('referrals').update({
        status: 'paid', commission_amount: commission, paid_at: new Date().toISOString(),
      }).eq('referrer_id', referrer.id).eq('referred_id', payment.user_id)

      await supabase.rpc('increment_commission', { uid: referrer.id, amount: commission })
        .catch(() =>
          // Fallback if RPC not created yet
          supabase.from('users').select('referral_commission').eq('id', referrer.id).single()
            .then(({ data: r }) => supabase.from('users').update({
              referral_commission: (r?.referral_commission || 0) + commission
            }).eq('id', referrer.id))
        )
    }
  }

  // Supabase Realtime notification to user
  await supabase.channel(`user_${payment.user_id}`).send({
    type: 'broadcast', event: 'subscription_approved',
    payload: { message: `Your ${payment.plan} subscription is now active!`, plan: payment.plan },
  }).catch(() => {})

  res.json({ message: 'Payment verified and subscription activated' })
})
