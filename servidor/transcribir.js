import OpenAI, { toFile } from 'openai'
import { tipoDelArchivo } from './captura.js'

const MODELO = 'whisper-1'
const IDIOMA = 'es'
const ESPERA_MAXIMA = 60 * 1000

const cliente = process.env.OPENAI_API_KEY ? new OpenAI({ timeout: ESPERA_MAXIMA }) : null

export async function transcribir(audio, ruta) {
  if (!cliente) {
    throw new Error('Falta OPENAI_API_KEY: el audio queda sin transcribir')
  }
  const archivo = await toFile(audio, ruta.split('/').at(-1), { type: tipoDelArchivo(ruta) })
  const respuesta = await cliente.audio.transcriptions.create({ file: archivo, model: MODELO, language: IDIOMA })
  return respuesta.text.trim()
}
