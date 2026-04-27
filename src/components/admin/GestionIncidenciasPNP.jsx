import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Shield,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import pnpIncidenceService from '../../services/pnpIncidenceService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionIncidenciasPNP.css';

const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Mañana' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'NIGHT', label: 'Noche' },
];

const CASE_STATUS_OPTIONS = [
  { value: 'INVESTIGATING', label: 'En investigación' },
  { value: 'REFERRED', label: 'Derivado' },
  { value: 'CLOSED', label: 'Cerrado' },
];

const SHIFT_COLORS = {
  MORNING: '#ffd93d',
  AFTERNOON: '#ff8c42',
  NIGHT: '#6c5ce7',
};

const STATUS_COLORS = {
  INVESTIGATING: '#3b82f6',
  REFERRED: '#f59e0b',
  CLOSED: '#10b981',
};

const INCIDENCE_TYPES = [
  'Robo al paso', 'Robo agravado', 'Microcomercialización de drogas',
  'Violencia familiar', 'Accidente de tránsito', 'Violencia sexual',
  'Homicidio', 'Lesiones', 'Hurto', 'Otros',
];

const JURISDICTIONS = [
  'Caja de Agua', 'Zárate', 'Huayrona', 'Canto Rey',
  'Santa Elizabeth', 'Bayóvar', 'Mariscal Cáceres', '10 de Octubre',
];

const EMPTY_FORM = {
  description: '',
  incidence_type: '',
  latitude: '',
  longitude: '',
  jurisdiction: '',
  shift: '',
  complaint_number: '',
  police_station: '',
  case_status: 'INVESTIGATING',
  occurred_at: '',
};

