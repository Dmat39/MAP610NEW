import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, RefreshCw, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import comisariasService from '../../services/comisariasService';
import { useAuth } from '../../context/AuthContext';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionComisarias.css';

const EMPTY_FORM = { name: '', latitude: '', longitude: '' };
const DEFAULT_CENTER = [-11.9699, -76.998];

const GestionComisarias = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  const [comisarias, setComisarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [refresh, setRefresh] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showMap, setShowMap] = useState(false);

  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markerRef   = useRef(null);

  const { hasModuleAccess, hasModuleOp } = useAuth();
  const hasAccess = hasModuleAccess('comisarias');
  const canWrite  = hasModuleOp('comisarias', 'create');
  const canEdit   = hasModuleOp('comisarias', 'edit');
  const canDelete = hasModuleOp('comisarias', 'delete');

  useEffect(() => {
    if (hasAccess) loadData();
  }, [location.search, refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await comisariasService.getAll({
        search: params.search || '',
        page:   parseInt(params.page)  || 1,
        limit:  parseInt(params.limit) || 20,
      });
      setComisarias(Array.isArray(res.data) ? res.data : []);
      setCount(res.count || 0);
    } catch (err) {
      setError(err.message);
      setComisarias([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Inicializar mapa ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showMap || !mapRef.current || leafletMap.current) return;

    const lat = parseFloat(formData.latitude) || DEFAULT_CENTER[0];
    const lng = parseFloat(formData.longitude) || DEFAULT_CENTER[1];

    leafletMap.current = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 17,
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
        background:#1565C0;
        border:2.5px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(21,101,192,0.5);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true })
      .addTo(leafletMap.current);

    // Arrastrar marcador actualiza inputs
    markerRef.current.on('dragend', () => {
      const { lat: newLat, lng: newLng } = markerRef.current.getLatLng();
      setFormData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
      setSuccess('Coordenadas actualizadas');
      setTimeout(() => setSuccess(null), 2000);
    });

    // Doble clic mueve el marcador
    leafletMap.current.on('dblclick', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      markerRef.current.setLatLng([newLat, newLng]);
      setFormData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
      setSuccess('Coordenadas actualizadas');
      setTimeout(() => setSuccess(null), 2000);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap]);

  // ── Sincronizar marcador con inputs ─────────────────────────────────────────
  useEffect(() => {
    if (!markerRef.current) return;
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current?.setView([lat, lng]);
    }
  }, [formData.latitude, formData.longitude]);

  // ── Destruir mapa al cerrar ─────────────────────────────────────────────────
  const destroyMap = () => {
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
      markerRef.current = null;
    }
  };

  // ── Modal helpers ───────────────────────────────────────────────────────────
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
      name:      item.name      ?? '',
      latitude:  item.latitude  ?? '',
      longitude: item.longitude ?? '',
    };
    setFormData(data);
    setOriginalData(data);
    setError(null);
    setShowMap(true);   // ← mapa abierto por defecto al editar
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

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!formData.name.trim()) { setError('El nombre es obligatorio'); return; }
    if (isNaN(lat) || isNaN(lng)) { setError('Latitud y longitud deben ser números válidos'); return; }

    try {
      setLoading(true);
      if (modalMode === 'create') {
        await comisariasService.create({ name: formData.name.trim(), latitude: lat, longitude: lng });
        setSuccess('Comisaría creada correctamente');
      } else {
        const changed = {};
        if (formData.name.trim() !== originalData.name)              changed.name      = formData.name.trim();
        if (String(lat)  !== String(originalData.latitude))          changed.latitude  = lat;
        if (String(lng)  !== String(originalData.longitude))         changed.longitude = lng;
        if (Object.keys(changed).length === 0) { setError('No se realizaron cambios'); setLoading(false); return; }
        await comisariasService.update(selected.id, changed);
        setSuccess('Comisaría actualizada correctamente');
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
    if (!window.confirm('¿Eliminar esta comisaría?')) return;
    try {
      setLoading(true);
      setError(null);
      await comisariasService.delete(id);
      setSuccess('Comisaría eliminada');
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
      <div className="gestion-comisarias-container">
        <div className="comisarias-alert comisarias-alert-error">
          <X size={18} /><span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-comisarias-container">

      {/* Header */}
      <div className="comisarias-header">
        <div className="comisarias-header-content">
          <div className="comisarias-header-icon"><MapPin size={22} /></div>
          <div className="comisarias-header-text">
            <h1>Gestión de Comisarías</h1>
            <p>Administra las comisarías del distrito</p>
          </div>
        </div>
        <div className="comisarias-header-actions">
          <button onClick={() => setRefresh(p => !p)} className="btn-comisarias-refresh">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            Actualizar
          </button>
          {canWrite && (
            <button onClick={openCreate} className="btn-comisarias-primary">
              <Plus size={16} /> Nueva Comisaría
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {error   && <div className="comisarias-alert comisarias-alert-error">  <X size={16} /><span>{error}</span></div>}
      {success && <div className="comisarias-alert comisarias-alert-success"><Save size={16} /><span>{success}</span></div>}

      {/* Toolbar */}
      <div className="comisarias-toolbar">
        <SearchInput
          value={params.search || ''}
          onChange={v => addParams({ search: v, page: 1 })}
          placeholder="Buscar por nombre…"
        />
        <span className="comisarias-count">{count} comisaría{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="comisarias-table-wrapper">
        {comisarias.length === 0 && !loading ? (
          <div className="comisarias-empty">
            <MapPin size={40} />
            <p>No se encontraron comisarías</p>
          </div>
        ) : (
          <table className="comisarias-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comisarias.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>
                    {((parseInt(params.page) || 1) - 1) * (parseInt(params.limit) || 20) + idx + 1}
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{Number(item.latitude).toFixed(6)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{Number(item.longitude).toFixed(6)}</td>
                  <td>
                    <div className="table-actions">
                      {canEdit && (
                        <button className="btn-table-edit" onClick={() => openEdit(item)}>
                          <Edit2 size={12} /> Editar
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-table-delete" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={12} /> Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="comisarias-pagination">
        <TablePagination
          currentPage={parseInt(params.page) || 1}
          totalPages={Math.ceil(count / (parseInt(params.limit) || 20))}
          onPageChange={p => addParams({ page: p })}
        />
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="comisarias-modal" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Nueva Comisaría' : 'Editar Comisaría'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {error && (
                  <div className="comisarias-alert comisarias-alert-error" style={{ marginBottom: 14 }}>
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
                    placeholder="Ej. Comisaría Canto Rey"
                    autoFocus
                  />
                </div>

                {/* Coordenadas */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Latitud *</label>
                    <input
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="-12.027029"
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitud *</label>
                    <input
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="-77.001339"
                    />
                  </div>
                </div>

                {/* Botón mostrar/ocultar mapa */}
                <button
                  type="button"
                  className="btn-map-toggle"
                  onClick={() => { destroyMap(); setShowMap(p => !p); }}
                >
                  <MapPin size={14} />
                  {showMap ? 'Ocultar mapa' : 'Ver en mapa'}
                </button>

                {/* Mapa */}
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

export default GestionComisarias;
