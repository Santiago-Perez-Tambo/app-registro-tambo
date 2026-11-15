import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { esCaravanaRepetida, mensajeCaravanaRepetida, normalizarCaravana } from './animal.js'
import { armarAsiento, quedanPorConfirmar } from './asiento.js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
const ESTADOS_POR_CONFIRMAR = ['sincronizada', 'interpretada']
const ESTADOS_REVISADOS = ['confirmada', 'rechazada']
const COLUMNAS_DEL_ASIENTO = [
  'id_captura, id_usuario, fecha_hora, tipo_captura, texto, transcripcion, estado',
  'animal(caravana, categoria, estado_reproductivo)',
  'usuario(nombre, rol)',
  'evento(id_evento, id_usuario_confirma, fecha_confirmacion, tipo_evento, fecha_evento, tipo_servicio, toro, resultado_tacto, edad_gestacional, motivo_secado, sexo_ternero, animal(caravana, categoria, estado_reproductivo), usuario(nombre), advertencia(id_advertencia, tipo_advertencia, detalle, resuelta))',
].join(', ')

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

export async function leerTokenVigente() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return data.session?.access_token ?? null
}

export async function renovarToken() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error && isAuthRetryableFetchError(error)) {
    throw error
  }
  return data.session?.access_token ?? null
}

export async function cerrarSesionLocal() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) {
    throw error
  }
}

async function exigirSesionVigente() {
  if (!(await leerTokenVigente())) {
    throw new Error('No hay sesión vigente')
  }
}

export async function leerEnviadosHoy(idUsuario, dia) {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('captura')
    .select('id_captura, tipo_captura, fecha_hora, animal(caravana)')
    .eq('id_usuario', idUsuario)
    .gte('fecha_hora', `${dia}T00:00:00`)
    .lte('fecha_hora', `${dia}T23:59:59`)
    .order('fecha_hora')
  if (error) {
    throw error
  }
  return data.map((fila) => ({
    id_captura: fila.id_captura,
    tipo_captura: fila.tipo_captura,
    fecha_hora: fila.fecha_hora,
    caravana: fila.animal?.caravana,
  }))
}

export async function leerRodeo() {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('animal')
    .select('id_animal, caravana, categoria, estado_reproductivo, fecha_nacimiento, fecha_ingreso, id_madre')
    .is('fecha_baja', null)
    .order('caravana')
  if (error) {
    throw error
  }
  return data
}

export async function leerPorConfirmar() {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('captura')
    .select(COLUMNAS_DEL_ASIENTO)
    .in('estado', ESTADOS_POR_CONFIRMAR)
    .order('fecha_hora')
  if (error) {
    throw error
  }
  return quedanPorConfirmar(data).map(armarAsiento)
}

export async function leerRevisados(desde) {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('captura')
    .select(COLUMNAS_DEL_ASIENTO)
    .in('estado', ESTADOS_REVISADOS)
    .gte('fecha_hora', desde)
    .order('fecha_hora')
  if (error) {
    throw error
  }
  return data.map(armarAsiento)
}

export async function contarPorConfirmar() {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('captura')
    .select('id_captura, evento(id_usuario_confirma)')
    .in('estado', ESTADOS_POR_CONFIRMAR)
  if (error) {
    throw error
  }
  return quedanPorConfirmar(data).length
}

function errorDeCampo(campo, mensaje) {
  const error = new Error(mensaje)
  error.campo = campo
  return error
}

export async function buscarIdAnimal(caravana, idEstablecimiento) {
  await exigirSesionVigente()
  const { data, error } = await supabase
    .from('animal')
    .select('id_animal')
    .eq('id_establecimiento', idEstablecimiento)
    .eq('caravana', normalizarCaravana(caravana))
    .is('fecha_baja', null)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data?.id_animal ?? null
}

async function buscarIdMadre(textoMadre, idEstablecimiento) {
  const madre = normalizarCaravana(textoMadre)
  if (!madre) {
    return null
  }
  const idMadre = await buscarIdAnimal(madre, idEstablecimiento)
  if (!idMadre) {
    throw errorDeCampo('madre', `La madre ${madre} no está en el rodeo`)
  }
  return idMadre
}

export async function altaAnimal(datos, idEstablecimiento) {
  const caravana = normalizarCaravana(datos.caravana)
  const idMadre = await buscarIdMadre(datos.madre, idEstablecimiento)
  const { error } = await supabase.from('animal').insert({
    id_establecimiento: idEstablecimiento,
    caravana,
    categoria: datos.categoria,
    estado_reproductivo: datos.estado_reproductivo || null,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    fecha_ingreso: datos.fecha_ingreso || null,
    id_madre: idMadre,
  })
  if (esCaravanaRepetida(error)) {
    throw errorDeCampo('caravana', mensajeCaravanaRepetida(caravana))
  }
  if (error) {
    throw error
  }
  return caravana
}
