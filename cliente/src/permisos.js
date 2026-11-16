const ROLES_QUE_CAPTURAN = ['tambero', 'propietario', 'asesor']
const ROLES_QUE_CONSULTAN = ['propietario', 'asesor']
const ANCHO_CELULAR = 800
const ZONA_CELULAR = '/celular'
const ZONA_ESCRITORIO = '/escritorio'
const INICIO_ESCRITORIO = '/escritorio/por-confirmar'
const PROHIBIDAS_POR_ROL = {
  asesor: ['/escritorio/rodeo/nuevo'],
}

export function puedeCapturar(rol) {
  return ROLES_QUE_CAPTURAN.includes(rol)
}

function puedeConsultar(rol) {
  return ROLES_QUE_CONSULTAN.includes(rol)
}

export function puedeRegistrarDesdeEscritorio(rol) {
  return puedeCapturar(rol) && puedeConsultar(rol)
}

export function rolHabilitado(rol) {
  return puedeCapturar(rol) || puedeConsultar(rol)
}

export function puedeRevisar(usuario, asiento) {
  if (usuario.rol === 'propietario') {
    return true
  }
  return usuario.rol === 'asesor' && asiento.id_usuario === usuario.id_usuario
}

export function pantallaInicial(rol, ancho) {
  if (!rolHabilitado(rol)) {
    return null
  }
  if (puedeConsultar(rol) && ancho >= ANCHO_CELULAR) {
    return INICIO_ESCRITORIO
  }
  return ZONA_CELULAR
}

function estaEnLaZona(ruta, zona) {
  return ruta === zona || ruta.startsWith(`${zona}/`)
}

export function puedeEntrar(rol, ruta) {
  const rutaLimpia = ruta.toLowerCase().replace(/\/+$/, '')
  if (estaEnLaZona(rutaLimpia, ZONA_CELULAR)) {
    return puedeCapturar(rol)
  }
  if (estaEnLaZona(rutaLimpia, ZONA_ESCRITORIO)) {
    const prohibidas = PROHIBIDAS_POR_ROL[rol] ?? []
    return puedeConsultar(rol) && !prohibidas.includes(rutaLimpia)
  }
  return false
}
