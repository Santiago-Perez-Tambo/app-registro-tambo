export const CATEGORIAS = ['ternera', 'vaquillona', 'vaca en ordeñe', 'vaca seca']
export const ESTADOS = ['vacía', 'servida sin tacto', 'preñada']
const LARGO_MAXIMO_CARAVANA = 20
const CODIGO_DATO_REPETIDO = '23505'

export function normalizarCaravana(texto) {
  return (texto ?? '').trim().toUpperCase()
}

export function validarAlta(datos) {
  const caravana = normalizarCaravana(datos.caravana)
  if (!caravana) {
    return 'Escribí la caravana.'
  }
  if (caravana.length > LARGO_MAXIMO_CARAVANA) {
    return `La caravana puede tener hasta ${LARGO_MAXIMO_CARAVANA} caracteres.`
  }
  if (!CATEGORIAS.includes(datos.categoria)) {
    return 'Elegí la categoría.'
  }
  if (datos.estado_reproductivo && !ESTADOS.includes(datos.estado_reproductivo)) {
    return 'Elegí un estado reproductivo de la lista.'
  }
  if (normalizarCaravana(datos.madre) === caravana) {
    return 'La madre no puede ser el mismo animal.'
  }
  return ''
}

export function esCaravanaRepetida(error) {
  return error?.code === CODIGO_DATO_REPETIDO
}

export function mensajeCaravanaRepetida(caravana) {
  return `La caravana ${caravana} ya está en el rodeo. Revisá el número.`
}

export function formatearFecha(texto) {
  if (!texto) {
    return '-'
  }
  const [anio, mes, dia] = texto.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function mostrarPalabra(valor) {
  if (!valor) {
    return '-'
  }
  return valor[0].toUpperCase() + valor.slice(1)
}

export function buscarPorCaravana(animales, texto) {
  const buscado = normalizarCaravana(texto)
  return animales.filter((animal) => animal.caravana.includes(buscado))
}
