import { camposParaEnviar, quitarPrefijoBase64 } from './captura.js'
import { leerTokenVigente, renovarToken } from './supabase.js'

const URL_SERVIDOR = import.meta.env.VITE_SERVIDOR_URL
const ESPERA_MAXIMA = 90 * 1000
const AVISO_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá la conexión y probá de nuevo.'
const AVISO_SESION_VENCIDA = 'La sesión venció. Salí y entrá de nuevo.'
const AVISO_SIN_DETALLE = 'El servidor no pudo hacer el pedido. Probá de nuevo.'

function leerComoBase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(quitarPrefijoBase64(lector.result))
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(archivo)
  })
}

async function leerCuerpo(respuesta) {
  try {
    return await respuesta.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

async function llamar(ruta, metodo, datos, token) {
  try {
    const respuesta = await fetch(`${URL_SERVIDOR}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: datos ? JSON.stringify(datos) : undefined,
      signal: AbortSignal.timeout(ESPERA_MAXIMA),
    })
    return { status: respuesta.status, cuerpo: await leerCuerpo(respuesta) }
  } catch (error) {
    console.error(error)
    return { status: 0, cuerpo: null }
  }
}

export async function enviarCaptura(captura, token) {
  const archivoBase64 = captura.archivo ? await leerComoBase64(captura.archivo) : null
  return llamar('/sync', 'POST', camposParaEnviar(captura, archivoBase64), token)
}

function mensajeDeError(status, cuerpo) {
  if (status === 0) {
    return AVISO_SIN_CONEXION
  }
  if (status === 401) {
    return AVISO_SESION_VENCIDA
  }
  return cuerpo?.error ?? AVISO_SIN_DETALLE
}

async function pedirConSesion(ruta, metodo, datos) {
  let resultado = await llamar(ruta, metodo, datos, await leerTokenVigente())
  if (resultado.status === 401) {
    const tokenNuevo = await renovarToken()
    if (tokenNuevo) {
      resultado = await llamar(ruta, metodo, datos, tokenNuevo)
    }
  }
  if (resultado.status < 200 || resultado.status >= 300) {
    const error = new Error(mensajeDeError(resultado.status, resultado.cuerpo))
    error.status = resultado.status
    throw error
  }
  return resultado.cuerpo
}

export function confirmarEvento(idEvento, datos) {
  return pedirConSesion(`/eventos/${idEvento}/confirmar`, 'POST', datos)
}

export function rechazarEvento(idEvento) {
  return pedirConSesion(`/eventos/${idEvento}/rechazar`, 'POST', null)
}

export function reinterpretarCaptura(idCaptura) {
  return pedirConSesion(`/interpretar/${idCaptura}`, 'POST', null)
}

export function pedirArchivo(idCaptura) {
  return pedirConSesion(`/capturas/${idCaptura}/archivo`, 'GET', null)
}
