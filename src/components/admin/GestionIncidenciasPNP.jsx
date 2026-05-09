import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, X, Save, MapPin, RefreshCw, Shield, Zap, Search, ExternalLink, Calendar, Filter, SlidersHorizontal,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import pnpIncidenceService from '../../services/pnpIncidenceService';
import comisariasService   from '../../services/comisariasService';
import { useInvalidatePnpIncidencias } from '../../hooks/usePnpIncidenciasQuery';
import { useAuth } from '../../context/AuthContext';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionIncidenciasPNP.css';

const SHIFT_OPTIONS = [
  { value: 'MORNING',   label: 'Mañana' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'NIGHT',     label: 'Noche' },
];

const CASE_STATUS_OPTIONS = [
  { value: 'INVESTIGATING', label: 'En investigación' },
  { value: 'REFERRED',      label: 'Derivado' },
  { value: 'CLOSED',        label: 'Cerrado' },
];

const CASE_STATUS_DISPLAY = [
  { value: '',              label: 'Sin estado',        color: '#94a3b8' },
  { value: 'INVESTIGATING', label: 'En investigación',  color: '#3b82f6' },
  { value: 'REFERRED',      label: 'Derivado',          color: '#f59e0b' },
  { value: 'CLOSED',        label: 'Cerrado',           color: '#10b981' },
];

const SHIFT_COLORS = {
  MORNING:   '#ffd93d',
  AFTERNOON: '#ff8c42',
  NIGHT:     '#6c5ce7',
};

const STATUS_COLORS = {
  INVESTIGATING: '#3b82f6',
  REFERRED:      '#f59e0b',
  CLOSED:        '#10b981',
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
  address: '',
  latitude: '',
  longitude: '',
  jurisdiction: '',
  shift: '',
  complaint_number: '',
  police_station: '',
  case_status: '',
  occurred_date: '',
  occurred_time: '',
};

// ─── Utilidades ────────────────────────────────────────────────────────────────

/** Expande abreviaciones comunes antes de geocodificar */
const ABBREVS = [
  [/\bAv\.\s*/gi,  'Avenida '],
  [/\bJr\.\s*/gi,  'Jirón '],
  [/\bSta\.\s*/gi, 'Santa '],
  [/\bSto\.\s*/gi, 'Santo '],
  [/\bPje\.\s*/gi, 'Pasaje '],
  [/\bUrb\.\s*/gi, 'Urbanización '],
  [/\bMza\.\s*/gi, 'Manzana '],
  [/\bLte\.\s*/gi, 'Lote '],
  [/\s*&\s*/g,     ' y '],
];
const expandAbbrevs = q => ABBREVS.reduce((s, [re, rep]) => s.replace(re, rep), q).trim();

/** Normaliza texto: minúsculas, sin acentos, sin espacios extremos */
const normalize = s =>
  (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();

const pad = n => String(n).padStart(2, '0');

const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const DATE_PRESETS = [
  {
    label: 'Hoy',
    get: () => { const t = new Date(); return { start: fmtDate(t), end: fmtDate(t) }; },
  },
  {
    label: '7 días',
    get: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 7); return { start: fmtDate(s), end: fmtDate(t) }; },
  },
  {
    label: '1 mes',
    get: () => { const t = new Date(); const s = new Date(); s.setMonth(t.getMonth() - 1); return { start: fmtDate(s), end: fmtDate(t) }; },
  },
];

/**
 * Calcula el turno a partir de "HH:mm".
 * Mañana 06-13h | Tarde 14-21h | Noche 22-05h
 */
function calcularTurno(timeStr) {
  if (!timeStr) return '';
  const hora = parseInt(timeStr.slice(0, 2), 10);
  if (hora >= 6 && hora < 14)  return 'MORNING';
  if (hora >= 14 && hora < 22) return 'AFTERNOON';
  return 'NIGHT';
}

// ─── Componente ────────────────────────────────────────────────────────────────

