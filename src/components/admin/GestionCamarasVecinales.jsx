import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Eye } from 'lucide-react';
import camarasVecinalesAdminService from '../../services/camarasVecinalesAdminService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  // Form data
  const [formData, setFormData] = useState({
    address: '',
    brand: 'DAHUA',
    mode: 'FIXED',
    neighbor: '',
    latitude: '',
    longitude: '',
  });

  // Estado y referencias para mapa de previsualización
  const [showMapPreview, setShowMapPreview] = useState(false);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  // Verificar si es administrador
  const isAdmin = authService.isAdmin();

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
      latitude: '',
      longitude: '',
    });
    setShowModal(true);
  };

  const openEditModal = camera => {
    setModalMode('edit');
    setSelectedCamera(camera);
    setFormData({
      address: camera.address || '',
      brand: camera.brand || 'DAHUA',
      mode: camera.mode || 'FIXED',
      neighbor: camera.neighbor || '',
      latitude: camera.latitude || '',
      longitude: camera.longitude || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCamera(null);
    setFormData({
      address: '',
      brand: 'DAHUA',
      mode: 'FIXED',
      neighbor: '',
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

      const dataToSend = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (modalMode === 'create') {
        await camarasVecinalesAdminService.create(dataToSend);
        setSuccess('Cámara vecinal creada exitosamente');
      } else {
        await camarasVecinalesAdminService.update(selectedCamera.id, dataToSend);
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
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p>No tienes permisos para acceder a este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* HEADER FIJO */}
      <header style={styles.pageHeader}>
        <h1 style={styles.title}>Gestión de Cámaras Vecinales</h1>
      </header>

      {/* MAIN - Toma el espacio restante */}
      <main style={styles.mainContent}>
        <div style={styles.mainInner}>
          {/* Mensajes */}
          {error && (
            <div style={styles.errorBox}>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <p>{success}</p>
            </div>
          )}

          {/* Toolbar con búsqueda, filtros y acciones */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <SearchInput placeholder="Buscar por dirección..." />

              {/* Filtros */}
              <div style={styles.filtersGroup}>
                <Filter size={16} style={{ color: '#6b7280' }} />
                <select
                  value={params.brand || ''}
                  onChange={e => addParams({ brand: e.target.value, page: 1 })}
                  style={styles.filterSelect}
                >
                  <option value="">Todas las marcas</option>
                  <option value="DAHUA">DAHUA</option>
                  <option value="HIKVISION">HIKVISION</option>
                </select>

                <select
                  value={params.mode || ''}
                  onChange={e => addParams({ mode: e.target.value, page: 1 })}
                  style={styles.filterSelect}
                >
                  <option value="">Todos los modos</option>
                  <option value="FIXED">FIXED</option>
                  <option value="DOME">DOME</option>
                  <option value="BOTH">BOTH</option>
                </select>

                {(params.brand || params.mode || params.search) && (
                  <button onClick={() => removeParams()} style={styles.clearFiltersButton}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            <div style={styles.toolbarRight}>
              <span style={styles.countText}>
                Total: <strong>{count}</strong>
              </span>

              <button
                onClick={refreshData}
                style={styles.refreshButton}
                title="Refrescar datos"
              >
                <RefreshCw size={18} />
              </button>

              <button style={styles.createButton} onClick={openCreateModal}>
                <Plus size={18} />
                Nueva Cámara
              </button>
            </div>
          </div>

      {/* CONTENEDOR DE TABLA CON SCROLL */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loadingBox}>
            <p>Cargando...</p>
          </div>
        ) : (
          <div style={styles.tableInnerWrapper}>
            {/* ÁREA DE SCROLL VERTICAL */}
            <div style={styles.tableScrollArea}>
              <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>#</th>
                  <th style={styles.tableHeader}>Dirección</th>
                  <th style={styles.tableHeader}>Vecino</th>
                  <th style={styles.tableHeader}>Marca</th>
                  <th style={styles.tableHeader}>Modo</th>
                  <th style={styles.tableHeader}>Coordenadas</th>
                  <th style={styles.tableHeader}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {camaras.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.emptyRow}>
                      No se encontraron cámaras vecinales
                    </td>
                  </tr>
                ) : (
                  camaras.map((camera, index) => {
                    const page = parseInt(params.page) || 1;
                    const limit = parseInt(params.limit) || 20;
                    const globalIndex = (page - 1) * limit + index + 1;

                    return (
                      <tr key={camera.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{globalIndex}</td>
                        <td style={styles.tableCell}>{camera.address}</td>
                        <td style={styles.tableCell}>{camera.neighbor}</td>
                        <td style={styles.tableCell}>
                          <span style={styles.badge}>{camera.brand}</span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.badge}>{camera.mode}</span>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.coordsCell}>
                            <MapPin size={14} />
                            {camera.latitude?.toFixed(6)}, {camera.longitude?.toFixed(6)}
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionsCell}>
                            <button
                              style={styles.editButton}
                              onClick={() => openEditModal(camera)}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDelete(camera.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>

            {/* PAGINACIÓN FIJA (fuera del scroll) */}
            {count > 0 && (
              <div style={styles.paginationContainer}>
                <TablePagination
                  currentPage={parseInt(params.page) || 1}
                  totalItems={count}
                  itemsPerPage={parseInt(params.limit) || 20}
                  onPageChange={newPage => addParams({ page: newPage })}
                  onLimitChange={newLimit => addParams({ limit: newLimit, page: 1 })}
                />
              </div>
            )}
          </div>
        )}
      </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'create' ? 'Nueva Cámara Vecinal' : 'Editar Cámara Vecinal'}
              </h2>
              <button style={styles.modalCloseButton} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Dirección *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  required
                  style={styles.formInput}
                  placeholder="Jr. Chinchaysuyo 128..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nombre del Vecino *</label>
                <input
                  type="text"
                  name="neighbor"
                  value={formData.neighbor}
                  onChange={handleFormChange}
                  required
                  style={styles.formInput}
                  placeholder="Juan Pérez"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Marca *</label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleFormChange}
                    required
                    style={styles.formSelect}
                  >
                    <option value="DAHUA">DAHUA</option>
                    <option value="HIKVISION">HIKVISION</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Modo *</label>
                  <select
                    name="mode"
                    value={formData.mode}
                    onChange={handleFormChange}
                    required
                    style={styles.formSelect}
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="DOME">DOME</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Latitud *</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleFormChange}
                    required
                    style={styles.formInput}
                    placeholder="-12.027257"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Longitud *</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleFormChange}
                    required
                    style={styles.formInput}
                    placeholder="-76.999918"
                  />
                </div>
              </div>

              {/* Previsualización del Mapa */}
              <div style={styles.mapPreviewSection}>
                <button
                  type="button"
                  onClick={() => setShowMapPreview(!showMapPreview)}
                  style={styles.mapPreviewButton}
                >
                  <Eye size={16} />
                  {showMapPreview ? 'Ocultar Mapa' : 'Ver Ubicación en Mapa'}
                </button>

                {showMapPreview && (
                  <div style={styles.mapContainer}>
                    <div ref={mapRef} style={styles.map}></div>
                    <div style={styles.mapHint}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#065f46', fontWeight: '500' }}>
                        Vista previa de la ubicación de la cámara vecinal
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#059669' }}>
                        <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelButton} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" style={styles.saveButton} disabled={loading}>
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

// Estilos
const styles = {
  // Contenedor principal - altura completa con flexbox vertical
  pageContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: '#f5f5f5',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative',
    zIndex: 1,
  },

  // Header fijo - no participa en scroll
  pageHeader: {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  // Main - toma espacio restante y previene overflow
  mainContent: {
    flex: 1,
    backgroundColor: 'white',
    margin: '0 20px 20px 20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    height: '100%',
    overflow: 'hidden', // CRÍTICO - previene que el scroll se propague
    display: 'flex',
    flexDirection: 'column',
  },

  // Inner de main - contenedor flex vertical
  mainInner: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#4052af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#991b1b',
    marginBottom: '20px',
  },
  successBox: {
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    border: '1px solid #a7f3d0',
    borderRadius: '6px',
    color: '#065f46',
    marginBottom: '20px',
  },
  // Toolbar - fijo, no hace scroll
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  countText: {
    fontSize: '14px',
    color: '#374151',
  },
  refreshButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filtersGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  clearFiltersButton: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    width: '100%',
  },

  // Contenedor de tabla - CLAVE para el scroll
  tableWrapper: {
    flex: 1,
    overflow: 'hidden', // CRÍTICO - previene escape de scroll
    display: 'flex',
  },

  // Inner wrapper de tabla
  tableInnerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },

  // Área de scroll vertical
  tableScrollArea: {
    flex: 1,
    maxHeight: '100%',
    overflowY: 'auto', // SCROLL VERTICAL AQUÍ
    overflowX: 'auto', // SCROLL HORIZONTAL AQUÍ
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    whiteSpace: 'nowrap', // Previene wrap = scroll horizontal automático
  },
  tableHeaderRow: {
    backgroundColor: '#4052af',
    position: 'sticky', // HEADER STICKY
    top: 0,
    zIndex: 10,
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white', // Color blanco para header azul
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  coordsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#6b7280',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  deleteButton: {
    padding: '6px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  emptyRow: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },

  // Paginación fija - fuera del scroll
  paginationContainer: {
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: 'white',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  modalCloseButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '4px',
  },
  form: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '16px',
    flex: '1',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#4052af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  // Estilos del mapa de previsualización
  mapPreviewSection: {
    marginTop: '20px',
    marginBottom: '20px',
  },
  mapPreviewButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s',
  },
  mapContainer: {
    marginTop: '16px',
    border: '2px solid #10b981',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
  },
  map: {
    width: '100%',
    height: '350px',
  },
  mapHint: {
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderTop: '1px solid #10b981',
  },
};

export default GestionCamarasVecinales;
