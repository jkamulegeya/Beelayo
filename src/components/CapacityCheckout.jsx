import { Button } from './ui.jsx'
import { FREE_CAPACITY, SLIDER_MAX, planLimit, effectivePlan } from '../lib/payments.js'

export default function CapacityCheckout({ people, onChange, account, onUpgrade }) {
  const planName = effectivePlan(account)
  const limit = planLimit(planName)
  const max = Math.min(SLIDER_MAX, limit)
  const sliderPct = max > 1 ? ((Math.min(people, max) - 1) / (max - 1)) * 100 : 0
  const isFree = planName === 'free'
  const shown = Math.max(1, Math.min(people, max))

  const handleSlider = (e) => {
    const n = Number(e.target.value)
    onChange(Math.max(1, Math.min(max, n)))
  }

  return (
    <div className="rounded-sm border border-[#F6E0E0] bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#17255A]">Guest capacity</p>
          <p className="text-[11px] text-slate-500">
            {isFree
              ? `Free plan · ${FREE_CAPACITY} guests per event`
              : `${planName} plan · ${limit} guests per event`}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            isFree ? 'bg-slate-100 text-slate-600' : 'bg-gradient-to-r from-[#BD1E1E] to-neutral-900 text-white'
          }`}
        >
          {isFree ? 'FREE' : planName.toUpperCase()}
        </span>
      </div>

      <div className="mb-2.5">
        <div className="mb-1 flex items-end justify-between">
          <label htmlFor="capacity-slider" className="text-xs font-medium text-slate-600">
            Guests you want to invite
          </label>
          <span className="flex flex-col items-end rounded-sm bg-[#F6E0E0] px-2 py-0.5">
            <span className="flex items-baseline gap-1">
              <span className="text-xl font-bold leading-none text-[#A01111]">{shown}</span>
              <span className="text-[10px] font-medium text-[#BD1E1E]">of {limit}</span>
            </span>
          </span>
        </div>
        <input
          id="capacity-slider"
          type="range"
          min={1}
          max={max}
          step={1}
          value={shown}
          onChange={handleSlider}
          disabled={max <= 1}
          className="premium-range w-full"
          style={{
            background: `linear-gradient(to right, #BD1E1E ${sliderPct}%, #E9D9BF ${sliderPct}%)`,
          }}
          aria-label="Number of guests to invite"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
          <span>1</span>
          {/* Ordered, deduped tick labels up to the plan limit */}
          {[
            FREE_CAPACITY,
            ...(limit > FREE_CAPACITY ? [Math.min(25, limit), Math.min(50, limit), Math.min(100, limit)] : []),
          ]
            .filter((n, i, a) => a.indexOf(n) === i && n > 1 && n < max)
            .map((n) => (
              <span key={n}>{n}</span>
            ))}
          <span>{max}</span>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-slate-500">
        {isFree ? (
          <>
            The Free plan covers <span className="font-semibold text-slate-700">{FREE_CAPACITY} guests</span> per event.
            Want more than {FREE_CAPACITY}?
          </>
        ) : (
          <>
            Your <span className="font-semibold text-[#A01111]">{planName}</span> plan covers up to{' '}
            <span className="font-semibold text-slate-700">{limit} guests</span> per event. Need more?
          </>
        )}
      </p>

      {shown >= Math.min(limit, SLIDER_MAX) && !isFree && (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          You've reached your maximum. Upgrade to invite more per event.
        </p>
      )}

      {onUpgrade ? (
        <Button
          type="button"
          variant={isFree ? 'primary' : 'secondary'}
          className="mt-3 w-full"
          onClick={onUpgrade}
        >
          Upgrade capacity
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Button>
      ) : null}
    </div>
  )
}