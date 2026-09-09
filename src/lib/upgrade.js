import { supabase } from './supabaseClient.js'

const isProd = import.meta.env.PROD

// The DB layer raises ERRCODE 'P0001' with a message starting PLAN_LIMIT_REACHED.
export function isPlanLimitError(err) {
  if (!err) return false
  return err.code === 'P0001' || /PLAN_LIMIT_REACHED/.test(err.message || '')
}

// Starts a mobile money charge through the momo-checkout Edge Function.
// In dev builds only, falls back to a clearly-marked DEV mock while the
// gateway isn't deployed. In production the fallback is disabled so a
// missing/unreachable function can never grant a free upgrade.
export async function startCharge({ plan, price, phone, network }) {
  try {
    const { data, error } = await supabase.functions.invoke('momo-checkout', {
      body: { plan, amount: price, phone, network },
    })
    if (error) throw error
    if (data?.ok) {
      return { ok: true, provider_ref: data.provider_ref, dev: false }
    }
    return { ok: false, error: data?.error || 'Could not start the mobile money charge.' }
  } catch {
    if (isProd) {
      return { ok: false, error: 'Mobile money is currently unavailable. Please try again later.' }
    }
    const provider_ref = `DEV-${plan}-${price}-${Date.now()}`
    return { ok: true, provider_ref, dev: true }
  }
}

// Verifies the payment SERVER-SIDE (verify-payment Edge Function) and, only
// when the gateway confirms it, applies the plan. DEV fallback uses a
// server-side RPC that refuses anything but DEV- refs.
export async function verifyCharge({ provider_ref, plan, price }) {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { provider_ref },
    })
    if (error) throw error
    if (data?.ok) {
      return { ok: true, plan: data.plan, expires_at: data.expires_at, dev: false }
    }
    return { ok: false, error: data?.error || 'Payment could not be verified. Please try again.' }
  } catch {
    if (isProd) {
      return { ok: false, error: 'Payment could not be verified. Please try again.' }
    }
    // DEV fallback: only accepts DEV- refs, still applied server-side.
    const { data, error } = await supabase.rpc('dev_apply_plan_upgrade', {
      p_ref: provider_ref,
      p_plan: plan,
      p_amount: price,
    })
    if (error) return { ok: false, error: error.message }
    const row = Array.isArray(data) ? data[0] : data
    return { ok: true, plan: row?.plan, expires_at: row?.plan_expires_at, dev: true }
  }
}