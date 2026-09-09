import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/authContext.jsx'
import { Button, Input, Textarea, Card, Spinner } from '../components/ui.jsx'
import PosterUpload from '../components/PosterUpload.jsx'
import { CalendarPicker, TimePicker } from '../components/CalendarPicker.jsx'
import { generateSlug, FREE_EVENT_LIMIT, isEventExpired } from '../lib/utils.js'
import { FREE_CAPACITY, planLimit, effectivePlan } from '../lib/payments.js'
import CapacityCheckout from '../components/CapacityCheckout.jsx'
import UpgradeModal from '../components/UpgradeModal.jsx'
import { uploadPoster, isValidPoster, deletePoster } from '../lib/storage.js'

export default function CreateEvent() {
  const { user, account, refreshAccount } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [inviterName, setInviterName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(null)
  const [location, setLocation] = useState('')
  const [posterFile, setPosterFile] = useState(null)
  const [existingPosterUrl, setExistingPosterUrl] = useState(null)
  const [removePoster, setRemovePoster] = useState(false)
  const [capacity, setCapacity] = useState(FREE_CAPACITY)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      const { data, error: loadError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (loadError || !data) {
        setError(loadError?.message || 'Event not found.')
        setPageLoading(false)
        return
      }
      setTitle(data.title || '')
      setInviterName(data.inviter_name || '')
      setDescription(data.description || '')
      setEventDate(data.event_date ? new Date(data.event_date) : null)
      setLocation(data.location || '')
      setExistingPosterUrl(data.poster_url || null)
      setCapacity(Math.max(1, Math.min(data.invite_capacity || FREE_CAPACITY, planLimit(effectivePlan(account)))))
      setPageLoading(false)
    })()
  }, [id, isEdit, account])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (posterFile) {
      const { ok, message } = isValidPoster(posterFile)
      if (!ok) {
        setError(message)
        return
      }
    }

    setLoading(true)

    if (!isEdit) {
      const { data: existing = [] } = await supabase.from('events').select('id, event_date').eq('user_id', user.id)
      const active = existing.filter((ev) => !isEventExpired(ev))
      if (active.length >= FREE_EVENT_LIMIT) {
        setError(
          `You've reached the limit of ${FREE_EVENT_LIMIT} active events. Delete an event or wait for one to expire before creating another.`
        )
        setLoading(false)
        return
      }
    }

    const payload = {
      title,
      inviter_name: inviterName.trim() || null,
      description: description.trim() || null,
      event_date: eventDate ? eventDate.toISOString() : null,
      location: location.trim() || null,
      invite_capacity: Math.max(1, Math.min(capacity, planLimit(effectivePlan(account)))),
    }

    try {
      let savedId = id

      if (isEdit) {
        const wantsNewFile = Boolean(posterFile)
        const wantsRemove = removePoster && !posterFile
        if (wantsNewFile || wantsRemove) {
          try {
            await deletePoster(user.id, id)
          } catch {
            // best-effort cleanup of the old file
          }
        }

        if (posterFile) {
          const newUrl = await uploadPoster(id, posterFile)
          payload.poster_url = newUrl
          setExistingPosterUrl(newUrl)
        } else if (removePoster) {
          payload.poster_url = null
        }

        const { data, error: uErr } = await supabase
          .from('events')
          .update(payload)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()
        if (uErr) throw uErr
        savedId = data.id
      } else {
        const { data, error: insErr } = await supabase
          .from('events')
          .insert({ user_id: user.id, ...payload, slug: generateSlug() })
          .select()
          .single()
        if (insErr) throw insErr
        savedId = data.id

        if (posterFile) {
          try {
            const posterUrl = await uploadPoster(savedId, posterFile)
            await supabase.from('events').update({ poster_url: posterUrl }).eq('id', savedId)
          } catch (err) {
            setError('Event created, but the poster failed to upload: ' + err.message)
          }
        }
      }

      navigate(`/app/event/${savedId}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (pageLoading) return <Spinner />

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17255A]">{isEdit ? 'Edit invitation' : 'Create an invitation'}</h1>
        <p className="text-sm text-slate-500">
          {isEdit ? 'Update the details — your share link stays the same.' : 'Add the details, a poster if you have one, then share the link.'}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <PosterUpload
            file={posterFile}
            onChange={setPosterFile}
            initialUrl={existingPosterUrl}
            onRemoveExisting={() => setRemovePoster(true)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Event title *" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jane & John's Wedding" />
            <Input
              label="Hosted by"
              value={inviterName}
              onChange={(e) => setInviterName(e.target.value)}
              placeholder="e.g. The Okafor Family"
            />
          </div>

          <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Join us to celebrate..." />

          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue, City" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Date *</span>
              <CalendarPicker value={eventDate} onChange={setEventDate} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Time</span>
              <TimePicker value={eventDate} onChange={setEventDate} />
            </label>
          </div>

          <CapacityCheckout
            people={capacity}
            onChange={setCapacity}
            account={account}
            onUpgrade={() => setUpgradeOpen(true)}
          />

          {error && <div className="rounded-sm bg-neutral-900 px-3 py-2 text-sm text-white">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create invitation'}
          </Button>
        </form>
      </Card>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        account={account}
        onUpgraded={async () => {
          const updated = await refreshAccount()
          const newLimit = updated?.guest_limit || FREE_CAPACITY
          setCapacity((c) => Math.max(1, Math.min(newLimit, c)))
        }}
      />
    </div>
  )
}