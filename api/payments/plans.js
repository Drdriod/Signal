import { supabase }  from '../_lib/supabase.js'
import { cors, handleOptions } from '../_lib/cors.js'

const S = async (key) => {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value || ''
}

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const [bn,bp,bd, pn,pp,pd, vn,vp,vd,
         ut,ue,bt,et,bnb,
         sw,se] = await Promise.all([
    S('plan_basic_name'),S('plan_basic_price'),S('plan_basic_duration'),
    S('plan_premium_name'),S('plan_premium_price'),S('plan_premium_duration'),
    S('plan_vip_name'),S('plan_vip_price'),S('plan_vip_duration'),
    S('crypto_usdt_trc20'),S('crypto_usdt_erc20'),S('crypto_btc'),S('crypto_eth'),S('crypto_bnb'),
    S('support_whatsapp'),S('support_email'),
  ])

  res.json({
    plans: [
      { id:'basic',   name:bn||'Basic',   price:bp||'9',  duration:bd||'30', currency:'USDT' },
      { id:'premium', name:pn||'Premium', price:pp||'29', duration:pd||'30', currency:'USDT' },
      { id:'vip',     name:vn||'VIP',     price:vp||'79', duration:vd||'30', currency:'USDT' },
    ],
    wallets: {
      usdt_trc20: ut, usdt_erc20: ue, btc: bt, eth: et, bnb: bnb,
    },
    support_whatsapp: sw,
    support_email:    se,
  })
}
