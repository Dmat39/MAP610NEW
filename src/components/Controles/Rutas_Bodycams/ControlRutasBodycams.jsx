import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Calendar, Clock, MapPin, X, Video } from 'lucide-react';
import './ControlRutasBodycams.css';
import { obtenerBodycams, obtenerHistorialBodycam } from '../../../services/bodycamService';

const ControlRutasBodycams = ({ visible, setVisible, onRutaEncontrada }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [bodycams, setBodycams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBodycam, setSelectedBodycam] = useState('');
  
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

    const desdeISO = new Date(`${fechaDesde}T${horaDesde}:00`).toISOString();
    const hastaISO = new Date(`${fechaHasta}T${horaHasta}:59`).toISOString();

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
    setError(null);
  };

  if (!visible) return null;

  return (
    <div className="control-rutas-bodycams">
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

      {isExpanded && (
        <div className="crb-body">
          <div className="crb-form-group">
            <label><Video size={14} /> Seleccionar Bodycam</label>
            <select 
              value={selectedBodycam} 
              onChange={(e) => setSelectedBodycam(e.target.value)}
              className="crb-select"
            >
              <option value="">-- Seleccione Bodycam --</option>
              {bodycams.map(bc => (
                <option key={bc.codigo} value={bc.codigo}>
                  {bc.nombre} ({bc.codigo})
                </option>
              ))}
            </select>
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
      )}
    </div>
  );
};

export default ControlRutasBodycams;
