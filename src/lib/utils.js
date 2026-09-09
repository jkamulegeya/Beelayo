export const FREE_EVENT_LIMIT = 2

export function isEventExpired(ev) {
  return !!ev?.event_date && new Date(ev.event_date).getTime() < Date.now()
}

export function generateSlug() {
  return (
    Math.random().toString(36).substring(2, 8) +
    Math.random().toString(36).substring(2, 6)
  )
}

export function formatEventDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function relativeEventDate(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.round(diff / 86400000)
  if (days < 0) {
    const abs = Math.abs(days)
    return abs <= 1 ? 'was yesterday' : `was ${abs} days ago`
  }
  if (days === 0) return 'is today'
  if (days === 1) return 'is tomorrow'
  if (days < 30) return `in ${days} days`
  const months = Math.round(days / 30)
  return months === 1 ? 'in about a month' : `in about ${months} months`
}