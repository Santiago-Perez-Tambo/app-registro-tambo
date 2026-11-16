import { formatearFecha, mostrarPalabra } from './animal.js'
import { DIAS_GESTACION, OPCIONES } from './asiento.js'
import { ahoraArgentina } from './captura.js'

const UN_DIA = 24 * 60 * 60 * 1000
const DIAS_PARA_MOSTRAR_CALOSTRO = 30
const CANTIDAD_EVENTOS_EN_LA_COPIA = 5
const ESTADOS_POR_CONFIRMAR = ['sincronizada', 'interpretada']
const AVISOS_ANTICIPADOS = ['secado', 'parto']

const TIPOS_DE_AVISO = [
  { tipo: 'secado', nombre: 'Secar' },
  { tipo: 'parto', nombre: 'Parto' },
  { tipo: 'tacto', nombre: 'Tactar' },
  { tipo: 'sin_celo', nombre: 'Sin celo' },
  { tipo: 'inducir_celo', nombre: 'Inducir celo' },
]

const TEXTOS_DE_ADVERTENCIA = {
  servicio_no_coincidente: 'Servicio no coincidente con el tacto',
  repeticion_celo: 'Repetición de celo',
  evento_anterior: 'Evento anterior al último registrado',
  servicio_sobre_prenada: 'Servicio con la vaca preñada',
  sin_fecha_parto: 'Parto probable sin calcular',
}

const NOMBRES_DE_ROL = {
  propietario: 'Propietario',
  asesor: 'Veterinario',
}

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

export function hoyArgentina(fecha = new Date()) {
  return ahoraArgentina(fecha).slice(0, 10)
}

function diaYMes(fecha) {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}

function cantidadDeDias(dias) {
  return dias === 1 ? '1 día' : `${dias} días`
}

function porFechaObjetivo(una, otra) {
  return una.fecha_objetivo.localeCompare(otra.fecha_objetivo) || (una.caravana ?? '').localeCompare(otra.caravana ?? '')
}

function yaSeMuestra(alerta, parametros, hoy) {
  const faltan = diasEntre(hoy, alerta.fecha_objetivo)
  if (AVISOS_ANTICIPADOS.includes(alerta.tipo_alerta)) {
    return faltan <= parametros.dias_aviso_alerta
  }
  return faltan <= 0
}

export function avisosParaMostrar(alertas, parametros, hoy) {
  return alertas
    .filter((alerta) => alerta.estado === 'vigente' && yaSeMuestra(alerta, parametros, hoy))
    .sort(porFechaObjetivo)
}

export function contarPorTipo(avisos) {
  return TIPOS_DE_AVISO.map(({ tipo, nombre }) => ({
    tipo,
    nombre,
    cantidad: avisos.filter((aviso) => aviso.tipo_alerta === tipo).length,
  }))
}

export function nombreDelAviso(tipo) {
  return TIPOS_DE_AVISO.find((cada) => cada.tipo === tipo)?.nombre ?? tipo
}

export function textoCuando(fecha, hoy) {
  const faltan = diasEntre(hoy, fecha)
  if (faltan === 0) {
    return 'Hoy'
  }
  if (faltan > 0) {
    return `En ${cantidadDeDias(faltan)}`
  }
  return `Vencido hace ${cantidadDeDias(-faltan)}`
}

function partoDelMismoTacto(aviso, alertas) {
  return alertas.find(
    (alerta) =>
      alerta.tipo_alerta === 'parto' &&
      alerta.id_animal === aviso.id_animal &&
      alerta.id_evento_origen === aviso.id_evento_origen,
  )
}

function porQueSecar(aviso, alertas) {
  const parto = partoDelMismoTacto(aviso, alertas)
  const secado = `secado el ${diaYMes(aviso.fecha_objetivo)}`
  return parto ? `Parto probable el ${diaYMes(parto.fecha_objetivo)}; ${secado}` : mostrarPalabra(secado)
}

function sinCeloDesdeElParto(aviso, hoy) {
  return `Parida hace ${cantidadDeDias(diasEntre(aviso.fecha_origen, hoy))} sin celo registrado`
}

export function textoPorQue(aviso, alertas, hoy) {
  if (aviso.tipo_alerta === 'secado') {
    return porQueSecar(aviso, alertas)
  }
  if (aviso.tipo_alerta === 'parto') {
    return `Parto probable el ${diaYMes(aviso.fecha_objetivo)}`
  }
  if (aviso.tipo_alerta === 'tacto') {
    return `Servida el ${diaYMes(aviso.fecha_origen)}, tacto desde el ${diaYMes(aviso.fecha_objetivo)}`
  }
  if (aviso.tipo_alerta === 'inducir_celo') {
    return `${sinCeloDesdeElParto(aviso, hoy)}: inducir celo`
  }
  return sinCeloDesdeElParto(aviso, hoy)
}

