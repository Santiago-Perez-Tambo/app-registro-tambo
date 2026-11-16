import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  advertenciasParaMostrar,
  armarCopiaDelRodeo,
  avisosParaMostrar,
  cantidadDePartos,
  confirmadoPor,
  contarPorTipo,
  copiaEsDeOtroUsuario,
  cuandoFueElEvento,
  datoDelProximo,
  detalleDelEvento,
  estadoDelCalostro,
  fechaYHoraDelEvento,
  hoyArgentina,
  inicioDeLactancia,
  proximoAviso,
  separarEventos,
  textoCuando,
  textoDeAlertasVigentes,
  textoDiasDeLactancia,
  textoDosFechasDeParto,
  textoParidaHace,
  textoPorQue,
  textoUltimoEvento,
} from './historia.js'

const PARAMETROS = { dias_calostro: 5, dias_aviso_alerta: 7 }
const HOY = '2026-11-16'

function alerta(id_alerta, tipo_alerta, fecha_objetivo, datos = {}) {
  return {
    id_alerta,
    id_animal: 1,
    id_evento_origen: 10,
    tipo_alerta,
    fecha_objetivo,
    estado: 'vigente',
    caravana: 'A100',
    fecha_origen: null,
    ...datos,
  }
}

function evento(id_evento, tipo_evento, fecha_evento, datos = {}) {
  return {
    id_evento,
    id_animal: 1,
    id_usuario_confirma: 1,
    tipo_evento,
    fecha_evento,
    tipo_servicio: null,
    toro: null,
    resultado_tacto: null,
    edad_gestacional: null,
    motivo_secado: null,
    sexo_ternero: null,
    fecha_hora_captura: null,
    estado_captura: 'confirmada',
    advertencias: [],
    ...datos,
  }
}

test('hoy es la fecha de Argentina aunque en UTC ya sea el día siguiente', () => {
  assert.equal(hoyArgentina(new Date('2026-11-17T01:30:00Z')), '2026-11-16')
  assert.equal(hoyArgentina(new Date('2026-11-17T02:59:00Z')), '2026-11-16')
  assert.equal(hoyArgentina(new Date('2026-11-17T03:30:00Z')), '2026-11-17')
})

test('secado y parto aparecen cuando faltan los días de aviso o menos', () => {
  const alertas = [
    alerta(1, 'secado', '2026-11-23'),
    alerta(2, 'secado', '2026-11-24'),
    alerta(3, 'parto', '2026-11-20'),
    alerta(4, 'parto', '2026-11-10'),
  ]
  assert.deepEqual(avisosParaMostrar(alertas, PARAMETROS, HOY).map((cada) => cada.id_alerta), [4, 3, 1])
})

test('tacto, sin celo e inducir celo aparecen recién al llegar la fecha', () => {
  const alertas = [
    alerta(1, 'tacto', '2026-11-17'),
    alerta(2, 'tacto', '2026-11-16'),
    alerta(3, 'sin_celo', '2026-11-13'),
    alerta(4, 'inducir_celo', '2026-11-20'),
  ]
  assert.deepEqual(avisosParaMostrar(alertas, PARAMETROS, HOY).map((cada) => cada.id_alerta), [3, 2])
})

test('una alerta cumplida no aparece aunque esté en fecha', () => {
  const alertas = [alerta(1, 'tacto', '2026-11-10', { estado: 'cumplida' })]
  assert.deepEqual(avisosParaMostrar(alertas, PARAMETROS, HOY), [])
})

test('las etiquetas cuentan los avisos de cada tipo, también los que no tienen', () => {
  const avisos = [alerta(1, 'secado', '2026-11-20'), alerta(2, 'secado', '2026-11-21'), alerta(3, 'tacto', '2026-11-16')]
  assert.deepEqual(
    contarPorTipo(avisos).map(({ nombre, cantidad }) => `${nombre} ${cantidad}`),
    ['Secar 2', 'Parto 0', 'Tactar 1', 'Sin celo 0', 'Inducir celo 0'],
  )
})

test('cuándo dice en cuántos días, hoy o hace cuánto venció', () => {
  assert.equal(textoCuando('2026-11-21', HOY), 'En 5 días')
  assert.equal(textoCuando('2026-11-17', HOY), 'En 1 día')
  assert.equal(textoCuando('2026-11-16', HOY), 'Hoy')
  assert.equal(textoCuando('2026-11-13', HOY), 'Vencido hace 3 días')
  assert.equal(textoCuando('2026-11-15', HOY), 'Vencido hace 1 día')
})

