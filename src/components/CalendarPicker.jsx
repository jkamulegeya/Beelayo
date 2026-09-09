import { useEffect, useRef, useState } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const fieldCls =
  'flex w-full items-center justify-between gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 transition focus-within:border-[#D66464] focus-within:ring-2 focus-within:ring-[#F6E0E0]'

export function CalendarPicker({ value, onChange }) {
  const wrapRef = useRef(null)
  const today = new Date()
  const selected = value && !isNaN(value.getTime()) ? new Date(value) : null
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const base = selected || today
    return { y: base.getFullYear(), m: base.getMonth() }
  })

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const openCalendar = () => {
    const base = selected || today
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen((o) => !o)
  }

  const pickDay = (d) => {
    const h = selected ? selected.getHours() : 10
    const min = selected ? selected.getMinutes() : 0
    onChange(new Date(view.y, view.m, d, h, min))
    setOpen(false)
  }

  const goMonth = (delta) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const firstDay = new Date(view.y, view.m, 1)
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const lead = firstDay.getDay()
  const isViewMonthPast =
    view.y < today.getFullYear() || (view.y === today.getFullYear() && view.m < today.getMonth())

  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={openCalendar} className={fieldCls} aria-haspopup="dialog" aria-expanded={open}>
        <span className="flex min-w-0 items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#BD1E1E]">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M7 2v4M17 2v4" />
          </svg>
          <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
            {selected
              ? selected.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
              : 'Select a date'}
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[17rem] overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl shadow-black/10">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#BD1E1E] px-3 py-2">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              disabled={isViewMonthPast}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20"
              aria-label="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 border-b border-slate-100 px-1.5 pt-1">
            {DAYS.map((d) => (
              <span key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#C93A3A]">
                {d}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5 px-1.5 py-2">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />
              const date = new Date(view.y, view.m, d)
              const disabled = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
              const isToday = isSameDay(date, today)
              const isSelected = selected && isSameDay(date, selected)
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-sm text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-[#BD1E1E] text-white shadow-md shadow-[#BD1E1E]/30'
                      : disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isToday
                      ? 'text-[#A01111] ring-2 ring-[#E3A9A9] hover:bg-[#FBEEEE]'
                      : 'text-slate-700 hover:bg-[#F6E0E0]'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const timeCls =
  'w-full rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-sm transition focus-within:border-[#D66464] focus-within:ring-2 focus-within:ring-[#F6E0E0] disabled:cursor-not-allowed disabled:bg-slate-50'

export function TimePicker({ value, onChange }) {
  const wrapRef = useRef(null)
  const selected = value && !isNaN(value.getTime()) ? new Date(value) : null
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const f = (n) => String(n).padStart(2, '0')

  if (!selected) {
    return (
      <div className={`flex w-full cursor-not-allowed items-center gap-2.5 ${timeCls}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-300">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span className="text-sm text-slate-400">Pick a date to set time</span>
      </div>
    )
  }

  const hour12 = selected.getHours() % 12 || 12
  const minute = selected.getMinutes()
  const ampm = selected.getHours() >= 12 ? 'PM' : 'AM'

  const update = (h12, min, isPm) => {
    const h24 = ((h12 % 12) + (isPm ? 12 : 0)) % 24
    onChange(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), h24, min))
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={timeCls} aria-haspopup="dialog" aria-expanded={open}>
        <span className="flex w-full items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#BD1E1E]">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-sm font-semibold text-slate-800">
              {hour12}:{f(minute)} <span className="text-slate-400">{ampm}</span>
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[17rem] overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl shadow-black/10">
          <div className="flex items-center justify-between bg-[#BD1E1E] px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Event time
            </span>
            <span className="text-sm font-semibold text-white/90">
              {hour12}:{f(minute)} {ampm}
            </span>
          </div>

          {/* Quick chips */}
          <div className="grid grid-cols-3 gap-2 px-4 pt-3">
            {['09:00 AM', '12:00 PM', '03:00 PM', '05:00 PM', '07:00 PM', '08:00 PM'].map((t) => {
              const [h, m] = t.split(':').map(Number)
              const [, tail] = t.split(' ')
              const isPm = tail === 'PM'
              const active = selected.getHours() === ((h % 12) + (isPm ? 12 : 0)) % 24 && selected.getMinutes() === m
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => update(h, m, isPm)}
                  className={`rounded-sm px-1 py-2 text-xs font-bold transition ${
                    active ? 'bg-[#BD1E1E] text-white shadow' : 'bg-[#FBF1E0] text-slate-700 hover:bg-[#F6E0E0]'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {/* Precise selects */}
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <span className="mr-auto block text-xs font-semibold text-slate-500">Exact</span>
            <select
              value={hour12}
              onChange={(e) => update(Number(e.target.value), minute, ampm === 'PM')}
              aria-label="Hour"
              className="rounded-sm border border-black/10 bg-white px-2 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#BD1E1E]/20"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={minute}
              onChange={(e) => update(hour12, Number(e.target.value), ampm === 'PM')}
              aria-label="Minute"
              className="rounded-sm border border-black/10 bg-white px-2 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#BD1E1E]/20"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={(e) => update(hour12, minute, e.target.value === 'PM')}
              aria-label="AM or PM"
              className="rounded-sm border border-black/10 bg-white px-2 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#BD1E1E]/20"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const now = selected
              onChange(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0))
              setOpen(false)
            }}
            className="block w-full border-t border-slate-100 px-4 py-2 text-xs font-semibold text-[#A01111] transition hover:bg-[#FBEEEE]"
          >
            Reset to 10:00 AM
          </button>
        </div>
      )}
    </div>
  )
}