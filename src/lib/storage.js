import { supabase } from './supabaseClient.js'

export const MAX_POSTER_BYTES = 3 * 1024 * 1024

export function isValidPoster(file) {
  if (!file) return { ok: false, message: '' }
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Please choose an image file (JPG, PNG, WebP).' }
  }
  if (file.size > MAX_POSTER_BYTES) {
    return { ok: false, message: 'Image is bigger than 3MB. Please use a smaller file.' }
  }
  return { ok: true, message: '' }
}

export async function uploadPoster(eventId, file) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to upload a poster.')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/${eventId}/poster.${ext}`
  const { data, error } = await supabase.storage
    .from('posters')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error

  const { data: publicUrl } = supabase.storage.from('posters').getPublicUrl(data.path)
  return publicUrl.publicUrl
}

export async function deletePoster(userId, eventId) {
  const folder = `${userId}/${eventId}`
  const { data: items } = await supabase.storage.from('posters').list(folder)
  const paths = (items || []).map((i) => `${folder}/${i.name}`)
  if (paths.length > 0) {
    await supabase.storage.from('posters').remove(paths)
  }
}