import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buscarPorCaravana,
  formatearFecha,
  mensajeCaravanaRepetida,
  mostrarPalabra,
  normalizarCaravana,
  validarAlta,
} from './animal.js'

test('la caravana se guarda sin espacios en las puntas y en mayúsculas', () => {
  assert.equal(normalizarCaravana('  a100 '), 'A100')
  assert.equal(normalizarCaravana('A100'), 'A100')
  assert.equal(normalizarCaravana(undefined), '')
})

test('el alta pide caravana y categoría, y nada más es obligatorio', () => {
  assert.equal(validarAlta({ caravana: '  ', categoria: 'ternera' }), 'Escribí la caravana.')
  assert.equal(validarAlta({ caravana: 'A183', categoria: '' }), 'Elegí la categoría.')
  assert.equal(validarAlta({ caravana: 'A183', categoria: 'toro' }), 'Elegí la categoría.')
  assert.equal(validarAlta({ caravana: 'A183', categoria: 'ternera' }), '')
  assert.equal(validarAlta({ caravana: 'A183', categoria: 'ternera', estado_reproductivo: '' }), '')
})

test('el alta rechaza un estado fuera de la lista y una madre igual a la cría', () => {
  assert.equal(
    validarAlta({ caravana: 'A183', categoria: 'vaquillona', estado_reproductivo: 'gestando' }),
    'Elegí un estado reproductivo de la lista.',
  )
  assert.equal(
    validarAlta({ caravana: 'A183', categoria: 'ternera', madre: ' a183' }),
    'La madre no puede ser el mismo animal.',
  )
  assert.equal(validarAlta({ caravana: 'A183', categoria: 'ternera', madre: 'A011' }), '')
})

test('el aviso de caravana repetida nombra la caravana', () => {
  assert.equal(mensajeCaravanaRepetida('A100'), 'La caravana A100 ya está en el rodeo. Revisá el número.')
})

test('la fecha de la base se muestra en día, mes y año sin correrse un día', () => {
  assert.equal(formatearFecha('2026-11-11'), '11/11/2026')
  assert.equal(formatearFecha('2026-08-01'), '01/08/2026')
  assert.equal(formatearFecha(null), '-')
})

test('las palabras de la base se muestran con mayúscula inicial y el vacío como guion', () => {
  assert.equal(mostrarPalabra('vaca en ordeñe'), 'Vaca en ordeñe')
  assert.equal(mostrarPalabra('vacía'), 'Vacía')
  assert.equal(mostrarPalabra(null), '-')
})

test('la búsqueda encuentra la caravana por una parte escrita de cualquier forma', () => {
  const animales = [{ caravana: 'A100' }, { caravana: 'A183' }, { caravana: 'B200' }]
  assert.deepEqual(buscarPorCaravana(animales, '100'), [{ caravana: 'A100' }])
  assert.deepEqual(buscarPorCaravana(animales, ' a1'), [{ caravana: 'A100' }, { caravana: 'A183' }])
  assert.deepEqual(buscarPorCaravana(animales, 'Z9'), [])
  assert.equal(buscarPorCaravana(animales, '').length, 3)
})
