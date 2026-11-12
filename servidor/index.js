import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './supabase.js'
import { exigirPermisoDeCaptura, exigirUsuario } from './autenticacion.js'
import {
  ahoraArgentina,
  validarCaptura,
  rutaDelArchivo,
  esArchivoRepetido,
  esCapturaRepetida,
} from './captura.js'

const DEPOSITO_CAPTURAS = 'capturas'
const TAMANO_MAXIMO_PEDIDO = '8mb'
const origenPermitido = process.env.ORIGEN_PERMITIDO
const puerto = process.env.PORT || 3000

if (!origenPermitido) {
  console.error('Falta ORIGEN_PERMITIDO')
  process.exit(1)
}

async function animalEsDelEstablecimiento(idAnimal, idEstablecimiento) {
  const { data, error } = await supabase
    .from('animal')
    .select('id_animal')
    .eq('id_animal', idAnimal)
    .eq('id_establecimiento', idEstablecimiento)
    .is('fecha_baja', null)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data !== null
}

async function subirFoto(ruta, archivoBase64) {
  const { error } = await supabase.storage
    .from(DEPOSITO_CAPTURAS)
    .upload(ruta, Buffer.from(archivoBase64, 'base64'), { contentType: 'image/jpeg', upsert: false })
  if (error && !esArchivoRepetido(error)) {
    throw error
  }
}

async function guardarCaptura(datos, usuario, archivo) {
  const { error } = await supabase.from('captura').insert({
    id_captura: datos.id_captura,
    id_usuario: usuario.id_usuario,
    id_animal: datos.id_animal,
    fecha_hora: datos.fecha_hora,
    tipo_captura: datos.tipo_captura,
    texto: datos.tipo_captura === 'texto' ? datos.texto.trim() : null,
    archivo,
    estado: 'sincronizada',
  })
  if (!error) {
    return { recibida: true }
  }
  if (esCapturaRepetida(error)) {
    return { recibida: true, repetida: true }
  }
  throw error
}

async function recibirCaptura(pedido, respuesta) {
  const datos = pedido.body ?? {}
  const errorDeDatos = validarCaptura(datos)
  if (errorDeDatos) {
    return respuesta.status(400).json({ error: errorDeDatos })
  }
  try {
    const { id_establecimiento } = pedido.usuario
    if (!(await animalEsDelEstablecimiento(datos.id_animal, id_establecimiento))) {
      return respuesta.status(403).json({ error: 'Ese animal no es de tu establecimiento' })
    }
    let archivo = null
    if (datos.tipo_captura === 'foto') {
      archivo = rutaDelArchivo(id_establecimiento, datos.id_captura)
      await subirFoto(archivo, datos.archivo_base64)
    }
    respuesta.json(await guardarCaptura(datos, pedido.usuario, archivo))
  } catch (error) {
    console.error(error)
    respuesta.status(500).json({ error: 'No se pudo guardar la captura' })
  }
}

function responderRutaInexistente(pedido, respuesta) {
  respuesta.status(404).json({ error: 'Ruta no encontrada' })
}

function responderPedidoConError(error, pedido, respuesta, seguir) {
  console.error(error)
  if (error.type === 'entity.too.large') {
    return respuesta.status(413).json({ error: 'La captura es demasiado grande' })
  }
  if (error.type === 'entity.parse.failed') {
    return respuesta.status(400).json({ error: 'La captura no se pudo leer' })
  }
  respuesta.status(500).json({ error: 'Error en el servidor' })
}

const app = express()
app.disable('x-powered-by')
app.use(cors({ origin: origenPermitido }))

app.get('/salud', (pedido, respuesta) => {
  respuesta.json({ ok: true, hora: ahoraArgentina() })
})

app.post(
  '/sync',
  exigirUsuario,
  exigirPermisoDeCaptura,
  express.json({ limit: TAMANO_MAXIMO_PEDIDO }),
  recibirCaptura,
)

app.use(responderRutaInexistente)
app.use(responderPedidoConError)

app.listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`)
})
