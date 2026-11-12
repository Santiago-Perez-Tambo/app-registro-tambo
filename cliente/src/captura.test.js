import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ahoraArgentina,
  avisoSalirConPendientes,
  camposParaEnviar,
  contadorLetras,
  describirCuando,
  describirTipo,
  ordenarDeMasNuevaAMasVieja,
  ordenarPorFechaHora,
  queHacerConLaRespuesta,
  quitarPrefijoBase64,
  resumenDeVuelta,
  sacarLasQueSiguenEnCola,
  siguienteParaEnviar,
  textoFechaCopia,
  textoPendientes,
  validarTexto,
} from './captura.js'

function capturaEnCola(id, fechaHora, cambios) {
  return {
    id_captura: id,
    id_usuario: 2,
    id_animal: 7,
    caravana: 'A100',
    tipo_captura: 'texto',
    texto: 'se sirvió con toro',
    archivo: null,
    fecha_hora: fechaHora,
    estado: 'en_celular',
    ...cambios,
  }
}

test('la captura de las 22:30 en Argentina queda con la fecha de ese día', () => {
  assert.equal(ahoraArgentina(new Date('2026-11-12T01:30:00Z')), '2026-11-11T22:30:00')
  assert.equal(ahoraArgentina(new Date('2026-11-11T11:05:09Z')), '2026-11-11T08:05:09')
  assert.equal(ahoraArgentina(new Date('2026-11-12T03:00:00Z')), '2026-11-12T00:00:00')
})

test('la fecha de la copia del rodeo se muestra en hora argentina de 24 horas', () => {
  assert.equal(textoFechaCopia('2026-11-12T01:30:00.000Z'), 'el 11/11 a las 22:30')
  assert.equal(textoFechaCopia('2026-11-05T11:10:00.000Z'), 'el 05/11 a las 08:10')
})

test('el texto se guarda sin espacios en las puntas, no vacío y hasta 280 letras', () => {
  assert.deepEqual(validarTexto('  se sirvió con toro  '), { texto: 'se sirvió con toro', valido: true })
  assert.deepEqual(validarTexto('   '), { texto: '', valido: false })
  assert.equal(validarTexto('a'.repeat(280)).valido, true)
  assert.equal(validarTexto('a'.repeat(281)).valido, false)
})

test('el contador dice cuántas letras van de 280', () => {
  assert.equal(contadorLetras('a'.repeat(26)), '26 de 280 letras')
  assert.equal(contadorLetras(''), '0 de 280 letras')
})

test('el cuándo dice hoy, ayer o el día y el mes', () => {
  const ahora = '2026-11-11T18:00:00'
  assert.equal(describirCuando('2026-11-11T17:42:10', ahora), 'Hoy 17:42')
  assert.equal(describirCuando('2026-11-10T18:02:00', ahora), 'Ayer 18:02')
  assert.equal(describirCuando('2026-11-05T08:10:00', ahora), '05/11 08:10')
  assert.equal(describirCuando('2026-10-31T23:50:00', '2026-11-01T09:00:00'), 'Ayer 23:50')
  assert.equal(describirCuando('2026-12-31T22:30:00', '2027-01-01T06:00:00'), 'Ayer 22:30')
})

test('el tipo de captura se muestra con palabras', () => {
  assert.equal(describirTipo('texto'), 'Escrito')
  assert.equal(describirTipo('foto'), 'Foto')
})

test('los pendientes se cuentan en singular y en plural', () => {
  assert.equal(textoPendientes(1), '1 registro guardado en el celular')
  assert.equal(textoPendientes(3), '3 registros guardados en el celular')
})

test('el aviso al salir dice cuántos registros quedan sin enviar', () => {
  assert.equal(
    avisoSalirConPendientes(3),
    'Tenés 3 registros sin enviar en este celular. Se envían cuando vuelvas a entrar con señal.',
  )
  assert.equal(
    avisoSalirConPendientes(1),
    'Tenés 1 registro sin enviar en este celular. Se envían cuando vuelvas a entrar con señal.',
  )
})

test('la foto viaja sin el prefijo data del navegador', () => {
  assert.equal(quitarPrefijoBase64('data:image/jpeg;base64,/9j/4AAQ'), '/9j/4AAQ')
  assert.equal(quitarPrefijoBase64('/9j/4AAQ'), '/9j/4AAQ')
})

test('una captura escrita viaja solo con los campos que pide el servidor', () => {
  const captura = capturaEnCola('c1', '2026-11-11T08:15:00', { motivo: 'La foto pasa de 5 MB' })
  assert.deepEqual(camposParaEnviar(captura, null), {
    id_captura: 'c1',
    id_animal: 7,
    tipo_captura: 'texto',
    texto: 'se sirvió con toro',
    fecha_hora: '2026-11-11T08:15:00',
  })
})

test('una foto viaja con el archivo en base64 y su tipo', () => {
  const captura = capturaEnCola('c2', '2026-11-11T08:16:00', {
    tipo_captura: 'foto',
    texto: null,
    archivo: { type: 'image/jpeg' },
  })
  assert.deepEqual(camposParaEnviar(captura, '/9j/4AAQ'), {
    id_captura: 'c2',
    id_animal: 7,
    tipo_captura: 'foto',
    texto: null,
    fecha_hora: '2026-11-11T08:16:00',
    archivo_base64: '/9j/4AAQ',
    tipo_archivo: 'image/jpeg',
  })
})

