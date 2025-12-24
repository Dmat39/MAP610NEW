import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Eye, Target } from 'lucide-react';
import camarasMunicipalesAdminService from '../../services/camarasMunicipalesAdminService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import { generateVisionField, createSectorPolygon } from '../../utils/cameraUtils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GestionCamarasMunicipales = () => {
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
    name: '',
    address: '',
    camera: 'LPR',
    latitude: '',
    longitude: '',
    angle: 0,
    radius: 0.0011,
    arc: 180,
    buttom: false,
    megaphone: false,
    geometry: null,
  });

  const [showGeometryEditor, setShowGeometryEditor] = useState(false);
  const [geometryJSON, setGeometryJSON] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showVisionPreview, setShowVisionPreview] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const polygonRef = useRef(null);
  const markerRef = useRef(null);
  const visionMapRef = useRef(null);
  const visionLeafletMapRef = useRef(null);
  const visionPolygonRef = useRef(null);
  const visionMarkerRef = useRef(null);

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
        camera: params.camera || '',
        page: parseInt(params.page) || 1,
        limit: parseInt(params.limit) || 20,
      };

      const response = await camarasMunicipalesAdminService.getAll(filters);

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
      name: '',
      address: '',
      camera: 'LPR',
      latitude: '',
      longitude: '',
      angle: 0,
      radius: 0.0011,
      arc: 35,
      buttom: false,
      megaphone: false,
      geometry: null,
    });
    setGeometryJSON('');
    setShowGeometryEditor(false);
    setShowModal(true);
  };

  const openEditModal = camera => {
    setModalMode('edit');
    setSelectedCamera(camera);

    console.log('📸 Cámara seleccionada para editar:', camera);

    // Determinar arc por defecto según el tipo de cámara
    let defaultArc = 180;
    if (camera.camera === 'C360') defaultArc = 360;
    else if (camera.camera === 'LPR') defaultArc = 35;
    else if (camera.camera === 'C180') defaultArc = 180;

    const editData = {
      name: camera.name || '',
      address: camera.address || '',
      camera: camera.camera || 'LPR',
      latitude: camera.latitude !== undefined && camera.latitude !== null ? camera.latitude : '',
      longitude: camera.longitude !== undefined && camera.longitude !== null ? camera.longitude : '',
      angle: camera.angle !== undefined && camera.angle !== null ? camera.angle : 0,
      radius: camera.radius !== undefined && camera.radius !== null ? camera.radius : 0.0011,
      arc: camera.arc !== undefined && camera.arc !== null ? camera.arc : defaultArc,
      buttom: camera.buttom || false,
      megaphone: camera.megaphone || false,
      geometry: camera.geometry || null,
    };

    console.log('📋 Datos cargados en formulario:', editData);

    setFormData(editData);
    setGeometryJSON(camera.geometry ? JSON.stringify(camera.geometry, null, 2) : '');
    setShowGeometryEditor(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCamera(null);
    setFormData({
      name: '',
      address: '',
      camera: 'LPR',
      latitude: '',
      longitude: '',
      angle: 0,
      radius: 0.0011,
      arc: 180,
      buttom: false,
      megaphone: false,
      geometry: null,
    });
    setGeometryJSON('');
    setShowGeometryEditor(false);
    setShowPreview(false);
    setShowVisionPreview(false);

    // Limpiar referencias del mapa de geometry
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    googleMapRef.current = null;

    // Limpiar referencias del mapa de visión (Leaflet)
    if (visionLeafletMapRef.current) {
      visionLeafletMapRef.current.remove();
      visionLeafletMapRef.current = null;
    }
    visionPolygonRef.current = null;
    visionMarkerRef.current = null;
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;

    // Si cambia el tipo de cámara, ajustar el arc sugerido
    if (name === 'camera') {
      let suggestedArc = 180;
      if (value === 'C360') suggestedArc = 360;
      else if (value === 'LPR') suggestedArc = 35;
      else if (value === 'C180') suggestedArc = 180;

      setFormData(prev => ({
        ...prev,
        camera: value,
        arc: suggestedArc,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleGeometryJSONChange = e => {
    setGeometryJSON(e.target.value);
  };

  const handleApplyGeometry = () => {
    try {
      if (!geometryJSON.trim()) {
        setFormData(prev => ({ ...prev, geometry: null }));
        setSuccess('Geometría eliminada');
        setTimeout(() => setSuccess(null), 2000);
        return;
      }

      const parsed = JSON.parse(geometryJSON);

      // Validar estructura GeoJSON básica
      if (!parsed.type || parsed.type !== 'Polygon') {
        setError('El geometry debe ser de tipo "Polygon"');
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (!parsed.coordinates || !Array.isArray(parsed.coordinates)) {
        setError('El geometry debe tener un array de "coordinates"');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setFormData(prev => ({ ...prev, geometry: parsed }));
      setSuccess('Geometría aplicada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('JSON inválido: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClearGeometry = () => {
    setGeometryJSON('');
    setFormData(prev => ({ ...prev, geometry: null }));
  };

  // Inicializar mapa de previsualización
  useEffect(() => {
    if (showPreview && mapRef.current && !googleMapRef.current && window.google) {
      const lat = parseFloat(formData.latitude) || -12.027257;
      const lng = parseFloat(formData.longitude) || -76.999918;

      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 17,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        disableDoubleClickZoom: true, // Deshabilitar zoom en doble clic
      });

      // Agregar marcador de la cámara
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: formData.name || 'Cámara',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4052af',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });

      // Agregar evento de doble clic para actualizar coordenadas
      googleMapRef.current.addListener('dblclick', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setSuccess('Coordenadas actualizadas desde el mapa');
        setTimeout(() => setSuccess(null), 2000);
      });
    }
  }, [showPreview]);

  // Actualizar polígono cuando cambia la geometría
  useEffect(() => {
    if (googleMapRef.current && formData.geometry) {
      // Limpiar polígono anterior
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      try {
        const coords = formData.geometry.coordinates[0];
        const googleCoords = coords.map(([lng, lat]) => ({ lat, lng }));

        polygonRef.current = new window.google.maps.Polygon({
          paths: googleCoords,
          strokeColor: '#4052af',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#4052af',
          fillOpacity: 0.2,
          map: googleMapRef.current,
        });

        // Ajustar bounds del mapa
        const bounds = new window.google.maps.LatLngBounds();
        googleCoords.forEach(coord => bounds.extend(coord));
        googleMapRef.current.fitBounds(bounds);
      } catch (err) {
        console.error('Error al dibujar polígono:', err);
      }
    }
  }, [formData.geometry]);

  // Actualizar posición del marcador cuando cambian las coordenadas
  useEffect(() => {
    if (markerRef.current && formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current.setPosition({ lat, lng });
        if (!formData.geometry) {
          googleMapRef.current?.setCenter({ lat, lng });
        }
      }
    }
  }, [formData.latitude, formData.longitude]);

  // Inicializar mapa de previsualización de campo de visión con Leaflet
  useEffect(() => {
    if (showVisionPreview && visionMapRef.current && !visionLeafletMapRef.current) {
      const lat = parseFloat(formData.latitude) || -12.027257;
      const lng = parseFloat(formData.longitude) || -76.999918;

      // Crear mapa Leaflet
      visionLeafletMapRef.current = L.map(visionMapRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
        doubleClickZoom: false, // Deshabilitar zoom en doble clic
      });

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(visionLeafletMapRef.current);

      // Crear icono personalizado para la cámara
      const cameraIcon = L.divIcon({
        className: 'custom-camera-marker',
        html: '<div style="background-color: #4052af; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      // Agregar marcador de la cámara
      visionMarkerRef.current = L.marker([lat, lng], {
        icon: cameraIcon,
        title: formData.name || 'Cámara',
      }).addTo(visionLeafletMapRef.current);

      // Agregar evento de doble clic para actualizar coordenadas
      visionLeafletMapRef.current.on('dblclick', (e) => {
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
      if (!showVisionPreview && visionLeafletMapRef.current) {
        visionLeafletMapRef.current.remove();
        visionLeafletMapRef.current = null;
        visionPolygonRef.current = null;
        visionMarkerRef.current = null;
      }
    };
  }, [showVisionPreview]);

  // Actualizar polígono de campo de visión cuando cambian los parámetros (Leaflet)
  useEffect(() => {
    if (visionLeafletMapRef.current && formData.latitude && formData.longitude && formData.camera) {
      // Limpiar polígono anterior
      if (visionPolygonRef.current) {
        visionLeafletMapRef.current.removeLayer(visionPolygonRef.current);
        visionPolygonRef.current = null;
      }

      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      const angle = parseFloat(formData.angle) || 0;
      const radius = parseFloat(formData.radius) || 0.0011;
      const arc = parseFloat(formData.arc) || 180;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Generar polígono usando createSectorPolygon con arc personalizado
        const visionCoords = createSectorPolygon(lat, lng, angle, arc, radius);

        if (visionCoords && visionCoords.length > 0) {
          // Determinar color según tipo de cámara
          let fillColor = '#4052af';
          if (formData.camera === 'C180') fillColor = '#3b82f6';
          if (formData.camera === 'C360') fillColor = '#10b981';
          if (formData.camera === 'LPR') fillColor = '#f59e0b';

          // Crear polígono en Leaflet (coordenadas ya están en formato [lat, lng])
          visionPolygonRef.current = L.polygon(visionCoords, {
            color: fillColor,
            fillColor: fillColor,
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(visionLeafletMapRef.current);

          // Ajustar bounds del mapa
          const bounds = L.latLngBounds(visionCoords);
          visionLeafletMapRef.current.fitBounds(bounds, { padding: [20, 20] });
        }

        // Actualizar posición del marcador
        if (visionMarkerRef.current) {
          visionMarkerRef.current.setLatLng([lat, lng]);
        }
      }
    }
  }, [formData.latitude, formData.longitude, formData.angle, formData.radius, formData.arc, formData.camera]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    console.log('💾 Iniciando guardado...');
    console.log('🔧 Modo:', modalMode);
    console.log('📝 FormData actual:', formData);
    console.log('🎯 Cámara seleccionada:', selectedCamera);

    try {
      setLoading(true);

      // Validar angle (0-360)
      const angle = parseFloat(formData.angle);
      if (isNaN(angle) || angle < 0 || angle > 360) {
        setError('El ángulo debe estar entre 0 y 360 grados');
        setLoading(false);
        return;
      }

      // Validar radius (> 0)
      const radius = parseFloat(formData.radius);
      if (isNaN(radius) || radius <= 0) {
        setError('El radio debe ser mayor a 0');
        setLoading(false);
        return;
      }

      // Validar arc (0-360)
      const arc = parseFloat(formData.arc);
      if (isNaN(arc) || arc <= 0 || arc > 360) {
        setError('La amplitud debe estar entre 1 y 360 grados');
        setLoading(false);
        return;
      }

      const dataToSend = {
        name: formData.name,
        address: formData.address,
        camera: formData.camera,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        angle: angle,
        radius: radius,
        arc: arc,
        buttom: formData.buttom,
        megaphone: formData.megaphone,
        geometry: formData.geometry || null,
      };

      console.log('📤 Datos a enviar:', dataToSend);

      if (modalMode === 'create') {
        console.log('➕ Creando nueva cámara...');
        const result = await camarasMunicipalesAdminService.create(dataToSend);
        console.log('✅ Cámara creada:', result);
        setSuccess('Cámara municipal creada exitosamente');
      } else {
        console.log('✏️ Actualizando cámara ID:', selectedCamera.id);
        const result = await camarasMunicipalesAdminService.update(selectedCamera.id, dataToSend);
        console.log('✅ Cámara actualizada:', result);
        setSuccess('Cámara municipal actualizada exitosamente');
      }

      closeModal();
      refreshData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('❌ Error al guardar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('¿Estás seguro de eliminar esta cámara municipal?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await camarasMunicipalesAdminService.delete(id);
      setSuccess('Cámara municipal eliminada exitosamente');
      refreshData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.pageContainer}>
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
        <h1 style={styles.title}>Gestión de Cámaras Municipales</h1>
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
                  value={params.camera || ''}
                  onChange={e => addParams({ camera: e.target.value, page: 1 })}
                  style={styles.filterSelect}
                >
                  <option value="">Todos los tipos</option>
                  <option value="LPR">LPR</option>
                  <option value="C180">C180</option>
                  <option value="C360">C360</option>
                </select>

                {(params.camera || params.search) && (
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

              <button onClick={refreshData} style={styles.refreshButton} title="Refrescar datos">
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
                        <th style={styles.tableHeader}>Nombre</th>
                        <th style={styles.tableHeader}>Dirección</th>
                        <th style={styles.tableHeader}>Tipo</th>
                        <th style={styles.tableHeader}>Coordenadas</th>
                        <th style={styles.tableHeader}>Botón Pánico</th>
                        <th style={styles.tableHeader}>Megáfono</th>
                        <th style={styles.tableHeader}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {camaras.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={styles.emptyRow}>
                            No se encontraron cámaras municipales
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
                              <td style={styles.tableCell}>{camera.name}</td>
                              <td style={styles.tableCell}>{camera.address}</td>
                              <td style={styles.tableCell}>
                                <span style={styles.badge}>{camera.camera}</span>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.coordsCell}>
                                  <MapPin size={14} />
                                  {camera.latitude?.toFixed(6)}, {camera.longitude?.toFixed(6)}
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <span style={camera.buttom ? styles.badgeSuccess : styles.badgeGray}>
                                  {camera.buttom ? 'Sí' : 'No'}
                                </span>
                              </td>
                              <td style={styles.tableCell}>
                                <span style={camera.megaphone ? styles.badgeSuccess : styles.badgeGray}>
                                  {camera.megaphone ? 'Sí' : 'No'}
                                </span>
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
                {modalMode === 'create' ? 'Nueva Cámara Municipal' : 'Editar Cámara Municipal'}
              </h2>
              <button style={styles.modalCloseButton} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nombre *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  style={styles.formInput}
                  placeholder="611"
                />
              </div>

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

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Tipo *</label>
                  <select
                    name="camera"
                    value={formData.camera}
                    onChange={handleFormChange}
                    required
                    style={styles.formSelect}
                  >
                    <option value="LPR">LPR</option>
                    <option value="C180">C180</option>
                    <option value="C360">C360</option>
                  </select>
                </div>

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

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Ángulo (grados) *
                    <span style={styles.formLabelHint}> 0-360° dirección</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="360"
                    name="angle"
                    value={formData.angle}
                    onChange={handleFormChange}
                    required
                    style={styles.formInput}
                    placeholder="0"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Radio (grados) *
                    <span style={styles.formLabelHint}> ~0.0011 = 200m</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    name="radius"
                    value={formData.radius}
                    onChange={handleFormChange}
                    required
                    style={styles.formInput}
                    placeholder="0.0011"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Amplitud (grados) *
                    <span style={styles.formLabelHint}> 0-360° apertura</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="360"
                    name="arc"
                    value={formData.arc}
                    onChange={handleFormChange}
                    required
                    style={styles.formInput}
                    placeholder="180"
                  />
                </div>
              </div>

              {/* Previsualización del Campo de Visión */}
              <div style={styles.visionPreviewSection}>
                <button
                  type="button"
                  onClick={() => setShowVisionPreview(!showVisionPreview)}
                  style={styles.visionPreviewButton}
                >
                  <Target size={16} />
                  {showVisionPreview ? 'Ocultar Previsualización' : 'Ver Campo de Visión'}
                </button>

                {showVisionPreview && (
                  <div style={styles.visionMapContainer}>
                    <div ref={visionMapRef} style={styles.visionMap}></div>
                    <div style={styles.visionMapHint}>
                      <p style={styles.visionMapHintText}>
                        Vista previa del campo de visión •
                        <span style={styles.visionMapHintBold}>
                          {' '}{formData.camera} - Amplitud {formData.arc}°
                        </span>
                      </p>
                      <p style={styles.visionMapHintSmall}>
                        Ajusta el ángulo, radio y amplitud arriba para ver los cambios en tiempo real
                      </p>
                      <p style={styles.visionMapHintSmall}>
                        <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formCheckboxGroup}>
                  <input
                    type="checkbox"
                    name="buttom"
                    id="buttom"
                    checked={formData.buttom}
                    onChange={handleFormChange}
                    style={styles.formCheckbox}
                  />
                  <label htmlFor="buttom" style={styles.formCheckboxLabel}>
                    ¿Tiene botón de pánico?
                  </label>
                </div>

                <div style={styles.formCheckboxGroup}>
                  <input
                    type="checkbox"
                    name="megaphone"
                    id="megaphone"
                    checked={formData.megaphone}
                    onChange={handleFormChange}
                    style={styles.formCheckbox}
                  />
                  <label htmlFor="megaphone" style={styles.formCheckboxLabel}>
                    ¿Tiene megáfono?
                  </label>
                </div>
              </div>

              {/* Geometry Editor Section */}
              <div style={styles.geometrySection}>
                <div style={styles.geometrySectionHeader}>
                  <button
                    type="button"
                    onClick={() => setShowGeometryEditor(!showGeometryEditor)}
                    style={styles.geometryToggleButton}
                  >
                    <MapPin size={16} />
                    <span>Radio de Cobertura (Geometry)</span>
                    <span style={styles.geometryToggleIcon}>
                      {showGeometryEditor ? '▼' : '▶'}
                    </span>
                  </button>
                  {formData.geometry && (
                    <span style={styles.geometryStatusBadge}>
                      Configurado
                    </span>
                  )}
                </div>

                {showGeometryEditor && (
                  <div style={styles.geometryEditorContent}>
                    <p style={styles.geometryHelp}>
                      Ingresa un GeoJSON Polygon que represente el área de cobertura de la cámara.
                      Formato esperado:
                    </p>
                    <pre style={styles.geometryExample}>
{`{
  "type": "Polygon",
  "coordinates": [
    [
      [-76.999918, -12.027257],
      [-76.999818, -12.027257],
      [-76.999818, -12.027157],
      [-76.999918, -12.027157],
      [-76.999918, -12.027257]
    ]
  ]
}`}
                    </pre>

                    <textarea
                      value={geometryJSON}
                      onChange={handleGeometryJSONChange}
                      style={styles.geometryTextarea}
                      placeholder='{"type": "Polygon", "coordinates": [...]}'
                      rows={8}
                    />

                    <div style={styles.geometryActions}>
                      <button
                        type="button"
                        onClick={handleClearGeometry}
                        style={styles.geometryClearButton}
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyGeometry}
                        style={styles.geometryApplyButton}
                      >
                        Aplicar Geometry
                      </button>
                    </div>

                    {/* Botón de previsualización */}
                    {formData.geometry && (
                      <div style={styles.previewButtonContainer}>
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          style={styles.previewToggleButton}
                        >
                          <Eye size={16} />
                          {showPreview ? 'Ocultar Previsualización' : 'Ver Previsualización'}
                        </button>
                      </div>
                    )}

                    {/* Mapa de previsualización */}
                    {showPreview && formData.geometry && (
                      <div style={styles.previewMapContainer}>
                        <div ref={mapRef} style={styles.previewMap}></div>
                        <div style={styles.previewMapHint}>
                          <p style={{ margin: '0 0 4px 0' }}>
                            Previsualización del área de cobertura de la cámara
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic' }}>
                            <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                          </p>
                        </div>
                      </div>
                    )}
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

// Estilos (misma arquitectura que cámaras vecinales)
const styles = {
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
  pageHeader: {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  mainContent: {
    flex: 1,
    backgroundColor: 'white',
    margin: '0 20px 20px 20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
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
  tableWrapper: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  tableInnerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  tableScrollArea: {
    flex: 1,
    maxHeight: '100%',
    overflowY: 'auto',
    overflowX: 'auto',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    whiteSpace: 'nowrap',
  },
  tableHeaderRow: {
    backgroundColor: '#4052af',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
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
  badgeSuccess: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  badgeGray: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
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
    maxWidth: '700px',
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
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  formLabelHint: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#9ca3af',
    marginLeft: '4px',
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
  formCheckboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '1',
  },
  formCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  formCheckboxLabel: {
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
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
  // Geometry Editor Styles
  geometrySection: {
    marginTop: '16px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  geometrySectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  geometryToggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    flex: 1,
  },
  geometryToggleIcon: {
    fontSize: '12px',
    marginLeft: 'auto',
  },
  geometryStatusBadge: {
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  geometryEditorContent: {
    padding: '16px',
    backgroundColor: 'white',
  },
  geometryHelp: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    marginTop: 0,
  },
  geometryExample: {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#374151',
    overflowX: 'auto',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
  },
  geometryTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  },
  geometryActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  geometryClearButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  geometryApplyButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  // Preview Styles
  previewButtonContainer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  previewToggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#4052af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
  },
  previewMapContainer: {
    marginTop: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  previewMap: {
    width: '100%',
    height: '300px',
  },
  previewMapHint: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '8px',
    margin: 0,
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  // Vision Preview Styles
  visionPreviewSection: {
    marginTop: '20px',
    marginBottom: '20px',
  },
  visionPreviewButton: {
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
  visionMapContainer: {
    marginTop: '16px',
    border: '2px solid #10b981',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
  },
  visionMap: {
    width: '100%',
    height: '350px',
  },
  visionMapHint: {
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderTop: '1px solid #10b981',
  },
  visionMapHintText: {
    fontSize: '13px',
    color: '#065f46',
    margin: '0 0 6px 0',
    fontWeight: '500',
  },
  visionMapHintBold: {
    fontWeight: '700',
    color: '#047857',
  },
  visionMapHintSmall: {
    fontSize: '12px',
    color: '#059669',
    margin: 0,
    fontStyle: 'italic',
  },
};

export default GestionCamarasMunicipales;
