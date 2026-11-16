import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  armarAsiento,
  avisoCambioDeVaca,
  camposDelTipo,
  caravanaDestino,
  caravanaParaPasar,
  camposNoEntendidos,
  capturadoPor,
  datosParaEnviar,
  elegirAsiento,
  estadoDeLaVaca,
  faltaDeVaca,
  fechaHoraCompleta,
  filtrarAsientos,
  formularioDesdeEvento,
  ordenarAsientos,
  quedanPorConfirmar,
  queFaltaParaConfirmar,
  textoActualizado,
  VISTA_INICIAL,
  vistaValida,
  estadoDelAsiento,
  contarSegunFiltro,
  contarSegunEstado,
  inicioDeLosUltimosDias,
  etiquetaDeRevision,
  franjaDeRevision,
  camposParaLeer,
  etiquetaDeFila,
  textoCambioDeVaca,
  textoDeFila,
  tituloDelDetalle,
} from './asiento.js'

const HOY = '2026-11-14'

function eventoPropuesto(cambios) {
  return {
    id_evento: 5,
    id_usuario_confirma: null,
    tipo_evento: 'servicio',
    fecha_evento: HOY,
    tipo_servicio: 'monta natural',
    toro: null,
    resultado_tacto: null,
    edad_gestacional: null,
    motivo_secado: null,
    sexo_ternero: null,
    advertencia: [],
    ...cambios,
  }
}

function filaDeCaptura(cambios) {
  return {
    id_captura: 'c1',
    id_usuario: 2,
    fecha_hora: '2026-11-14T06:35:00',
    tipo_captura: 'texto',
    texto: 'la cien se sirvió hoy a la mañana con el toro',
    transcripcion: null,
    animal: { caravana: 'A100', categoria: 'vaca en ordeñe', estado_reproductivo: 'vacía' },
    usuario: { nombre: null, rol: 'tambero' },
    evento: [eventoPropuesto()],
    ...cambios,
  }
}

function formulario(cambios) {
  return { ...formularioDesdeEvento(eventoPropuesto(), '2026-11-14T06:35:00'), ...cambios }
}

test('una captura con el evento ya confirmado no queda en la lista', () => {
  const confirmada = filaDeCaptura({ id_captura: 'c2', evento: [eventoPropuesto({ id_usuario_confirma: 1 })] })
  const sinInterpretar = filaDeCaptura({ id_captura: 'c3', evento: [] })
  const ids = quedanPorConfirmar([filaDeCaptura(), confirmada, sinInterpretar]).map((fila) => fila.id_captura)
  assert.deepEqual(ids, ['c1', 'c3'])
})

test('el asiento muestra lo escrito si todavía no tiene transcripción y solo las advertencias sin resolver', () => {
  const advertencias = [
    { id_advertencia: 1, detalle: 'No se entendió el toro', resuelta: false },
    { id_advertencia: 2, detalle: 'vieja', resuelta: true },
  ]
  const asiento = armarAsiento(filaDeCaptura({ evento: [eventoPropuesto({ advertencia: advertencias })] }))
  assert.equal(asiento.lo_que_dijo, 'la cien se sirvió hoy a la mañana con el toro')
  assert.deepEqual(asiento.advertencias, [advertencias[0]])
  assert.equal(armarAsiento(filaDeCaptura({ evento: [] })).evento, null)
})

test('cada fila dice el tipo propuesto y cómo se capturó', () => {
  assert.equal(textoDeFila(armarAsiento(filaDeCaptura())), 'Servicio propuesto · Escrito')
  const foto = filaDeCaptura({ tipo_captura: 'foto', evento: [eventoPropuesto({ tipo_evento: 'tacto' })] })
  assert.equal(textoDeFila(armarAsiento(foto)), 'Tacto propuesto · Foto')
  const sinTipo = filaDeCaptura({ evento: [eventoPropuesto({ tipo_evento: null })] })
  assert.equal(textoDeFila(armarAsiento(sinTipo)), 'Sin tipo · Escrito')
  assert.equal(textoDeFila(armarAsiento(filaDeCaptura({ evento: [] }))), 'Sin interpretar')
})

