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

const NOMBRES_DE_TIPO = {
  texto: 'Escrito',
  foto: 'Foto',
}

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
