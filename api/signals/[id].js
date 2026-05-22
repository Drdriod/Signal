import { supabase }    from '../_lib/supabase.js'
import { requireAdmin } from '../_lib/auth.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  if (req.method === 'PATCH')  return requireAdmin(patchSignal)(req, res)
  if (req.method === 'DELETE') return requireAdmin(deleteSignal)(req, res)
  res.status(405).json({ error: 'Method not allowed' })
}

async function patchSignal(req, res) {
  const { id } = req.query
  const { status, result } = req.body
  if (!['active','closed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const updates = { status, result: result || null }
  if (status === 'closed') updates.closed_at = new Date().toISOString()

  const { data, error } = await supabase.from('signals').update(updates).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function deleteSignal(req, res) {
  const { id } = req.query
  const { error } = await supabase.from('signals').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Signal deleted' })
}