test('por qué explica cada aviso con sus fechas', () => {
  const parto = alerta(1, 'parto', '2026-12-02')
  const secado = alerta(2, 'secado', '2026-10-03')
  const alertas = [parto, secado]
  assert.equal(textoPorQue(secado, alertas, HOY), 'Parto probable el 02/12; secado el 03/10')
  assert.equal(textoPorQue(parto, alertas, HOY), 'Parto probable el 02/12')
  const tacto = alerta(3, 'tacto', '2026-11-12', { fecha_origen: '2026-09-28' })
  assert.equal(textoPorQue(tacto, alertas, HOY), 'Servida el 28/09, tacto desde el 12/11')
  const sinCelo = alerta(4, 'sin_celo', '2026-10-30', { fecha_origen: '2026-09-15' })
  assert.equal(textoPorQue(sinCelo, alertas, HOY), 'Parida hace 62 días sin celo registrado')
  const inducir = alerta(5, 'inducir_celo', '2026-11-14', { fecha_origen: '2026-09-15' })
  assert.equal(textoPorQue(inducir, alertas, HOY), 'Parida hace 62 días sin celo registrado: inducir celo')
})

test('el secado sin parto del mismo tacto dice solo la fecha de secado', () => {
  const secado = alerta(2, 'secado', '2026-10-03')
  assert.equal(textoPorQue(secado, [secado, alerta(1, 'parto', '2026-12-02', { id_evento_origen: 99 })], HOY), 'Secado el 03/10')
})

test('el detalle de cada evento se lee como en la pantalla', () => {
  assert.equal(detalleDelEvento(evento(1, 'servicio', HOY, { tipo_servicio: 'inseminación', toro: '512' })), 'Inseminación, toro 512')
  assert.equal(detalleDelEvento(evento(1, 'servicio', HOY, { tipo_servicio: 'monta natural' })), 'Monta natural')
  assert.equal(detalleDelEvento(evento(1, 'tacto', HOY, { resultado_tacto: 'preñada', edad_gestacional: 120 })), 'Preñada, 120 días')
  assert.equal(detalleDelEvento(evento(1, 'tacto', HOY, { resultado_tacto: 'preñada' })), 'Preñada')
  assert.equal(detalleDelEvento(evento(1, 'tacto', HOY, { resultado_tacto: 'vacía' })), 'Vacía')
  assert.equal(detalleDelEvento(evento(1, 'secado', HOY, { motivo_secado: 'preñez' })), 'Por preñez')
  assert.equal(detalleDelEvento(evento(1, 'secado', HOY, { motivo_secado: 'baja producción' })), 'Por baja producción')
  assert.equal(detalleDelEvento(evento(1, 'parto', HOY, { sexo_ternero: 'H' })), 'Ternero hembra')
  assert.equal(detalleDelEvento(evento(1, 'parto', HOY, { sexo_ternero: 'M' })), 'Ternero macho')
  assert.equal(detalleDelEvento(evento(1, 'parto', HOY)), '-')
})

test('se muestran las advertencias de las reglas, resueltas o no, y no las de la interpretación', () => {
  const advertencias = [
    { id_advertencia: 1, tipo_advertencia: 'repeticion_celo', resuelta: true },
    { id_advertencia: 2, tipo_advertencia: 'servicio_no_coincidente', resuelta: false },
    { id_advertencia: 3, tipo_advertencia: 'otra_caravana', resuelta: true },
    { id_advertencia: 4, tipo_advertencia: 'evento_anterior', resuelta: false },
    { id_advertencia: 5, tipo_advertencia: 'servicio_sobre_prenada', resuelta: false },
    { id_advertencia: 6, tipo_advertencia: 'sin_fecha_parto', resuelta: false },
    { id_advertencia: 7, tipo_advertencia: 'dato_no_entendido', resuelta: true },
  ]
  assert.deepEqual(advertenciasParaMostrar(advertencias).map((cada) => cada.texto), [
    'Repetición de celo',
    'Servicio no coincidente con el tacto',
    'Evento anterior al último registrado',
    'Servicio con la vaca preñada',
    'Parto probable sin calcular',
  ])
})

test('confirmado por dice el rol, con el asesor como veterinario', () => {
  assert.equal(confirmadoPor('propietario'), 'Propietario')
  assert.equal(confirmadoPor('asesor'), 'Veterinario')
})

test('la historia separa los confirmados, de más nuevo a más viejo, del propuesto, y deja afuera los rechazados', () => {
  const eventos = [
    evento(1, 'servicio', '2026-09-28'),
    evento(2, 'tacto', '2026-11-12'),
    evento(3, 'parto', '2026-08-01'),
    evento(4, 'secado', null, { id_usuario_confirma: null, estado_captura: 'interpretada' }),
    evento(5, 'servicio', '2026-11-01', { id_usuario_confirma: null, estado_captura: 'rechazada' }),
  ]
  const { confirmados, propuestos } = separarEventos(eventos)
  assert.deepEqual(confirmados.map((cada) => cada.id_evento), [2, 1, 3])
  assert.deepEqual(propuestos.map((cada) => cada.id_evento), [4])
})

