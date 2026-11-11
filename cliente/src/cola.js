import Dexie from 'dexie'
import { leerRodeo } from './supabase.js'

const base = new Dexie('registro_tambo')
base.version(1).stores({ rodeo: 'caravana' })

const CLAVE_FECHA_COPIA = 'fecha_copia_rodeo'
const CLAVE_ULTIMAS_VACAS = 'ultimas_vacas'
const CANTIDAD_ULTIMAS_VACAS = 6
const MILISEGUNDOS_POR_HORA = 60 * 60 * 1000
const DIFERENCIA_ARGENTINA_HORAS = -3

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

function dosCifras(numero) {
  return String(numero).padStart(2, '0')
}

export function textoFechaCopia(fechaCopia) {
  const horaUniversal = new Date(fechaCopia).getTime()
  const enArgentina = new Date(horaUniversal + DIFERENCIA_ARGENTINA_HORAS * MILISEGUNDOS_POR_HORA)
  const dia = `${dosCifras(enArgentina.getUTCDate())}/${dosCifras(enArgentina.getUTCMonth() + 1)}`
  const hora = `${dosCifras(enArgentina.getUTCHours())}:${dosCifras(enArgentina.getUTCMinutes())}`
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
