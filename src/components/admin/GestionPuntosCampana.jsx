import { useState, useEffect, useRef } from 'react';
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

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  color: '#16a34a',
  geom_type: 'POINT',
  lat: '',
  lng: '',
};

const DEFAULT_CENTER = [-11.9699, -76.998];

const GestionPuntosCampana = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [count, setCount]       = useState(0);
  const [refresh, setRefresh]   = useState(false);
  const [categories, setCategories] = useState([]);

  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState('create');
  const [selected, setSelected]     = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [showMap, setShowMap]       = useState(false);

  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markerRef  = useRef(null);

  const { hasModuleAccess } = useAuth();
  const hasAccess = hasModuleAccess('puntos-campana');

  useEffect(() => {
    if (hasAccess) {
      loadData();
      loadCategories();
    }
  }, [location.search, refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await campaignPointService.getAll({
        search:   params.search   || '',
        category: params.category || '',
        page:     parseInt(params.page)  || 1,
        limit:    parseInt(params.limit) || 20,
      });
      setItems(Array.isArray(res.data) ? res.data : []);
      setCount(res.count || 0);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await campaignPointService.getCategories();
      setCategories(cats);
    } catch {
      // no-op
    }
  };

  // ── Mapa ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showMap || !mapRef.current || leafletMap.current) return;

    const lat = parseFloat(formData.lat) || DEFAULT_CENTER[0];
    const lng = parseFloat(formData.lng) || DEFAULT_CENTER[1];

    leafletMap.current = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;
        background:${formData.color || '#16a34a'};
        border:2.5px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true })
      .addTo(leafletMap.current);

    markerRef.current.on('dragend', () => {
      const { lat: newLat, lng: newLng } = markerRef.current.getLatLng();
      setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
      setSuccess('Coordenadas actualizadas');
      setTimeout(() => setSuccess(null), 2000);
    });

    leafletMap.current.on('dblclick', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      markerRef.current.setLatLng([newLat, newLng]);
      setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
      setSuccess('Coordenadas actualizadas');
      setTimeout(() => setSuccess(null), 2000);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current  = null;
      }
    };
  }, [showMap]);

  useEffect(() => {
    if (!markerRef.current) return;
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current?.setView([lat, lng]);
    }
  }, [formData.lat, formData.lng]);

  const destroyMap = () => {
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
      markerRef.current  = null;
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setFormData(EMPTY_FORM);
    setOriginalData(null);
    setSelected(null);
    setShowMap(false);
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
    };
    setFormData(data);
    setOriginalData(data);
    setError(null);
    setShowMap(true);
    setShowModal(true);
  };

  const closeModal = () => {
    destroyMap();
    setShowModal(false);
    setShowMap(false);
    setSelected(null);
    setOriginalData(null);
    setFormData(EMPTY_FORM);
    setError(null);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
    }

    try {
      setLoading(true);
      if (modalMode === 'create') {
        await campaignPointService.create(payload);
        setSuccess('Punto de campaña creado correctamente');
      } else {
        const changed = {};
        Object.keys(payload).forEach(k => {
          if (String(payload[k]) !== String(originalData[k])) changed[k] = payload[k];
        });
        if (Object.keys(changed).length === 0) {
          setError('No se realizaron cambios');
          setLoading(false);
          return;
        }
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
    if (!window.confirm('¿Eliminar este punto de campaña?')) return;
    try {
      setLoading(true);
      setError(null);
      await campaignPointService.delete(id);
      setSuccess('Punto eliminado');
      setRefresh(p => !p);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="gestion-campana-container">
        <div className="campana-alert campana-alert-error">
          <X size={18} /><span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-campana-container">

      {/* Header */}
      <div className="campana-header">
        <div className="campana-header-content">
          <div className="campana-header-icon"><Flag size={22} /></div>
          <div className="campana-header-text">
            <h1>Puntos de Campaña</h1>
            <p>Administra los puntos geográficos de campaña municipal</p>
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
            <p>No se encontraron puntos de campaña</p>
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
                  <td>
                    <span className="campana-badge">{item.category}</span>
                  </td>
                  <td className="campana-td-desc">{item.description || '—'}</td>
                  <td>
                    <span className="campana-badge campana-badge-type">{item.geom_type}</span>
                  </td>
                  <td>
                    {item.color ? (
                      <div className="campana-color-dot" style={{ background: item.color }} title={item.color} />
                    ) : '—'}
                  </td>
                  <td className="campana-td-coords">
                    {item.lat != null && item.lng != null
                      ? `${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}`
                      : '—'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-table-edit" onClick={() => openEdit(item)}>
                        <Edit2 size={12} /> Editar
                      </button>
                      <button className="btn-table-delete" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={12} /> Eliminar
                      </button>
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
              <h2>{modalMode === 'create' ? 'Nuevo Punto de Campaña' : 'Editar Punto de Campaña'}</h2>
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
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ej. Plaza de Armas"
                    autoFocus
                  />
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
                      {categories.map(c => (
                        <option key={c.category} value={c.category} />
                      ))}
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
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descripción opcional…"
                    rows={2}
                  />
                </div>

                {/* Color */}
                <div className="form-group form-group-color">
                  <label>Color</label>
                  <div className="color-input-wrap">
                    <input
                      type="color"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                    />
                    <span>{formData.color}</span>
                  </div>
                </div>

                {/* Coordenadas (solo para POINT) */}
                {formData.geom_type === 'POINT' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitud</label>
                        <input
                          name="lat"
                          value={formData.lat}
                          onChange={handleChange}
                          placeholder="-11.9699"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitud</label>
                        <input
                          name="lng"
                          value={formData.lng}
                          onChange={handleChange}
                          placeholder="-76.998"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-map-toggle"
                      onClick={() => { destroyMap(); setShowMap(p => !p); }}
                    >
                      <MapPin size={14} />
                      {showMap ? 'Ocultar mapa' : 'Ver en mapa'}
                    </button>

                    {showMap && (
                      <>
                        <div className="map-preview-container">
                          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <p className="map-hint">
                          Arrastra el pin o haz <strong>doble clic</strong> en el mapa para actualizar las coordenadas.
                        </p>
                      </>
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
