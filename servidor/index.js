import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase, DEPOSITO_CAPTURAS } from './supabase.js'
import { exigirPermisoDeCaptura, exigirUsuario } from './autenticacion.js'
import { interpretarCaptura } from './interpretar.js'
import {
  ahoraArgentina,
  validarCaptura,
  rutaDelArchivo,
  esArchivoRepetido,
  esCapturaRepetida,
  esUuid,
  puedeInterpretar,
} from './captura.js'

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

function armarFilaDeCaptura(datos, usuario, archivo) {
  return {
    id_captura: datos.id_captura,
    id_usuario: usuario.id_usuario,
    id_animal: datos.id_animal,
    fecha_hora: datos.fecha_hora,
    tipo_captura: datos.tipo_captura,
    texto: datos.tipo_captura === 'texto' ? datos.texto.trim() : null,
    archivo,
    estado: 'sincronizada',
  }
}

async function guardarCaptura(fila) {
  const { error } = await supabase.from('captura').insert(fila)
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
    const fila = armarFilaDeCaptura(datos, pedido.usuario, archivo)
    const resultado = await guardarCaptura(fila)
    respuesta.json(resultado)
    if (!resultado.repetida) {
      interpretarSinEsperar(fila, datos.archivo_base64)
    }
  } catch (error) {
    console.error(error)
    respuesta.status(500).json({ error: 'No se pudo guardar la captura' })
  }
}

function interpretarSinEsperar(captura, foto) {
  interpretarCaptura(captura, foto).catch((error) => {
    console.error(`No se pudo interpretar la captura ${captura.id_captura}`, error)
  })
}

async function buscarCaptura(idCaptura) {
  const { data, error } = await supabase
    .from('captura')
    .select(
      'id_captura, id_usuario, id_animal, fecha_hora, tipo_captura, texto, archivo, animal(id_establecimiento), evento(id_usuario_confirma)',
    )
    .eq('id_captura', idCaptura)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

function estaConfirmada(captura) {
  return captura.evento.some((evento) => evento.id_usuario_confirma !== null)
}

async function volverAInterpretar(pedido, respuesta) {
  const { id_captura } = pedido.params
  if (!esUuid(id_captura)) {
    return respuesta.status(400).json({ error: 'El identificador de la captura no es válido' })
  }
  try {
    const captura = await buscarCaptura(id_captura)
    if (!captura || captura.animal?.id_establecimiento !== pedido.usuario.id_establecimiento) {
      return respuesta.status(404).json({ error: 'No se encontró la captura' })
    }
    if (!puedeInterpretar(pedido.usuario, captura)) {
      return respuesta.status(403).json({ error: 'Tu usuario no puede volver a interpretar esta captura' })
    }
    if (estaConfirmada(captura)) {
      return respuesta.status(409).json({ error: 'Ese asiento ya está confirmado y no se vuelve a interpretar' })
    }
    const idEvento = await interpretarCaptura(captura, null)
    respuesta.json({ interpretada: true, id_evento: idEvento })
  } catch (error) {
    console.error(error)
    respuesta.status(502).json({ error: 'No se pudo interpretar. Probá de nuevo.' })
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

app.post('/interpretar/:id_captura', exigirUsuario, volverAInterpretar)

app.use(responderRutaInexistente)
app.use(responderPedidoConError)

app.listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`)
})
