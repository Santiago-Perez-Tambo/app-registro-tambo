import { supabase } from './supabase.js'

const PREFIJO_TOKEN = 'Bearer '

function leerToken(req) {
  const encabezado = req.headers.authorization ?? ''
  if (!encabezado.startsWith(PREFIJO_TOKEN)) {
    return null
  }
  return encabezado.slice(PREFIJO_TOKEN.length)
}

async function buscarUsuario(token) {
  if (!token) {
    return null
  }
  const { data: sesion, error: errorSesion } = await supabase.auth.getUser(token)
  if (errorSesion || !sesion.user) {
    return null
  }
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, rol, id_establecimiento')
    .eq('id_auth', sesion.user.id)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

export async function exigirUsuario(req, res, next) {
  try {
    req.usuario = await buscarUsuario(leerToken(req))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'No se pudo verificar la sesión' })
  }
  if (!req.usuario) {
    return res.status(401).json({ error: 'Sesión inválida' })
  }
  next()
}
