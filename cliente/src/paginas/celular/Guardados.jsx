import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { useSenal } from '../../componentes/IndicadorSenal.jsx'
import { ahoraArgentina, describirCuando, describirTipo, resumenDeVuelta } from '../../captura.js'
import { enviarCola, escucharEnvio, listarPendientes } from '../../cola.js'
import { useSesion } from '../../sesion.jsx'
import { leerEnviadosHoy } from '../../supabase.js'

const ETIQUETAS = {
  celular: { texto: 'En el celular', clase: 'etiqueta-celular' },
  enviando: { texto: 'Enviando', clase: 'etiqueta-enviando' },
  enviado: { texto: 'Enviado', clase: 'etiqueta-enviado' },
}

function FilaGuardado({ captura, estado, ahora }) {
  const etiqueta = ETIQUETAS[estado]
  return (
    <li className="fila-guardado">
      <span className="caravana">{captura.caravana}</span>
      <span>{describirTipo(captura.tipo_captura)}</span>
      <span>{describirCuando(captura.fecha_hora, ahora)}</span>
      <span className={`etiqueta etiqueta-estado ${etiqueta.clase}`}>{etiqueta.texto}</span>
      {estado === 'celular' && captura.motivo && <p className="motivo">{captura.motivo}</p>}
    </li>
  )
}

function ListaPendientes({ idUsuario, ahora }) {
  const [capturas, cambiarCapturas] = useState([])
  const [idEnviando, cambiarIdEnviando] = useState(null)
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    async function cargarCapturas() {
      try {
        cambiarCapturas(await listarPendientes(idUsuario))
        cambiarAviso('')
      } catch (error) {
        console.error(error)
        cambiarAviso('No se pudieron leer los registros guardados en el celular.')
      } finally {
        cambiarCargando(false)
      }
    }
    return escucharEnvio((estado) => {
      cambiarIdEnviando(estado.idEnviando)
      cargarCapturas()
    })
  }, [idUsuario])

  if (cargando) {
    return <p className="cargando">Cargando</p>
  }
  if (aviso) {
    return <p className="mensaje-aviso">{aviso}</p>
  }
  return <FilasPendientes capturas={capturas} idEnviando={idEnviando} ahora={ahora} />
}

function FilasPendientes({ capturas, idEnviando, ahora }) {
  if (capturas.length === 0) {
    return <p>No hay registros guardados en el celular.</p>
  }
  return (
    <ul className="lista-guardados">
      {capturas.map((captura) => (
        <FilaGuardado
          key={captura.id_captura}
          captura={captura}
          estado={captura.id_captura === idEnviando ? 'enviando' : 'celular'}
          ahora={ahora}
        />
      ))}
    </ul>
  )
}

function ListaEnviadosHoy({ idUsuario, ahora, conSenal }) {
  const [enviados, cambiarEnviados] = useState([])
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    async function cargarEnviados() {
      try {
        cambiarEnviados(await leerEnviadosHoy(idUsuario, ahoraArgentina().slice(0, 10)))
        cambiarAviso('')
      } catch (error) {
        console.error(error)
        cambiarAviso('No se pudieron traer los enviados de hoy.')
      }
    }
    if (!conSenal) {
      return undefined
    }
    cargarEnviados()
    return escucharEnvio((estado) => {
      if (estado.resumen) {
        cargarEnviados()
      }
    })
  }, [idUsuario, conSenal])

  if (!conSenal) {
    return <p className="nota-chica">Con señal se ven los enviados de hoy.</p>
  }
  if (aviso) {
    return <p className="mensaje-aviso">{aviso}</p>
  }
  return <SeccionEnviados enviados={enviados} ahora={ahora} />
}

function SeccionEnviados({ enviados, ahora }) {
  if (enviados.length === 0) {
    return null
  }
  return (
    <section>
      <h2 className="separador-enviados">Enviados hoy</h2>
      <ul className="lista-guardados">
        {enviados.map((captura) => (
          <FilaGuardado key={captura.id_captura} captura={captura} estado="enviado" ahora={ahora} />
        ))}
      </ul>
    </section>
  )
}

function ResumenDeVuelta() {
  const [resumen, cambiarResumen] = useState(null)

  useEffect(() => {
    return escucharEnvio((estado) => cambiarResumen(estado.resumen))
  }, [])

  const texto = resumen ? resumenDeVuelta(resumen) : ''
  if (!texto) {
    return null
  }
  return <p className={resumen.cortada ? 'mensaje-aviso' : 'mensaje-correcto'}>{texto}</p>
}

function BotonesGuardados({ idUsuario, conSenal }) {
  const [enCurso, cambiarEnCurso] = useState(false)

  useEffect(() => {
    return escucharEnvio((estado) => cambiarEnCurso(estado.enCurso))
  }, [])

  return (
    <div className="botones-columna">
      <Boton tipo="secundario" onClick={() => enviarCola(idUsuario, true)} disabled={!conSenal || enCurso}>
        Enviar ahora
      </Boton>
      <Link to="/celular" className="boton boton-principal">Registrar otra vaca</Link>
    </div>
  )
}

function Guardados() {
  const { usuario } = useSesion()
  const conSenal = useSenal()
  const ahora = ahoraArgentina()

  return (
    <main className="pantalla">
      <Encabezado titulo="Registros guardados" volver="/celular" />
      <p>Se envían solos cuando hay señal. Hasta entonces quedan en el celular.</p>
      <ResumenDeVuelta />
      <ListaPendientes idUsuario={usuario.id_usuario} ahora={ahora} />
      <ListaEnviadosHoy idUsuario={usuario.id_usuario} ahora={ahora} conSenal={conSenal} />
      <BotonesGuardados idUsuario={usuario.id_usuario} conSenal={conSenal} />
    </main>
  )
}

export default Guardados
