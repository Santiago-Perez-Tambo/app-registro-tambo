import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularParaAnimal, cerrarCumplidas, sumarDias, diasEntre, finDeCalostro } from './reglas.js'

const PARAMETROS = {
  dias_servicio_tacto: 45,
  dias_parto_secado: 60,
  dias_calostro: 5,
  dias_lactancia_primer_celo: 45,
  dias_lactancia_induccion: 60,
}

const EN_ORDENE_SERVIDA = { id_animal: 1, categoria: 'vaca en ordeñe', estado_reproductivo: 'servida sin tacto' }
const EN_ORDENE_VACIA = { id_animal: 1, categoria: 'vaca en ordeñe', estado_reproductivo: 'vacía' }
const EN_ORDENE_PRENADA = { id_animal: 1, categoria: 'vaca en ordeñe', estado_reproductivo: 'preñada' }
const SECA_PRENADA = { id_animal: 1, categoria: 'vaca seca', estado_reproductivo: 'preñada' }

function evento(id_evento, tipo_evento, fecha_evento, datos = {}) {
  return {
    id_evento,
    tipo_evento,
    fecha_evento,
    resultado_tacto: null,
    edad_gestacional: null,
    motivo_secado: null,
    ...datos,
  }
}

function cerrarAlertas(alertas, tipos) {
  return alertas.map((alerta) =>
    alerta.estado === 'vigente' && tipos.includes(alerta.tipo_alerta) ? { ...alerta, estado: 'cumplida' } : alerta,
  )
}

function confirmarEnOrden(animalInicial, eventos) {
  let animal = { ...animalInicial }
  let alertas = []
  const advertencias = []
  eventos.forEach((actual, posicion) => {
    const resultado = calcularParaAnimal(animal, actual, eventos.slice(0, posicion), PARAMETROS)
    alertas = [...cerrarAlertas(alertas, resultado.tiposQueSeCierran), ...resultado.alertasNuevas]
    advertencias.push(...resultado.advertencias)
    animal = { ...animal, ...resultado.cambiosDelAnimal }
  })
  return { animal, alertas, advertencias }
}

function vigentes(alertas) {
  return alertas.filter((alerta) => alerta.estado === 'vigente').map((alerta) => [alerta.tipo_alerta, alerta.fecha_objetivo])
}

function cumplidas(alertas) {
  return alertas.filter((alerta) => alerta.estado === 'cumplida').map((alerta) => [alerta.tipo_alerta, alerta.fecha_objetivo])
}

function tiposDeAdvertencia(advertencias) {
  return advertencias.map((advertencia) => [advertencia.id_evento, advertencia.tipo_advertencia, advertencia.resuelta])
}

test('sumarDias pasa bien el fin de mes y el fin de año', () => {
  assert.equal(sumarDias('2026-01-31', 1), '2026-02-01')
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(sumarDias('2026-11-13', -45), '2026-09-29')
})

test('sumarDias respeta el año bisiesto', () => {
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29')
  assert.equal(sumarDias('2027-02-28', 1), '2027-03-01')
  assert.equal(sumarDias('2028-03-01', -1), '2028-02-29')
})

test('diasEntre cuenta los días entre dos fechas', () => {
  assert.equal(diasEntre('2026-05-10', '2026-05-16'), 6)
  assert.equal(diasEntre('2026-07-10', '2026-05-25'), -46)
})

test('caso 1, A100: el servicio la deja servida sin tacto con tacto a los 45 días', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [evento(1, 'servicio', '2026-09-29')])
  assert.equal(animal.estado_reproductivo, 'servida sin tacto')
  assert.equal(animal.categoria, 'vaca en ordeñe')
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-11-13']])
  assert.deepEqual(advertencias, [])
})

test('caso 2, A011: una vaca vacía servida pasa a servida sin tacto', () => {
  const { animal, alertas } = confirmarEnOrden(EN_ORDENE_VACIA, [evento(1, 'servicio', '2026-10-23')])
  assert.equal(animal.estado_reproductivo, 'servida sin tacto')
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-12-07']])
})

test('caso 3, A095: tacto preñada sin edad calcula el parto desde el servicio', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-06-28'),
    evento(2, 'tacto', '2026-09-07', { resultado_tacto: 'preñada' }),
  ])
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(vigentes(alertas), [['parto', '2027-04-07'], ['secado', '2027-02-06']])
  assert.deepEqual(cumplidas(alertas), [['tacto', '2026-08-12']])
  assert.deepEqual(advertencias, [])
})

test('caso 4, A055: tacto con 120 días a 6 días del servicio coincide', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-05-16'),
    evento(2, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 120 }),
  ])
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(vigentes(alertas), [['parto', '2027-02-17'], ['secado', '2026-12-19']])
  assert.deepEqual(advertencias, [])
})

