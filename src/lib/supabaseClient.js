import { createClient } from '@supabase/supabase-js'

const supabaseUrlValue = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigOk = Boolean(supabaseUrlValue && supabaseAnonKey)

export const supabase = supabaseConfigOk
  ? createClient(supabaseUrlValue, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key')
export const supabaseUrl = supabaseUrlValue || ''