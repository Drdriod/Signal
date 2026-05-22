import bcrypt           from 'bcryptjs'
import { supabase }     from '../_lib/supabase.js'
import { makeToken }    from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

const genRefCode = (name) => {
  const prefix = name.replace(/\s+/g,'').toUpperCase().slice(0,4).padEnd(4,'X')
  const suffix = Math.random().toString(36).substring(2,6).toUpperCase()
  return prefix + suffix
}

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, username, email, phone, password, referral_code } = req.body

  if (!name || !username || !email || !password)
    return res.status(400).json({ error: 'Name, username, email and password are required' })
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ error: 'Username: 3–20 chars, letters/numbers/underscores only' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address' })

  // Uniqueness checks
  const { data: existEmail } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
  if (existEmail) return res.status(409).json({ error: 'Email is already registered' })

  const { data: existUser } = await supabase.from('users').select('id').eq('username', username.toLowerCase().trim()).maybeSingle()
  if (existUser) return res.status(409).json({ error: 'Username is already taken' })

  if (phone?.trim()) {
    const { data: existPhone } = await supabase.from('users').select('id').eq('phone', phone.trim()).maybeSingle()
    if (existPhone) return res.status(409).json({ error: 'Phone number is already registered' })
  }

  // Validate referral code
  let referrerUser = null
  if (referral_code?.trim()) {
    const { data } = await supabase.from('users').select('id').eq('referral_code', referral_code.trim().toUpperCase()).maybeSingle()
    if (!data) return res.status(400).json({ error: 'Invalid referral code' })
    referrerUser = data
  }

  // Generate unique referral code
  let myRefCode = genRefCode(name)
  let tries = 0
  while (tries < 10) {
    const { data: clash } = await supabase.from('users').select('id').eq('referral_code', myRefCode).maybeSingle()
    if (!clash) break
    myRefCode = genRefCode(name)
    tries++
  }

  const hash   = await bcrypt.hash(password, 12)
  const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)

  const { data: newUser, error } = await supabase.from('users').insert({
    name:               name.trim(),
    username:           username.toLowerCase().trim(),
    email:              email.toLowerCase().trim(),
    phone:              phone?.trim() || null,
    password_hash:      hash,
    avatar,
    plan:               'free',
    role:               'user',
    referral_code:      myRefCode,
    referred_by:        referrerUser ? referral_code.trim().toUpperCase() : null,
    referral_commission: 0,
    subscription_approved: false,
    subscription_status: 'inactive',
    channels:           [],
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Record referral
  if (referrerUser) {
    await supabase.from('referrals').insert({
      referrer_id: referrerUser.id,
      referred_id: newUser.id,
      status:      'pending',
      commission_amount: 0,
    })
  }

  const { password_hash, ...safeUser } = newUser
  res.status(201).json({ token: makeToken(newUser), user: safeUser })
}
