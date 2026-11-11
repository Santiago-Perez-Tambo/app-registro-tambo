import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
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

function RutaProtegida() {
  const { usuario } = useSesion()
  const { pathname } = useLocation()

  if (!usuario) {
    return <Navigate to="/ingreso" replace />
  }
  if (!puedeEntrar(usuario.rol, pathname)) {
    return (
      <Navigate
        to={pantallaInicial(usuario.rol)}
        replace
        state={{ aviso: 'Esta pantalla no está disponible para tu usuario' }}
      />
    )
  }
  return <Outlet />
}

function DisenoEscritorio() {
  return (
    <div className="diseno-escritorio">
      <MenuLateral />
      <Outlet />
    </div>
  )
}

function App() {
  return (
    <SesionProveedor>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/ingreso" replace />} />
          <Route path="/ingreso" element={<Ingreso />} />
          <Route element={<RutaProtegida />}>
            <Route path="/celular" element={<Inicio />} />
            <Route path="/celular/vaca/:caravana" element={<FichaVaca />} />
            <Route path="/celular/capturar" element={<Capturar />} />
            <Route path="/celular/guardados" element={<Guardados />} />
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
