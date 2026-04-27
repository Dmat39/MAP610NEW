import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Download, Calendar, User, FileText, Tag } from 'lucide-react';
import ExcelJS from 'exceljs';
import actividadesAdminService from '../../services/actividadesAdminService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GestionActividades.css';

const GestionActividades = () => {
  const location = useLocation();
  const { addParams, getParams, removeParams } = UseUrlParamsManager();
  const params = getParams();

  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [update, setUpdate] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedActividad, setSelectedActividad] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    representative: '',
    done_at: '',
    act_type: '',
    latitude: '',
    longitude: '',
  });

  const [showMapPreview, setShowMapPreview] = useState(false);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  // Verificar si es administrador o codisec
  const userRole = authService.getUserRole();
  const hasAccess = authService.isAdmin() || userRole === 'CODISEC';
  const canWrite = authService.isSuperAdmin();

  // Cargar actividades cuando cambian los parámetros de URL
  useEffect(() => {
    if (hasAccess) {
      loadActividades();
    }
  }, [location.search, update]);

  const loadActividades = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: params.search || '',
        act_type: params.act_type || '',
        page: parseInt(params.page) || 1,
        limit: parseInt(params.limit) || 20,
      };

      const response = await actividadesAdminService.getAll(filters);

      setActividades(Array.isArray(response.data) ? response.data : []);
      setCount(response.count || response.data?.length || 0);
    } catch (err) {
      setError(err.message);
      setActividades([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setUpdate(prev => !prev);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      address: '',
      description: '',
      representative: '',
      done_at: '',
      act_type: '',
      latitude: '',
      longitude: '',
    });
    setShowModal(true);
  };

  const openEditModal = async (actividad) => {
    setModalMode('edit');
    setSelectedActividad(actividad);

    try {
      setLoading(true);
      const fullData = await actividadesAdminService.getById(actividad.id);

      const editData = {
        address: fullData.address || '',
        description: fullData.description || '',
        representative: fullData.representative || '',
        done_at: fullData.done_at ? fullData.done_at.split('T')[0] : '',
        act_type: fullData.act_type || '',
        latitude: fullData.latitude !== undefined && fullData.latitude !== null ? fullData.latitude : '',
        longitude: fullData.longitude !== undefined && fullData.longitude !== null ? fullData.longitude : '',
      };

      setFormData(editData);
      setOriginalData({ ...editData });
    } catch (err) {
      const editData = {
        address: actividad.address || '',
        description: actividad.description || '',
        representative: actividad.representative || '',
        done_at: actividad.done_at ? actividad.done_at.split('T')[0] : '',
        act_type: actividad.act_type || '',
        latitude: actividad.latitude !== undefined && actividad.latitude !== null ? actividad.latitude : '',
        longitude: actividad.longitude !== undefined && actividad.longitude !== null ? actividad.longitude : '',
      };

      setFormData(editData);
      setOriginalData({ ...editData });
    } finally {
      setLoading(false);
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedActividad(null);
    setOriginalData(null);
    setFormData({
      address: '',
      description: '',
      representative: '',
      done_at: '',
      act_type: '',
      latitude: '',
      longitude: '',
    });
    setShowMapPreview(false);

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    markerRef.current = null;
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Inicializar mapa de previsualización
  useEffect(() => {
    if (showMapPreview && mapRef.current && !leafletMapRef.current) {
      const lat = parseFloat(formData.latitude) || -12.027257;
      const lng = parseFloat(formData.longitude) || -76.999918;

      leafletMapRef.current = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(leafletMapRef.current);

      const activityIcon = L.divIcon({
        className: 'custom-activity-marker',
        html: '<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([lat, lng], {
        icon: activityIcon,
        title: formData.description || 'Actividad',
      }).addTo(leafletMapRef.current);

      leafletMapRef.current.on('dblclick', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setSuccess('Coordenadas actualizadas desde el mapa');
        setTimeout(() => setSuccess(null), 2000);
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

  // Actualizar posición del marcador cuando cambian las coordenadas
  useEffect(() => {
    if (markerRef.current && formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current.setLatLng([lat, lng]);
        leafletMapRef.current?.setView([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      if (modalMode === 'create') {
        const dataToSend = {
          address: formData.address,
          description: formData.description,
          representative: formData.representative,
          done_at: formData.done_at,
          act_type: formData.act_type,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        };
        await actividadesAdminService.create(dataToSend);
        setSuccess('Actividad creada exitosamente');
      } else {
        // PATCH: solo enviar campos que cambiaron
        const changedFields = {};

        if (formData.address !== originalData.address) {
          changedFields.address = formData.address;
        }
        if (formData.description !== originalData.description) {
          changedFields.description = formData.description;
        }
        if (formData.representative !== originalData.representative) {
          changedFields.representative = formData.representative;
        }
        if (formData.done_at !== originalData.done_at) {
          changedFields.done_at = formData.done_at;
        }
        if (formData.act_type !== originalData.act_type) {
          changedFields.act_type = formData.act_type;
        }
        if (String(formData.latitude) !== String(originalData.latitude)) {
          changedFields.latitude = parseFloat(formData.latitude);
        }
        if (String(formData.longitude) !== String(originalData.longitude)) {
          changedFields.longitude = parseFloat(formData.longitude);
        }

        if (Object.keys(changedFields).length === 0) {
          setError('No se han realizado cambios');
          setLoading(false);
          return;
        }

        await actividadesAdminService.update(selectedActividad.id, changedFields);
        setSuccess('Actividad actualizada exitosamente');
      }

      closeModal();
      refreshData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('¿Estás seguro de eliminar esta actividad?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await actividadesAdminService.delete(id);
      setSuccess('Actividad eliminada exitosamente');
      refreshData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await actividadesAdminService.getAll({ page: 0 });
      const todasLasActividades = response.data || [];

      if (todasLasActividades.length === 0) {
        setError('No hay actividades para exportar');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Actividades');

      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Dirección', key: 'address', width: 40 },
        { header: 'Descripción', key: 'description', width: 30 },
        { header: 'Representante', key: 'representative', width: 25 },
        { header: 'Fecha', key: 'done_at', width: 15 },
        { header: 'Tipo', key: 'act_type', width: 15 },
        { header: 'Latitud', key: 'latitude', width: 15 },
        { header: 'Longitud', key: 'longitude', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92400E' },
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

      todasLasActividades.forEach((actividad, idx) => {
        worksheet.addRow({
          index: idx + 1,
          address: actividad.address || '',
          description: actividad.description || '',
          representative: actividad.representative || '',
          done_at: actividad.done_at ? actividad.done_at.split('T')[0] : '',
          act_type: actividad.act_type || '',
          latitude: actividad.latitude || '',
          longitude: actividad.longitude || '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `actividades_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      setSuccess('Excel exportado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      setError('Error al generar el archivo Excel');
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="gestion-actividades-container">
        <div className="actividades-alert actividades-alert-error">
          <X size={18} />
          <span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-actividades-container">
      <div className="actividades-header">
        <div className="actividades-header-content">
          <div className="actividades-header-icon"><Calendar size={24} /></div>
          <div className="actividades-header-text">
            <h1>Gestión de Actividades</h1>
            <p>Administra las actividades en puntos estratégicos</p>
          </div>
        </div>
        <div className="actividades-header-actions">
          <button onClick={refreshData} className="btn-actividades-refresh">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>
          <button onClick={exportarExcel} className="btn-actividades-excel" disabled={loading} title="Descargar Excel">
            <Download size={18} />
            <span>Descargar Excel</span>
          </button>
          {canWrite && (
            <button onClick={openCreateModal} className="btn-actividades-primary">
              <Plus size={18} />
              <span>Nueva Actividad</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="actividades-alert actividades-alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="actividades-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="actividades-alert actividades-alert-success">
          <Save size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="actividades-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="actividades-toolbar">
        <div className="actividades-toolbar-left">
          <SearchInput placeholder="Buscar por dirección..." />

          <div className="actividades-filters-group">
            <Filter size={16} style={{ color: '#6b7280' }} />

            {(params.act_type || params.search) && (
              <button onClick={() => removeParams()} className="btn-actividades-secondary">
                <X size={14} />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="actividades-toolbar-right">
          <span className="actividades-count-text">
            Total: <span className="actividades-count-number">{count}</span>
          </span>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA */}
      <div className="actividades-content">
        {loading ? (
          <div className="actividades-loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando actividades...</p>
          </div>
        ) : actividades.length === 0 ? (
          <div className="actividades-empty-state">
            <Calendar size={48} />
            <h3>No hay actividades registradas</h3>
            <p>Comienza creando una nueva actividad</p>
            {canWrite && (
              <button onClick={openCreateModal} className="btn-actividades-primary">
                <Plus size={18} />
                <span>Crear Actividad</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="actividades-table-wrapper">
              <table className="actividades-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dirección</th>
                    <th>Descripción</th>
                    <th>Representante</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Coordenadas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((actividad, index) => {
                    const page = parseInt(params.page) || 1;
                    const limit = parseInt(params.limit) || 20;
                    const globalIndex = (page - 1) * limit + index + 1;

                    return (
                      <tr key={actividad.id}>
                        <td>{globalIndex}</td>
                        <td>
                          <div className="actividades-address-cell">
                            <MapPin size={14} />
                            <span>{actividad.address}</span>
                          </div>
                        </td>
                        <td>{actividad.description}</td>
                        <td>
                          <div className="actividades-address-cell">
                            <User size={14} />
                            <span>{actividad.representative}</span>
                          </div>
                        </td>
                        <td>{actividad.done_at ? actividad.done_at.split('T')[0] : '-'}</td>
                        <td>
                          <span className="actividades-badge actividades-badge-type">{actividad.act_type}</span>
                        </td>
                        <td>
                          <div className="actividades-address-cell">
                            <MapPin size={14} />
                            {actividad.latitude?.toFixed(6)}, {actividad.longitude?.toFixed(6)}
                          </div>
                        </td>
                        <td>
                          <div className="actividades-action-buttons">
                            {canWrite && (
                              <>
                                <button
                                  className="btn-icon-actividades btn-edit"
                                  onClick={() => openEditModal(actividad)}
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className="btn-icon-actividades btn-delete"
                                  onClick={() => handleDelete(actividad.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={parseInt(params.page) || 1}
              totalItems={count}
              itemsPerPage={parseInt(params.limit) || 20}
              onPageChange={newPage => addParams({ page: newPage })}
              onLimitChange={newLimit => addParams({ limit: newLimit, page: 1 })}
            />
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="actividades-modal-overlay">
          <div className="actividades-modal-content">
            <div className="actividades-modal-header">
              <h2>
                {modalMode === 'create' ? (
                  <>
                    <Plus size={24} />
                    <span>Nueva Actividad</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={24} />
                    <span>Editar Actividad</span>
                  </>
                )}
              </h2>
              <button className="btn-icon-actividades" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="actividades-modal-body">
              <div className="actividades-form-group">
                <label>
                  <MapPin size={16} />
                  <span>Dirección *</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  required
                  placeholder="Jr. Chinchaysuyo 128, Zarate, San Juan de Lurigancho"
                />
              </div>

              <div className="actividades-form-group">
                <label>
                  <FileText size={16} />
                  <span>Descripción *</span>
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  placeholder="Descripción de la actividad"
                />
              </div>

              <div className="actividades-coordinates-group">
                <div className="actividades-form-group">
                  <label>
                    <User size={16} />
                    <span>Representante *</span>
                  </label>
                  <input
                    type="text"
                    name="representative"
                    value={formData.representative}
                    onChange={handleFormChange}
                    required
                    placeholder="Nombre del representante"
                  />
                </div>

                <div className="actividades-form-group">
                  <label>
                    <Calendar size={16} />
                    <span>Fecha *</span>
                  </label>
                  <input
                    type="date"
                    name="done_at"
                    value={formData.done_at}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="actividades-form-group">
                  <label>
                    <Tag size={16} />
                    <span>Tipo de Actividad *</span>
                  </label>
                  <input
                    type="text"
                    name="act_type"
                    value={formData.act_type}
                    onChange={handleFormChange}
                    required
                    placeholder="Ej: CREMA, CHARLA, etc."
                  />
                </div>
              </div>

              <div className="actividades-coordinates-group">
                <div className="actividades-form-group">
                  <label>
                    <MapPin size={16} />
                    <span>Latitud *</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleFormChange}
                    required
                    placeholder="-12.027257"
                  />
                </div>

                <div className="actividades-form-group">
                  <label>
                    <MapPin size={16} />
                    <span>Longitud *</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleFormChange}
                    required
                    placeholder="-76.999918"
                  />
                </div>
              </div>

              {/* Mapa de previsualización */}
              <div className="actividades-map-section">
                <button
                  type="button"
                  onClick={() => setShowMapPreview(!showMapPreview)}
                  className="actividades-map-toggle-button"
                >
                  <MapPin size={16} />
                  {showMapPreview ? 'Ocultar Mapa' : 'Ver en Mapa'}
                </button>

                {showMapPreview && (
                  <div className="actividades-map-preview">
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                  </div>
                )}
                {showMapPreview && (
                  <div className="actividades-map-hint">
                    <p>
                      <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación
                    </p>
                  </div>
                )}
              </div>

              <div className="actividades-modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  <Save size={16} />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionActividades;
