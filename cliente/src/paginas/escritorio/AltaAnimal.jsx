import { useState } from 'react'
import { Link } from 'react-router-dom'
import Boton from '../../componentes/Boton.jsx'
import Encabezado from '../../componentes/Encabezado.jsx'
import { CATEGORIAS, ESTADOS, mostrarPalabra, validarAlta } from '../../animal.js'
import { useSesion } from '../../sesion.jsx'
import { altaAnimal } from '../../supabase.js'

const FORMULARIO_VACIO = {
  caravana: '',
  categoria: '',
  estado_reproductivo: '',
  fecha_nacimiento: '',
  fecha_ingreso: '',
  madre: '',
}
const SIN_AVISO = { campo: '', mensaje: '' }

function avisoDeError(error) {
  if (error.campo) {
    return { campo: error.campo, mensaje: error.message }
  }
  return { campo: '', mensaje: 'No se pudo guardar el animal. Revisá la conexión y probá de nuevo.' }
}

function Campo({ etiqueta, aclaracion, aviso, children }) {
  return (
    <label className="campo">
      {etiqueta}
      {children}
      {aclaracion && <span className="aclaracion">{aclaracion}</span>}
      {aviso && <span className="mensaje-aviso">{aviso}</span>}
    </label>
  )
}

function CamposDelAnimal({ formulario, aviso, alCambiar }) {
  const avisoDe = (campo) => (aviso.campo === campo ? aviso.mensaje : '')
  return (
    <>
      <Campo etiqueta="Caravana" aviso={avisoDe('caravana')}>
        <input name="caravana" value={formulario.caravana} onChange={alCambiar} autoComplete="off" required />
      </Campo>
      <Campo etiqueta="Categoría">
        <select name="categoria" value={formulario.categoria} onChange={alCambiar} required>
          <option value="">Elegí la categoría</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>{mostrarPalabra(categoria)}</option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Estado reproductivo">
        <select name="estado_reproductivo" value={formulario.estado_reproductivo} onChange={alCambiar}>
          <option value="">Sin servicio</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>{mostrarPalabra(estado)}</option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Fecha de nacimiento">
        <input type="date" name="fecha_nacimiento" value={formulario.fecha_nacimiento} onChange={alCambiar} />
      </Campo>
      <Campo etiqueta="Fecha de ingreso al rodeo">
        <input type="date" name="fecha_ingreso" value={formulario.fecha_ingreso} onChange={alCambiar} />
      </Campo>
      <Campo
        etiqueta="Madre (caravana)"
        aclaracion="Opcional. El sistema la busca en el rodeo y la vincula a esta cría."
        aviso={avisoDe('madre')}
      >
        <input name="madre" value={formulario.madre} onChange={alCambiar} autoComplete="off" />
      </Campo>
    </>
  )
}

function AltaAnimal() {
  const { usuario } = useSesion()
  const [formulario, cambiarFormulario] = useState(FORMULARIO_VACIO)
  const [aviso, cambiarAviso] = useState(SIN_AVISO)
  const [listo, cambiarListo] = useState('')
  const [guardando, cambiarGuardando] = useState(false)

  function cambiarCampo(evento) {
    cambiarFormulario({ ...formulario, [evento.target.name]: evento.target.value })
  }

  async function guardarAnimal(evento) {
    evento.preventDefault()
    cambiarListo('')
    const error = validarAlta(formulario)
    if (error) {
      cambiarAviso({ campo: '', mensaje: error })
      return
    }
    cambiarGuardando(true)
    try {
      const caravana = await altaAnimal(formulario, usuario.id_establecimiento)
      cambiarAviso(SIN_AVISO)
      cambiarFormulario(FORMULARIO_VACIO)
      cambiarListo(`Listo: ${caravana} quedó en el rodeo. Aparece en el buscador del celular del tambero.`)
    } catch (errorDeAlta) {
      console.error(errorDeAlta)
      cambiarAviso(avisoDeError(errorDeAlta))
    } finally {
      cambiarGuardando(false)
    }
  }

  return (
    <main className="pantalla">
      <p className="migas"><Link to="/escritorio/rodeo">Rodeo</Link> / Nuevo animal</p>
      <Encabezado titulo="Nuevo animal" />
      <form className="formulario" onSubmit={guardarAnimal} noValidate>
        <h2>Datos del animal</h2>
        <CamposDelAnimal formulario={formulario} aviso={aviso} alCambiar={cambiarCampo} />
        {aviso.mensaje && !aviso.campo && <p className="mensaje-aviso">{aviso.mensaje}</p>}
        {listo && <p className="mensaje-correcto">{listo}</p>}
        <div className="botones">
          <Link to="/escritorio/rodeo" className="boton boton-secundario">Cancelar</Link>
          <Boton tipo="principal" type="submit" disabled={guardando}>
            {guardando ? 'Guardando' : 'Guardar animal'}
          </Boton>
        </div>
      </form>
    </main>
  )
}

export default AltaAnimal
