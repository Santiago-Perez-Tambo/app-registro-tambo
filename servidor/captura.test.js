import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ahoraArgentina,
  validarCaptura,
  rutaDelArchivo,
  esArchivoRepetido,
  esCapturaRepetida,
  puedeCapturar,
  esTokenRechazado,
} from './captura.js'

const ID_CAPTURA = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b'
const UNA_HORA = 60 * 60 * 1000

function dentroDe(milisegundos) {
  return ahoraArgentina(new Date(Date.now() + milisegundos))
}

function capturaDeTexto(cambios) {
  return {
    id_captura: ID_CAPTURA,
    id_animal: 7,
    tipo_captura: 'texto',
    texto: 'La 1234 está en celo',
    fecha_hora: '2026-11-11T08:15:00',
    ...cambios,
  }
}

function fotoJpeg(tamano) {
  const foto = Buffer.alloc(tamano)
  foto.set([0xff, 0xd8, 0xff])
  return foto.toString('base64')
}

function capturaDeFoto(cambios) {
  return capturaDeTexto({
    tipo_captura: 'foto',
    texto: null,
    archivo_base64: fotoJpeg(100),
    tipo_archivo: 'image/jpeg',
    ...cambios,
  })
}

test('ahoraArgentina da la hora de Córdoba en 24 horas', () => {
  assert.equal(ahoraArgentina(new Date('2026-11-11T17:05:09Z')), '2026-11-11T14:05:09')
})

test('una captura de texto correcta no tiene error', () => {
  assert.equal(validarCaptura(capturaDeTexto()), null)
})

test('una captura de foto correcta no tiene error', () => {
  assert.equal(validarCaptura(capturaDeFoto()), null)
})

test('un identificador que no es UUID se rechaza', () => {
  assert.equal(
    validarCaptura(capturaDeTexto({ id_captura: '123' })),
    'El identificador de la captura no es válido',
  )
})

test('una captura sin animal se rechaza', () => {
  assert.equal(validarCaptura(capturaDeTexto({ id_animal: '7' })), 'Falta el animal de la captura')
})

test('una fecha con otra forma se rechaza', () => {
  assert.equal(
    validarCaptura(capturaDeTexto({ fecha_hora: '11/11/2026 08:15' })),
    'La fecha de la captura no es válida',
  )
})

test('una fecha que no existe en el calendario o en el reloj se rechaza', () => {
  for (const fecha of ['2026-02-30T08:15:00', '2026-13-01T08:15:00', '2026-11-11T25:00:00', '2026-11-11T08:60:00']) {
    assert.equal(validarCaptura(capturaDeTexto({ fecha_hora: fecha })), 'La fecha de la captura no es válida')
  }
})

test('una fecha de más de un día adelantada se rechaza', () => {
  assert.equal(
    validarCaptura(capturaDeTexto({ fecha_hora: dentroDe(25 * UNA_HORA) })),
    'La fecha de la captura está adelantada. Revisá la hora del celular.',
  )
})

test('una fecha adelantada menos de un día por el reloj del celular se acepta', () => {
  assert.equal(validarCaptura(capturaDeTexto({ fecha_hora: dentroDe(23 * UNA_HORA) })), null)
  assert.equal(validarCaptura(capturaDeTexto({ fecha_hora: dentroDe(0) })), null)
})

test('el tambero, el propietario y el asesor pueden capturar', () => {
  assert.equal(puedeCapturar('tambero'), true)
  assert.equal(puedeCapturar('propietario'), true)
  assert.equal(puedeCapturar('asesor'), true)
})

test('un rol vacío o desconocido no puede capturar', () => {
  for (const rol of [undefined, null, '', 'visitante', 'Tambero']) {
    assert.equal(puedeCapturar(rol), false)
  }
})

test('un token que Supabase rechaza se reconoce como rechazado', () => {
  assert.equal(esTokenRechazado({ status: 401 }), true)
  assert.equal(esTokenRechazado({ status: 403 }), true)
})

test('un error sin status o de Supabase caído no es un token rechazado', () => {
  assert.equal(esTokenRechazado({}), false)
  assert.equal(esTokenRechazado({ status: 0 }), false)
  assert.equal(esTokenRechazado({ status: 500 }), false)
  assert.equal(esTokenRechazado({ status: 503 }), false)
})

test('un tipo de captura desconocido se rechaza', () => {
  assert.equal(validarCaptura(capturaDeTexto({ tipo_captura: 'video' })), 'El tipo de captura no es válido')
})

test('un texto vacío se rechaza', () => {
  assert.equal(validarCaptura(capturaDeTexto({ texto: '   ' })), 'El texto está vacío')
})

test('un texto de más de 280 letras se rechaza', () => {
  assert.equal(validarCaptura(capturaDeTexto({ texto: 'a'.repeat(281) })), 'El texto pasa de 280 letras')
})

test('una foto que no es jpeg se rechaza', () => {
  assert.equal(validarCaptura(capturaDeFoto({ tipo_archivo: 'image/png' })), 'La foto tiene que ser JPEG')
})

test('una foto declarada jpeg que por dentro no lo es se rechaza', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).toString('base64')
  assert.equal(validarCaptura(capturaDeFoto({ archivo_base64: png })), 'La foto tiene que ser JPEG')
})

test('una foto de más de 5 MB se rechaza', () => {
  const fotoGrande = fotoJpeg(5 * 1024 * 1024 + 1)
  assert.equal(validarCaptura(capturaDeFoto({ archivo_base64: fotoGrande })), 'La foto pasa de 5 MB')
})

test('la ruta del archivo va en la carpeta del establecimiento', () => {
  assert.equal(rutaDelArchivo(1, ID_CAPTURA), `1/${ID_CAPTURA}.jpg`)
})

test('un archivo que ya existe en Storage se reconoce como repetido', () => {
  assert.equal(esArchivoRepetido({ statusCode: '409' }), true)
  assert.equal(esArchivoRepetido({ statusCode: '403' }), false)
})

test('una clave repetida en la base se reconoce como captura repetida', () => {
  assert.equal(esCapturaRepetida({ code: '23505' }), true)
  assert.equal(esCapturaRepetida({ code: '23503' }), false)
})