function textoDeOpcion(campo, valor) {
  return OPCIONES[campo].find((opcion) => opcion.valor === valor)?.texto ?? valor
}

export function nombreDelEvento(tipo) {
  return tipo ? textoDeOpcion('tipo_evento', tipo) : 'Sin tipo'
}

function partesDelDetalle(evento) {
  if (evento.tipo_evento === 'servicio') {
    return [textoDeOpcion('tipo_servicio', evento.tipo_servicio), evento.toro && `toro ${evento.toro}`]
  }
  if (evento.tipo_evento === 'tacto') {
    const conEdad = evento.resultado_tacto === 'preñada' && Number.isInteger(evento.edad_gestacional)
    return [textoDeOpcion('resultado_tacto', evento.resultado_tacto), conEdad && `${evento.edad_gestacional} días`]
  }
  if (evento.tipo_evento === 'secado') {
    return [textoDeOpcion('motivo_secado', evento.motivo_secado)]
  }
  if (evento.tipo_evento === 'parto') {
    return [evento.sexo_ternero && `Ternero ${textoDeOpcion('sexo_ternero', evento.sexo_ternero).toLowerCase()}`]
  }
  return []
}

export function detalleDelEvento(evento) {
  return partesDelDetalle(evento).filter(Boolean).join(', ') || '-'
}

export function advertenciasParaMostrar(advertencias) {
  return advertencias
    .filter((advertencia) => TEXTOS_DE_ADVERTENCIA[advertencia.tipo_advertencia])
    .map((advertencia) => ({
      id_advertencia: advertencia.id_advertencia,
      texto: TEXTOS_DE_ADVERTENCIA[advertencia.tipo_advertencia],
    }))
}

export function confirmadoPor(rol) {
  return NOMBRES_DE_ROL[rol] ?? mostrarPalabra(rol)
}

function ordenarDeMasNuevoAMasViejo(eventos) {
  return [...eventos].sort(
    (uno, otro) =>
      otro.fecha_evento.localeCompare(uno.fecha_evento) ||
      (otro.fecha_hora_captura ?? '').localeCompare(uno.fecha_hora_captura ?? '') ||
      otro.id_evento - uno.id_evento,
  )
}

export function separarEventos(eventos) {
  const confirmados = eventos.filter((evento) => evento.id_usuario_confirma !== null)
  const propuestos = eventos.filter(
    (evento) => evento.id_usuario_confirma === null && ESTADOS_POR_CONFIRMAR.includes(evento.estado_captura),
  )
  return { confirmados: ordenarDeMasNuevoAMasViejo(confirmados), propuestos }
}

function horaDelEvento(evento) {
  const mismoDia = evento.fecha_hora_captura?.slice(0, 10) === evento.fecha_evento
  return mismoDia ? evento.fecha_hora_captura.slice(11, 16) : ''
}

export function fechaYHoraDelEvento(evento) {
  return [formatearFecha(evento.fecha_evento), horaDelEvento(evento)].filter(Boolean).join(' ')
}

export function cuandoFueElEvento(evento, hoy) {
  if (evento.fecha_evento !== hoy) {
    return fechaYHoraDelEvento(evento)
  }
  return ['Hoy', horaDelEvento(evento)].filter(Boolean).join(' ')
}

function ultimoDelTipo(eventos, tipo) {
  return ordenarDeMasNuevoAMasViejo(eventos).find((evento) => evento.tipo_evento === tipo) ?? null
}

export function cantidadDePartos(confirmados) {
  return confirmados.filter((evento) => evento.tipo_evento === 'parto').length
}

export function fechaUltimoParto(confirmados) {
  return ultimoDelTipo(confirmados, 'parto')?.fecha_evento ?? null
}

export function inicioDeLactancia(confirmados) {
  const parto = ultimoDelTipo(confirmados, 'parto')
  const secado = ultimoDelTipo(confirmados, 'secado')
  if (!parto || (secado && secado.fecha_evento > parto.fecha_evento)) {
    return null
  }
  return parto.fecha_evento
}

export function textoDiasDeLactancia(inicio, hoy) {
  return inicio ? String(diasEntre(inicio, hoy)) : '-'
}

export function textoParidaHace(fechaParto, hoy) {
  return fechaParto ? cantidadDeDias(diasEntre(fechaParto, hoy)) : '-'
}

