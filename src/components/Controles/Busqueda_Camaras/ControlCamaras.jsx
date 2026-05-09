import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, MapPin, Zap, AlertTriangle, Camera, X, Target } from 'lucide-react';
import './ControlCamaras.css';
import { logger } from '../../../utils/logger.js';
import camarasService from '../../../services/camarasService';
import { obtenerJurisdiccion, normalizarNombreJurisdiccion } from '../../../utils/geoUtils';

const ControlCamaras = ({
  visible,
  onCamaraSeleccionada,
  onFiltroAplicado,
  onSeguimientoCamara,
  onLimpiarSeguimiento,
  onLimpiarSeleccion,
  mapType = 'leaflet',
  isViewer = false,
  topPosition = 10,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const panelRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [camaras, setCamaras] = useState([]);
  const [filtros, setFiltros] = useState({
    megafono: false,
    boton: false,
    lpr: false,
    jurisdicciones: [],
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaBusqueda, setUltimaBusqueda] = useState('');
  const [jurisdiccionesCollapsed, setJurisdiccionesCollapsed] = useState(false);
  const [jurisdiccionesGeoJSON, setJurisdiccionesGeoJSON] = useState(null);

  // Helpers de búsqueda robusta
  const normalize = str =>
    (str || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  const compactAlnum = str => normalize(str).replace(/[^a-z0-9]/g, '');

  const tokenize = str =>
    normalize(str)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

  const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const findCamaraByTerm = (term, lista) => {
    const nterm = normalize(term);
    if (!nterm) return null;

    const termCompact = compactAlnum(nterm);
    const termBoundaryRe = new RegExp(`(^|[^a-z0-9])${escapeRegex(nterm)}(?=$|[^a-z0-9])`, 'i');

    // 1) Coincidencias fuertes sobre el nombre
    const candidatasFuertes = lista.filter(c => {
      const nameNorm = normalize(c.name);
      const nameCompact = compactAlnum(c.name);
      const nameTokens = tokenize(c.name);

      return (
        nameNorm === nterm ||
        nameCompact === termCompact ||
        nameTokens.includes(nterm) ||
        nameNorm.startsWith(nterm) ||
        termBoundaryRe.test(nameNorm)
      );
    });

    if (candidatasFuertes.length > 0) {
      // Ordenar por prioridad: exacta, compacta, token, startsWith, boundary
      const score = c => {
        const nameNorm = normalize(c.name);
        const nameCompact = compactAlnum(c.name);
        const nameTokens = tokenize(c.name);
        if (nameNorm === nterm) return 100;
        if (nameCompact === termCompact) return 95;
        if (nameTokens.includes(nterm)) return 90;
        if (nameNorm.startsWith(nterm)) return 85;
        if (termBoundaryRe.test(nameNorm)) return 80;
        return 0;
      };
      return candidatasFuertes.sort((a, b) => score(b) - score(a))[0];
    }

    // 2) Fallbacks: dirección y jurisdicción por palabra completa
    const candidatasCampos = lista.filter(c => {
      const dirNorm = normalize(c.direccion);
      const jurNorm = normalize(c.jurisdiccion);
      return termBoundaryRe.test(dirNorm) || termBoundaryRe.test(jurNorm);
    });
    if (candidatasCampos.length > 0) return candidatasCampos[0];

    // 3) Último recurso: includes en otros campos (no usar includes en name para evitar falsos positivos como 578A vs 78A)
    const candidatasSuaves = lista.filter(c => {
      const dirNorm = normalize(c.direccion);
      const jurNorm = normalize(c.jurisdiccion);
      return dirNorm.includes(nterm) || jurNorm.includes(nterm);
    });
    if (candidatasSuaves.length > 0) return candidatasSuaves[0];

    return null;
  };

  // Lista de jurisdicciones disponibles
  const jurisdiccionesDisponibles = [
    '10 de Octubre',
    'Zarate',
    'Mariscal Caceres',
    'Bayovar',
    'Santa Elizabeth',
    'Canto Rey',
    'Huayrona',
    'Caja de Agua',
  ];

  // Cargar datos de jurisdicciones al montar el componente
  useEffect(() => {
    fetch('/data/juridiccion.geojson')
      .then(res => res.json())
      .then(data => {
        setJurisdiccionesGeoJSON(data);
        logger.log('✅ Jurisdicciones GeoJSON cargadas para filtro');
      })
      .catch(err => logger.error('❌ Error cargando jurisdicciones:', err));
  }, []);

  // Cargar datos de cámaras al montar el componente
  useEffect(() => {
    if (visible && jurisdiccionesGeoJSON) {
      cargarCamaras();
    }
  }, [visible, jurisdiccionesGeoJSON]);

  // Aplicar filtros cuando cambien los filtros
  useEffect(() => {
    aplicarFiltros();
  }, [camaras, filtros]);

  const cargarCamaras = async () => {
    setCargando(true);
    setError(null);

    try {
      const resultado = await camarasService.getCamarasMunicipales(0);
      logger.log(`✅ ${resultado.count} cámaras municipales cargadas desde el backend`);

      // Transformar datos de la API al formato esperado por el componente
      const camarasData = resultado.camaras.map((camara, index) => {
        // Mapeo correcto de tipos de cámara
        let tipo, anguloVision;
        switch (camara.camera) {
          case 'C180':
            tipo = 'TIPO I';
            anguloVision = '180';
            break;
          case 'C360':
            tipo = 'TIPO II';
            anguloVision = '360';
            break;
          case 'LPR':
            tipo = 'TIPO III';
            anguloVision = 'LPR';
            break;
          default:
            tipo = 'TIPO I';
            anguloVision = '180';
        }

        // Determinar jurisdicción basada en coordenadas
        const jurisdiccionRaw = obtenerJurisdiccion(
          camara.latitude,
          camara.longitude,
          jurisdiccionesGeoJSON
        );
        const jurisdiccion = normalizarNombreJurisdiccion(jurisdiccionRaw) || 'Sin Jurisdicción';

        return {
          id: camara.id || index,
          name: camara.name || `Cámara ${index + 1}`,
          direccion: camara.address || 'Sin dirección',
          tipo: tipo,
          jurisdiccion: jurisdiccion,
          megafono: Boolean(camara.megaphone),
          boton: Boolean(camara.buttom),
          lat: camara.latitude,
          lng: camara.longitude,
          properties: {
            name: camara.name,
            direccion: camara.address,
            camara: anguloVision,
            cameraModel: camara.camera,
            megafono: camara.megaphone,
            boton: camara.buttom,
            jurisdiccion: jurisdiccion,
          },
        };
      });

      setCamaras(camarasData);
      logger.log(`📷 Cargadas ${camarasData.length} cámaras municipales`);
    } catch (err) {
      logger.error('❌ Error cargando cámaras:', err);
      setError(`Error: ${err.message}`);

      // Si hay error de autenticación, informar al usuario
      if (err.message.includes('Sesión expirada') || err.message.includes('autenticación')) {
        setError('⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...camaras];

    // Filtros de características: lógica OR (muestra si cumple CUALQUIERA de los activos)
    const hayFiltroCaracteristica = filtros.megafono || filtros.boton || filtros.lpr;
    if (hayFiltroCaracteristica) {
      resultado = resultado.filter(camara => {
        if (filtros.megafono && camara.megafono) return true;
        if (filtros.boton && camara.boton) return true;
        if (filtros.lpr && camara.tipo === 'TIPO III') return true;
        return false;
      });
    }

    // Filtro por jurisdicciones: AND con características (acota por zona)
    if (filtros.jurisdicciones.length > 0) {
      resultado = resultado.filter(camara => filtros.jurisdicciones.includes(camara.jurisdiccion));
    }

    if (onFiltroAplicado) {
      onFiltroAplicado(resultado, filtros);
    }
  };

  const buscarCamara = () => {
    if (!busqueda.trim()) {
      setError('Ingresa el número de la cámara');
      return;
    }

    const camaraEncontrada = findCamaraByTerm(busqueda, camaras);

    if (camaraEncontrada) {
      setUltimaBusqueda(busqueda);
      setError(null);

      // Notificar al componente padre para navegar a la cámara
      if (onCamaraSeleccionada) {
        onCamaraSeleccionada(camaraEncontrada);
      }
    } else {
      setError(`No se encontró la cámara: "${busqueda}"`);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarCamara();
    }
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    setUltimaBusqueda('');
    setError(null);
    setFiltros({ megafono: false, boton: false, lpr: false, jurisdicciones: [] });

    // Limpiar la cámara seleccionada
    if (onLimpiarSeleccion) {
      onLimpiarSeleccion();
    }

    // Limpiar seguimiento si existe
    if (onLimpiarSeguimiento) {
      onLimpiarSeguimiento();
    }
  };

  const iniciarSeguimiento = () => {
    if (!ultimaBusqueda) return;

    // Buscar la cámara por el término de búsqueda (misma lógica robusta)
    const camaraEncontrada = findCamaraByTerm(ultimaBusqueda, camaras);

    if (camaraEncontrada && onSeguimientoCamara) {
      // Notificar al componente padre para iniciar el seguimiento
      onSeguimientoCamara(camaraEncontrada);
    } else {
      setError('No se pudo iniciar el seguimiento para esta cámara');
    }
  };

  const toggleFiltro = tipo => {
    setFiltros(prev => ({
      ...prev,
      [tipo]: !prev[tipo],
    }));
  };

  const handleJurisdiccionChange = e => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setFiltros(prev => ({
      ...prev,
      jurisdicciones: isChecked
        ? [...prev.jurisdicciones, value]
        : prev.jurisdicciones.filter(j => j !== value),
    }));
  };

  // Limpia toda la búsqueda, filtros y selección del mapa
  const limpiarTodo = () => {
    setBusqueda('');
    setUltimaBusqueda('');
    setError(null);
    setFiltros({ megafono: false, boton: false, lpr: false, jurisdicciones: [] });
    if (onLimpiarSeleccion) onLimpiarSeleccion();
    if (onLimpiarSeguimiento) onLimpiarSeguimiento();
  };

  const toggleCollapse = () => {
    if (!isCollapsed) limpiarTodo(); // al colapsar, limpiar todo
    setIsCollapsed(prev => !prev);
  };

  const toggleJurisdiccionesCollapse = () => {
    setJurisdiccionesCollapsed(!jurisdiccionesCollapsed);
  };

  // Click fuera del panel: colapsar y limpiar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !isCollapsed) {
        limpiarTodo();
        setIsCollapsed(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, onLimpiarSeleccion, onLimpiarSeguimiento]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className={`control-camaras ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}
      style={{ '--cc-top': `${topPosition}px` }}
    >
      <div className="control-camaras-header" onClick={toggleCollapse}>
        <div className="header-content">
          <Camera size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
          <h3>Búsqueda de Cámaras</h3>
          <button className="collapse-btn">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      <div className={`control-camaras-content ${isCollapsed ? 'hidden' : ''}`}>
        {/* Barra de búsqueda principal */}
        <div className="busqueda-principal">
          <div className="input-group">
            <div className="input-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ingresa nombre o número de cámara..."
                className="busqueda-input"
                disabled={cargando}
                style={{
                  color: '#1f2937',
                  WebkitTextFillColor: '#1f2937',
                  background: '#ffffff',
                  caretColor: '#16a34a',
                }}
              />
            </div>
            <button
              onClick={buscarCamara}
              disabled={cargando || !busqueda.trim()}
              className="btn-buscar"
              title="Buscar cámara (Enter)"
            >
              <MapPin size={16} />
            </button>
          </div>

          {ultimaBusqueda && (
            <div className="ultima-busqueda">
              <span className="busqueda-label">Última búsqueda:</span>
              <span className="busqueda-valor">"{ultimaBusqueda}"</span>
            </div>
          )}
        </div>

        {/* Filtros compactos */}
        {!isViewer && (
          <div className="filtros-compactos">
            <div className="filtros-titulo">
              <Filter size={14} />
              <span>Filtros rápidos</span>
            </div>
            <div className="filtros-botones">
              <button
                className={`filtro-btn ${filtros.megafono ? 'activo' : ''}`}
                onClick={() => toggleFiltro('megafono')}
                title="Mostrar solo cámaras con megáfono"
              >
                <Zap size={14} />
                <span>Megáfono</span>
                {filtros.megafono && (
                  <span className="filtro-count">{camaras.filter(c => c.megafono).length}</span>
                )}
              </button>

              <button
                className={`filtro-btn ${filtros.boton ? 'activo' : ''}`}
                onClick={() => toggleFiltro('boton')}
                title="Mostrar solo cámaras con botón de pánico"
              >
                <AlertTriangle size={14} />
                <span>Botón Pánico</span>
                {filtros.boton && (
                  <span className="filtro-count">{camaras.filter(c => c.boton).length}</span>
                )}
              </button>

              <button
                className={`filtro-btn ${filtros.lpr ? 'activo' : ''}`}
                onClick={() => toggleFiltro('lpr')}
                title="Mostrar solo cámaras LPR (Tipo III)"
              >
                <Camera size={14} />
                <span>LPR</span>
                {filtros.lpr && (
                  <span className="filtro-count">{camaras.filter(c => c.tipo === 'TIPO III').length}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filtro por Jurisdicciones */}
        <div className={`filtro-jurisdicciones ${jurisdiccionesCollapsed ? 'collapsed' : ''}`}>
          <div className="filtros-titulo">
            <div className="titulo-left">
              <MapPin size={14} />
              <span>Jurisdicciones</span>
              {filtros.jurisdicciones.length > 0 && (
                <span className="filtro-count">{filtros.jurisdicciones.length}</span>
              )}
            </div>
            <button
              className="collapse-jurisdicciones-btn"
              onClick={toggleJurisdiccionesCollapse}
              title={
                jurisdiccionesCollapsed ? 'Expandir jurisdicciones' : 'Colapsar jurisdicciones'
              }
            >
              {jurisdiccionesCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          <div className={`jurisdicciones-container ${jurisdiccionesCollapsed ? 'hidden' : ''}`}>
            {jurisdiccionesDisponibles.map(jurisdiccion => (
              <label key={jurisdiccion} className="jurisdiccion-checkbox">
                <input
                  type="checkbox"
                  value={jurisdiccion}
                  checked={filtros.jurisdicciones.includes(jurisdiccion)}
                  onChange={handleJurisdiccionChange}
                />
                <span className="checkbox-custom"></span>
                <span className="jurisdiccion-nombre">{jurisdiccion}</span>
                <span className="jurisdiccion-count">
                  ({camaras.filter(c => c.jurisdiccion === jurisdiccion).length})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="estado-carga">
            <div className="spinner"></div>
            <span>Cargando cámaras...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mensaje-error">
            <div className="error-icon">⚠️</div>
            <div className="error-texto">{error}</div>
          </div>
        )}

        {/* Estadísticas compactas */}
        {!cargando && !error && (
          <div className="stats-compactas">
            <div className="stat-item">
              <span className="stat-numero">{camaras.length}</span>
              <span className="stat-label">Total</span>
            </div>
            {filtros.megafono && (
              <div className="stat-item activo">
                <span className="stat-numero">{camaras.filter(c => c.megafono).length}</span>
                <span className="stat-label">Megáfono</span>
              </div>
            )}
            {filtros.boton && (
              <div className="stat-item activo">
                <span className="stat-numero">{camaras.filter(c => c.boton).length}</span>
                <span className="stat-label">Botón</span>
              </div>
            )}
            {filtros.lpr && (
              <div className="stat-item activo">
                <span className="stat-numero">{camaras.filter(c => c.tipo === 'TIPO III').length}</span>
                <span className="stat-label">LPR</span>
              </div>
            )}
          </div>
        )}

        {/* Botones de acción */}
        {(busqueda ||
          ultimaBusqueda ||
          filtros.megafono ||
          filtros.boton ||
          filtros.lpr ||
          filtros.jurisdicciones.length > 0) && (
          <div className="acciones-container">
            <button onClick={limpiarTodo} className="btn-limpiar-todo">
              <X size={14} /> Limpiar
            </button>
            {ultimaBusqueda && (
              <button onClick={iniciarSeguimiento} className="btn-seguimiento">
                <Target size={14} /> Seguimiento
              </button>
            )}
          </div>
        )}

        {/* Botón para limpiar seguimiento activo */}
        {/*  {onLimpiarSeguimiento && (
          <div className="seguimiento-activo">
            <button onClick={onLimpiarSeguimiento} className="btn-limpiar-seguimiento">
              🧹 Limpiar Seguimiento
            </button>
          </div>
        )} */}

        {/* Instrucciones */}
        {/* {/* {!ultimaBusqueda && !error && !cargando && (
                    <div className="instrucciones">
                        <div className="instruccion-item">
                            <span className="instruccion-numero">1</span>
                            <span>Escribe número de la cámara</span>
                        </div>
                        <div className="instruccion-item">
                            <span className="instruccion-numero">2</span>
                            <span>Presiona Enter o el botón de búsqueda</span>
                        </div>
                        <div className="instruccion-item">
                            <span className="instruccion-numero">3</span>
                            <span>El mapa navegará automáticamente</span>
                        </div>
                    </div>
                )}  */}
      </div>
    </div>
  );
};

export default ControlCamaras;
