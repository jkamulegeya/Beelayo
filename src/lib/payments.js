// Belayo plan-based guest limits + mobile money flow.
// Plans are account-level and enforced in the database. Upgrade payments are
// started client-side, then VERIFIED server-side (Edge Function verify-payment
// / payment-webhook) before profiles.plan is updated — the client is never
// trusted to apply a plan on its own. A DEV-only RPC exists for local work
// while the mock gateway / edge functions are not deployed.

export const FREE_CAPACITY = 10 // free plan: guests per event
export const SLIDER_MAX = 200 // top plan (Deluxe): guests per event
export const FREE_PLAN = 'free'

export const TIERS = [
  { plan: 'Basic', label: 'Basic', upTo: 25, price: 10000 },
  { plan: 'Pro', label: 'Pro', upTo: 50, price: 25000 },
  { plan: 'Pro Max', label: 'Pro Max', upTo: 100, price: 50000 },
  { plan: 'Deluxe', label: 'Deluxe', upTo: 200, price: 100000 },
]

// Guest limit for a plan name ('free' -> 10, Basic -> 25, ...).
export function planLimit(plan) {
  if (!plan || plan === FREE_PLAN) return FREE_CAPACITY
  for (const tier of TIERS) {
    if (tier.plan === plan) return tier.upTo
  }
  return FREE_CAPACITY
}

export function isPlanExpired(account) {
  if (!account?.plan_expires_at) return false
  return new Date(account.plan_expires_at).getTime() < Date.now()
}

export function effectivePlan(account) {
  return account && !isPlanExpired(account) ? account.plan : FREE_PLAN
}

export function formatUgx(amount) {
  return `UGX ${(amount || 0).toLocaleString('en-US')}`
}

export const MOMO_NETWORKS = ['MTN Mobile Money', 'Airtel Money']

export const MOMO_LOGOS = {
  'MTN Mobile Money': '/mtn.png',
  'Airtel Money': '/airtel.jpg',
}

export function isValidUgPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 12
}