import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/authContext.jsx'
import { Card, Badge, Spinner } from '../components/ui.jsx'
import { formatEventDate } from '../lib/utils.js'
import { deletePoster } from '../lib/storage.js'
import { planLimit, effectivePlan } from '../lib/payments.js'
import UpgradeModal from '../components/UpgradeModal.jsx'

const origin = window.location.origin

export default function EventDetails() {
  const { user, account, refreshAccount } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const qrBoxRef = useRef(null)
  const link = `${origin}/e/${event?.slug || ''}`

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`event-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${id}` },
        () => loadData()
      )
      .subscribe()

    let profileChannel
    if (user?.id) {
      profileChannel = supabase
        .channel(`profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          () => refreshAccount()
        )
        .subscribe()
    }

    return () => {
      supabase.removeChannel(channel)
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single()
    if (ev) setEvent(ev)
    const { data: rs } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: false })
    setRsvps(rs || [])
    setLoading(false)
  }

  const yes = rsvps.filter((r) => r.response === 'yes').length
  const no = rsvps.filter((r) => r.response === 'no').length
  const maybe = rsvps.filter((r) => r.response === 'maybe').length
  const totalGuests = rsvps.filter((r) => r.response === 'yes').reduce((s, r) => s + (r.guests || 1), 0)
  const usedSlots = rsvps
    .filter((r) => r.response === 'yes' || r.response === 'maybe')
    .reduce((s, r) => s + (r.guests || 1), 0)
  const inviteCapacity = planLimit(effectivePlan(account))

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this link:', link)
    }
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`You're invited! Please RSVP at ${link}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(`Invitation: ${event.title}`)
    const body = encodeURIComponent(`You're invited to ${event.title}! Please RSVP here: ${link}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    const { downloadRsvpPdf } = await import('../lib/pdf.js')
    await downloadRsvpPdf(event, rsvps)
  }

  const handleDownloadQr = () => {
    const svg = qrBoxRef.current?.querySelector('svg')
    if (!svg) return
    try {
      const str = new XMLSerializer().serializeToString(svg)
      const url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }))
      const size = svg.viewBox.baseVal.width || 33
      const scale = 512 / size
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size * scale, size * scale)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (!blob) return
          const pngUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `${event.slug || 'event'}-qr.png`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      img.onerror = () => URL.revokeObjectURL(url)
      img.src = url
    } catch {
      // ignore download failures
    }
  }

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this event and all its RSVPs? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (event.poster_url) {
        try {
          await deletePoster(user.id, event.id)
        } catch {
          // best-effort cleanup of the poster file
        }
      }
      const { error } = await supabase.from('events').delete().eq('id', event.id)
      if (error) throw error
      navigate('/app')
    } catch (err) {
      setDeleteError(err.message || 'Could not delete the event. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (!event) return <Card className="p-8 text-center text-slate-500">Event not found.</Card>

  return (
    <div className="mx-auto max-w-2xl">
      <div className="print:hidden mb-2">
        <Link to="/app" className="text-xs text-[#BD1E1E] hover:underline">← Back to events</Link>
      </div>

      <div className="print:hidden">
      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
        {event.poster_url && (
          <div>
            <img
              src={event.poster_url}
              alt={event.title}
              className="aspect-[3/4] w-full object-cover sm:aspect-[21/9]"
            />
          </div>
        )}

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-[#17255A]">{event.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                {event.inviter_name && <span className="font-medium text-[#BD1E1E]">by {event.inviter_name}</span>}
                {event.event_date && <span>{formatEventDate(event.event_date)}</span>}
                {event.location && <span>{event.location}</span>}
              </div>
              {event.description && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-600">{event.description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
                </svg>
                Print
              </button>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-[#BD1E1E] px-2 py-1.5 text-[11px] font-medium text-white hover:bg-[#A01111]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 pt-2 sm:p-4 sm:pt-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-sm bg-[#FBEEEE] px-2 py-1.5">
              <p className="text-base font-bold leading-none text-[#BD1E1E]">{yes}</p>
              <p className="mt-0.5 text-[10px] font-medium text-[#A01111]">Coming</p>
              <p className="text-[10px] text-[#BD1E1E]">{totalGuests} guest{totalGuests === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-sm bg-neutral-100 px-2 py-1.5">
              <p className="text-base font-bold leading-none text-neutral-800">{no}</p>
              <p className="mt-0.5 text-[10px] font-medium text-neutral-800">Declined</p>
              <p className="text-[10px] text-neutral-600">{no === 0 ? 'All clear' : `${no} can't attend`}</p>
            </div>
            <div className="rounded-sm border border-neutral-200 bg-white px-2 py-1.5">
              <p className="text-base font-bold leading-none text-neutral-800">{maybe}</p>
              <p className="mt-0.5 text-[10px] font-medium text-neutral-700">Maybe</p>
              <p className="text-[10px] text-neutral-600">{maybe === 0 ? 'None' : 'Awaiting'}</p>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Invite guests</span>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  effectivePlan(account) === 'free'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-gradient-to-r from-[#BD1E1E] to-neutral-900 text-white'
                }`}>
                  {effectivePlan(account) === 'free' ? 'FREE' : effectivePlan(account).toUpperCase()}
                </span>
                {usedSlots >= inviteCapacity ? (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Full · {usedSlots}/{inviteCapacity}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FBEEEE] px-2 py-0.5 text-[10px] font-semibold text-[#BD1E1E]">
                    {usedSlots}/{inviteCapacity} guests invited
                  </span>
                )}
              </div>
            </div>
            {effectivePlan(account) !== 'Deluxe' && (
              <button
                onClick={() => setUpgradeOpen(true)}
                className="mt-2 inline-flex w-full items-center justify-between rounded-sm border border-[#EDC8C8] bg-[#FBEEEE] px-2.5 py-1.5 text-left transition hover:border-[#E3A9A9] hover:bg-[#F6E0E0]"
              >
                <span className="text-[11px] font-semibold text-[#A01111]">
                  Get more guest space · currently {inviteCapacity} per event
                </span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#BD1E1E] text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            )}
            <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="w-full min-w-0 flex-1 rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:border-[#D66464] focus:outline-none"
                />
                <div className="flex shrink-0 flex-col items-center gap-1">
                <div ref={qrBoxRef} className="rounded-sm border border-slate-100 bg-white p-1">
                  <QRCodeSVG value={link} size={44} fgColor="#BD1E1E" level="M" />
                </div>
                <button
                  onClick={handleDownloadQr}
                  title="Save QR as PNG"
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[#BD1E1E] hover:underline"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Save QR
                </button>
              </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyLink}
                  className="inline-flex items-center rounded-sm bg-[#BD1E1E] px-2 py-1.5 text-[11px] font-medium text-white hover:bg-[#A01111]"
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="inline-flex items-center rounded-sm bg-neutral-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-neutral-800"
                >
                  WhatsApp
                </button>
                <button
                  onClick={shareEmail}
                  className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Email
                </button>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Manage event</span>
            <div className="flex items-center gap-1.5">
              <Link
                to={`/app/event/${event.id}/edit`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                </svg>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
          {deleteError && <p className="mt-2 text-xs font-medium text-neutral-800">{deleteError}</p>}
        </div>
      </div>
      </div>

      <div className="print:hidden mt-2">
      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-3 pt-2.5 sm:px-4">
          <h2 className="text-xs font-semibold text-[#17255A]">Responses ({rsvps.length})</h2>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D66464] opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#BD1E1E]"></span>
            </span>
            Live
          </span>
        </div>
        {rsvps.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-400 sm:px-4">No responses yet. Share your invitation link!</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-slate-100">
            {rsvps.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{r.name}</p>
                  {(r.email || r.phone) && (
                    <p className="truncate text-[11px] text-slate-400">{r.email || r.phone}</p>
                  )}
                  {Array.isArray(r.guest_details) && r.guest_details.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {r.guest_details.map((g, i) => (
                        <p key={i} className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[#D66464]" />
                          <span className="font-medium text-slate-700">{g.name}</span>
                          {(g.email || g.phone) && (
                            <span className="text-slate-400">· {g.email || g.phone}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                  {r.note && <p className="truncate text-[11px] text-slate-500 italic">“{r.note}”</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.guests > 1 && <Badge color="violet">{r.guests} guests</Badge>}
                  {r.response === 'yes' && <Badge color="green">Going</Badge>}
                  {r.response === 'no' && <Badge color="rose">Not going</Badge>}
                  {r.response === 'maybe' && <Badge color="amber">Maybe</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>{/* /print:hidden responses */}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        account={account}
        onUpgraded={() => refreshAccount()}
      />

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {event.inviter_name && <p className="mt-1 text-sm font-medium">Hosted by {event.inviter_name}</p>}
        {event.event_date && (
          <p className="mt-1 text-sm">
            {formatEventDate(event.event_date)}
          </p>
        )}
        {event.location && <p className="text-sm">{event.location}</p>}

        <div className="mt-4 border-y border-slate-400 py-3 text-sm">
          {yes} going ({totalGuests} guests) · {no} not going · {maybe} maybe · {rsvps.length} total responses
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-2">Name</th>
              <th>Contact</th>
              <th>Response</th>
              <th>Guests</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.map((r) => (
              <tr key={r.id} className="border-b border-slate-200">
                <td className="py-2">
                  {r.name}
                  {Array.isArray(r.guest_details) && r.guest_details.length > 0 && (
                    <div className="text-xs text-slate-500">
                      {r.guest_details.map((g, i) => (
                        <div key={i}>+ {g.name}</div>
                      ))}
                    </div>
                  )}
                </td>
                <td>{r.email || r.phone || ''}</td>
                <td>{r.response.charAt(0).toUpperCase() + r.response.slice(1)}</td>
                <td>{r.guests}</td>
                <td>{r.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
