import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import IndicadorSenal from './IndicadorSenal.jsx'

function Encabezado({ titulo }) {
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
      <h1>{titulo}</h1>
      <IndicadorSenal />
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
    </header>
  )
}

export default Encabezado
