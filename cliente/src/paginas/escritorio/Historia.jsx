import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'
import { mostrarPalabra, normalizarCaravana } from '../../animal.js'
import {
  advertenciasParaMostrar,
  cantidadDePartos,
  confirmadoPor,
  detalleDelEvento,
  estadoDelCalostro,
  fechaUltimoParto,
  fechaYHoraDelEvento,
  hoyArgentina,
  inicioDeLactancia,
  nombreDelEvento,
  separarEventos,
  textoDeAlertasVigentes,
  textoDiasDeLactancia,
  textoDosFechasDeParto,
} from '../../historia.js'
import { puedeRegistrarDesdeEscritorio } from '../../permisos.js'
import { useSesion } from '../../sesion.jsx'
import { leerHistoria } from '../../supabase.js'

function BotonesDeArriba({ caravana }) {
  const { usuario } = useSesion()
  return (
    <div className="botones-arriba">
      <Link to="/escritorio/rodeo" className="boton boton-secundario">Volver</Link>
      {puedeRegistrarDesdeEscritorio(usuario.rol) && (
        <Link to={`/celular/vaca/${encodeURIComponent(caravana)}`} className="boton boton-principal">
          Registrar evento
        </Link>
      )}
    </div>
  )
}

function Tarjeta({ rotulo, valor }) {
  return (
    <div className="tarjeta">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

function TarjetasDeLaVaca({ animal, confirmados, alertas, hoy }) {
  return (
    <dl className="tarjetas">
      <Tarjeta rotulo="Categoría" valor={mostrarPalabra(animal.categoria)} />
      <Tarjeta rotulo="Estado reproductivo" valor={mostrarPalabra(animal.estado_reproductivo)} />
      <Tarjeta rotulo="Días de lactancia" valor={textoDiasDeLactancia(inicioDeLactancia(confirmados), hoy)} />
      <Tarjeta rotulo="Partos" valor={cantidadDePartos(confirmados)} />
      <Tarjeta rotulo="Avisos" valor={textoDeAlertasVigentes(alertas)} />
    </dl>
  )
}

function LineaDeCalostro({ confirmados, parametros, hoy }) {
  const calostro = estadoDelCalostro(fechaUltimoParto(confirmados), parametros, hoy)
  if (!calostro) {
    return null
  }
  return <p className={calostro.conCalostro ? 'mensaje-aviso' : 'mensaje-correcto'}>{calostro.texto}</p>
}

function AdvertenciasDeLaFila({ advertencias }) {
  const visibles = advertenciasParaMostrar(advertencias)
  if (visibles.length === 0) {
    return null
  }
  return (
    <ul className="advertencias-fila">
      {visibles.map((advertencia) => (
        <li key={advertencia.id_advertencia} className="etiqueta-advertencia">{advertencia.texto}</li>
      ))}
    </ul>
  )
}

function FilaPropuesta({ evento }) {
  return (
    <tr className="fila-propuesta">
      <td><strong>Propuesto, sin confirmar</strong></td>
      <td>{nombreDelEvento(evento.tipo_evento)}</td>
      <td>{detalleDelEvento(evento)}</td>
      <td>
        <Link to="/escritorio/por-confirmar" state={{ idCaptura: evento.id_captura }} className="boton boton-destacado">
          Ver asiento propuesto
        </Link>
      </td>
    </tr>
  )
}

function FilaConfirmada({ evento }) {
  return (
    <tr>
      <td>{fechaYHoraDelEvento(evento)}</td>
      <td><strong>{nombreDelEvento(evento.tipo_evento)}</strong></td>
      <td>
        {detalleDelEvento(evento)}
        <AdvertenciasDeLaFila advertencias={evento.advertencias} />
      </td>
      <td>{confirmadoPor(evento.rol_confirma)}</td>
    </tr>
  )
}

function TablaDeEventos({ confirmados, propuestos }) {
  if (confirmados.length === 0 && propuestos.length === 0) {
    return <p className="mensaje-vacio">Esta vaca todavía no tiene eventos confirmados.</p>
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Fecha y hora</th>
          <th>Evento</th>
          <th>Detalle</th>
          <th>Confirmado por</th>
        </tr>
      </thead>
      <tbody>
        {propuestos.map((evento) => <FilaPropuesta key={evento.id_evento} evento={evento} />)}
        {confirmados.map((evento) => <FilaConfirmada key={evento.id_evento} evento={evento} />)}
      </tbody>
    </table>
  )
}

function ContenidoHistoria({ historia }) {
  const hoy = hoyArgentina()
  const { confirmados, propuestos } = separarEventos(historia.eventos)
  const dosFechas = textoDosFechasDeParto(confirmados, historia.alertas)

  return (
    <>
      <TarjetasDeLaVaca animal={historia.animal} confirmados={confirmados} alertas={historia.alertas} hoy={hoy} />
      <LineaDeCalostro confirmados={confirmados} parametros={historia.parametros} hoy={hoy} />
      {dosFechas && <p className="mensaje-aviso">{dosFechas}</p>}
      <h2>Eventos</h2>
      <TablaDeEventos confirmados={confirmados} propuestos={propuestos} />
    </>
  )
}

function Historia() {
  const { caravana } = useParams()
  const caravanaBuscada = normalizarCaravana(caravana)
  const [historia, cambiarHistoria] = useState(null)
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarHistoria(caravanaBuscada)
  }, [caravanaBuscada])

  async function cargarHistoria(buscada) {
    cambiarCargando(true)
    cambiarAviso('')
    try {
      const leida = await leerHistoria(buscada)
      cambiarHistoria(leida)
      if (!leida) {
        cambiarAviso(`La caravana ${buscada} no está en el rodeo`)
      }
    } catch (error) {
      console.error(error)
      cambiarHistoria(null)
      cambiarAviso('No se pudo traer la historia. Revisá la conexión y probá de nuevo.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla historia">
      <BotonesDeArriba caravana={caravanaBuscada} />
      <Encabezado titulo={`Historia de ${caravanaBuscada}`} />
      {cargando && <p className="cargando">Cargando la historia</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {!cargando && historia && <ContenidoHistoria historia={historia} />}
    </main>
  )
}

export default Historia
