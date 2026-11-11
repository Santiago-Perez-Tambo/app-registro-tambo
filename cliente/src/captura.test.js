import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ahoraArgentina,
  avisoSalirConPendientes,
  contadorLetras,
  describirCuando,
  describirTipo,
  textoFechaCopia,
  textoPendientes,
  validarTexto,
} from './captura.js'

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
