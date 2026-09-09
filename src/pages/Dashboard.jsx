import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/authContext.jsx'
import { Card, Button, Spinner, Badge } from '../components/ui.jsx'
import { formatShortDate, relativeEventDate, FREE_EVENT_LIMIT, isEventExpired } from '../lib/utils.js'
import { planLimit, effectivePlan } from '../lib/payments.js'

export default function Dashboard() {
  const { user, account } = useAuth()
  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const eventsRef = useRef([])

  useEffect(() => {
    if (!user) return
    loadEvents()

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps' },
        () => refreshCounts(eventsRef.current)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setEvents(data || [])
      eventsRef.current = data || []
      refreshCounts(data || [])
    }
    setLoading(false)
  }

  async function refreshCounts(list) {
    if (!list || list.length === 0) {
      setCounts({})
      return
    }
    const { data, error } = await supabase
      .from('rsvps')
      .select('event_id, response, guests')
      .in('event_id', list.map((e) => e.id))
    if (error) return
    const agg = {}
    for (const e of list) agg[e.id] = { yes: 0, no: 0, maybe: 0, total: 0, people: 0 }
    for (const r of data || []) {
      if (agg[r.event_id]) {
        agg[r.event_id][r.response] = (agg[r.event_id][r.response] || 0) + 1
        agg[r.event_id].total += 1
        if (r.response !== 'no') agg[r.event_id].people += r.guests || 1
      }
    }
    setCounts(agg)
  }

  if (loading) return <Spinner />

  const activeEvents = events.filter((e) => !isEventExpired(e))
  const atLimit = activeEvents.length >= FREE_EVENT_LIMIT

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17255A]">My Events</h1>
          <p className="text-sm text-slate-500">Track your invitations and live RSVP counts.</p>
        </div>
        <Link to="/app/create" className="sm:w-auto">
          <Button
            className="w-full sm:w-auto"
            disabled={atLimit}
            title={atLimit ? 'Delete an event or wait for one to expire before creating another' : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Event
          </Button>
        </Link>
      </div>

      {atLimit && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-[#F6E0E0] bg-[#FBEEEE] px-3 py-2 text-xs text-[#A01111]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p>
            You have <span className="font-semibold">{activeEvents.length}</span> of{' '}
            <span className="font-semibold">{FREE_EVENT_LIMIT}</span> active events. Delete an event or wait for one to
            expire before creating another.
          </p>
        </div>
      )}

      {events.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-[#FBEEEE]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#BD1E1E" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M7 2v4M17 2v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-800">No events yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create your first invitation and get a shareable link with a live RSVP counter in seconds.
          </p>
          <div className="mt-5">
            <Link to="/app/create">
              <Button>Create an event</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const c = counts[event.id] || { yes: 0, no: 0, maybe: 0, total: 0 }
            const cap = planLimit(effectivePlan(account))
            const used = c.people || 0
            const atLimit = used >= cap
            const capPct = Math.min(100, Math.round((used / cap) * 100))
            return (
              <Link key={event.id} to={`/app/event/${event.id}`}>
                <Card className="group h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                  {event.poster_url ? (
                    <div className="aspect-[3/4] w-full overflow-hidden">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] flex w-full items-center justify-center bg-gradient-to-br from-[#BD1E1E] to-neutral-900">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M3 9h18M7 2v4M17 2v4" />
                      </svg>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[#17255A] group-hover:text-[#BD1E1E]">{event.title}</h3>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {isEventExpired(event) && <Badge color="slate">Expired</Badge>}
                        <Badge color={c.total > 0 ? 'green' : 'slate'}>{c.total} RSVPs</Badge>
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-500">
                      {event.event_date && (
                        <p className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <path d="M3 9h18M7 2v4M17 2v4" />
                          </svg>
                          {formatShortDate(event.event_date)}
                          <span className="rounded-full bg-[#FBEEEE] px-2 py-0.5 text-xs font-medium text-[#BD1E1E]">
                            {relativeEventDate(event.event_date)}
                          </span>
                        </p>
                      )}
                      {event.inviter_name && (
                        <p className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Hosted by {event.inviter_name}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm">
                      <span className="flex items-center gap-1 text-[#BD1E1E]">
                        <span className="font-bold">{c.yes}</span> Yes
                      </span>
                      <span className="flex items-center gap-1 text-neutral-800">
                        <span className="font-bold">{c.no}</span> No
                      </span>
                      <span className="flex items-center gap-1 text-neutral-500">
                        <span className="font-bold">{c.maybe}</span> Maybe
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            cap > 10 ? 'text-[#BD1E1E]' : 'text-slate-500'
                          }`}
                        >
                          {cap > 10 ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                              </svg>
                              PRO
                            </>
                          ) : (
                            'FREE'
                          )}
                          <span className="text-slate-500">
                            · {used}/{cap} slots
                          </span>
                        </span>
                        <span className={atLimit ? 'font-semibold text-neutral-800' : 'text-slate-400'}>
                          {capPct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${atLimit ? 'bg-neutral-900' : 'bg-[#C93A3A]'}`}
                          style={{ width: `${capPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
