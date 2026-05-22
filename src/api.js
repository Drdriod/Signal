import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.reload() }
  return Promise.reject(err)
})

export const authAPI = {
  login:          (d) => api.post('/auth/login',           d),
  register:       (d) => api.post('/auth/register',        d),
  me:             ()  => api.get('/auth/me'),
  updateProfile:  (d) => api.put('/auth/profile',          d),
  changePassword: (d) => api.put('/auth/change-password',  d),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  resetPassword:  (d) => api.post('/auth/reset-password',  d),
  checkField:     (field, value) => api.get(`/auth/check?field=${field}&value=${encodeURIComponent(value)}`),
  myReferrals:    ()  => api.get('/auth/referrals'),
}

export const signalsAPI = {
  getAll:       (p) => api.get('/signals',              { params: p }),
  create:       (d) => api.post('/signals',             d),
  updateStatus: (id, status, result) => api.patch(`/signals/${id}`, { status, result }),
  delete:       (id) => api.delete(`/signals/${id}`),
  stats:        ()  => api.get('/signals/stats'),
}

export const paymentsAPI = {
  getPlans:   ()        => api.get('/payments/plans'),
  submit:     (d)       => api.post('/payments/submit',    d),
  myPayments: ()        => api.get('/payments/my'),
  pending:    ()        => api.get('/payments/pending'),
  all:        ()        => api.get('/payments/all'),
  verify:     (id,note) => api.patch(`/payments/verify?id=${id}`, { admin_note: note }),
  reject:     (id,note) => api.patch(`/payments/reject?id=${id}`, { admin_note: note }),
}

export const usersAPI = {
  getAll:         ()      => api.get('/users'),
  getStats:       ()      => api.get('/users/stats'),
  delete:         (id)    => api.delete(`/users/${id}`),
  revoke:         (id)    => api.patch(`/users/${id}`),
  mySubscription: ()      => api.get('/users/subscription'),
  myTrades:       (p)     => api.get('/users/trades',              { params: p }),
  openTrade:      (d)     => api.post('/users/trades',             d),
  closeTrade:     (id, d) => api.patch(`/users/trades-close?id=${id}`, d),
  getUserTrades:  (id)    => api.get(`/users/${id}`),
}

export const settingsAPI = {
  get:  ()  => api.get('/settings'),
  save: (d) => api.post('/settings', d),
}
