import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your-supabase-url' &&
    supabaseAnonKey !== 'your-supabase-anon-key'

// Create client only if configured to avoid runtime crash on invalid URL
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = !!isConfigured