test('caso 5, A146: tacto vacía después de un servicio no lleva advertencia', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(
    { id_animal: 1, categoria: 'vaquillona', estado_reproductivo: 'vacía' },
    [evento(1, 'servicio', '2026-07-23'), evento(2, 'tacto', '2026-08-05', { resultado_tacto: 'vacía' })],
  )
  assert.equal(animal.estado_reproductivo, 'vacía')
  assert.deepEqual(vigentes(alertas), [])
  assert.deepEqual(advertencias, [])
})

test('caso 6, A029: servicio después de un tacto vacía no es repetición de celo', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'tacto', '2026-08-05', { resultado_tacto: 'vacía' }),
    evento(2, 'servicio', '2026-08-29'),
  ])
  assert.equal(animal.estado_reproductivo, 'servida sin tacto')
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-10-13']])
  assert.deepEqual(advertencias, [])
})

test('caso 7, A127: tacto a 46 días del servicio marca el servicio como no coincidente', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-07-10'),
    evento(2, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 105 }),
  ])
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(vigentes(alertas), [['parto', '2027-03-04'], ['secado', '2027-01-03']])
  assert.deepEqual(tiposDeAdvertencia(advertencias), [[1, 'servicio_no_coincidente', false]])
  assert.match(advertencias[0].detalle, /46 días/)
})

test('caso 8, A065: tacto preñada sin servicio no marca nada', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 135 }),
  ])
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(vigentes(alertas), [['parto', '2027-02-02'], ['secado', '2026-12-04']])
  assert.deepEqual(advertencias, [])
})

test('caso 9, A057: cuatro servicios dejan los tres primeros como repetición de celo', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-09-03'),
    evento(2, 'servicio', '2026-09-24'),
    evento(3, 'servicio', '2026-10-16'),
    evento(4, 'servicio', '2026-11-09'),
  ])
  assert.equal(animal.estado_reproductivo, 'servida sin tacto')
  assert.deepEqual(tiposDeAdvertencia(advertencias), [
    [1, 'repeticion_celo', true],
    [2, 'repeticion_celo', true],
    [3, 'repeticion_celo', true],
  ])
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-12-24']])
})

test('caso 10, A075: un servicio después de la fecha de tacto también es repetición de celo', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-08-27'),
    evento(2, 'servicio', '2026-11-03'),
  ])
  assert.equal(animal.estado_reproductivo, 'servida sin tacto')
  assert.deepEqual(tiposDeAdvertencia(advertencias), [[1, 'repeticion_celo', true]])
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-12-18']])
})

test('caso 11, A015: el secado por preñez cumple la alerta de secado y deja la de parto', () => {
  const { animal, alertas } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-03-20'),
    evento(2, 'tacto', '2026-05-04', { resultado_tacto: 'preñada' }),
    evento(3, 'secado', '2026-10-25', { motivo_secado: 'preñez' }),
  ])
  assert.equal(animal.categoria, 'vaca seca')
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(cumplidas(alertas), [['tacto', '2026-05-04'], ['secado', '2026-10-29']])
  assert.deepEqual(vigentes(alertas), [['parto', '2026-12-28']])
})

test('caso 12, A125: el secado por baja producción de una preñada la deja seca y preñada', () => {
  const { animal } = confirmarEnOrden(EN_ORDENE_PRENADA, [
    evento(1, 'secado', '2026-09-18', { motivo_secado: 'baja producción' }),
  ])
  assert.equal(animal.categoria, 'vaca seca')
  assert.equal(animal.estado_reproductivo, 'preñada')
})

test('A008: el secado por baja producción de una vacía la deja seca y disponible para servicio', () => {
  const { animal } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'secado', '2026-09-18', { motivo_secado: 'baja producción' }),
  ])
  assert.equal(animal.categoria, 'vaca seca')
  assert.equal(animal.estado_reproductivo, 'vacía')
})

test('caso 13, A013: el parto la pasa a vaca en ordeñe y crea los avisos de celo', () => {
  const { animal, alertas } = confirmarEnOrden(SECA_PRENADA, [
    evento(1, 'tacto', '2026-04-01', { resultado_tacto: 'preñada', edad_gestacional: 120 }),
    evento(2, 'secado', '2026-08-20', { motivo_secado: 'preñez' }),
    evento(3, 'parto', '2026-10-23'),
  ])
  assert.equal(animal.categoria, 'vaca en ordeñe')
  assert.equal(animal.estado_reproductivo, 'vacía')
  assert.deepEqual(cumplidas(alertas).map(([tipo]) => tipo), ['parto', 'secado'])
  assert.deepEqual(vigentes(alertas), [['sin_celo', '2026-12-07'], ['inducir_celo', '2026-12-22']])
  assert.equal(finDeCalostro('2026-10-23', PARAMETROS), '2026-10-28')
})

