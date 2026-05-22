import { supabase }     from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'GET')  return requireAdmin(getSettings)(req, res)
  if (req.method === 'POST') return requireAdmin(saveSettings)(req, res)
  res.status(405).json({ error: 'Method not allowed' })
}

async function getSettings(req, res) {
  const { data } = await supabase.from('settings').select('key,value')
  const obj = {}
  ;(data || []).forEach(r => { obj[r.key] = r.value })
  res.json(obj)
}

async function saveSettings(req, res) {
  const updates = req.body
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value: String(value) }))
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Settings saved successfully' })
}
