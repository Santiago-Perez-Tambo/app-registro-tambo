import { mostrarPalabra } from './animal.js'
import { describirTipo, ordenarDeMasNuevaAMasVieja, ordenarPorFechaHora } from './captura.js'

export const DIAS_GESTACION = 283
export const LARGO_MAXIMO_TORO = 20

const NOMBRES_DE_TIPO = {
  servicio: 'Servicio',
  tacto: 'Tacto',
  secado: 'Secado',
  parto: 'Parto',
}

export const OPCIONES = {
  tipo_evento: [
    { valor: 'servicio', texto: 'Servicio' },
    { valor: 'tacto', texto: 'Tacto' },
    { valor: 'secado', texto: 'Secado' },
    { valor: 'parto', texto: 'Parto' },
  ],
  tipo_servicio: [
    { valor: 'inseminación', texto: 'Inseminación' },
    { valor: 'monta natural', texto: 'Monta natural' },
  ],
  resultado_tacto: [
    { valor: 'preñada', texto: 'Preñada' },
    { valor: 'vacía', texto: 'Vacía' },
  ],
  motivo_secado: [
    { valor: 'preñez', texto: 'Por preñez' },
    { valor: 'baja producción', texto: 'Por baja producción' },
  ],
  sexo_ternero: [
    { valor: 'M', texto: 'Macho' },
    { valor: 'H', texto: 'Hembra' },
  ],
}

export const ETIQUETAS_DE_CAMPO = {
  tipo_evento: 'Tipo de evento',
  fecha_evento: 'Fecha',
  tipo_servicio: 'Tipo de servicio',
  toro: 'Toro',
  resultado_tacto: 'Resultado del tacto',
  edad_gestacional: 'Edad gestacional',
  motivo_secado: 'Motivo del secado',
  sexo_ternero: 'Sexo del ternero',
}

const DATO_PRINCIPAL = {
  servicio: 'tipo_servicio',
  tacto: 'resultado_tacto',
  secado: 'motivo_secado',
  parto: 'sexo_ternero',
}

const FALTANTES = {
  tipo_evento: 'Falta el tipo de evento',
  fecha_evento: 'Falta la fecha',
  tipo_servicio: 'Falta el tipo de servicio',
  resultado_tacto: 'Falta el resultado del tacto',
  motivo_secado: 'Falta el motivo del secado',
  sexo_ternero: 'Falta el sexo del ternero',
}

const AVISO_EDAD = `La edad gestacional tiene que ser un número entero de 1 a ${DIAS_GESTACION} días`

export const ORDENES = [
  { valor: 'viejos', texto: 'Más viejos primero' },
  { valor: 'nuevos', texto: 'Más nuevos primero' },
  { valor: 'caravana', texto: 'Por caravana' },
]

export const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'propuestos', texto: 'Propuestos' },
  { valor: 'sin_interpretar', texto: 'Sin interpretar' },
]

export function filtrarAsientos(asientos, filtro) {
  if (filtro === 'propuestos') {
    return asientos.filter((asiento) => asiento.evento !== null)
  }
  if (filtro === 'sin_interpretar') {
    return asientos.filter((asiento) => asiento.evento === null)
  }
  return asientos
}

function compararPorCaravana(uno, otro) {
  return uno.caravana.localeCompare(otro.caravana, 'es', { numeric: true }) || uno.fecha_hora.localeCompare(otro.fecha_hora)
}

export function ordenarAsientos(asientos, orden) {
  if (orden === 'nuevos') {
    return ordenarDeMasNuevaAMasVieja(asientos)
  }
  if (orden === 'caravana') {
    return [...asientos].sort(compararPorCaravana)
  }
  return ordenarPorFechaHora(asientos)
}

export function quedanPorConfirmar(filas) {
  return filas.filter((fila) => !fila.evento.some((evento) => evento.id_usuario_confirma !== null))
}

export function armarAsiento(fila) {
  const evento = fila.evento[0] ?? null
  return {
    id_captura: fila.id_captura,
    id_usuario: fila.id_usuario,
    fecha_hora: fila.fecha_hora,
    tipo_captura: fila.tipo_captura,
    lo_que_dijo: fila.transcripcion ?? fila.texto,
    caravana: fila.animal?.caravana,
    categoria: fila.animal?.categoria,
    estado_reproductivo: fila.animal?.estado_reproductivo,
    nombre_usuario: fila.usuario?.nombre,
    rol_usuario: fila.usuario?.rol,
    evento,
    advertencias: (evento?.advertencia ?? []).filter((advertencia) => !advertencia.resuelta),
  }
}

