import { DIAS_GESTACION } from './reglas.js'

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

export function esUuid(valor) {
  return tieneForma(valor, FORMA_UUID)
}

export function puedeInterpretar(usuario, captura) {
  if (usuario.rol === 'propietario') {
    return true
  }
  return usuario.rol === 'asesor' && captura.id_usuario === usuario.id_usuario
}

export const TIPOS_DE_EVENTO = ['servicio', 'tacto', 'secado', 'parto']
export const TIPOS_DE_SERVICIO = ['inseminación', 'monta natural']
export const RESULTADOS_DE_TACTO = ['preñada', 'vacía']
export const MOTIVOS_DE_SECADO = ['preñez', 'baja producción']
export const MOTIVO_SECADO_SIN_REGISTRO = 'tratamiento'
export const SEXOS_DE_TERNERO = ['M', 'H']
export const UNIDADES_DE_EDAD = ['meses', 'días']

const NOMBRES_DE_CAMPO = {
  tipo_evento: 'el tipo de evento',
  fecha_evento: 'la fecha',
  tipo_servicio: 'el tipo de servicio',
  toro: 'el toro',
  resultado_tacto: 'el resultado del tacto',
  edad_gestacional: 'la edad gestacional',
  motivo_secado: 'el motivo del secado',
  sexo_ternero: 'el sexo del ternero',
}

export const CAMPOS_QUE_SE_INTERPRETAN = Object.keys(NOMBRES_DE_CAMPO)

const CAMPOS_POR_TIPO = {
  servicio: ['tipo_servicio', 'toro'],
  tacto: ['resultado_tacto', 'edad_gestacional'],
  secado: ['motivo_secado'],
  parto: ['sexo_ternero'],
}

const DIAS_POR_MES = 30
const LARGO_MAXIMO_TORO = 20
const LARGO_MAXIMO_CARAVANA = 20
const LARGO_MAXIMO_DETALLE = 200
const MAXIMO_CARAVANAS_NOMBRADAS = 20
const FORMA_FECHA = /^\d{4}-\d{2}-\d{2}$/
const DETALLE_RESPUESTA_ILEGIBLE = 'No se pudo leer la interpretación de la captura'
const DETALLE_FECHA_DESCARTADA = 'No se entendió la fecha; quedó la de la captura'
const DETALLE_SECADO_POR_TRATAMIENTO =
  'Habla de secado por tratamiento, que todavía no se registra; elegí el motivo al confirmar'

export function marcarComoDato(texto) {
  return `<anotacion_del_tambero>\n${texto.replace(/[<>]/g, '')}\n</anotacion_del_tambero>`
}

export function leerRespuestaDelModelo(respuesta) {
  const bloque = respuesta.content.find((parte) => parte.type === 'text')
  if (respuesta.stop_reason !== 'end_turn' || !bloque) {
    return null
  }
  try {
    return JSON.parse(bloque.text)
  } catch (error) {
    console.error(error)
    return null
  }
}

function esObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function textoLimpio(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function deLaLista(valor, lista) {
  return lista.includes(valor) ? valor : null
}

function leerFecha(fecha, fechaCaptura) {
  if (tieneForma(fecha, FORMA_FECHA) && esFechaReal(`${fecha}T00:00:00`) && fecha <= fechaCaptura) {
    return fecha
  }
  return null
}

function pasarADias(numero, unidad) {
  if (unidad === 'meses') {
    return numero * DIAS_POR_MES
  }
  if (unidad === 'días') {
    return numero
  }
  return null
}

export function edadEnDias(numero, unidad) {
  if (typeof numero !== 'number' || !Number.isFinite(numero)) {
    return null
  }
  const dias = pasarADias(numero, unidad)
  if (dias === null) {
    return null
  }
  const redondeados = Math.round(dias)
  return redondeados >= 1 && redondeados <= DIAS_GESTACION ? redondeados : null
}

function leerEdad(edad) {
  return esObjeto(edad) ? edadEnDias(edad.numero, edad.unidad) : null
}

function leerToro(toro) {
  const limpio = textoLimpio(toro)
  return limpio !== '' && limpio.length <= LARGO_MAXIMO_TORO ? limpio : null
}

function leerCamposDelTipo(tipo, respuesta) {
  const campos = {}
  if (tipo === 'servicio') {
    campos.tipo_servicio = deLaLista(respuesta.tipo_servicio, TIPOS_DE_SERVICIO)
    campos.toro = leerToro(respuesta.toro)
  }
  if (tipo === 'tacto') {
    campos.resultado_tacto = deLaLista(respuesta.resultado_tacto, RESULTADOS_DE_TACTO)
    if (campos.resultado_tacto === 'preñada') {
      campos.edad_gestacional = leerEdad(respuesta.edad_gestacional)
    }
  }
  if (tipo === 'secado') {
    campos.motivo_secado = deLaLista(respuesta.motivo_secado, MOTIVOS_DE_SECADO)
  }
  if (tipo === 'parto') {
    campos.sexo_ternero = deLaLista(respuesta.sexo_ternero, SEXOS_DE_TERNERO)
  }
  return campos
}

function eventoVacio(fechaCaptura) {
  return {
    tipo_evento: null,
    fecha_evento: fechaCaptura,
    tipo_servicio: null,
    toro: null,
    resultado_tacto: null,
    edad_gestacional: null,
    motivo_secado: null,
    sexo_ternero: null,
  }
}

function noEntendido(detalle) {
  return { tipo_advertencia: 'dato_no_entendido', detalle }
}

function leerExplicaciones(noEntendidos) {
  const explicaciones = {}
  if (!Array.isArray(noEntendidos)) {
    return explicaciones
  }
  for (const item of noEntendidos) {
    const detalle = esObjeto(item) ? textoLimpio(item.detalle).slice(0, LARGO_MAXIMO_DETALLE) : ''
    if (detalle !== '' && Object.hasOwn(NOMBRES_DE_CAMPO, item.campo)) {
      explicaciones[item.campo] = detalle
    }
  }
  return explicaciones
}

function detalleDelCampo(campo, respuesta, explicaciones) {
  if (campo === 'motivo_secado' && respuesta.motivo_secado === MOTIVO_SECADO_SIN_REGISTRO) {
    return DETALLE_SECADO_POR_TRATAMIENTO
  }
  const base = `No se entendió ${NOMBRES_DE_CAMPO[campo]}`
  return explicaciones[campo] ? `${base}: ${explicaciones[campo]}` : base
}

function camposQueSeEsperan(evento) {
  if (evento.tipo_evento === 'tacto' && evento.resultado_tacto !== 'preñada') {
    return ['resultado_tacto']
  }
  return CAMPOS_POR_TIPO[evento.tipo_evento] ?? []
}

function advertenciasDeLaPropuesta(respuesta, evento, fechaEntendida) {
  const explicaciones = leerExplicaciones(respuesta.no_entendidos)
  const advertencias = []
  if (evento.tipo_evento === null) {
    advertencias.push(noEntendido(detalleDelCampo('tipo_evento', respuesta, explicaciones)))
  }
  if (fechaEntendida === null && textoLimpio(respuesta.fecha_evento) !== '') {
    advertencias.push(noEntendido(DETALLE_FECHA_DESCARTADA))
  }
  for (const campo of camposQueSeEsperan(evento)) {
    if (evento[campo] === null) {
      advertencias.push(noEntendido(detalleDelCampo(campo, respuesta, explicaciones)))
    }
  }
  return advertencias
}

export function validarPropuesta(respuesta, fechaCaptura) {
  if (!esObjeto(respuesta)) {
    return { evento: eventoVacio(fechaCaptura), advertencias: [noEntendido(DETALLE_RESPUESTA_ILEGIBLE)] }
  }
  const tipo = deLaLista(respuesta.tipo_evento, TIPOS_DE_EVENTO)
  const fechaEntendida = leerFecha(respuesta.fecha_evento, fechaCaptura)
  const evento = {
    ...eventoVacio(fechaCaptura),
    ...leerCamposDelTipo(tipo, respuesta),
    tipo_evento: tipo,
    fecha_evento: fechaEntendida ?? fechaCaptura,
  }
  return { evento, advertencias: advertenciasDeLaPropuesta(respuesta, evento, fechaEntendida) }
}

function normalizarCaravana(caravana) {
  return textoLimpio(caravana).toUpperCase().replace(/\s+/g, '')
}

function nombraLaCaravana(nombrada, caravana) {
  if (nombrada === caravana) {
    return true
  }
  const numeroDeCaravana = caravana.replace(/\D/g, '')
  return /^\d+$/.test(nombrada) && numeroDeCaravana !== '' && Number(nombrada) === Number(numeroDeCaravana)
}

function completarCaravana(nombrada, caravanasDelRodeo) {
  const coincidencias = caravanasDelRodeo
    .map(normalizarCaravana)
    .filter((caravana) => nombraLaCaravana(nombrada, caravana))
  return coincidencias.length === 1 ? coincidencias[0] : nombrada
}

function leerNombradas(nombradas) {
  if (!Array.isArray(nombradas)) {
    return []
  }
  return nombradas
    .slice(0, MAXIMO_CARAVANAS_NOMBRADAS)
    .map(normalizarCaravana)
    .filter((caravana) => caravana !== '' && caravana.length <= LARGO_MAXIMO_CARAVANA)
}

function otrasCaravanas(nombradas, elegida, caravanasDelRodeo) {
  const otras = []
  for (const nombrada of leerNombradas(nombradas)) {
    if (nombraLaCaravana(nombrada, elegida)) {
      continue
    }
    const completa = completarCaravana(nombrada, caravanasDelRodeo)
    if (!otras.includes(completa)) {
      otras.push(completa)
    }
  }
  return otras
}

function unirConY(lista) {
  return lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}`
}

export function advertenciaDeCaravanas(nombradas, caravanaElegida, caravanasDelRodeo, tipoCaptura) {
  const elegida = normalizarCaravana(caravanaElegida)
  const otras = otrasCaravanas(nombradas, elegida, caravanasDelRodeo)
  if (otras.length === 0) {
    return null
  }
  const origen = tipoCaptura === 'foto' ? 'La foto' : 'El texto'
  return {
    tipo_advertencia: 'otra_caravana',
    detalle: `${origen} nombra ${unirConY(otras)}; el evento quedó en ${elegida}`,
  }
}