const GestionIncidenciasPNP = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [update, setUpdate] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showMapPreview, setShowMapPreview] = useState(false);

  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  const userRole = authService.getUserRole();
  const canWrite = ['SUPERADMIN', 'PNP'].includes(userRole);
  const hasAccess = ['SUPERADMIN', 'ADMINISTRATOR', 'SUPERVISOR', 'PNP'].includes(userRole);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [location.search, update]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: params.search || '',
        shift: params.shift || '',
        jurisdiction: params.jurisdiction || '',
        page: parseInt(params.page) || 1,
        limit: parseInt(params.limit) || 20,
      };
      const response = await pnpIncidenceService.getAll(filters);
      setIncidencias(Array.isArray(response.data) ? response.data : []);
      setCount(response.count || 0);
    } catch (err) {
      setError(err.message);
      setIncidencias([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = item => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      description: item.description || '',
      incidence_type: item.incidence_type || '',
      latitude: item.latitude ?? '',
      longitude: item.longitude ?? '',
      jurisdiction: item.jurisdiction || '',
      shift: item.shift || '',
      complaint_number: item.complaint_number || '',
      police_station: item.police_station || '',
      case_status: item.case_status || 'INVESTIGATING',
      occurred_at: item.occurred_at ? item.occurred_at.substring(0, 16) : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setFormData(EMPTY_FORM);
    setShowMapPreview(false);
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    markerRef.current = null;
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canWrite) return;

    const required = ['description', 'incidence_type', 'latitude', 'longitude', 'jurisdiction', 'shift', 'police_station', 'occurred_at'];
    for (const field of required) {
      if (!formData[field] && formData[field] !== 0) {
        showMessage(`El campo "${field}" es requerido`, true);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        occurred_at: new Date(formData.occurred_at).toISOString(),
        complaint_number: formData.complaint_number || undefined,
      };

      if (modalMode === 'create') {
        await pnpIncidenceService.create(payload);
        showMessage('Incidencia registrada correctamente');
      } else {
        await pnpIncidenceService.update(selectedItem.id, payload);
        showMessage('Incidencia actualizada correctamente');
      }
      closeModal();
      setUpdate(p => !p);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = item => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await pnpIncidenceService.delete(deleteTarget.id);
      showMessage('Incidencia eliminada correctamente');
      setUpdate(p => !p);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Map preview
  useEffect(() => {
    if (showMapPreview && mapRef.current && !leafletMapRef.current) {
      const lat = parseFloat(formData.latitude) || -11.9699;
      const lng = parseFloat(formData.longitude) || -76.998;

      leafletMapRef.current = L.map(mapRef.current, {
        center: [lat, lng], zoom: 17, zoomControl: true,
        attributionControl: false, doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
        .addTo(leafletMapRef.current);

      const icon = L.divIcon({
        html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([lat, lng], { icon }).addTo(leafletMapRef.current);

      leafletMapRef.current.on('dblclick', e => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      });
    }
    return () => {
      if (!showMapPreview && leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMapPreview]);

  useEffect(() => {
    if (markerRef.current && formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current.setLatLng([lat, lng]);
        leafletMapRef.current?.panTo([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  if (!hasAccess) {
    return (
      <div className="pnp-container">
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          No tienes permisos para acceder a este módulo.
        </div>
      </div>
    );
  }

  return (
    <div className="pnp-container">
      {/* Header */}
      <div className="pnp-header">
        <div className="pnp-header-content">
          <div className="pnp-header-icon">
            <Shield size={28} />
          </div>
          <div className="pnp-header-text">
            <h1>Incidencias PNP</h1>
            <p>Registro de incidencias policiales — {count} registros</p>
          </div>
        </div>
        <div className="pnp-header-actions">
          <button className="btn-pnp-secondary" onClick={() => setUpdate(p => !p)}>
            <RefreshCw size={15} /> Actualizar
          </button>
          {canWrite && (
            <button className="btn-pnp-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nueva Incidencia
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="pnp-alert pnp-alert-error">
          <X size={16} onClick={() => setError(null)} style={{ cursor: 'pointer', float: 'right' }} />
          {error}
        </div>
      )}
      {success && (
        <div className="pnp-alert pnp-alert-success">{success}</div>
      )}

      {/* Filters */}
      <div className="pnp-filters">
        <SearchInput
          value={params.search || ''}
          onChange={v => addParams({ search: v, page: 1 })}
          placeholder="Buscar por descripción, tipo, comisaría..."
        />
        <select
          className="pnp-select-filter"
          value={params.shift || ''}
          onChange={e => addParams({ shift: e.target.value, page: 1 })}
        >
          <option value="">Todos los turnos</option>
          {SHIFT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="pnp-select-filter"
          value={params.jurisdiction || ''}
          onChange={e => addParams({ jurisdiction: e.target.value, page: 1 })}
        >
          <option value="">Todas las jurisdicciones</option>
          {JURISDICTIONS.map(j => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="pnp-table-wrapper">
        {loading ? (
          <div className="pnp-loading">Cargando...</div>
        ) : incidencias.length === 0 ? (
          <div className="pnp-empty">No se encontraron incidencias.</div>
        ) : (
          <table className="pnp-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Turno</th>
                <th>Jurisdicción</th>
                <th>Comisaría</th>
                <th>Estado</th>
                <th>Fecha</th>
                {canWrite && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {incidencias.map(item => (
                <tr key={item.id}>
                  <td>{item.incidence_type}</td>
                  <td className="pnp-desc-cell">{item.description}</td>
                  <td>
                    <span
                      className="pnp-badge"
                      style={{ background: SHIFT_COLORS[item.shift] + '33', color: SHIFT_COLORS[item.shift], border: `1px solid ${SHIFT_COLORS[item.shift]}` }}
                    >
                      {SHIFT_OPTIONS.find(s => s.value === item.shift)?.label || item.shift}
                    </span>
                  </td>
                  <td>{item.jurisdiction}</td>
                  <td>{item.police_station}</td>
                  <td>
                    <span
                      className="pnp-badge"
                      style={{ background: STATUS_COLORS[item.case_status] + '22', color: STATUS_COLORS[item.case_status], border: `1px solid ${STATUS_COLORS[item.case_status]}` }}
                    >
                      {CASE_STATUS_OPTIONS.find(s => s.value === item.case_status)?.label || item.case_status}
                    </span>
                  </td>
                  <td>{item.occurred_at ? new Date(item.occurred_at).toLocaleDateString('es-PE') : '-'}</td>
                  {canWrite && (
                    <td>
                      <div className="pnp-actions">
                        <button className="btn-pnp-icon edit" onClick={() => openEditModal(item)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-pnp-icon delete" onClick={() => confirmDelete(item)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TablePagination
        currentPage={parseInt(params.page) || 1}
        totalItems={count}
        itemsPerPage={parseInt(params.limit) || 20}
        onPageChange={page => addParams({ page })}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="pnp-modal-overlay" onClick={closeModal}>
          <div className="pnp-modal" onClick={e => e.stopPropagation()}>
            <div className="pnp-modal-header">
              <h2>{modalMode === 'create' ? 'Nueva Incidencia PNP' : 'Editar Incidencia'}</h2>
              <button className="pnp-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="pnp-modal-body">
              <div className="pnp-form-grid">
                <div className="pnp-form-group full">
                  <label>Descripción *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    required
                    placeholder="Describe la incidencia..."
                  />
                </div>

                <div className="pnp-form-group">
                  <label>Tipo de Incidencia *</label>
                  <select name="incidence_type" value={formData.incidence_type} onChange={handleFormChange} required>
                    <option value="">Seleccionar...</option>
                    {INCIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="pnp-form-group">
                  <label>Turno *</label>
                  <select name="shift" value={formData.shift} onChange={handleFormChange} required>
                    <option value="">Seleccionar...</option>
                    {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="pnp-form-group">
                  <label>Jurisdicción *</label>
                  <select name="jurisdiction" value={formData.jurisdiction} onChange={handleFormChange} required>
                    <option value="">Seleccionar...</option>
                    {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div className="pnp-form-group">
                  <label>Comisaría *</label>
                  <input
                    type="text"
                    name="police_station"
                    value={formData.police_station}
                    onChange={handleFormChange}
                    required
                    placeholder="Nombre de la comisaría"
                  />
                </div>

                <div className="pnp-form-group">
                  <label>N° Denuncia</label>
                  <input
                    type="text"
                    name="complaint_number"
                    value={formData.complaint_number}
                    onChange={handleFormChange}
                    placeholder="Opcional"
                  />
                </div>

                <div className="pnp-form-group">
                  <label>Estado del Caso *</label>
                  <select name="case_status" value={formData.case_status} onChange={handleFormChange} required>
                    {CASE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="pnp-form-group">
                  <label>Fecha y Hora del Hecho *</label>
                  <input
                    type="datetime-local"
                    name="occurred_at"
                    value={formData.occurred_at}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="pnp-form-group">
                  <label>Latitud *</label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleFormChange}
                    step="any"
                    required
                    placeholder="-11.9699"
                  />
                </div>

                <div className="pnp-form-group">
                  <label>Longitud *</label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleFormChange}
                    step="any"
                    required
                    placeholder="-76.998"
                  />
                </div>

                <div className="pnp-form-group full">
                  <button
                    type="button"
                    className="btn-pnp-secondary btn-map-toggle"
                    onClick={() => setShowMapPreview(p => !p)}
                  >
                    <MapPin size={14} />
                    {showMapPreview ? 'Ocultar mapa' : 'Seleccionar en mapa (doble clic)'}
                  </button>
                  {showMapPreview && (
                    <div ref={mapRef} className="pnp-map-preview" />
                  )}
                </div>
              </div>

              <div className="pnp-modal-footer">
                <button type="button" className="btn-pnp-secondary" onClick={closeModal}>
                  <X size={14} /> Cancelar
                </button>
                <button type="submit" className="btn-pnp-primary" disabled={loading}>
                  <Save size={14} /> {modalMode === 'create' ? 'Registrar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="pnp-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="pnp-modal pnp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pnp-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="pnp-modal-close" onClick={() => setShowDeleteConfirm(false)}><X size={18} /></button>
            </div>
            <div className="pnp-modal-body">
              <p>¿Estás seguro que deseas eliminar esta incidencia?</p>
              <p style={{ color: '#6b7280', fontSize: '13px' }}>{deleteTarget?.description}</p>
            </div>
            <div className="pnp-modal-footer">
              <button className="btn-pnp-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-pnp-danger" onClick={handleDelete} disabled={loading}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionIncidenciasPNP;