test('el parto de una vaquillona la pasa a vaca en ordeñe', () => {
  const { animal } = confirmarEnOrden(
    { id_animal: 1, categoria: 'vaquillona', estado_reproductivo: 'preñada' },
    [evento(1, 'parto', '2026-10-23')],
  )
  assert.equal(animal.categoria, 'vaca en ordeñe')
  assert.equal(animal.estado_reproductivo, 'vacía')
})

test('un servicio cierra los avisos de vaca sin celo', () => {
  const { alertas } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'parto', '2026-08-01'),
    evento(2, 'servicio', '2026-10-01'),
  ])
  assert.deepEqual(vigentes(alertas), [['tacto', '2026-11-15']])
})

test('el tacto vacía cierra también las alertas de parto y secado', () => {
  assert.deepEqual(cerrarCumplidas(evento(2, 'tacto', '2026-10-01', { resultado_tacto: 'vacía' })), [
    'tacto',
    'parto',
    'secado',
  ])
  const { alertas } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 135 }),
    evento(2, 'tacto', '2026-10-01', { resultado_tacto: 'vacía' }),
  ])
  assert.deepEqual(vigentes(alertas), [])
})

test('el parto cierra también la alerta de tacto', () => {
  assert.deepEqual(cerrarCumplidas(evento(2, 'parto', '2026-10-01')), ['parto', 'secado', 'tacto'])
  const { alertas } = confirmarEnOrden(SECA_PRENADA, [evento(1, 'servicio', '2026-09-01'), evento(2, 'parto', '2026-10-01')])
  assert.deepEqual(vigentes(alertas).map(([tipo]) => tipo), ['sin_celo', 'inducir_celo'])
})

test('un evento anterior al último registrado no cambia nada y queda advertido', () => {
  const anteriores = [evento(1, 'tacto', '2026-10-10', { resultado_tacto: 'vacía' })]
  const resultado = calcularParaAnimal(EN_ORDENE_VACIA, evento(2, 'servicio', '2026-09-10'), anteriores, PARAMETROS)
  assert.deepEqual(resultado, {
    cambiosDelAnimal: {},
    alertasNuevas: [],
    tiposQueSeCierran: [],
    advertencias: [
      {
        id_evento: 2,
        tipo_advertencia: 'evento_anterior',
        detalle: 'Evento del 10/09 anterior al último registrado (10/10): no cambió el estado de la vaca',
        resuelta: false,
      },
    ],
  })
})

test('un evento con la misma fecha que el último sí cambia el estado', () => {
  const anteriores = [evento(1, 'tacto', '2026-10-10', { resultado_tacto: 'vacía' })]
  const resultado = calcularParaAnimal(EN_ORDENE_VACIA, evento(2, 'servicio', '2026-10-10'), anteriores, PARAMETROS)
  assert.deepEqual(resultado.cambiosDelAnimal, { estado_reproductivo: 'servida sin tacto' })
  assert.deepEqual(resultado.advertencias, [])
})

test('un servicio sobre una vaca preñada no cambia nada y queda advertido con el parto probable', () => {
  const { animal, alertas, advertencias } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 135 }),
    evento(2, 'servicio', '2026-10-01'),
  ])
  assert.equal(animal.estado_reproductivo, 'preñada')
  assert.deepEqual(vigentes(alertas), [['parto', '2027-02-02'], ['secado', '2026-12-04']])
  assert.deepEqual(advertencias, [
    {
      id_evento: 2,
      tipo_advertencia: 'servicio_sobre_prenada',
      detalle:
        'Servicio del 01/10 sobre una vaca preñada (parto probable 02/02): no cambió el estado. Revisar con el veterinario',
      resuelta: false,
    },
  ])
})

test('un servicio sobre una preñada del padrón sin tacto registrado avisa que el parto no se pudo calcular', () => {
  const resultado = calcularParaAnimal(EN_ORDENE_PRENADA, evento(1, 'servicio', '2026-10-01'), [], PARAMETROS)
  assert.deepEqual(resultado.cambiosDelAnimal, {})
  assert.deepEqual(resultado.alertasNuevas, [])
  assert.deepEqual(resultado.tiposQueSeCierran, [])
  assert.equal(
    resultado.advertencias[0].detalle,
    'Servicio del 01/10 sobre una vaca preñada (parto probable sin calcular): no cambió el estado. Revisar con el veterinario',
  )
})

test('un tacto sin edad no calcula el parto desde un servicio hecho sobre la preñada', () => {
  const { alertas, advertencias } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 135 }),
    evento(2, 'servicio', '2026-10-01'),
    evento(3, 'tacto', '2026-11-01', { resultado_tacto: 'preñada' }),
  ])
  assert.deepEqual(vigentes(alertas), [['parto', '2027-02-02'], ['secado', '2026-12-04']])
  assert.deepEqual(tiposDeAdvertencia(advertencias), [
    [2, 'servicio_sobre_prenada', false],
    [3, 'sin_fecha_parto', false],
  ])
})

