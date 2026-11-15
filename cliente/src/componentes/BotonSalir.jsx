import { useState } from 'react'
import { avisoSalirConPendientes } from '../captura.js'
import { contarPendientes } from '../cola.js'
import { useSesion } from '../sesion.jsx'
import Boton from './Boton.jsx'

function BotonSalir({ tipo }) {
  const { usuario, cerrarSesion } = useSesion()
  const [salirIgual, cambiarSalirIgual] = useState(false)
  const [aviso, cambiarAviso] = useState('')

  async function salir() {
    try {
      const pendientes = await contarPendientes(usuario.id_usuario)
      if (pendientes > 0 && !salirIgual) {
        cambiarAviso(avisoSalirConPendientes(pendientes))
        cambiarSalirIgual(true)
        return
      }
    } catch (error) {
      console.error(error)
    }
    cambiarAviso(await cerrarSesion())
  }

  return (
    <>
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <Boton tipo={tipo} onClick={salir}>{salirIgual ? 'Salir igual' : 'Salir'}</Boton>
    </>
  )
}

export default BotonSalir
