import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Eye, Camera, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import camarasVecinalesAdminService from '../../services/camarasVecinalesAdminService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GestionCamarasVecinales.css';

const GestionCamarasVecinales = () => {
  const location = useLocation();
  const { addParams, getParams, removeParams } = UseUrlParamsManager();
  const params = getParams();

  const [camaras, setCamaras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [update, setUpdate] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Datos originales para comparación en edición
  const [originalData, setOriginalData] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    address: '',
    brand: 'DAHUA',
    mode: 'FIXED',
    neighbor: '',
    phone: '',
    latitude: '',
    longitude: '',
  });

  // Estado y referencias para mapa de previsualización
  const [showMapPreview, setShowMapPreview] = useState(false);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  const isAdmin = authService.isAdmin();
  const canWrite = authService.isSuperAdmin();

  // Cargar cámaras cuando cambian los parámetros de URL
  useEffect(() => {
    if (isAdmin) {
      loadCamaras();
    }
  }, [location.search, update]);

  const loadCamaras = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir filtros desde params de URL
      const filters = {
        search: params.search || '',
        brand: params.brand || '',
        mode: params.mode || '',
        page: parseInt(params.page) || 1,
        limit: parseInt(params.limit) || 20,
      };

      const response = await camarasVecinalesAdminService.getAll(filters);

      // Asegurarse de que siempre sea un array
      setCamaras(Array.isArray(response.data) ? response.data : []);
      setCount(response.count || response.data?.length || 0);
    } catch (err) {
      setError(err.message);
      setCamaras([]);
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
      brand: 'DAHUA',
      mode: 'FIXED',
      neighbor: '',
      phone: '',      
      latitude: '',
      longitude: '',
    });
    setShowModal(true);
  };

  const openEditModal = async (camera) => {
    try {
      setLoading(true);
      setError(null);
      setModalMode('edit');
      setSelectedCamera(camera);

      // Obtener datos completos de la cámara
      const fullData = await camarasVecinalesAdminService.getById(camera.id);

      const editData = {
        address: fullData.address || '',
        brand: fullData.brand || 'DAHUA',
        mode: fullData.mode || 'FIXED',
        neighbor: fullData.neighbor || '',
        phone: fullData.phone || '',
        latitude: fullData.latitude !== undefined && fullData.latitude !== null ? fullData.latitude : '',
        longitude: fullData.longitude !== undefined && fullData.longitude !== null ? fullData.longitude : '',
      };

      setFormData(editData);
      setOriginalData({ ...editData });
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Error al cargar datos de la cámara');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCamera(null);
    setOriginalData(null);
    setFormData({
      address: '',
      brand: 'DAHUA',
      mode: 'FIXED',
      neighbor: '',
      phone: '',
      latitude: '',
      longitude: '',
    });
    setShowMapPreview(false);

    // Limpiar referencias del mapa
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
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      if (modalMode === 'create') {
        const dataToSend = {
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        };
        await camarasVecinalesAdminService.create(dataToSend);
        setSuccess('Cámara vecinal creada exitosamente');
      } else {
        // Detectar solo los campos que cambiaron
        const changedFields = {};

        if (formData.address !== originalData.address) {
          changedFields.address = formData.address;
        }
        if (formData.brand !== originalData.brand) {
          changedFields.brand = formData.brand;
        }
        if (formData.mode !== originalData.mode) {
          changedFields.mode = formData.mode;
        }
        if (formData.neighbor !== originalData.neighbor) {
          changedFields.neighbor = formData.neighbor;
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

        console.log('Datos enviados al PATCH:', JSON.stringify(changedFields, null, 2));
        await camarasVecinalesAdminService.update(selectedCamera.id, changedFields);
        setSuccess('Cámara vecinal actualizada exitosamente');
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
    if (!window.confirm('¿Estás seguro de eliminar esta cámara vecinal?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await camarasVecinalesAdminService.delete(id);
      setSuccess('Cámara vecinal eliminada exitosamente');
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

      // Obtener todas las cámaras sin paginación
      const response = await camarasVecinalesAdminService.getAll({ page: 0 });
      const todasLasCamaras = response.data || [];

      if (todasLasCamaras.length === 0) {
        setError('No hay cámaras vecinales para exportar');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cámaras Vecinales');

      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Dirección', key: 'address', width: 40 },
        { header: 'Vecino', key: 'neighbor', width: 25 },
        { header: 'Marca', key: 'brand', width: 15 },
        { header: 'Modo', key: 'mode', width: 12 },
        { header: 'Latitud', key: 'latitude', width: 15 },
        { header: 'Longitud', key: 'longitude', width: 15 },
      ];

      // Estilo del encabezado
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' },
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Agregar datos
      todasLasCamaras.forEach((camara, idx) => {
        worksheet.addRow({
          index: idx + 1,
          address: camara.address || '',
          neighbor: camara.neighbor || '',
          brand: camara.brand || '',
          mode: camara.mode || '',
          latitude: camara.latitude || '',
          longitude: camara.longitude || '',
        });
      });

      // Generar y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camaras_vecinales_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Inicializar mapa de previsualización con Leaflet
  useEffect(() => {
    if (showMapPreview && mapRef.current && !leafletMapRef.current) {
      const lat = parseFloat(formData.latitude) || -12.027257;
      const lng = parseFloat(formData.longitude) || -76.999918;

      // Crear mapa Leaflet
      leafletMapRef.current = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
        doubleClickZoom: false, // Deshabilitar zoom en doble clic
      });

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(leafletMapRef.current);

      // Crear icono personalizado para la cámara
      const cameraIcon = L.divIcon({
        className: 'custom-camera-marker',
        html: '<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      // Agregar marcador de la cámara
      markerRef.current = L.marker([lat, lng], {
        icon: cameraIcon,
        title: formData.address || 'Cámara Vecinal',
      }).addTo(leafletMapRef.current);

      // Agregar evento de doble clic para actualizar coordenadas
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

    // Cleanup al desmontar o cerrar
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
        leafletMapRef.current?.setView([lat, lng], 17);
      }
    }
  }, [formData.latitude, formData.longitude]);

  if (!isAdmin) {
    return (
      <div className="gestion-camaras-container">
        <div className="camaras-alert camaras-alert-error">
          <X size={18} />
          <span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-camaras-container">
      <div className="gestion-camaras-header">
        <div className="camaras-header-content">
          <div className="camaras-header-icon"><Camera size={24} /></div>
          <div className="camaras-header-text">
            <h1>Gestión de Cámaras Vecinales</h1>
            <p>Administra las cámaras vecinales del sistema</p>
          </div>
        </div>
        <div className="camaras-header-actions">
          <button onClick={refreshData} className="btn-camaras-secondary">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>
          <button onClick={exportarExcel} className="btn-camaras-excel" disabled={loading} title="Descargar Excel">
            <Download size={18} />
            <span>Descargar Excel</span>
          </button>
          {canWrite && (
            <button onClick={openCreateModal} className="btn-camaras-primary">
              <Plus size={18} />
              <span>Nueva Cámara</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="camaras-alert camaras-alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="camaras-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="camaras-alert camaras-alert-success">
          <Save size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="camaras-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toolbar con búsqueda, filtros y acciones */}
      <div className="camaras-toolbar">
        <div className="camaras-toolbar-left">
          <SearchInput placeholder="Buscar por dirección..." />

          {/* Filtros */}
          <div className="camaras-filters-group">
            <Filter size={16} style={{ color: '#6b7280' }} />
            <select
              value={params.brand || ''}
              onChange={e => addParams({ brand: e.target.value, page: 1 })}
              className="camaras-filter-select"
            >
              <option value="">Todas las marcas</option>
              <option value="DAHUA">DAHUA</option>
              <option value="HIKVISION">HIKVISION</option>
            </select>

            <select
              value={params.mode || ''}
              onChange={e => addParams({ mode: e.target.value, page: 1 })}
              className="camaras-filter-select"
            >
              <option value="">Todos los modos</option>
              <option value="FIXED">FIXED</option>
              <option value="DOME">DOME</option>
              <option value="BOTH">BOTH</option>
            </select>

            {(params.brand || params.mode || params.search) && (
              <button onClick={() => removeParams()} className="btn-camaras-secondary">
                <X size={14} />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="camaras-toolbar-right">
          <span className="camaras-count-text">
            Total: <span className="camaras-count-number">{count}</span>
          </span>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA */}
      <div className="camaras-content">
        {loading ? (
          <div className="camaras-loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando cámaras vecinales...</p>
          </div>
        ) : camaras.length === 0 ? (
          <div className="camaras-empty-state">
            <Camera size={48} />
            <h3>No hay cámaras vecinales registradas</h3>
            <p>Comienza creando una nueva cámara vecinal</p>
            {canWrite && (
              <button onClick={openCreateModal} className="btn-camaras-primary">
                <Plus size={18} />
                <span>Crear Cámara Vecinal</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="camaras-table-wrapper">
              <table className="camaras-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dirección</th>
                    <th>Vecino</th>
                    <th>Teléfono</th>
                    <th>Marca</th>
                    <th>Modo</th>
                    <th>Coordenadas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {camaras.map((camera, index) => {
                    const page = parseInt(params.page) || 1;
                    const limit = parseInt(params.limit) || 20;
                    const globalIndex = (page - 1) * limit + index + 1;

                    return (
                      <tr key={camera.id}>
                        <td>{globalIndex}</td>
                        <td>
                          <div className="camaras-address-cell">
                            <MapPin size={14} />
                            <span>{camera.address}</span>
                          </div>
                        </td>
                        <td>{camera.neighbor}</td>
                        <td>{camera.phone || 'N/A'}</td>
                        <td>
                          <span className="camaras-badge camaras-badge-brand">{camera.brand}</span>
                        </td>
                        <td>
                          <span className="camaras-badge camaras-badge-mode">{camera.mode}</span>
                        </td>
                        <td>
                          <div className="camaras-address-cell">
                            <MapPin size={14} />
                            {camera.latitude?.toFixed(6)}, {camera.longitude?.toFixed(6)}
                          </div>
                        </td>
                        <td>
                          {canWrite && (
                            <div className="camaras-action-buttons">
                              <button
                                className="btn-icon-camaras btn-edit"
                                onClick={() => openEditModal(camera)}
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn-icon-camaras btn-delete"
                                onClick={() => handleDelete(camera.id)}
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
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
        <div className="camaras-modal-overlay">
          <div className="camaras-modal-content">
            <div className="camaras-modal-header">
              <h2>
                {modalMode === 'create' ? (
                  <>
                    <Plus size={24} />
                    <span>Nueva Cámara Vecinal</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={24} />
                    <span>Editar Cámara Vecinal</span>
                  </>
                )}
              </h2>
              <button className="btn-icon-camaras" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="camaras-modal-body">
              <div className="camaras-form-group">
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
                  placeholder="Jr. Chinchaysuyo 128..."
                />
              </div>

              <div className="camaras-form-group">
                <label>
                  <Camera size={16} />
                  <span>Nombre del Vecino *</span>
                </label>
                <input
                  type="text"
                  name="neighbor"
                  value={formData.neighbor}
                  onChange={handleFormChange}
                  required
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="camaras-form-group">
                <label>
                  <Camera size={16} />
                  <span>Teléfono</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="999999999"
                />
              </div>
              <div className="camaras-coordinates-group">
                <div className="camaras-form-group">
                  <label>
                    <Filter size={16} />
                    <span>Marca *</span>
                  </label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="DAHUA">DAHUA</option>
                    <option value="HIKVISION">HIKVISION</option>
                  </select>
                </div>

                <div className="camaras-form-group">
                  <label>
                    <Camera size={16} />
                    <span>Modo *</span>
                  </label>
                  <select
                    name="mode"
                    value={formData.mode}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="DOME">DOME</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
              </div>

              <div className="camaras-coordinates-group">
                <div className="camaras-form-group">
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

                <div className="camaras-form-group">
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

              {/* Previsualización del Mapa */}
              <div className="camaras-form-group">
                <button
                  type="button"
                  onClick={() => setShowMapPreview(!showMapPreview)}
                  className="camaras-map-toggle-button"
                >
                  <Eye size={16} />
                  {showMapPreview ? 'Ocultar Mapa' : 'Ver Ubicación en Mapa'}
                </button>

                {showMapPreview && (
                  <div className="camaras-map-preview">
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                  </div>
                )}
                {showMapPreview && (
                  <small className="camaras-form-hint">
                    <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                  </small>
                )}
              </div>

              <div className="camaras-modal-footer">
                <button type="button" className="btn-camaras-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-camaras-primary" disabled={loading}>
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

export default GestionCamarasVecinales;