test('un tacto con edad no marca como no coincidente un servicio hecho sobre la preñada', () => {
  const { advertencias } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 135 }),
    evento(2, 'servicio', '2026-10-01'),
    evento(3, 'tacto', '2026-11-01', { resultado_tacto: 'preñada', edad_gestacional: 190 }),
  ])
  assert.deepEqual(tiposDeAdvertencia(advertencias), [[2, 'servicio_sobre_prenada', false]])
})

test('en una preñada del padrón sin tacto registrado, el tacto saltea el servicio hecho sobre la preñada', () => {
  const { alertas, advertencias } = confirmarEnOrden(EN_ORDENE_PRENADA, [
    evento(1, 'servicio', '2026-10-01'),
    evento(2, 'tacto', '2026-11-01', { resultado_tacto: 'preñada' }),
  ])
  assert.deepEqual(vigentes(alertas), [])
  assert.deepEqual(tiposDeAdvertencia(advertencias), [
    [1, 'servicio_sobre_prenada', false],
    [2, 'sin_fecha_parto', false],
  ])
})

test('después de un tacto vacía los servicios vuelven a contar para el parto', () => {
  const { alertas, advertencias } = confirmarEnOrden(EN_ORDENE_VACIA, [
    evento(1, 'tacto', '2026-03-01', { resultado_tacto: 'preñada', edad_gestacional: 60 }),
    evento(2, 'tacto', '2026-05-01', { resultado_tacto: 'vacía' }),
    evento(3, 'servicio', '2026-06-28'),
    evento(4, 'tacto', '2026-09-07', { resultado_tacto: 'preñada' }),
  ])
  assert.deepEqual(vigentes(alertas), [['parto', '2027-04-07'], ['secado', '2027-02-06']])
  assert.deepEqual(advertencias, [])
})

test('preñada sin edad gestacional ni servicio no calcula parto y queda advertida', () => {
  const resultado = calcularParaAnimal(
    EN_ORDENE_VACIA,
    evento(1, 'tacto', '2026-09-07', { resultado_tacto: 'preñada' }),
    [],
    PARAMETROS,
  )
  assert.deepEqual(resultado.cambiosDelAnimal, { estado_reproductivo: 'preñada' })
  assert.deepEqual(resultado.alertasNuevas, [])
  assert.deepEqual(tiposDeAdvertencia(resultado.advertencias), [[1, 'sin_fecha_parto', false]])
})

test('las alertas nuevas llevan la vaca, el evento de origen y el estado vigente', () => {
  const resultado = calcularParaAnimal(EN_ORDENE_VACIA, evento(7, 'servicio', '2026-09-29'), [], PARAMETROS)
  assert.deepEqual(resultado.alertasNuevas, [
    { tipo_alerta: 'tacto', fecha_objetivo: '2026-11-13', id_animal: 1, id_evento_origen: 7, estado: 'vigente' },
  ])
})

test('cada texto que se guarda entra en su columna', () => {
  const { alertas, advertencias } = confirmarEnOrden(EN_ORDENE_SERVIDA, [
    evento(1, 'servicio', '2026-06-01'),
    evento(2, 'servicio', '2026-06-20'),
    evento(3, 'tacto', '2026-09-07', { resultado_tacto: 'preñada', edad_gestacional: 30 }),
    evento(4, 'secado', '2026-10-01', { motivo_secado: 'preñez' }),
    evento(5, 'parto', '2026-10-20'),
    evento(6, 'servicio', '2026-09-01'),
    evento(7, 'tacto', '2026-11-01', { resultado_tacto: 'preñada' }),
    evento(8, 'servicio', '2026-11-10'),
  ])
  const alertasGuardadas = [...new Set(alertas.map((alerta) => alerta.tipo_alerta))].sort()
  const advertenciasGuardadas = [...new Set(advertencias.map((advertencia) => advertencia.tipo_advertencia))].sort()
  assert.deepEqual(alertasGuardadas, ['inducir_celo', 'parto', 'secado', 'sin_celo', 'tacto'])
  assert.deepEqual(advertenciasGuardadas, [
    'evento_anterior',
    'repeticion_celo',
    'servicio_no_coincidente',
    'servicio_sobre_prenada',
    'sin_fecha_parto',
  ])
  for (const tipo of [...alertasGuardadas, ...advertenciasGuardadas]) {
    assert.ok(tipo.length <= 25, tipo)
  }
  for (const estado of ['vigente', 'cumplida']) {
    assert.ok(estado.length <= 10, estado)
  }
  for (const valor of ['vaca seca', 'vaca en ordeñe', 'servida sin tacto', 'preñada', 'vacía']) {
    assert.ok(valor.length <= 20, valor)
  }
})
