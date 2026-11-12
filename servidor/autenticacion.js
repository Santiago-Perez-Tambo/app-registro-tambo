import { supabase } from './supabase.js'
import { esTokenRechazado, puedeCapturar } from './captura.js'

const PREFIJO_TOKEN = 'Bearer '

function leerToken(pedido) {
  const encabezado = pedido.headers.authorization ?? ''
  if (!encabezado.startsWith(PREFIJO_TOKEN)) {
    return null
  }
  return encabezado.slice(PREFIJO_TOKEN.length)
}

async function buscarIdAuth(token) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error && esTokenRechazado(error)) {
    return null
  }
  if (error) {
    throw error
  }
  return data.user?.id ?? null
}

async function buscarUsuario(token) {
  if (!token) {
    return null
  }
  const idAuth = await buscarIdAuth(token)
  if (!idAuth) {
    return null
  }
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, rol, id_establecimiento')
    .eq('id_auth', idAuth)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

export async function exigirUsuario(pedido, respuesta, seguir) {
  try {
    pedido.usuario = await buscarUsuario(leerToken(pedido))
  } catch (error) {
    console.error(error)
    return respuesta.status(503).json({ error: 'No se pudo comprobar la sesión. Probá de nuevo.' })
  }
  if (!pedido.usuario) {
    return respuesta.status(401).json({ error: 'Sesión inválida' })
  }
  seguir()
}

export function exigirPermisoDeCaptura(pedido, respuesta, seguir) {
  if (!puedeCapturar(pedido.usuario.rol)) {
    return respuesta.status(403).json({ error: 'Tu usuario no puede registrar capturas' })
  }
  seguir()
}
