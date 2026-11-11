import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

export function escucharCambiosDeSesion(alCambiar) {
  const { data } = supabase.auth.onAuthStateChange(alCambiar)
  return () => data.subscription.unsubscribe()
}

export async function entrarConCorreo(correo, contrasena) {
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
  if (error) {
    throw error
  }
}

export async function salirDeSupabase() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function buscarFilaUsuario(idAuth) {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nombre, rol, id_establecimiento')
    .eq('id_auth', idAuth)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}
