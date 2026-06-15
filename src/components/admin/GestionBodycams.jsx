import { useState, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, Smartphone } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { obtenerBodycams } from '../../services/bodycamService';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionBodycams.css';

const GestionBodycams = () => {
  const { dark } = useTheme();
  const [bodycams, setBodycams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Paginación y búsqueda locales
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadBodycams();
  }, []);

  const loadBodycams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerBodycams();
      setBodycams(Array.isArray(data) ? data : (data.value || []));
    } catch (err) {
      setError(err.message || 'Error al obtener las bodycams');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado local
  const filteredBodycams = bodycams.filter(b => 
    (b.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBodycams.length / ITEMS_PER_PAGE);
  const currentItems = filteredBodycams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (isoString) => {
    if (!isoString) return 'Sin registros';
    return new Date(isoString).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className={`admin-container ${dark ? 'dark' : ''}`}>
      <div className="admin-header">
        <div className="header-title">
          <Smartphone size={24} className="header-icon" />
          <div>
            <h1>Listado de Bodycams</h1>
            <p>Visualiza todas las bodycams registradas en el sistema GPS</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadBodycams} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="admin-content-box">
        <div className="table-controls">
          <SearchInput 
            value={searchTerm} 
            onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            placeholder="Buscar por nombre o código..." 
          />
          <div className="table-info">
            Total encontradas: <strong>{filteredBodycams.length}</strong>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Código Dispositivo</th>
                <th>Estado</th>
                <th>Última Ubicación</th>
                <th>Latitud / Longitud</th>
              </tr>
            </thead>
            <tbody>
              {loading && bodycams.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>Cargando bodycams...</td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((cam) => (
                  <tr key={cam.id || cam.codigo}>
                    <td>{cam.id || '-'}</td>
                    <td><strong>{cam.nombre || 'Sin nombre'}</strong></td>
                    <td style={{fontFamily:'monospace'}}>{cam.codigo}</td>
                    <td>
                      <span className={`status-badge ${cam.activa ? 'active' : 'inactive'}`}>
                        {cam.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{fontSize:'0.85rem'}}>{formatDate(cam.ultima_ubicacion)}</td>
                    <td style={{fontSize:'0.85rem'}}>
                      {cam.latitud && cam.longitud ? (
                        <div style={{display:'flex', alignItems:'center', gap:'4px', color:'#2563eb'}}>
                          <MapPin size={14} />
                          {cam.latitud.toString().substring(0, 8)}, {cam.longitud.toString().substring(0, 8)}
                        </div>
                      ) : (
                        <span style={{color:'#9ca3af'}}>Sin datos GPS</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>
                    No se encontraron bodycams {searchTerm ? 'con esa búsqueda' : 'registradas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <TablePagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default GestionBodycams;
