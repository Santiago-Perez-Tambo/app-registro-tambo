import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { useSenal } from '../../componentes/IndicadorSenal.jsx'
import { buscarPorCaravana, mostrarPalabra, normalizarCaravana } from '../../animal.js'
import { avisoSalirConPendientes, textoFechaCopia, textoPendientes } from '../../captura.js'
import { actualizarRodeo, contarPendientes, escucharEnvio, leerCopiaRodeo, ultimasVacas } from '../../cola.js'
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

function BuscadorVaca({ animales }) {
  const [texto, cambiarTexto] = useState('')
  return (
    <>
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
      <ResultadoBusqueda animales={animales} texto={texto} />
    </>
  )
}

function FranjaPendientes() {
  const { usuario } = useSesion()
  const [cantidad, cambiarCantidad] = useState(0)
  const [aviso, cambiarAviso] = useState('')

  useEffect(() => {
    async function contarGuardados() {
      try {
        cambiarCantidad(await contarPendientes(usuario.id_usuario))
      } catch (error) {
        console.error(error)
        cambiarAviso('No se pudieron leer los registros guardados en el celular.')
      }
    }
    return escucharEnvio(contarGuardados)
  }, [usuario.id_usuario])

  if (aviso) {
    return <p className="mensaje-aviso">{aviso}</p>
  }
  if (cantidad === 0) {
    return null
  }
  return (
    <p className="franja-pendientes">
      <span>{textoPendientes(cantidad)}</span>
      <Link to="/celular/guardados">Ver</Link>
    </p>
  )
}

function PieSalir() {
  const { usuario, cerrarSesion } = useSesion()
  const [salirIgual, cambiarSalirIgual] = useState(false)
  const [aviso, cambiarAviso] = useState('')

  async function salir() {
    try {
      const pendientes = await contarPendientes(usuario.id_usuario)
      if (pendientes > 0 && !salirIgual) {
        cambiarAviso(avisoSalirConPendientes(pendientes))
        cambiarSalirIgual(true)
        return
      }
    } catch (error) {
      console.error(error)
    }
    cambiarAviso(await cerrarSesion())
  }

  return (
    <footer className="pie-usuario pie-celular">
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <p>{usuario.nombre}, {usuario.rol}</p>
      <Boton tipo="enlace" onClick={salir}>{salirIgual ? 'Salir igual' : 'Salir'}</Boton>
    </footer>
  )
}

function Inicio() {
  const conSenal = useSenal()
  const [copia, cambiarCopia] = useState(SIN_COPIA)
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

  const lineaCopia = lineaDeCopia(copia, conSenal)

  return (
    <main className="pantalla pantalla-inicio">
      <Encabezado titulo="Mi tambo" />
      <FranjaPendientes />
      <BuscadorVaca animales={copia.animales} />
      <UltimasVacas />
      <p>
        <Link to="/celular/guardados" className="boton boton-enlace">Registros guardados</Link>
      </p>
      {lineaCopia && <p className="nota-chica">{lineaCopia}</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      <PieSalir />
    </main>
  )
}

export default Inicio
