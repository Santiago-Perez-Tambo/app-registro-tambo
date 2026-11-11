import { useState } from 'react'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { useSesion } from '../../sesion.jsx'

function Inicio() {
  const { usuario, cerrarSesion } = useSesion()
  const [aviso, cambiarAviso] = useState('')

  async function salir() {
    cambiarAviso(await cerrarSesion())
  }

  return (
    <main className="pantalla pantalla-inicio">
      <Encabezado titulo="Mi tambo" />
      <footer className="pie-usuario">
        <p>{usuario.nombre}, {usuario.rol}</p>
        {aviso && <p className="mensaje-aviso">{aviso}</p>}
        <Boton tipo="secundario" onClick={salir}>Salir</Boton>
      </footer>
    </main>
  )
}

export default Inicio
