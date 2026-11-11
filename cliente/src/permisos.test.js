import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pantallaInicial, puedeEntrar } from './permisos.js'

test('el tambero no entra a por confirmar', () => {
  assert.equal(puedeEntrar('tambero', '/escritorio/por-confirmar'), false)
  assert.equal(puedeEntrar('tambero', '/Escritorio/Por-Confirmar/'), false)
})

test('el tambero entra a las pantallas del celular', () => {
  assert.equal(puedeEntrar('tambero', '/celular'), true)
  assert.equal(puedeEntrar('tambero', '/celular/capturar'), true)
})

test('el propietario y el asesor entran a por confirmar', () => {
  assert.equal(puedeEntrar('propietario', '/escritorio/por-confirmar'), true)
  assert.equal(puedeEntrar('asesor', '/escritorio/por-confirmar'), true)
})

test('el propietario y el asesor no entran a las pantallas del celular', () => {
  assert.equal(puedeEntrar('propietario', '/celular'), false)
  assert.equal(puedeEntrar('asesor', '/celular/capturar'), false)
})

test('el asesor no entra al alta de animal', () => {
  assert.equal(puedeEntrar('asesor', '/escritorio/rodeo/nuevo'), false)
  assert.equal(puedeEntrar('asesor', '/escritorio/rodeo/nuevo/'), false)
  assert.equal(puedeEntrar('asesor', '/Escritorio/Rodeo/Nuevo'), false)
  assert.equal(puedeEntrar('asesor', '/escritorio/rodeo'), true)
})

test('el propietario entra al alta de animal', () => {
  assert.equal(puedeEntrar('propietario', '/escritorio/rodeo/nuevo'), true)
})

test('sin rol no se entra a ninguna pantalla', () => {
  for (const rol of [undefined, null, '', 'visitante']) {
    assert.equal(puedeEntrar(rol, '/celular'), false)
    assert.equal(puedeEntrar(rol, '/escritorio/por-confirmar'), false)
    assert.equal(pantallaInicial(rol), null)
  }
})

test('cada rol empieza en su pantalla', () => {
  assert.equal(pantallaInicial('tambero'), '/celular')
  assert.equal(pantallaInicial('propietario'), '/escritorio/por-confirmar')
  assert.equal(pantallaInicial('asesor'), '/escritorio/por-confirmar')
})
