import { useState, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, Smartphone, Search, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { obtenerBodycams } from '../../services/bodycamService';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';

// Importamos el CSS específico de bodycams
import './GestionBodycams.css';

const GestionBodycams = () => {
  const { dark } = useTheme();
  const [bodycams, setBodycams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Paginación y búsqueda locales
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(['ACTIVA', 'INACTIVA', 'DESCONECTADA']);
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
  const filteredBodycams = bodycams.filter(b => {
    // 1. Filtro por búsqueda
    const termMatches = (b.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (b.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtro por estado calculado
    let estadoTexto = 'ACTIVA';
    if (b.ultima_ubicacion) {
      const diffMinutos = (new Date() - new Date(b.ultima_ubicacion)) / (1000 * 60);
      if (diffMinutos > 60) estadoTexto = 'DESCONECTADA';
      else if (diffMinutos > 30) estadoTexto = 'INACTIVA';
    } else {
      estadoTexto = 'DESCONECTADA';
    }

    if (Array.isArray(statusFilter)) {
      if (!statusFilter.includes(estadoTexto)) return false;
    } else {
      if (statusFilter !== 'TODAS' && estadoTexto !== statusFilter) return false;
    }

    return termMatches;
  });

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
    <div className={`gestion-bodycams-container ${dark ? 'dark' : ''}`}>
      
      {/* Tarjeta de Encabezado (Header Card) */}
      <div className="gestion-bodycams-header">
        <div className="bodycams-header-content">
          <div className="bodycams-header-icon">
            <Smartphone size={24} />
          </div>
          <div className="bodycams-header-text">
            <h1>Gestión de Bodycams</h1>
            <p>Administra las bodycams del sistema</p>
          </div>
        </div>
        
        <div className="bodycams-header-actions">
          <button onClick={loadBodycams} className="btn-bodycams-secondary" disabled={loading} title="Actualizar">
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
          {/* Ocultamos botones de Excel o Nueva Cámara si no se requieren por ahora */}
        </div>
      </div>

      {error && (
        <div className="bodycams-alert bodycams-alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="bodycams-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toolbar (Buscador y Contador) */}
      <div className="bodycams-toolbar">
        <div className="bodycams-toolbar-left">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '240px', flexShrink: 0 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#6b7280', pointerEvents: 'none' }} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nombre o código..."
              style={{ width: '100%', padding: '8px 12px 8px 40px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', fontSize: '14px' }}
            />
          </div>

          <div className="filtro-estados-modern" style={{ display: 'flex', gap: '6px' }}>
            {['ACTIVA', 'INACTIVA', 'DESCONECTADA'].map(estado => {
              const isActive = Array.isArray(statusFilter) && statusFilter.includes(estado);
              let color = ''; let bg = ''; let label = '';
              if (estado === 'ACTIVA') { color = '#16a34a'; bg = '#dcfce7'; label = 'Activas'; }
              if (estado === 'INACTIVA') { color = '#ca8a04'; bg = '#fef08a'; label = 'Inactivas'; }
              if (estado === 'DESCONECTADA') { color = '#4b5563'; bg = '#f3f4f6'; label = 'Desc.'; }

              return (
                <button 
                  key={estado}
                  onClick={() => {
                    let nuevos = Array.isArray(statusFilter) ? [...statusFilter] : ['ACTIVA', 'INACTIVA', 'DESCONECTADA'];
                    if (nuevos.includes(estado)) nuevos = nuevos.filter(f => f !== estado);
                    else nuevos.push(estado);
                    setStatusFilter(nuevos);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    border: `1px solid ${isActive ? color : '#d1d5db'}`,
                    background: isActive ? bg : '#fff',
                    color: isActive ? color : '#6b7280'
                  }}>
                  {isActive ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bodycams-toolbar-right">
          <span className="bodycams-count-text">
            Total: <span className="bodycams-count-number">{filteredBodycams.length}</span>
          </span>
        </div>
      </div>

      {/* Contenido / Tabla */}
      <div className="bodycams-content">
        {loading && bodycams.length === 0 ? (
          <div className="bodycams-loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando bodycams...</p>
          </div>
        ) : filteredBodycams.length === 0 ? (
          <div className="bodycams-empty-state">
            <Smartphone size={48} />
            <h3>No se encontraron bodycams</h3>
            <p>{searchTerm ? 'Intenta buscar con otro término' : 'No hay bodycams registradas'}</p>
          </div>
        ) : (
          <>
            <div className="bodycams-table-wrapper">
              <table className="bodycams-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Estado</th>
                    <th>Última Ubicación</th>
                    <th>Coordenadas</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((cam, index) => {
                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    
                    const ahora = new Date();
                    const ultima = new Date(cam.ultima_ubicacion);
                    const diffMinutos = (ahora - ultima) / (1000 * 60);

                    let estadoClase = 'bodycams-badge-active';
                    let estadoTexto = 'ACTIVA';
                    
                    if (diffMinutos > 60 || !cam.ultima_ubicacion) {
                      estadoClase = 'bodycams-badge-disconnected';
                      estadoTexto = 'DESCONECTADA';
                    } else if (diffMinutos > 30) {
                      estadoClase = 'bodycams-badge-inactive';
                      estadoTexto = 'INACTIVA';
                    }

                    return (
                      <tr key={cam.id || cam.codigo}>
                        <td>{globalIndex}</td>
                        <td>
                          <strong>{cam.nombre || 'Sin nombre'}</strong>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {cam.codigo}
                        </td>
                        <td>
                          <span className={`bodycams-badge ${estadoClase}`}>
                            {estadoTexto}
                          </span>
                        </td>
                        <td>
                          {formatDate(cam.ultima_ubicacion)}
                        </td>
                        <td>
                          {cam.latitud && cam.longitud ? (
                            <div className="bodycams-address-cell">
                              <MapPin size={14} />
                              {cam.latitud.toString().substring(0, 8)}, {cam.longitud.toString().substring(0, 8)}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>Sin datos GPS</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <TablePagination 
                currentPage={currentPage}
                totalItems={filteredBodycams.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                onLimitChange={() => {}} /* Local pagination doesn't change limit dynamically yet */
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GestionBodycams;