test('un audio dice en la fila que es audio y en el detalle cuánto duró', () => {
  const audio = armarAsiento(filaDeCaptura({ tipo_captura: 'audio', archivo: '1/abc-7s.webm', texto: null }))
  assert.equal(textoDeFila(audio), 'Servicio propuesto · Audio')
  assert.equal(audio.duracion, 7)
  assert.equal(capturadoPor(audio), 'Tambero, audio 0:07')
  const sinDuracion = armarAsiento(filaDeCaptura({ tipo_captura: 'audio', archivo: null, texto: null }))
  assert.equal(capturadoPor(sinDuracion), 'Tambero, audio')
})

test('el detalle lleva la caravana, el tipo, quién capturó, la fecha y el estado de la vaca', () => {
  const asiento = armarAsiento(filaDeCaptura())
  assert.equal(tituloDelDetalle(asiento, 'A100'), 'A100 · Servicio')
  assert.equal(tituloDelDetalle(armarAsiento(filaDeCaptura({ evento: [] })), 'A100'), 'A100 · Sin interpretar')
  assert.equal(tituloDelDetalle(asiento, 'A127'), 'A127 · Servicio')
  assert.equal(capturadoPor(asiento), 'Tambero, escrito')
  assert.equal(capturadoPor(armarAsiento(filaDeCaptura({ usuario: { nombre: 'Ramón', rol: 'tambero' } }))), 'Ramón, escrito')
  assert.equal(fechaHoraCompleta('2026-09-28T06:35:00'), '28/09/2026 06:35')
  assert.equal(estadoDeLaVaca(asiento), 'Vaca en ordeñe, vacía')
})

test('el actualizado dice recién antes del minuto y después los minutos', () => {
  assert.equal(textoActualizado(0, 30 * 1000), 'Actualizado recién')
  assert.equal(textoActualizado(0, 2 * 60 * 1000 + 5000), 'Actualizado hace 2 min')
})

test('al salir un asiento de la lista se elige el que quedó en su lugar', () => {
  const asientos = [{ id_captura: 'a' }, { id_captura: 'b' }, { id_captura: 'c' }]
  assert.equal(elegirAsiento(asientos, 'b', 1), 'b')
  assert.equal(elegirAsiento(asientos, 'x', 1), 'b')
  assert.equal(elegirAsiento(asientos, 'x', 5), 'c')
  assert.equal(elegirAsiento(asientos, null, -1), 'a')
  assert.equal(elegirAsiento([], 'x', 0), null)
})

const PARA_ORDENAR = [
  { id_captura: 'a', caravana: 'A100', fecha_hora: '2026-11-14T08:00:00', evento: { id_evento: 1 } },
  { id_captura: 'b', caravana: 'A011', fecha_hora: '2026-11-13T16:08:00', evento: null },
  { id_captura: 'c', caravana: 'A100', fecha_hora: '2026-11-12T07:00:00', evento: { id_evento: 2 } },
  { id_captura: 'd', caravana: 'A55', fecha_hora: '2026-11-14T09:00:00', evento: { id_evento: 3 } },
]

function ids(asientos) {
  return asientos.map((asiento) => asiento.id_captura)
}

test('se ordena de más viejo a más nuevo, al revés o por caravana', () => {
  assert.deepEqual(ids(ordenarAsientos(PARA_ORDENAR, 'viejos')), ['c', 'b', 'a', 'd'])
  assert.deepEqual(ids(ordenarAsientos(PARA_ORDENAR, 'nuevos')), ['d', 'a', 'b', 'c'])
  assert.deepEqual(ids(ordenarAsientos(PARA_ORDENAR, 'caravana')), ['b', 'd', 'c', 'a'])
})

test('ordenar no cambia la lista original', () => {
  ordenarAsientos(PARA_ORDENAR, 'caravana')
  assert.deepEqual(ids(PARA_ORDENAR), ['a', 'b', 'c', 'd'])
})

function vista(cambios) {
  return { ...VISTA_INICIAL, ...cambios }
}

test('se filtran todos, los propuestos o los sin interpretar', () => {
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, vista({ filtro: 'todos' }))), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, vista({ filtro: 'propuestos' }))), ['a', 'c', 'd'])
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, vista({ filtro: 'sin_interpretar' }))), ['b'])
})

