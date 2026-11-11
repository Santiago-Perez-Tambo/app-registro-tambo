import { useParams } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'

function Historia() {
  const { caravana } = useParams()

  return (
    <main className="pantalla">
      <Encabezado titulo={`Historia de la vaca ${caravana}`} />
    </main>
  )
}

export default Historia
