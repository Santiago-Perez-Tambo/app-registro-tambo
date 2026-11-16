import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Encabezado from '../../componentes/Encabezado.jsx'
import { Camara, Lapiz, Microfono } from '../../componentes/Iconos.jsx'
import { mostrarPalabra, normalizarCaravana } from '../../animal.js'
import { textoFechaCopia } from '../../captura.js'
import { actualizarRodeo, buscarVacaEnCopia, recordarVaca } from '../../cola.js'
import {
  cuandoFueElEvento,
  datoDelProximo,
  detalleDelEvento,
  estadoDelCalostro,
  hoyArgentina,
  nombreDelEvento,
  textoParidaHace,
} from '../../historia.js'
import { useSesion } from '../../sesion.jsx'

function enlaceCaptura(caravana, modo) {
  return `/celular/vaca/${encodeURIComponent(caravana)}/${modo}`
}

function TarjetaVaca({ animal, hoy }) {
  const proximo = datoDelProximo(animal.alertas ?? [])
  return (
    <section className="tarjeta-vaca">
      <p className="etiquetas">
        <span className="etiqueta">{mostrarPalabra(animal.categoria)}</span>
        <span className="etiqueta">{mostrarPalabra(animal.estado_reproductivo)}</span>
      </p>
      <dl className="tarjetas">
        <div className="tarjeta">
          <dt>Parida hace</dt>
          <dd>{textoParidaHace(animal.fecha_ultimo_parto, hoy)}</dd>
        </div>
        <div className="tarjeta">
          <dt>Partos</dt>
          <dd>{animal.partos ?? '-'}</dd>
        </div>
        <div className="tarjeta">
          <dt>{proximo.rotulo}</dt>
          <dd>{proximo.valor}</dd>
        </div>
      </dl>
    </section>
  )
}

function LineaDeCalostro({ animal, hoy }) {
  const calostro = estadoDelCalostro(animal.fecha_ultimo_parto, { dias_calostro: animal.dias_calostro }, hoy)
  if (!calostro) {
    return null
  }
  return <p className={calostro.conCalostro ? 'mensaje-aviso' : 'mensaje-correcto'}>{calostro.texto}</p>
}

function LoQuePaso({ eventos, hoy }) {
  return (
    <section>
      <h2>Lo que pasó con esta vaca</h2>
      {eventos.length === 0 ? (
        <p>Todavía no tiene eventos confirmados.</p>
      ) : (
        <ul className="lista-eventos">
          {eventos.map((evento) => (
            <li key={evento.id_evento} className="fila-evento">
              <span className="cuando-evento">{cuandoFueElEvento(evento, hoy)}</span>
              <strong>{nombreDelEvento(evento.tipo_evento)}</strong>
              <span>{detalleDelEvento(evento)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DatosVaca({ animal }) {
  const hoy = hoyArgentina()
  return (
    <>
      <TarjetaVaca animal={animal} hoy={hoy} />
      <LineaDeCalostro animal={animal} hoy={hoy} />
      <Link to={enlaceCaptura(animal.caravana, 'hablar')} className="boton boton-principal boton-captura boton-hablar">
        <Microfono /> Hablar
      </Link>
      <div className="botones-captura">
        <Link to={enlaceCaptura(animal.caravana, 'foto')} className="boton boton-secundario boton-captura">
          <Camara /> Foto
        </Link>
        <Link to={enlaceCaptura(animal.caravana, 'escribir')} className="boton boton-secundario boton-captura">
          <Lapiz /> Escribir
        </Link>
      </div>
      <LoQuePaso eventos={animal.ultimos_eventos ?? []} hoy={hoy} />
    </>
  )
}

function FichaVaca() {
  const { usuario } = useSesion()
  const { caravana } = useParams()
  const caravanaBuscada = normalizarCaravana(caravana)
  const [animal, cambiarAnimal] = useState(null)
  const [cargando, cambiarCargando] = useState(true)
  const [aviso, cambiarAviso] = useState('')
  const [nota, cambiarNota] = useState('')

  useEffect(() => {
    buscarVaca(caravanaBuscada)
  }, [caravanaBuscada])

  async function renovarYBuscar(buscada) {
    const copia = await actualizarRodeo()
    if (!copia.actualizada && copia.fechaCopia) {
      cambiarNota(`No se pudo actualizar. Se muestra lo guardado en el celular ${textoFechaCopia(copia.fechaCopia)}.`)
    }
    return buscarVacaEnCopia(buscada)
  }

  async function buscarVaca(buscada) {
    cambiarCargando(true)
    cambiarAviso('')
    cambiarNota('')
    try {
      let encontrado = await buscarVacaEnCopia(buscada)
      cambiarAnimal(encontrado)
      if (navigator.onLine) {
        encontrado = await renovarYBuscar(buscada)
        cambiarAnimal(encontrado)
      }
      if (encontrado) {
        recordarVaca(usuario.id_usuario, buscada)
      } else {
        cambiarAviso(`La caravana ${buscada} no está en el rodeo`)
      }
    } catch (error) {
      console.error(error)
      cambiarAviso('No se pudo leer el rodeo guardado en el celular.')
    } finally {
      cambiarCargando(false)
    }
  }

  return (
    <main className="pantalla pantalla-celular ficha">
      <Encabezado titulo={caravanaBuscada} volver="/celular" />
      {cargando && !animal && <p className="cargando">Cargando</p>}
      {cargando && animal && <p className="nota-chica">Actualizando los datos de la vaca</p>}
      {nota && <p className="nota-chica">{nota}</p>}
      {aviso && <p className="mensaje-aviso">{aviso}</p>}
      {animal && <DatosVaca animal={animal} />}
    </main>
  )
}

export default FichaVaca
