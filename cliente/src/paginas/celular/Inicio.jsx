import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { useSenal } from '../../componentes/IndicadorSenal.jsx'
import { buscarPorCaravana, mostrarPalabra, normalizarCaravana } from '../../animal.js'
import { actualizarRodeo, leerCopiaRodeo, textoFechaCopia, ultimasVacas } from '../../cola.js'
import { useSesion } from '../../sesion.jsx'

const SIN_COPIA = { animales: [], fechaCopia: null, actualizada: false }

function lineaDeCopia(copia, conSenal) {
  if (conSenal && copia.actualizada) {
    return ''
  }
  if (copia.fechaCopia) {
    return `Rodeo guardado en el celular ${textoFechaCopia(copia.fechaCopia)}`
  }
  if (!conSenal) {
    return 'Todavía no hay rodeo guardado en el celular. La primera vez hace falta señal.'
  }
  return ''
}

function enlaceVaca(caravana) {
  return `/celular/vaca/${encodeURIComponent(caravana)}`
}

function ResultadoBusqueda({ animales, texto }) {
  if (!texto.trim()) {
    return null
  }
  const encontradas = buscarPorCaravana(animales, texto)
  if (encontradas.length === 0) {
    return <p className="mensaje-aviso">La caravana {normalizarCaravana(texto)} no está en el rodeo</p>
  }
  return (
    <div className="lista-vacas">
      {encontradas.map((animal) => (
        <Link key={animal.caravana} to={enlaceVaca(animal.caravana)} className="boton boton-secundario boton-vaca">
          <span className="caravana">{animal.caravana}</span>
          <span>{mostrarPalabra(animal.categoria)}</span>
        </Link>
      ))}
    </div>
  )
}

function UltimasVacas() {
  const [ultimas] = useState(ultimasVacas)
  if (ultimas.length === 0) {
    return null
  }
  return (
    <section>
      <h2>Últimas vacas</h2>
      <div className="lista-vacas">
        {ultimas.map((caravana) => (
          <Link key={caravana} to={enlaceVaca(caravana)} className="boton boton-secundario boton-vaca">
            <span className="caravana">{caravana}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Inicio() {
  const { usuario, cerrarSesion } = useSesion()
  const conSenal = useSenal()
  const [copia, cambiarCopia] = useState(SIN_COPIA)
  const [texto, cambiarTexto] = useState('')
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    cargarRodeo()
  }, [conSenal])

  async function cargarRodeo() {
    try {
      const guardada = await leerCopiaRodeo()
      cambiarCopia({ ...guardada, actualizada: false })
      cambiarCopia(await actualizarRodeo())
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer el rodeo guardado en el celular.')
    }
  }

  async function salir() {
    cambiarAviso(await cerrarSesion())
  }

  const lineaCopia = lineaDeCopia(copia, conSenal)

  return (
    <main className="pantalla pantalla-inicio">
      <Encabezado titulo="Mi tambo" />
      <label className="campo campo-grande">
        ¿Qué vaca?
        <input
          type="text"
          value={texto}
          onChange={(evento) => cambiarTexto(evento.target.value)}
          placeholder="Escribí la caravana"
          autoComplete="off"
          autoCapitalize="characters"
        />
      </label>
      <p>Elegí la vaca para ver su ficha y registrar lo que pasó.</p>
      <ResultadoBusqueda animales={copia.animales} texto={texto} />
      <UltimasVacas />
      {lineaCopia && <p className="nota-chica">{lineaCopia}</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <footer className="pie-usuario pie-celular">
        <p>{usuario.nombre}, {usuario.rol}</p>
        <Boton tipo="enlace" onClick={salir}>Salir</Boton>
      </footer>
    </main>
  )
}

export default Inicio
