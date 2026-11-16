export const LARGO_MAXIMO_TEXTO = 280

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

const GRABACION_MINIMA = 1000
export const GRABACION_MAXIMA = 60 * 1000

const NOMBRES_DE_TIPO = {
  texto: 'Escrito',
  foto: 'Foto',
  audio: 'Audio',
}

const FORMA_RUTA_CON_DURACION = /-(\d+)s\.\w+$/

const ESTADOS_CON_MOTIVO = [400, 403, 413]
const MOTIVO_SIN_DETALLE = 'El servidor no aceptó el registro'
const AVISO_ENVIO_CORTADO = 'No se pudo enviar. Se vuelve a intentar solo cuando haya señal.'

export function ahoraArgentina(fecha = new Date()) {
  const partes = {}
  for (const parte of FORMATO_ARGENTINA.formatToParts(fecha)) {
    partes[parte.type] = parte.value
  }
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`
}

function diaYMes(fechaHora) {
  return `${fechaHora.slice(8, 10)}/${fechaHora.slice(5, 7)}`
}

function horaYMinutos(fechaHora) {
  return fechaHora.slice(11, 16)
}

export function textoFechaCopia(fechaCopia) {
  const fechaHora = ahoraArgentina(new Date(fechaCopia))
  return `el ${diaYMes(fechaHora)} a las ${horaYMinutos(fechaHora)}`
}

export function validarTexto(texto) {
  const limpio = (texto ?? '').trim()
  const valido = limpio.length > 0 && limpio.length <= LARGO_MAXIMO_TEXTO
  return { texto: limpio, valido }
}

export function contadorLetras(texto) {
  return `${texto.length} de ${LARGO_MAXIMO_TEXTO} letras`
}

function diaAnterior(dia) {
  const [anio, mes, numero] = dia.split('-').map(Number)
  const anterior = new Date(Date.UTC(anio, mes - 1, numero - 1))
  return anterior.toISOString().slice(0, 10)
}

export function describirCuando(fechaHora, ahora) {
  const dia = fechaHora.slice(0, 10)
  const hoy = ahora.slice(0, 10)
  const hora = horaYMinutos(fechaHora)
  if (dia === hoy) {
    return `Hoy ${hora}`
  }
  if (dia === diaAnterior(hoy)) {
    return `Ayer ${hora}`
  }
  return `${diaYMes(fechaHora)} ${hora}`
}

export function describirTipo(tipo) {
  return NOMBRES_DE_TIPO[tipo]
}

export function textoDuracion(segundos) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}

export function describirCaptura(tipo, duracion) {
  return duracion ? `${describirTipo(tipo)}, ${textoDuracion(duracion)}` : describirTipo(tipo)
}

export function seGuardaLaGrabacion(milisegundos) {
  return milisegundos >= GRABACION_MINIMA
}

export function segundosDeGrabacion(milisegundos) {
  const segundos = Math.round(milisegundos / 1000)
  return Math.min(Math.max(segundos, 1), GRABACION_MAXIMA / 1000)
}

const AVISOS_DE_MICROFONO = {
  NotAllowedError:
    'El navegador no tiene permiso para usar el micrófono. Habilitalo tocando el candado al lado de la dirección (en el iPhone: Ajustes > Safari > Micrófono). Mientras tanto podés usar Foto o Escribir.',
  NotFoundError: 'No se encontró un micrófono en este equipo. Podés usar Foto o Escribir.',
}
const AVISO_MICROFONO_SIN_DETALLE = 'No se pudo usar el micrófono. Probá de nuevo o usá Foto o Escribir.'

export function avisoDeMicrofono(nombreDelError) {
  return AVISOS_DE_MICROFONO[nombreDelError] ?? AVISO_MICROFONO_SIN_DETALLE
}

export function segundosDeLaRuta(ruta) {
  const encontrada = typeof ruta === 'string' ? ruta.match(FORMA_RUTA_CON_DURACION) : null
  return encontrada ? Number(encontrada[1]) : null
}

export function textoPendientes(cantidad) {
  if (cantidad === 1) {
    return '1 registro guardado en el celular'
  }
  return `${cantidad} registros guardados en el celular`
}

export function avisoSalirConPendientes(cantidad) {
  const registros = cantidad === 1 ? '1 registro' : `${cantidad} registros`
  return `Tenés ${registros} sin enviar en este celular. Se envían cuando vuelvas a entrar con señal.`
}

export function quitarPrefijoBase64(textoDataUrl) {
  return textoDataUrl.slice(textoDataUrl.indexOf(',') + 1)
}

export function camposParaEnviar(captura, archivoBase64) {
  const campos = {
    id_captura: captura.id_captura,
    id_animal: captura.id_animal,
    tipo_captura: captura.tipo_captura,
    texto: captura.texto,
    fecha_hora: captura.fecha_hora,
  }
  if (captura.tipo_captura === 'foto') {
    return { ...campos, archivo_base64: archivoBase64, tipo_archivo: captura.archivo.type }
  }
  if (captura.tipo_captura === 'audio') {
    return { ...campos, archivo_base64: archivoBase64, duracion: captura.duracion }
  }
  return campos
}

export function queHacerConLaRespuesta(status, cuerpo) {
  if (status === 200 && cuerpo?.recibida === true) {
    return { accion: 'borrar' }
  }
  if (status === 401) {
    return { accion: 'renovarToken' }
  }
  if (ESTADOS_CON_MOTIVO.includes(status)) {
    return { accion: 'guardarMotivo', motivo: cuerpo?.error ?? MOTIVO_SIN_DETALLE }
  }
  return { accion: 'cortar' }
}

export function ordenarPorFechaHora(capturas) {
  return [...capturas].sort((una, otra) => una.fecha_hora.localeCompare(otra.fecha_hora))
}

export function ordenarDeMasNuevaAMasVieja(capturas) {
  return ordenarPorFechaHora(capturas).reverse()
}

export function sacarLasQueSiguenEnCola(enviados, pendientes) {
  const idsEnCola = new Set(pendientes.map((captura) => captura.id_captura))
  return enviados.filter((captura) => !idsEnCola.has(captura.id_captura))
}

export function siguienteParaEnviar(capturas, intentadas, incluirConMotivo) {
  const candidatas = capturas.filter(
    (captura) => !intentadas.has(captura.id_captura) && (incluirConMotivo || !captura.motivo),
  )
  return ordenarPorFechaHora(candidatas)[0] ?? null
}

export function claveUltimasVacas(idUsuario) {
  return `ultimas-vacas-${idUsuario}`
}

export function sumarUltimaVaca(ultimas, caravana, cantidad) {
  const otras = (Array.isArray(ultimas) ? ultimas : []).filter((guardada) => guardada !== caravana)
  return [caravana, ...otras].slice(0, cantidad)
}

export function resumenDeVuelta({ enviadas, cortada }) {
  const partes = []
  if (enviadas === 1) {
    partes.push('Se envió 1 registro.')
  }
  if (enviadas > 1) {
    partes.push(`Se enviaron ${enviadas} registros.`)
  }
  if (cortada) {
    partes.push(AVISO_ENVIO_CORTADO)
  }
  return partes.join(' ')
}