test('dos eventos del mismo día se ordenan por la hora de la captura', () => {
  const eventos = [
    evento(1, 'servicio', HOY, { fecha_hora_captura: '2026-11-16T06:35:00' }),
    evento(2, 'tacto', HOY, { fecha_hora_captura: '2026-11-16T17:10:00' }),
  ]
  assert.deepEqual(separarEventos(eventos).confirmados.map((cada) => cada.id_evento), [2, 1])
})

test('la fecha del evento lleva la hora solo si se capturó ese mismo día', () => {
  const deHoy = evento(1, 'servicio', HOY, { fecha_hora_captura: '2026-11-16T06:35:00' })
  const viejo = evento(2, 'tacto', '2026-08-12', { fecha_hora_captura: '2026-08-12T17:10:00' })
  const contadoDespues = evento(3, 'parto', '2026-08-12', { fecha_hora_captura: '2026-08-13T08:00:00' })
  assert.equal(cuandoFueElEvento(deHoy, HOY), 'Hoy 06:35')
  assert.equal(cuandoFueElEvento(viejo, HOY), '12/08/2026 17:10')
  assert.equal(fechaYHoraDelEvento(deHoy), '16/11/2026 06:35')
  assert.equal(fechaYHoraDelEvento(contadoDespues), '12/08/2026')
})

test('los días de lactancia cuentan desde el último parto y se cortan con un secado posterior', () => {
  const enOrdene = [evento(1, 'secado', '2025-06-01'), evento(2, 'parto', '2026-09-23')]
  assert.equal(inicioDeLactancia(enOrdene), '2026-09-23')
  assert.equal(textoDiasDeLactancia(inicioDeLactancia(enOrdene), HOY), '54')
  const seca = [evento(1, 'parto', '2025-09-23'), evento(2, 'secado', '2026-06-01')]
  assert.equal(inicioDeLactancia(seca), null)
  assert.equal(textoDiasDeLactancia(inicioDeLactancia(seca), HOY), '-')
  assert.equal(textoDiasDeLactancia(inicioDeLactancia([]), HOY), '-')
})

test('parida hace cuenta desde el último parto aunque esté seca', () => {
  assert.equal(textoParidaHace('2026-09-23', HOY), '54 días')
  assert.equal(textoParidaHace(null, HOY), '-')
})

test('los partos se cuentan entre los eventos confirmados', () => {
  assert.equal(cantidadDePartos([evento(1, 'parto', '2025-08-01'), evento(2, 'servicio', '2025-11-01'), evento(3, 'parto', '2026-08-10')]), 2)
  assert.equal(cantidadDePartos([]), 0)
})

test('el último evento dice el tipo y la fecha del más nuevo', () => {
  assert.equal(textoUltimoEvento([evento(1, 'servicio', '2026-09-28'), evento(2, 'tacto', '2026-11-12')]), 'Tacto 12/11')
  assert.equal(textoUltimoEvento([]), '-')
})

test('los avisos vigentes de la vaca se leen ordenados por fecha', () => {
  const alertas = [alerta(1, 'parto', '2027-03-04'), alerta(2, 'secado', '2027-01-03')]
  assert.equal(textoDeAlertasVigentes(alertas), 'Secar 03/01, Parto 04/03')
  assert.equal(proximoAviso(alertas), 'Secar 03/01')
  assert.equal(textoDeAlertasVigentes([]), '-')
  assert.equal(proximoAviso([]), '-')
})

test('la ficha muestra el próximo tacto y si no hay, el próximo aviso con su nombre', () => {
  assert.deepEqual(datoDelProximo([alerta(1, 'inducir_celo', '2026-11-18'), alerta(2, 'tacto', '2026-11-19')]), {
    rotulo: 'Próximo tacto',
    valor: '19/11',
  })
  assert.deepEqual(datoDelProximo([alerta(1, 'parto', '2027-03-04'), alerta(2, 'secado', '2027-01-03')]), {
    rotulo: 'Próximo aviso',
    valor: 'Secar 03/01',
  })
  assert.deepEqual(datoDelProximo([]), { rotulo: 'Próximo aviso', valor: '-' })
})

test('con el servicio no coincidente se ven las dos fechas de parto', () => {
  const noCoincide = { id_advertencia: 1, tipo_advertencia: 'servicio_no_coincidente', resuelta: false }
  const confirmados = [
    evento(1, 'servicio', '2026-07-10', { advertencias: [noCoincide] }),
    evento(2, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 105 }),
  ]
  const alertas = [alerta(1, 'parto', '2027-03-04'), alerta(2, 'secado', '2027-01-03')]
  assert.equal(
    textoDosFechasDeParto(confirmados, alertas),
    'Parto probable 04/03/2027 por el tacto. Por el servicio sería el 19/04/2027.',
  )
})

