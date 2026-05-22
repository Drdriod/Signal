// Replaces useWebSocket — uses Supabase Realtime Broadcast instead of raw WebSocket.
// No persistent server process needed. Works perfectly on Vercel serverless.
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let _client = null
const getClient = () => {
  if (!_client && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _client
}

export const useWebSocket = (onMessage) => {
  const subRef = useRef(null)

  const connect = useCallback(() => {
    const supabase = getClient()
    if (!supabase) return  // env vars not set yet

    const userId = (() => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return null
        return JSON.parse(atob(token.split('.')[1])).id
      } catch { return null }
    })()

    // Subscribe to global signals channel (new signals for all subscribers)
    const signalsCh = supabase.channel('signals')
      .on('broadcast', { event: 'new_signal' }, ({ payload }) => {
        onMessage({ type: 'new_signal', signal: payload })
      })
      .subscribe()

    // Subscribe to personal channel (subscription approved/rejected, commissions)
    let personalCh = null
    if (userId) {
      personalCh = supabase.channel(`user_${userId}`)
        .on('broadcast', { event: 'subscription_approved' }, ({ payload }) => onMessage({ type: 'subscription_approved', ...payload }))
        .on('broadcast', { event: 'subscription_rejected' }, ({ payload }) => onMessage({ type: 'subscription_rejected', ...payload }))
        .on('broadcast', { event: 'referral_commission' },   ({ payload }) => onMessage({ type: 'referral_commission',   ...payload }))
        .subscribe()
    }

    subRef.current = { signalsCh, personalCh, supabase }
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => {
      if (subRef.current) {
        const { supabase, signalsCh, personalCh } = subRef.current
        supabase.removeChannel(signalsCh)
        if (personalCh) supabase.removeChannel(personalCh)
      }
    }
  }, [connect])
}
