import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import IndicadorSenal from './IndicadorSenal.jsx'

function Encabezado({ titulo, volver }) {
  const { pathname, state } = useLocation()
  const navegar = useNavigate()
  const [aviso] = useState(state?.aviso)

  useEffect(() => {
    if (state?.aviso) {
      navegar(pathname, { replace: true })
    }
  }, [state, pathname, navegar])

  return (
    <header className="encabezado">
      {volver && <Link to={volver} className="boton boton-secundario boton-volver">Volver</Link>}
      <h1>{titulo}</h1>
      <IndicadorSenal />
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
    </header>
  )
}

export default Encabezado
