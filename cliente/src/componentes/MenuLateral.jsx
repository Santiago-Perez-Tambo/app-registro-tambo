import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSesion } from '../sesion.jsx'
import Boton from './Boton.jsx'

function claseEnlace({ isActive }) {
  return isActive ? 'enlace-menu enlace-activo' : 'enlace-menu'
}

function MenuLateral() {
  const { usuario, cerrarSesion } = useSesion()
  const [aviso, cambiarAviso] = useState('')

  async function salir() {
    cambiarAviso(await cerrarSesion())
  }

  return (
    <nav className="menu-lateral">
      <p className="menu-nombre">Mi tambo</p>
      <NavLink to="/escritorio/por-confirmar" className={claseEnlace}>Por confirmar</NavLink>
      <NavLink to="/escritorio/avisos" className={claseEnlace}>Avisos</NavLink>
      <NavLink to="/escritorio/rodeo" className={claseEnlace}>Rodeo</NavLink>
      <div className="pie-usuario">
        <p>{usuario.nombre}, {usuario.rol}</p>
        {aviso && <p className="mensaje-aviso">{aviso}</p>}
        <Boton tipo="secundario" onClick={salir}>Salir</Boton>
      </div>
    </nav>
  )
}

export default MenuLateral
