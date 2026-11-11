import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { mostrarPalabra, normalizarCaravana } from '../../animal.js'
import { contadorLetras, LARGO_MAXIMO_TEXTO, validarTexto } from '../../captura.js'
import { buscarVacaEnCopia, guardarCaptura } from '../../cola.js'
import { useSesion } from '../../sesion.jsx'

const LADO_MAYOR_FOTO = 1600
const CALIDAD_FOTO = 0.8

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

function datosDeCaptura(modo, texto, foto) {
  if (modo === 'texto') {
    return { tipoCaptura: 'texto', texto: validarTexto(texto).texto, archivo: null }
  }
  return { tipoCaptura: 'foto', texto: null, archivo: foto }
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
        Abrir la cámara
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
      <input ref={entradaFoto} type="file" accept="image/*" capture="environment" hidden onChange={recibirFoto} />
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
  const [guardando, cambiarGuardando] = useState(false)
  const [guardado, cambiarGuardado] = useState(false)
  const [aviso, cambiarAviso] = useState('')
  const listo = modo === 'texto' ? validarTexto(texto).valido : Boolean(foto)

  async function guardar() {
    cambiarGuardando(true)
    cambiarAviso('')
    try {
      await guardarCaptura({ idUsuario: usuario.id_usuario, animal, ...datosDeCaptura(modo, texto, foto) })
      cambiarGuardado(true)
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
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <div className="botones botones-guardar">
        <Link to={enlaceFicha(animal.caravana)} className="boton boton-secundario">Cancelar</Link>
        <Boton tipo="principal" onClick={guardar} disabled={!listo || guardando}>Guardar</Boton>
      </div>
    </>
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
    <main className="pantalla ficha">
      <Encabezado titulo={caravanaBuscada} volver={enlaceFicha(caravanaBuscada)} />
      {cargando && <p className="cargando">Cargando</p>}
      {animal && <p className="etiquetas"><span className="etiqueta">{mostrarPalabra(animal.categoria)}</span></p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {animal && <FormularioCaptura modo={modo} animal={animal} />}
    </main>
  )
}

export default Capturar
