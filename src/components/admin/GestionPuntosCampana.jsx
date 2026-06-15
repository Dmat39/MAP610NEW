import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, RefreshCw, Flag, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import campaignPointService from '../../services/campaignPointService';
import { useAuth } from '../../context/AuthContext';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionPuntosCampana.css';

// ── Helpers de dibujo (fuera del componente, sin estado React) ────────────────

function renderPreview(dl, verts, isFinished, geomType, color) {
  if (!dl) return;
  dl.clearLayers();
  if (verts.length === 0) return;

  // Vértices
  verts.forEach((v, i) => {
    L.circleMarker(v, {
      radius: i === 0 ? 6 : 5,
      color: '#fff',
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
    }).addTo(dl);
  });

  if (verts.length < 2) return;

  if (geomType === 'POLYLINE') {
    L.polyline(verts, { color, weight: 3, opacity: 0.9 }).addTo(dl);
  } else if (verts.length >= 3) {
    L.polygon(verts, {
      color,
      fillColor: color,
      fillOpacity: isFinished ? 0.35 : 0.15,
      weight: 2.5,
      dashArray: isFinished ? null : '6,6',
    }).addTo(dl);
  } else {
    L.polyline(verts, { color, weight: 3, dashArray: '6,6' }).addTo(dl);
  }
}

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:      '',
  description: '',
  category:  '',
  color:     '#16a34a',
  geom_type: 'POINT',
  lat:       '',
  lng:       '',
  polygon:   null,
};

const DEFAULT_CENTER = [-11.9699, -76.998];

// ── Componente ────────────────────────────────────────────────────────────────

