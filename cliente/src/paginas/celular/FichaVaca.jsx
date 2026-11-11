import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'
import { mostrarPalabra, normalizarCaravana } from '../../animal.js'
import { buscarVacaEnCopia, recordarVaca } from '../../cola.js'

function enlaceCaptura(caravana, modo) {
  return `/celular/vaca/${encodeURIComponent(caravana)}/${modo}`
}

function DatosVaca({ animal }) {
  return (
    <>
      <p className="etiquetas">
        <span className="etiqueta">{mostrarPalabra(animal.categoria)}</span>
        <span className="etiqueta">{mostrarPalabra(animal.estado_reproductivo)}</span>
      </p>
      <div className="botones-captura">
        <Link to={enlaceCaptura(animal.caravana, 'foto')} className="boton boton-principal boton-captura">Foto</Link>
        <Link to={enlaceCaptura(animal.caravana, 'escribir')} className="boton boton-principal boton-captura">
          Escribir
        </Link>
      </div>
    </>
  )
}

function FichaVaca() {
  const { caravana } = useParams()
  const caravanaBuscada = normalizarCaravana(caravana)
  const [animal, cambiarAnimal] = useState(null)
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    buscarVaca(caravanaBuscada)
  }, [caravanaBuscada])

  async function buscarVaca(buscada) {
    cambiarCargando(true)
    cambiarAviso('')
    try {
      const encontrado = await buscarVacaEnCopia(buscada)
      cambiarAnimal(encontrado)
      if (encontrado) {
        recordarVaca(buscada)
      } else {
        cambiarAviso(`La caravana ${buscada} no está en el rodeo`)
      }
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer el rodeo guardado en el celular.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla ficha">
      <Encabezado titulo={caravanaBuscada} volver="/celular" />
      {cargando && <p className="cargando">Cargando</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {animal && <DatosVaca animal={animal} />}
    </main>
  )
}

export default FichaVaca
