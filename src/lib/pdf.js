import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const BRAND = [189, 30, 30]
const INK = [23, 37, 90]
const MUTED = [100, 116, 139]
const TINT = [251, 241, 224]
const SOFT = [253, 250, 245]

const STATS = {
  yes: { label: 'Going', bg: [236, 253, 245], fg: [4, 120, 87] },
  no: { label: 'Not coming', bg: [255, 241, 242], fg: [190, 18, 60] },
  maybe: { label: 'Maybe', bg: [255, 251, 235], fg: [180, 83, 9] },
  guests: { label: 'Guests coming', bg: [241, 245, 249], fg: [30, 27, 39] },
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawFooter(doc, hasContentBelow) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()
  void hasContentBelow
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16)
    doc.setFontSize(8)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('belayo · RSVP report', 14, pageHeight - 10, { align: 'left' })
    doc.text(`Page ${i} of ${pages} · ${new Date().toLocaleDateString()}`, pageWidth - 14, pageHeight - 10, {
      align: 'right',
    })
  }
}

export async function downloadRsvpPdf(event, rsvps) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  const yes = rsvps.filter((r) => r.response === 'yes').length
  const no = rsvps.filter((r) => r.response === 'no').length
  const maybe = rsvps.filter((r) => r.response === 'maybe').length
  const totalGuests = rsvps.filter((r) => r.response === 'yes').reduce((s, r) => s + (r.guests || 1), 0)

  let poster = null
  if (event.poster_url) {
    try {
      poster = await loadImage(event.poster_url)
    } catch {
      poster = null
    }
  }

  const font = (style) => doc.setFont('helvetica', style)

  // ---- Header band ----
  const bandH = poster ? 46 : 38
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
  doc.rect(0, 0, pageWidth, bandH, 'F')

  font('bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 235, 235)
  doc.text('RSVP REPORT', 14, 10)
  doc.text('belayo', pageWidth - 14, 10, { align: 'right' })

  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  const titleWidth = poster ? pageWidth - 82 : pageWidth - 28
  const titleLines = doc.splitTextToSize(event.title || 'Event', titleWidth)
  doc.text(titleLines.slice(0, 2), 14, 22)

  doc.setFontSize(10)
  font('normal')
  doc.setTextColor(255, 226, 226)
  const summaryLine = `${yes} going · ${no} not going · ${maybe} maybe · ${totalGuests} guests coming`
  doc.text(summaryLine, 14, bandH - 7)

  if (poster) {
    const ph = bandH - 10
    const pw = ph * (poster.naturalWidth / poster.naturalHeight || event.poster_width || 3)
    try {
      doc.addImage(poster, 'JPEG', pageWidth - 14 - pw, 5, pw, ph)
    } catch {
      /* skip image if it fails to embed */
    }
  }

  // ---- Event info cards ----
  const cards = []
  if (event.inviter_name) cards.push({ label: 'Hosted by', value: event.inviter_name })
  if (event.event_date) {
    cards.push({
      label: 'Date & time',
      value: new Date(event.event_date).toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    })
  }
  if (event.location) cards.push({ label: 'Location', value: event.location })

  let y = bandH + 12
  if (cards.length > 0) {
    const gap = 4
    const left = 14
    const right = pageWidth - 14
    const cw = (right - left - gap * (cards.length - 1)) / cards.length
    cards.forEach((c, i) => {
      const x = left + i * (cw + gap)
      doc.setFillColor(TINT[0], TINT[1], TINT[2])
      doc.roundedRect(x, y, cw, 20, 3, 3, 'F')
      font('bold')
      doc.setFontSize(7.5)
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
      doc.text(c.label.toUpperCase(), x + 5, y + 6.5)
      doc.setFontSize(10)
      doc.setTextColor(INK[0], INK[1], INK[2])
      const lines = doc.splitTextToSize(c.value, cw - 10)
      doc.text(lines.slice(0, 2), x + 5, y + 13.5)
    })
    y += 28
  }

  // ---- Stat cards ----
  const statGap = 4
  const statLeft = 14
  const statRight = pageWidth - 14
  const statW = (statRight - statLeft - statGap * 3) / 4
  const stats = [
    { ...STATS.yes, value: yes },
    { ...STATS.no, value: no },
    { ...STATS.maybe, value: maybe },
    { ...STATS.guests, value: totalGuests },
  ]
  stats.forEach((s, i) => {
    const x = statLeft + i * (statW + statGap)
    doc.setFillColor(s.bg[0], s.bg[1], s.bg[2])
    doc.roundedRect(x, y, statW, 24, 3, 3, 'F')
    doc.setFillColor(s.fg[0], s.fg[1], s.fg[2])
    doc.circle(x + 8, y + 8, 1.6, 'F')
    doc.setFontSize(19)
    font('bold')
    doc.setTextColor(s.fg[0], s.fg[1], s.fg[2])
    doc.text(String(s.value), x + 13, y + 10.5)
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(s.label.toUpperCase(), x + 13, y + 17.5)
  })
  y += 33

  // ---- Responses section heading ----
  doc.setFontSize(14)
  font('bold')
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(`Responses (${rsvps.length})`, 14, y)
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(0.8)
  doc.line(14, y + 2, 34, y + 2)
  y += 7

  // ---- Guest table (numbered) ----
  const rows = rsvps.map((r, idx) => [
    idx + 1,
    r.name,
    r.email || r.phone || '—',
    r.response.charAt(0).toUpperCase() + r.response.slice(1),
    r.guests > 1 ? String(r.guests) : '1',
    [r.note || '', ...(Array.isArray(r.guest_details) ? r.guest_details.map((g) => `+ ${g.name}`) : [])]
      .filter(Boolean)
      .join('\n'),
  ])

  const respColor = (value) =>
    value === 'Yes' ? [4, 120, 87] : value === 'No' ? [190, 18, 60] : value === 'Maybe' ? [180, 83, 9] : MUTED

  autoTable(doc, {
    startY: y,
    head: [['#', 'Name', 'Contact', 'Response', 'Guests', 'Note & additional guests']],
    body: rows,
    foot: [['', '', 'Total', '', String(totalGuests), `${rsvps.length} responses`]],
    theme: 'grid',
    margin: { left: 14, right: 14, bottom: 22 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: TINT, textColor: INK, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: SOFT },
    styles: { fontSize: 9, cellPadding: 2.6, textColor: INK },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: MUTED },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 56 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = respColor(String(data.cell.raw).trim())
      }
    },
  })

  drawFooter(doc)

  doc.save(`${event.title.replace(/[^a-z0-9]+/gi, '-')}-rsvps.pdf`)
}