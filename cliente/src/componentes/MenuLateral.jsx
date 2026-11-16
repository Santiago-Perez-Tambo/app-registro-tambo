import { NavLink } from 'react-router-dom'
import { useSesion } from '../sesion.jsx'
import BotonSalir from './BotonSalir.jsx'

function claseEnlace({ isActive }) {
  return isActive ? 'enlace-menu enlace-activo' : 'enlace-menu'
}

function MenuLateral({ cantidadPorConfirmar, cantidadAvisos }) {
  const { usuario } = useSesion()

  return (
    <nav className="menu-lateral">
      <p className="menu-nombre">Mi tambo</p>
      <div className="enlaces-menu">
        <NavLink to="/celular" className={claseEnlace}>Registrar</NavLink>
        <NavLink to="/escritorio/por-confirmar" className={claseEnlace}>
          Por confirmar
          {cantidadPorConfirmar > 0 && <span className="cantidad-menu">{cantidadPorConfirmar}</span>}
        </NavLink>
        <NavLink to="/escritorio/avisos" className={claseEnlace}>
          Avisos
          {cantidadAvisos > 0 && <span className="cantidad-menu">{cantidadAvisos}</span>}
        </NavLink>
        <NavLink to="/escritorio/rodeo" className={claseEnlace}>Rodeo</NavLink>
      </div>
      <div className="pie-usuario">
        <p className="nombre-usuario">{usuario.nombre}, {usuario.rol}</p>
        <BotonSalir tipo="secundario" />
      </div>
    </nav>
  )
}

export default MenuLateral
