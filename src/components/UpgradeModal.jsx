import { useEffect, useState } from 'react'
import { Button } from './ui.jsx'
import {
  TIERS,
  formatUgx,
  MOMO_NETWORKS,
  MOMO_LOGOS,
  isValidUgPhone,
  effectivePlan,
  planLimit,
} from '../lib/payments.js'
import { startCharge, verifyCharge } from '../lib/upgrade.js'

export default function UpgradeModal({ open, onClose, account, onUpgraded }) {
  const [planName, setPlanName] = useState(TIERS[0].plan)
  const [network, setNetwork] = useState(MOMO_NETWORKS[0])
  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    if (open) {
      setPlanName(TIERS[0].plan)
      setNetwork(MOMO_NETWORKS[0])
      setPhone('')
      setError('')
      setReceipt(null)
    }
  }, [open])

  if (!open) return null

  const currentPlan = effectivePlan(account)
  const tier = TIERS.find((t) => t.plan === planName) || TIERS[0]

  const handlePay = async () => {
    setError('')
    if (!isValidUgPhone(phone)) {
      setError('Enter a valid mobile money number (07XX... or +2567XX...).')
      return
    }
    setPaying(true)
    const charge = await startCharge({ plan: tier.plan, price: tier.price, phone, network })
    if (!charge.ok) {
      setPaying(false)
      setError(charge.error || 'Could not start the charge. Try again.')
      return
    }

    const verify = await verifyCharge({ provider_ref: charge.provider_ref, plan: tier.plan, price: tier.price })
    setPaying(false)
    if (!verify.ok) {
      setError(verify.error || 'Payment could not be verified. Please try again.')
      return
    }
    setReceipt({ plan: verify.plan, expires_at: verify.expires_at, ref: charge.provider_ref })
    onUpgraded?.(verify)
  }

  const expiredLabel = () => {
    const exp = account?.plan_expires_at
    return exp ? new Date(exp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-sm border border-[#F6E0E0] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#17255A]">Upgrade guest capacity</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Current plan: <span className="font-semibold text-[#BD1E1E]">{currentPlan === 'free' ? 'Free (10 guests)' : `${currentPlan} (${account?.guest_limit} guests)`}</span>
              {currentPlan !== 'free' && account?.plan_expires_at ? (
                <span> · renews {expiredLabel()}</span>
              ) : null}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {receipt ? (
          <div className="rounded-sm border border-[#EDC8C8] bg-[#FBEEEE] p-4 text-center">
            <p className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#BD1E1E] text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </p>
            <p className="text-sm font-bold text-[#850C0C]">You're on {receipt.plan}</p>
            <p className="mt-0.5 text-xs text-[#A01111]">
              Up to {planLimit(receipt.plan)} guests per event. Valid for 30 days.
            </p>
            <p className="mt-1.5 text-[11px] text-[#BD1E1E]">
              Reference: <span className="font-mono font-semibold">{receipt.ref}</span>
            </p>
            <div className="mt-4">
              <Button onClick={onClose} variant="primary" className="w-full">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tier picker */}
            <div className="space-y-2">
              {TIERS.map((t) => {
                const active = t.plan === planName
                const current = t.plan === currentPlan
                return (
                  <button
                    key={t.plan}
                    type="button"
                    onClick={() => setPlanName(t.plan)}
                    className={`flex w-full items-center justify-between rounded-sm border-2 px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-[#BD1E1E] bg-[#FBEEEE] shadow-sm'
                        : 'border-slate-200 bg-white hover:border-[#EDC8C8]'
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${active ? 'text-[#A01111]' : 'text-slate-800'}`}>{t.label}</span>
                        {current && (
                          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-white">
                            CURRENT
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-500">Up to {t.upTo} guests per event</span>
                    </span>
                    <span className={`text-sm font-bold ${active ? 'text-[#A01111]' : 'text-slate-700'}`}>
                      {formatUgx(t.price)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Payment */}
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold text-slate-700">Pay with mobile money</p>
              <div className="mb-2 grid grid-cols-2 gap-1.5">
                {MOMO_NETWORKS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNetwork(n)}
                    className={`flex items-center justify-center rounded-sm border-2 px-3 py-2 transition ${
                      network === n
                        ? 'border-[#BD1E1E] bg-[#FBEEEE]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <img src={MOMO_LOGOS[n]} alt={n} className="h-6 object-contain" />
                  </button>
                ))}
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile money number (e.g. 0772 123 456)"
                inputMode="tel"
                className="mb-1.5 min-h-[40px] w-full rounded-sm border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#D66464] focus:outline-none focus:ring-2 focus:ring-[#F6E0E0]"
              />
              <p className="mb-2 text-[11px] text-slate-400">
                You'll receive a prompt on your phone to confirm {formatUgx(tier.price)}.
              </p>
              {error && <div className="mb-2 rounded-sm bg-neutral-900 px-3 py-1.5 text-xs text-white">{error}</div>}
              <Button type="button" onClick={handlePay} disabled={paying} className="w-full" variant="primary">
                {paying ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Verifying payment…
                  </>
                ) : (
                  <>
                    Pay {formatUgx(tier.price)} · Upgrade to {tier.label}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}