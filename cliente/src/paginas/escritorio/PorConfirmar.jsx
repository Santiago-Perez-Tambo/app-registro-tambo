import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import {
  DIAS_GESTACION,
  ETIQUETAS_DE_CAMPO,
  FILTROS,
  LARGO_MAXIMO_TORO,
  OPCIONES,
  ORDENES,
  VISTA_INICIAL,
  camposParaLeer,
  contarSegunEstado,
  contarSegunFiltro,
  estadoDelAsiento,
  etiquetaDeFila,
  etiquetaDeRevision,
  filtrarAsientos,
  franjaDeRevision,
  inicioDeLosUltimosDias,
  vistaValida,
  ordenarAsientos,
  avisoCambioDeVaca,
  camposNoEntendidos,
  camposVisibles,
  capturadoPor,
  caravanaDestino,
  caravanaParaPasar,
  datosParaEnviar,
  elegirAsiento,
  estadoDeLaVaca,
  faltaDeVaca,
  fechaHoraCompleta,
  formularioDesdeEvento,
  queFaltaParaConfirmar,
  textoActualizado,
  textoCambioDeVaca,
  textoDeFila,
  tituloDelDetalle,
} from '../../asiento.js'
import { normalizarCaravana } from '../../animal.js'
import { ahoraArgentina, describirCuando } from '../../captura.js'
import { puedeRevisar } from '../../permisos.js'
import { confirmarEvento, pedirFoto, rechazarEvento, reinterpretarCaptura } from '../../servidor.js'
import { useSesion } from '../../sesion.jsx'
import { buscarIdAnimal, leerPorConfirmar, leerRevisados } from '../../supabase.js'

const UN_MINUTO = 60 * 1000
const DURACION_MENSAJE = 4 * 1000
const DURACION_FRANJA = 6 * 1000
const DIAS_REVISADOS = 30
const UNA_COLUMNA = '(max-width: 799px)'
const SIN_SELECCION = { id: null, indice: 0 }
const SIN_RESULTADO = { mensaje: '', aviso: '' }

