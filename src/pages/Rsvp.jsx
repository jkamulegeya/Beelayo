import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { Card, Button, Input, Textarea, Spinner } from '../components/ui.jsx'
import { formatEventDate } from '../lib/utils.js'
import { isPlanLimitError } from '../lib/upgrade.js'

export default function Rsvp() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(1)
  const [guestFields, setGuestFields] = useState([])
  const [note, setNote] = useState('')
  const [response, setResponse] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [used, setUsed] = useState(0)
  const [capacityLimit, setCapacityLimit] = useState(10)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) setEvent(null)
        else {
          setEvent(data)
          // Authored capacity is stale; the plan limit is authoritative.
          supabase
            .rpc('get_event_guest_limit', { p_event_id: data.id })
            .then(({ data: limit, error: rpcErr }) => {
              setCapacityLimit(!rpcErr && Number.isFinite(limit) ? Number(limit) : data.invite_capacity || 10)
            })
        }
        setLoaded(true)
      })
  }, [slug])

  useEffect(() => {
    if (!event) return
    supabase
      .from('rsvps')
      .select('guests, response')
      .eq('event_id', event.id)
      .then(({ data }) => {
        if (Array.isArray(data)) {
          const usedCount = data
            .filter((r) => r.response === 'yes' || r.response === 'maybe')
            .reduce((s, r) => s + (r.guests || 1), 0)
          setUsed(usedCount)
        }
      })
  }, [event])

  const capacity = capacityLimit
  const slotsLeft = capacity - used
  const isFull = slotsLeft <= 0

  const submit = async () => {
    if (!name.trim() || !response) {
      setError('Please enter your name and select a response.')
      return
    }
    if (!phone.trim()) {
      setError('Please enter your phone number.')
      return
    }
    if ((response === 'yes' || response === 'maybe') && Number(guests) + used > capacity) {
      setError(
        `This event has reached its guest capacity of ${capacity} people. Please contact the host for more information.`
      )
      return
    }
    const missingGuest = guestFields.find((g) => !g.name.trim())
    if (missingGuest) {
      setError('Please enter the name of each guest you are bringing.')
      return
    }
    setError('')
    setSubmitting(true)

    const details = guestFields.length
      ? guestFields.map((g) => ({
          name: g.name.trim(),
          email: g.email.trim() || null,
          phone: g.phone.trim() || null,
        }))
      : null

    const { error } = await supabase.from('rsvps').insert({
      event_id: event.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      guests: Number(guests) || 1,
      guest_details: details,
      response,
      note: note.trim() || null,
    })

    if (error) {
      setError(
        isPlanLimitError(error)
          ? `This event is full — the host's plan allows ${capacityLimit} guests. Please contact the host for more information.`
          : error.message
      )
      setSubmitting(false)
      return
    }
    setSubmitted(true)
  }

  if (!loaded) return <Spinner />
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-slate-800">Invitation not found</h1>
          <p className="mt-1 text-sm text-slate-500">This link may be invalid or the event was removed.</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5E2C8] px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F6E0E0]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#BD1E1E" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#17255A]">Thank you{name ? `, ${name}` : ''}!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your response has been received{event.title ? ` for ${event.title}` : ''}.
          </p>
        </Card>
        <p className="mt-5 w-full max-w-md px-4 text-center text-[13px] leading-relaxed text-slate-500">
          This invitation was made with <span className="font-bold text-[#17255A]">belayo</span>. Want to
          create your own event?{' '}
          <Link to="/" className="font-bold text-[#BD1E1E] underline-offset-2 hover:underline">
            Create your RSVP for free
          </Link>
        </p>
      </div>
    )
  }

  const choices = [
    { key: 'yes', label: "Yes, I'll be there", color: 'violet', icon: '✓' },
    { key: 'no', label: "Sorry, can't make it", color: 'black', icon: '✕' },
    { key: 'maybe', label: "Maybe / TBD", color: 'neutral', icon: '?' },
  ]

  const colorMap = {
    violet: { active: 'border-[#C93A3A] bg-[#FBEEEE] ring-2 ring-[#EDC8C8]', dot: 'bg-[#BD1E1E]' },
    black: { active: 'border-neutral-800 bg-neutral-100 ring-2 ring-neutral-300', dot: 'bg-neutral-900' },
    neutral: { active: 'border-neutral-300 bg-white ring-2 ring-neutral-200', dot: 'bg-neutral-500' },
  }

  return (
    <div className="min-h-screen bg-[#F5E2C8] px-0 sm:px-4 py-0 sm:py-10">
      <div className="mx-auto max-w-lg sm:px-0">
        {event.poster_url ? (
          <div className="mb-6 sm:mx-0 sm:overflow-hidden sm:rounded-sm sm:shadow-sm">
            <img
              src={event.poster_url}
              alt={event.title}
              className="h-52 w-full object-cover sm:aspect-[16/7] sm:h-auto"
            />
          </div>
        ) : (
          <div className="mb-6 flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#BD1E1E] via-[#BD1E1E] to-neutral-900 sm:mx-0 sm:rounded-sm sm:h-48">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M7 2v4M17 2v4" />
            </svg>
          </div>
        )}

        <div className="px-4 text-center sm:px-0">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-[#BD1E1E] text-white shadow-lg shadow-[#EDC8C8]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M7 2v4M17 2v4" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold text-[#17255A]">{event.title}</h1>
          {event.inviter_name && (
            <p className="mt-1 text-sm font-medium text-[#BD1E1E]">
              Hosted by {event.inviter_name}
            </p>
          )}
          {event.event_date && (
            <p className="mt-1 text-sm text-slate-600">
              {formatEventDate(event.event_date)}
            </p>
          )}
          {event.location && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.location}
            </p>
          )}
          {event.description && <p className="mt-3 text-sm text-slate-600">{event.description}</p>}
        </div>

        <Card className="mx-4 mt-6 p-5 sm:mx-0 sm:p-6">
          <div className="mb-4 text-center">
            <p className="text-sm font-semibold text-slate-700">Will you attend?</p>
            {isFull ? (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-neutral-800">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
                </svg>
                This event is currently full ({capacity} guests registered)
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-[#BD1E1E]">
                {slotsLeft} of {capacity} spots left
              </p>
            )}
          </div>

          <div className="mb-6 space-y-3">
            {choices.map((c) => {
              const active = response === c.key
              const blocked = isFull && (c.key === 'yes' || c.key === 'maybe')
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={blocked}
                  onClick={() => setResponse(c.key)}
                  className={`flex w-full items-center gap-3 rounded-sm border-2 bg-white px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    active ? colorMap[c.color].active : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${colorMap[c.color].dot}`}>
                    {c.icon}
                  </span>
                  <span className="font-medium text-slate-800">{c.label}</span>
                  <span className={`ml-auto h-5 w-5 rounded-full border-2 ${active ? 'border-[#C93A3A]' : 'border-slate-300'}`}>
                    {active && (
                      <svg className="m-0.5 h-3.5 w-3.5 text-[#C93A3A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            <Input label="Your name *" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Input label="Phone *" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" />
            </div>
            {response && response !== 'no' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Number of guests</span>
                  <select
                    value={guests}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const target = val > 1 ? val - 1 : 0
                      setGuestFields((prev) => {
                        const next = prev.slice(0, target)
                        while (next.length < target) next.push({ name: '', email: '', phone: '' })
                        return next
                      })
                      setGuests(val)
                    }}
                    className="min-h-[44px] w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-800 focus:border-[#D66464] focus:outline-none focus:ring-2 focus:ring-[#F6E0E0] sm:text-sm"
                  >
                    {[1, 2].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </label>

                {guests > 1 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-500">
                      Add the name and contact of each guest you are bringing.
                    </p>
                    {guestFields.map((g, i) => (
                      <div key={i} className="rounded-sm border border-[#F6E0E0] bg-[#FBEEEE]/60 p-3.5">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A01111]">Guest {i + 2}</p>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Input
                              label="Name *"
                              required
                              value={g.name}
                              onChange={(e) =>
                                setGuestFields((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                              }
                              placeholder={`Guest ${i + 2} name`}
                            />
                          </div>
                          <Input
                            label="Email"
                            type="email"
                            value={g.email}
                            onChange={(e) =>
                              setGuestFields((prev) => prev.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))
                            }
                            placeholder="guest@example.com"
                          />
                          <Input
                            label="Phone"
                            type="tel"
                            value={g.phone}
                            onChange={(e) =>
                              setGuestFields((prev) => prev.map((x, idx) => (idx === i ? { ...x, phone: e.target.value } : x)))
                            }
                            placeholder="+1234567890"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Textarea label="Message (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the host..." />

            {error && <div className="rounded-sm bg-neutral-900 px-3 py-2 text-sm text-white">{error}</div>}

            <Button onClick={submit} disabled={!response || !name.trim() || !phone.trim() || submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit RSVP'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
