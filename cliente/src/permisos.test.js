import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pantallaInicial, puedeCapturar, puedeEntrar, puedeRevisar, rolHabilitado } from './permisos.js'

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

test('los tres roles que capturan entran a las pantallas del celular', () => {
  for (const rol of ['tambero', 'propietario', 'asesor']) {
    assert.equal(puedeEntrar(rol, '/celular'), true)
    assert.equal(puedeEntrar(rol, '/celular/vaca/A100'), true)
    assert.equal(puedeEntrar(rol, '/celular/vaca/A100/escribir'), true)
    assert.equal(puedeEntrar(rol, '/celular/vaca/A100/foto'), true)
  }
})

test('el propietario y el asesor entran a los registros guardados', () => {
  assert.equal(puedeEntrar('propietario', '/celular/guardados'), true)
  assert.equal(puedeEntrar('asesor', '/celular/guardados'), true)
  assert.equal(puedeEntrar('tambero', '/celular/guardados'), true)
})

test('el tambero no entra a ninguna pantalla de la pc', () => {
  for (const ruta of ['/escritorio', '/escritorio/avisos', '/escritorio/rodeo', '/escritorio/rodeo/nuevo', '/escritorio/vaca/A100']) {
    assert.equal(puedeEntrar('tambero', ruta), false)
  }
})

test('una ruta que no es del celular ni de la pc no se abre', () => {
  assert.equal(puedeEntrar('propietario', '/otra'), false)
  assert.equal(puedeEntrar('propietario', '/celularx'), false)
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
    assert.equal(pantallaInicial(rol, 1280), null)
    assert.equal(rolHabilitado(rol), false)
  }
})

test('los tres roles están habilitados', () => {
  for (const rol of ['tambero', 'propietario', 'asesor']) {
    assert.equal(rolHabilitado(rol), true)
  }
})

test('con 390 px de ancho los tres roles empiezan en el celular', () => {
  assert.equal(pantallaInicial('tambero', 390), '/celular')
  assert.equal(pantallaInicial('propietario', 390), '/celular')
  assert.equal(pantallaInicial('asesor', 390), '/celular')
})

test('con 1280 px de ancho el tambero empieza en el celular y los demás en por confirmar', () => {
  assert.equal(pantallaInicial('tambero', 1280), '/celular')
  assert.equal(pantallaInicial('propietario', 1280), '/escritorio/por-confirmar')
  assert.equal(pantallaInicial('asesor', 1280), '/escritorio/por-confirmar')
})

test('el corte entre celular y pc está en 800 px', () => {
  assert.equal(pantallaInicial('propietario', 799), '/celular')
  assert.equal(pantallaInicial('propietario', 800), '/escritorio/por-confirmar')
})

test('solo los tres roles capturan', () => {
  for (const rol of ['tambero', 'propietario', 'asesor']) {
    assert.equal(puedeCapturar(rol), true)
  }
  assert.equal(puedeCapturar('visitante'), false)
  assert.equal(puedeCapturar(undefined), false)
})
