import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { Microfono, Tilde } from '../../componentes/Iconos.jsx'
import { mostrarPalabra, normalizarCaravana } from '../../animal.js'
import {
  avisoDeMicrofono,
  contadorLetras,
  LARGO_MAXIMO_TEXTO,
  seGuardaLaGrabacion,
  segundosDeGrabacion,
  textoDuracion,
  validarTexto,
} from '../../captura.js'
import { buscarVacaEnCopia, enviarCola, guardarCaptura } from '../../cola.js'
import { empezarGrabacion, estadoDelPermiso, pedirPermiso, sePuedeGrabar } from '../../grabacion.js'
import { hoyArgentina, textoParidaHace } from '../../historia.js'
import { useSesion } from '../../sesion.jsx'

const LADO_MAYOR_FOTO = 1600
const CALIDAD_FOTO = 0.8
const CADA_CUANTO_RELOJ = 250
const NOTA_PERMISO_DADO = 'Listo. Ahora mantené apretado y hablá.'
const AVISO_MUY_CORTO = 'Mantené apretado mientras hablás'
const AVISO_SIN_GRABADOR = 'Este navegador no puede grabar audio. Podés usar Foto o Escribir.'
const AVISO_GRABACION_VACIA = 'No se grabó nada. Probá de nuevo.'

function enlaceFicha(caravana) {
  return `/celular/vaca/${encodeURIComponent(caravana)}`
}

function cargarImagen(url) {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image()
    imagen.onload = () => resolver(imagen)
    imagen.onerror = rechazar
    imagen.src = url
  })
}

function lienzoAJpeg(lienzo) {
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (foto) => (foto ? resolver(foto) : rechazar(new Error('No se pudo armar el JPEG'))),
      'image/jpeg',
      CALIDAD_FOTO,
    )
  })
}

