import { formatearFecha, mostrarPalabra } from './animal.js'
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

export const VISTA_INICIAL = { filtro: 'todos', orden: 'viejos', confirmados: false, rechazados: false }

function esDeLasOpciones(valor, opciones) {
  return opciones.some((opcion) => opcion.valor === valor)
}

export function vistaValida(guardada) {
  if (typeof guardada !== 'object' || guardada === null) {
    return VISTA_INICIAL
  }
  return {
    filtro: esDeLasOpciones(guardada.filtro, FILTROS) ? guardada.filtro : VISTA_INICIAL.filtro,
    orden: esDeLasOpciones(guardada.orden, ORDENES) ? guardada.orden : VISTA_INICIAL.orden,
    confirmados: guardada.confirmados === true,
    rechazados: guardada.rechazados === true,
  }
}

export function estadoDelAsiento(asiento) {
  if (asiento.estado === 'confirmada') {
    return 'confirmado'
  }
  if (asiento.estado === 'rechazada') {
    return 'rechazado'
  }
  return 'pendiente'
}

function pasaElFiltro(asiento, filtro) {
  if (filtro === 'propuestos') {
    return asiento.evento !== null
  }
  if (filtro === 'sin_interpretar') {
    return asiento.evento === null
  }
  return true
}

function seMuestra(asiento, vista) {
  const estado = estadoDelAsiento(asiento)
  if (estado === 'confirmado') {
    return vista.confirmados
  }
  if (estado === 'rechazado') {
    return vista.rechazados
  }
  return pasaElFiltro(asiento, vista.filtro)
}

export function filtrarAsientos(asientos, vista) {
  return asientos.filter((asiento) => seMuestra(asiento, vista))
}

export function contarSegunFiltro(asientos, filtro) {
  return asientos.filter((asiento) => estadoDelAsiento(asiento) === 'pendiente' && pasaElFiltro(asiento, filtro)).length
}

export function contarSegunEstado(asientos, estado) {
  return asientos.filter((asiento) => estadoDelAsiento(asiento) === estado).length
}

export function inicioDeLosUltimosDias(ahora, dias) {
  const fecha = new Date(`${ahora.slice(0, 10)}T00:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - dias)
  return `${fecha.toISOString().slice(0, 10)}T00:00:00`
}

function diaYHora(fechaHora) {
  const [, mes, dia] = fechaHora.slice(0, 10).split('-')
  return `${dia}/${mes} ${fechaHora.slice(11, 16)}`
}

export function etiquetaDeRevision(asiento) {
  if (estadoDelAsiento(asiento) === 'rechazado') {
    return 'Rechazado'
  }
  return `Confirmado por ${asiento.evento.usuario.nombre} el ${diaYHora(asiento.evento.fecha_confirmacion)}`
}

export function franjaDeRevision(caravana, tipo) {
  return { tipo, texto: `Asiento de ${caravana} ${tipo}` }
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
  const animal = evento?.animal ?? fila.animal
  return {
    id_captura: fila.id_captura,
    id_usuario: fila.id_usuario,
    fecha_hora: fila.fecha_hora,
    tipo_captura: fila.tipo_captura,
    estado: fila.estado,
    lo_que_dijo: fila.transcripcion ?? fila.texto,
    caravana: animal?.caravana,
    caravana_captura: fila.animal?.caravana,
    categoria: animal?.categoria,
    estado_reproductivo: animal?.estado_reproductivo,
    nombre_usuario: fila.usuario?.nombre,
    rol_usuario: fila.usuario?.rol,
    evento,
    advertencias: (evento?.advertencia ?? []).filter((advertencia) => !advertencia.resuelta),
  }
}

const FORMA_OTRA_CARAVANA = /nombra (.+); el evento quedó en /

export function caravanaParaPasar(advertencias) {
  const advertencia = advertencias.find((cada) => cada.tipo_advertencia === 'otra_caravana')
  const nombradas = advertencia?.detalle.match(FORMA_OTRA_CARAVANA)?.[1]
  if (!nombradas || nombradas.includes(', ') || nombradas.includes(' y ')) {
    return null
  }
  return nombradas
}

export function caravanaDestino(escrita, elegida, sugerida) {
  if (escrita !== '' && escrita !== elegida) {
    return escrita
  }
  if (sugerida && sugerida !== elegida) {
    return sugerida
  }
  return null
}

export function faltaDeVaca(escrita, elegida) {
  if (escrita === '') {
    return 'Escribí la caravana de la vaca'
  }
  if (escrita !== elegida) {
    return `Tocá "Pasar a ${escrita}" para cambiar la vaca`
  }
  return ''
}

export function avisoCambioDeVaca(asiento, caravanaNueva) {
  return `Este asiento pasa de ${asiento.caravana} a ${caravanaNueva}. El registro original del ${asiento.rol_usuario} queda en ${asiento.caravana}.`
}

export function textoDeFila(asiento) {
  if (!asiento.evento) {
    return 'Sin interpretar'
  }
  return `${queEsElAsiento(asiento)} · ${describirTipo(asiento.tipo_captura)}`
}

function queEsElAsiento(asiento) {
  const tipo = NOMBRES_DE_TIPO[asiento.evento.tipo_evento]
  if (estadoDelAsiento(asiento) === 'pendiente') {
    return tipo ? `${tipo} propuesto` : 'Sin tipo'
  }
  return tipo ?? 'Sin tipo'
}

const ETIQUETAS_DE_FILA = { pendiente: '', confirmado: 'Confirmado', rechazado: 'Rechazado' }

export function etiquetaDeFila(asiento) {
  return ETIQUETAS_DE_FILA[estadoDelAsiento(asiento)]
}

export function textoCambioDeVaca(caravanaCaptura, caravana) {
  return caravanaCaptura === caravana ? '' : `Se cargó en ${caravanaCaptura} y se pasó a ${caravana}`
}

export function tituloDelDetalle(asiento, caravana) {
  if (!asiento.evento) {
    return `${caravana} · Sin interpretar`
  }
  return `${caravana} · ${NOMBRES_DE_TIPO[asiento.evento.tipo_evento] ?? 'Sin tipo'}`
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

function textoParaLeer(campo, valor) {
  if (valor === '') {
    return '-'
  }
  if (OPCIONES[campo]) {
    return OPCIONES[campo].find((opcion) => opcion.valor === valor)?.texto ?? valor
  }
  if (campo === 'fecha_evento') {
    return formatearFecha(valor)
  }
  if (campo === 'edad_gestacional') {
    return `${valor} días`
  }
  return valor
}

export function camposParaLeer(evento, fechaCaptura) {
  const formulario = formularioDesdeEvento(evento, fechaCaptura)
  return camposVisibles(formulario).map((campo) => ({
    campo,
    etiqueta: ETIQUETAS_DE_CAMPO[campo],
    valor: textoParaLeer(campo, formulario[campo]),
  }))
}

export function datosParaEnviar(formulario) {
  const datos = {}
  for (const campo of camposVisibles(formulario)) {
    datos[campo] = valorParaEnviar(campo, formulario[campo])
  }
  return datos
}
