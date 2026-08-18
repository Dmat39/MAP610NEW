import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Calendar, Clock, MapPin, X, Video, Search } from 'lucide-react';
import './ControlRutasBodycams.css';
import { obtenerBodycams, obtenerHistorialBodycam } from '../../../services/bodycamService';

const ControlRutasBodycams = ({ visible, setVisible, onRutaEncontrada, embedded = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [bodycams, setBodycams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBodycam, setSelectedBodycam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Por defecto buscamos el día de hoy
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [horaDesde, setHoraDesde] = useState('00:00');
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [horaHasta, setHoraHasta] = useState('23:59');

  useEffect(() => {
    if (visible) {
      cargarBodycams();
    }
  }, [visible]);

  const cargarBodycams = async () => {
    try {
      const data = await obtenerBodycams();
      setBodycams(data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar lista de bodycams.');
    }
  };

  const handleBuscar = async () => {
    if (!selectedBodycam) {
      setError('Selecciona una bodycam primero.');
      return;
    }

    setLoading(true);
    setError(null);
    onRutaEncontrada(null); // Limpiamos la ruta actual antes de buscar

    const desdeISO = `${fechaDesde} ${horaDesde}:00`;
    const hastaISO = `${fechaHasta} ${horaHasta}:59`;

    try {
      const data = await obtenerHistorialBodycam(selectedBodycam, desdeISO, hastaISO);
      
      if (data && data.ubicaciones && data.ubicaciones.length > 0) {
        onRutaEncontrada(data);
        setError(null);
        setIsExpanded(false); // Minimizamos para dejar ver el mapa
      } else {
        setError('No hay recorrido para esa fecha y hora.');
        onRutaEncontrada(null);
      }
    } catch (err) {
      setError('Error al consultar el historial.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    onRutaEncontrada(null);
    setSelectedBodycam('');
    setSearchTerm('');
    setError(null);
  };

  const filteredBodycams = bodycams.filter(bc => 
    (bc.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (bc.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!visible) return null;

  const bodyShown = embedded || isExpanded;

  return (
    <div className="control-rutas-bodycams">
      {!embedded && (
        <div
          className="crb-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="crb-title">
            <MapPin size={18} color="#f97316" />
            <span>Historial Recorridos Bodycams</span>
          </div>
          <div className="crb-actions">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <button
              className="crb-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
                onRutaEncontrada(null);
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {bodyShown && (
        <div className="crb-body">
          <div className="crb-form-group" style={{ position: 'relative' }}>
            <label><Video size={14} /> Seleccionar Bodycam</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (e.target.value === '') setSelectedBodycam('');
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Escribe para buscar..."
                className="crb-select crb-search-input"
                style={{ width: '100%', paddingLeft: '32px' }}
              />
            </div>
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'white', border: '1px solid #ccc', borderRadius: '4px',
                maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                marginTop: '4px'
              }}>
                {filteredBodycams.map(bc => (
                  <div 
                    key={bc.codigo}
                    style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#374151' }}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Evita que el onBlur dispare antes
                      setSelectedBodycam(bc.codigo);
                      setSearchTerm(`${bc.nombre} (${bc.codigo})`);
                      setShowDropdown(false);
                    }}
                  >
                    <strong>{bc.nombre || 'Sin nombre'}</strong> <span style={{color: '#9ca3af'}}>({bc.codigo})</span>
                  </div>
                ))}
                {filteredBodycams.length === 0 && (
                  <div style={{ padding: '8px 10px', fontSize: '13px', color: '#9ca3af' }}>No se encontraron coincidencias.</div>
                )}
              </div>
            )}
          </div>

          <div className="crb-row">
            <div className="crb-form-group">
              <label><Calendar size={14} /> Desde (Fecha)</label>
              <input 
                type="date" 
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="crb-input"
              />
            </div>
            <div className="crb-form-group">
              <label><Clock size={14} /> Desde (Hora)</label>
              <input 
                type="time" 
                value={horaDesde}
                onChange={(e) => setHoraDesde(e.target.value)}
                className="crb-input"
              />
            </div>
          </div>

          <div className="crb-row">
            <div className="crb-form-group">
              <label><Calendar size={14} /> Hasta (Fecha)</label>
              <input 
                type="date" 
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="crb-input"
              />
            </div>
            <div className="crb-form-group">
              <label><Clock size={14} /> Hasta (Hora)</label>
              <input 
                type="time" 
                value={horaHasta}
                onChange={(e) => setHoraHasta(e.target.value)}
                className="crb-input"
              />
            </div>
          </div>

          {error && <div className="crb-error">{error}</div>}

          <div className="crb-buttons">
            <button className="crb-btn-secondary" onClick={handleLimpiar}>
              Limpiar
            </button>
            <button 
              className="crb-btn-primary" 
              onClick={handleBuscar}
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Trazar Recorrido'}
            </button>
          </div>
        </div>
    </div>
  );
};

export default ControlRutasBodycams;