async function achicarFoto(archivo) {
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = await cargarImagen(url)
    const ladoMayor = Math.max(imagen.naturalWidth, imagen.naturalHeight)
    const escala = Math.min(1, LADO_MAYOR_FOTO / ladoMayor)
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(imagen.naturalWidth * escala)
    lienzo.height = Math.round(imagen.naturalHeight * escala)
    lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
    return await lienzoAJpeg(lienzo)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function datosDeCaptura(modo, texto, foto, audio) {
  if (modo === 'texto') {
    return { tipoCaptura: 'texto', texto: validarTexto(texto).texto, archivo: null, duracion: null }
  }
  if (modo === 'voz') {
    return { tipoCaptura: 'audio', texto: null, archivo: audio.archivo, duracion: audio.duracion }
  }
  return { tipoCaptura: 'foto', texto: null, archivo: foto, duracion: null }
}

function estaLista(modo, texto, foto, audio) {
  if (modo === 'texto') {
    return validarTexto(texto).valido
  }
  return Boolean(modo === 'voz' ? audio : foto)
}

async function abrirMicrofono(alLlegarAlTope) {
  if (!sePuedeGrabar()) {
    return { aviso: AVISO_SIN_GRABADOR }
  }
  const permiso = await estadoDelPermiso()
  if (permiso === 'denied') {
    return { aviso: avisoDeMicrofono('NotAllowedError') }
  }
  if (permiso === 'prompt') {
    await pedirPermiso()
    return {}
  }
  return { terminar: await empezarGrabacion(alLlegarAlTope) }
}

function RelojDeGrabacion() {
  const [inicio] = useState(Date.now)
  const [ahora, cambiarAhora] = useState(Date.now)

  useEffect(() => {
    const reloj = setInterval(() => cambiarAhora(Date.now()), CADA_CUANTO_RELOJ)
    return () => clearInterval(reloj)
  }, [])

  return <p className="reloj-grabacion">Grabando {textoDuracion(Math.floor((ahora - inicio) / 1000))}</p>
}

function BotonHablar({ grabando, alApretar, alSoltar }) {
  return (
    <button
      type="button"
      className={grabando ? 'boton-microfono boton-microfono-grabando' : 'boton-microfono'}
      aria-label={grabando ? 'Grabando' : 'Hablar'}
      onPointerDown={alApretar}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onContextMenu={(evento) => evento.preventDefault()}
    >
      <Microfono />
    </button>
  )
}

function EstadoDeLaGrabacion({ estado, audio, nota }) {
  if (estado === 'grabando') {
    return <RelojDeGrabacion />
  }
  return (
    <>
      {nota && <p className="mensaje-correcto">{nota}</p>}
      {audio && <p className="etiqueta etiqueta-lista audio-listo">Audio grabado, {textoDuracion(audio.duracion)}</p>}
    </>
  )
}

function ModoVoz({ audio, cambiarAudio, cambiarAviso }) {
  const [estado, cambiarEstado] = useState('quieto')
  const [nota, cambiarNota] = useState('')
  const terminarGrabacion = useRef(null)
  const soltado = useRef(false)

  useEffect(() => () => terminarGrabacion.current?.(), [])

  async function apretar(evento) {
    evento.currentTarget.setPointerCapture(evento.pointerId)
    if (estado !== 'quieto') {
      return
    }
    soltado.current = false
    cambiarAviso('')
    cambiarNota('')
    cambiarEstado('preparando')
    try {
      await abrirYEmpezar()
    } catch (error) {
      console.error(error)
      cambiarAviso(avisoDeMicrofono(error.name))
      cambiarEstado('quieto')
    }
  }

  async function abrirYEmpezar() {
    const abierto = await abrirMicrofono(soltar)
    if (abierto.terminar && !soltado.current) {
      terminarGrabacion.current = abierto.terminar
      cambiarEstado('grabando')
      return
    }
    if (abierto.terminar) {
      await abierto.terminar()
    }
    cambiarAviso(abierto.aviso ?? '')
    cambiarNota(abierto.aviso ? '' : NOTA_PERMISO_DADO)
    cambiarEstado('quieto')
  }

  async function soltar() {
    soltado.current = true
    const terminar = terminarGrabacion.current
    if (!terminar) {
      return
    }
    terminarGrabacion.current = null
    try {
      quedarseConLaGrabacion(await terminar())
    } catch (error) {
      console.error(error)
      cambiarAviso(avisoDeMicrofono(error.name))
    } finally {
      cambiarEstado('quieto')
    }
  }

  function quedarseConLaGrabacion({ archivo, milisegundos }) {
    if (!seGuardaLaGrabacion(milisegundos)) {
      cambiarAviso(AVISO_MUY_CORTO)
      return
    }
    if (archivo.size === 0) {
      cambiarAviso(AVISO_GRABACION_VACIA)
      return
    }
    cambiarAudio({ archivo, duracion: segundosDeGrabacion(milisegundos) })
  }

  return (
    <section className="captura captura-voz">
      <h2>Contá qué pasó</h2>
      <p>Por ejemplo: se sirvió con toro, parió macho, se secó, la trataron.</p>
      <BotonHablar grabando={estado === 'grabando'} alApretar={apretar} alSoltar={soltar} />
      <EstadoDeLaGrabacion estado={estado} audio={audio} nota={nota} />
      <p className="ayuda-grabacion">Mantené apretado. Soltá para terminar.</p>
    </section>
  )
}

function ModoTexto({ texto, cambiarTexto }) {
  return (
    <section className="captura">
      <h2 id="titulo-texto">Escribí qué pasó</h2>
      <p>Con pocas palabras alcanza. Por ejemplo: se sirvió con toro, parió macho, se secó.</p>
      <textarea
        className="campo-captura"
        aria-labelledby="titulo-texto"
        value={texto}
        onChange={(evento) => cambiarTexto(evento.target.value)}
        maxLength={LARGO_MAXIMO_TEXTO}
        rows={5}
        autoFocus
      />
      <p className="contador">{contadorLetras(texto)}</p>
      <p>Se guarda en el celular con la fecha y la hora de ahora, y se envía sola cuando vuelva la señal.</p>
    </section>
  )
}

function VistaFoto({ foto, abrirCamara }) {
  const [vistaPrevia, cambiarVistaPrevia] = useState('')

  useEffect(() => {
    if (!foto) {
      return undefined
    }
    const url = URL.createObjectURL(foto)
    cambiarVistaPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  if (!foto || !vistaPrevia) {
    return (
      <button type="button" className="boton boton-destacado boton-captura" onClick={abrirCamara}>
        Sacar o elegir foto
      </button>
    )
  }
  return (
    <figure className="foto-lista">
      <img src={vistaPrevia} alt="Foto sacada" />
      <figcaption className="etiqueta etiqueta-lista">Foto lista</figcaption>
      <Boton tipo="enlace" onClick={abrirCamara}>Sacar otra</Boton>
    </figure>
  )
}

function ModoFoto({ foto, cambiarFoto, cambiarAviso }) {
  const entradaFoto = useRef(null)
  const [preparando, cambiarPreparando] = useState(false)

  async function recibirFoto(evento) {
    const archivo = evento.target.files[0]
    evento.target.value = ''
    if (!archivo) {
      return
    }
    cambiarAviso('')
    cambiarPreparando(true)
    try {
      cambiarFoto(await achicarFoto(archivo))
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer la foto. Sacala de nuevo.')
    } finally {
      cambiarPreparando(false)
    }
  }

  function abrirCamara() {
    entradaFoto.current.click()
  }

  return (
    <section className="captura">
      <h2>Sacá la foto</h2>
      <p>Por ejemplo, la hoja del cuaderno o la planilla del veterinario.</p>
      <input ref={entradaFoto} type="file" accept="image/*" hidden onChange={recibirFoto} />
      {preparando && <p className="cargando">Preparando la foto</p>}
      <VistaFoto foto={foto} abrirCamara={abrirCamara} />
    </section>
  )
}

function CapturaGuardada() {
  return (
    <section className="captura">
      <p className="mensaje-correcto mensaje-guardado">Guardado, pendiente de enviar</p>
      <div className="botones-columna">
        <Link to="/celular" className="boton boton-principal">Registrar otra vaca</Link>
        <Link to="/celular/guardados" className="boton boton-secundario">Ver guardados</Link>
      </div>
    </section>
  )
}

function FormularioCaptura({ modo, animal }) {
  const { usuario } = useSesion()
  const [texto, cambiarTexto] = useState('')
  const [foto, cambiarFoto] = useState(null)
  const [audio, cambiarAudio] = useState(null)
  const [guardando, cambiarGuardando] = useState(false)
  const [guardado, cambiarGuardado] = useState(false)
  const [aviso, cambiarAviso] = useState('')
  const listo = estaLista(modo, texto, foto, audio)

  async function guardar() {
    cambiarGuardando(true)
    cambiarAviso('')
    try {
      await guardarCaptura({ idUsuario: usuario.id_usuario, animal, ...datosDeCaptura(modo, texto, foto, audio) })
      cambiarGuardado(true)
      enviarCola(usuario.id_usuario, false)
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo guardar en el celular. Probá de nuevo.')
    } finally {
      cambiarGuardando(false)
    }
  }

  if (guardado) {
    return <CapturaGuardada />
  }
  return (
    <>
      {modo === 'texto' && <ModoTexto texto={texto} cambiarTexto={cambiarTexto} />}
      {modo === 'foto' && <ModoFoto foto={foto} cambiarFoto={cambiarFoto} cambiarAviso={cambiarAviso} />}
      {modo === 'voz' && <ModoVoz audio={audio} cambiarAudio={cambiarAudio} cambiarAviso={cambiarAviso} />}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <div className="botones botones-guardar">
        <Link to={enlaceFicha(animal.caravana)} className="boton boton-secundario">Cancelar</Link>
        <Boton tipo="principal" onClick={guardar} disabled={!listo || guardando}>
          <Tilde /> Guardar
        </Boton>
      </div>
    </>
  )
}

function TarjetaDeLaVaca({ animal }) {
  return (
    <section className="tarjeta-captura">
      <h1 className="caravana-captura">{animal.caravana}</h1>
      <span className="datos-captura">
        <span>{mostrarPalabra(animal.categoria)}</span>
        {animal.fecha_ultimo_parto && (
          <span>Parida hace {textoParidaHace(animal.fecha_ultimo_parto, hoyArgentina())}</span>
        )}
      </span>
    </section>
  )
}

function Capturar({ modo }) {
  const { caravana } = useParams()
  const caravanaBuscada = normalizarCaravana(caravana)
  const [animal, cambiarAnimal] = useState(null)
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarVaca(caravanaBuscada)
  }, [caravanaBuscada])

  async function cargarVaca(buscada) {
    cambiarCargando(true)
    try {
      const encontrado = await buscarVacaEnCopia(buscada)
      cambiarAnimal(encontrado)
      cambiarAviso(encontrado ? '' : `La caravana ${buscada} no está en el rodeo`)
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer el rodeo guardado en el celular.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla pantalla-celular ficha">
      <Encabezado volver={enlaceFicha(caravanaBuscada)} />
      {cargando && <p className="cargando">Cargando</p>}
      {animal && <TarjetaDeLaVaca animal={animal} />}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {animal && <FormularioCaptura modo={modo} animal={animal} />}
    </main>
  )
}

export default Capturar
