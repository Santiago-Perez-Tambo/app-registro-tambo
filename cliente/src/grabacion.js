import { GRABACION_MAXIMA } from './captura.js'

export function sePuedeGrabar() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
}

export async function estadoDelPermiso() {
  try {
    const permiso = await navigator.permissions.query({ name: 'microphone' })
    return permiso.state
  } catch (error) {
    console.error(error)
    return 'desconocido'
  }
}

function apagarMicrofono(flujo) {
  for (const pista of flujo.getTracks()) {
    pista.stop()
  }
}

export async function pedirPermiso() {
  apagarMicrofono(await navigator.mediaDevices.getUserMedia({ audio: true }))
}

function esperarElFin(grabador, flujo) {
  const partes = []
  grabador.ondataavailable = (evento) => {
    if (evento.data.size > 0) {
      partes.push(evento.data)
    }
  }
  return new Promise((resolver, rechazar) => {
    grabador.onstop = () => {
      apagarMicrofono(flujo)
      resolver(new Blob(partes, { type: grabador.mimeType || partes[0]?.type || '' }))
    }
    grabador.onerror = (evento) => {
      apagarMicrofono(flujo)
      rechazar(evento.error)
    }
  })
}

function arrancarGrabador(flujo) {
  try {
    const grabador = new MediaRecorder(flujo)
    const fin = esperarElFin(grabador, flujo)
    grabador.start()
    return { grabador, fin }
  } catch (error) {
    apagarMicrofono(flujo)
    throw error
  }
}

export async function empezarGrabacion(alLlegarAlTope) {
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: true })
  const { grabador, fin } = arrancarGrabador(flujo)
  const inicio = Date.now()
  const tope = setTimeout(alLlegarAlTope, GRABACION_MAXIMA)
  return async function terminar() {
    clearTimeout(tope)
    const milisegundos = Date.now() - inicio
    if (grabador.state !== 'inactive') {
      grabador.stop()
    }
    return { archivo: await fin, milisegundos }
  }
}
