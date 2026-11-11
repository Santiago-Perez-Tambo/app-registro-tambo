import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { buscarPorCaravana, mostrarPalabra } from '../../animal.js'
import { actualizarRodeo, textoFechaCopia } from '../../cola.js'
import { puedeEntrar } from '../../permisos.js'
import { useSesion } from '../../sesion.jsx'

const FILTROS = [
  { nombre: 'Todas', categoria: '' },
  { nombre: 'En ordeñe', categoria: 'vaca en ordeñe' },
  { nombre: 'Secas', categoria: 'vaca seca' },
  { nombre: 'Vaquillonas', categoria: 'vaquillona' },
  { nombre: 'Terneras', categoria: 'ternera' },
]

function filtrarPorCategoria(animales, categoria) {
  return animales.filter((animal) => !categoria || animal.categoria === categoria)
}

function avisoDeCopia(copia) {
  if (copia.actualizada) {
    return ''
  }
  if (copia.fechaCopia) {
    return `No se pudo traer el rodeo. Se muestra el guardado ${textoFechaCopia(copia.fechaCopia)}.`
  }
  return 'No se pudo traer el rodeo. Revisá la conexión y probá de nuevo.'
}

function TablaRodeo({ animales }) {
  if (animales.length === 0) {
    return <p className="mensaje-aviso">Ningún animal coincide con la búsqueda.</p>
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Caravana</th>
          <th>Categoría</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {animales.map((animal) => (
          <tr key={animal.caravana}>
            <td>
              <Link to={`/escritorio/vaca/${encodeURIComponent(animal.caravana)}`} className="enlace-caravana">
                {animal.caravana}
              </Link>
            </td>
            <td>{mostrarPalabra(animal.categoria)}</td>
            <td>{mostrarPalabra(animal.estado_reproductivo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Rodeo() {
  const { usuario } = useSesion()
  const [animales, cambiarAnimales] = useState([])
  const [cargando, cambiarCargando] = useState(true)
  const [texto, cambiarTexto] = useState('')
  const [categoria, cambiarCategoria] = useState('')
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarRodeo()
  }, [])

  async function cargarRodeo() {
    try {
      const copia = await actualizarRodeo()
      cambiarAnimales(copia.animales)
      cambiarAviso(avisoDeCopia(copia))
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer el rodeo. Probá de nuevo.')
    } finally {
      cambiarCargando(false)
    }
  }

  const visibles = buscarPorCaravana(filtrarPorCategoria(animales, categoria), texto)
  const titulo = cargando ? 'Rodeo' : `Rodeo · ${animales.length} animales`

  return (
    <main className="pantalla">
      <Encabezado titulo={titulo} />
      <div className="barra-rodeo">
        <label className="campo">
          Buscar caravana
          <input type="text" value={texto} onChange={(evento) => cambiarTexto(evento.target.value)} autoComplete="off" />
        </label>
        {puedeEntrar(usuario.rol, '/escritorio/rodeo/nuevo') && (
          <Link to="/escritorio/rodeo/nuevo" className="boton boton-principal">Nuevo animal</Link>
        )}
      </div>
      <div className="filtros">
        {FILTROS.map((filtro) => (
          <Boton
            key={filtro.nombre}
            tipo={filtro.categoria === categoria ? 'destacado' : 'secundario'}
            aria-pressed={filtro.categoria === categoria}
            onClick={() => cambiarCategoria(filtro.categoria)}
          >
            {filtro.nombre} ({filtrarPorCategoria(animales, filtro.categoria).length})
          </Boton>
        ))}
      </div>
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {cargando ? <p className="cargando">Cargando el rodeo</p> : <TablaRodeo animales={visibles} />}
    </main>
  )
}

export default Rodeo
