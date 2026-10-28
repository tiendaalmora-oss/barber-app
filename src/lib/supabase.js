import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://osuhqrissvvjxuwotozo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_D0rE0wPkfyxPfITaH9PeWA_nE5S2-pi'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'gestion_negocios'
  }
})

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== '')
}
