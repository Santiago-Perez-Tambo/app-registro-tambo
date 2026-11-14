import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import {
  DIAS_GESTACION,
  ETIQUETAS_DE_CAMPO,
  FILTROS,
  LARGO_MAXIMO_TORO,
  OPCIONES,
  ORDENES,
  filtrarAsientos,
  ordenarAsientos,
  camposNoEntendidos,
  camposVisibles,
  capturadoPor,
  datosParaEnviar,
  elegirAsiento,
  estadoDeLaVaca,
  fechaHoraCompleta,
  formularioDesdeEvento,
  queFaltaParaConfirmar,
  textoActualizado,
  textoDeFila,
  tituloDelDetalle,
} from '../../asiento.js'
import { ahoraArgentina, describirCuando } from '../../captura.js'
import { puedeRevisar } from '../../permisos.js'
import { confirmarEvento, pedirFoto, rechazarEvento, reinterpretarCaptura } from '../../servidor.js'
import { useSesion } from '../../sesion.jsx'
import { leerPorConfirmar } from '../../supabase.js'

const UN_MINUTO = 60 * 1000
const UNA_COLUMNA = '(max-width: 799px)'
const VISTA_INICIAL = { filtro: 'todos', orden: 'viejos' }
const SIN_SELECCION = { id: null, indice: 0 }
const SIN_RESULTADO = { mensaje: '', aviso: '' }

function verAsientos(asientos, vista) {
  return ordenarAsientos(filtrarAsientos(asientos, vista.filtro), vista.orden)
}

