import { supabase }     from '../_lib/supabase.js'
import { cors, handleOptions } from '../_lib/cors.js'

export default async function handler(req, res) {
  cors(res)
  if (handleOptions(req, res)) return

  const { field, value } = req.query
  if (!['email','username','phone'].includes(field)) return res.status(400).json({ error: 'Invalid field' })
  if (!value?.trim()) return res.json({ available: false })

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq(field, value.toLowerCase().trim())
    .maybeSingle()

  res.json({ available: !data, message: data ? `${field} is already taken` : `${field} is available` })
}
