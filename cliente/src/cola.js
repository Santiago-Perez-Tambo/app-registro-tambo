import Dexie from 'dexie'
import { ahoraArgentina, ordenarPorFechaHora, queHacerConLaRespuesta, siguienteParaEnviar } from './captura.js'
import { enviarCaptura } from './servidor.js'
import { leerRodeo, leerTokenVigente, renovarToken } from './supabase.js'

const base = new Dexie('registro_tambo')
base.version(1).stores({ rodeo: 'caravana' })
base.version(2).stores({
  rodeo: 'caravana',
  capturas: 'id_captura, id_usuario, fecha_hora',
})

const CLAVE_FECHA_COPIA = 'fecha_copia_rodeo'
const CLAVE_ULTIMAS_VACAS = 'ultimas_vacas'
const CANTIDAD_ULTIMAS_VACAS = 6

let vueltaEnCurso = false
let estadoEnvio = { enCurso: false, idEnviando: null, resumen: null }
const escuchas = new Set()

export async function pedirAlmacenamientoPersistente() {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist()
    }
  } catch (error) {
    console.error(error)
  }
}

export async function leerCopiaRodeo() {
  const animales = await base.rodeo.toArray()
  return { animales, fechaCopia: localStorage.getItem(CLAVE_FECHA_COPIA) }
}

export async function buscarVacaEnCopia(caravana) {
  return (await base.rodeo.get(caravana)) ?? null
}

async function pisarCopiaRodeo() {
  try {
    const animales = await leerRodeo()
    await base.transaction('rw', base.rodeo, async () => {
      await base.rodeo.clear()
      await base.rodeo.bulkPut(animales)
    })
    localStorage.setItem(CLAVE_FECHA_COPIA, new Date().toISOString())
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function actualizarRodeo() {
  const actualizada = navigator.onLine && (await pisarCopiaRodeo())
  return { ...(await leerCopiaRodeo()), actualizada }
}

export function ultimasVacas() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ULTIMAS_VACAS)) ?? []
  } catch (error) {
    console.error(error)
    return []
  }
}

export function recordarVaca(caravana) {
  const otras = ultimasVacas().filter((guardada) => guardada !== caravana)
  const ultimas = [caravana, ...otras].slice(0, CANTIDAD_ULTIMAS_VACAS)
  localStorage.setItem(CLAVE_ULTIMAS_VACAS, JSON.stringify(ultimas))
}

export async function guardarCaptura({ idUsuario, animal, tipoCaptura, texto, archivo }) {
  const captura = {
    id_captura: crypto.randomUUID(),
    id_usuario: idUsuario,
    id_animal: animal.id_animal,
    caravana: animal.caravana,
    tipo_captura: tipoCaptura,
    texto,
    archivo,
    fecha_hora: ahoraArgentina(),
    estado: 'en_celular',
  }
  await base.capturas.add(captura)
  return captura.id_captura
}

export async function listarPendientes(idUsuario) {
  return ordenarPorFechaHora(await base.capturas.where('id_usuario').equals(idUsuario).toArray())
}

export function contarPendientes(idUsuario) {
  return base.capturas.where('id_usuario').equals(idUsuario).count()
}

function borrarCaptura(idCaptura) {
  return base.capturas.delete(idCaptura)
}

function guardarMotivo(idCaptura, motivo) {
  return base.capturas.update(idCaptura, { motivo })
}

export function escucharEnvio(alCambiar) {
  escuchas.add(alCambiar)
  alCambiar({ ...estadoEnvio, resumen: null })
  return () => {
    escuchas.delete(alCambiar)
  }
}

function avisar(cambios) {
  estadoEnvio = { ...estadoEnvio, ...cambios }
  for (const alCambiar of escuchas) {
    alCambiar(estadoEnvio)
  }
}

async function mandarYDecidir(captura, token) {
  const { status, cuerpo } = await enviarCaptura(captura, token)
  return queHacerConLaRespuesta(status, cuerpo)
}

async function enviarUna(captura, token) {
  const primera = await mandarYDecidir(captura, token)
  if (primera.accion !== 'renovarToken') {
    return { ...primera, token }
  }
  const tokenNuevo = await renovarToken()
  if (!tokenNuevo) {
    return { accion: 'sesionVencida' }
  }
  const segunda = await mandarYDecidir(captura, tokenNuevo)
  if (segunda.accion === 'renovarToken') {
    return { accion: 'sesionVencida' }
  }
  return { ...segunda, token: tokenNuevo }
}

async function aplicarDecision(captura, decision) {
  if (decision.accion === 'borrar') {
    await borrarCaptura(captura.id_captura)
    return 1
  }
  if (decision.accion === 'guardarMotivo') {
    await guardarMotivo(captura.id_captura, decision.motivo)
  }
  return 0
}

async function buscarSiguiente(idUsuario, intentadas, incluirConMotivo) {
  return siguienteParaEnviar(await listarPendientes(idUsuario), intentadas, incluirConMotivo)
}

async function recorrerCola(idUsuario, token, incluirConMotivo) {
  const intentadas = new Set()
  let enviadas = 0
  let tokenActual = token
  let captura = await buscarSiguiente(idUsuario, intentadas, incluirConMotivo)
  while (captura) {
    intentadas.add(captura.id_captura)
    avisar({ idEnviando: captura.id_captura })
    const decision = await enviarUna(captura, tokenActual)
    if (decision.accion === 'cortar' || decision.accion === 'sesionVencida') {
      return { enviadas, cortada: decision.accion === 'cortar', sesionVencida: decision.accion === 'sesionVencida' }
    }
    enviadas += await aplicarDecision(captura, decision)
    tokenActual = decision.token
    avisar({ idEnviando: null })
    captura = await buscarSiguiente(idUsuario, intentadas, incluirConMotivo)
  }
  return { enviadas, cortada: false, sesionVencida: false }
}

async function vueltaConToken(idUsuario, incluirConMotivo) {
  const token = await leerTokenVigente()
  if (!token) {
    return { enviadas: 0, cortada: false, sesionVencida: true }
  }
  return recorrerCola(idUsuario, token, incluirConMotivo)
}

export async function enviarCola(idUsuario, incluirConMotivo) {
  if (vueltaEnCurso || !navigator.onLine) {
    return
  }
  vueltaEnCurso = true
  avisar({ enCurso: true, resumen: null })
  let resumen = { enviadas: 0, cortada: true, sesionVencida: false }
  try {
    resumen = await vueltaConToken(idUsuario, incluirConMotivo)
  } catch (error) {
    console.error(error)
  } finally {
    vueltaEnCurso = false
    avisar({ enCurso: false, idEnviando: null, resumen })
  }
}
