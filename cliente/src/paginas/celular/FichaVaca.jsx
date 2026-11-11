import { useParams } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'

function FichaVaca() {
  const { caravana } = useParams()

  return (
    <main className="pantalla">
      <Encabezado titulo={`Vaca ${caravana}`} />
    </main>
  )
}

export default FichaVaca
