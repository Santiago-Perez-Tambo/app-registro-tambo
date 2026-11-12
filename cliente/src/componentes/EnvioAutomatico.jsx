import { useEffect } from 'react'
import { enviarCola, escucharEnvio } from '../cola.js'
import { useSesion } from '../sesion.jsx'
import { useSenal } from './IndicadorSenal.jsx'

function DisparadoresDeEnvio({ idUsuario }) {
  const conSenal = useSenal()

  useEffect(() => {
    if (conSenal) {
      enviarCola(idUsuario, false)
    }
  }, [conSenal, idUsuario])

  useEffect(() => {
    function alVolverAlFrente() {
      if (document.visibilityState === 'visible') {
        enviarCola(idUsuario, false)
      }
    }
    document.addEventListener('visibilitychange', alVolverAlFrente)
    return () => document.removeEventListener('visibilitychange', alVolverAlFrente)
  }, [idUsuario])

  return null
}

function EnvioAutomatico() {
  const { usuario, salirPorSesionVencida } = useSesion()

  useEffect(() => {
    return escucharEnvio((estado) => {
      if (estado.resumen?.sesionVencida) {
        salirPorSesionVencida()
      }
    })
  }, [salirPorSesionVencida])

  if (usuario?.rol !== 'tambero') {
    return null
  }
  return <DisparadoresDeEnvio idUsuario={usuario.id_usuario} />
}

export default EnvioAutomatico
