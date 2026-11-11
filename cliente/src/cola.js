import Dexie from 'dexie'
import { leerRodeo } from './supabase.js'

const base = new Dexie('registro_tambo')
base.version(1).stores({ rodeo: 'caravana' })

const CLAVE_FECHA_COPIA = 'fecha_copia_rodeo'
const CLAVE_ULTIMAS_VACAS = 'ultimas_vacas'
const CANTIDAD_ULTIMAS_VACAS = 6

export async function leerCopiaRodeo() {
  const animales = await base.rodeo.toArray()
  return { animales, fechaCopia: localStorage.getItem(CLAVE_FECHA_COPIA) }
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

export function textoFechaCopia(fechaCopia) {
  const momento = new Date(fechaCopia)
  const dia = momento.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const hora = momento.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `el ${dia} a las ${hora}`
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
