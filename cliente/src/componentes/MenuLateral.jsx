import { NavLink } from 'react-router-dom'
import Boton from './Boton.jsx'

function claseEnlace({ isActive }) {
  return isActive ? 'enlace-menu enlace-activo' : 'enlace-menu'
}

function MenuLateral() {
  return (
    <nav className="menu-lateral">
      <p className="menu-nombre">Registro Tambo</p>
      <NavLink to="/escritorio/por-confirmar" className={claseEnlace}>Por confirmar</NavLink>
      <NavLink to="/escritorio/avisos" className={claseEnlace}>Avisos</NavLink>
      <NavLink to="/escritorio/rodeo" className={claseEnlace}>Rodeo</NavLink>
      <Boton tipo="secundario">Cerrar sesión</Boton>
    </nav>
  )
}

export default MenuLateral