test('las dos fechas de parto no se muestran sin alerta de parto vigente', () => {
  const noCoincide = { id_advertencia: 1, tipo_advertencia: 'servicio_no_coincidente', resuelta: false }
  const confirmados = [evento(1, 'servicio', '2026-07-10', { advertencias: [noCoincide] })]
  assert.equal(textoDosFechasDeParto(confirmados, []), '')
})

test('las dos fechas de parto no usan un servicio anterior al último parto', () => {
  const noCoincide = { id_advertencia: 1, tipo_advertencia: 'servicio_no_coincidente', resuelta: false }
  const confirmados = [
    evento(1, 'servicio', '2025-07-10', { advertencias: [noCoincide] }),
    evento(2, 'parto', '2026-04-20'),
    evento(3, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 105 }),
  ]
  assert.equal(textoDosFechasDeParto(confirmados, [alerta(1, 'parto', '2027-03-04')]), '')
})

test('el calostro dice hasta cuándo dura y después que la leche ya puede ir al tanque', () => {
  assert.deepEqual(estadoDelCalostro('2026-10-23', PARAMETROS, '2026-10-25'), {
    conCalostro: true,
    texto: 'Con calostro hasta el 28/10',
  })
  assert.deepEqual(estadoDelCalostro('2026-10-23', PARAMETROS, '2026-10-28'), {
    conCalostro: false,
    texto: 'Su leche ya puede ir al tanque desde el 28/10',
  })
  assert.equal(estadoDelCalostro('2026-10-17', PARAMETROS, HOY), null)
  assert.equal(estadoDelCalostro(null, PARAMETROS, HOY), null)
})

test('sin los días de calostro, como en una copia vieja del celular, no se muestra la línea', () => {
  assert.equal(estadoDelCalostro('2026-11-14', { dias_calostro: undefined }, HOY), null)
  assert.equal(estadoDelCalostro('2026-11-14', { dias_calostro: null }, HOY), null)
})

test('la ficha del celular calcula el calostro con los días guardados en la copia', () => {
  const [vaca] = armarCopiaDelRodeo(
    [{ id_animal: 1, caravana: '3962' }],
    [evento(1, 'parto', '2026-11-14', { sexo_ternero: 'H' })],
    [],
    PARAMETROS,
  )
  assert.deepEqual(estadoDelCalostro(vaca.fecha_ultimo_parto, { dias_calostro: vaca.dias_calostro }, HOY), {
    conCalostro: true,
    texto: 'Con calostro hasta el 19/11',
  })
})

test('la copia del rodeo suma a cada vaca los días de calostro, sus partos, sus últimos 5 eventos y sus alertas', () => {
  const animales = [
    { id_animal: 1, caravana: 'A100', categoria: 'vaca en ordeñe', estado_reproductivo: 'servida sin tacto' },
    { id_animal: 2, caravana: 'A200', categoria: 'vaquillona', estado_reproductivo: 'vacía' },
  ]
  const eventos = [
    evento(1, 'parto', '2025-08-01'),
    evento(2, 'servicio', '2025-10-01'),
    evento(3, 'tacto', '2025-11-20', { resultado_tacto: 'preñada' }),
    evento(4, 'secado', '2026-06-01', { motivo_secado: 'preñez' }),
    evento(5, 'parto', '2026-08-10', { sexo_ternero: 'H' }),
    evento(6, 'servicio', '2026-09-28', { tipo_servicio: 'inseminación', toro: '512' }),
  ]
  const alertas = [alerta(1, 'tacto', '2026-11-12')]
  const [a100, a200] = armarCopiaDelRodeo(animales, eventos, alertas, PARAMETROS)
  assert.equal(a100.caravana, 'A100')
  assert.equal(a100.dias_calostro, 5)
  assert.equal(a200.dias_calostro, 5)
  assert.equal(a100.partos, 2)
  assert.equal(a100.fecha_ultimo_parto, '2026-08-10')
  assert.equal(a100.inicio_lactancia, '2026-08-10')
  assert.deepEqual(a100.ultimos_eventos.map((cada) => cada.id_evento), [6, 5, 4, 3, 2])
  assert.deepEqual(a100.alertas, [{ tipo_alerta: 'tacto', fecha_objetivo: '2026-11-12' }])
  assert.deepEqual(
    [a200.partos, a200.fecha_ultimo_parto, a200.inicio_lactancia, a200.ultimos_eventos, a200.alertas],
    [0, null, null, [], []],
  )
})

test('la copia del rodeo se vacía si es de otro usuario o no tiene dueño anotado', () => {
  assert.equal(copiaEsDeOtroUsuario('4', 4), false)
  assert.equal(copiaEsDeOtroUsuario('4', 7), true)
  assert.equal(copiaEsDeOtroUsuario(null, 4), true)
})
