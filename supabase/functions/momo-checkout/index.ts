import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse, handleCors, mockGateway } from '../_shared/payments.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const ALLOWED_PLANS: Record<string, number> = {
  Basic: 10000,
  Pro: 25000,
  'Pro Max': 50000,
  Deluxe: 100000,
}

Deno.serve(async (req) => {
  if (handleCors(req)) return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return jsonResponse({ ok: false, error: 'Missing authorization token' }, 401)

  // Resolve the caller; the anon key resolves to null and is rejected here.
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !user) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const plan = String(body.plan || '')
  const phone = String(body.phone || '')
  const network = String(body.network || '')

  if (!(plan in ALLOWED_PLANS)) {
    return jsonResponse({ ok: false, error: `Unknown plan: ${plan}` }, 400)
  }
  if (!/^\d{9,12}$/.test(phone.replace(/\D/g, ''))) {
    return jsonResponse({ ok: false, error: 'Invalid mobile money number' }, 400)
  }
  if (!['MTN Mobile Money', 'Airtel Money'].includes(network)) {
    return jsonResponse({ ok: false, error: 'Unsupported mobile money network' }, 400)
  }

  const amount = ALLOWED_PLANS[plan]
  const gateway = mockGateway()
  const charge = await gateway.request()
  const provider_ref = `MOMO-${charge.external_id}`

  const { error: insErr } = await supabase.from('payment_intents').insert({
    user_id: user.id,
    provider_ref,
    plan,
    amount,
    network,
    phone,
    status: 'pending',
  })

  if (insErr) {
    console.error('insert payment_intents:', insErr)
    return jsonResponse({ ok: false, error: 'Could not start the charge. Please try again.' }, 500)
  }

  return jsonResponse({
    ok: true,
    provider_ref,
    amount,
    status: 'pending',
    message: `Confirm ${amount} UGX on your phone to finish.`,
  })
})