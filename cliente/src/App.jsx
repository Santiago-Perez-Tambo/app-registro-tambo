import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import EnvioAutomatico from './componentes/EnvioAutomatico.jsx'
import MenuLateral from './componentes/MenuLateral.jsx'
import Ingreso from './paginas/Ingreso.jsx'
import Capturar from './paginas/celular/Capturar.jsx'
import FichaVaca from './paginas/celular/FichaVaca.jsx'
import Guardados from './paginas/celular/Guardados.jsx'
import Inicio from './paginas/celular/Inicio.jsx'
import AltaAnimal from './paginas/escritorio/AltaAnimal.jsx'
import Avisos from './paginas/escritorio/Avisos.jsx'
import Historia from './paginas/escritorio/Historia.jsx'
import PorConfirmar from './paginas/escritorio/PorConfirmar.jsx'
import Rodeo from './paginas/escritorio/Rodeo.jsx'
import { pantallaInicial, puedeEntrar } from './permisos.js'
import { SesionProveedor, useSesion } from './sesion.jsx'
import { contarPorConfirmar } from './supabase.js'

function RutaProtegida() {
  const { usuario } = useSesion()
  const { pathname } = useLocation()

  if (!usuario) {
    return <Navigate to="/ingreso" replace />
  }
  if (!puedeEntrar(usuario.rol, pathname)) {
    return (
      <Navigate
        to={pantallaInicial(usuario.rol, window.innerWidth)}
        replace
        state={{ aviso: 'Esta pantalla no está disponible para tu usuario' }}
      />
    )
  }
  return <Outlet />
}

function DisenoEscritorio() {
  const [cantidadPorConfirmar, cambiarCantidadPorConfirmar] = useState(0)

  useEffect(() => {
    contarAlEntrar()
  }, [])

  async function contarAlEntrar() {
    try {
      cambiarCantidadPorConfirmar(await contarPorConfirmar())
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="diseno-escritorio">
      <MenuLateral cantidadPorConfirmar={cantidadPorConfirmar} />
      <Outlet context={{ cambiarCantidadPorConfirmar }} />
    </div>
  )
}

function DisenoCelular() {
  const { usuario } = useSesion()
  if (puedeEntrar(usuario.rol, '/escritorio')) {
    return <DisenoEscritorio />
  }
  return <Outlet />
}

function App() {
  return (
    <SesionProveedor>
      <BrowserRouter>
        <EnvioAutomatico />
        <Routes>
          <Route path="/" element={<Navigate to="/ingreso" replace />} />
          <Route path="/ingreso" element={<Ingreso />} />
          <Route element={<RutaProtegida />}>
            <Route path="/celular" element={<DisenoCelular />}>
              <Route index element={<Inicio />} />
              <Route path="vaca/:caravana" element={<FichaVaca />} />
              <Route path="vaca/:caravana/escribir" element={<Capturar modo="texto" />} />
              <Route path="vaca/:caravana/foto" element={<Capturar modo="foto" />} />
              <Route path="guardados" element={<Guardados />} />
            </Route>
            <Route path="/escritorio" element={<DisenoEscritorio />}>
              <Route index element={<Navigate to="por-confirmar" replace />} />
              <Route path="por-confirmar" element={<PorConfirmar />} />
              <Route path="avisos" element={<Avisos />} />
              <Route path="rodeo" element={<Rodeo />} />
              <Route path="rodeo/nuevo" element={<AltaAnimal />} />
              <Route path="vaca/:caravana" element={<Historia />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/ingreso" replace />} />
        </Routes>
      </BrowserRouter>
    </SesionProveedor>
  )
}

export default App
