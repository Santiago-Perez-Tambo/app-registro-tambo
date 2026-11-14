import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  armarAsiento,
  camposDelTipo,
  camposNoEntendidos,
  capturadoPor,
  datosParaEnviar,
  elegirAsiento,
  estadoDeLaVaca,
  fechaHoraCompleta,
  filtrarAsientos,
  formularioDesdeEvento,
  ordenarAsientos,
  quedanPorConfirmar,
  queFaltaParaConfirmar,
  textoActualizado,
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

test('el detalle lleva la caravana, el tipo, quién capturó, la fecha y el estado de la vaca', () => {
  const asiento = armarAsiento(filaDeCaptura())
  assert.equal(tituloDelDetalle(asiento), 'A100 · Servicio')
  assert.equal(tituloDelDetalle(armarAsiento(filaDeCaptura({ evento: [] }))), 'A100 · Sin interpretar')
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

test('se filtran todos, los propuestos o los sin interpretar', () => {
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, 'todos')), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, 'propuestos')), ['a', 'c', 'd'])
  assert.deepEqual(ids(filtrarAsientos(PARA_ORDENAR, 'sin_interpretar')), ['b'])
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
