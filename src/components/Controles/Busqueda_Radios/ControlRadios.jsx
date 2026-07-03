import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Radio, MapPin, X, PenTool, Check, AlertTriangle, Eye, EyeOff, Trash2, FileSpreadsheet, Map, Route, BarChart2 } from 'lucide-react';
import './ControlRadios.css';
import { obtenerRadios, obtenerRadiosCercanos, obtenerHistoricoRadio, obtenerKmDias } from '../../../services/radiosService';
import { obtenerZonas, crearZona, actualizarZona, eliminarZona } from '../../../services/zonaService';
import { computeJurisdiccion, pasaFiltroJurisdiccion } from '../../../utils/jurisdicciones';

const ESTADOS = ['TODOS', 'OK', 'SIN GPS', 'APAGADO'];
const OPCIONES_METROS = [100, 250, 500, 1000, 2000, 5000];
const COLORES_ZONA = ['#6366f1','#22c55e','#ef4444','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

const ControlRadios = ({
  visible,
  onRadioSeleccionado,
  onLimpiarSeleccion,
  mapType = 'leaflet',
  topPosition = 10,
  // Puntos Cercanos
  puntoSeleccionado,
  seleccionandoPunto,
  onActivarSeleccionPunto,
  onLimpiarPunto,
  onBusquedaCercanosChange,
  // Cercos GPS
  dibujandoCerco,
  puntosDibujo = [],
  onIniciarDibujo,
  onCancelarDibujo,
  onZonasChange,
  radiosFuera = [],
  // Recorrido
  onRecorridoChange,
  embedded = false,
  // Jurisdicción global
  jurisdiccionesSeleccionadas = [],
  jurisdiccionesGeoJSON = null,
  onConteoChange,
}) => {
  const [tabPrincipal, setTabPrincipal] = useState('radios');

  // Radios state
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [radios, setRadios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cercanos state
  const [metros, setMetros] = useState(500);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [radiosCercanos, setRadiosCercanos] = useState([]);
  const [cargandoCercanos, setCargandoCercanos] = useState(false);
  const [buscadoCercanos, setBuscadoCercanos] = useState(false);
  const [errorCercanos, setErrorCercanos] = useState(null);
  const [cercanosRecorridoIssi, setCercanosRecorridoIssi] = useState(null);
  const [cercanosRecorridoCargando, setCercanosRecorridoCargando] = useState(false);

  // Cercos state
  const [subTabCercos, setSubTabCercos] = useState('zonas');
  const [zonas, setZonas] = useState([]);
  const [cargandoZonas, setCargandoZonas] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [colorNueva, setColorNueva] = useState(COLORES_ZONA[0]);
  const [guardando, setGuardando] = useState(false);
  const [radiosDisponibles, setRadiosDisponibles] = useState([]);
  const [radiosSeleccionadas, setRadiosSeleccionadas] = useState([]);
  const [todasLasRadios, setTodasLasRadios] = useState(true);
  const [busquedaRadioZona, setBusquedaRadioZona] = useState('');

  // Recorrido state
  const [recorridoIssi, setRecorridoIssi] = useState('');
  const [recorridoBusqueda, setRecorridoBusqueda] = useState('');
  const [recorridoFechaInicio, setRecorridoFechaInicio] = useState('');
  const [recorridoHoraInicio, setRecorridoHoraInicio] = useState('00:00');
  const [recorridoFechaFin, setRecorridoFechaFin] = useState('');
  const [recorridoHoraFin, setRecorridoHoraFin] = useState('23:59');
  const [recorridoPuntos, setRecorridoPuntos] = useState([]);
  const [cargandoRecorrido, setCargandoRecorrido] = useState(false);
  const [errorRecorrido, setErrorRecorrido] = useState(null);
  const [recorridoBuscado, setRecorridoBuscado] = useState(false);

  // Kilometraje state
  const [kmIssi, setKmIssi] = useState('');
  const [kmBusqueda, setKmBusqueda] = useState('');
  const [kmFechaInicio, setKmFechaInicio] = useState('');
  const [kmFechaFin, setKmFechaFin] = useState('');
  const [kmDatos, setKmDatos] = useState([]);
  const [cargandoKm, setCargandoKm] = useState(false);
  const [errorKm, setErrorKm] = useState(null);
  const [kmBuscado, setKmBuscado] = useState(false);

  useEffect(() => {
    if (!visible) return;
    cargarRadios();
    const interval = setInterval(cargarRadios, 30000);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (!visible || tabPrincipal !== 'cercos' || zonas.length > 0) return;
    cargarZonas();
  }, [visible, tabPrincipal]);

  useEffect(() => {
    if (!dibujandoCerco || radiosDisponibles.length > 0) return;
    obtenerRadios().then(data => setRadiosDisponibles(data)).catch(() => {});
  }, [dibujandoCerco]);

  useEffect(() => {
    if (onZonasChange) onZonasChange(zonas);
  }, [zonas]);

  const cargarRadios = async () => {
    try {
      const data = await obtenerRadios();
      setRadios(data);
      setError(null);
      // Log estados únicos para ajustar categorías si es necesario
      const estadosUnicos = [...new Set(data.map(r => r.estado))];
      console.log('[Radios GPS] Estados únicos:', estadosUnicos);
    } catch {
      setError('Error al cargar los radios GPS.');
    } finally {
      setCargando(false);
    }
  };

  const cargarZonas = async () => {
    setCargandoZonas(true);
    try {
      const data = await obtenerZonas();
      setZonas(data);
    } catch {}
    setCargandoZonas(false);
  };

  const buscarCercanos = async () => {
    if (!puntoSeleccionado) return;
    setCargandoCercanos(true);
    setErrorCercanos(null);
    try {
      const data = await obtenerRadiosCercanos(
        puntoSeleccionado.lat, puntoSeleccionado.lng, metros,
        { fechaInicio, fechaFin, horaInicio, horaFin },
      );
      setRadiosCercanos(data);
      setBuscadoCercanos(true);
      if (onBusquedaCercanosChange) onBusquedaCercanosChange(data, metros);
    } catch {
      setErrorCercanos('Error al buscar radios cercanos');
    } finally {
      setCargandoCercanos(false);
    }
  };

  const limpiarCercanos = () => {
    setRadiosCercanos([]);
    setBuscadoCercanos(false);
    setErrorCercanos(null);
    setCercanosRecorridoIssi(null);
    if (onBusquedaCercanosChange) onBusquedaCercanosChange([], metros);
    if (onRecorridoChange) onRecorridoChange([], '');
  };

  const verRecorridoCercano = async (radio) => {
    if (cercanosRecorridoCargando) return;
    // Toggle: si ya está seleccionado, limpiar
    if (cercanosRecorridoIssi === radio.issi) {
      setCercanosRecorridoIssi(null);
      if (onRecorridoChange) onRecorridoChange([], '');
      return;
    }
    setCercanosRecorridoIssi(radio.issi);
    setCercanosRecorridoCargando(true);
    try {
      const data = await obtenerHistoricoRadio(
        radio.issi,
        fechaInicio,
        horaInicio || '00:00',
        fechaFin || fechaInicio,
        horaFin || '23:59',
      );
      if (onRecorridoChange) onRecorridoChange(Array.isArray(data) ? data : [], radio.issi);
    } catch {
      setCercanosRecorridoIssi(null);
    } finally {
      setCercanosRecorridoCargando(false);
    }
  };

  const exportarXLS = () => {
    if (!radiosCercanos.length) return;
    const filas = [
      ['Código', 'ISSI', 'Tipo', 'Estado', 'Velocidad (km/h)', 'Distancia (m)', 'Latitud', 'Longitud', 'Fecha/Hora'],
      ...radiosCercanos.map(r => [
        r.unicocodigo || '', r.issi, r.tipo || '', r.estado || '',
        r.velocidad, r.distancia_metros, r.latitud, r.longitud, r.fechaHora || '',
      ]),
    ];
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Radios Cercanas"><Table>
      ${filas.map(row => `<Row>${row.map(c => `<Cell><Data ss:Type="${typeof c === 'number' ? 'Number' : 'String'}">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')}</Row>`).join('')}
      </Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `radios-cercanas-${Date.now()}.xls`; a.click();
  };

  const exportarKML = () => {
    if (!radiosCercanos.length) return;
    const placemarks = radiosCercanos.map(r => `
      <Placemark>
        <name>${r.unicocodigo || r.issi}</name>
        <description>ISSI: ${r.issi} | Tipo: ${r.tipo || ''} | Estado: ${r.estado || ''} | Velocidad: ${r.velocidad} km/h | Distancia: ${r.distancia_metros} m</description>
        <Point><coordinates>${r.longitud},${r.latitud},0</coordinates></Point>
      </Placemark>`).join('');
    const puntoKml = puntoSeleccionado ? `
      <Placemark>
        <name>Punto de búsqueda</name>
        <Style><IconStyle><color>ff0000ff</color></IconStyle></Style>
        <Point><coordinates>${puntoSeleccionado.lng},${puntoSeleccionado.lat},0</coordinates></Point>
      </Placemark>` : '';
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2">
      <Document><name>Radios Cercanas</name>${puntoKml}${placemarks}</Document></kml>`;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `radios-cercanas-${Date.now()}.kml`; a.click();
  };

  const guardarZona = async () => {
    if (!nombreNueva.trim() || puntosDibujo.length < 3) return;
    setGuardando(true);
    try {
      const geojson = JSON.stringify({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...puntosDibujo, puntosDibujo[0]]] },
      });
      const radios_issi = todasLasRadios ? '[]' : JSON.stringify(radiosSeleccionadas.map(String));
      const nueva = await crearZona({ nombre: nombreNueva, descripcion: descripcionNueva, geojson, color: colorNueva, radios_issi });
      setZonas(prev => [nueva, ...prev]);
      setNombreNueva('');
      setDescripcionNueva('');
      setRadiosSeleccionadas([]);
      setTodasLasRadios(true);
      if (onCancelarDibujo) onCancelarDibujo();
    } catch {}
    setGuardando(false);
  };

  const toggleRadioZona = (issi) => {
    setRadiosSeleccionadas(prev =>
      prev.includes(String(issi)) ? prev.filter(i => i !== String(issi)) : [...prev, String(issi)]
    );
  };

  const toggleActivo = async (zona) => {
    try {
      await actualizarZona(zona.id, { activo: !zona.activo });
      setZonas(prev => prev.map(z => z.id === zona.id ? { ...z, activo: !z.activo } : z));
    } catch {}
  };

  const borrarZona = async (id) => {
    try {
      await eliminarZona(id);
      setZonas(prev => prev.filter(z => z.id !== id));
    } catch {}
  };

  const buscarRecorrido = async () => {
    if (!recorridoIssi || !recorridoFechaInicio || !recorridoFechaFin) return;
    setCargandoRecorrido(true);
    setErrorRecorrido(null);
    try {
      const data = await obtenerHistoricoRadio(recorridoIssi, recorridoFechaInicio, recorridoHoraInicio, recorridoFechaFin, recorridoHoraFin);
      setRecorridoPuntos(data);
      setRecorridoBuscado(true);
      if (onRecorridoChange) onRecorridoChange(data, recorridoIssi);
    } catch {
      setErrorRecorrido('Error al obtener el recorrido');
    } finally {
      setCargandoRecorrido(false);
    }
  };

  const limpiarRecorrido = () => {
    setRecorridoPuntos([]);
    setRecorridoBuscado(false);
    setErrorRecorrido(null);
    if (onRecorridoChange) onRecorridoChange([], '');
  };

  const buscarKm = async () => {
    if (!kmIssi || !kmFechaInicio || !kmFechaFin) return;
    setCargandoKm(true);
    setErrorKm(null);
    try {
      const data = await obtenerKmDias(kmIssi, kmFechaInicio, kmFechaFin);
      setKmDatos(data);
      setKmBuscado(true);
    } catch {
      setErrorKm('Error al obtener el kilometraje');
    } finally {
      setCargandoKm(false);
    }
  };

  const exportarKmXLS = () => {
    if (!kmDatos.length) return;
    const radio = radios.find(r => String(r.issi) === String(kmIssi));
    const nombre = radio ? (radio.unicocodigo || `ISSI: ${radio.issi}`) : kmIssi;
    const filas = [
      ['Radio', 'ISSI', 'Día', 'Fecha', 'Kilómetros'],
      ...kmDatos.map(d => [nombre, kmIssi, d.diaNombre || '', d.fecha || '', d.kilometros ?? '']),
    ];
    const totalKm = kmDatos.reduce((s, d) => s + (parseFloat(d.kilometros) || 0), 0);
    filas.push(['', '', '', 'TOTAL', totalKm.toFixed(2)]);
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Kilometraje"><Table>
      ${filas.map(row => `<Row>${row.map(c => `<Cell><Data ss:Type="${typeof c === 'number' ? 'Number' : 'String'}">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')}</Row>`).join('')}
      </Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `kilometraje-${kmIssi}-${kmFechaInicio}-${kmFechaFin}.xls`; a.click();
  };

  const BADGE_COLOR = {
    verde:    { label: 'OK',          bg: '#eff6ff', color: '#3b82f6', cat: 'ok'         },
    amarillo: { label: 'SIN GPS',     bg: '#ffedd5', color: '#f97316', cat: 'warning'    },
    rojo:     { label: 'APAGADO',     bg: '#f3f4f6', color: '#6b7280', cat: 'danger'     },
  };
  const badgeRadio = (r) => BADGE_COLOR[r.color] ?? { label: r.color || '—', bg: '#f3f4f6', color: '#6b7280', cat: 'otro' };

  const tiposUnicos = ['TODOS', ...new Set(radios.map(r => r.tipo).filter(Boolean))];
  // Jurisdicción de cada radio (para que conteos y lista respeten la zona global elegida).
  const jurisdiccionPorRadio = useMemo(() => {
    const mapa = {};
    if (!jurisdiccionesGeoJSON) return mapa;
    radios.forEach(r => { mapa[r.issi] = computeJurisdiccion(r.latitud, r.longitud, jurisdiccionesGeoJSON); });
    return mapa;
  }, [radios, jurisdiccionesGeoJSON]);

  const radiosEnZona = useMemo(
    () => radios.filter(r => pasaFiltroJurisdiccion(jurisdiccionPorRadio[r.issi], jurisdiccionesSeleccionadas)),
    [radios, jurisdiccionPorRadio, jurisdiccionesSeleccionadas]
  );

  // Reportar solo los radios OK en la jurisdicción (para los totales del panel).
  useEffect(() => {
    if (typeof onConteoChange !== 'function') return;
    const ok = radiosEnZona.filter(r => badgeRadio(r).cat === 'ok').length;
    onConteoChange(ok);
  }, [radiosEnZona, onConteoChange]);

  const radiosFiltrados = radiosEnZona.filter(r => {
    const term = busqueda.toLowerCase().trim();
    const b = badgeRadio(r);
    const matchEstado = filtroEstado === 'TODOS' || b.label === filtroEstado;
    return (
      (!term || String(r.issi).includes(term) || String(r.unicocodigo ?? '').toLowerCase().includes(term) || String(r.tipo ?? '').toLowerCase().includes(term)) &&
      matchEstado &&
      (filtroTipo === 'TODOS' || r.tipo === filtroTipo)
    );
  });
  const totalOk         = radiosEnZona.filter(r => badgeRadio(r).cat === 'ok').length;
  const totalSinGps     = radiosEnZona.filter(r => badgeRadio(r).cat === 'warning').length;
  const totalMalApagado = radiosEnZona.filter(r => badgeRadio(r).cat === 'danger').length;

  if (!visible) return null;

  const contentCollapsed = isCollapsed && !embedded;

  return (
    <div
      className={`control-radios ${mapType}-mode ${contentCollapsed ? 'collapsed' : ''}`}
      style={{ '--cr-top': `${topPosition}px` }}
    >
      {!embedded && (
        <div className="control-radios-header" onClick={() => setIsCollapsed(p => !p)}>
          <div className="header-content">
            <Radio size={20} style={{ color: '#6366f1', flexShrink: 0 }} />
            <h3>Radios GPS</h3>
            {radiosFuera.length > 0 && (
              <span className="cr-badge-alerta">{radiosFuera.length}</span>
            )}
            <button className="collapse-btn-r">
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>
      )}

      <div className={`control-radios-content ${contentCollapsed ? 'hidden' : ''}`}>
        {/* Tabs principales */}
        <div className="cr-tabs">
          <button className={`cr-tab ${tabPrincipal === 'radios' ? 'activo' : ''}`} onClick={() => setTabPrincipal('radios')} title="Lista de Radios">
            <Radio size={15} />
            Radios
          </button>
          <button className={`cr-tab ${tabPrincipal === 'cercanos' ? 'activo' : ''}`} onClick={() => setTabPrincipal('cercanos')} title="Radios Cercanas">
            <MapPin size={15} />
            Cercanos
          </button>
          <button className={`cr-tab ${tabPrincipal === 'recorrido' ? 'activo' : ''}`} onClick={() => setTabPrincipal('recorrido')} title="Historial de Recorrido">
            <Route size={15} />
            Recorrido
          </button>
          <button className={`cr-tab ${tabPrincipal === 'km' ? 'activo' : ''}`} onClick={() => setTabPrincipal('km')} title="Kilometraje por día">
            <BarChart2 size={15} />
            Km
          </button>
          <button
            className={`cr-tab ${tabPrincipal === 'cercos' ? 'activo' : ''} ${radiosFuera.length > 0 ? 'con-alerta' : ''}`}
            onClick={() => setTabPrincipal('cercos')}
            title="Cercos GPS"
          >
            <PenTool size={15} />
            Cercos {radiosFuera.length > 0 && <span className="cr-tab-badge">{radiosFuera.length}</span>}
          </button>
        </div>

        {/* ===== TAB RADIOS ===== */}
        {tabPrincipal === 'radios' && (
          <>
            <div className="cr-input-group">
              <div className="cr-input-container">
                <Search size={16} className="cr-search-icon" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="ISSI, código, tipo, estado..."
                  className="cr-input"
                  disabled={cargando}
                />
              </div>
              <button className="cr-btn-buscar" disabled={cargando} onClick={() => {}} title="Buscar">
                <MapPin size={16} />
              </button>
            </div>

            <select className="cr-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              {ESTADOS.map(e => <option key={e} value={e}>{e === 'TODOS' ? 'Todos los estados' : e}</option>)}
            </select>

            <select className="cr-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              {tiposUnicos.map(t => <option key={t} value={t}>{t === 'TODOS' ? 'Todos los tipos' : t}</option>)}
            </select>

            {cargando && <div className="cr-carga"><div className="cr-spinner" /><span>Cargando radios...</span></div>}
            {error && <div className="cr-error">⚠️ {error}</div>}

            {!cargando && !error && (
              <div className="cr-stats">
                <div className="cr-stat"><span className="cr-stat-num" style={{ color: '#3b82f6' }}>{totalOk}</span><span className="cr-stat-label">OK</span></div>
                <div className="cr-stat"><span className="cr-stat-num" style={{ color: '#a16207' }}>{totalSinGps}</span><span className="cr-stat-label">Sin GPS</span></div>
                <div className="cr-stat"><span className="cr-stat-num" style={{ color: '#dc2626' }}>{totalMalApagado}</span><span className="cr-stat-label">Apagado</span></div>
              </div>
            )}

            {!cargando && radiosFiltrados.length > 0 && (
              <div className="cr-lista">
                <span className="cr-lista-titulo">{radiosFiltrados.length} resultado{radiosFiltrados.length !== 1 ? 's' : ''}</span>
                {radiosFiltrados.map(r => {
                  const b = badgeRadio(r);
                  return (
                    <div key={r.issi} className="cr-item" onClick={() => onRadioSeleccionado && onRadioSeleccionado(r)}>
                      <div className="cr-item-dot" style={{ background: r.hexacolor || '#6b7280' }} />
                      <div className="cr-item-info">
                        <div className="cr-item-nombre">{r.unicocodigo || `ISSI: ${r.issi}`}</div>
                        <div className="cr-item-detalle">{r.tipo} · {r.velocidad} km/h · {r.direccion}</div>
                      </div>
                      <span className="cr-item-estado" style={{ background: b.bg, color: b.color }}>
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!cargando && !error && radiosFiltrados.length === 0 && busqueda && (
              <div className="cr-error">No se encontraron resultados para "{busqueda}"</div>
            )}

            {(busqueda || filtroEstado !== 'TODOS' || filtroTipo !== 'TODOS') && (
              <div className="cr-acciones">
                <button onClick={() => { setBusqueda(''); setFiltroEstado('TODOS'); setFiltroTipo('TODOS'); if (onLimpiarSeleccion) onLimpiarSeleccion(); }} className="cr-btn-limpiar">
                  <X size={14} /> Limpiar filtros
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== TAB CERCANOS ===== */}
        {tabPrincipal === 'cercanos' && (
          <>
            <button
              className={`cr-btn-seleccionar ${seleccionandoPunto ? 'activo' : ''}`}
              onClick={onActivarSeleccionPunto}
            >
              <MapPin size={15} />
              {seleccionandoPunto ? 'Haz clic en el mapa...' : 'Seleccionar punto en mapa'}
            </button>

            {puntoSeleccionado && (
              <div className="cr-punto-info">
                <span>📍</span>
                <span style={{ flex: 1 }}>{puntoSeleccionado.lat.toFixed(5)}, {puntoSeleccionado.lng.toFixed(5)}</span>
                <button className="cr-punto-clear" onClick={() => { if (onLimpiarPunto) onLimpiarPunto(); limpiarCercanos(); }} title="Quitar punto">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="cr-field-group">
              <label className="cr-label">Radio de búsqueda</label>
              <select className="cr-select" value={metros} onChange={e => { setMetros(Number(e.target.value)); limpiarCercanos(); }}>
                {OPCIONES_METROS.map(m => (
                  <option key={m} value={m}>{m >= 1000 ? `${m / 1000} km` : `${m} m`}</option>
                ))}
              </select>
            </div>

            <div className="cr-filtros-fecha">
              <div className="cr-filtro-titulo">Filtro de fecha/hora <span>(opcional)</span></div>
              <div className="cr-fecha-hora">
                <div className="cr-field-group">
                  <label className="cr-label">Fecha inicio</label>
                  <input type="date" className="cr-input-fecha" value={fechaInicio}
                    onChange={e => { setFechaInicio(e.target.value); limpiarCercanos(); }} />
                </div>
                <div className="cr-field-group">
                  <label className="cr-label">Fecha fin</label>
                  <input type="date" className="cr-input-fecha" value={fechaFin}
                    onChange={e => { setFechaFin(e.target.value); limpiarCercanos(); }} />
                </div>
              </div>
              <div className="cr-fecha-hora">
                <div className="cr-field-group">
                  <label className="cr-label">Hora inicio</label>
                  <input type="time" className="cr-input-fecha" value={horaInicio}
                    onChange={e => { setHoraInicio(e.target.value); limpiarCercanos(); }} />
                </div>
                <div className="cr-field-group">
                  <label className="cr-label">Hora fin</label>
                  <input type="time" className="cr-input-fecha" value={horaFin}
                    onChange={e => { setHoraFin(e.target.value); limpiarCercanos(); }} />
                </div>
              </div>
            </div>

            <button className="cr-btn-accion" onClick={buscarCercanos} disabled={!puntoSeleccionado || cargandoCercanos}>
              {cargandoCercanos ? <div className="cr-spinner" style={{ borderTopColor: '#f59e0b' }} /> : <Search size={15} />}
              {cargandoCercanos ? 'Buscando...' : 'Buscar radios cercanas'}
            </button>

            {errorCercanos && <div className="cr-error">⚠️ {errorCercanos}</div>}

            {buscadoCercanos && !cargandoCercanos && (
              <>
                <div className="cr-stats">
                  <div className="cr-stat">
                    <span className="cr-stat-num" style={{ color: '#f59e0b' }}>{radiosCercanos.length}</span>
                    <span className="cr-stat-label">encontradas</span>
                  </div>
                  <div className="cr-stat">
                    <span className="cr-stat-num" style={{ color: '#6b7280' }}>{metros >= 1000 ? `${metros/1000}km` : `${metros}m`}</span>
                    <span className="cr-stat-label">radio</span>
                  </div>
                </div>

                {radiosCercanos.length > 0 && (
                  <div className="cr-lista">
                    {radiosCercanos.map(r => {
                      const esNormal = r.estado?.toUpperCase().includes('NORMAL');
                      const seleccionado = cercanosRecorridoIssi === r.issi;
                      const cargandoEste = cercanosRecorridoCargando && seleccionado;
                      const tieneFechas = !!(fechaInicio || fechaFin);
                      return (
                        <div
                          key={r.issi}
                          className="cr-item"
                          style={{ cursor: tieneFechas ? 'pointer' : 'default', background: seleccionado ? 'rgba(99,102,241,0.12)' : undefined, borderRadius: 6 }}
                          onClick={() => tieneFechas && verRecorridoCercano(r)}
                          title={tieneFechas ? 'Ver recorrido en el mapa' : ''}
                        >
                          <div className="cr-item-dot" style={{ background: r.hexacolor || '#6366f1' }} />
                          <div className="cr-item-info">
                            <div className="cr-item-nombre">ISSI: {r.issi}{r.unicocodigo ? ` · ${r.unicocodigo}` : ''}</div>
                            <div className="cr-item-detalle">{r.tipo} · {r.velocidad} km/h</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            {r.distancia_metros != null && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>{r.distancia_metros}m</span>
                            )}
                            {tieneFechas && (
                              cargandoEste
                                ? <div className="cr-spinner" style={{ width: 10, height: 10, borderWidth: 2, borderTopColor: '#6366f1' }} />
                                : <Route size={11} color={seleccionado ? '#6366f1' : '#94a3b8'} />
                            )}
                            {!tieneFechas && <span style={{ fontSize: 10, color: esNormal ? '#16a34a' : '#dc2626' }}>●</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {radiosCercanos.length === 0 && <div className="cr-vacio">No hay radios en ese radio de búsqueda</div>}

                {radiosCercanos.length > 0 && (
                  <div className="cr-export-btns">
                    <button className="cr-btn-export xls" onClick={exportarXLS} title="Exportar Excel">
                      <FileSpreadsheet size={13} /> XLS
                    </button>
                    <button className="cr-btn-export kml" onClick={exportarKML} title="Exportar KML">
                      <Map size={13} /> KML
                    </button>
                  </div>
                )}

                <button className="cr-btn-limpiar" onClick={limpiarCercanos}>
                  <X size={13} /> Limpiar resultados
                </button>
              </>
            )}
          </>
        )}

        {/* ===== TAB RECORRIDO ===== */}
        {tabPrincipal === 'recorrido' && (
          <>
            <div className="cr-field-group">
              <label className="cr-label">Radio (ISSI)</label>
              <div className="cr-input-container" style={{ marginBottom: 4 }}>
                <Search size={14} className="cr-search-icon" />
                <input
                  type="text"
                  className="cr-input"
                  placeholder="Buscar ISSI o código..."
                  value={recorridoBusqueda}
                  onChange={e => setRecorridoBusqueda(e.target.value)}
                />
              </div>
              <select className="cr-select" value={recorridoIssi} onChange={e => { setRecorridoIssi(e.target.value); limpiarRecorrido(); }}>
                <option value="">— Seleccionar radio —</option>
                {radios
                  .filter(r => {
                    const t = recorridoBusqueda.toLowerCase().trim();
                    return !t || String(r.issi).includes(t) || String(r.unicocodigo || '').toLowerCase().includes(t);
                  })
                  .map(r => (
                    <option key={r.issi} value={r.issi}>{r.unicocodigo || r.issi} ({r.issi})</option>
                  ))}
              </select>
            </div>

            <div className="cr-fecha-hora">
              <div className="cr-field-group">
                <label className="cr-label">Fecha inicio</label>
                <input type="date" className="cr-input-fecha" value={recorridoFechaInicio}
                  onChange={e => { setRecorridoFechaInicio(e.target.value); limpiarRecorrido(); }} />
              </div>
              <div className="cr-field-group">
                <label className="cr-label">Fecha fin</label>
                <input type="date" className="cr-input-fecha" value={recorridoFechaFin}
                  onChange={e => { setRecorridoFechaFin(e.target.value); limpiarRecorrido(); }} />
              </div>
            </div>

            <div className="cr-fecha-hora">
              <div className="cr-field-group">
                <label className="cr-label">Hora inicio</label>
                <input type="time" className="cr-input-fecha" value={recorridoHoraInicio}
                  onChange={e => { setRecorridoHoraInicio(e.target.value); limpiarRecorrido(); }} />
              </div>
              <div className="cr-field-group">
                <label className="cr-label">Hora fin</label>
                <input type="time" className="cr-input-fecha" value={recorridoHoraFin}
                  onChange={e => { setRecorridoHoraFin(e.target.value); limpiarRecorrido(); }} />
              </div>
            </div>

            <button
              className="cr-btn-accion"
              onClick={buscarRecorrido}
              disabled={!recorridoIssi || !recorridoFechaInicio || !recorridoFechaFin || cargandoRecorrido}
              style={{ background: '#6366f1' }}
            >
              {cargandoRecorrido ? <div className="cr-spinner" style={{ borderTopColor: 'white' }} /> : <Route size={15} />}
              {cargandoRecorrido ? 'Cargando...' : 'Ver recorrido en mapa'}
            </button>

            {errorRecorrido && <div className="cr-error">⚠️ {errorRecorrido}</div>}

            {recorridoBuscado && !cargandoRecorrido && (
              <>
                <div className="cr-stats">
                  <div className="cr-stat">
                    <span className="cr-stat-num" style={{ color: '#6366f1' }}>{recorridoPuntos.length}</span>
                    <span className="cr-stat-label">puntos</span>
                  </div>
                  {recorridoPuntos.length > 0 && (
                    <div className="cr-stat">
                      <span className="cr-stat-num" style={{ color: '#22c55e', fontSize: 13 }}>
                        {recorridoPuntos[0].fechaHora?.split(' ')[1]?.substring(0,5) || '—'}
                      </span>
                      <span className="cr-stat-label">inicio</span>
                    </div>
                  )}
                  {recorridoPuntos.length > 0 && (
                    <div className="cr-stat">
                      <span className="cr-stat-num" style={{ color: '#ef4444', fontSize: 13 }}>
                        {recorridoPuntos[recorridoPuntos.length-1].fechaHora?.split(' ')[1]?.substring(0,5) || '—'}
                      </span>
                      <span className="cr-stat-label">fin</span>
                    </div>
                  )}
                </div>

                {recorridoPuntos.length === 0 && (
                  <div className="cr-vacio">Sin datos para el período seleccionado</div>
                )}

                {recorridoPuntos.length > 0 && (
                  <div className="cr-lista" style={{ maxHeight: 200 }}>
                    {recorridoPuntos.map((p, i) => (
                      <div key={i} className="cr-item" style={{ padding: '4px 8px' }}>
                        <div className="cr-item-dot" style={{ background: i === 0 ? '#22c55e' : i === recorridoPuntos.length - 1 ? '#ef4444' : '#6366f1', width: 8, height: 8 }} />
                        <div className="cr-item-info">
                          <div className="cr-item-nombre" style={{ fontSize: 11 }}>{p.fechaHora}</div>
                          <div className="cr-item-detalle">{p.velocidad} km/h · {p.estado}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="cr-btn-limpiar" onClick={limpiarRecorrido}>
                  <X size={13} /> Limpiar recorrido
                </button>
              </>
            )}
          </>
        )}

        {/* ===== TAB KILOMETRAJE ===== */}
        {tabPrincipal === 'km' && (
          <>
            <div className="cr-field-group">
              <label className="cr-label">Radio (ISSI)</label>
              <div className="cr-input-container" style={{ marginBottom: 4 }}>
                <Search size={14} className="cr-search-icon" />
                <input
                  type="text"
                  className="cr-input"
                  placeholder="Buscar ISSI o código..."
                  value={kmBusqueda}
                  onChange={e => setKmBusqueda(e.target.value)}
                />
              </div>
              <select className="cr-select" value={kmIssi} onChange={e => { setKmIssi(e.target.value); setKmDatos([]); setKmBuscado(false); }}>
                <option value="">— Seleccionar radio —</option>
                {radios
                  .filter(r => {
                    const t = kmBusqueda.toLowerCase().trim();
                    return !t || String(r.issi).includes(t) || String(r.unicocodigo || '').toLowerCase().includes(t);
                  })
                  .map(r => (
                    <option key={r.issi} value={r.issi}>{r.unicocodigo || r.issi} ({r.issi})</option>
                  ))}
              </select>
            </div>

            <div className="cr-fecha-hora">
              <div className="cr-field-group">
                <label className="cr-label">Fecha inicio</label>
                <input type="date" className="cr-input-fecha" value={kmFechaInicio}
                  onChange={e => { setKmFechaInicio(e.target.value); setKmDatos([]); setKmBuscado(false); }} />
              </div>
              <div className="cr-field-group">
                <label className="cr-label">Fecha fin</label>
                <input type="date" className="cr-input-fecha" value={kmFechaFin}
                  onChange={e => { setKmFechaFin(e.target.value); setKmDatos([]); setKmBuscado(false); }} />
              </div>
            </div>

            <button
              className="cr-btn-accion"
              onClick={buscarKm}
              disabled={!kmIssi || !kmFechaInicio || !kmFechaFin || cargandoKm}
              style={{ background: '#0891b2' }}
            >
              {cargandoKm ? <div className="cr-spinner" style={{ borderTopColor: 'white' }} /> : <BarChart2 size={15} />}
              {cargandoKm ? 'Consultando...' : 'Consultar kilometraje'}
            </button>

            {errorKm && <div className="cr-error">⚠️ {errorKm}</div>}

            {kmBuscado && !cargandoKm && (
              <>
                {kmDatos.length === 0 ? (
                  <div className="cr-vacio">Sin datos para el período seleccionado</div>
                ) : (
                  <>
                    <div className="cr-km-tabla">
                      <div className="cr-km-header">
                        <span>Día</span><span>Fecha</span><span style={{ textAlign: 'right' }}>Km</span>
                      </div>
                      {kmDatos.map((d, i) => (
                        <div key={i} className="cr-km-row">
                          <span>{d.diaNombre || '—'}</span>
                          <span>{d.fecha || '—'}</span>
                          <span style={{ textAlign: 'right', fontWeight: 600, color: '#0891b2' }}>
                            {parseFloat(d.kilometros || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="cr-km-total">
                        <span style={{ gridColumn: '1 / 3', fontWeight: 700 }}>TOTAL</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: '#0891b2' }}>
                          {kmDatos.reduce((s, d) => s + (parseFloat(d.kilometros) || 0), 0).toFixed(2)} km
                        </span>
                      </div>
                    </div>

                    <button className="cr-btn-export xls" onClick={exportarKmXLS} style={{ alignSelf: 'flex-start' }}>
                      <FileSpreadsheet size={13} /> Exportar XLS
                    </button>
                  </>
                )}

                <button className="cr-btn-limpiar" onClick={() => { setKmDatos([]); setKmBuscado(false); }}>
                  <X size={13} /> Limpiar
                </button>
              </>
            )}
          </>
        )}

        {/* ===== TAB CERCOS ===== */}
        {tabPrincipal === 'cercos' && (
          <>
            <div className="cr-tabs" style={{ marginBottom: 0 }}>
              <button className={`cr-tab ${subTabCercos === 'zonas' ? 'activo' : ''}`} onClick={() => setSubTabCercos('zonas')}>
                Zonas ({zonas.length})
              </button>
              <button
                className={`cr-tab ${subTabCercos === 'alertas' ? 'activo' : ''} ${radiosFuera.length > 0 ? 'con-alerta' : ''}`}
                onClick={() => setSubTabCercos('alertas')}
              >
                Alertas {radiosFuera.length > 0 && `(${radiosFuera.length})`}
              </button>
            </div>

            {subTabCercos === 'zonas' && (
              <>
                {!dibujandoCerco ? (
                  <button className="cr-btn-accion cr-btn-cerco" onClick={onIniciarDibujo}>
                    <PenTool size={14} /> Dibujar nueva zona
                  </button>
                ) : (
                  <div className="cr-dibujo-panel">
                    <div className="cr-dibujo-instruccion">
                      <span>🖊️</span>
                      <span>Clic en el mapa para vértices ({puntosDibujo.length} puntos)</span>
                    </div>

                    {puntosDibujo.length >= 3 && (
                      <>
                        <input className="cr-input-zona" placeholder="Nombre del cerco *" value={nombreNueva} onChange={e => setNombreNueva(e.target.value)} />
                        <input className="cr-input-zona" placeholder="Descripción (opcional)" value={descripcionNueva} onChange={e => setDescripcionNueva(e.target.value)} />
                        <div className="cr-colores">
                          {COLORES_ZONA.map(c => (
                            <button key={c} className={`cr-color-btn ${colorNueva === c ? 'sel' : ''}`} style={{ background: c }} onClick={() => setColorNueva(c)} />
                          ))}
                        </div>

                        {/* Selector de radios */}
                        <div className="cr-radios-zona">
                          <div className="cr-radios-zona-titulo">Radios a monitorear</div>
                          <label className="cr-radio-check-item">
                            <input type="checkbox" checked={todasLasRadios}
                              onChange={e => { setTodasLasRadios(e.target.checked); if (e.target.checked) setRadiosSeleccionadas([]); }} />
                            <span>Todas las radios</span>
                          </label>
                          {!todasLasRadios && (
                            <>
                              <input
                                className="cr-input-zona"
                                placeholder="Buscar por ISSI o código..."
                                value={busquedaRadioZona}
                                onChange={e => setBusquedaRadioZona(e.target.value)}
                                style={{ marginBottom: 4 }}
                              />
                              <div className="cr-radios-lista-zona">
                                {radiosDisponibles.length === 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>Cargando...</span>}
                                {radiosDisponibles
                                  .filter(r => {
                                    const t = busquedaRadioZona.toLowerCase().trim();
                                    return !t || String(r.issi).includes(t) || String(r.unicocodigo || '').toLowerCase().includes(t);
                                  })
                                  .map(r => (
                                    <label key={r.issi} className="cr-radio-check-item">
                                      <input type="checkbox"
                                        checked={radiosSeleccionadas.includes(String(r.issi))}
                                        onChange={() => toggleRadioZona(r.issi)} />
                                      <span className="cr-radio-dot" style={{ background: r.hexacolor || '#6366f1' }} />
                                      <span>{r.unicocodigo || `ISSI: ${r.issi}`}</span>
                                    </label>
                                  ))}
                              </div>
                              {radiosSeleccionadas.length > 0 && (
                                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                                  {radiosSeleccionadas.length} radio{radiosSeleccionadas.length !== 1 ? 's' : ''} seleccionada{radiosSeleccionadas.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="cr-btn-guardar-zona" disabled={puntosDibujo.length < 3 || !nombreNueva.trim() || guardando} onClick={guardarZona}>
                        <Check size={13} /> {guardando ? 'Guardando...' : 'Guardar zona'}
                      </button>
                      <button className="cr-btn-cancelar-zona" onClick={onCancelarDibujo}>
                        <X size={13} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {cargandoZonas && <div className="cr-carga"><div className="cr-spinner" /><span>Cargando zonas...</span></div>}
                {!cargandoZonas && zonas.length === 0 && <div className="cr-vacio">No hay zonas definidas</div>}

                {!cargandoZonas && zonas.map(z => (
                  <div key={z.id} className={`cr-zona-item ${!z.activo ? 'inactiva' : ''}`}>
                    <div className="cr-zona-color" style={{ background: z.color || '#6366f1' }} />
                    <div className="cr-item-info">
                      <div className="cr-item-nombre">{z.nombre}</div>
                      {z.descripcion && <div className="cr-item-detalle">{z.descripcion}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="cr-icon-btn" onClick={() => toggleActivo(z)} title={z.activo ? 'Ocultar' : 'Mostrar'}>
                        {z.activo ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button className="cr-icon-btn danger" onClick={() => borrarZona(z.id)} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {subTabCercos === 'alertas' && (
              radiosFuera.length === 0 ? (
                <div className="cr-vacio cr-ok">
                  <span style={{ fontSize: 24 }}>✅</span>
                  <span>Todas las radios dentro de sus cercos</span>
                </div>
              ) : (
                <>
                  <div className="cr-alerta-header">
                    <AlertTriangle size={15} color="#ef4444" />
                    <span>{radiosFuera.length} radio{radiosFuera.length !== 1 ? 's' : ''} fuera del cerco</span>
                  </div>
                  <div className="cr-lista" style={{ maxHeight: 220 }}>
                    {radiosFuera.map(r => (
                      <div key={r.issi} className="cr-alerta-item">
                        <div className="cr-item-dot" style={{ background: r.hexacolor || '#ef4444' }} />
                        <div className="cr-item-info">
                          <div className="cr-item-nombre">{r.unicocodigo || `ISSI: ${r.issi}`}</div>
                          <div className="cr-item-detalle">{r.tipo} · {r.velocidad} km/h</div>
                        </div>
                        <span className="cr-badge-fuera">FUERA</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ControlRadios;
