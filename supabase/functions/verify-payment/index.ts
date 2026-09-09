import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse, handleCors, mockGateway } from '../_shared/payments.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const PLAN_DURATION_DAYS = 30

async function applyUpgrade(providerRef: string) {
  const { data: intent, error: getErr } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('provider_ref', providerRef)
    .maybeSingle()

  if (getErr || !intent) {
    return jsonResponse({ ok: false, error: 'Payment intent not found' }, 404)
  }
  if (intent.status === 'paid') {
    // Idempotent: already applied from the webhook, return current plan.
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', intent.user_id)
      .single()
    return { ok: true, applied: false, plan: profile?.plan, expires_at: profile?.plan_expires_at }
  }
  if (intent.status !== 'pending') {
    return jsonResponse({ ok: false, error: `Payment intent is ${intent.status}` }, 409)
  }

  // Server-side verification against the gateway (mock in development).
  const gateway = mockGateway()
  const result = await gateway.verify()
  if (result.status !== 'CONFIRMED') {
    await supabase.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id)
    return jsonResponse({ ok: false, error: 'Payment was not confirmed by the gateway' }, 402)
  }

  const expiresAt = new Date(Date.now() + PLAN_DURATION_DAYS * 86400000).toISOString()

  // Mark paid + apply plan atomically (approximate; both are quick writes).
  const { error: updErr } = await supabase
    .from('payment_intents')
    .update({ status: 'paid', phone: intent.phone })
    .eq('id', intent.id)
  if (updErr) throw updErr

  const { error: profErr } = await supabase.from('profiles').upsert(
    { id: intent.user_id, plan: intent.plan, plan_expires_at: expiresAt },
    { onConflict: 'id' }
  )
  if (profErr) throw profErr

  const { error: payErr } = await supabase.from('payments').insert({
    user_id: intent.user_id,
    event_id: null,
    amount: intent.amount,
    tier: intent.plan,
    network: intent.network,
    phone: intent.phone,
    provider_ref: intent.provider_ref,
    status: 'paid',
  })
  if (payErr) throw payErr

  return { ok: true, applied: true, plan: intent.plan, expires_at: expiresAt }
}

Deno.serve(async (req) => {
  if (handleCors(req)) return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const providerRef = String(body.provider_ref || '')
  if (!providerRef) return jsonResponse({ ok: false, error: 'Missing provider_ref' }, 400)

  try {
    const result = await applyUpgrade(providerRef)
    if (result instanceof Response) return result
    return jsonResponse(result, result.ok ? 200 : 400)
  } catch (err) {
    console.error('verify-payment:', err)
    return jsonResponse({ ok: false, error: 'Could not verify and apply the payment. Please retry.' }, 500)
  }
})