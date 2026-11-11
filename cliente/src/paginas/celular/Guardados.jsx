import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'
import { ahoraArgentina, describirCuando, describirTipo } from '../../captura.js'
import { listarPendientes } from '../../cola.js'
import { useSesion } from '../../sesion.jsx'

function FilaGuardado({ captura, ahora }) {
  return (
    <li className="fila-guardado">
      <span className="caravana">{captura.caravana}</span>
      <span>{describirTipo(captura.tipo_captura)}</span>
      <span>{describirCuando(captura.fecha_hora, ahora)}</span>
      <span className="etiqueta etiqueta-celular">En el celular</span>
    </li>
  )
}

function Guardados() {
  const { usuario } = useSesion()
  const [capturas, cambiarCapturas] = useState([])
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarCapturas(usuario.id_usuario)
  }, [usuario.id_usuario])

  async function cargarCapturas(idUsuario) {
    try {
      cambiarCapturas(await listarPendientes(idUsuario))
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudieron leer los registros guardados en el celular.')
    } finally {
      cambiarCargando(false)
    }
  }

  const ahora = ahoraArgentina()
  const sinCapturas = !cargando && !aviso && capturas.length === 0

  return (
    <main className="pantalla">
      <Encabezado titulo="Registros guardados" volver="/celular" />
      <p>Se envían solos cuando hay señal. Hasta entonces quedan en el celular.</p>
      {cargando && <p className="cargando">Cargando</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {sinCapturas && <p>No hay registros guardados en el celular.</p>}
      <ul className="lista-guardados">
        {capturas.map((captura) => (
          <FilaGuardado key={captura.id_captura} captura={captura} ahora={ahora} />
        ))}
      </ul>
      <Link to="/celular" className="boton boton-principal">Registrar otra vaca</Link>
    </main>
  )
}

export default Guardados
