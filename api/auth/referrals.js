import { supabase }    from '../_lib/supabase.js'
import { requireAuth } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default requireAuth(async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const { data: me } = await supabase.from('users').select('referral_code,referral_commission').eq('id', req.user.id).single()

  const { data: refs } = await supabase
    .from('referrals')
    .select('*, users!referred_id(name,email,plan,subscription_approved,created_at)')
    .eq('referrer_id', req.user.id)
    .order('created_at', { ascending: false })

  const referrals = (refs || []).map(r => ({
    ...r,
    referred_name:     r.users?.name,
    referred_email:    r.users?.email,
    referred_plan:     r.users?.plan,
    subscription_approved: r.users?.subscription_approved,
    joined_at:         r.users?.created_at,
  }))

  res.json({
    referral_code:     me?.referral_code,
    total_commission:  me?.referral_commission || 0,
    referrals,
  })
})
