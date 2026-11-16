import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { contarPorTipo, hoyArgentina, nombreDelAviso, textoCuando } from '../../historia.js'
import { leerAvisosDelRodeo } from '../../supabase.js'

function enlaceDeLaVaca(zona, caravana) {
  return `/${zona}/vaca/${encodeURIComponent(caravana)}`
}

function EtiquetasDeAvisos({ avisos, tipoElegido, alElegir }) {
  return (
    <div className="filtros">
      {contarPorTipo(avisos).map(({ tipo, nombre, cantidad }) => (
        <Boton
          key={tipo}
          tipo={tipo === tipoElegido ? 'destacado' : 'secundario'}
          aria-pressed={tipo === tipoElegido}
          onClick={() => alElegir(tipo === tipoElegido ? '' : tipo)}
        >
          {nombre} {cantidad}
        </Boton>
      ))}
    </div>
  )
}

function TablaAvisos({ avisos, zona, hoy }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Vaca</th>
          <th>Aviso</th>
          <th>Por qué</th>
          <th>Cuándo</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        {avisos.map((aviso) => (
          <tr key={aviso.id_alerta}>
            <td className="caravana-tabla">{aviso.caravana}</td>
            <td><strong>{nombreDelAviso(aviso.tipo_alerta)}</strong></td>
            <td>{aviso.por_que}</td>
            <td>{textoCuando(aviso.fecha_objetivo, hoy)}</td>
            <td>
              <Link to={enlaceDeLaVaca(zona, aviso.caravana)} className="boton boton-secundario boton-ver">Ver</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ListaDeAvisos({ avisos, zona }) {
  const [tipoElegido, cambiarTipoElegido] = useState('')
  const hoy = hoyArgentina()
  const visibles = avisos.filter((aviso) => !tipoElegido || aviso.tipo_alerta === tipoElegido)

  return (
    <>
      <EtiquetasDeAvisos avisos={avisos} tipoElegido={tipoElegido} alElegir={cambiarTipoElegido} />
      {avisos.length === 0 && <p className="mensaje-vacio">No hay avisos para hoy.</p>}
      {avisos.length > 0 && visibles.length === 0 && <p className="mensaje-vacio">No hay avisos de este tipo.</p>}
      {visibles.length > 0 && <TablaAvisos avisos={visibles} zona={zona} hoy={hoy} />}
    </>
  )
}

function Avisos({ zona }) {
  const [avisos, cambiarAvisos] = useState([])
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarAvisos()
  }, [])

  async function cargarAvisos() {
    try {
      cambiarAvisos(await leerAvisosDelRodeo(hoyArgentina()))
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudieron traer los avisos. Para verlos hace falta señal.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla">
      <Encabezado titulo="Avisos del rodeo" volver={zona === 'celular' ? '/celular' : null} />
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {cargando && <p className="cargando">Cargando los avisos</p>}
      {!cargando && !aviso && <ListaDeAvisos avisos={avisos} zona={zona} />}
      <p className="nota-chica">
        Los días de aviso y de cálculo son los del establecimiento. Un aviso se cierra solo cuando se registra el evento
        que lo resuelve.
      </p>
    </main>
  )
}

export default Avisos
