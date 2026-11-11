import IndicadorSenal from './IndicadorSenal.jsx'

function Encabezado({ titulo }) {
  return (
    <header className="encabezado">
      <h1>{titulo}</h1>
      <IndicadorSenal />
    </header>
  )
}

export default Encabezado