test('cada tipo usa sus campos y la edad solo con el tacto preñada', () => {
  assert.deepEqual(camposDelTipo('servicio', ''), ['tipo_servicio', 'toro'])
  assert.deepEqual(camposDelTipo('tacto', 'preñada'), ['resultado_tacto', 'edad_gestacional'])
  assert.deepEqual(camposDelTipo('tacto', 'vacía'), ['resultado_tacto'])
  assert.deepEqual(camposDelTipo('secado', ''), ['motivo_secado'])
  assert.deepEqual(camposDelTipo('parto', ''), ['sexo_ternero'])
  assert.deepEqual(camposDelTipo('', ''), [])
})

test('un campo vacío que el tipo usa queda como no entendido, también el toro', () => {
  assert.deepEqual(camposNoEntendidos(formulario()), ['toro'])
  assert.deepEqual(camposNoEntendidos(formulario({ toro: '512' })), [])
  assert.deepEqual(camposNoEntendidos(formulario({ tipo_evento: '' })), ['tipo_evento'])
  assert.deepEqual(camposNoEntendidos(formulario({ tipo_evento: 'tacto' })), ['resultado_tacto'])
})

test('para confirmar hacen falta el tipo, la fecha y el dato principal', () => {
  assert.equal(queFaltaParaConfirmar(formulario({ tipo_evento: '' }), HOY), 'Falta el tipo de evento')
  assert.equal(queFaltaParaConfirmar(formulario({ fecha_evento: '' }), HOY), 'Falta la fecha')
  assert.equal(queFaltaParaConfirmar(formulario({ fecha_evento: '2026-11-15' }), HOY), 'La fecha no puede ser posterior a hoy')
  assert.equal(queFaltaParaConfirmar(formulario({ tipo_servicio: '' }), HOY), 'Falta el tipo de servicio')
  assert.equal(queFaltaParaConfirmar(formulario({ tipo_evento: 'parto' }), HOY), 'Falta el sexo del ternero')
  assert.equal(queFaltaParaConfirmar(formulario(), HOY), '')
})

test('la edad gestacional, si se escribe, va de 1 a 283 días enteros', () => {
  const tacto = { tipo_evento: 'tacto', resultado_tacto: 'preñada' }
  assert.equal(queFaltaParaConfirmar(formulario({ ...tacto, edad_gestacional: '' }), HOY), '')
  assert.equal(queFaltaParaConfirmar(formulario({ ...tacto, edad_gestacional: '120' }), HOY), '')
  for (const edad of ['0', '284', '90.5', 'tres']) {
    assert.equal(
      queFaltaParaConfirmar(formulario({ ...tacto, edad_gestacional: edad }), HOY),
      'La edad gestacional tiene que ser un número entero de 1 a 283 días',
    )
  }
})

test('se mandan solo los campos del tipo elegido, con la edad como número y los vacíos como null', () => {
  assert.deepEqual(datosParaEnviar(formulario({ toro: ' 512 ', resultado_tacto: 'preñada' })), {
    tipo_evento: 'servicio',
    fecha_evento: HOY,
    tipo_servicio: 'monta natural',
    toro: '512',
  })
  assert.deepEqual(datosParaEnviar(formulario({ tipo_evento: 'tacto', resultado_tacto: 'preñada', edad_gestacional: '90' })), {
    tipo_evento: 'tacto',
    fecha_evento: HOY,
    resultado_tacto: 'preñada',
    edad_gestacional: 90,
  })
  assert.equal(datosParaEnviar(formulario()).toro, null)
})

function advertencia(tipo, detalle) {
  return { id_advertencia: 1, tipo_advertencia: tipo, detalle, resuelta: false }
}

test('el botón ofrece la caravana que nombró el texto', () => {
  const advertencias = [advertencia('otra_caravana', 'El texto nombra A127; el evento quedó en A100')]
  assert.equal(caravanaParaPasar(advertencias), 'A127')
})

test('el botón también sale con la caravana que nombró la foto', () => {
  const advertencias = [
    advertencia('dato_no_entendido', 'No se entendió el toro'),
    advertencia('otra_caravana', 'La foto nombra A055; el evento quedó en A100'),
  ]
  assert.equal(caravanaParaPasar(advertencias), 'A055')
})

test('sin advertencia de otra caravana no hay botón', () => {
  assert.equal(caravanaParaPasar([]), null)
  assert.equal(caravanaParaPasar([advertencia('dato_no_entendido', 'No se entendió la fecha')]), null)
})

