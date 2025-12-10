import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar/Sidebar';
import MapView from './MapView';
import GestionCamarasVecinales from './components/admin/GestionCamarasVecinales';
import GestionCamarasMunicipales from './components/admin/GestionCamarasMunicipales';

const Router = () => {
  return (
    <BrowserRouter>
      <ProtectedRoute>
        <Sidebar />
        <div className="main-content">
          <Routes>
            {/* Ruta principal: Mapa */}
            <Route path="/" element={<MapView />} />

            {/* Rutas de administración */}
            <Route path="/admin/camaras-vecinales" element={<GestionCamarasVecinales />} />
            <Route path="/admin/camaras-municipales" element={<GestionCamarasMunicipales />} />

            {/* Redireccionar cualquier ruta no encontrada a la principal */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default Router;
