import { createClient } from 'jsr:@supabase/supabase-js@2'
import { jsonResponse, handleCors, corsHeaders } from '../_shared/payments.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('MOMO_WEBHOOK_SECRET') || ''

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// Backup verification path: the gateway pushes the payment result here even if
// the user closed the tab before the frontend callback fired. Idempotent on
// provider_ref. In production, verify the request signature with webhookSecret.
Deno.serve(async (req) => {
  if (handleCors(req)) return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  // TODO(prod): verify 'x-webhook-signature' header using webhookSecret.
  const signature = req.headers.get('x-webhook-signature')
  if (webhookSecret && !signature) {
    return jsonResponse({ ok: false, error: 'Missing webhook signature' }, 401)
  }

  let payload: { externalId?: string; status?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const status = String(payload.status || '').toUpperCase()
  const externalId = String(payload.externalId || '')
  if (!externalId) {
    return jsonResponse({ ok: false, error: 'Missing externalId' }, 400)
  }
  const providerRef = `MOMO-${externalId}`

  if (status !== 'CONFIRMED') {
    await supabase.from('payment_intents').update({ status: 'failed' }).eq('provider_ref', providerRef)
    return jsonResponse({ ok: false, error: 'Payment not confirmed' }, 200)
  }

  const { data: intent, error: getErr } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('provider_ref', providerRef)
    .maybeSingle()

  if (getErr || !intent) {
    return jsonResponse({ ok: true, ignored: 'unknown_intent' })
  }
  if (intent.status === 'paid') {
    return jsonResponse({ ok: true, duplicate: true })
  }

  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()

  await supabase.from('payment_intents').update({ status: 'paid' }).eq('id', intent.id)
  await supabase.from('profiles').upsert(
    { id: intent.user_id, plan: intent.plan, plan_expires_at: expiresAt },
    { onConflict: 'id' }
  )
  await supabase.from('payments').insert({
    user_id: intent.user_id,
    event_id: null,
    amount: intent.amount,
    tier: intent.plan,
    network: intent.network,
    phone: intent.phone,
    provider_ref: intent.provider_ref,
    status: 'paid',
  })

  return jsonResponse({ ok: true, plan: intent.plan, expires_at: expiresAt })
})