test('si el texto nombra más de una caravana no hay botón', () => {
  assert.equal(caravanaParaPasar([advertencia('otra_caravana', 'El texto nombra A127 y A130; el evento quedó en A100')]), null)
  assert.equal(caravanaParaPasar([advertencia('otra_caravana', 'El texto nombra A1, A2 y A3; el evento quedó en A100')]), null)
})

test('el aviso de cambio de vaca nombra el rol de quien capturó', () => {
  assert.equal(
    avisoCambioDeVaca({ caravana: 'A100', rol_usuario: 'tambero' }, 'A127'),
    'Este asiento pasa de A100 a A127. El registro original del tambero queda en A100.',
  )
  assert.equal(
    avisoCambioDeVaca({ caravana: 'A100', rol_usuario: 'asesor' }, 'A127'),
    'Este asiento pasa de A100 a A127. El registro original del asesor queda en A100.',
  )
})

test('el botón pasa a la caravana escrita o, si no, a la que nombró el texto', () => {
  assert.equal(caravanaDestino('A100', 'A100', 'A127'), 'A127')
  assert.equal(caravanaDestino('A055', 'A100', 'A127'), 'A055')
  assert.equal(caravanaDestino('', 'A100', 'A127'), 'A127')
  assert.equal(caravanaDestino('A127', 'A127', 'A127'), null)
  assert.equal(caravanaDestino('A100', 'A100', null), null)
})

test('no se confirma con la vaca vacía ni con una caravana escrita sin pasar', () => {
  assert.equal(faltaDeVaca('', 'A100'), 'Escribí la caravana de la vaca')
  assert.equal(faltaDeVaca('A999', 'A100'), 'Tocá "Pasar a A999" para cambiar la vaca')
  assert.equal(faltaDeVaca('A127', 'A127'), '')
})

const CON_REVISADOS = [
  { id_captura: 'p1', estado: 'interpretada', evento: { id_evento: 1 } },
  { id_captura: 'p2', estado: 'sincronizada', evento: null },
  { id_captura: 'c1', estado: 'confirmada', evento: { id_evento: 3 } },
  { id_captura: 'c2', estado: 'confirmada', evento: { id_evento: 4 } },
  { id_captura: 'r1', estado: 'rechazada', evento: { id_evento: 5 } },
]

test('cada asiento sabe si está pendiente, confirmado o rechazado', () => {
  assert.equal(estadoDelAsiento(CON_REVISADOS[0]), 'pendiente')
  assert.equal(estadoDelAsiento(CON_REVISADOS[1]), 'pendiente')
  assert.equal(estadoDelAsiento(CON_REVISADOS[2]), 'confirmado')
  assert.equal(estadoDelAsiento(CON_REVISADOS[4]), 'rechazado')
})

test('confirmados y rechazados se ven solo si se prenden', () => {
  assert.deepEqual(ids(filtrarAsientos(CON_REVISADOS, vista())), ['p1', 'p2'])
  assert.deepEqual(ids(filtrarAsientos(CON_REVISADOS, vista({ confirmados: true }))), ['p1', 'p2', 'c1', 'c2'])
  assert.deepEqual(ids(filtrarAsientos(CON_REVISADOS, vista({ rechazados: true }))), ['p1', 'p2', 'r1'])
  assert.deepEqual(
    ids(filtrarAsientos(CON_REVISADOS, vista({ filtro: 'propuestos', confirmados: true, rechazados: true }))),
    ['p1', 'c1', 'c2', 'r1'],
  )
})

test('las cantidades de mostrar cuentan los pendientes y cada estado por separado', () => {
  assert.equal(contarSegunFiltro(CON_REVISADOS, 'todos'), 2)
  assert.equal(contarSegunFiltro(CON_REVISADOS, 'propuestos'), 1)
  assert.equal(contarSegunFiltro(CON_REVISADOS, 'sin_interpretar'), 1)
  assert.equal(contarSegunEstado(CON_REVISADOS, 'confirmado'), 2)
  assert.equal(contarSegunEstado(CON_REVISADOS, 'rechazado'), 1)
})

test('la vista guardada se usa si es válida y si no se arranca con la inicial', () => {
  const guardada = { filtro: 'propuestos', orden: 'caravana', confirmados: true, rechazados: false }
  assert.deepEqual(vistaValida(guardada), guardada)
  assert.deepEqual(vistaValida(null), VISTA_INICIAL)
  assert.deepEqual(vistaValida('texto'), VISTA_INICIAL)
  assert.deepEqual(vistaValida({ filtro: 'otro', orden: 'raro', confirmados: 'si' }), VISTA_INICIAL)
  assert.deepEqual(VISTA_INICIAL, { filtro: 'todos', orden: 'viejos', confirmados: false, rechazados: false })
})

