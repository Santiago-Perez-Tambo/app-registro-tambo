import Dexie from 'dexie'
import { ahoraArgentina } from './captura.js'
import { leerRodeo } from './supabase.js'

const base = new Dexie('registro_tambo')
base.version(1).stores({ rodeo: 'caravana' })
base.version(2).stores({
  rodeo: 'caravana',
  capturas: 'id_captura, id_usuario, fecha_hora',
})

const CLAVE_FECHA_COPIA = 'fecha_copia_rodeo'
const CLAVE_ULTIMAS_VACAS = 'ultimas_vacas'
const CANTIDAD_ULTIMAS_VACAS = 6

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

export function listarPendientes(idUsuario) {
  return base.capturas.where('id_usuario').equals(idUsuario).sortBy('fecha_hora')
}

export function contarPendientes(idUsuario) {
  return base.capturas.where('id_usuario').equals(idUsuario).count()
}

export function borrarCaptura(idCaptura) {
  return base.capturas.delete(idCaptura)
}