test('la captura se borra solo cuando el servidor confirma que la recibió', () => {
  assert.deepEqual(queHacerConLaRespuesta(200, { recibida: true }), { accion: 'borrar' })
  assert.deepEqual(queHacerConLaRespuesta(200, { recibida: true, repetida: true }), { accion: 'borrar' })
  assert.deepEqual(queHacerConLaRespuesta(200, {}), { accion: 'cortar' })
  assert.deepEqual(queHacerConLaRespuesta(200, null), { accion: 'cortar' })
})

test('con la sesión rechazada se pide un token nuevo', () => {
  assert.deepEqual(queHacerConLaRespuesta(401, { error: 'Sesión inválida' }), { accion: 'renovarToken' })
})

test('lo que el servidor no acepta queda en la cola con su motivo', () => {
  assert.deepEqual(queHacerConLaRespuesta(400, { error: 'La fecha de la captura no es válida' }), {
    accion: 'guardarMotivo',
    motivo: 'La fecha de la captura no es válida',
  })
  assert.deepEqual(queHacerConLaRespuesta(403, { error: 'Ese animal no es de tu establecimiento' }), {
    accion: 'guardarMotivo',
    motivo: 'Ese animal no es de tu establecimiento',
  })
  assert.deepEqual(queHacerConLaRespuesta(413, null), {
    accion: 'guardarMotivo',
    motivo: 'El servidor no aceptó el registro',
  })
})

test('sin red, con el servidor caído o con una ruta mal escrita se corta la vuelta sin tocar nada', () => {
  for (const status of [0, 500, 502, 503, 404]) {
    assert.deepEqual(queHacerConLaRespuesta(status, null), { accion: 'cortar' })
  }
})

test('la cola se ordena por fecha y hora de la captura', () => {
  const capturas = [
    capturaEnCola('c3', '2026-11-11T09:00:00'),
    capturaEnCola('c1', '2026-11-10T18:30:00'),
    capturaEnCola('c2', '2026-11-11T08:15:00'),
  ]
  assert.deepEqual(ordenarPorFechaHora(capturas).map((captura) => captura.id_captura), ['c1', 'c2', 'c3'])
  assert.equal(capturas[0].id_captura, 'c3')
})

test('en pantalla los registros de hoy quedan arriba de los de ayer', () => {
  const capturas = [
    capturaEnCola('c1', '2026-11-10T18:30:00'),
    capturaEnCola('c3', '2026-11-11T09:00:00'),
    capturaEnCola('c2', '2026-11-11T08:15:00'),
  ]
  assert.deepEqual(ordenarDeMasNuevaAMasVieja(capturas).map((captura) => captura.id_captura), ['c3', 'c2', 'c1'])
  assert.equal(capturas[0].id_captura, 'c1')
})

test('una captura que sigue en la cola no aparece en enviados hoy', () => {
  const enviados = [capturaEnCola('c1', '2026-11-11T08:00:00'), capturaEnCola('c2', '2026-11-11T08:15:00')]
  const pendientes = [capturaEnCola('c2', '2026-11-11T08:15:00'), capturaEnCola('c3', '2026-11-11T09:00:00')]
  assert.deepEqual(sacarLasQueSiguenEnCola(enviados, pendientes).map((captura) => captura.id_captura), ['c1'])
  assert.deepEqual(sacarLasQueSiguenEnCola(enviados, []).map((captura) => captura.id_captura), ['c1', 'c2'])
})

test('la siguiente en salir es la más vieja que no se intentó en esta vuelta', () => {
  const capturas = [capturaEnCola('c2', '2026-11-11T08:15:00'), capturaEnCola('c1', '2026-11-11T08:00:00')]
  assert.equal(siguienteParaEnviar(capturas, new Set(), false).id_captura, 'c1')
  assert.equal(siguienteParaEnviar(capturas, new Set(['c1']), false).id_captura, 'c2')
  assert.equal(siguienteParaEnviar(capturas, new Set(['c1', 'c2']), false), null)
  assert.equal(siguienteParaEnviar([], new Set(), false), null)
})

test('la vuelta automática saltea las que tienen motivo y enviar ahora las incluye', () => {
  const capturas = [
    capturaEnCola('c1', '2026-11-11T08:00:00', { motivo: 'La foto pasa de 5 MB' }),
    capturaEnCola('c2', '2026-11-11T08:15:00'),
  ]
  assert.equal(siguienteParaEnviar(capturas, new Set(), false).id_captura, 'c2')
  assert.equal(siguienteParaEnviar(capturas, new Set(), true).id_captura, 'c1')
})

test('el resumen de la vuelta dice cuántos se enviaron y si se cortó', () => {
  assert.equal(resumenDeVuelta({ enviadas: 3, cortada: false }), 'Se enviaron 3 registros.')
  assert.equal(resumenDeVuelta({ enviadas: 1, cortada: false }), 'Se envió 1 registro.')
  assert.equal(
    resumenDeVuelta({ enviadas: 0, cortada: true }),
    'No se pudo enviar. Se vuelve a intentar solo cuando haya señal.',
  )
  assert.equal(
    resumenDeVuelta({ enviadas: 2, cortada: true }),
    'Se enviaron 2 registros. No se pudo enviar. Se vuelve a intentar solo cuando haya señal.',
  )
  assert.equal(resumenDeVuelta({ enviadas: 0, cortada: false }), '')
})
