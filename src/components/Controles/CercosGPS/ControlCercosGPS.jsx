import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Eye, EyeOff, PenTool, Check, X, AlertTriangle } from 'lucide-react';
import './ControlCercosGPS.css';
import { obtenerZonas, crearZona, actualizarZona, eliminarZona } from '../../../services/zonaService';

const COLORES = ['#6366f1','#22c55e','#ef4444','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

const ControlCercosGPS = ({
  visible,
  dibujando,
  puntosDibujo,
  onIniciarDibujo,
  onCancelarDibujo,
  onZonasChange,
  radiosFuera = [],
  topPosition = 10,
  mapType = 'leaflet',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [colorNueva, setColorNueva] = useState(COLORES[0]);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState('zonas'); // 'zonas' | 'alertas'

  useEffect(() => {
    if (!visible) return;
    cargar();
  }, [visible]);

  useEffect(() => {
    if (onZonasChange) onZonasChange(zonas);
  }, [zonas]);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerZonas();
      setZonas(data);
    } catch {}
    setCargando(false);
  };

  const guardarZona = async () => {
    if (!nombreNueva.trim() || puntosDibujo.length < 3) return;
    setGuardando(true);
    try {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...puntosDibujo, puntosDibujo[0]]],
        },
      });
      const nueva = await crearZona({ nombre: nombreNueva, descripcion: descripcionNueva, geojson, color: colorNueva });
      setZonas(prev => [nueva, ...prev]);
      setNombreNueva('');
      setDescripcionNueva('');
      if (onCancelarDibujo) onCancelarDibujo();
    } catch {}
    setGuardando(false);
  };

  const toggleActivo = async (zona) => {
    try {
      const updated = await actualizarZona(zona.id, { activo: !zona.activo });
      setZonas(prev => prev.map(z => z.id === zona.id ? { ...z, activo: !z.activo } : z));
    } catch {}
  };

  const borrar = async (id) => {
    try {
      await eliminarZona(id);
      setZonas(prev => prev.filter(z => z.id !== id));
    } catch {}
  };

  if (!visible) return null;

  return (
    <div
      className={`ctrl-cg ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}
      style={{ '--cg-top': `${topPosition}px` }}
    >
      <div className="ctrl-cg-header" onClick={() => setIsCollapsed(p => !p)}>
        <div className="header-content">
          <div className="cg-icon">🔷</div>
          <h3>Cercos GPS</h3>
          {radiosFuera.length > 0 && (
            <span className="cg-badge-alerta">{radiosFuera.length}</span>
          )}
          <button className="cg-collapse-btn">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      <div className={`ctrl-cg-content ${isCollapsed ? 'hidden' : ''}`}>
        {/* Tabs */}
        <div className="cg-tabs">
          <button className={`cg-tab ${tab === 'zonas' ? 'activo' : ''}`} onClick={() => setTab('zonas')}>
            Zonas ({zonas.length})
          </button>
          <button className={`cg-tab ${tab === 'alertas' ? 'activo' : ''} ${radiosFuera.length > 0 ? 'con-alerta' : ''}`} onClick={() => setTab('alertas')}>
            Alertas {radiosFuera.length > 0 && `(${radiosFuera.length})`}
          </button>
        </div>

        {tab === 'zonas' && (
          <>
            {/* Dibujar nueva zona */}
            {!dibujando ? (
              <button className="cg-btn-dibujar" onClick={onIniciarDibujo}>
                <PenTool size={14} /> Dibujar nueva zona
              </button>
            ) : (
              <div className="cg-dibujo-panel">
                <div className="cg-dibujo-instruccion">
                  <span>🖊️</span>
                  <span>Haz clic en el mapa para agregar vértices ({puntosDibujo.length} puntos)</span>
                </div>

                {puntosDibujo.length >= 3 && (
                  <>
                    <input
                      className="cg-input"
                      placeholder="Nombre del cerco *"
                      value={nombreNueva}
                      onChange={e => setNombreNueva(e.target.value)}
                    />
                    <input
                      className="cg-input"
                      placeholder="Descripción (opcional)"
                      value={descripcionNueva}
                      onChange={e => setDescripcionNueva(e.target.value)}
                    />
                    <div className="cg-colores">
                      {COLORES.map(c => (
                        <button
                          key={c}
                          className={`cg-color-btn ${colorNueva === c ? 'seleccionado' : ''}`}
                          style={{ background: c }}
                          onClick={() => setColorNueva(c)}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div className="cg-dibujo-acciones">
                  <button
                    className="cg-btn-guardar"
                    disabled={puntosDibujo.length < 3 || !nombreNueva.trim() || guardando}
                    onClick={guardarZona}
                  >
                    <Check size={13} /> {guardando ? 'Guardando...' : 'Guardar zona'}
                  </button>
                  <button className="cg-btn-cancelar" onClick={onCancelarDibujo}>
                    <X size={13} /> Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de zonas */}
            {cargando && <div className="cg-cargando">Cargando zonas...</div>}

            {!cargando && zonas.length === 0 && (
              <div className="cg-vacio">No hay zonas definidas</div>
            )}

            {!cargando && zonas.map(z => (
              <div key={z.id} className={`cg-zona-item ${!z.activo ? 'inactiva' : ''}`}>
                <div className="cg-zona-color" style={{ background: z.color || '#6366f1' }} />
                <div className="cg-zona-info">
                  <div className="cg-zona-nombre">{z.nombre}</div>
                  {z.descripcion && <div className="cg-zona-desc">{z.descripcion}</div>}
                </div>
                <div className="cg-zona-acciones">
                  <button className="cg-icon-btn" onClick={() => toggleActivo(z)} title={z.activo ? 'Ocultar' : 'Mostrar'}>
                    {z.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button className="cg-icon-btn danger" onClick={() => borrar(z.id)} title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'alertas' && (
          <>
            {radiosFuera.length === 0 ? (
              <div className="cg-vacio cg-ok">
                <span style={{ fontSize: '24px' }}>✅</span>
                <span>Todas las radios dentro de sus cercos</span>
              </div>
            ) : (
              <>
                <div className="cg-alerta-header">
                  <AlertTriangle size={16} color="#ef4444" />
                  <span>{radiosFuera.length} radio{radiosFuera.length !== 1 ? 's' : ''} fuera del cerco</span>
                </div>
                <div className="cg-alertas-lista">
                  {radiosFuera.map(r => (
                    <div key={r.issi} className="cg-alerta-item">
                      <div className="cg-alerta-dot" style={{ background: r.hexacolor || '#ef4444' }} />
                      <div className="cg-alerta-info">
                        <div className="cg-alerta-nombre">{r.unicocodigo || `ISSI: ${r.issi}`}</div>
                        <div className="cg-alerta-detalle">{r.tipo} · {r.velocidad} km/h</div>
                      </div>
                      <span className="cg-alerta-badge">FUERA</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ControlCercosGPS;
