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
  puedeRevisar,
  puedeConsultar,
  estaPorConfirmar,
  validarConfirmacion,
  ESTADOS_POR_CONFIRMAR,
} from './captura.js'

const TAMANO_MAXIMO_PEDIDO = '8mb'
const VENCIMIENTO_ENLACE_FOTO = 5 * 60
const AVISO_YA_REVISADO = 'Este asiento ya fue confirmado o rechazado'
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
      'id_captura, id_usuario, id_animal, fecha_hora, tipo_captura, texto, archivo, estado, animal(id_establecimiento), evento(id_usuario_confirma)',
    )
    .eq('id_captura', idCaptura)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

function yaFueRevisada(captura) {
  const confirmada = captura.evento.some((evento) => evento.id_usuario_confirma !== null)
  return confirmada || !ESTADOS_POR_CONFIRMAR.includes(captura.estado)
}

function esDeOtroEstablecimiento(captura, usuario) {
  return !captura || captura.animal?.id_establecimiento !== usuario.id_establecimiento
}

async function volverAInterpretar(pedido, respuesta) {
  const { id_captura } = pedido.params
  if (!esUuid(id_captura)) {
    return respuesta.status(400).json({ error: 'El identificador de la captura no es válido' })
  }
  try {
    const captura = await buscarCaptura(id_captura)
    if (esDeOtroEstablecimiento(captura, pedido.usuario)) {
      return respuesta.status(404).json({ error: 'No se encontró la captura' })
    }
    if (!puedeRevisar(pedido.usuario, captura)) {
      return respuesta.status(403).json({ error: 'Tu usuario no puede volver a interpretar esta captura' })
    }
    if (yaFueRevisada(captura)) {
      return respuesta.status(409).json({ error: AVISO_YA_REVISADO })
    }
    const idEvento = await interpretarCaptura(captura, null)
    respuesta.json({ interpretada: true, id_evento: idEvento })
  } catch (error) {
    console.error(error)
    respuesta.status(502).json({ error: 'No se pudo interpretar. Probá de nuevo.' })
  }
}

async function buscarEvento(idEvento) {
  const { data, error } = await supabase
    .from('evento')
    .select('id_evento, id_captura, id_usuario_confirma, animal(id_establecimiento), captura(id_usuario, estado)')
    .eq('id_evento', idEvento)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

function leerIdEvento(texto) {
  const numero = Number(texto)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

async function cargarEventoParaRevisar(pedido, respuesta, seguir) {
  const idEvento = leerIdEvento(pedido.params.id_evento)
  try {
    pedido.evento = idEvento ? await buscarEvento(idEvento) : null
  } catch (error) {
    console.error(error)
    return respuesta.status(500).json({ error: 'No se pudo leer el asiento. Probá de nuevo.' })
  }
  const evento = pedido.evento
  if (!evento?.captura || evento.animal?.id_establecimiento !== pedido.usuario.id_establecimiento) {
    return respuesta.status(404).json({ error: 'No se encontró el asiento' })
  }
  if (!puedeRevisar(pedido.usuario, evento.captura)) {
    return respuesta.status(403).json({ error: 'Tu usuario no puede confirmar ni rechazar este asiento' })
  }
  if (!estaPorConfirmar(evento)) {
    return respuesta.status(409).json({ error: AVISO_YA_REVISADO })
  }
  seguir()
}

async function guardarConfirmacion(idEvento, evento, idUsuario) {
  const { data, error } = await supabase
    .from('evento')
    .update({ ...evento, id_usuario_confirma: idUsuario, fecha_confirmacion: ahoraArgentina() })
    .eq('id_evento', idEvento)
    .is('id_usuario_confirma', null)
    .select('id_evento')
  if (error) {
    throw error
  }
  return data.length > 0
}

async function cambiarEstadoDeCaptura(idCaptura, estado) {
  const { data, error } = await supabase
    .from('captura')
    .update({ estado })
    .eq('id_captura', idCaptura)
    .in('estado', ESTADOS_POR_CONFIRMAR)
    .select('id_captura')
  if (error) {
    throw error
  }
  return data.length > 0
}

async function resolverAdvertencias(idEvento) {
  const { error } = await supabase.from('advertencia').update({ resuelta: true }).eq('id_evento', idEvento)
  if (error) {
    throw error
  }
}

async function confirmarAsiento(pedido, respuesta) {
  const { error, evento } = validarConfirmacion(pedido.body, ahoraArgentina().slice(0, 10))
  if (error) {
    return respuesta.status(400).json({ error })
  }
  try {
    const { id_evento, id_captura } = pedido.evento
    if (!(await guardarConfirmacion(id_evento, evento, pedido.usuario.id_usuario))) {
      return respuesta.status(409).json({ error: AVISO_YA_REVISADO })
    }
    await cambiarEstadoDeCaptura(id_captura, 'confirmada')
    await resolverAdvertencias(id_evento)
    respuesta.json({ confirmado: true })
  } catch (errorAlGuardar) {
    console.error(errorAlGuardar)
    respuesta.status(500).json({ error: 'No se pudo confirmar el asiento. Probá de nuevo.' })
  }
}

async function rechazarAsiento(pedido, respuesta) {
  try {
    if (!(await cambiarEstadoDeCaptura(pedido.evento.id_captura, 'rechazada'))) {
      return respuesta.status(409).json({ error: AVISO_YA_REVISADO })
    }
    respuesta.json({ rechazado: true })
  } catch (error) {
    console.error(error)
    respuesta.status(500).json({ error: 'No se pudo rechazar el asiento. Probá de nuevo.' })
  }
}

async function firmarEnlace(ruta) {
  const { data, error } = await supabase.storage
    .from(DEPOSITO_CAPTURAS)
    .createSignedUrl(ruta, VENCIMIENTO_ENLACE_FOTO)
  if (error) {
    throw error
  }
  return data.signedUrl
}

async function darEnlaceDeFoto(pedido, respuesta) {
  if (!puedeConsultar(pedido.usuario)) {
    return respuesta.status(403).json({ error: 'Tu usuario no puede ver las fotos de las capturas' })
  }
  const { id_captura } = pedido.params
  try {
    const captura = esUuid(id_captura) ? await buscarCaptura(id_captura) : null
    if (esDeOtroEstablecimiento(captura, pedido.usuario) || !captura.archivo) {
      return respuesta.status(404).json({ error: 'No se encontró la foto' })
    }
    respuesta.json({ url: await firmarEnlace(captura.archivo) })
  } catch (error) {
    console.error(error)
    respuesta.status(500).json({ error: 'No se pudo traer la foto. Probá de nuevo.' })
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

app.post(
  '/eventos/:id_evento/confirmar',
  exigirUsuario,
  express.json(),
  cargarEventoParaRevisar,
  confirmarAsiento,
)

app.post('/eventos/:id_evento/rechazar', exigirUsuario, cargarEventoParaRevisar, rechazarAsiento)

app.get('/capturas/:id_captura/foto', exigirUsuario, darEnlaceDeFoto)

app.use(responderRutaInexistente)
app.use(responderPedidoConError)

app.listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`)
})
