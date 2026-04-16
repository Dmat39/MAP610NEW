import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Filter, Eye, Target, Video, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import camarasMunicipalesAdminService from '../../services/camarasMunicipalesAdminService';
import authService from '../../services/authService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import { generateVisionField, createSectorPolygon } from '../../utils/cameraUtils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GestionCamarasMunicipales.css';

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
  const [originalData, setOriginalData] = useState(null);

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


    setFormData(editData);
    setOriginalData({ ...editData });
    setGeometryJSON(camera.geometry ? JSON.stringify(camera.geometry, null, 2) : '');
    setShowGeometryEditor(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCamera(null);
    setOriginalData(null);
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


    try {
      setLoading(true);

      // Validar latitud y longitud
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        setError('La latitud debe ser un número válido entre -90 y 90');
        setLoading(false);
        return;
      }
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        setError('La longitud debe ser un número válido entre -180 y 180');
        setLoading(false);
        return;
      }

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

      // Validar arc (1-360)
      const arc = parseFloat(formData.arc);
      if (isNaN(arc) || arc <= 0 || arc > 360) {
        setError('La amplitud debe estar entre 1 y 360 grados');
        setLoading(false);
        return;
      }

      if (modalMode === 'create') {
        const dataToSend = {
          name: formData.name,
          address: formData.address,
          camera: formData.camera,
          latitude,
          longitude,
          angle,
          radius,
          arc,
          buttom: formData.buttom,
          megaphone: formData.megaphone,
          geometry: formData.geometry || null,
        };

        await camarasMunicipalesAdminService.create(dataToSend);
        setSuccess('Cámara municipal creada exitosamente');
      } else {
        // PATCH: solo enviar campos que cambiaron
        // Usar parseFloat para comparar números y evitar falsos positivos por precisión de string
        const changedFields = {};

        if (formData.name !== originalData.name) changedFields.name = formData.name;
        if (formData.address !== originalData.address) changedFields.address = formData.address;
        if (formData.camera !== originalData.camera) changedFields.camera = formData.camera;
        if (latitude !== parseFloat(originalData.latitude)) changedFields.latitude = latitude;
        if (longitude !== parseFloat(originalData.longitude)) changedFields.longitude = longitude;
        if (angle !== parseFloat(originalData.angle)) changedFields.angle = angle;
        if (radius !== parseFloat(originalData.radius)) changedFields.radius = radius;
        if (arc !== parseFloat(originalData.arc)) changedFields.arc = arc;
        if (formData.buttom !== originalData.buttom) changedFields.buttom = formData.buttom;
        if (formData.megaphone !== originalData.megaphone) changedFields.megaphone = formData.megaphone;
        if (JSON.stringify(formData.geometry) !== JSON.stringify(originalData.geometry)) changedFields.geometry = formData.geometry || null;

        if (Object.keys(changedFields).length === 0) {
          setError('No se han realizado cambios');
          setLoading(false);
          return;
        }

        await camarasMunicipalesAdminService.update(selectedCamera.id, changedFields);
        setSuccess('Cámara municipal actualizada exitosamente');
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

  const exportarExcel = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todas las cámaras sin paginación
      const response = await camarasMunicipalesAdminService.getAll({ page: 0 });
      const todasLasCamaras = response.data || [];

      if (todasLasCamaras.length === 0) {
        setError('No hay cámaras municipales para exportar');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cámaras Municipales');

      worksheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Nombre', key: 'name', width: 15 },
        { header: 'Dirección', key: 'address', width: 40 },
        { header: 'Tipo', key: 'camera', width: 12 },
        { header: 'Latitud', key: 'latitude', width: 15 },
        { header: 'Longitud', key: 'longitude', width: 15 },
        { header: 'Ángulo', key: 'angle', width: 10 },
        { header: 'Radio', key: 'radius', width: 10 },
        { header: 'Amplitud', key: 'arc', width: 10 },
        { header: 'Botón Pánico', key: 'buttom', width: 14 },
        { header: 'Megáfono', key: 'megaphone', width: 12 },
      ];

      // Estilo del encabezado
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0A4174' },
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Agregar datos
      todasLasCamaras.forEach((camara, idx) => {
        worksheet.addRow({
          index: idx + 1,
          name: camara.name || '',
          address: camara.address || '',
          camera: camara.camera || '',
          latitude: camara.latitude || '',
          longitude: camara.longitude || '',
          angle: camara.angle ?? '',
          radius: camara.radius ?? '',
          arc: camara.arc ?? '',
          buttom: camara.buttom ? 'Sí' : 'No',
          megaphone: camara.megaphone ? 'Sí' : 'No',
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
      link.download = `camaras_municipales_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      setSuccess('Excel exportado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al generar el archivo Excel');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="gestion-municipales-container">
        <div className="municipales-alert municipales-alert-error">
          <X size={18} />
          <span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-municipales-container">
      <div className="municipales-header">
        <div className="municipales-header-content">
          <Video size={28} />
          <div className="municipales-header-text">
            <h1>Gestión de Cámaras Municipales</h1>
            <p>Administra las cámaras municipales del sistema</p>
          </div>
        </div>
        <div className="municipales-header-actions">
          <button onClick={refreshData} className="btn-municipales-refresh" title="Actualizar">
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
          <button onClick={exportarExcel} className="btn-municipales-excel" disabled={loading} title="Descargar Excel">
            <Download size={18} />
            <span>Descargar Excel</span>
          </button>
          <button onClick={openCreateModal} className="btn-municipales-primary">
            <Plus size={18} />
            <span>Nueva Cámara</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="municipales-alert municipales-alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="municipales-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="municipales-alert municipales-alert-success">
          <Save size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="municipales-alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toolbar con búsqueda, filtros y acciones */}
      <div className="municipales-toolbar">
        <div className="municipales-toolbar-left">
          <SearchInput placeholder="Buscar por dirección..." />

          {/* Filtros */}
          <div className="municipales-filters-group">
            <Filter size={16} style={{ color: '#6b7280' }} />
            <select
              value={params.camera || ''}
              onChange={e => addParams({ camera: e.target.value, page: 1 })}
              className="municipales-filter-select"
            >
              <option value="">Todos los tipos</option>
              <option value="LPR">LPR</option>
              <option value="C180">C180</option>
              <option value="C360">C360</option>
            </select>

            {(params.camera || params.search) && (
              <button onClick={() => removeParams()} className="btn-municipales-secondary">
                <X size={14} />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="municipales-toolbar-right">
          <span className="municipales-count-text">
            Total: <span className="municipales-count-number">{count}</span>
          </span>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA */}
      <div className="municipales-content">
        {loading ? (
          <div className="municipales-loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando cámaras municipales...</p>
          </div>
        ) : camaras.length === 0 ? (
          <div className="municipales-empty-state">
            <Video size={48} />
            <h3>No hay cámaras municipales registradas</h3>
            <p>Comienza creando una nueva cámara municipal</p>
            <button onClick={openCreateModal} className="btn-municipales-primary">
              <Plus size={18} />
              <span>Crear Cámara Municipal</span>
            </button>
          </div>
        ) : (
          <>
            <div className="municipales-table-wrapper">
              <table className="municipales-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Dirección</th>
                    <th>Tipo</th>
                    <th>Coordenadas</th>
                    <th>Botón Pánico</th>
                    <th>Megáfono</th>
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
                        <td>{camera.name}</td>
                        <td>
                          <div className="municipales-address-cell">
                            <MapPin size={14} />
                            <span>{camera.address}</span>
                          </div>
                        </td>
                        <td>
                          <span className="municipales-badge municipales-badge-type">{camera.camera}</span>
                        </td>
                        <td>
                          <div className="municipales-address-cell">
                            <MapPin size={14} />
                            {parseFloat(camera.latitude)?.toFixed(6)}, {parseFloat(camera.longitude)?.toFixed(6)}
                          </div>
                        </td>
                        <td>
                          <span className={camera.buttom ? 'municipales-badge municipales-badge-success' : 'municipales-badge municipales-badge-gray'}>
                            {camera.buttom ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={camera.megaphone ? 'municipales-badge municipales-badge-success' : 'municipales-badge municipales-badge-gray'}>
                            {camera.megaphone ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div className="municipales-action-buttons">
                            <button
                              className="btn-icon-municipales btn-edit"
                              onClick={() => openEditModal(camera)}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn-icon-municipales btn-delete"
                              onClick={() => handleDelete(camera.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
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
        <div className="municipales-modal-overlay">
          <div className="municipales-modal-content">
            <div className="municipales-modal-header">
              <h2>
                {modalMode === 'create' ? (
                  <>
                    <Plus size={24} />
                    <span>Nueva Cámara Municipal</span>
                  </>
                ) : (
                  <>
                    <Edit2 size={24} />
                    <span>Editar Cámara Municipal</span>
                  </>
                )}
              </h2>
              <button className="btn-icon-municipales" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="municipales-modal-body">
              <div className="municipales-form-group">
                <label>
                  <Video size={16} />
                  <span>Nombre *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  placeholder="611"
                />
              </div>

              <div className="municipales-form-group">
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

              <div className="municipales-coordinates-group">
                <div className="municipales-form-group">
                  <label>
                    <Filter size={16} />
                    <span>Tipo *</span>
                  </label>
                  <select
                    name="camera"
                    value={formData.camera}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="LPR">LPR</option>
                    <option value="C180">C180</option>
                    <option value="C360">C360</option>
                  </select>
                </div>

                <div className="municipales-form-group">
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

                <div className="municipales-form-group">
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

              <div className="municipales-coordinates-group">
                <div className="municipales-form-group">
                  <label>
                    <Target size={16} />
                    <span>Ángulo (grados) *</span>
                    <span className="municipales-form-hint"> 0-360° dirección</span>
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
                    placeholder="0"
                  />
                </div>

                <div className="municipales-form-group">
                  <label>
                    <Target size={16} />
                    <span>Radio (grados) *</span>
                    <span className="municipales-form-hint"> ~0.0011 = 200m</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    name="radius"
                    value={formData.radius}
                    onChange={handleFormChange}
                    required
                    placeholder="0.0011"
                  />
                </div>

                <div className="municipales-form-group">
                  <label>
                    <Target size={16} />
                    <span>Amplitud (grados) *</span>
                    <span className="municipales-form-hint"> 0-360° apertura</span>
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
                    placeholder="180"
                  />
                </div>
              </div>

              {/* Previsualización del Campo de Visión */}
              <div className="municipales-map-section">
                <button
                  type="button"
                  onClick={() => setShowVisionPreview(!showVisionPreview)}
                  className="municipales-vision-toggle-button"
                >
                  <Target size={16} />
                  {showVisionPreview ? 'Ocultar Previsualización' : 'Ver Campo de Visión'}
                </button>

                {showVisionPreview && (
                  <div className="municipales-vision-preview">
                    <div ref={visionMapRef} style={{ width: '100%', height: '100%' }}></div>
                  </div>
                )}
                {showVisionPreview && (
                  <div className="municipales-vision-hint">
                    <p>
                      Vista previa del campo de visión • <strong>{formData.camera} - Amplitud {formData.arc}°</strong>
                    </p>
                    <p>
                      Ajusta el ángulo, radio y amplitud arriba para ver los cambios en tiempo real
                    </p>
                    <p>
                      <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                    </p>
                  </div>
                )}
              </div>

              <div className="municipales-checkbox-group">
                <div className="municipales-checkbox-item">
                  <input
                    type="checkbox"
                    name="buttom"
                    id="buttom"
                    checked={formData.buttom}
                    onChange={handleFormChange}
                  />
                  <label htmlFor="buttom">
                    ¿Tiene botón de pánico?
                  </label>
                </div>

                <div className="municipales-checkbox-item">
                  <input
                    type="checkbox"
                    name="megaphone"
                    id="megaphone"
                    checked={formData.megaphone}
                    onChange={handleFormChange}
                  />
                  <label htmlFor="megaphone">
                    ¿Tiene megáfono?
                  </label>
                </div>
              </div>

              {/* Geometry Editor Section */}
              <div className="municipales-geometry-section">
                <div className="municipales-geometry-header" onClick={() => setShowGeometryEditor(!showGeometryEditor)}>
                  <button
                    type="button"
                    className="municipales-geometry-toggle"
                  >
                    <MapPin size={16} />
                    <span>Radio de Cobertura (Geometry)</span>
                    <span>{showGeometryEditor ? '▼' : '▶'}</span>
                  </button>
                  {formData.geometry && (
                    <span className="municipales-geometry-status">
                      Configurado
                    </span>
                  )}
                </div>

                {showGeometryEditor && (
                  <div className="municipales-geometry-content">
                    <p className="municipales-geometry-help">
                      Ingresa un GeoJSON Polygon que represente el área de cobertura de la cámara.
                      Formato esperado:
                    </p>
                    <pre className="municipales-geometry-example">
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
                      className="municipales-geometry-textarea"
                      placeholder='{"type": "Polygon", "coordinates": [...]}'
                      rows={8}
                    />

                    <div className="municipales-geometry-actions">
                      <button
                        type="button"
                        onClick={handleClearGeometry}
                        className="municipales-geometry-clear"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyGeometry}
                        className="municipales-geometry-apply"
                      >
                        Aplicar Geometry
                      </button>
                    </div>

                    {/* Botón de previsualización */}
                    {formData.geometry && (
                      <div className="municipales-map-section">
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className="municipales-map-toggle-button"
                        >
                          <Eye size={16} />
                          {showPreview ? 'Ocultar Previsualización' : 'Ver Previsualización'}
                        </button>
                      </div>
                    )}

                    {/* Mapa de previsualización */}
                    {showPreview && formData.geometry && (
                      <div className="municipales-map-preview">
                        <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                      </div>
                    )}
                    {showPreview && formData.geometry && (
                      <div className="municipales-map-hint">
                        <p>
                          Previsualización del área de cobertura de la cámara
                        </p>
                        <p>
                          <strong>Tip:</strong> Haz doble clic en el mapa para cambiar la ubicación de la cámara
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="municipales-modal-footer">
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

export default GestionCamarasMunicipales;
