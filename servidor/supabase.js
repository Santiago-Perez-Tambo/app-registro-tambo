import { createClient } from '@supabase/supabase-js'

export const DEPOSITO_CAPTURAS = 'capturas'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_CLAVE_SECRETA,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
