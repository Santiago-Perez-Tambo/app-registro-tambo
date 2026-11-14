import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pantallaInicial, puedeEntrar, puedeRevisar } from './permisos.js'

test('el propietario revisa cualquier asiento y el asesor solo los que cargó él', () => {
  assert.equal(puedeRevisar({ id_usuario: 1, rol: 'propietario' }, { id_usuario: 2 }), true)
  assert.equal(puedeRevisar({ id_usuario: 3, rol: 'asesor' }, { id_usuario: 3 }), true)
  assert.equal(puedeRevisar({ id_usuario: 3, rol: 'asesor' }, { id_usuario: 2 }), false)
  assert.equal(puedeRevisar({ id_usuario: 2, rol: 'tambero' }, { id_usuario: 2 }), false)
})

test('el tambero no entra a por confirmar', () => {
  assert.equal(puedeEntrar('tambero', '/escritorio/por-confirmar'), false)
  assert.equal(puedeEntrar('tambero', '/Escritorio/Por-Confirmar/'), false)
})

test('el tambero entra a las pantallas del celular', () => {
  assert.equal(puedeEntrar('tambero', '/celular'), true)
  assert.equal(puedeEntrar('tambero', '/celular/vaca/A100/escribir'), true)
})

test('el propietario y el asesor entran a por confirmar', () => {
  assert.equal(puedeEntrar('propietario', '/escritorio/por-confirmar'), true)
  assert.equal(puedeEntrar('asesor', '/escritorio/por-confirmar'), true)
})

test('el propietario y el asesor no entran a las pantallas del celular', () => {
  assert.equal(puedeEntrar('propietario', '/celular'), false)
  assert.equal(puedeEntrar('asesor', '/celular/vaca/A100/foto'), false)
})

test('el propietario y el asesor no entran a los registros guardados', () => {
  assert.equal(puedeEntrar('propietario', '/celular/guardados'), false)
  assert.equal(puedeEntrar('asesor', '/celular/guardados'), false)
  assert.equal(puedeEntrar('tambero', '/celular/guardados'), true)
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
