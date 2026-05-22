// Single Express app = 1 Vercel function (fits Hobby plan's 12-function limit)
import express      from 'express'
import cors         from 'cors'
import helmet       from 'helmet'
import bcrypt       from 'bcryptjs'
import jwt          from 'jsonwebtoken'
import crypto       from 'crypto'
import { createClient } from '@supabase/supabase-js'

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json({ limit: '10kb' }))
app.options('*', (req, res) => res.sendStatus(200))

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'

// ── Helpers ───────────────────────────────────────────────────────────────────
const safe = ({ password_hash, ...u }) => u

const makeToken = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' })

const auth = (req, res, next) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Invalid token' }) }
}

const admin = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    next()
  })
}

const S = async (key) => {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value || ''
}

const genRef = (name) => {
  const p = name.replace(/\s+/g,'').toUpperCase().slice(0,4).padEnd(4,'X')
  return p + Math.random().toString(36).substring(2,6).toUpperCase()
}

// ════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════

// Check field availability
app.get('/api/auth/check', async (req, res) => {
  const { field, value } = req.query
  if (!['email','username','phone'].includes(field)) return res.status(400).json({ error: 'Invalid field' })
  if (!value?.trim()) return res.json({ available: false })
  const { data } = await supabase.from('users').select('id').eq(field, value.toLowerCase().trim()).maybeSingle()
  res.json({ available: !data, message: data ? `${field} is already taken` : `${field} is available` })
})

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, phone, password, referral_code } = req.body
    if (!name || !username || !email || !password) return res.status(400).json({ error: 'Name, username, email and password required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' })
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username: 3-20 chars, letters/numbers/underscores' })

    const { data: eE } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (eE) return res.status(409).json({ error: 'Email already registered' })
    const { data: eU } = await supabase.from('users').select('id').eq('username', username.toLowerCase().trim()).maybeSingle()
    if (eU) return res.status(409).json({ error: 'Username already taken' })
    if (phone?.trim()) {
      const { data: eP } = await supabase.from('users').select('id').eq('phone', phone.trim()).maybeSingle()
      if (eP) return res.status(409).json({ error: 'Phone already registered' })
    }

    let referrerUser = null
    if (referral_code?.trim()) {
      const { data } = await supabase.from('users').select('id').eq('referral_code', referral_code.trim().toUpperCase()).maybeSingle()
      if (!data) return res.status(400).json({ error: 'Invalid referral code' })
      referrerUser = data
    }

    let myRef = genRef(name)
    for (let i = 0; i < 10; i++) {
      const { data: clash } = await supabase.from('users').select('id').eq('referral_code', myRef).maybeSingle()
      if (!clash) break
      myRef = genRef(name)
    }

    const { data: newUser, error } = await supabase.from('users').insert({
      name: name.trim(), username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(), phone: phone?.trim() || null,
      password_hash: await bcrypt.hash(password, 12),
      avatar: name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
      plan: 'free', role: 'user', referral_code: myRef,
      referred_by: referrerUser ? referral_code.trim().toUpperCase() : null,
      referral_commission: 0, subscription_approved: false, subscription_status: 'inactive', channels: [],
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    if (referrerUser) await supabase.from('referrals').insert({ referrer_id: referrerUser.id, referred_id: newUser.id, status: 'pending', commission_amount: 0 })

    res.status(201).json({ token: makeToken(newUser), user: safe(newUser) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (!user || !await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' })
    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
    res.json({ token: makeToken(user), user: safe(user) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Me
app.get('/api/auth/me', auth, async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single()
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(safe(user))
})

// Update profile
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { channels, whatsapp, telegram, name, phone } = req.body
    if (phone?.trim()) {
      const { data: ex } = await supabase.from('users').select('id').eq('phone', phone.trim()).neq('id', req.user.id).maybeSingle()
      if (ex) return res.status(409).json({ error: 'Phone already in use' })
    }
    const upd = {}
    if (channels !== undefined) upd.channels = channels
    if (whatsapp !== undefined) upd.whatsapp = whatsapp
    if (telegram !== undefined) upd.telegram = telegram
    if (name?.trim()) upd.name = name.trim()
    if (phone?.trim()) upd.phone = phone.trim()
    const { data: user } = await supabase.from('users').update(upd).eq('id', req.user.id).select().single()
    res.json(safe(user))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Change password
app.put('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Min 8 characters' })
    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single()
    if (!await bcrypt.compare(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Wrong current password' })
    await supabase.from('users').update({ password_hash: await bcrypt.hash(newPassword, 12) }).eq('id', req.user.id)
    res.json({ message: 'Password updated' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const { data: user } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (!user) return res.json({ message: 'If this email exists, a reset link was sent.' })
    const token = crypto.randomBytes(32).toString('hex')
    await supabase.from('password_reset_tokens').delete().eq('user_id', user.id)
    await supabase.from('password_reset_tokens').insert({ user_id: user.id, token, expires_at: new Date(Date.now()+3600000).toISOString(), used: false })
    console.log(`Reset token for ${email}: ${token}`)
    res.json({ message: 'If this email exists, a reset link was sent.', dev_token: process.env.NODE_ENV !== 'production' ? token : undefined })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Token and new password (min 8) required' })
    const { data: rec } = await supabase.from('password_reset_tokens').select('*').eq('token', token).eq('used', false).maybeSingle()
    if (!rec || new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'Invalid or expired token' })
    await supabase.from('users').update({ password_hash: await bcrypt.hash(newPassword, 12) }).eq('id', rec.user_id)
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', rec.id)
    res.json({ message: 'Password reset. You can now log in.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// My referrals
app.get('/api/auth/referrals', auth, async (req, res) => {
  try {
    const { data: me } = await supabase.from('users').select('referral_code,referral_commission').eq('id', req.user.id).single()
    const { data: refs } = await supabase.from('referrals')
      .select('*, users!referred_id(name,email,plan,subscription_approved,created_at)')
      .eq('referrer_id', req.user.id).order('created_at', { ascending: false })
    res.json({
      referral_code: me?.referral_code,
      total_commission: me?.referral_commission || 0,
      referrals: (refs||[]).map(r => ({ ...r, referred_name: r.users?.name, referred_email: r.users?.email, referred_plan: r.users?.plan, subscription_approved: r.users?.subscription_approved, joined_at: r.users?.created_at }))
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ════════════════════════════════════════════════════════════════════
// SIGNALS
// ════════════════════════════════════════════════════════════════════

app.get('/api/signals', auth, async (req, res) => {
  try {
    const { data: u } = await supabase.from('users').select('role,subscription_approved').eq('id', req.user.id).single()
    if (u?.role !== 'admin' && !u?.subscription_approved) return res.status(403).json({ error: 'Active subscription required' })
    let q = supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(Number(req.query.limit)||100)
    if (req.query.status   && req.query.status   !== 'all') q = q.eq('status',   req.query.status)
    if (req.query.category && req.query.category !== 'all') q = q.eq('category', req.query.category)
    const { data } = await q
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/signals', admin, async (req, res) => {
  try {
    const { title, type, asset, entry, sl, tp, pips, confidence, category, notes } = req.body
    if (!title || !type || !asset) return res.status(400).json({ error: 'Title, type and asset required' })
    const { data: signal, error } = await supabase.from('signals').insert({
      title, type, asset, entry: entry||'', sl: sl||'', tp: tp||'', pips: pips||'',
      confidence: confidence||80, category: category||'forex', notes: notes||'',
      status: 'active', posted_by: req.user.id,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    // Broadcast via Supabase Realtime
    await supabase.channel('signals').send({ type: 'broadcast', event: 'new_signal', payload: signal }).catch(()=>{})
    res.json({ signal })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/signals/:id', admin, async (req, res) => {
  try {
    const { status, result } = req.body
    if (!['active','closed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const upd = { status, result: result||null }
    if (status === 'closed') upd.closed_at = new Date().toISOString()
    const { data } = await supabase.from('signals').update(upd).eq('id', req.params.id).select().single()
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/signals/:id', admin, async (req, res) => {
  await supabase.from('signals').delete().eq('id', req.params.id)
  res.json({ message: 'Deleted' })
})

app.get('/api/signals/stats', admin, async (req, res) => {
  const [tot, act, clo, tod] = await Promise.all([
    supabase.from('signals').select('id',{count:'exact',head:true}),
    supabase.from('signals').select('id',{count:'exact',head:true}).eq('status','active'),
    supabase.from('signals').select('id',{count:'exact',head:true}).eq('status','closed'),
    supabase.from('signals').select('id',{count:'exact',head:true}).gte('created_at', new Date().toISOString().slice(0,10)),
  ])
  res.json({ total: tot.count||0, active: act.count||0, closed: clo.count||0, today: tod.count||0 })
})

// ════════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════════

app.get('/api/payments/plans', async (req, res) => {
  try {
    const [bn,bp,bd,pn,pp,pd,vn,vp,vd,ut,ue,bt,et,bnb,sw,se] = await Promise.all([
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
      wallets: { usdt_trc20:ut, usdt_erc20:ue, btc:bt, eth:et, bnb:bnb },
      support_whatsapp: sw, support_email: se,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/payments/submit', auth, async (req, res) => {
  try {
    const { plan, currency, tx_hash, wallet_address } = req.body
    if (!plan || !currency || !tx_hash) return res.status(400).json({ error: 'Plan, currency and transaction ID required' })
    if (!['basic','premium','vip'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' })
    const { data: dup } = await supabase.from('crypto_payments').select('id').eq('tx_hash', tx_hash.trim()).maybeSingle()
    if (dup) return res.status(409).json({ error: 'Transaction ID already submitted' })
    const amount = parseFloat(await S(`plan_${plan}_price`) || 0)
    const { data, error } = await supabase.from('crypto_payments').insert({
      user_id: req.user.id, plan, amount, currency: currency.toUpperCase(),
      wallet_address: wallet_address||'', tx_hash: tx_hash.trim(), status: 'pending',
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    await supabase.from('users').update({ plan, subscription_status: 'pending' }).eq('id', req.user.id)
    res.json({ message: 'Payment submitted. Admin will verify shortly.', paymentId: data.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/payments/my', auth, async (req, res) => {
  const { data } = await supabase.from('crypto_payments').select('*').eq('user_id', req.user.id).order('submitted_at',{ascending:false})
  res.json(data||[])
})

app.get('/api/payments/pending', admin, async (req, res) => {
  const { data } = await supabase.from('crypto_payments')
    .select('*, users!user_id(name,email,avatar)').eq('status','pending').order('submitted_at',{ascending:true})
  res.json((data||[]).map(p=>({...p, name:p.users?.name, email:p.users?.email, avatar:p.users?.avatar})))
})

app.get('/api/payments/all', admin, async (req, res) => {
  const { data } = await supabase.from('crypto_payments')
    .select('*, users!user_id(name,email,avatar)').order('submitted_at',{ascending:false})
  res.json((data||[]).map(p=>({...p, name:p.users?.name, email:p.users?.email, avatar:p.users?.avatar})))
})

app.patch('/api/payments/:id/verify', admin, async (req, res) => {
  try {
    const { id } = req.params
    const { admin_note } = req.body
    const { data: payment } = await supabase.from('crypto_payments').select('*').eq('id', id).single()
    if (!payment) return res.status(404).json({ error: 'Not found' })
    const days = parseInt(await S(`plan_${payment.plan}_duration`) || 30)
    const expiresAt = new Date(Date.now() + days*86400000).toISOString()
    const commRate = parseFloat(await S('referral_commission_rate') || 10) / 100

    await supabase.from('crypto_payments').update({ status:'verified', admin_note: admin_note||null, verified_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('users').update({ plan: payment.plan, subscription_approved: true, subscription_status: 'active' }).eq('id', payment.user_id)
    await supabase.from('subscriptions').upsert({ user_id: payment.user_id, plan: payment.plan, status:'active', payment_ref: payment.tx_hash, amount: payment.amount, currency: payment.currency, expires_at: expiresAt }, { onConflict:'user_id' })

    // Referral commission
    const { data: nu } = await supabase.from('users').select('referred_by').eq('id', payment.user_id).single()
    if (nu?.referred_by) {
      const { data: ref } = await supabase.from('users').select('id,referral_commission').eq('referral_code', nu.referred_by).maybeSingle()
      if (ref) {
        const commission = parseFloat((payment.amount * commRate).toFixed(2))
        await supabase.from('referrals').update({ status:'paid', commission_amount: commission, paid_at: new Date().toISOString() }).eq('referrer_id', ref.id).eq('referred_id', payment.user_id)
        await supabase.from('users').update({ referral_commission: (ref.referral_commission||0) + commission }).eq('id', ref.id)
        await supabase.channel(`user_${ref.id}`).send({ type:'broadcast', event:'referral_commission', payload:{ message:`You earned ${commission} USDT commission!` } }).catch(()=>{})
      }
    }

    await supabase.channel(`user_${payment.user_id}`).send({ type:'broadcast', event:'subscription_approved', payload:{ message:`Your ${payment.plan} subscription is now active!`, plan: payment.plan } }).catch(()=>{})
    res.json({ message: 'Payment verified and subscription activated' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/payments/:id/reject', admin, async (req, res) => {
  try {
    const { id } = req.params
    const { admin_note } = req.body
    const { data: p } = await supabase.from('crypto_payments').select('user_id').eq('id', id).single()
    await supabase.from('crypto_payments').update({ status:'rejected', admin_note: admin_note||'Could not verify', verified_at: new Date().toISOString() }).eq('id', id)
    if (p) {
      await supabase.from('users').update({ subscription_status:'inactive' }).eq('id', p.user_id)
      await supabase.channel(`user_${p.user_id}`).send({ type:'broadcast', event:'subscription_rejected', payload:{ message:'Payment could not be verified. Contact support.' } }).catch(()=>{})
    }
    res.json({ message: 'Payment rejected' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════

app.get('/api/users', admin, async (req, res) => {
  const { data } = await supabase.from('users').select('*').eq('role','user').order('created_at',{ascending:false})
  res.json((data||[]).map(safe))
})

app.get('/api/users/stats', admin, async (req, res) => {
  const [tot,act,pen,fr] = await Promise.all([
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user'),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('subscription_approved',true),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('subscription_status','pending'),
    supabase.from('users').select('id',{count:'exact',head:true}).eq('role','user').eq('plan','free'),
  ])
  res.json({ total:tot.count||0, active:act.count||0, pending:pen.count||0, free:fr.count||0 })
})

app.get('/api/users/subscription', auth, async (req, res) => {
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', req.user.id).maybeSingle()
  res.json(data||null)
})

app.get('/api/users/trades/me', auth, async (req, res) => {
  try {
    let q = supabase.from('trade_history')
      .select('*, signals!signal_id(title,asset,type,category,entry,sl,tp,pips)')
      .eq('user_id', req.user.id).order('opened_at',{ascending:false})
    if (req.query.status && req.query.status !== 'all') q = q.eq('status', req.query.status)
    const { data } = await q
    res.json((data||[]).map(t=>({ ...t, title:t.signals?.title, asset:t.signals?.asset, type:t.signals?.type, category:t.signals?.category, signal_entry:t.signals?.entry, sl:t.signals?.sl, tp:t.signals?.tp, signal_pips:t.signals?.pips })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/users/trades', auth, async (req, res) => {
  try {
    const { signal_id, entry_price } = req.body
    if (!signal_id) return res.status(400).json({ error: 'signal_id required' })
    const { data: sig } = await supabase.from('signals').select('entry').eq('id', signal_id).single()
    const { data, error } = await supabase.from('trade_history').insert({ user_id: req.user.id, signal_id, entry_price: entry_price||sig?.entry, status:'active' }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/users/trades/:id/close', auth, async (req, res) => {
  const { exit_price, pnl, notes } = req.body
  await supabase.from('trade_history').update({ status:'closed', exit_price:exit_price||null, pnl:pnl||null, notes:notes||null, closed_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', req.user.id)
  res.json({ message: 'Trade closed' })
})

app.get('/api/users/:id/trades', admin, async (req, res) => {
  const { data } = await supabase.from('trade_history')
    .select('*, signals!signal_id(title,asset,type,category)')
    .eq('user_id', req.params.id).order('opened_at',{ascending:false})
  res.json((data||[]).map(t=>({...t, title:t.signals?.title, asset:t.signals?.asset, type:t.signals?.type, category:t.signals?.category})))
})

app.delete('/api/users/:id', admin, async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id).neq('role','admin')
  res.json({ message: 'User deleted' })
})

app.patch('/api/users/:id', admin, async (req, res) => {
  await supabase.from('users').update({ subscription_approved: false, subscription_status:'inactive' }).eq('id', req.params.id)
  await supabase.from('subscriptions').update({ status:'suspended' }).eq('user_id', req.params.id)
  res.json({ message: 'Subscription revoked' })
})

// ════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════

app.get('/api/settings', admin, async (req, res) => {
  const { data } = await supabase.from('settings').select('key,value')
  const obj = {}
  ;(data||[]).forEach(r => { obj[r.key] = r.value })
  res.json(obj)
})

app.post('/api/settings', admin, async (req, res) => {
  try {
    const rows = Object.entries(req.body).map(([key,value]) => ({ key, value: String(value) }))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict:'key' })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: 'Settings saved' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/health', (req, res) => res.json({ status:'ok', app:'SignalCMS v3', time: new Date().toISOString() }))

export default app
