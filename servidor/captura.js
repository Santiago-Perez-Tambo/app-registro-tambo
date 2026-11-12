const LARGO_MAXIMO_TEXTO = 280
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024
const INICIO_JPEG = Buffer.from([0xff, 0xd8, 0xff])
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FORMA_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
const TOLERANCIA_RELOJ = 24 * 60 * 60 * 1000
const ROLES_QUE_CAPTURAN = ['tambero', 'propietario', 'asesor']

const FORMATO_ARGENTINA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Cordoba',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function ahoraArgentina(fecha = new Date()) {
  const partes = {}
  for (const parte of FORMATO_ARGENTINA.formatToParts(fecha)) {
    partes[parte.type] = parte.value
  }
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`
}

export function puedeCapturar(rol) {
  return ROLES_QUE_CAPTURAN.includes(rol)
}

export function esTokenRechazado(error) {
  return error.status >= 400 && error.status < 500
}

function tieneForma(valor, forma) {
  return typeof valor === 'string' && forma.test(valor)
}

function esFechaReal(fechaHora) {
  const fecha = new Date(`${fechaHora}Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 19) === fechaHora
}

function estaAdelantada(fechaHora) {
  const limite = ahoraArgentina(new Date(Date.now() + TOLERANCIA_RELOJ))
  return fechaHora > limite
}

function validarFechaHora(fechaHora) {
  if (!tieneForma(fechaHora, FORMA_FECHA_HORA) || !esFechaReal(fechaHora)) {
    return 'La fecha de la captura no es válida'
  }
  if (estaAdelantada(fechaHora)) {
    return 'La fecha de la captura está adelantada. Revisá la hora del celular.'
  }
  return null
}

function validarTexto(texto) {
  const limpio = typeof texto === 'string' ? texto.trim() : ''
  if (limpio.length === 0) {
    return 'El texto está vacío'
  }
  if (limpio.length > LARGO_MAXIMO_TEXTO) {
    return `El texto pasa de ${LARGO_MAXIMO_TEXTO} letras`
  }
  return null
}

function empiezaComoJpeg(archivoBase64) {
  const primerosBytes = Buffer.from(archivoBase64.slice(0, 4), 'base64')
  return primerosBytes.equals(INICIO_JPEG)
}

function validarFoto(archivoBase64, tipoArchivo) {
  if (typeof archivoBase64 !== 'string' || archivoBase64.length === 0) {
    return 'Falta el archivo de la foto'
  }
  if (tipoArchivo !== 'image/jpeg' || !empiezaComoJpeg(archivoBase64)) {
    return 'La foto tiene que ser JPEG'
  }
  if (Buffer.byteLength(archivoBase64, 'base64') > TAMANO_MAXIMO_FOTO) {
    return 'La foto pasa de 5 MB'
  }
  return null
}

export function validarCaptura(datos) {
  if (!tieneForma(datos.id_captura, FORMA_UUID)) {
    return 'El identificador de la captura no es válido'
  }
  if (!Number.isInteger(datos.id_animal)) {
    return 'Falta el animal de la captura'
  }
  const errorDeFecha = validarFechaHora(datos.fecha_hora)
  if (errorDeFecha) {
    return errorDeFecha
  }
  if (datos.tipo_captura === 'texto') {
    return validarTexto(datos.texto)
  }
  if (datos.tipo_captura === 'foto') {
    return validarFoto(datos.archivo_base64, datos.tipo_archivo)
  }
  return 'El tipo de captura no es válido'
}

export function rutaDelArchivo(idEstablecimiento, idCaptura) {
  return `${idEstablecimiento}/${idCaptura}.jpg`
}

export function esArchivoRepetido(error) {
  return error.statusCode === '409' || error.status === 409
}

export function esCapturaRepetida(error) {
  return error.code === '23505'
}
