export const DIAS_GESTACION = 283
const MARGEN_COINCIDENCIA = 15

const UN_DIA = 24 * 60 * 60 * 1000
const DETALLE_SIN_FECHA_PARTO = 'Preñada sin edad gestacional ni servicio: no se puede calcular el parto'

function aMilisegundosUtc(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

export function sumarDias(fecha, dias) {
  return new Date(aMilisegundosUtc(fecha) + dias * UN_DIA).toISOString().slice(0, 10)
}

export function diasEntre(desde, hasta) {
  return Math.round((aMilisegundosUtc(hasta) - aMilisegundosUtc(desde)) / UN_DIA)
}

function fechaCorta(fecha) {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}

export function finDeCalostro(fechaParto, parametros) {
  return sumarDias(fechaParto, parametros.dias_calostro)
}

function ordenarPorFecha(eventos) {
  return [...eventos].sort(
    (uno, otro) => uno.fecha_evento.localeCompare(otro.fecha_evento) || uno.id_evento - otro.id_evento,
  )
}

function servicioSinTacto(eventos) {
  let servicio = null
  let prenada = false
  for (const evento of ordenarPorFecha(eventos)) {
    if (evento.tipo_evento === 'servicio' && !prenada) {
      servicio = evento
    }
    if (evento.tipo_evento === 'tacto' || evento.tipo_evento === 'parto') {
      servicio = null
      prenada = evento.resultado_tacto === 'preñada'
    }
  }
  return servicio
}

function nuevaAlerta(tipo, fecha) {
  return { tipo_alerta: tipo, fecha_objetivo: fecha }
}

function nuevaAdvertencia(idEvento, tipo, detalle, resuelta) {
  return { id_evento: idEvento, tipo_advertencia: tipo, detalle, resuelta }
}

function tieneEdad(evento) {
  return Number.isInteger(evento.edad_gestacional)
}

function reglaDeServicio(animal, evento, anteriores, parametros) {
  const anterior = servicioSinTacto(anteriores)
  const advertencias = []
  if (anterior) {
    const detalle = `Repetición de celo: hubo un nuevo servicio el ${fechaCorta(evento.fecha_evento)}`
    advertencias.push(nuevaAdvertencia(anterior.id_evento, 'repeticion_celo', detalle, true))
  }
  return {
    cambiosDelAnimal: { estado_reproductivo: 'servida sin tacto' },
    alertasNuevas: [nuevaAlerta('tacto', sumarDias(evento.fecha_evento, parametros.dias_servicio_tacto))],
    advertencias,
  }
}

function fechaDeParto(evento, servicio) {
  if (tieneEdad(evento)) {
    return sumarDias(evento.fecha_evento, DIAS_GESTACION - evento.edad_gestacional)
  }
  return servicio ? sumarDias(servicio.fecha_evento, DIAS_GESTACION) : null
}

function advertenciaDeServicioNoCoincidente(evento, servicio) {
  if (!servicio || !tieneEdad(evento)) {
    return null
  }
  const concepcion = sumarDias(evento.fecha_evento, -evento.edad_gestacional)
  const diferencia = Math.abs(diasEntre(servicio.fecha_evento, concepcion))
  if (diferencia <= MARGEN_COINCIDENCIA) {
    return null
  }
  const detalle = `El tacto del ${fechaCorta(evento.fecha_evento)} da la concepción el ${fechaCorta(concepcion)}, a ${diferencia} días de este servicio`
  return nuevaAdvertencia(servicio.id_evento, 'servicio_no_coincidente', detalle, false)
}

function reglaDeTactoPrenada(animal, evento, anteriores, parametros) {
  const servicio = animal.estado_reproductivo === 'preñada' ? null : servicioSinTacto(anteriores)
  const parto = fechaDeParto(evento, servicio)
  const noCoincide = advertenciaDeServicioNoCoincidente(evento, servicio)
  const advertencias = noCoincide ? [noCoincide] : []
  const alertasNuevas = []
  if (parto === null) {
    advertencias.push(nuevaAdvertencia(evento.id_evento, 'sin_fecha_parto', DETALLE_SIN_FECHA_PARTO, false))
  } else {
    alertasNuevas.push(nuevaAlerta('parto', parto))
  }
  if (parto !== null && animal.categoria !== 'vaquillona') {
    alertasNuevas.push(nuevaAlerta('secado', sumarDias(parto, -parametros.dias_parto_secado)))
  }
  return { cambiosDelAnimal: { estado_reproductivo: 'preñada' }, alertasNuevas, advertencias }
}

function reglaDeTacto(animal, evento, anteriores, parametros) {
  if (evento.resultado_tacto === 'preñada') {
    return reglaDeTactoPrenada(animal, evento, anteriores, parametros)
  }
  return { cambiosDelAnimal: { estado_reproductivo: 'vacía' }, alertasNuevas: [], advertencias: [] }
}

function reglaDeSecado() {
  return { cambiosDelAnimal: { categoria: 'vaca seca' }, alertasNuevas: [], advertencias: [] }
}

function reglaDeParto(animal, evento, anteriores, parametros) {
  return {
    cambiosDelAnimal: { categoria: 'vaca en ordeñe', estado_reproductivo: 'vacía' },
    alertasNuevas: [
      nuevaAlerta('sin_celo', sumarDias(evento.fecha_evento, parametros.dias_lactancia_primer_celo)),
      nuevaAlerta('inducir_celo', sumarDias(evento.fecha_evento, parametros.dias_lactancia_induccion)),
    ],
    advertencias: [],
  }
}

const REGLAS_POR_TIPO = {
  servicio: reglaDeServicio,
  tacto: reglaDeTacto,
  secado: reglaDeSecado,
  parto: reglaDeParto,
}

const ALERTAS_QUE_CIERRA = {
  servicio: ['sin_celo', 'inducir_celo'],
  secado: ['secado'],
  parto: ['parto', 'secado', 'tacto'],
}

export function cerrarCumplidas(evento) {
  if (evento.tipo_evento === 'tacto') {
    return evento.resultado_tacto === 'vacía' ? ['tacto', 'parto', 'secado'] : ['tacto', 'sin_celo', 'inducir_celo']
  }
  return ALERTAS_QUE_CIERRA[evento.tipo_evento] ?? []
}

function advertenciaDeEventoAnterior(evento, anteriores) {
  const ultimo = ordenarPorFecha(anteriores).at(-1)
  if (!ultimo || evento.fecha_evento >= ultimo.fecha_evento) {
    return null
  }
  const detalle = `Evento del ${fechaCorta(evento.fecha_evento)} anterior al último registrado (${fechaCorta(ultimo.fecha_evento)}): no cambió el estado de la vaca`
  return nuevaAdvertencia(evento.id_evento, 'evento_anterior', detalle, false)
}

function partoProbable(anteriores) {
  const ordenados = ordenarPorFecha(anteriores)
  const posicion = ordenados.findLastIndex((evento) => evento.tipo_evento === 'tacto' || evento.tipo_evento === 'parto')
  const ultimo = ordenados[posicion]
  if (!ultimo || ultimo.resultado_tacto !== 'preñada') {
    return null
  }
  return fechaDeParto(ultimo, servicioSinTacto(ordenados.slice(0, posicion)))
}

function advertenciaDeServicioSobrePrenada(animal, evento, anteriores) {
  if (evento.tipo_evento !== 'servicio' || animal.estado_reproductivo !== 'preñada') {
    return null
  }
  const parto = partoProbable(anteriores)
  const textoDelParto = parto ? `parto probable ${fechaCorta(parto)}` : 'parto probable sin calcular'
  const detalle = `Servicio del ${fechaCorta(evento.fecha_evento)} sobre una vaca preñada (${textoDelParto}): no cambió el estado. Revisar con el veterinario`
  return nuevaAdvertencia(evento.id_evento, 'servicio_sobre_prenada', detalle, false)
}

export function calcularParaAnimal(animal, evento, anteriores, parametros) {
  const sinCambios =
    advertenciaDeEventoAnterior(evento, anteriores) ?? advertenciaDeServicioSobrePrenada(animal, evento, anteriores)
  if (sinCambios) {
    return { cambiosDelAnimal: {}, alertasNuevas: [], tiposQueSeCierran: [], advertencias: [sinCambios] }
  }
  const regla = REGLAS_POR_TIPO[evento.tipo_evento](animal, evento, anteriores, parametros)
  const alertasNuevas = regla.alertasNuevas.map((alerta) => ({
    ...alerta,
    id_animal: animal.id_animal,
    id_evento_origen: evento.id_evento,
    estado: 'vigente',
  }))
  const tiposNuevos = alertasNuevas.map((alerta) => alerta.tipo_alerta)
  const tiposQueSeCierran = [...new Set([...cerrarCumplidas(evento), ...tiposNuevos])]
  return { cambiosDelAnimal: regla.cambiosDelAnimal, alertasNuevas, tiposQueSeCierran, advertencias: regla.advertencias }
}
