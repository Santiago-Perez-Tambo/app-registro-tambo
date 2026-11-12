import { camposParaEnviar, quitarPrefijoBase64 } from './captura.js'

const URL_SERVIDOR = import.meta.env.VITE_SERVIDOR_URL
const ESPERA_MAXIMA = 90 * 1000

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

export async function enviarCaptura(captura, token) {
  const archivoBase64 = captura.tipo_captura === 'foto' ? await leerComoBase64(captura.archivo) : null
  try {
    const respuesta = await fetch(`${URL_SERVIDOR}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(camposParaEnviar(captura, archivoBase64)),
      signal: AbortSignal.timeout(ESPERA_MAXIMA),
    })
    return { status: respuesta.status, cuerpo: await leerCuerpo(respuesta) }
  } catch (error) {
    console.error(error)
    return { status: 0, cuerpo: null }
  }
}
