import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import Boton from '../componentes/Boton.jsx'
import Encabezado from '../componentes/Encabezado.jsx'
import { pantallaInicial } from '../permisos.js'
import { useSesion } from '../sesion.jsx'

function Ingreso() {
  const { usuario, aviso, iniciarSesion } = useSesion()
  const [correo, cambiarCorreo] = useState('')
  const [contrasena, cambiarContrasena] = useState('')
  const [entrando, cambiarEntrando] = useState(false)

  async function entrar(evento) {
    evento.preventDefault()
    cambiarEntrando(true)
    await iniciarSesion(correo, contrasena)
    cambiarEntrando(false)
  }

  if (usuario) {
    return <Navigate to={pantallaInicial(usuario.rol)} replace />
  }

  return (
    <main className="pantalla">
      <Encabezado titulo="Mi tambo" />
      <p className="subtitulo">Registro de eventos del rodeo</p>
      <form className="formulario" onSubmit={entrar}>
        <label className="campo">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(evento) => cambiarCorreo(evento.target.value)}
            placeholder="nombre@correo.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="campo">
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(evento) => cambiarContrasena(evento.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {aviso && <p className="mensaje-aviso">{aviso}</p>}
        <Boton tipo="principal" type="submit" disabled={entrando}>
          {entrando ? 'Entrando' : 'Entrar'}
        </Boton>
      </form>
      <p className="pie-ingreso">
        El sistema recuerda el ingreso en este celular. Cada usuario ve lo que le corresponde según su rol.
      </p>
    </main>
  )
}

export default Ingreso
