import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './ui.jsx'

const FRAMES = {
  portrait: { label: 'Poster 3:4', w: 3, h: 4, exportW: 1200, exportH: 1600 },
  landscape: { label: 'Banner 21:9', w: 21, h: 9, exportW: 1680, exportH: 720 },
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3

export default function ImageEditor({ open, src, onClose, onSave }) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [img, setImg] = useState(null)
  const [frameKey, setFrameKey] = useState('portrait')
  const [zoom, setZoom] = useState(1)
  const [rot, setRot] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!open || !src) return
    setImg(null)
    setFrameKey('portrait')
    setZoom(1)
    setRot(0)
    setPan({ x: 0, y: 0 })
    const image = new Image()
    if (!/^data:|^blob:/.test(src)) image.crossOrigin = 'anonymous'
    image.onload = () => setImg(image)
    image.onerror = () => setImg(null)
    image.src = src
  }, [open, src])

  const clampPan = useCallback(
    (p) => {
      if (!img) return { x: 0, y: 0 }
      const frame = FRAMES[frameKey]
      const imgW = rot % 180 === 0 ? img.naturalWidth : img.naturalHeight
      const imgH = rot % 180 === 0 ? img.naturalHeight : img.naturalWidth
      const cover = Math.max(frame.w / imgW, frame.h / imgH)
      const scale = cover * zoom
      const drawW = imgW * scale
      const drawH = imgH * scale
      const mx = Math.max(0, 1 - drawW / frame.w)
      const my = Math.max(0, 1 - drawH / frame.h)
      return {
        x: Math.max(-mx, Math.min(mx, p.x || 0)),
        y: Math.max(-my, Math.min(my, p.y || 0)),
      }
    },
    [img, frameKey, zoom, rot]
  )

  const renderTo = useCallback(
    (ctx, cw, ch) => {
      if (!img) return
      const imgW = rot % 180 === 0 ? img.naturalWidth : img.naturalHeight
      const imgH = rot % 180 === 0 ? img.naturalHeight : img.naturalWidth
      const cover = Math.max(cw / imgW, ch / imgH)
      const scale = cover * zoom
      const drawW = imgW * scale
      const drawH = imgH * scale
      const clamped = clampPan(pan)
      const mx = Math.max(0, 1 - drawW / cw)
      const my = Math.max(0, 1 - drawH / ch)
      const px = clampFloat(clamped.x, mx)
      const py = clampFloat(clamped.y, my)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cw, ch)
      ctx.save()
      ctx.translate(cw / 2 + px * (cw / 2), ch / 2 + py * (ch / 2))
      ctx.rotate((rot * Math.PI) / 180)
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    },
    [img, zoom, rot, pan, clampPan]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const frame = FRAMES[frameKey]
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.width * (frame.h / frame.w) * dpr))
    const ctx = canvas.getContext('2d')
    renderTo(ctx, canvas.width, canvas.height)
  }, [img, frameKey, zoom, rot, pan, renderTo])

  const handlePointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, pan: { ...pan } }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragRef.current.x) / rect.width
    const dy = (e.clientY - dragRef.current.y) / rect.height
    setPan(
      clampPan({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy })
    )
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleWheel = (e) => {
    e.preventDefault()
    setZoom((z) => clampFloat(z - e.deltaY * 0.001, MIN_ZOOM, MAX_ZOOM))
  }

  const handleApply = () => {
    const frame = FRAMES[frameKey]
    const canvas = document.createElement('canvas')
    canvas.width = frame.exportW
    canvas.height = frame.exportH
    const ctx = canvas.getContext('2d')
    renderTo(ctx, frame.exportW, frame.exportH)
    canvas.toBlob(
      (blob) => {
        if (blob) onSave?.(blob)
      },
      'image/jpeg',
      0.9
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-sm border border-[#F6E0E0] bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-[#17255A]">Edit poster</h2>
            <p className="text-[11px] text-slate-500">Zoom, drag and rotate the image to fit the frame.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close editor"
            className="flex h-7 w-7 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aspect toggle */}
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {Object.entries(FRAMES).map(([key, f]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFrameKey(key)}
              className={`rounded-sm border-2 px-3 py-1.5 text-[13px] font-semibold transition ${
                frameKey === key
                  ? 'border-[#BD1E1E] bg-[#FBEEEE] text-[#A01111]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Canvas preview */}
        <div className="mb-3 flex items-center justify-center rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3">
          <div className="w-full max-w-[240px]">
            {img ? (
              <canvas
                ref={canvasRef}
                className="aspect-[3/4] w-full cursor-grab touch-none rounded-sm shadow-sm active:cursor-grabbing"
                style={{ aspectRatio: FRAMES[frameKey].w / FRAMES[frameKey].h }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center text-xs text-slate-400" style={{ aspectRatio: FRAMES[frameKey].w / FRAMES[frameKey].h }}>
                {src ? 'Loading image…' : 'No image'}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-slate-600">Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(clampFloat(Number(e.target.value), MIN_ZOOM, MAX_ZOOM))}
              className="w-full accent-[#BD1E1E]"
              aria-label="Zoom"
            />
            <span className="text-[11px] font-semibold text-[#A01111]">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRot((r) => clampFloat(r - 90, 0, 360))}
              className="flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Rotate
            </button>
            <button
              type="button"
              onClick={() => setRot((r) => (r + 90) % 360)}
              className="flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Rotate
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setRot(0)
                setPan({ x: 0, y: 0 })
              }}
              className="ml-auto rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" className="flex-[2]" onClick={handleApply} disabled={!img}>
            Apply changes
          </Button>
        </div>
      </div>
    </div>
  )
}

function clampFloat(n, min, max) {
  return Math.min(max, Math.max(min, n))
}