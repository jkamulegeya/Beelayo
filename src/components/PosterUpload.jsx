import { useEffect, useRef, useState } from 'react'
import { isValidPoster, MAX_POSTER_BYTES } from '../lib/storage.js'
import ImageEditor from './ImageEditor.jsx'

export default function PosterUpload({ file, onChange, initialUrl = null, onRemoveExisting }) {
  const inputRef = useRef(null)
  const editorUrlRef = useRef(null)
  const [filePreview, setFilePreview] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSrc, setEditorSrc] = useState(null)

  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    setCleared(false)
  }, [initialUrl])

  useEffect(() => {
    return () => {
      if (editorUrlRef.current) URL.revokeObjectURL(editorUrlRef.current)
    }
  }, [])

  const preview = file ? filePreview : !cleared && initialUrl ? initialUrl : null

  const openEditorWithUrl = (url) => {
    if (editorUrlRef.current) URL.revokeObjectURL(editorUrlRef.current)
    editorUrlRef.current = url
    setEditorSrc(url)
    setEditorOpen(true)
  }

  const handleFile = (f) => {
    setError('')
    if (!f) return
    const { ok, message } = isValidPoster(f)
    if (!ok) {
      setError(message)
      return
    }
    setCleared(false)
    onChange(f)
    openEditorWithUrl(URL.createObjectURL(f))
  }

  const handleEdit = async () => {
    setError('')
    if (file) {
      openEditorWithUrl(URL.createObjectURL(file))
      return
    }
    if (initialUrl) {
      try {
        const res = await fetch(initialUrl)
        if (!res.ok) throw new Error('Could not load the poster to edit it.')
        const blob = await res.blob()
        openEditorWithUrl(URL.createObjectURL(blob))
      } catch (e) {
        setError(e.message || 'Could not load the poster to edit it.')
      }
    }
  }

  const handleApply = (blob) => {
    onChange(new File([blob], 'poster.jpg', { type: 'image/jpeg' }))
    setEditorOpen(false)
  }

  const handleRemove = () => {
    setError('')
    if (file) {
      onChange(null)
    } else if (initialUrl) {
      setCleared(true)
      onRemoveExisting?.()
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Poster or banner (optional)</span>

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-8 text-center transition ${
            dragging
              ? 'border-[#D66464] bg-[#FBEEEE]'
              : 'border-slate-200 bg-slate-50 hover:border-[#E3A9A9] hover:bg-[#FBEEEE]/50'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6E0E0]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BD1E1E" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
          <span className="text-sm font-medium text-slate-700">Click to upload or drag &amp; drop</span>
          <span className="text-xs text-slate-400">JPG, PNG or WebP — max {Math.round(MAX_POSTER_BYTES / 1024 / 1024)}MB</span>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-sm border border-slate-200">
          <img src={preview} alt="Poster preview" className="max-h-56 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2.5">
            <button
              type="button"
              onClick={handleEdit}
              className="min-h-[40px] rounded-sm bg-white/95 px-3 py-2 text-xs font-semibold text-[#A01111] shadow hover:bg-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-[40px] rounded-sm bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-white"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="min-h-[40px] rounded-sm bg-white/95 px-3 py-2 text-xs font-semibold text-neutral-800 shadow hover:bg-white"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-neutral-800">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <ImageEditor open={editorOpen} src={editorSrc} onClose={() => setEditorOpen(false)} onSave={handleApply} />
    </div>
  )
}