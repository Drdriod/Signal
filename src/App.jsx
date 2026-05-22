import { useState, useEffect, useCallback, useRef } from 'react'
import { authAPI, signalsAPI, paymentsAPI, usersAPI, settingsAPI } from './api'
import { useWebSocket } from './useRealtime'
import './index.css'

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { id: 'telegram', label: 'Telegram', icon: '✈️',  color: '#229ED9' },
  { id: 'email',    label: 'Email',    icon: '📧', color: '#EA4335' },
  { id: 'push',     label: 'Push',     icon: '🔔', color: '#FF6B35' },
]
const CRYPTO_LABELS = {
  usdt_trc20:'USDT (TRC-20)', usdt_erc20:'USDT (ERC-20)',
  btc:'Bitcoin (BTC)', eth:'Ethereum (ETH)', bnb:'BNB (BEP-20)',
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('show'), 10)
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300) }, 4200)
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]   = useState('landing')
  const [user, setUser]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authAPI.me()
        .then(r => { setUser(r.data); setView(r.data.role === 'admin' ? 'admin' : 'dashboard') })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null); setView('landing')
    toast('Signed out successfully')
  }

  if (loading) return (
    <div className="splash"><div className="splash-inner"><span className="brand-dot" /><span>SignalCMS</span></div></div>
  )

  return (
    <div className="app">
      {view === 'landing'        && <Landing setView={setView} />}
      {view === 'login'          && <Login setView={setView} setUser={setUser} />}
      {view === 'register'       && <Register setView={setView} setUser={setUser} />}
      {view === 'forgot'         && <ForgotPassword setView={setView} />}
      {view === 'dashboard'      && user && <Dashboard user={user} setUser={setUser} onLogout={logout} setView={setView} />}
      {view === 'subscribe'      && user && <Subscribe user={user} setUser={setUser} setView={setView} />}
      {view === 'admin'          && user?.role === 'admin' && <AdminPanel user={user} onLogout={logout} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING
// ══════════════════════════════════════════════════════════════════════════════
function Landing({ setView }) {
  const [plans, setPlans] = useState([])
  useEffect(() => { paymentsAPI.getPlans().then(r => setPlans(r.data.plans)).catch(() => {}) }, [])

  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-brand"><span className="brand-dot" /><span>SignalCMS</span></div>
        <div className="nav-actions">
          <button className="btn-ghost" onClick={() => setView('login')}>Sign In</button>
          <button className="btn-primary" onClick={() => setView('register')}>Get Started Free</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">🔴 LIVE SIGNALS</div>
        <h1>Professional Trading<br /><span className="grad-text">Signals Platform</span></h1>
        <p className="hero-sub">Expert-curated forex, crypto & commodity signals delivered instantly to WhatsApp, Telegram, Email & Push.</p>
        <div className="hero-btns">
          <button className="btn-primary lg" onClick={() => setView('register')}>Create Free Account</button>
          <button className="btn-ghost lg" onClick={() => setView('login')}>Sign In</button>
        </div>
        <div className="hero-stats">
          <div><strong>Live</strong><span>Signal Delivery</span></div>
          <div><strong>4</strong><span>Notify Channels</span></div>
          <div><strong>24/7</strong><span>Market Coverage</span></div>
          <div><strong>10%</strong><span>Referral Commission</span></div>
        </div>
      </section>

      <section className="how-section">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <div className="step-card"><div className="step-num">1</div><h3>Register Free</h3><p>Create your account with unique username & email. No credit card needed.</p></div>
          <div className="step-card"><div className="step-num">2</div><h3>Subscribe</h3><p>Pay via crypto and submit your transaction ID for quick admin verification.</p></div>
          <div className="step-card"><div className="step-num">3</div><h3>Receive Signals</h3><p>Get live signals via WhatsApp, Telegram, Email or Push in real time.</p></div>
          <div className="step-card"><div className="step-num">4</div><h3>Earn Referrals</h3><p>Share your referral code and earn 10% commission on every subscription.</p></div>
        </div>
      </section>

      <section className="channels-section">
        <h2>Receive Signals Your Way</h2>
        <div className="channels-grid">
          {CHANNELS.map(c => (
            <div key={c.id} className="channel-card" style={{ '--ch-color': c.color }}>
              <span className="ch-icon">{c.icon}</span><span>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="plans-section">
          <h2>Simple Pricing</h2>
          <p className="plans-sub">Pay with crypto — fast, secure, borderless</p>
          <div className="plans-grid">
            {plans.map((p, i) => (
              <div key={p.id} className={`plan-card ${i === 1 ? 'plan-featured' : ''}`}>
                {i === 1 && <span className="plan-badge">POPULAR</span>}
                <h3>{p.name}</h3>
                <div className="plan-price"><span>{p.price}</span> {p.currency}<small>/{p.duration} days</small></div>
                <ul className="plan-features">
                  <li>✓ Unlimited signals</li>
                  <li>✓ All notification channels</li>
                  <li>✓ Real-time delivery</li>
                  <li>✓ Trade history tracking</li>
                  {i > 0 && <li>✓ Priority support</li>}
                  {i === 2 && <li>✓ VIP-only analysis</li>}
                </ul>
                <button className="btn-primary w-full" onClick={() => setView('register')}>Get Started</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="nav-brand"><span className="brand-dot" /><span>SignalCMS</span></div>
        <p>© {new Date().getFullYear()} SignalCMS. Professional trading signals platform.</p>
        <button className="btn-ghost sm" onClick={() => setView('login')}>Admin Login</button>
      </footer>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function Login({ setView, setUser }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!form.email || !form.password) { toast('Fill all fields', 'error'); return }
    setLoading(true)
    try {
      const r = await authAPI.login(form)
      localStorage.setItem('token', r.data.token)
      setUser(r.data.user)
      toast(`Welcome back, ${r.data.user.name.split(' ')[0]}! 👋`)
      setView(r.data.user.role === 'admin' ? 'admin' : 'dashboard')
    } catch (err) { toast(err.response?.data?.error || 'Login failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand" onClick={() => setView('landing')}><span className="brand-dot" /> SignalCMS</div>
        <h2>Sign In</h2>
        <p className="auth-sub">Access your trading signals dashboard</p>
        <div className="form-group">
          <label>Email Address</label>
          <input placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="Your password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <p className="hint">Demo: admin@signals.io / admin123</p>
        <button className="btn-primary w-full" onClick={handle} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        <button className="back-btn" onClick={() => setView('forgot')} style={{ color: 'var(--accent)', alignSelf: 'flex-end', fontSize: '.82rem' }}>Forgot password?</button>
        <div className="auth-divider"><span>New here?</span></div>
        <button className="btn-ghost w-full" onClick={() => setView('register')}>Create Free Account</button>
        <button className="back-btn" onClick={() => setView('landing')}>← Back to home</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER — live field checks, referral code
// ══════════════════════════════════════════════════════════════════════════════
function Register({ setView, setUser }) {
  const [form, setForm] = useState({ name:'', username:'', email:'', phone:'', password:'', referral_code:'' })
  const [checks, setChecks] = useState({ username: null, email: null, phone: null })
  const [referrerName, setReferrerName] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef({})

  const checkField = (field, value) => {
    clearTimeout(debounceRef.current[field])
    if (!value || value.trim().length < 2) { setChecks(c => ({ ...c, [field]: null })); return }
    setChecks(c => ({ ...c, [field]: 'checking' }))
    debounceRef.current[field] = setTimeout(async () => {
      try {
        const r = await authAPI.checkField(field, value.trim())
        setChecks(c => ({ ...c, [field]: r.data.available ? 'ok' : 'err' }))
      } catch { setChecks(c => ({ ...c, [field]: null })) }
    }, 600)
  }

  const checkReferral = (code) => {
    clearTimeout(debounceRef.current.referral)
    setReferrerName(null)
    if (!code || code.trim().length < 4) return
    debounceRef.current.referral = setTimeout(async () => {
      try {
        const r = await authAPI.checkField('referral', code.trim().toUpperCase())
        setReferrerName(r.data.available ? null : r.data.name || 'Valid referrer found')
      } catch { setReferrerName(null) }
    }, 600)
  }

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (['username','email','phone'].includes(k)) checkField(k, v)
    if (k === 'referral_code') checkReferral(v)
  }

  const pwStrength = () => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = pwStrength()
  const strengthColor = ['#ef4444','#f59e0b','#3b82f6','#22c55e'][strength - 1] || '#ef4444'
  const strengthLabel = ['','Weak','Fair','Good','Strong'][strength]

  const handle = async () => {
    if (!form.name || !form.username || !form.email || !form.password)
      { toast('Name, username, email and password are required', 'error'); return }
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    if (checks.email === 'err') { toast('Email already registered', 'error'); return }
    if (checks.username === 'err') { toast('Username already taken', 'error'); return }
    if (checks.phone === 'err') { toast('Phone number already registered', 'error'); return }
    setLoading(true)
    try {
      const r = await authAPI.register(form)
      localStorage.setItem('token', r.data.token)
      setUser(r.data.user)
      toast('Account created! Welcome to SignalCMS 🎉')
      setView('dashboard')
    } catch (err) { toast(err.response?.data?.error || 'Registration failed', 'error') }
    finally { setLoading(false) }
  }

  const FieldMsg = ({ field }) => {
    const s = checks[field]
    if (!s) return null
    if (s === 'checking') return <span className="field-msg checking">Checking…</span>
    if (s === 'ok')  return <span className="field-msg ok">✓ Available</span>
    if (s === 'err') return <span className="field-msg err">✕ Already taken</span>
    return null
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-brand" onClick={() => setView('landing')}><span className="brand-dot" /> SignalCMS</div>
        <h2>Create Free Account</h2>
        <p className="auth-sub">Register now — subscribe later to access signals</p>

        <div className="form-row">
          <div className="form-group">
            <label>Full Name *</label>
            <input placeholder="John Doe" value={form.name} onChange={e => setField('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input placeholder="johndoe" className={checks.username === 'ok' ? 'success' : checks.username === 'err' ? 'error' : ''}
              value={form.username} onChange={e => setField('username', e.target.value.toLowerCase().replace(/\s/g,''))} />
            <FieldMsg field="username" />
          </div>
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input placeholder="you@example.com" className={checks.email === 'ok' ? 'success' : checks.email === 'err' ? 'error' : ''}
            value={form.email} onChange={e => setField('email', e.target.value)} />
          <FieldMsg field="email" />
        </div>

        <div className="form-group">
          <label>Phone Number <small style={{color:'var(--text-3)'}}>(optional)</small></label>
          <input placeholder="+234 800 000 0000" className={checks.phone === 'ok' ? 'success' : checks.phone === 'err' ? 'error' : ''}
            value={form.phone} onChange={e => setField('phone', e.target.value)} />
          <FieldMsg field="phone" />
        </div>

        <div className="form-group">
          <label>Password *</label>
          <input type="password" placeholder="Min. 8 characters" value={form.password}
            onChange={e => setField('password', e.target.value)} />
          {form.password && (
            <div>
              <div className="pass-strength" style={{ width: `${strength * 25}%`, background: strengthColor, marginTop: '.4rem' }} />
              <span style={{ fontSize: '.72rem', color: strengthColor }}>{strengthLabel}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Referral Code <small style={{color:'var(--text-3)'}}>(optional)</small></label>
          <input placeholder="e.g. JOHN4X2K" value={form.referral_code}
            onChange={e => setField('referral_code', e.target.value.toUpperCase())} />
          {referrerName && (
            <div className="referral-info">🎁 Referral code valid — you both earn rewards!</div>
          )}
        </div>

        <button className="btn-primary w-full" onClick={handle} disabled={loading || checks.email === 'err' || checks.username === 'err'}>
          {loading ? 'Creating account…' : 'Create Free Account'}
        </button>
        <p className="auth-switch">Already have an account? <button onClick={() => setView('login')}>Sign In</button></p>
        <button className="back-btn" onClick={() => setView('landing')}>← Back to home</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
function ForgotPassword({ setView }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [token, setToken]     = useState('')
  const [newPass, setNewPass] = useState('')
  const [resetting, setResetting] = useState(false)

  const sendReset = async () => {
    if (!email) { toast('Enter your email', 'error'); return }
    setLoading(true)
    try {
      const r = await authAPI.forgotPassword({ email })
      setSent(true)
      if (r.data.dev_token) setToken(r.data.dev_token) // dev only
      toast('Reset link sent if email exists')
    } catch { toast('Something went wrong', 'error') }
    finally { setLoading(false) }
  }

  const resetPass = async () => {
    if (!token || !newPass) { toast('Enter token and new password', 'error'); return }
    if (newPass.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    setResetting(true)
    try {
      await authAPI.resetPassword({ token, newPassword: newPass })
      toast('Password reset! You can now log in.')
      setView('login')
    } catch (err) { toast(err.response?.data?.error || 'Reset failed', 'error') }
    finally { setResetting(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand" onClick={() => setView('landing')}><span className="brand-dot" /> SignalCMS</div>
        <h2>{sent ? 'Reset Password' : 'Forgot Password'}</h2>
        <p className="auth-sub">{sent ? 'Enter the reset token from your email' : 'Enter your email to receive a reset link'}</p>

        {!sent ? (
          <>
            <div className="form-group">
              <label>Email Address</label>
              <input placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendReset()} />
            </div>
            <button className="btn-primary w-full" onClick={sendReset} disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Reset Token</label>
              <input placeholder="Paste token from email" value={token} onChange={e => setToken(e.target.value)}
                style={{ fontFamily: 'var(--mono)', fontSize: '.82rem' }} />
              <small>Check your email inbox. In dev mode token is logged to server console.</small>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Min. 8 characters" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={resetPass} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset Password'}</button>
          </>
        )}
        <button className="back-btn" onClick={() => setView('login')}>← Back to Sign In</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ user, setUser, onLogout, setView }) {
  const [tab, setTab]               = useState('signals')
  const [signals, setSignals]       = useState([])
  const [tradeTab, setTradeTab]     = useState('active')
  const [trades, setTrades]         = useState([])
  const [sub, setSub]               = useState(null)
  const [payments, setPayments]     = useState([])
  const [referrals, setReferrals]   = useState(null)
  const [editCh, setEditCh]         = useState(user.channels || [])
  const [chForm, setChForm]         = useState({ whatsapp: user.whatsapp || '', telegram: user.telegram || '' })
  const [saving, setSaving]         = useState(false)
  const [loadSig, setLoadSig]       = useState(true)
  const [sigFilter, setSigFilter]   = useState('active')
  const [catFilter, setCatFilter]   = useState('all')
  const [liveAlert, setLiveAlert]   = useState(null)
  const [sideOpen, setSideOpen]     = useState(false)

  const loadSignals = useCallback(() => {
    if (user.subscription_approved) {
      signalsAPI.getAll({ limit: 50 }).then(r => setSignals(r.data)).catch(() => {}).finally(() => setLoadSig(false))
    } else setLoadSig(false)
  }, [user.subscription_approved])

  const loadTrades = useCallback(() => {
    usersAPI.myTrades().then(r => setTrades(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    loadSignals()
    loadTrades()
    usersAPI.mySubscription().then(r => setSub(r.data)).catch(() => {})
    paymentsAPI.myPayments().then(r => setPayments(r.data)).catch(() => {})
    authAPI.myReferrals().then(r => setReferrals(r.data)).catch(() => {})
  }, [loadSignals, loadTrades])

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'new_signal') {
      setSignals(prev => [msg.signal, ...prev])
      setLiveAlert(msg.signal)
      setTimeout(() => setLiveAlert(null), 8000)
      toast(`📡 New Signal: ${msg.signal.title}`)
    }
    if (msg.type === 'subscription_approved') {
      toast(`✅ ${msg.message}`)
      authAPI.me().then(r => setUser(r.data)).catch(() => {})
      loadSignals()
    }
    if (msg.type === 'subscription_rejected') toast(`❌ ${msg.message}`, 'error')
    if (msg.type === 'referral_commission') toast(`💰 ${msg.message}`)
  }, [loadSignals, setUser])
  useWebSocket(handleWsMessage)

  const toggleCh = ch => setEditCh(p => p.includes(ch) ? p.filter(c => c !== ch) : [...p, ch])
  const savePrefs = async () => {
    setSaving(true)
    try {
      const r = await authAPI.updateProfile({ channels: editCh, whatsapp: chForm.whatsapp, telegram: chForm.telegram })
      setUser(r.data)
      toast('Preferences saved ✓')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const copyRef = () => {
    navigator.clipboard.writeText(referrals?.referral_code || '').then(() => toast('Referral code copied! 🎉'))
  }

  const isSubscribed = user.subscription_approved && user.subscription_status === 'active'

  const filteredSignals = signals.filter(s => {
    if (sigFilter !== 'all' && s.status !== sigFilter) return false
    if (catFilter !== 'all' && s.category !== catFilter) return false
    return true
  })

  const filteredTrades = trades.filter(t => tradeTab === 'all' ? true : t.status === tradeTab)

  const navItems = [
    ['signals',       '📊', 'Signals'],
    ['trades',        '📈', 'Trade History'],
    ['notifications', '🔔', 'Notifications'],
    ['subscription',  '💳', 'Subscription'],
    ['referrals',     '🎁', 'Referrals'],
  ]

  const navigate = (t) => { setTab(t); setSideOpen(false) }

  return (
    <div className="dashboard">
      {/* Mobile Header */}
      <div className="mob-header">
        <div className="nav-brand"><span className="brand-dot" /> SignalCMS</div>
        <button className="hamburger" onClick={() => setSideOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}

      {/* Live Alert */}
      {liveAlert && (
        <div className="live-alert">
          <span className="live-alert-dot" />
          <strong>LIVE:</strong> {liveAlert.type} — {liveAlert.asset} | Entry: {liveAlert.entry} | TP: {liveAlert.tp}
          <button onClick={() => setLiveAlert(null)}>✕</button>
        </div>
      )}

      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><span className="brand-dot" /> SignalCMS</div>
        <div className="user-info">
          <div className="avatar">{user.avatar}</div>
          <div>
            <strong>{user.name}</strong>
            <span className={`plan-tag ${user.plan}`}>{user.plan.toUpperCase()}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(([id, icon, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => navigate(id)}>{icon} {label}</button>
          ))}
        </nav>
        <button className="logout-btn" onClick={onLogout}>← Sign Out</button>
      </aside>

      <main className="dash-main">
        <div className="dash-header">
          <h1>{navItems.find(n => n[0] === tab)?.[2]}</h1>
          {isSubscribed
            ? <div className="live-badge">🔴 LIVE</div>
            : <div className="free-badge">FREE PLAN</div>
          }
        </div>

        {/* ── SIGNALS ── */}
        {tab === 'signals' && (
          !isSubscribed ? (
            <div className="upgrade-wall">
              <div className="upgrade-icon">📡</div>
              <h2>Subscribe to Access Signals</h2>
              <p>You need an active subscription to view and receive trading signals.</p>
              <button className="btn-primary lg" onClick={() => setTab('subscription')}>View Plans →</button>
            </div>
          ) : (
            <div>
              <div className="dash-stats">
                <div className="stat"><span>Shown</span><strong>{filteredSignals.length}</strong></div>
                <div className="stat"><span>Active</span><strong className="up">{signals.filter(s=>s.status==='active').length}</strong></div>
                <div className="stat"><span>Closed</span><strong>{signals.filter(s=>s.status==='closed').length}</strong></div>
                <div className="stat"><span>My Channels</span><strong>{(user.channels||[]).length}</strong></div>
              </div>
              <div className="filter-bar">
                <select value={sigFilter} onChange={e => setSigFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option value="all">All Markets</option>
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                  <option value="commodities">Commodities</option>
                  <option value="stocks">Stocks</option>
                </select>
              </div>
              {loadSig
                ? <div className="loading-msg"><div className="loading-spinner" /></div>
                : filteredSignals.length === 0
                  ? <div className="empty-state"><div className="empty-icon">📭</div><p>No signals match this filter.</p></div>
                  : <div className="signals-grid">{filteredSignals.map(s => <SignalCard key={s.id} signal={s} />)}</div>
              }
            </div>
          )
        )}

        {/* ── TRADE HISTORY ── */}
        {tab === 'trades' && (
          !isSubscribed ? (
            <div className="upgrade-wall">
              <div className="upgrade-icon">📈</div>
              <h2>Trade History Available with Subscription</h2>
              <p>Track your open and closed trades once you have an active plan.</p>
              <button className="btn-primary lg" onClick={() => setTab('subscription')}>Subscribe Now →</button>
            </div>
          ) : (
            <div>
              <div className="dash-stats">
                <div className="stat"><span>Total Trades</span><strong>{trades.length}</strong></div>
                <div className="stat"><span>Active</span><strong className="up">{trades.filter(t=>t.status==='active').length}</strong></div>
                <div className="stat"><span>Closed</span><strong>{trades.filter(t=>t.status==='closed').length}</strong></div>
              </div>
              <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
                {[['active','Active'],['closed','Closed'],['all','All']].map(([v,l]) => (
                  <button key={v} className={tradeTab === v ? 'active' : ''} onClick={() => setTradeTab(v)}>{l}</button>
                ))}
              </div>
              {filteredTrades.length === 0
                ? <div className="empty-state"><div className="empty-icon">📭</div><p>No {tradeTab === 'all' ? '' : tradeTab} trades yet.<br/>Trades you open from signals will appear here.</p></div>
                : (
                  <div className="table-wrap">
                    <table className="signals-table">
                      <thead><tr><th>Signal</th><th>Type</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Status</th><th>Date</th></tr></thead>
                      <tbody>
                        {filteredTrades.map(t => (
                          <tr key={t.id}>
                            <td><strong>{t.asset}</strong><br /><small style={{color:'var(--text-3)'}}>{t.title}</small></td>
                            <td><span className={`type-badge ${t.type?.toLowerCase()}`}>{t.type}</span></td>
                            <td style={{ fontFamily:'var(--mono)' }}>{t.entry_price || t.signal_entry || '—'}</td>
                            <td style={{ fontFamily:'var(--mono)' }}>{t.exit_price || '—'}</td>
                            <td style={{ fontFamily:'var(--mono)', color: t.pnl?.startsWith('+') ? 'var(--buy)' : t.pnl?.startsWith('-') ? 'var(--sell)' : 'var(--text)' }}>{t.pnl || '—'}</td>
                            <td><span className={`status-dot ${t.status}`}>{t.status}</span></td>
                            <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(t.opened_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'notifications' && (
          <div className="notif-settings">
            <p className="section-desc">Choose how you want to receive trading signals. Toggle any channel on or off.</p>
            <div className="ch-settings-grid">
              {CHANNELS.map(c => (
                <div key={c.id} className={`ch-setting-card ${editCh.includes(c.id) ? 'active' : ''}`}
                  onClick={() => toggleCh(c.id)} style={{ '--ch-color': c.color }}>
                  <div className="ch-setting-icon">{c.icon}</div>
                  <strong>{c.label}</strong>
                  <div className={`toggle-pill ${editCh.includes(c.id) ? 'on' : ''}`}>{editCh.includes(c.id) ? 'ON' : 'OFF'}</div>
                  {editCh.includes(c.id) && c.id === 'whatsapp' && (
                    <input className="ch-input" placeholder="+234 800 000 0000" value={chForm.whatsapp} onClick={e => e.stopPropagation()} onChange={e => setChForm(f => ({ ...f, whatsapp: e.target.value }))} />
                  )}
                  {editCh.includes(c.id) && c.id === 'telegram' && (
                    <input className="ch-input" placeholder="@username or Chat ID" value={chForm.telegram} onClick={e => e.stopPropagation()} onChange={e => setChForm(f => ({ ...f, telegram: e.target.value }))} />
                  )}
                  {editCh.includes(c.id) && c.id === 'email' && (
                    <input className="ch-input" value={user.email} disabled onClick={e => e.stopPropagation()} />
                  )}
                  {editCh.includes(c.id) && c.id === 'push' && (
                    <input className="ch-input" placeholder="Auto-registered on this device" disabled onClick={e => e.stopPropagation()} />
                  )}
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={savePrefs} disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</button>
          </div>
        )}

        {/* ── SUBSCRIPTION ── */}
        {tab === 'subscription' && (
          <SubscriptionTab user={user} sub={sub} payments={payments} setView={setView} />
        )}

        {/* ── REFERRALS ── */}
        {tab === 'referrals' && (
          <div className="referral-panel">
            <div className="ref-code-card">
              <h3>🎁 Your Referral Code</h3>
              <p>Share your unique code. Earn {' '}
                <strong style={{color:'var(--buy)'}}>10% commission</strong>
                {' '}in USDT when someone subscribes using your code.
              </p>
              <div className="ref-code-box">
                <span className="ref-code">{referrals?.referral_code || '—'}</span>
                <button className="btn-sm" onClick={copyRef}>Copy</button>
              </div>
            </div>
            <div className="ref-stats">
              <div className="ref-stat-card">
                <span>Total Referrals</span>
                <strong>{referrals?.referrals?.length || 0}</strong>
              </div>
              <div className="ref-stat-card">
                <span>Total Earned (USDT)</span>
                <strong className="up">{referrals?.total_commission?.toFixed(2) || '0.00'}</strong>
              </div>
            </div>
            {referrals?.referrals?.length > 0 ? (
              <div className="table-wrap">
                <table className="signals-table">
                  <thead><tr><th>Referred User</th><th>Plan</th><th>Status</th><th>Commission</th><th>Date</th></tr></thead>
                  <tbody>
                    {referrals.referrals.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.referred_name}</strong><br /><small style={{color:'var(--text-3)'}}>{r.referred_email}</small></td>
                        <td><span className={`plan-tag ${r.referred_plan}`}>{r.referred_plan}</span></td>
                        <td><span className={`status-dot ${r.status === 'paid' ? 'active' : 'pending'}`}>{r.status}</span></td>
                        <td style={{ fontFamily:'var(--mono)', color:'var(--buy)' }}>{r.commission_amount > 0 ? `+${r.commission_amount} USDT` : '—'}</td>
                        <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon">🎁</div><p>No referrals yet. Share your code and start earning!</p></div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Subscription Tab ──────────────────────────────────────────────────────────
function SubscriptionTab({ user, sub, payments, setView }) {
  const isActive  = user.subscription_approved && user.subscription_status === 'active'
  const isPending = user.subscription_status === 'pending'

  return (
    <div className="sub-settings">
      <div className="current-plan-card">
        <div>
          <span>Current Plan</span>
          <h2 className={`plan-name ${user.plan}`}>{user.plan.toUpperCase()}</h2>
          <p>Status: <strong style={{ color: isActive ? 'var(--buy)' : isPending ? 'var(--gold)' : 'var(--text-3)' }}>
            {isActive ? '✅ Active' : isPending ? '⏳ Pending Verification' : 'Inactive'}
          </strong></p>
          {sub?.expires_at && <p className="expires">Expires: {new Date(sub.expires_at).toLocaleDateString()}</p>}
        </div>
        {isActive
          ? <div className="plan-active-icon">✅</div>
          : <button className="btn-primary" onClick={() => setView('subscribe')}>Subscribe Now →</button>
        }
      </div>

      {isPending && (
        <div className="pending-notice">⏳ Your payment is being reviewed. You'll be notified once verified (usually within 24h).</div>
      )}

      {payments.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Payment History</h3>
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table className="signals-table">
              <thead><tr><th>Plan</th><th>Amount</th><th>Tx ID</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><span className={`plan-tag ${p.plan}`}>{p.plan}</span></td>
                    <td style={{ fontFamily:'var(--mono)' }}>{p.amount} {p.currency}</td>
                    <td style={{ fontFamily:'var(--mono)', fontSize:'.75rem', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis' }} title={p.tx_hash}>{p.tx_hash}</td>
                    <td><span className={`status-dot ${p.status==='verified'?'active':p.status==='pending'?'pending':'closed'}`}>{p.status}</span></td>
                    <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(p.submitted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIBE — 3-step crypto payment
// ══════════════════════════════════════════════════════════════════════════════
function Subscribe({ user, setView }) {
  const [plans, setPlans]     = useState([])
  const [wallets, setWallets] = useState({})
  const [support, setSupport] = useState({})
  const [selected, setSelected] = useState(null)
  const [selWallet, setSelWallet] = useState('')
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState({ tx_hash: '', currency: '' })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState('')

  useEffect(() => {
    paymentsAPI.getPlans().then(r => {
      setPlans(r.data.plans); setWallets(r.data.wallets)
      setSupport({ whatsapp: r.data.support_whatsapp, email: r.data.support_email })
    }).catch(() => {})
  }, [])

  const activeWallets = Object.entries(wallets).filter(([, addr]) => addr?.trim() !== '')
  const copyAddr = (addr) => { navigator.clipboard.writeText(addr).then(() => { setCopied(addr); setTimeout(() => setCopied(''), 2000) }) }

  const submitPayment = async () => {
    if (!form.tx_hash.trim()) { toast('Enter your transaction ID', 'error'); return }
    if (!selWallet) { toast('Select a payment method', 'error'); return }
    setLoading(true)
    try {
      await paymentsAPI.submit({ plan: selected.id, currency: form.currency, tx_hash: form.tx_hash.trim(), wallet_address: wallets[selWallet] })
      toast('✅ Payment submitted! Admin will verify shortly.')
      setView('dashboard')
    } catch (err) { toast(err.response?.data?.error || 'Submission failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="subscribe-page">
      <div className="subscribe-header">
        <button className="back-btn" onClick={() => setView('dashboard')}>← Dashboard</button>
        <div className="nav-brand"><span className="brand-dot" /> SignalCMS</div>
        <div style={{ width: 80 }} />
      </div>

      {step === 1 && (
        <div className="subscribe-body">
          <h1>Choose Your Plan</h1>
          <p className="subscribe-sub">Pay with crypto — instant, borderless, secure</p>
          <div className="plans-grid">
            {plans.map((p, i) => (
              <div key={p.id} className={`plan-card ${selected?.id===p.id?'plan-selected':''} ${i===1?'plan-featured':''}`} onClick={() => setSelected(p)}>
                {i === 1 && <span className="plan-badge">POPULAR</span>}
                {selected?.id === p.id && <span className="plan-check">✓</span>}
                <h3>{p.name}</h3>
                <div className="plan-price"><span>{p.price}</span> {p.currency}<small>/{p.duration} days</small></div>
                <ul className="plan-features">
                  <li>✓ All trading signals</li>
                  <li>✓ All notification channels</li>
                  <li>✓ Real-time delivery</li>
                  <li>✓ Trade history tracking</li>
                  {i > 0 && <li>✓ Priority support</li>}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:'2rem' }}>
            <button className="btn-primary lg" onClick={() => { if (!selected) { toast('Select a plan', 'error'); return } setStep(2) }}>
              Continue with {selected?.name || 'a plan'} →
            </button>
          </div>
        </div>
      )}

      {step === 2 && selected && (
        <div className="subscribe-body">
          <h1>Make Payment</h1>
          <div className="payment-summary">
            <span>Plan: <strong>{selected.name}</strong></span>
            <span>Amount: <strong>{selected.price} {selected.currency}</strong></span>
            <span>Duration: <strong>{selected.duration} days</strong></span>
          </div>
          {activeWallets.length === 0
            ? <div className="no-wallets">⚠️ No payment wallets configured yet. Contact support.</div>
            : <>
                <h3 style={{ marginBottom: '1rem' }}>Select Payment Method</h3>
                <div className="wallet-list">
                  {activeWallets.map(([key, addr]) => (
                    <div key={key} className={`wallet-card ${selWallet===key?'active':''}`}
                      onClick={() => { setSelWallet(key); setForm(f => ({ ...f, currency: key.split('_')[0].toUpperCase() })) }}>
                      <div className="wallet-header">
                        <strong>{CRYPTO_LABELS[key] || key}</strong>
                        {selWallet === key && <span className="wallet-check">✓</span>}
                      </div>
                      {selWallet === key && (
                        <div className="wallet-address-box">
                          <p className="wallet-addr">{addr}</p>
                          <button className="btn-sm" onClick={e => { e.stopPropagation(); copyAddr(addr) }}>
                            {copied === addr ? '✓ Copied!' : 'Copy Address'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selWallet && (
                  <div className="payment-instructions">
                    <h4>📋 Instructions</h4>
                    <ol>
                      <li>Copy the wallet address above</li>
                      <li>Send exactly <strong>{selected.price} {selected.currency}</strong> to that address</li>
                      <li>Save your transaction hash/ID from your wallet</li>
                      <li>Click "I've Sent" and paste the transaction ID on the next step</li>
                    </ol>
                  </div>
                )}
              </>
          }
          <div style={{ display:'flex', gap:'1rem', marginTop:'2rem' }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
            {activeWallets.length > 0 && <button className="btn-primary" onClick={() => { if (!selWallet) { toast('Select a payment method', 'error'); return } setStep(3) }}>I've Sent Payment →</button>}
          </div>
          {(support.whatsapp || support.email) && (
            <p className="support-note" style={{ marginTop:'1.5rem' }}>Need help? {support.whatsapp && `WhatsApp: ${support.whatsapp}`}{support.whatsapp && support.email && ' · '}{support.email && `Email: ${support.email}`}</p>
          )}
        </div>
      )}

      {step === 3 && selected && (
        <div className="subscribe-body">
          <h1>Submit Transaction ID</h1>
          <p className="subscribe-sub">Paste the transaction hash from your wallet after sending.</p>
          <div className="tx-form">
            <div className="form-group">
              <label>Transaction ID / Hash *</label>
              <input placeholder="e.g. 0xabc123... or txid..." value={form.tx_hash}
                onChange={e => setForm(f => ({ ...f, tx_hash: e.target.value }))}
                style={{ fontFamily:'var(--mono)', fontSize:'.85rem' }} />
              <small>Found in your wallet's transaction history</small>
            </div>
            <div className="payment-confirm-summary">
              <div><span>Plan</span><strong>{selected.name}</strong></div>
              <div><span>Amount</span><strong>{selected.price} {selected.currency}</strong></div>
              <div><span>Method</span><strong>{CRYPTO_LABELS[selWallet] || selWallet}</strong></div>
            </div>
            <div style={{ display:'flex', gap:'1rem' }}>
              <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" onClick={submitPayment} disabled={loading}>{loading ? 'Submitting…' : '✅ Submit for Verification'}</button>
            </div>
            <p className="verify-note">⏱ Admin verifies within 1–24h. You'll receive a notification once approved.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════════════════════════════════════════════
function AdminPanel({ user, onLogout }) {
  const [tab, setTab]           = useState('post')
  const [signals, setSignals]   = useState([])
  const [users, setUsers]       = useState([])
  const [pendingPay, setPendingPay] = useState([])
  const [allPay, setAllPay]     = useState([])
  const [sigStats, setSigStats] = useState({})
  const [uStats, setUStats]     = useState({})
  const [settings, setSettings] = useState({})
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [broadcasting, setBroadcasting]   = useState(false)
  const [rejectModal, setRejectModal]     = useState(null)
  const [rejectNote, setRejectNote]       = useState('')
  const [sideOpen, setSideOpen]           = useState(false)
  const [sigTab, setSigTab]               = useState('all')
  const [viewUserTrades, setViewUserTrades] = useState(null)
  const [userTrades, setUserTrades]       = useState([])
  const [userTradeTab, setUserTradeTab]   = useState('active')
  const [newSig, setNewSig]   = useState({ title:'', type:'BUY', asset:'', entry:'', sl:'', tp:'', pips:'', confidence:80, category:'forex', notes:'' })

  useWebSocket(useCallback(() => {}, []))

  const load = useCallback(() => {
    signalsAPI.getAll({ limit: 200 }).then(r => setSignals(r.data)).catch(() => {})
    signalsAPI.stats().then(r => setSigStats(r.data)).catch(() => {})
    usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {})
    usersAPI.getStats().then(r => setUStats(r.data)).catch(() => {})
    paymentsAPI.pending().then(r => setPendingPay(r.data)).catch(() => {})
    paymentsAPI.all().then(r => setAllPay(r.data)).catch(() => {})
    settingsAPI.get().then(r => setSettings(r.data)).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const loadUserTrades = async (uid) => {
    try { const r = await usersAPI.getUserTrades(uid); setUserTrades(r.data) }
    catch { setUserTrades([]) }
  }

  const postSignal = async () => {
    if (!newSig.title || !newSig.asset) { toast('Title and asset required', 'error'); return }
    setBroadcasting(true)
    try {
      await signalsAPI.create(newSig)
      toast('📡 Signal posted & broadcast!')
      setNewSig({ title:'', type:'BUY', asset:'', entry:'', sl:'', tp:'', pips:'', confidence:80, category:'forex', notes:'' })
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed to post', 'error') }
    finally { setBroadcasting(false) }
  }

  const verifyPay = async (id) => {
    try { await paymentsAPI.verify(id); toast('✅ Payment verified & subscription activated!'); load() }
    catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
  }
  const rejectPay = async () => {
    try { await paymentsAPI.reject(rejectModal, rejectNote); toast('Payment rejected'); setRejectModal(null); setRejectNote(''); load() }
    catch { toast('Failed', 'error') }
  }

  const saveSettings = async () => {
    try { await settingsAPI.save(settings); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); toast('Settings saved ✓') }
    catch { toast('Failed to save', 'error') }
  }

  const upd  = (k, v) => setNewSig(s => ({ ...s, [k]: v }))
  const updS = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  const filteredSignals = sigTab === 'all' ? signals : signals.filter(s => s.status === sigTab)

  const filteredUserTrades = userTrades.filter(t => userTradeTab === 'all' ? true : t.status === userTradeTab)

  const navItems = [
    ['post',     '📡', 'Post Signal', null],
    ['manage',   '📋', 'Signals',     null],
    ['payments', '💰', 'Payments',    pendingPay.length > 0 ? pendingPay.length : null],
    ['users',    '👥', 'Users',       null],
    ['settings', '⚙️', 'Settings',    null],
  ]

  const navigate = (t) => { setTab(t); setSideOpen(false) }

  return (
    <div className="dashboard">
      <div className="mob-header">
        <div className="nav-brand"><span className="brand-dot red" /> Admin</div>
        <button className="hamburger" onClick={() => setSideOpen(o => !o)}><span /><span /><span /></button>
      </div>
      {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}

      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject Payment</h3>
            <textarea placeholder="Reason for rejection (optional)…" value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} />
            <div style={{ display:'flex', gap:'1rem', marginTop:'1rem' }}>
              <button className="btn-ghost" onClick={() => { setRejectModal(null); setRejectNote('') }}>Cancel</button>
              <button className="btn-primary danger" onClick={rejectPay}>Reject Payment</button>
            </div>
          </div>
        </div>
      )}

      {viewUserTrades && (
        <div className="modal-overlay" onClick={() => setViewUserTrades(null)}>
          <div className="modal" style={{ maxWidth: 720, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <h3>Trade History — {viewUserTrades.name}</h3>
              <button onClick={() => setViewUserTrades(null)} style={{ color:'var(--text-3)', fontSize:'1.1rem' }}>✕</button>
            </div>
            <div className="tab-bar" style={{ marginBottom:'1rem' }}>
              {[['active','Active'],['closed','Closed'],['all','All']].map(([v,l]) => (
                <button key={v} className={userTradeTab===v?'active':''} onClick={() => setUserTradeTab(v)}>{l}</button>
              ))}
            </div>
            {filteredUserTrades.length === 0
              ? <div className="empty-state" style={{ padding:'2rem' }}><p>No {userTradeTab==='all'?'':userTradeTab} trades found.</p></div>
              : <div style={{ overflowX:'auto' }}>
                  <table className="signals-table">
                    <thead><tr><th>Signal</th><th>Type</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {filteredUserTrades.map(t => (
                        <tr key={t.id}>
                          <td><strong>{t.asset}</strong><br /><small style={{color:'var(--text-3)'}}>{t.title}</small></td>
                          <td><span className={`type-badge ${t.type?.toLowerCase()}`}>{t.type}</span></td>
                          <td style={{ fontFamily:'var(--mono)' }}>{t.entry_price||t.signal_entry||'—'}</td>
                          <td style={{ fontFamily:'var(--mono)' }}>{t.exit_price||'—'}</td>
                          <td style={{ fontFamily:'var(--mono)', color: t.pnl?.startsWith('+') ? 'var(--buy)' : t.pnl?.startsWith('-') ? 'var(--sell)' : 'inherit' }}>{t.pnl||'—'}</td>
                          <td><span className={`status-dot ${t.status}`}>{t.status}</span></td>
                          <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(t.opened_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><span className="brand-dot red" /> Admin</div>
        <div className="user-info">
          <div className="avatar admin-av">A</div>
          <div><strong>Administrator</strong><span className="plan-tag vip">ADMIN</span></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(([id, icon, label, badge]) => (
            <button key={id} className={tab===id?'active':''} onClick={() => navigate(id)}>
              {icon} {label} {badge && <span className="nav-badge">{badge}</span>}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={onLogout}>← Sign Out</button>
      </aside>

      <main className="dash-main">
        <div className="dash-header">
          <h1>{navItems.find(n=>n[0]===tab)?.[2]}</h1>
          <div className="admin-badge">ADMIN</div>
        </div>

        {/* ── POST SIGNAL ── */}
        {tab === 'post' && (
          <div className="post-signal">
            <div className="post-form">
              <div className="form-row">
                <div className="form-group"><label>Signal Title *</label><input placeholder="e.g. BTC/USD STRONG BUY" value={newSig.title} onChange={e => upd('title', e.target.value)} /></div>
                <div className="form-group"><label>Asset *</label><input placeholder="e.g. BTC/USD" value={newSig.asset} onChange={e => upd('asset', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Type</label>
                  <select value={newSig.type} onChange={e => upd('type', e.target.value)}>
                    <option>BUY</option><option>SELL</option><option>HOLD</option>
                  </select>
                </div>
                <div className="form-group"><label>Category</label>
                  <select value={newSig.category} onChange={e => upd('category', e.target.value)}>
                    <option value="forex">Forex</option><option value="crypto">Crypto</option>
                    <option value="commodities">Commodities</option><option value="stocks">Stocks</option>
                  </select>
                </div>
              </div>
              <div className="form-row three">
                <div className="form-group"><label>Entry</label><input placeholder="Entry price" value={newSig.entry} onChange={e => upd('entry', e.target.value)} /></div>
                <div className="form-group"><label>Stop Loss</label><input placeholder="SL" value={newSig.sl} onChange={e => upd('sl', e.target.value)} /></div>
                <div className="form-group"><label>Take Profit</label><input placeholder="TP" value={newSig.tp} onChange={e => upd('tp', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Pips</label><input placeholder="+280" value={newSig.pips} onChange={e => upd('pips', e.target.value)} /></div>
                <div className="form-group"><label>Confidence: {newSig.confidence}%</label>
                  <input type="range" min="50" max="99" value={newSig.confidence} onChange={e => upd('confidence', Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group"><label>Analysis Notes</label><input placeholder="Optional notes for subscribers…" value={newSig.notes} onChange={e => upd('notes', e.target.value)} /></div>
              <div className="broadcast-targets">
                <h4>📡 Broadcast Channels</h4>
                <div className="ch-pills">
                  {CHANNELS.map(c => <span key={c.id} className="ch-pill" style={{ background:c.color+'22', color:c.color, border:`1px solid ${c.color}44` }}>{c.icon} {c.label}</span>)}
                </div>
                <p className="hint">Sent to all active subscribers via WebSocket + Email/Telegram/WhatsApp/Push</p>
              </div>
              <button className="btn-primary lg post-btn" onClick={postSignal} disabled={broadcasting}>
                {broadcasting ? '📡 Broadcasting…' : '📡 Post & Broadcast Signal'}
              </button>
            </div>
            <div className="preview-panel">
              <h4>Preview</h4>
              {newSig.asset
                ? <SignalCard signal={{ ...newSig, status:'active', created_at: new Date().toISOString() }} />
                : <div className="preview-empty">Fill form to preview</div>
              }
            </div>
          </div>
        )}

        {/* ── MANAGE SIGNALS ── */}
        {tab === 'manage' && (
          <div>
            <div className="dash-stats">
              <div className="stat"><span>Total</span><strong>{sigStats.total||0}</strong></div>
              <div className="stat"><span>Active</span><strong className="up">{sigStats.active||0}</strong></div>
              <div className="stat"><span>Closed</span><strong>{sigStats.closed||0}</strong></div>
              <div className="stat"><span>Today</span><strong>{sigStats.today||0}</strong></div>
            </div>
            <div className="tab-bar" style={{ marginBottom:'1rem' }}>
              {[['all','All'],['active','Active'],['closed','Closed']].map(([v,l]) => (
                <button key={v} className={sigTab===v?'active':''} onClick={() => setSigTab(v)}>{l}</button>
              ))}
            </div>
            <div className="table-wrap">
              <table className="signals-table">
                <thead><tr><th>Signal</th><th>Type</th><th>Entry</th><th>TP / SL</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredSignals.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.asset}</strong><br /><small style={{color:'var(--text-3)'}}>{s.title}</small></td>
                      <td><span className={`type-badge ${s.type?.toLowerCase()}`}>{s.type}</span></td>
                      <td style={{ fontFamily:'var(--mono)' }}>{s.entry||'—'}</td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:'.8rem' }}>
                        <span className="up">{s.tp||'—'}</span> / <span className="down">{s.sl||'—'}</span>
                      </td>
                      <td><span className={`status-dot ${s.status}`}>{s.status}</span></td>
                      <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="action-btns">
                        {s.status === 'active' && (
                          <button className="btn-sm" onClick={async () => { await signalsAPI.updateStatus(s.id,'closed'); load(); toast('Signal closed') }}>Close</button>
                        )}
                        <button className="btn-sm danger" onClick={async () => { if (!confirm('Delete this signal?')) return; await signalsAPI.delete(s.id); load(); toast('Deleted') }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab === 'payments' && (
          <div>
            <div className="dash-stats">
              <div className="stat"><span>Pending</span><strong style={{color:'var(--gold)'}}>{pendingPay.length}</strong></div>
              <div className="stat"><span>Total</span><strong>{allPay.length}</strong></div>
              <div className="stat"><span>Verified</span><strong className="up">{allPay.filter(p=>p.status==='verified').length}</strong></div>
              <div className="stat"><span>Rejected</span><strong className="down">{allPay.filter(p=>p.status==='rejected').length}</strong></div>
            </div>
            {pendingPay.length > 0 && (
              <div className="pending-section">
                <h3>⏳ Pending Verification</h3>
                <div className="pending-cards">
                  {pendingPay.map(p => (
                    <div key={p.id} className="pending-card">
                      <div className="pending-user">
                        <div className="avatar sm">{p.avatar}</div>
                        <div><strong>{p.name}</strong><span>{p.email}</span></div>
                        <span className={`plan-tag ${p.plan}`}>{p.plan}</span>
                      </div>
                      <div className="pending-details">
                        <div><span>Amount</span><strong>{p.amount} {p.currency}</strong></div>
                        <div><span>Submitted</span><strong>{new Date(p.submitted_at).toLocaleString()}</strong></div>
                        <div style={{ gridColumn:'1/-1' }}>
                          <span>Transaction ID</span>
                          <strong style={{ fontFamily:'var(--mono)', fontSize:'.82rem', wordBreak:'break-all' }}>{p.tx_hash}</strong>
                        </div>
                      </div>
                      <div className="pending-actions">
                        <button className="btn-primary" onClick={() => verifyPay(p.id)}>✅ Verify & Activate</button>
                        <button className="btn-sm danger" onClick={() => setRejectModal(p.id)}>❌ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 style={{ margin:'2rem 0 1rem' }}>All Payment History</h3>
            <div className="table-wrap">
              <table className="signals-table">
                <thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Tx ID</th><th>Status</th><th>Note</th><th>Date</th></tr></thead>
                <tbody>
                  {allPay.map(p => (
                    <tr key={p.id}>
                      <td><div className="user-row"><div className="avatar sm">{p.avatar}</div><div><strong>{p.name}</strong><br /><small>{p.email}</small></div></div></td>
                      <td><span className={`plan-tag ${p.plan}`}>{p.plan}</span></td>
                      <td style={{ fontFamily:'var(--mono)' }}>{p.amount} {p.currency}</td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:'.75rem', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.tx_hash}>{p.tx_hash}</td>
                      <td><span className={`status-dot ${p.status==='verified'?'active':p.status==='pending'?'pending':'closed'}`}>{p.status}</span></td>
                      <td style={{ fontSize:'.8rem', color:'var(--text-3)', maxWidth:120 }}>{p.admin_note||'—'}</td>
                      <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(p.submitted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <div className="dash-stats">
              <div className="stat"><span>Total</span><strong>{uStats.total||0}</strong></div>
              <div className="stat"><span>Active</span><strong className="up">{uStats.active||0}</strong></div>
              <div className="stat"><span>Pending</span><strong style={{color:'var(--gold)'}}>{uStats.pending||0}</strong></div>
              <div className="stat"><span>Free</span><strong>{uStats.free||0}</strong></div>
            </div>
            <div className="table-wrap">
              <table className="signals-table">
                <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Referral</th><th>Channels</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-row">
                          <div className="avatar sm">{u.avatar}</div>
                          <div>
                            <strong>{u.name}</strong><br />
                            <small style={{color:'var(--text-3)'}}>{u.email}</small><br />
                            {u.username && <small style={{color:'var(--accent)', fontFamily:'var(--mono)'}}>@{u.username}</small>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`plan-tag ${u.plan}`}>{u.plan}</span></td>
                      <td><span className={`status-dot ${u.subscription_approved?'active':u.subscription_status==='pending'?'pending':'closed'}`}>{u.subscription_approved?'active':u.subscription_status}</span></td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:'.75rem' }}>
                        <span style={{ color:'var(--text-3)' }}>{u.referral_code}</span>
                        {u.referral_commission > 0 && <span style={{ color:'var(--buy)', display:'block' }}>+{u.referral_commission} USDT</span>}
                      </td>
                      <td>{(u.channels||[]).map(c => CHANNELS.find(ch=>ch.id===c)?.icon).join(' ') || '—'}</td>
                      <td style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="action-btns">
                        <button className="btn-sm" onClick={() => { setViewUserTrades(u); loadUserTrades(u.id); setUserTradeTab('active') }}>Trades</button>
                        {u.subscription_approved && <button className="btn-sm danger" onClick={async () => { await usersAPI.revoke(u.id); load(); toast('Revoked') }}>Revoke</button>}
                        <button className="btn-sm danger" onClick={async () => { if (!confirm(`Delete ${u.name}?`)) return; await usersAPI.delete(u.id); load(); toast('Deleted') }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div className="settings-panel">
            <div className="settings-section">
              <h3>💰 Subscription Plans</h3>
              <p className="section-desc">Configure pricing and duration for each plan.</p>
              <div className="settings-grid">
                {['basic','premium','vip'].map(plan => (
                  <div key={plan} className="settings-card">
                    <h4>{plan.toUpperCase()}</h4>
                    <div className="form-group"><label>Name</label><input value={settings[`plan_${plan}_name`]||''} onChange={e => updS(`plan_${plan}_name`, e.target.value)} /></div>
                    <div className="form-group"><label>Price (USDT)</label><input type="number" value={settings[`plan_${plan}_price`]||''} onChange={e => updS(`plan_${plan}_price`, e.target.value)} /></div>
                    <div className="form-group"><label>Duration (days)</label><input type="number" value={settings[`plan_${plan}_duration`]||''} onChange={e => updS(`plan_${plan}_duration`, e.target.value)} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>🎁 Referral Settings</h3>
              <p className="section-desc">Commission paid to referrers when a referred user subscribes.</p>
              <div className="settings-grid two">
                <div className="form-group">
                  <label>Commission Rate (%)</label>
                  <input type="number" min="0" max="100" value={settings['referral_commission_rate']||'10'} onChange={e => updS('referral_commission_rate', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>🔗 Crypto Wallet Addresses</h3>
              <p className="section-desc">Only wallets with addresses filled will be shown to users.</p>
              <div className="settings-grid">
                {Object.entries(CRYPTO_LABELS).map(([key, label]) => (
                  <div key={key} className="form-group">
                    <label>{label}</label>
                    <input placeholder={`Your ${label} wallet`} value={settings[`crypto_${key}`]||''} onChange={e => updS(`crypto_${key}`, e.target.value)}
                      style={{ fontFamily:'var(--mono)', fontSize:'.82rem' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>📞 Support Contact</h3>
              <p className="section-desc">Shown on payment page for user assistance.</p>
              <div className="settings-grid two">
                <div className="form-group"><label>WhatsApp</label><input placeholder="+234 800 000 0000" value={settings['support_whatsapp']||''} onChange={e => updS('support_whatsapp', e.target.value)} /></div>
                <div className="form-group"><label>Email</label><input placeholder="support@yourdomain.com" value={settings['support_email']||''} onChange={e => updS('support_email', e.target.value)} /></div>
              </div>
            </div>

            <div className="settings-section">
              <h3>🏷️ Site Info</h3>
              <div className="settings-grid two">
                <div className="form-group"><label>Site Name</label><input value={settings['site_name']||''} onChange={e => updS('site_name', e.target.value)} /></div>
                <div className="form-group"><label>Tagline</label><input value={settings['site_tagline']||''} onChange={e => updS('site_tagline', e.target.value)} /></div>
              </div>
            </div>

            <button className={`btn-primary lg ${settingsSaved ? 'saved' : ''}`} onClick={saveSettings}>
              {settingsSaved ? '✓ Saved!' : 'Save All Settings'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Signal Card ───────────────────────────────────────────────────────────────
function SignalCard({ signal }) {
  const timeAgo = d => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400) return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }
  return (
    <div className={`signal-card ${signal.type?.toLowerCase()}`}>
      <div className="sc-header">
        <span className={`type-badge ${signal.type?.toLowerCase()}`}>{signal.type}</span>
        <span className={`status-dot ${signal.status}`}>{signal.status}</span>
      </div>
      <h4>{signal.asset || '—'}</h4>
      <p className="sc-title">{signal.title}</p>
      <div className="sc-grid">
        <div><span>Entry</span><strong>{signal.entry||'—'}</strong></div>
        <div><span>Stop Loss</span><strong className="down">{signal.sl||'—'}</strong></div>
        <div><span>Take Profit</span><strong className="up">{signal.tp||'—'}</strong></div>
        <div><span>Pips</span><strong className="up">{signal.pips||'—'}</strong></div>
      </div>
      <div className="sc-footer">
        <div className="confidence-bar">
          <div className="conf-fill" style={{ width: `${signal.confidence}%` }} />
          <span>{signal.confidence}% confidence</span>
        </div>
        <span className="sc-time">{signal.created_at ? timeAgo(signal.created_at) : '—'}</span>
      </div>
      {signal.notes && <p className="sc-notes">{signal.notes}</p>}
      {signal.status === 'closed' && signal.result && (
        <div style={{ marginTop:'.75rem', padding:'.5rem .75rem', background:'var(--bg-2)', borderRadius:8, fontSize:'.82rem', color:'var(--text-2)' }}>
          Result: <strong>{signal.result}</strong>
        </div>
      )}
    </div>
  )
}