test('los revisados se traen desde hace 30 días a las cero horas', () => {
  assert.equal(inicioDeLosUltimosDias('2026-11-15T19:45:00', 30), '2026-10-16T00:00:00')
  assert.equal(inicioDeLosUltimosDias('2026-03-01T08:00:00', 30), '2026-01-30T00:00:00')
})

test('la etiqueta dice quién confirmó y cuándo, o que se rechazó', () => {
  const confirmado = {
    estado: 'confirmada',
    evento: { fecha_confirmacion: '2026-11-14T19:45:12', usuario: { nombre: 'Santiago' } },
  }
  assert.equal(etiquetaDeRevision(confirmado), 'Confirmado por Santiago el 14/11 19:45')
  assert.equal(etiquetaDeRevision({ estado: 'rechazada', evento: { usuario: null } }), 'Rechazado')
})

test('la franja nombra la vaca y lo que pasó', () => {
  assert.deepEqual(franjaDeRevision('A127', 'confirmado'), { tipo: 'confirmado', texto: 'Asiento de A127 confirmado' })
  assert.deepEqual(franjaDeRevision('A100', 'rechazado'), { tipo: 'rechazado', texto: 'Asiento de A100 rechazado' })
})

test('el asiento usa la vaca del evento y guarda la de la captura', () => {
  const cambiada = filaDeCaptura({
    estado: 'confirmada',
    evento: [eventoPropuesto({ animal: { caravana: 'A127', categoria: 'vaca seca', estado_reproductivo: 'preñada' } })],
  })
  const asiento = armarAsiento(cambiada)
  assert.equal(asiento.caravana, 'A127')
  assert.equal(asiento.caravana_captura, 'A100')
  assert.equal(asiento.categoria, 'vaca seca')
  assert.equal(asiento.estado, 'confirmada')
  assert.equal(armarAsiento(filaDeCaptura({ evento: [] })).caravana, 'A100')
})

test('los campos de solo lectura muestran los textos de pantalla', () => {
  const tacto = eventoPropuesto({ tipo_evento: 'tacto', resultado_tacto: 'preñada', edad_gestacional: 90 })
  assert.deepEqual(camposParaLeer(tacto, '2026-11-14T06:35:00'), [
    { campo: 'tipo_evento', etiqueta: 'Tipo de evento', valor: 'Tacto' },
    { campo: 'fecha_evento', etiqueta: 'Fecha', valor: '14/11/2026' },
    { campo: 'resultado_tacto', etiqueta: 'Resultado del tacto', valor: 'Preñada' },
    { campo: 'edad_gestacional', etiqueta: 'Edad gestacional', valor: '90 días' },
  ])
  const secado = eventoPropuesto({ tipo_evento: 'secado', motivo_secado: null })
  assert.equal(camposParaLeer(secado, '2026-11-14T06:35:00')[2].valor, '-')
})

test('la fila de un asiento revisado dice el tipo sin propuesto y lleva su etiqueta', () => {
  const confirmada = filaDeCaptura({ estado: 'confirmada', evento: [eventoPropuesto({ tipo_evento: 'tacto' })] })
  assert.equal(textoDeFila(armarAsiento(confirmada)), 'Tacto · Escrito')
  assert.equal(etiquetaDeFila(armarAsiento(confirmada)), 'Confirmado')
  const rechazada = filaDeCaptura({ estado: 'rechazada', evento: [eventoPropuesto({ tipo_evento: null })] })
  assert.equal(textoDeFila(armarAsiento(rechazada)), 'Sin tipo · Escrito')
  assert.equal(etiquetaDeFila(armarAsiento(rechazada)), 'Rechazado')
  assert.equal(etiquetaDeFila(armarAsiento(filaDeCaptura())), '')
})

test('si la vaca cambió se dice dónde se cargó y a cuál se pasó', () => {
  assert.equal(textoCambioDeVaca('A100', 'A127'), 'Se cargó en A100 y se pasó a A127')
  assert.equal(textoCambioDeVaca('A100', 'A100'), '')
})