const GestionIncidenciasPNP = () => {
  const location  = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const invalidatePnpIncidencias = useInvalidatePnpIncidencias();
  const params    = getParams();

  const [incidencias, setIncidencias]       = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [success, setSuccess]               = useState(null);
  const [count, setCount]                   = useState(0);
  const [update, setUpdate]                 = useState(false);

  const [showFilters, setShowFilters]       = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [showModal, setShowModal]           = useState(false);
  const [modalMode, setModalMode]           = useState('create');
  const [selectedItem, setSelectedItem]     = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState(null);

  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [showMapPreview, setShowMapPreview] = useState(false);

  // Indicadores de auto-relleno
  const [shiftAutoFilled, setShiftAutoFilled]             = useState(false);
  const [jurisdictionAutoFilled, setJurisdictionAutoFilled] = useState(false);
  const [stationAutoFilled, setStationAutoFilled]         = useState(false);
  const [coordsAutoFilled, setCoordsAutoFilled]           = useState(false);
  const [addressAutoFilled, setAddressAutoFilled]         = useState(false);
  const [detectingJuris, setDetectingJuris]               = useState(false);

  // Lista de comisarías desde la API
  const [comisariasList, setComisariasList] = useState([]);

  // Búsqueda de direcciones en el mapa
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);

  const mapRef           = useRef(null);
  const leafletMapRef    = useRef(null);
  const markerRef        = useRef(null);
  const geojsonCache     = useRef(null);
  const comisariasRef    = useRef([]);

  const { hasModuleAccess, hasModuleOp } = useAuth();
  const hasAccess = hasModuleAccess('incidencias-pnp');
  const canWrite  = hasModuleOp('incidencias-pnp', 'create');

  useEffect(() => {
    if (hasAccess) loadData();
  }, [location.search, update]);

  // Cargar lista de comisarías una sola vez
  useEffect(() => {
    comisariasService.getAll({ page: 1, limit: 100 })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setComisariasList(list);
        comisariasRef.current = list;
      })
      .catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const isNoShift = params.shift === 'NO_SHIFT';
      const filters = {
        search:         params.search         || '',
        shift:          isNoShift ? '' : (params.shift || ''),
        no_shift:       isNoShift ? 'true' : '',
        incidence_type: params.incidence_type || '',
        jurisdiction:   params.jurisdiction   || '',
        start:          params.start          || '',
        end:            params.end            || '',
        page:           parseInt(params.page)  || 1,
        limit:          parseInt(params.limit) || 20,
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

  // ─── Auto-relleno de comisaría según jurisdicción ───────────────────────────

  const autoFillStation = (jurisdiction, list) => {
    if (!jurisdiction || !list.length) return;
    const jurisNorm = normalize(jurisdiction);
    const match = list.find(c => normalize(c.name).includes(jurisNorm));
    if (match) {
      setFormData(prev => ({ ...prev, police_station: match.name }));
      setStationAutoFilled(true);
    }
  };

  // ─── Auto-detección de jurisdicción via GeoJSON + Turf ─────────────────────

  const autoDetectarJurisdiccion = async (lat, lng) => {
    try {
      setDetectingJuris(true);
      if (!geojsonCache.current) {
        const res = await fetch('/data/juridiccion.geojson');
        geojsonCache.current = await res.json();
      }
      const { point, booleanPointInPolygon, polygon } = await import('@turf/turf');
      const punto    = point([lng, lat]);
      const features = geojsonCache.current?.features ?? [];

      for (const feat of features) {
        if (!feat.geometry?.coordinates) continue;
        const poly = polygon(feat.geometry.coordinates);
        if (booleanPointInPolygon(punto, poly)) {
          const geoName = normalize(feat.properties?.name || feat.properties?.nombre || '');
          const match   = JURISDICTIONS.find(j => normalize(j) === geoName);
          if (match) return match;
        }
      }
    } catch (e) {
      console.error('Error detectando jurisdicción:', e);
    } finally {
      setDetectingJuris(false);
    }
    return null;
  };

  // ─── Búsqueda de direcciones (Nominatim) ────────────────────────────────────

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      // Expandir abreviaciones y agregar contexto SJL si el usuario no lo escribió
      const expanded   = expandAbbrevs(searchQuery.trim());
      const hasContext = /san juan de lurigancho|sjl|lima/i.test(expanded);
      const query      = hasContext ? expanded : `${expanded}, San Juan de Lurigancho, Lima, Perú`;

      // 1) Nominatim
      const nomUrl  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=pe&accept-language=es`;
      const nomRes  = await fetch(nomUrl);
      const nomData = await nomRes.json();

      if (Array.isArray(nomData) && nomData.length > 0) {
        setSearchResults(nomData.map(r => ({ lat: r.lat, lon: r.lon, label: r.display_name })));
        return;
      }

      // 2) Fallback: Photon (Komoot) con sesgo geográfico hacia SJL
      const photonUrl  = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=-11.9699&lon=-77.0`;
      const photonRes  = await fetch(photonUrl);
      const photonData = await photonRes.json();
      const features   = photonData?.features ?? [];

      if (features.length > 0) {
        setSearchResults(features.map(f => {
          const p     = f.properties;
          const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
          return {
            lat: String(f.geometry.coordinates[1]),
            lon: String(f.geometry.coordinates[0]),
            label: parts.join(', '),
          };
        }));
        return;
      }

      // Sin resultados
      setSearchResults([]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = result => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 17);
    }
    if (result.label) {
      setFormData(prev => ({ ...prev, address: result.label }));
      setAddressAutoFilled(true);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const abrirGoogleMaps = () => {
    const query = searchQuery.trim() || 'San Juan de Lurigancho, Lima';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ', San Juan de Lurigancho, Lima, Perú')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─── Modal create ───────────────────────────────────────────────────────────

  const openCreateModal = () => {
    const now   = new Date();
    const occurred_date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const occurred_time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const turno = calcularTurno(occurred_time);
    setModalMode('create');
    setFormData({ ...EMPTY_FORM, occurred_date, occurred_time, shift: turno });
    setShiftAutoFilled(!!turno);
    setJurisdictionAutoFilled(false);
    setStationAutoFilled(false);
    setCoordsAutoFilled(false);
    setAddressAutoFilled(false);
    setShowMapPreview(true);
    setShowModal(true);
  };

  const openEditModal = item => {
    setModalMode('edit');
    setSelectedItem(item);
    const dateTimePart = item.occurred_at ? item.occurred_at.substring(0, 16) : '';
    const occurred_date = dateTimePart.substring(0, 10);
    const rawTime = dateTimePart.length >= 16 ? dateTimePart.substring(11, 16) : '';
    // Si no tiene turno fue registrado "sin hora" — el tiempo UTC no es confiable para detectarlo
    const occurred_time = !item.shift ? '' : rawTime;
    setFormData({
      description:      item.description      || '',
      incidence_type:   item.incidence_type   || '',
      address:          item.address          || '',
      latitude:         item.latitude         ?? '',
      longitude:        item.longitude        ?? '',
      jurisdiction:     item.jurisdiction     || '',
      shift:            item.shift            || '',
      complaint_number: item.complaint_number || '',
      police_station:   item.police_station   || '',
      case_status:      item.case_status      || '',
      occurred_date,
      occurred_time,
    });
    setShiftAutoFilled(false);
    setJurisdictionAutoFilled(false);
    setStationAutoFilled(false);
    setCoordsAutoFilled(false);
    setShowMapPreview(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setFormData(EMPTY_FORM);
    setShowMapPreview(false);
    setShiftAutoFilled(false);
    setJurisdictionAutoFilled(false);
    setStationAutoFilled(false);
    setCoordsAutoFilled(false);
    setAddressAutoFilled(false);
    setSearchQuery('');
    setSearchResults([]);
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    markerRef.current = null;
  };

  // ─── Handlers de formulario ─────────────────────────────────────────────────

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'shift')          setShiftAutoFilled(false);
    if (name === 'police_station') setStationAutoFilled(false);
    if (name === 'latitude' || name === 'longitude') setCoordsAutoFilled(false);
    if (name === 'address') setAddressAutoFilled(false);
    if (name === 'jurisdiction') {
      setJurisdictionAutoFilled(false);
      autoFillStation(value, comisariasRef.current);
    }
    if (name === 'occurred_time') {
      const turno = calcularTurno(value);
      setFormData(prev => ({ ...prev, occurred_time: value, shift: turno }));
      setShiftAutoFilled(!!turno);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canWrite) return;

    const required = ['description', 'incidence_type', 'latitude', 'longitude', 'jurisdiction', 'police_station', 'occurred_date'];
    for (const field of required) {
      if (!formData[field] && formData[field] !== 0) {
        showMessage(`El campo "${field}" es requerido`, true);
        return;
      }
    }

    try {
      setLoading(true);
      const dateTimeStr = formData.occurred_time
        ? `${formData.occurred_date}T${formData.occurred_time}:00`
        : `${formData.occurred_date}T00:00:00`;
      const payload = {
        description:      formData.description,
        incidence_type:   formData.incidence_type,
        address:          formData.address || undefined,
        latitude:         parseFloat(formData.latitude),
        longitude:        parseFloat(formData.longitude),
        jurisdiction:     formData.jurisdiction,
        shift:            formData.shift || null,
        police_station:   formData.police_station,
        case_status:      formData.case_status || null,
        occurred_at:      new Date(dateTimeStr).toISOString(),
        complaint_number: formData.complaint_number || undefined,
      };
      if (modalMode === 'create') {
        await pnpIncidenceService.create(payload);
        showMessage('Incidencia registrada correctamente');
      } else {
        await pnpIncidenceService.update(selectedItem.id, payload);
        showMessage('Incidencia actualizada correctamente');
      }
      invalidatePnpIncidencias();
      closeModal();
      setUpdate(p => !p);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = item => { setDeleteTarget(item); setShowDeleteConfirm(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await pnpIncidenceService.delete(deleteTarget.id);
      showMessage('Incidencia eliminada correctamente');
      invalidatePnpIncidencias();
      setUpdate(p => !p);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // ─── Mapa Leaflet ───────────────────────────────────────────────────────────

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

      leafletMapRef.current.on('dblclick', async e => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setFormData(prev => ({ ...prev, latitude: clickLat, longitude: clickLng }));
        setCoordsAutoFilled(true);

        // Geocodificación inversa para obtener dirección
        try {
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}&accept-language=es`,
            { headers: { 'User-Agent': 'MapaPrediccion/1.0' } }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.display_name) {
              setFormData(prev => ({ ...prev, address: revData.display_name }));
              setAddressAutoFilled(true);
            }
          }
        } catch { /* silencioso — el usuario puede escribir la dirección manualmente */ }

        // Auto-detectar jurisdicción
        const jurisdiccion = await autoDetectarJurisdiccion(clickLat, clickLng);
        if (jurisdiccion) {
          setFormData(prev => ({ ...prev, jurisdiction: jurisdiccion }));
          setJurisdictionAutoFilled(true);
          autoFillStation(jurisdiccion, comisariasRef.current);
        } else {
          setJurisdictionAutoFilled(false);
        }
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

  // ─── Render ─────────────────────────────────────────────────────────────────

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
          <div className="pnp-header-icon"><Shield size={28} /></div>
          <div className="pnp-header-text">
            <h1>Incidencias PNP</h1>
            <p>Registro de incidencias policiales — {count} registros</p>
          </div>
        </div>
        <div className="pnp-header-actions">
          <button className="btn-pnp-secondary" onClick={() => setUpdate(p => !p)}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button
            className={`btn-pnp-secondary btn-pnp-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(p => !p)}
          >
            <Filter size={15} />
            Filtros
            {(params.search || params.incidence_type || params.shift || params.jurisdiction || params.start || params.end) && (
              <span className="pnp-filter-dot" />
            )}
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
      {success && <div className="pnp-alert pnp-alert-success">{success}</div>}

      {/* Filters */}
      {showFilters && <div className="pnp-filters-card">
        <div className="pnp-filters-header">
          <span className="pnp-filters-title">
            <SlidersHorizontal size={15} />
            Filtros
          </span>
          {(params.search || params.incidence_type || params.shift || params.jurisdiction || params.start || params.end) && (
            <button
              className="pnp-btn-reset-filters"
              onClick={() => addParams({ search: '', incidence_type: '', shift: '', jurisdiction: '', start: '', end: '', page: 1 })}
            >
              <X size={12} /> Limpiar todo
            </button>
          )}
        </div>

        <div className="pnp-filters-body">
          {/* Búsqueda */}
          <div className="pnp-filter-group pnp-filter-group--wide">
            <label className="pnp-filter-label"><Search size={12} /> Búsqueda</label>
            <SearchInput
              value={params.search || ''}
              onChange={v => addParams({ search: v, page: 1 })}
              placeholder="Descripción, tipo, jurisdicción, comisaría..."
            />
          </div>

          {/* Tipo */}
          <div className="pnp-filter-group">
            <label className="pnp-filter-label"><Shield size={12} /> Tipo</label>
            <select
              className="pnp-select-filter"
              value={params.incidence_type || ''}
              onChange={e => addParams({ incidence_type: e.target.value, page: 1 })}
            >
              <option value="">Todos los tipos</option>
              {INCIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Turno */}
          <div className="pnp-filter-group">
            <label className="pnp-filter-label"><Zap size={12} /> Turno</label>
            <select
              className="pnp-select-filter"
              value={params.shift || ''}
              onChange={e => addParams({ shift: e.target.value, page: 1 })}
            >
              <option value="">Todos los turnos</option>
              {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="NO_SHIFT">Sin turno</option>
            </select>
          </div>

          {/* Jurisdicción */}
          <div className="pnp-filter-group">
            <label className="pnp-filter-label"><MapPin size={12} /> Jurisdicción</label>
            <select
              className="pnp-select-filter"
              value={params.jurisdiction || ''}
              onChange={e => addParams({ jurisdiction: e.target.value, page: 1 })}
            >
              <option value="">Todas las jurisdicciones</option>
              {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          {/* Rango de fechas */}
          <div className="pnp-filter-group pnp-filter-group--dates">
            <label className="pnp-filter-label">
              <Calendar size={12} /> Rango de fechas
              <button
                className={`pnp-toggle-custom-dates ${showCustomDates ? 'active' : ''}`}
                onClick={() => setShowCustomDates(p => !p)}
                title={showCustomDates ? 'Volver a presets' : 'Elegir rango personalizado'}
              >
                <Calendar size={11} />
                {showCustomDates ? 'Presets' : 'Personalizado'}
              </button>
            </label>

            {!showCustomDates ? (
              <div className="pnp-date-presets">
                {DATE_PRESETS.map(preset => {
                  const { start, end } = preset.get();
                  const isActive = params.start === start && params.end === end;
                  return (
                    <button
                      key={preset.label}
                      className={`pnp-preset-chip ${isActive ? 'active' : ''}`}
                      onClick={() => addParams({ start, end, page: 1 })}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                {(params.start || params.end) && !DATE_PRESETS.some(p => p.get().start === params.start && p.get().end === params.end) && (
                  <span className="pnp-custom-active-hint">
                    <Calendar size={11} /> Rango personalizado activo
                  </span>
                )}
              </div>
            ) : (
              <div className="pnp-daterange">
                <div className="pnp-daterange-field">
                  <span className="pnp-daterange-tag">Desde</span>
                  <input
                    type="date"
                    className="pnp-date-input"
                    value={params.start || ''}
                    onChange={e => addParams({ start: e.target.value, page: 1 })}
                  />
                </div>
                <span className="pnp-daterange-arrow">→</span>
                <div className="pnp-daterange-field">
                  <span className="pnp-daterange-tag">Hasta</span>
                  <input
                    type="date"
                    className="pnp-date-input"
                    value={params.end || ''}
                    onChange={e => addParams({ end: e.target.value, page: 1 })}
                  />
                </div>
                {(params.start || params.end) && (
                  <button
                    className="pnp-daterange-clear"
                    onClick={() => addParams({ start: '', end: '', page: 1 })}
                    title="Limpiar fechas"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>}

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
                    {item.shift ? (
                      <span
                        className="pnp-badge"
                        style={{
                          background: SHIFT_COLORS[item.shift] + '33',
                          color: SHIFT_COLORS[item.shift],
                          border: `1px solid ${SHIFT_COLORS[item.shift]}`,
                        }}
                      >
                        {SHIFT_OPTIONS.find(s => s.value === item.shift)?.label || item.shift}
                      </span>
                    ) : (
                      <span className="pnp-badge" style={{ background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                        Sin turno
                      </span>
                    )}
                  </td>
                  <td>{item.jurisdiction}</td>
                  <td>{item.police_station}</td>
                  <td>
                    {(() => {
                      const st = CASE_STATUS_DISPLAY.find(s => s.value === (item.case_status || ''));
                      return (
                        <span
                          className="pnp-badge"
                          style={{
                            background: (st?.color || '#94a3b8') + '22',
                            color: st?.color || '#94a3b8',
                            border: `1px solid ${st?.color || '#94a3b8'}`,
                          }}
                        >
                          {st?.label || item.case_status}
                        </span>
                      );
                    })()}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="pnp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pnp-modal">

            {/* Header */}
            <div className="pnp-modal-header">
              <div className="pnp-modal-header-left">
                <div className="pnp-modal-header-icon">
                  <Shield size={20} />
                </div>
                <div className="pnp-modal-header-text">
                  <h2>{modalMode === 'create' ? 'Nueva Incidencia PNP' : 'Editar Incidencia PNP'}</h2>
                  <p>{modalMode === 'create' ? 'Completa los datos del incidente policial' : 'Modifica los datos del incidente'}</p>
                </div>
              </div>
              <button className="pnp-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="pnp-modal-body">

                {/* ── Sección: Ubicación ───────────────────── */}
                <div className="pnp-form-section">
                  <div className="pnp-form-section-header">
                    <MapPin size={13} /> Ubicación
                  </div>

                  {/* Mapa */}
                  <div className="pnp-map-section">
                    <button
                      type="button"
                      className="btn-pnp-secondary btn-map-toggle"
                      onClick={() => setShowMapPreview(p => !p)}
                    >
                      <MapPin size={14} />
                      {showMapPreview ? 'Ocultar mapa' : 'Seleccionar en mapa (doble clic)'}
                    </button>
                    {showMapPreview && (
                      <>
                        <p className="pnp-map-hint">
                          <MapPin size={11} />
                          Busca una dirección, luego haz <strong>doble clic</strong> para fijar la ubicación exacta.
                        </p>
                        <div className="pnp-map-search">
                          <div className="pnp-map-search-row">
                            <input
                              type="text"
                              className="pnp-map-search-input"
                              value={searchQuery}
                              onChange={e => { setSearchQuery(e.target.value); setSearchResults([]); }}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }}
                              placeholder="Buscar dirección, av., calle… (ej. Av. Gran Chimú)"
                            />
                            <button
                              type="button"
                              className="pnp-map-search-btn"
                              onClick={searchAddress}
                              disabled={searching || !searchQuery.trim()}
                            >
                              {searching ? <RefreshCw size={14} className="spinning" /> : <Search size={14} />}
                            </button>
                          </div>
                          {searchQuery.trim() && (
                            <button type="button" className="pnp-btn-googlemaps" onClick={abrirGoogleMaps}>
                              <ExternalLink size={12} /> Buscar mejor en Google Maps
                            </button>
                          )}
                          {!searching && searchResults.length === 0 && searchQuery !== '' && (
                            <p className="pnp-map-search-noresult">Sin resultados. Prueba buscando en Google Maps.</p>
                          )}
                          {searchResults.length > 0 && (
                            <ul className="pnp-map-search-results">
                              {searchResults.map((r, i) => (
                                <li key={i} onClick={() => selectSearchResult(r)}>
                                  <MapPin size={12} className="pnp-search-result-icon" />
                                  <span>{r.label}</span>
                                </li>
                              ))}
                              <li className="pnp-search-results-close" onClick={() => setSearchResults([])}>
                                <X size={11} /> Cerrar
                              </li>
                            </ul>
                          )}
                        </div>
                        <div ref={mapRef} className="pnp-map-preview" />
                      </>
                    )}
                  </div>

                  <div className="pnp-form-grid">
                    {/* Coordenadas */}
                    <div className="pnp-form-group">
                      <label>
                        Latitud *
                        {coordsAutoFilled && <span className="pnp-auto-badge"><MapPin size={9} /> Auto</span>}
                      </label>
                      <input
                        type="number" name="latitude" value={formData.latitude}
                        onChange={handleFormChange} step="any" required placeholder="-11.9699"
                        className={coordsAutoFilled ? 'pnp-auto-input' : ''}
                      />
                    </div>
                    <div className="pnp-form-group">
                      <label>
                        Longitud *
                        {coordsAutoFilled && <span className="pnp-auto-badge"><MapPin size={9} /> Auto</span>}
                      </label>
                      <input
                        type="number" name="longitude" value={formData.longitude}
                        onChange={handleFormChange} step="any" required placeholder="-76.998"
                        className={coordsAutoFilled ? 'pnp-auto-input' : ''}
                      />
                    </div>
                    {/* Dirección */}
                    <div className="pnp-form-group full">
                      <label>
                        Dirección
                        {addressAutoFilled && <span className="pnp-auto-badge"><MapPin size={9} /> Auto</span>}
                      </label>
                      <input
                        type="text" name="address" value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Se completa al seleccionar en el mapa o escríbela manualmente"
                        className={addressAutoFilled ? 'pnp-auto-input' : ''}
                      />
                    </div>
                    {/* Jurisdicción */}
                    <div className="pnp-form-group">
                      <label>
                        Jurisdicción *
                        {jurisdictionAutoFilled && <span className="pnp-auto-badge"><MapPin size={9} /> Auto</span>}
                        {detectingJuris && <span className="pnp-detecting-badge">Detectando...</span>}
                      </label>
                      <select
                        name="jurisdiction" value={formData.jurisdiction}
                        onChange={handleFormChange} required
                        className={jurisdictionAutoFilled ? 'pnp-auto-input' : ''}
                      >
                        <option value="">Seleccionar...</option>
                        {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    {/* Comisaría */}
                    <div className="pnp-form-group">
                      <label>
                        Comisaría *
                        {stationAutoFilled && <span className="pnp-auto-badge"><MapPin size={9} /> Auto</span>}
                      </label>
                      <select
                        name="police_station" value={formData.police_station}
                        onChange={handleFormChange} required
                        className={stationAutoFilled ? 'pnp-auto-input' : ''}
                      >
                        <option value="">Seleccionar comisaría...</option>
                        {comisariasList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Sección: Detalle del Incidente ──────── */}
                <div className="pnp-form-section">
                  <div className="pnp-form-section-header">
                    <Shield size={13} /> Detalle del Incidente
                  </div>
                  <div className="pnp-form-grid">
                    <div className="pnp-form-group">
                      <label>Tipo de Incidencia *</label>
                      <select name="incidence_type" value={formData.incidence_type} onChange={handleFormChange} required>
                        <option value="">Seleccionar...</option>
                        {INCIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="pnp-form-group">
                      <label>N° Denuncia <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                      <input
                        type="text" name="complaint_number" value={formData.complaint_number}
                        onChange={handleFormChange} placeholder="Dejar en blanco si no aplica"
                      />
                    </div>
                    <div className="pnp-form-group full">
                      <label>Descripción *</label>
                      <textarea
                        name="description" value={formData.description}
                        onChange={handleFormChange} rows={3} required
                        placeholder="Describe con detalle la incidencia..."
                      />
                    </div>
                  </div>
                </div>

                {/* ── Sección: Fecha, Hora y Estado ───────── */}
                <div className="pnp-form-section" style={{ marginBottom: 0 }}>
                  <div className="pnp-form-section-header">
                    <Calendar size={13} /> Fecha, Hora y Estado
                  </div>
                  <div className="pnp-form-grid">
                    <div className="pnp-form-group">
                      <label>Fecha del Hecho *</label>
                      <input
                        type="date" name="occurred_date" value={formData.occurred_date}
                        onChange={handleFormChange} required
                      />
                    </div>
                    <div className="pnp-form-group">
                      <label>Hora del Hecho</label>
                      {formData.occurred_time === '' ? (
                        <div className="pnp-no-time-display">Sin hora registrada</div>
                      ) : (
                        <input
                          type="time" name="occurred_time" value={formData.occurred_time}
                          onChange={handleFormChange}
                        />
                      )}
                      <label className="pnp-no-time-toggle">
                        <input
                          type="checkbox"
                          checked={formData.occurred_time === ''}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, occurred_time: '', shift: '' }));
                              setShiftAutoFilled(false);
                            } else {
                              const now = new Date();
                              const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                              const turno = calcularTurno(t);
                              setFormData(prev => ({ ...prev, occurred_time: t, shift: turno }));
                              setShiftAutoFilled(!!turno);
                            }
                          }}
                        />
                        Sin hora
                      </label>
                    </div>
                    <div className="pnp-form-group">
                      <label>
                        Turno
                        {shiftAutoFilled && <span className="pnp-auto-badge"><Zap size={9} /> Auto</span>}
                      </label>
                      <select
                        name="shift" value={formData.shift} onChange={handleFormChange}
                        className={shiftAutoFilled ? 'pnp-auto-input' : ''}
                      >
                        <option value="">Sin turno</option>
                        {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="pnp-form-group">
                      <label>Estado del Caso</label>
                      <select name="case_status" value={formData.case_status} onChange={handleFormChange}>
                        <option value="">Sin estado</option>
                        {CASE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pnp-modal-footer">
                <button type="button" className="btn-pnp-secondary" onClick={closeModal}>
                  <X size={14} /> Cancelar
                </button>
                <button type="submit" className="btn-pnp-primary" disabled={loading}>
                  <Save size={14} /> {modalMode === 'create' ? 'Registrar Incidencia' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="pnp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div className="pnp-modal pnp-modal-sm">
            <div className="pnp-modal-header" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
              <div className="pnp-modal-header-left">
                <div className="pnp-modal-header-icon">
                  <Trash2 size={18} />
                </div>
                <div className="pnp-modal-header-text">
                  <h2>Eliminar incidencia</h2>
                  <p>Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button className="pnp-modal-close" onClick={() => setShowDeleteConfirm(false)}><X size={18} /></button>
            </div>
            <div className="pnp-modal-body">
              <p style={{ color: '#374151', fontSize: 14, marginBottom: 8 }}>¿Estás seguro que deseas eliminar esta incidencia?</p>
              <p style={{ color: '#6b7280', fontSize: 13, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                {deleteTarget?.description}
              </p>
            </div>
            <div className="pnp-modal-footer">
              <button className="btn-pnp-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
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