export function textoUltimoEvento(confirmados) {
  const ultimo = ordenarDeMasNuevoAMasViejo(confirmados)[0]
  return ultimo ? `${nombreDelEvento(ultimo.tipo_evento)} ${diaYMes(ultimo.fecha_evento)}` : '-'
}

function textoDeAlerta(alerta) {
  return `${nombreDelAviso(alerta.tipo_alerta)} ${diaYMes(alerta.fecha_objetivo)}`
}

export function textoDeAlertasVigentes(alertas) {
  return [...alertas].sort(porFechaObjetivo).map(textoDeAlerta).join(', ') || '-'
}

export function proximoAviso(alertas) {
  const proxima = [...alertas].sort(porFechaObjetivo)[0]
  return proxima ? textoDeAlerta(proxima) : '-'
}

export function datoDelProximo(alertas) {
  const tacto = [...alertas].sort(porFechaObjetivo).find((alerta) => alerta.tipo_alerta === 'tacto')
  if (tacto) {
    return { rotulo: 'Próximo tacto', valor: diaYMes(tacto.fecha_objetivo) }
  }
  return { rotulo: 'Próximo aviso', valor: proximoAviso(alertas) }
}

function tieneServicioNoCoincidente(evento) {
  return evento.advertencias.some(
    (advertencia) => advertencia.tipo_advertencia === 'servicio_no_coincidente' && !advertencia.resuelta,
  )
}

function servicioNoCoincidente(confirmados) {
  const ultimoParto = fechaUltimoParto(confirmados)
  return ordenarDeMasNuevoAMasViejo(confirmados).find(
    (evento) =>
      evento.tipo_evento === 'servicio' &&
      (!ultimoParto || evento.fecha_evento > ultimoParto) &&
      tieneServicioNoCoincidente(evento),
  )
}

export function textoDosFechasDeParto(confirmados, alertas) {
  const parto = alertas.find((alerta) => alerta.tipo_alerta === 'parto')
  const servicio = servicioNoCoincidente(confirmados)
  if (!parto || !servicio) {
    return ''
  }
  const porServicio = sumarDias(servicio.fecha_evento, DIAS_GESTACION)
  return `Parto probable ${formatearFecha(parto.fecha_objetivo)} por el tacto. Por el servicio sería el ${formatearFecha(porServicio)}.`
}

export function finDeCalostro(fechaParto, parametros) {
  return sumarDias(fechaParto, parametros.dias_calostro)
}

export function estadoDelCalostro(fechaParto, parametros, hoy) {
  const sinDatos = !fechaParto || !Number.isInteger(parametros.dias_calostro)
  if (sinDatos || diasEntre(fechaParto, hoy) >= DIAS_PARA_MOSTRAR_CALOSTRO) {
    return null
  }
  const fin = finDeCalostro(fechaParto, parametros)
  if (hoy < fin) {
    return { conCalostro: true, texto: `Con calostro hasta el ${diaYMes(fin)}` }
  }
  return { conCalostro: false, texto: `Su leche ya puede ir al tanque desde el ${diaYMes(fin)}` }
}

function agruparPorAnimal(filas) {
  const grupos = new Map()
  for (const fila of filas) {
    grupos.set(fila.id_animal, [...(grupos.get(fila.id_animal) ?? []), fila])
  }
  return grupos
}

function resumirAnimal(animal, eventos, alertas, parametros) {
  const confirmados = ordenarDeMasNuevoAMasViejo(eventos)
  return {
    ...animal,
    dias_calostro: parametros.dias_calostro,
    partos: cantidadDePartos(confirmados),
    fecha_ultimo_parto: fechaUltimoParto(confirmados),
    inicio_lactancia: inicioDeLactancia(confirmados),
    ultimos_eventos: confirmados.slice(0, CANTIDAD_EVENTOS_EN_LA_COPIA),
    alertas: alertas.map(({ tipo_alerta, fecha_objetivo }) => ({ tipo_alerta, fecha_objetivo })),
  }
}

export function copiaEsDeOtroUsuario(duenoGuardado, idUsuario) {
  return duenoGuardado !== String(idUsuario)
}

export function armarCopiaDelRodeo(animales, eventos, alertas, parametros) {
  const eventosPorAnimal = agruparPorAnimal(eventos)
  const alertasPorAnimal = agruparPorAnimal(alertas)
  return animales.map((animal) =>
    resumirAnimal(
      animal,
      eventosPorAnimal.get(animal.id_animal) ?? [],
      alertasPorAnimal.get(animal.id_animal) ?? [],
      parametros,
    ),
  )
}
