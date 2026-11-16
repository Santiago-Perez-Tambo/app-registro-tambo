import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import IndicadorSenal from './IndicadorSenal.jsx'

function Encabezado({ titulo, volver }) {
  const { pathname, state } = useLocation()
  const navegar = useNavigate()
  const [aviso, cambiarAviso] = useState(state?.aviso)

  useEffect(() => {
    if (state?.aviso) {
      cambiarAviso(state.aviso)
      navegar(pathname, { replace: true })
    }
  }, [state, pathname, navegar])

  return (
    <header className={titulo ? 'encabezado' : 'encabezado encabezado-sin-titulo'}>
      {volver && <Link to={volver} className="boton boton-secundario boton-volver">Volver</Link>}
      {titulo && <h1>{titulo}</h1>}
      <IndicadorSenal />
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
    </header>
  )
}

export default Encabezado
