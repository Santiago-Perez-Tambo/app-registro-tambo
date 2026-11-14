const permisosPorRol = {
  tambero: {
    inicio: '/celular',
    zona: '/celular',
    prohibidas: [],
  },
  propietario: {
    inicio: '/escritorio/por-confirmar',
    zona: '/escritorio',
    prohibidas: [],
  },
  asesor: {
    inicio: '/escritorio/por-confirmar',
    zona: '/escritorio',
    prohibidas: ['/escritorio/rodeo/nuevo'],
  },
}

export function puedeRevisar(usuario, asiento) {
  if (usuario.rol === 'propietario') {
    return true
  }
  return usuario.rol === 'asesor' && asiento.id_usuario === usuario.id_usuario
}

export function pantallaInicial(rol) {
  return permisosPorRol[rol]?.inicio ?? null
}

export function puedeEntrar(rol, ruta) {
  const permisos = permisosPorRol[rol]
  if (!permisos) {
    return false
  }
  const rutaLimpia = ruta.toLowerCase().replace(/\/+$/, '')
  const dentroDeSuZona = rutaLimpia === permisos.zona || rutaLimpia.startsWith(`${permisos.zona}/`)
  return dentroDeSuZona && !permisos.prohibidas.includes(rutaLimpia)
}
