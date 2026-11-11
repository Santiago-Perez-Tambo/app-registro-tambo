import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { pantallaInicial } from './permisos.js'
import { buscarFilaUsuario, entrarConCorreo, escucharCambiosDeSesion, salirDeSupabase } from './supabase.js'

const ContextoSesion = createContext(null)
const CLAVE_USUARIO = 'usuario'

function leerUsuarioGuardado() {
  try {
    const usuario = JSON.parse(localStorage.getItem(CLAVE_USUARIO))
    return pantallaInicial(usuario?.rol) ? usuario : null
  } catch (error) {
    console.error(error)
    return null
  }
}

function guardarUsuario(usuario) {
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}

function borrarUsuarioGuardado() {
  localStorage.removeItem(CLAVE_USUARIO)
}

export function SesionProveedor({ children }) {
  const [sesion, cambiarSesion] = useState(null)
  const [sesionLeida, cambiarSesionLeida] = useState(false)
  const [usuario, cambiarUsuario] = useState(leerUsuarioGuardado)
  const [buscandoUsuario, cambiarBuscandoUsuario] = useState(false)
  const [aviso, cambiarAviso] = useState('')
  const token = sesion?.access_token
  const idAuth = sesion?.user.id

  useEffect(() => {
    return escucharCambiosDeSesion((evento, nuevaSesion) => {
      cambiarSesion(nuevaSesion)
      cambiarSesionLeida(true)
      if (evento === 'SIGNED_OUT') {
        borrarUsuarioGuardado()
        cambiarUsuario(null)
      }
    })
  }, [])

  useEffect(() => {
    if (token) {
      traerUsuario(idAuth)
    }
  }, [token, idAuth])

  async function traerUsuario(idDeAuth) {
    cambiarBuscandoUsuario(true)
    try {
      const fila = await buscarFilaUsuario(idDeAuth)
      if (fila && pantallaInicial(fila.rol)) {
        guardarUsuario(fila)
        cambiarUsuario(fila)
      } else {
        await negarIngreso()
      }
    } catch (error) {
      console.error(error)
      if (!leerUsuarioGuardado()) {
        cambiarAviso('No se pudo conectar. Probá de nuevo.')
      }
    } finally {
      cambiarBuscandoUsuario(false)
    }
  }

  async function negarIngreso() {
    try {
      await salirDeSupabase()
    } catch (error) {
      console.error(error)
    }
    borrarUsuarioGuardado()
    cambiarUsuario(null)
    cambiarAviso('Tu usuario no está habilitado en el establecimiento')
  }

  async function iniciarSesion(correo, contrasena) {
    cambiarAviso('')
    try {
      await entrarConCorreo(correo, contrasena)
    } catch (error) {
      console.error(error)
      if (isAuthRetryableFetchError(error)) {
        cambiarAviso('No se pudo entrar. Revisá la señal y probá de nuevo.')
      } else {
        cambiarAviso('Correo o contraseña incorrectos')
      }
    }
  }

  async function cerrarSesion() {
    try {
      await salirDeSupabase()
      return ''
    } catch (error) {
      console.error(error)
      return 'Para cerrar sesión hace falta señal'
    }
  }

  const cargando = !usuario && (!sesionLeida || buscandoUsuario)
  if (cargando) {
    return <p className="cargando">Cargando</p>
  }

  return (
    <ContextoSesion.Provider value={{ usuario, aviso, iniciarSesion, cerrarSesion }}>
      {children}
    </ContextoSesion.Provider>
  )
}

export function useSesion() {
  return useContext(ContextoSesion)
}