function bajarAlDetalle(columna) {
  if (!columna) {
    return
  }
  columna.scrollTop = 0
  if (window.matchMedia(UNA_COLUMNA).matches) {
    columna.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function GrupoDeVista({ titulo, opciones, elegida, alElegir, textoDeOpcion }) {
  return (
    <div className="grupo-vista" role="group" aria-label={titulo}>
      <span className="nombre-grupo">{titulo}</span>
      {opciones.map((opcion) => (
        <Boton
          key={opcion.valor}
          tipo={opcion.valor === elegida ? 'destacado' : 'secundario'}
          aria-pressed={opcion.valor === elegida}
          onClick={() => alElegir(opcion.valor)}
        >
          {textoDeOpcion(opcion)}
        </Boton>
      ))}
    </div>
  )
}

function BarraDeVista({ asientos, vista, alCambiar }) {
  return (
    <div className="barra-vista">
      <GrupoDeVista
        titulo="Ordenar"
        opciones={ORDENES}
        elegida={vista.orden}
        alElegir={(orden) => alCambiar({ ...vista, orden })}
        textoDeOpcion={(opcion) => opcion.texto}
      />
      <GrupoDeVista
        titulo="Mostrar"
        opciones={FILTROS}
        elegida={vista.filtro}
        alElegir={(filtro) => alCambiar({ ...vista, filtro })}
        textoDeOpcion={(opcion) => `${opcion.texto} (${filtrarAsientos(asientos, opcion.valor).length})`}
      />
    </div>
  )
}

function Actualizado({ desde }) {
  const [ahora, cambiarAhora] = useState(Date.now())

  useEffect(() => {
    const reloj = setInterval(() => cambiarAhora(Date.now()), UN_MINUTO / 2)
    return () => clearInterval(reloj)
  }, [])

  return <p className="actualizado">{textoActualizado(desde, ahora)}</p>
}

function ListaAsientos({ asientos, idElegido, alElegir }) {
  const ahora = ahoraArgentina()
  return (
    <ul className="lista-asientos">
      {asientos.map((asiento) => (
        <li key={asiento.id_captura}>
          <button
            type="button"
            className={asiento.id_captura === idElegido ? 'fila-asiento fila-elegida' : 'fila-asiento'}
            aria-current={asiento.id_captura === idElegido}
            onClick={() => alElegir(asiento.id_captura)}
          >
            <span className="caravana-fila">{asiento.caravana}</span>
            <span>{textoDeFila(asiento)}</span>
            <span className="hora-fila">{describirCuando(asiento.fecha_hora, ahora)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function FotoDeCaptura({ idCaptura }) {
  const [url, cambiarUrl] = useState('')
  const [aviso, cambiarAviso] = useState('')
  const [pedidaDeNuevo, cambiarPedidaDeNuevo] = useState(false)

  useEffect(() => {
    traerFoto()
  }, [])

  async function traerFoto() {
    try {
      cambiarUrl((await pedirFoto(idCaptura)).url)
    } catch (error) {
      console.error(error)
      cambiarAviso(error.message)
    }
  }

  function alFallarLaImagen() {
    if (pedidaDeNuevo) {
      cambiarAviso('No se pudo mostrar la foto.')
      return
    }
    cambiarPedidaDeNuevo(true)
    traerFoto()
  }

  if (aviso) {
    return <p className="mensaje-aviso">{aviso}</p>
  }
  if (!url) {
    return <p>Cargando la foto</p>
  }
  return <img src={url} alt="Foto de la captura" className="foto-captura" onError={alFallarLaImagen} />
}

function ControlDelCampo({ campo, valor, alCambiar }) {
  const cambiar = (evento) => alCambiar(campo, evento.target.value)
  if (OPCIONES[campo]) {
    return (
      <select value={valor} onChange={cambiar}>
        <option value="">Elegí</option>
        {OPCIONES[campo].map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
        ))}
      </select>
    )
  }
  if (campo === 'fecha_evento') {
    return <input type="date" value={valor} max={ahoraArgentina().slice(0, 10)} onChange={cambiar} />
  }
  if (campo === 'edad_gestacional') {
    return <input type="number" min="1" max={DIAS_GESTACION} step="1" value={valor} onChange={cambiar} />
  }
  return <input type="text" value={valor} maxLength={LARGO_MAXIMO_TORO} onChange={cambiar} autoComplete="off" />
}

function CampoDelAsiento({ campo, valor, noEntendido, alCambiar }) {
  return (
    <label className="campo">
      <span className="nombre-campo">
        {ETIQUETAS_DE_CAMPO[campo]}
        {noEntendido && <span className="no-entendido">No entendido</span>}
      </span>
      <ControlDelCampo campo={campo} valor={valor} alCambiar={alCambiar} />
      {campo === 'edad_gestacional' && <span className="aclaracion">días (un mes son 30)</span>}
    </label>
  )
}

function BotonesDeDecision({ enviando, alRechazar }) {
  return (
    <div className="botones">
      <Boton tipo="secundario" onClick={alRechazar} disabled={enviando}>Rechazar</Boton>
      <Boton tipo="principal" type="submit" disabled={enviando}>Confirmar asiento</Boton>
    </div>
  )
}

function FormularioAsiento({ asiento, puedeDecidir, enviando, alConfirmar, alRechazar }) {
  const [formulario, cambiarFormulario] = useState(() => formularioDesdeEvento(asiento.evento, asiento.fecha_hora))
  const [falta, cambiarFalta] = useState('')
  const noEntendidos = camposNoEntendidos(formulario)

  function cambiarCampo(campo, valor) {
    cambiarFormulario((anterior) => ({ ...anterior, [campo]: valor }))
    cambiarFalta('')
  }

  function confirmar(evento) {
    evento.preventDefault()
    const mensaje = queFaltaParaConfirmar(formulario, ahoraArgentina().slice(0, 10))
    if (mensaje) {
      cambiarFalta(mensaje)
      return
    }
    alConfirmar(datosParaEnviar(formulario))
  }

  return (
    <form className="formulario-asiento" onSubmit={confirmar} noValidate>
      <fieldset disabled={!puedeDecidir || enviando}>
        {camposVisibles(formulario).map((campo) => (
          <CampoDelAsiento
            key={campo}
            campo={campo}
            valor={formulario[campo]}
            noEntendido={noEntendidos.includes(campo)}
            alCambiar={cambiarCampo}
          />
        ))}
      </fieldset>
      {falta && <p className="mensaje-aviso">{falta}</p>}
      {puedeDecidir && <BotonesDeDecision enviando={enviando} alRechazar={alRechazar} />}
    </form>
  )
}

function Advertencias({ advertencias }) {
  if (advertencias.length === 0) {
    return null
  }
  return (
    <ul className="advertencias">
      {advertencias.map((advertencia) => (
        <li key={advertencia.id_advertencia} className="mensaje-aviso">{advertencia.detalle}</li>
      ))}
    </ul>
  )
}

function SinInterpretar({ puedeDecidir, enviando, alReinterpretar }) {
  return (
    <>
      <p className="mensaje-aviso">No se pudo interpretar todavía.</p>
      {puedeDecidir && (
        <div className="botones">
          <Boton tipo="principal" onClick={alReinterpretar} disabled={enviando}>Volver a interpretar</Boton>
        </div>
      )}
    </>
  )
}

function DatosDeLaCaptura({ asiento }) {
  return (
    <dl className="datos-asiento">
      <div>
        <dt>Capturado por</dt>
        <dd>{capturadoPor(asiento)}</dd>
      </div>
      <div>
        <dt>Fecha y hora</dt>
        <dd>{fechaHoraCompleta(asiento.fecha_hora)}</dd>
      </div>
      <div>
        <dt>Estado de la vaca</dt>
        <dd>{estadoDeLaVaca(asiento)}</dd>
      </div>
    </dl>
  )
}

function DetalleAsiento({ asiento, enviando, hacer }) {
  const { usuario } = useSesion()
  const puedeDecidir = puedeRevisar(usuario, asiento)
  const acciones = {
    confirmar: (datos) => hacer(() => confirmarEvento(asiento.evento.id_evento, datos), 'Asiento confirmado'),
    rechazar: () => hacer(() => rechazarEvento(asiento.evento.id_evento), 'Asiento rechazado'),
    reinterpretar: () => hacer(() => reinterpretarCaptura(asiento.id_captura), 'Se volvió a interpretar la captura'),
  }

  return (
    <section className="detalle-asiento">
      <div className="titulo-detalle">
        <h2>{tituloDelDetalle(asiento)}</h2>
        {asiento.evento && <span className="etiqueta etiqueta-propuesto">Propuesto por el sistema</span>}
      </div>
      <DatosDeLaCaptura asiento={asiento} />
      <h3>Lo que dijo</h3>
      {asiento.tipo_captura === 'foto'
        ? <FotoDeCaptura idCaptura={asiento.id_captura} />
        : <p className="lo-que-dijo">{asiento.lo_que_dijo}</p>}
      {asiento.evento && <Advertencias advertencias={asiento.advertencias} />}
      {asiento.evento ? (
        <FormularioAsiento
          asiento={asiento}
          puedeDecidir={puedeDecidir}
          enviando={enviando}
          alConfirmar={acciones.confirmar}
          alRechazar={acciones.rechazar}
        />
      ) : (
        <SinInterpretar puedeDecidir={puedeDecidir} enviando={enviando} alReinterpretar={acciones.reinterpretar} />
      )}
      {!puedeDecidir && <p className="mensaje-aviso">Este asiento lo confirma el propietario.</p>}
    </section>
  )
}

async function hacerYRecargar(accion, mensajeCorrecto, recargar) {
  try {
    await accion()
    await recargar()
    return { mensaje: mensajeCorrecto, aviso: '' }
  } catch (error) {
    console.error(error)
    if (error.status === 409) {
      await recargar()
    }
    return { mensaje: '', aviso: error.message }
  }
}

function escucharVueltaALaPestana(alVolver) {
  function alCambiarVisibilidad() {
    if (document.visibilityState === 'visible') {
      alVolver()
    }
  }
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
  return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
}

function VistaDeAsientos({ asientos, enviando, hacer, vecesHecho, alElegirOtro }) {
  const [vista, cambiarVista] = useState(VISTA_INICIAL)
  const [seleccion, cambiarSeleccion] = useState(SIN_SELECCION)
  const refColumna = useRef(null)
  const visibles = verAsientos(asientos, vista)
  const elegido = visibles.find((asiento) => asiento.id_captura === elegirAsiento(visibles, seleccion.id, seleccion.indice))

  useEffect(() => {
    if (vecesHecho > 0) {
      bajarAlDetalle(refColumna.current)
    }
  }, [vecesHecho])

  function elegir(idCaptura) {
    cambiarSeleccion({ id: idCaptura, indice: visibles.findIndex((asiento) => asiento.id_captura === idCaptura) })
    alElegirOtro()
    bajarAlDetalle(refColumna.current)
  }

  return (
    <>
      <BarraDeVista asientos={asientos} vista={vista} alCambiar={cambiarVista} />
      {visibles.length === 0 && <p className="mensaje-vacio">Ningún asiento coincide con el filtro.</p>}
      <div className="por-confirmar">
        <ListaAsientos asientos={visibles} idElegido={elegido?.id_captura} alElegir={elegir} />
        <div className="columna-detalle" ref={refColumna}>
          {elegido && (
            <DetalleAsiento key={elegido.id_captura} asiento={elegido} enviando={enviando} hacer={hacer} />
          )}
        </div>
      </div>
    </>
  )
}

function PanelDeAsientos({ asientos, recargar }) {
  const [enviando, cambiarEnviando] = useState(false)
  const [resultado, cambiarResultado] = useState(SIN_RESULTADO)
  const [vecesHecho, cambiarVecesHecho] = useState(0)

  async function hacer(accion, mensajeCorrecto) {
    cambiarEnviando(true)
    cambiarResultado(SIN_RESULTADO)
    cambiarResultado(await hacerYRecargar(accion, mensajeCorrecto, recargar))
    cambiarEnviando(false)
    cambiarVecesHecho((anteriores) => anteriores + 1)
  }

  return (
    <>
      {resultado.mensaje && <p className="mensaje-correcto">{resultado.mensaje}</p>}
      {resultado.aviso && <p className="mensaje-aviso">{resultado.aviso}</p>}
      {asientos.length === 0 ? (
        <p className="mensaje-vacio">No hay asientos por confirmar.</p>
      ) : (
        <VistaDeAsientos
          asientos={asientos}
          enviando={enviando}
          hacer={hacer}
          vecesHecho={vecesHecho}
          alElegirOtro={() => cambiarResultado(SIN_RESULTADO)}
        />
      )}
    </>
  )
}

function PorConfirmar() {
  const { cambiarCantidadPorConfirmar } = useOutletContext()
  const [asientos, cambiarAsientos] = useState([])
  const [cargando, cambiarCargando] = useState(true)
  const [actualizadoEn, cambiarActualizadoEn] = useState(null)
  const [avisoDeCarga, cambiarAvisoDeCarga] = useState('')

  useEffect(() => {
    cargarAsientos()
    return escucharVueltaALaPestana(cargarAsientos)
  }, [])

  async function cargarAsientos() {
    try {
      const lista = await leerPorConfirmar()
      cambiarAsientos(lista)
      cambiarCantidadPorConfirmar(lista.length)
      cambiarActualizadoEn(Date.now())
      cambiarAvisoDeCarga('')
    } catch (error) {
      console.error(error)
      cambiarAvisoDeCarga('No se pudo traer la lista. Revisá la conexión y probá de nuevo.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla">
      <Encabezado titulo="Asientos por confirmar" />
      {actualizadoEn && <Actualizado desde={actualizadoEn} />}
      {avisoDeCarga && <p className="mensaje-aviso">{avisoDeCarga}</p>}
      {cargando && <p className="cargando">Cargando los asientos</p>}
      {!cargando && !(avisoDeCarga && asientos.length === 0) && (
        <PanelDeAsientos asientos={asientos} recargar={cargarAsientos} />
      )}
    </main>
  )
}

export default PorConfirmar