const GestionPuntosCampana = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [count, setCount]         = useState(0);
  const [refresh, setRefresh]     = useState(false);
  const [categories, setCategories] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selected, setSelected]   = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData]   = useState(EMPTY_FORM);
  const [showMap, setShowMap]     = useState(false);

  // ── Estado de dibujo ──────────────────────────────────────────────────────
  const [drawVCount, setDrawVCount] = useState(0);
  const [drawDone, _setDrawDone]    = useState(false);
  const [mapKey, setMapKey]         = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const markerRef     = useRef(null);
  const drawLayer     = useRef(null);
  const drawVertices  = useRef([]);
  const drawDoneRef   = useRef(false);
  const formDataRef   = useRef(formData);

  // Sincroniza formDataRef con el estado actual (para handlers de Leaflet)
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Helper: actualiza drawDone en estado Y en ref
  const setDrawDone = useCallback((val) => {
    drawDoneRef.current = val;
    _setDrawDone(val);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { hasModuleAccess } = useAuth();
  const hasAccess = hasModuleAccess('puntos-campana');

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasAccess) { loadData(); loadCategories(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, refresh]);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await campaignPointService.getAll({
        search:   params.search   || '',
        category: params.category || '',
        page:     parseInt(params.page)  || 1,
        limit:    parseInt(params.limit) || 20,
      });
      setItems(Array.isArray(res.data) ? res.data : []);
      setCount(res.count || 0);
    } catch (err) {
      setError(err.message); setItems([]);
    } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const cats = await campaignPointService.getCategories();
      setCategories(cats);
    } catch { /* no-op */ }
  };

  // ── Mapa ──────────────────────────────────────────────────────────────────

  // Inicializa el mapa cada vez que showMap=true o mapKey cambia
  useEffect(() => {
    if (!showMap || !mapRef.current) return;

    const geomType   = formDataRef.current.geom_type;
    const color      = formDataRef.current.color || '#16a34a';
    const startLat   = parseFloat(formDataRef.current.lat) || DEFAULT_CENTER[0];
    const startLng   = parseFloat(formDataRef.current.lng) || DEFAULT_CENTER[1];

    const map = L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
      doubleClickZoom: false,
    });
    leafletMap.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    if (geomType === 'POINT') {
      // ── Modo PIN ─────────────────────────────────────────────────────────
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markerRef.current = L.marker([startLat, startLng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const { lat: nl, lng: ng } = markerRef.current.getLatLng();
        setFormData(prev => ({ ...prev, lat: nl, lng: ng }));
        setSuccess('Coordenadas actualizadas');
        setTimeout(() => setSuccess(null), 2000);
      });
      map.on('dblclick', (e) => {
        const { lat: nl, lng: ng } = e.latlng;
        markerRef.current.setLatLng([nl, ng]);
        setFormData(prev => ({ ...prev, lat: nl, lng: ng }));
        setSuccess('Coordenadas actualizadas');
        setTimeout(() => setSuccess(null), 2000);
      });
    } else {
      // ── Modo DIBUJO ───────────────────────────────────────────────────────
      const dl = L.layerGroup().addTo(map);
      drawLayer.current = dl;

      // Si ya hay coordenadas guardadas (edición), las mostramos
      const existingPoly = formDataRef.current.polygon;
      if (existingPoly && existingPoly.length >= 2) {
        const verts = existingPoly.map(([lng, lat]) => [lat, lng]);
        drawVertices.current = verts;
        setDrawVCount(verts.length);
        setDrawDone(true);
        renderPreview(dl, verts, true, geomType, color);
        try {
          map.fitBounds(L.latLngBounds(verts), { padding: [30, 30] });
        } catch { /* bounds error */ }
      } else {
        drawVertices.current = [];
        setDrawVCount(0);
        setDrawDone(false);
      }

      // Click → agregar vértice
      map.on('click', (e) => {
        if (drawDoneRef.current) return;
        const { lat, lng } = e.latlng;
        drawVertices.current = [...drawVertices.current, [lat, lng]];
        setDrawVCount(drawVertices.current.length);
        renderPreview(dl, drawVertices.current, false, formDataRef.current.geom_type, formDataRef.current.color || '#16a34a');
      });

      // Doble clic → cerrar forma
      map.on('dblclick', (e) => {
        L.DomEvent.stop(e);
        if (drawDoneRef.current) return;
        const verts = drawVertices.current;
        const gt = formDataRef.current.geom_type;
        const minV = gt === 'POLYLINE' ? 2 : 3;
        if (verts.length < minV) return;
        doFinishDraw(dl, verts, gt, formDataRef.current.color || '#16a34a');
      });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        drawLayer.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, mapKey]);

  // Actualizar posición del pin cuando cambia lat/lng en POINT
  useEffect(() => {
    if (!markerRef.current || formData.geom_type !== 'POINT') return;
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current?.setView([lat, lng]);
    }
  }, [formData.lat, formData.lng, formData.geom_type]);

  // Cierra/finaliza la forma dibujada y guarda coordenadas en formData
  const doFinishDraw = useCallback((dl, verts, geomType, color) => {
    let coords = verts.map(([lat, lng]) => [lng, lat]); // → [lng, lat] para BD

    if (geomType !== 'POLYLINE') {
      const first = coords[0], last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords = [...coords, [...first]]; // Cerrar polígono
      }
      const centLat = verts.reduce((s, [la]) => s + la, 0) / verts.length;
      const centLng = verts.reduce((s, [, lo]) => s + lo, 0) / verts.length;
      setFormData(prev => ({ ...prev, polygon: coords, lat: centLat, lng: centLng }));
    } else {
      setFormData(prev => ({ ...prev, polygon: coords }));
    }

    setDrawDone(true);
    renderPreview(dl, verts, true, geomType, color);
  }, [setDrawDone]);

  const destroyMap = useCallback(() => {
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
      markerRef.current = null;
      drawLayer.current = null;
    }
  }, []);

  // ── Acciones de dibujo (botones) ──────────────────────────────────────────

  const handleCloseShape = () => {
    const verts = drawVertices.current;
    const gt = formData.geom_type;
    const minV = gt === 'POLYLINE' ? 2 : 3;
    if (verts.length < minV) return;
    doFinishDraw(drawLayer.current, verts, gt, formData.color || '#16a34a');
  };

  const handleUndoDraw = () => {
    if (drawVertices.current.length === 0) return;
    drawVertices.current = drawVertices.current.slice(0, -1);
    const newLen = drawVertices.current.length;
    setDrawVCount(newLen);
    setDrawDone(false);
    setFormData(prev => ({ ...prev, polygon: null }));
    renderPreview(drawLayer.current, drawVertices.current, false, formData.geom_type, formData.color || '#16a34a');
  };

  const handleClearDraw = () => {
    drawVertices.current = [];
    setDrawVCount(0);
    setDrawDone(false);
    setFormData(prev => ({ ...prev, polygon: null }));
    if (drawLayer.current) drawLayer.current.clearLayers();
  };

  const handleRedibujar = () => {
    setDrawDone(false);
    renderPreview(drawLayer.current, drawVertices.current, false, formData.geom_type, formData.color || '#16a34a');
  };

  // ── Modal ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setModalMode('create');
    setFormData(EMPTY_FORM);
    setOriginalData(null);
    setSelected(null);
    setShowMap(false);
    setDrawVCount(0);
    setDrawDone(false);
    drawVertices.current = [];
    setMapKey(0);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setModalMode('edit');
    setSelected(item);
    const data = {
      name:        item.name        ?? '',
      description: item.description ?? '',
      category:    item.category    ?? '',
      color:       item.color       ?? '#16a34a',
      geom_type:   item.geom_type   ?? 'POINT',
      lat:         item.lat         ?? '',
      lng:         item.lng         ?? '',
      polygon:     item.polygon     ?? null,
    };
    setFormData(data);
    setOriginalData(data);
    drawVertices.current = [];
    setDrawVCount(0);
    setDrawDone(!!item.polygon);
    setShowMap(true);
    setMapKey(k => k + 1);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    destroyMap();
    setShowModal(false);
    setShowMap(false);
    setSelected(null);
    setOriginalData(null);
    setFormData(EMPTY_FORM);
    setDrawVCount(0);
    setDrawDone(false);
    drawVertices.current = [];
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Al cambiar tipo de geometría: reiniciar dibujo y mapa
    if (name === 'geom_type') {
      drawVertices.current = [];
      setDrawVCount(0);
      setDrawDone(false);
      setFormData(prev => ({ ...prev, [name]: value, polygon: null, lat: '', lng: '' }));
      if (showMap) {
        destroyMap();
        setMapKey(k => k + 1);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!formData.name.trim())     { setError('El nombre es obligatorio');    return; }
    if (!formData.category.trim()) { setError('La categoría es obligatoria'); return; }

    const payload = {
      name:      formData.name.trim(),
      category:  formData.category.trim(),
      geom_type: formData.geom_type,
      ...(formData.description && { description: formData.description.trim() }),
      ...(formData.color       && { color: formData.color }),
    };

    if (formData.geom_type === 'POINT') {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (!isNaN(lat)) payload.lat = lat;
      if (!isNaN(lng)) payload.lng = lng;
    } else if (formData.polygon) {
      payload.polygon = formData.polygon;
      if (formData.lat !== '') payload.lat = parseFloat(formData.lat);
      if (formData.lng !== '') payload.lng = parseFloat(formData.lng);
    }

    try {
      setLoading(true);
      if (modalMode === 'create') {
        await campaignPointService.create(payload);
        setSuccess('Punto de obra creado correctamente');
      } else {
        const changed = {};
        Object.keys(payload).forEach(k => {
          if (JSON.stringify(payload[k]) !== JSON.stringify(originalData[k])) changed[k] = payload[k];
        });
        if (Object.keys(changed).length === 0) { setError('No se realizaron cambios'); setLoading(false); return; }
        await campaignPointService.update(selected.id, changed);
        setSuccess('Punto actualizado correctamente');
      }
      closeModal();
      setRefresh(p => !p);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este punto de obra?')) return;
    try {
      setLoading(true); setError(null);
      await campaignPointService.delete(id);
      setSuccess('Punto eliminado');
      setRefresh(p => !p);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // ── Sin acceso ────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="gestion-campana-container">
        <div className="campana-alert campana-alert-error">
          <X size={18} /><span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  const isDrawMode = formData.geom_type !== 'POINT';
  const minVertsRequired = formData.geom_type === 'POLYLINE' ? 2 : 3;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="gestion-campana-container">

      {/* Header */}
      <div className="campana-header">
        <div className="campana-header-content">
          <div className="campana-header-icon"><Flag size={22} /></div>
          <div className="campana-header-text">
            <h1>Puntos de Obra</h1>
            <p>Administra los puntos geográficos de obra municipal</p>
          </div>
        </div>
        <div className="campana-header-actions">
          <button onClick={() => setRefresh(p => !p)} className="btn-campana-refresh">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            Actualizar
          </button>
          <button onClick={openCreate} className="btn-campana-primary">
            <Plus size={16} /> Nuevo Punto
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error   && <div className="campana-alert campana-alert-error">  <X size={16} /><span>{error}</span></div>}
      {success && <div className="campana-alert campana-alert-success"><Save size={16} /><span>{success}</span></div>}

      {/* Toolbar */}
      <div className="campana-toolbar">
        <SearchInput
          value={params.search || ''}
          onChange={v => addParams({ search: v, page: 1 })}
          placeholder="Buscar por nombre o descripción…"
        />
        <select
          className="campana-filter-select"
          value={params.category || ''}
          onChange={e => addParams({ category: e.target.value, page: 1 })}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c.category} value={c.category}>{c.category}</option>
          ))}
        </select>
        <span className="campana-count">{count} punto{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="campana-table-wrapper">
        {items.length === 0 && !loading ? (
          <div className="campana-empty">
            <Flag size={40} />
            <p>No se encontraron puntos de obra</p>
          </div>
        ) : (
          <table className="campana-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Color</th>
                <th>Coordenadas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="campana-td-num">
                    {((parseInt(params.page) || 1) - 1) * (parseInt(params.limit) || 20) + idx + 1}
                  </td>
                  <td className="campana-td-name">{item.name}</td>
                  <td><span className="campana-badge">{item.category}</span></td>
                  <td className="campana-td-desc">{item.description || '—'}</td>
                  <td><span className="campana-badge campana-badge-type">{item.geom_type}</span></td>
                  <td>
                    {item.color
                      ? <div className="campana-color-dot" style={{ background: item.color }} title={item.color} />
                      : '—'}
                  </td>
                  <td className="campana-td-coords">
                    {item.lat != null && item.lng != null
                      ? `${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}`
                      : item.polygon ? `${item.polygon.length} coords` : '—'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-table-edit"   onClick={() => openEdit(item)}><Edit2 size={12} /> Editar</button>
                      <button className="btn-table-delete" onClick={() => handleDelete(item.id)}><Trash2 size={12} /> Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="campana-pagination">
        <TablePagination
          currentPage={parseInt(params.page) || 1}
          totalItems={count}
          itemsPerPage={parseInt(params.limit) || 20}
          onPageChange={p => addParams({ page: p })}
          onLimitChange={l => addParams({ limit: l, page: 1 })}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="campana-modal" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Nuevo Punto de Obra' : 'Editar Punto de Obra'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {error && (
                  <div className="campana-alert campana-alert-error" style={{ marginBottom: 14 }}>
                    <X size={14} /><span>{error}</span>
                  </div>
                )}

                {/* Nombre */}
                <div className="form-group">
                  <label>Nombre *</label>
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="Ej. Plaza de Armas" autoFocus />
                </div>

                {/* Categoría + Tipo */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Categoría *</label>
                    <input
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="Ej. Parque, Colegio…"
                      list="campana-categories-list"
                    />
                    <datalist id="campana-categories-list">
                      {categories.map(c => <option key={c.category} value={c.category} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Tipo geometría</label>
                    <select name="geom_type" value={formData.geom_type} onChange={handleChange}>
                      <option value="POINT">POINT — Punto simple</option>
                      <option value="POLYGON">POLYGON — Área única</option>
                      <option value="POLYLINE">POLYLINE — Línea/trayecto</option>
                      <option value="MULTI">MULTI — Múltiples áreas</option>
                    </select>
                  </div>
                </div>

                {/* Descripción */}
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción opcional…" rows={2} />
                </div>

                {/* Color */}
                <div className="form-group form-group-color">
                  <label>Color</label>
                  <div className="color-input-wrap">
                    <input type="color" name="color" value={formData.color} onChange={handleChange} />
                    <span>{formData.color}</span>
                  </div>
                </div>

                {/* ── POINT: lat/lng + pin ─────────────────────────────── */}
                {!isDrawMode && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitud</label>
                        <input name="lat" value={formData.lat} onChange={handleChange} placeholder="-11.9699" />
                      </div>
                      <div className="form-group">
                        <label>Longitud</label>
                        <input name="lng" value={formData.lng} onChange={handleChange} placeholder="-76.998" />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-map-toggle"
                      onClick={() => { if (leafletMap.current) destroyMap(); setShowMap(p => !p); }}
                    >
                      <MapPin size={14} />
                      {showMap ? 'Ocultar mapa' : 'Ver en mapa'}
                    </button>
                    {showMap && (
                      <>
                        <div key={mapKey} className="map-preview-container">
                          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <p className="map-hint">Arrastra el pin o haz <strong>doble clic</strong> en el mapa para actualizar las coordenadas.</p>
                      </>
                    )}
                  </>
                )}

                {/* ── POLYGON / POLYLINE / MULTI: dibujo ──────────────── */}
                {isDrawMode && (
                  <>
                    <button
                      type="button"
                      className="btn-map-toggle"
                      onClick={() => {
                        if (!showMap) setMapKey(k => k + 1);
                        setShowMap(p => !p);
                      }}
                    >
                      <MapPin size={14} />
                      {showMap ? 'Ocultar mapa' : 'Dibujar en mapa'}
                    </button>

                    {showMap && (
                      <>
                        {/* Toolbar de dibujo */}
                        <div className="draw-toolbar">
                          <span className="draw-vcount">
                            {drawVCount} vértice{drawVCount !== 1 ? 's' : ''}
                          </span>
                          {!drawDone && drawVCount >= minVertsRequired && (
                            <button type="button" className="btn-draw-action btn-draw-finish" onClick={handleCloseShape}>
                              ✓ {formData.geom_type === 'POLYLINE' ? 'Finalizar línea' : 'Cerrar polígono'}
                            </button>
                          )}
                          {drawVCount > 0 && !drawDone && (
                            <>
                              <button type="button" className="btn-draw-action btn-draw-undo"  onClick={handleUndoDraw}>↩ Deshacer</button>
                              <button type="button" className="btn-draw-action btn-draw-clear" onClick={handleClearDraw}>✕ Limpiar</button>
                            </>
                          )}
                          {drawDone && (
                            <button type="button" className="btn-draw-action btn-draw-redo" onClick={handleRedibujar}>✏ Redibujar</button>
                          )}
                        </div>

                        {/* Mapa */}
                        <div key={mapKey} className="map-preview-container" style={{ height: 280 }}>
                          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                        </div>

                        <p className="map-hint">
                          {drawDone
                            ? `✓ Forma guardada con ${formData.polygon?.length || 0} coordenadas. Haz clic en "Redibujar" para modificar.`
                            : formData.geom_type === 'POLYLINE'
                              ? 'Haz clic en el mapa para agregar puntos. Doble clic para finalizar la línea.'
                              : `Haz clic para agregar vértices (mín. ${minVertsRequired}). Doble clic para cerrar el polígono.`
                          }
                        </p>
                      </>
                    )}

                    {/* Indicador si el mapa está oculto pero hay forma guardada */}
                    {!showMap && formData.polygon && (
                      <div className="draw-saved-info">
                        ✓ {formData.polygon.length} coordenadas guardadas
                      </div>
                    )}
                  </>
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  <Save size={14} />
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default GestionPuntosCampana;
