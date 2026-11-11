import { createClient } from '@supabase/supabase-js'
import { mensajeCaravanaRepetida, normalizarCaravana } from './animal.js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
const CODIGO_DATO_REPETIDO = '23505'

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

export async function leerRodeo() {
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

function errorDeCampo(campo, mensaje) {
  const error = new Error(mensaje)
  error.campo = campo
  return error
}

async function buscarIdMadre(textoMadre, idEstablecimiento) {
  const madre = normalizarCaravana(textoMadre)
  if (!madre) {
    return null
  }
  const { data, error } = await supabase
    .from('animal')
    .select('id_animal')
    .eq('id_establecimiento', idEstablecimiento)
    .eq('caravana', madre)
    .is('fecha_baja', null)
    .maybeSingle()
  if (error) {
    throw error
  }
  if (!data) {
    throw errorDeCampo('madre', `La madre ${madre} no está en el rodeo`)
  }
  return data.id_animal
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
  if (error?.code === CODIGO_DATO_REPETIDO) {
    throw errorDeCampo('caravana', mensajeCaravanaRepetida(caravana))
  }
  if (error) {
    throw error
  }
  return caravana
}