export function textoDeFila(asiento) {
  if (!asiento.evento) {
    return 'Sin interpretar'
  }
  const tipo = asiento.evento.tipo_evento
  const propuesto = tipo ? `${NOMBRES_DE_TIPO[tipo]} propuesto` : 'Sin tipo'
  return `${propuesto} · ${describirTipo(asiento.tipo_captura)}`
}

export function tituloDelDetalle(asiento) {
  if (!asiento.evento) {
    return `${asiento.caravana} · Sin interpretar`
  }
  return `${asiento.caravana} · ${NOMBRES_DE_TIPO[asiento.evento.tipo_evento] ?? 'Sin tipo'}`
}

export function capturadoPor(asiento) {
  const quien = asiento.nombre_usuario || mostrarPalabra(asiento.rol_usuario)
  return `${quien}, ${describirTipo(asiento.tipo_captura).toLowerCase()}`
}

export function fechaHoraCompleta(fechaHora) {
  const [anio, mes, dia] = fechaHora.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio} ${fechaHora.slice(11, 16)}`
}

export function estadoDeLaVaca(asiento) {
  const partes = [asiento.categoria, asiento.estado_reproductivo].filter(Boolean)
  return partes.length === 0 ? '-' : mostrarPalabra(partes.join(', '))
}

export function textoActualizado(desde, ahora) {
  const minutos = Math.floor((ahora - desde) / 60000)
  return minutos < 1 ? 'Actualizado recién' : `Actualizado hace ${minutos} min`
}

export function elegirAsiento(asientos, idActual, indiceAnterior) {
  if (asientos.some((asiento) => asiento.id_captura === idActual)) {
    return idActual
  }
  if (asientos.length === 0) {
    return null
  }
  const indice = Math.min(Math.max(indiceAnterior, 0), asientos.length - 1)
  return asientos[indice].id_captura
}

export function camposDelTipo(tipo, resultadoTacto) {
  if (tipo === 'servicio') {
    return ['tipo_servicio', 'toro']
  }
  if (tipo === 'tacto') {
    return resultadoTacto === 'preñada' ? ['resultado_tacto', 'edad_gestacional'] : ['resultado_tacto']
  }
  return DATO_PRINCIPAL[tipo] ? [DATO_PRINCIPAL[tipo]] : []
}

export function camposVisibles(formulario) {
  return ['tipo_evento', 'fecha_evento', ...camposDelTipo(formulario.tipo_evento, formulario.resultado_tacto)]
}

export function camposNoEntendidos(formulario) {
  return camposVisibles(formulario).filter((campo) => formulario[campo].trim() === '')
}

function textoDe(valor) {
  return valor === null || valor === undefined ? '' : String(valor)
}

export function formularioDesdeEvento(evento, fechaCaptura) {
  return {
    tipo_evento: textoDe(evento.tipo_evento),
    fecha_evento: textoDe(evento.fecha_evento ?? fechaCaptura.slice(0, 10)),
    tipo_servicio: textoDe(evento.tipo_servicio),
    toro: textoDe(evento.toro),
    resultado_tacto: textoDe(evento.resultado_tacto),
    edad_gestacional: textoDe(evento.edad_gestacional),
    motivo_secado: textoDe(evento.motivo_secado),
    sexo_ternero: textoDe(evento.sexo_ternero),
  }
}

function esEdadValida(texto) {
  const dias = Number(texto)
  return /^\d+$/.test(texto.trim()) && dias >= 1 && dias <= DIAS_GESTACION
}

export function queFaltaParaConfirmar(formulario, hoy) {
  const principal = DATO_PRINCIPAL[formulario.tipo_evento]
  if (!principal) {
    return FALTANTES.tipo_evento
  }
  if (formulario.fecha_evento === '') {
    return FALTANTES.fecha_evento
  }
  if (formulario.fecha_evento > hoy) {
    return 'La fecha no puede ser posterior a hoy'
  }
  if (formulario[principal] === '') {
    return FALTANTES[principal]
  }
  const conEdad = camposVisibles(formulario).includes('edad_gestacional')
  if (conEdad && formulario.edad_gestacional.trim() !== '' && !esEdadValida(formulario.edad_gestacional)) {
    return AVISO_EDAD
  }
  return ''
}

function valorParaEnviar(campo, texto) {
  const limpio = texto.trim()
  if (limpio === '') {
    return null
  }
  return campo === 'edad_gestacional' ? Number(limpio) : limpio
}

export function datosParaEnviar(formulario) {
  const datos = {}
  for (const campo of camposVisibles(formulario)) {
    datos[campo] = valorParaEnviar(campo, formulario[campo])
  }
  return datos
}