function verAsientos(asientos, vista) {
  return ordenarAsientos(filtrarAsientos(asientos, vista), vista.orden)
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

function claveDeVista(idUsuario) {
  return `vista-por-confirmar-${idUsuario}`
}

function leerVista(idUsuario) {
  try {
    return vistaValida(JSON.parse(localStorage.getItem(claveDeVista(idUsuario))))
  } catch (error) {
    console.error(error)
    return VISTA_INICIAL
  }
}

function vistaAlEntrar(idUsuario, idCapturaPedida) {
  const guardada = leerVista(idUsuario)
  return idCapturaPedida ? { ...guardada, filtro: 'todos' } : guardada
}

function guardarVista(idUsuario, vista) {
  try {
    localStorage.setItem(claveDeVista(idUsuario), JSON.stringify(vista))
  } catch (error) {
    console.error(error)
  }
}

function BotonDeVista({ prendido, alTocar, children }) {
  return (
    <Boton tipo={prendido ? 'destacado' : 'secundario'} aria-pressed={prendido} onClick={alTocar}>
      {children}
    </Boton>
  )
}

function GrupoDeVista({ titulo, opciones, elegida, alElegir, textoDeOpcion }) {
  return (
    <div className="grupo-vista" role="group" aria-label={titulo}>
      <span className="nombre-grupo">{titulo}</span>
      {opciones.map((opcion) => (
        <BotonDeVista key={opcion.valor} prendido={opcion.valor === elegida} alTocar={() => alElegir(opcion.valor)}>
          {textoDeOpcion(opcion)}
        </BotonDeVista>
      ))}
    </div>
  )
}

function Interruptor({ texto, prendido, alCambiar }) {
  return (
    <label className="interruptor">
      <span>{texto}</span>
      <input type="checkbox" role="switch" checked={prendido} onChange={(evento) => alCambiar(evento.target.checked)} />
      <span className="interruptor-pista" aria-hidden="true" />
      <span className="interruptor-estado" aria-hidden="true">{prendido ? 'Sí' : 'No'}</span>
    </label>
  )
}

function FilaHistorial({ asientos, vista, alCambiar }) {
  const titulo = `Historial (últimos ${DIAS_REVISADOS} días)`
  return (
    <div className="fila-historial" role="group" aria-label={titulo}>
      <span className="nombre-grupo">{titulo}</span>
      <Interruptor
        texto={`Confirmados (${contarSegunEstado(asientos, 'confirmado')})`}
        prendido={vista.confirmados}
        alCambiar={(confirmados) => alCambiar({ ...vista, confirmados })}
      />
      <Interruptor
        texto={`Rechazados (${contarSegunEstado(asientos, 'rechazado')})`}
        prendido={vista.rechazados}
        alCambiar={(rechazados) => alCambiar({ ...vista, rechazados })}
      />
    </div>
  )
}

function BarraDeVista({ asientos, vista, alCambiar }) {
  return (
    <>
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
          textoDeOpcion={(opcion) => `${opcion.texto} (${contarSegunFiltro(asientos, opcion.valor)})`}
        />
      </div>
      <FilaHistorial asientos={asientos} vista={vista} alCambiar={alCambiar} />
    </>
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

function claseDeFila(asiento, idElegido) {
  const clases = ['fila-asiento']
  if (estadoDelAsiento(asiento) !== 'pendiente') {
    clases.push('fila-revisada')
  }
  if (asiento.id_captura === idElegido) {
    clases.push('fila-elegida')
  }
  return clases.join(' ')
}

function ListaAsientos({ asientos, idElegido, alElegir }) {
  const ahora = ahoraArgentina()
  return (
    <ul className="lista-asientos">
      {asientos.map((asiento) => (
        <li key={asiento.id_captura}>
          <button
            type="button"
            className={claseDeFila(asiento, idElegido)}
            aria-current={asiento.id_captura === idElegido}
            onClick={() => alElegir(asiento.id_captura)}
          >
            <span className="caravana-fila">{asiento.caravana}</span>
            <span>{textoDeFila(asiento)}</span>
            <span className="hora-fila">{describirCuando(asiento.fecha_hora, ahora)}</span>
            {etiquetaDeFila(asiento) && (
              <span className={`etiqueta etiqueta-fila etiqueta-${estadoDelAsiento(asiento)}`}>{etiquetaDeFila(asiento)}</span>
            )}
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

function AvisoCambioDeVaca({ asiento, pendiente, alVolver, alAceptar }) {
  return (
    <div className="aviso-cambio-vaca" role="alert">
      <p>{avisoCambioDeVaca(asiento, pendiente.caravana)}</p>
      <div className="botones">
        <Boton tipo="secundario" onClick={alVolver}>Volver</Boton>
        <Boton tipo="principal" onClick={alAceptar}>Sí, pasar a {pendiente.caravana}</Boton>
      </div>
    </div>
  )
}

async function buscarVacaDestino(caravana, idEstablecimiento) {
  try {
    const idAnimal = await buscarIdAnimal(caravana, idEstablecimiento)
    if (idAnimal) {
      return { destino: { caravana, id_animal: idAnimal }, aviso: '' }
    }
    return { destino: null, aviso: `La caravana ${caravana} no está en el rodeo` }
  } catch (error) {
    console.error(error)
    return { destino: null, aviso: 'No se pudo buscar la caravana. Revisá la conexión y probá de nuevo.' }
  }
}

function CampoVaca({ asiento, vaca, puedeDecidir, alEscribir, alPedirCambio }) {
  const { usuario } = useSesion()
  const [buscando, cambiarBuscando] = useState(false)
  const [aviso, cambiarAviso] = useState('')
  const sugerida = caravanaParaPasar(asiento.advertencias)
  const destino = caravanaDestino(normalizarCaravana(vaca.escrita), vaca.elegida.caravana, sugerida)

  async function buscarDestino() {
    cambiarBuscando(true)
    const resultado = await buscarVacaDestino(destino, usuario.id_establecimiento)
    cambiarAviso(resultado.aviso)
    cambiarBuscando(false)
    if (resultado.destino) {
      alPedirCambio(resultado.destino)
    }
  }

  function escribir(evento) {
    alEscribir(evento.target.value)
    cambiarAviso('')
  }

  return (
    <div className="campo-vaca">
      <label className="campo">
        Vaca
        <input type="text" value={vaca.escrita} onChange={escribir} autoComplete="off" autoCapitalize="characters" />
      </label>
      {puedeDecidir && destino && (
        <Boton tipo="destacado" onClick={buscarDestino} disabled={buscando}>Pasar a {destino}</Boton>
      )}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
    </div>
  )
}

function VacaDelAsiento({ asiento, elegida }) {
  if (elegida.caravana === asiento.caravana) {
    return null
  }
  return <p className="mensaje-correcto">Falta confirmar el asiento para que quede en {elegida.caravana}.</p>
}

function SeccionVaca({ asiento, vaca, puedeDecidir, bloqueada, alCambiar }) {
  function aceptarCambio(destino) {
    alCambiar({ escrita: destino.caravana, elegida: destino, pendiente: null })
  }

  function pedirCambio(destino) {
    if (destino.caravana === asiento.caravana) {
      aceptarCambio({ caravana: asiento.caravana, id_animal: null })
      return
    }
    alCambiar({ ...vaca, pendiente: destino })
  }

  return (
    <>
      <fieldset disabled={bloqueada}>
        <CampoVaca
          asiento={asiento}
          vaca={vaca}
          puedeDecidir={puedeDecidir}
          alEscribir={(escrita) => alCambiar({ ...vaca, escrita })}
          alPedirCambio={pedirCambio}
        />
      </fieldset>
      {vaca.pendiente && (
        <AvisoCambioDeVaca
          asiento={asiento}
          pendiente={vaca.pendiente}
          alVolver={() => alCambiar({ ...vaca, escrita: vaca.elegida.caravana, pendiente: null })}
          alAceptar={() => aceptarCambio(vaca.pendiente)}
        />
      )}
      <VacaDelAsiento asiento={asiento} elegida={vaca.elegida} />
    </>
  )
}

function CamposDelAsiento({ formulario, bloqueados, alCambiar }) {
  const noEntendidos = camposNoEntendidos(formulario)
  return (
    <fieldset disabled={bloqueados}>
      {camposVisibles(formulario).map((campo) => (
        <CampoDelAsiento
          key={campo}
          campo={campo}
          valor={formulario[campo]}
          noEntendido={noEntendidos.includes(campo)}
          alCambiar={alCambiar}
        />
      ))}
    </fieldset>
  )
}

function vacaInicial(caravana) {
  return { escrita: caravana, elegida: { caravana, id_animal: null }, pendiente: null }
}

function queFaltaEnElAsiento(formulario, vaca) {
  const hoy = ahoraArgentina().slice(0, 10)
  return faltaDeVaca(normalizarCaravana(vaca.escrita), vaca.elegida.caravana) || queFaltaParaConfirmar(formulario, hoy)
}

function datosConVaca(formulario, elegida) {
  const datos = datosParaEnviar(formulario)
  if (elegida.id_animal) {
    datos.id_animal = elegida.id_animal
  }
  return datos
}

function FormularioAsiento({ asiento, vaca, alCambiarVaca, puedeDecidir, enviando, alConfirmar, alRechazar }) {
  const [formulario, cambiarFormulario] = useState(() => formularioDesdeEvento(asiento.evento, asiento.fecha_hora))
  const [falta, cambiarFalta] = useState('')
  const bloqueado = !puedeDecidir || enviando || vaca.pendiente !== null

  function cambiarCampo(campo, valor) {
    cambiarFormulario((anterior) => ({ ...anterior, [campo]: valor }))
    cambiarFalta('')
  }

  function cambiarVacaDelAsiento(nueva) {
    alCambiarVaca(nueva)
    cambiarFalta('')
  }

  function confirmar(evento) {
    evento.preventDefault()
    const mensaje = queFaltaEnElAsiento(formulario, vaca)
    cambiarFalta(mensaje)
    if (!mensaje) {
      alConfirmar(datosConVaca(formulario, vaca.elegida), vaca.elegida.caravana)
    }
  }

  return (
    <form className="formulario-asiento" onSubmit={confirmar} noValidate>
      <SeccionVaca
        asiento={asiento}
        vaca={vaca}
        puedeDecidir={puedeDecidir}
        bloqueada={bloqueado}
        alCambiar={cambiarVacaDelAsiento}
      />
      <CamposDelAsiento formulario={formulario} bloqueados={bloqueado} alCambiar={cambiarCampo} />
      {falta && <p className="mensaje-aviso">{falta}</p>}
      {puedeDecidir && !vaca.pendiente && <BotonesDeDecision enviando={enviando} alRechazar={alRechazar} />}
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

function VerHistoria({ caravana }) {
  return (
    <Link to={`/escritorio/vaca/${encodeURIComponent(caravana)}`} className="boton boton-secundario">
      Ver historia
    </Link>
  )
}

function CambioDeVaca({ asiento, caravana }) {
  const texto = textoCambioDeVaca(asiento.caravana_captura, caravana)
  return texto ? <p className="cambio-de-vaca">{texto}</p> : null
}

function LoQueDijo({ asiento }) {
  return (
    <>
      <h3>Lo que dijo</h3>
      {asiento.tipo_captura === 'foto'
        ? <FotoDeCaptura idCaptura={asiento.id_captura} />
        : <p className="lo-que-dijo">{asiento.lo_que_dijo}</p>}
    </>
  )
}

function accionesDelAsiento(asiento, hacer) {
  const idEvento = asiento.evento?.id_evento
  return {
    confirmar: (datos, caravana) =>
      hacer(() => confirmarEvento(idEvento, datos), { franja: franjaDeRevision(caravana, 'confirmado'), mensaje: '' }),
    rechazar: () =>
      hacer(() => rechazarEvento(idEvento), { franja: franjaDeRevision(asiento.caravana, 'rechazado'), mensaje: '' }),
    reinterpretar: () =>
      hacer(() => reinterpretarCaptura(asiento.id_captura), { franja: null, mensaje: 'Se volvió a interpretar la captura' }),
  }
}

function DetalleAsiento({ asiento, enviando, hacer }) {
  const { usuario } = useSesion()
  const [vaca, cambiarVaca] = useState(() => vacaInicial(asiento.caravana))
  const puedeDecidir = puedeRevisar(usuario, asiento)
  const acciones = accionesDelAsiento(asiento, hacer)
  const caravana = vaca.elegida.caravana

  return (
    <section className="detalle-asiento">
      <div className="titulo-detalle">
        <h2>{tituloDelDetalle(asiento, caravana)}</h2>
        {asiento.evento && <span className="etiqueta etiqueta-propuesto">Propuesto por el sistema</span>}
        <VerHistoria caravana={asiento.caravana} />
      </div>
      <DatosDeLaCaptura asiento={asiento} />
      <CambioDeVaca asiento={asiento} caravana={caravana} />
      <LoQueDijo asiento={asiento} />
      {asiento.evento && <Advertencias advertencias={asiento.advertencias} />}
      {asiento.evento ? (
        <FormularioAsiento
          asiento={asiento}
          vaca={vaca}
          alCambiarVaca={cambiarVaca}
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

function CamposDeSoloLectura({ asiento }) {
  return (
    <dl className="campos-lectura">
      {camposParaLeer(asiento.evento, asiento.fecha_hora).map((dato) => (
        <div key={dato.campo}>
          <dt>{dato.etiqueta}</dt>
          <dd>{dato.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetalleRevisado({ asiento }) {
  return (
    <section className="detalle-asiento">
      <div className="titulo-detalle">
        <h2>{tituloDelDetalle(asiento, asiento.caravana)}</h2>
        <span className={`etiqueta etiqueta-${estadoDelAsiento(asiento)}`}>{etiquetaDeRevision(asiento)}</span>
        <VerHistoria caravana={asiento.caravana} />
      </div>
      <DatosDeLaCaptura asiento={asiento} />
      <CambioDeVaca asiento={asiento} caravana={asiento.caravana} />
      <LoQueDijo asiento={asiento} />
      <h3>Asiento</h3>
      <CamposDeSoloLectura asiento={asiento} />
    </section>
  )
}

function DetalleDelElegido({ asiento, enviando, hacer }) {
  if (estadoDelAsiento(asiento) === 'pendiente') {
    return <DetalleAsiento asiento={asiento} enviando={enviando} hacer={hacer} />
  }
  return <DetalleRevisado asiento={asiento} />
}

async function hacerYRecargar(accion, recargar) {
  try {
    await accion()
    await recargar()
    return ''
  } catch (error) {
    console.error(error)
    if (error.status === 409) {
      await recargar()
    }
    return error.message
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

function programarBorrado(hayAlgo, borrar, espera) {
  if (!hayAlgo) {
    return undefined
  }
  const reloj = setTimeout(borrar, espera)
  return () => clearTimeout(reloj)
}

function ResultadoDeLaAccion({ resultado }) {
  return (
    <div role="status">
      {resultado.mensaje && <p className="mensaje-correcto mensaje-resultado">{resultado.mensaje}</p>}
      {resultado.aviso && <p className="mensaje-aviso mensaje-resultado">{resultado.aviso}</p>}
    </div>
  )
}

function FranjaDeResultado({ franja, alCerrar }) {
  return (
    <div aria-live="polite">
      {franja && (
        <div className={`franja-resultado franja-${franja.tipo}`}>
          <p>{franja.texto}</p>
          <button type="button" className="cerrar-franja" onClick={alCerrar}>× Cerrar</button>
        </div>
      )}
    </div>
  )
}

function SinVisibles({ asientos }) {
  const texto = contarSegunFiltro(asientos, 'todos') === 0
    ? 'No hay asientos por confirmar.'
    : 'Ningún asiento coincide con el filtro.'
  return <p className="mensaje-vacio">{texto}</p>
}

function VistaDeAsientos({ asientos, enviando, hacer, resultado, vecesHecho, alElegirOtro }) {
  const { usuario } = useSesion()
  const { state } = useLocation()
  const idCapturaPedida = state?.idCaptura ?? null
  const [vista, cambiarVista] = useState(() => vistaAlEntrar(usuario.id_usuario, idCapturaPedida))
  const [seleccion, cambiarSeleccion] = useState({ ...SIN_SELECCION, id: idCapturaPedida })
  const refColumna = useRef(null)
  const visibles = verAsientos(asientos, vista)
  const elegido = visibles.find((asiento) => asiento.id_captura === elegirAsiento(visibles, seleccion.id, seleccion.indice))

  useEffect(() => {
    if (vecesHecho > 0) {
      bajarAlDetalle(refColumna.current)
    }
  }, [vecesHecho])

  function cambiarYGuardarVista(nueva) {
    cambiarVista(nueva)
    guardarVista(usuario.id_usuario, nueva)
  }

  function elegir(idCaptura) {
    cambiarSeleccion({ id: idCaptura, indice: visibles.findIndex((asiento) => asiento.id_captura === idCaptura) })
    alElegirOtro()
    bajarAlDetalle(refColumna.current)
  }

  return (
    <>
      <BarraDeVista asientos={asientos} vista={vista} alCambiar={cambiarYGuardarVista} />
      {visibles.length === 0 && <SinVisibles asientos={asientos} />}
      <div className="por-confirmar">
        <ListaAsientos asientos={visibles} idElegido={elegido?.id_captura} alElegir={elegir} />
        <div className="columna-detalle" ref={refColumna}>
          <ResultadoDeLaAccion resultado={resultado} />
          {elegido && <DetalleDelElegido key={elegido.id_captura} asiento={elegido} enviando={enviando} hacer={hacer} />}
        </div>
      </div>
    </>
  )
}

function ListaVacia({ resultado }) {
  return (
    <>
      <ResultadoDeLaAccion resultado={resultado} />
      <p className="mensaje-vacio">No hay asientos por confirmar.</p>
    </>
  )
}

function PanelDeAsientos({ asientos, recargar }) {
  const [enviando, cambiarEnviando] = useState(false)
  const [resultado, cambiarResultado] = useState(SIN_RESULTADO)
  const [franja, cambiarFranja] = useState(null)
  const [vecesHecho, cambiarVecesHecho] = useState(0)

  useEffect(() => programarBorrado(resultado.mensaje, () => cambiarResultado(SIN_RESULTADO), DURACION_MENSAJE), [resultado])
  useEffect(() => programarBorrado(franja, () => cambiarFranja(null), DURACION_FRANJA), [franja])

  async function hacer(accion, exito) {
    cambiarEnviando(true)
    cambiarResultado(SIN_RESULTADO)
    cambiarFranja(null)
    const aviso = await hacerYRecargar(accion, recargar)
    cambiarResultado({ mensaje: aviso ? '' : exito.mensaje, aviso })
    cambiarFranja(aviso ? null : exito.franja)
    cambiarEnviando(false)
    cambiarVecesHecho((anteriores) => anteriores + 1)
  }

  return (
    <>
      <FranjaDeResultado franja={franja} alCerrar={() => cambiarFranja(null)} />
      {asientos.length === 0 ? (
        <ListaVacia resultado={resultado} />
      ) : (
        <VistaDeAsientos
          asientos={asientos}
          enviando={enviando}
          hacer={hacer}
          resultado={resultado}
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
      const desde = inicioDeLosUltimosDias(ahoraArgentina(), DIAS_REVISADOS)
      const [pendientes, revisados] = await Promise.all([leerPorConfirmar(), leerRevisados(desde)])
      cambiarAsientos([...pendientes, ...revisados])
      cambiarCantidadPorConfirmar(pendientes.length)
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
