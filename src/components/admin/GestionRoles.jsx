import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, X, Save, RefreshCw, Shield,
  Layers, Settings, Users, ChevronDown, ChevronUp, Camera,
} from 'lucide-react';
import rolesService from '../../services/rolesService';
import pnpIncidenceService from '../../services/pnpIncidenceService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionRoles.css';

// ─── Definición de módulos y capas disponibles ────────────────────────────────

const AVAILABLE_MODULES = [
  { key: 'camaras-municipales',  label: 'Cámaras Municipales' },
  { key: 'camaras-vecinales',    label: 'Cámaras Vecinales' },
  { key: 'actividades',          label: 'Actividades' },
  { key: 'incidencias-pnp',      label: 'Incidencias PNP' },
  { key: 'tipos-incidencia',     label: 'Tipos de Incidencia PNP' },
  { key: 'subtipos-incidencia',  label: 'Subtipos de Incidencia PNP' },
  { key: 'modalidades-incidencia', label: 'Modalidades de Incidencia PNP' },
  { key: 'dashboard-serenos',      label: 'Dashboard Serenos' },
  { key: 'dashboard-pnp',          label: 'Dashboard PNP' },
  { key: 'reportes-incidencias',   label: 'Reportes de Incidencias' },
  { key: 'auditoria',              label: 'Auditoría' },
  { key: 'usuarios',             label: 'Usuarios' },
  { key: 'roles',                label: 'Roles' },
  { key: 'comisarias',           label: 'Comisarías' },
];

const AVAILABLE_LAYERS = [
  { key: 'camaras',                  label: 'Cámaras Municipales',        group: 'Cámaras' },
  { key: 'camarasVecinales',         label: 'Cámaras Vecinales',          group: 'Cámaras' },
  { key: 'jurisdicciones',           label: 'Jurisdicciones',             group: 'Geografía' },
  { key: 'zonasCodisec',             label: 'Comunas CODISEC',            group: 'Geografía' },
  { key: 'paraderosAutorizados',     label: 'Paraderos Autorizados',      group: 'Infraestructura' },
  { key: 'paraderosNoAutorizados',   label: 'Paraderos No Autorizados',   group: 'Infraestructura' },
  { key: 'defensaCivil',             label: 'Defensa Civil',              group: 'Infraestructura' },
  { key: 'residuos',                 label: 'Residuos Sólidos',           group: 'Infraestructura' },
  { key: 'sostenimiento',            label: 'Sostenimiento',              group: 'Infraestructura' },
  { key: 'actividades',              label: 'Actividades',                group: 'Infraestructura' },
  { key: 'comisarias',               label: 'Comisarías',                 group: 'Infraestructura' },
  // ── Robos (subtipos individuales) ──────────────────────────────────────────
  { key: 'roboPersonas',   label: 'Robo a Personas',    group: 'Robos Serenos' },
  { key: 'roboCasa',       label: 'Robo Casa Habitada', group: 'Robos Serenos' },
  { key: 'roboGanado',     label: 'Robo de Ganado',     group: 'Robos Serenos' },
  { key: 'roboEmpresas',   label: 'Robo a Empresas',    group: 'Robos Serenos' },
  { key: 'roboVehiculos',  label: 'Robo de Vehículos',  group: 'Robos Serenos' },
  { key: 'roboAutopartes', label: 'Robo de Autopartes', group: 'Robos Serenos' },
  { key: 'roboPasajeros',  label: 'Robo a Pasajeros',   group: 'Robos Serenos' },
  // ── Hurtos (subtipos individuales) ──────────────────────────────────────────
  { key: 'hurtoPersonas',  label: 'Hurto a Personas',    group: 'Hurtos Serenos' },
  { key: 'hurtoCasa',      label: 'Hurto Casa Habitada', group: 'Hurtos Serenos' },
  { key: 'hurtoGanado',    label: 'Hurto de Ganado',     group: 'Hurtos Serenos' },
  { key: 'hurtoEmpresas',  label: 'Hurto a Empresas',    group: 'Hurtos Serenos' },
  { key: 'hurtoVehiculos', label: 'Hurto de Vehículos',  group: 'Hurtos Serenos' },
  { key: 'hurtoPasajeros', label: 'Hurto a Pasajeros',   group: 'Hurtos Serenos' },
  // ── Otros delitos ────────────────────────────────────────────────────────────
  { key: 'danos',          label: 'Daños',              group: 'Incidencias Serenos' },
  { key: 'extorsiones',    label: 'Extorsiones',        group: 'Incidencias Serenos' },
  { key: 'homicidios',     label: 'Homicidios',         group: 'Incidencias Serenos' },
  { key: 'feminicidios',   label: 'Feminicidios',       group: 'Incidencias Serenos' },
  { key: 'sicariatos',     label: 'Sicariatos',         group: 'Incidencias Serenos' },
  { key: 'secuestros',     label: 'Secuestros',         group: 'Incidencias Serenos' },
  { key: 'drogas',         label: 'Drogas',             group: 'Incidencias Serenos' },
  { key: 'barras',         label: 'Barras Bravas',      group: 'Incidencias Serenos' },
  { key: 'pnpPatrimonio',            label: 'Patrimonio',                 group: 'Incidencias PNP' },
  { key: 'pnpSeguridadPublica',      label: 'Seguridad Pública',          group: 'Incidencias PNP' },
  { key: 'pnpVidaSalud',             label: 'Vida y Salud',               group: 'Incidencias PNP' },
  { key: 'pnpLibertad',              label: 'Libertad',                   group: 'Incidencias PNP' },
  { key: 'pnpAdminPublica',          label: 'Adm. Pública',               group: 'Incidencias PNP' },
  { key: 'pnpTrafico',               label: 'Tráfico Drogas',             group: 'Incidencias PNP' },
  { key: 'pnpFamilia',               label: 'Familia',                    group: 'Incidencias PNP' },
  { key: 'pnpMenorInfractor',        label: 'Menor Infractor',            group: 'Incidencias PNP' },
  { key: 'pnpFePublica',             label: 'Fe Pública',                 group: 'Incidencias PNP' },
  { key: 'pnpTranquilidad',          label: 'Tranquilidad Pública',       group: 'Incidencias PNP' },
  { key: 'busquedaDirecciones',      label: 'Búsqueda de Direcciones',    group: 'Herramientas' },
  { key: 'ubicadorPunto',            label: 'Ubicador de Puntos',         group: 'Herramientas' },
  { key: 'rutas',                    label: 'Calculador de Rutas',        group: 'Herramientas' },
  { key: 'clusters',                 label: 'Clusters de Incidencias',    group: 'Herramientas' },
  { key: 'clusterCombinado',         label: 'Cluster Combinado',          group: 'Herramientas' },
  { key: 'clusterPNP',               label: 'Cluster PNP',                group: 'Herramientas' },
];

const LAYER_GROUPS = [...new Set(AVAILABLE_LAYERS.map(l => l.group))];

// ─── Estado inicial de permisos ───────────────────────────────────────────────

// Campos configurables por módulo de cámara
const MODULE_VISIBLE_FIELDS = {
  'camaras-municipales': [
    { key: 'address',   label: 'Dirección' },
    { key: 'buttom',    label: 'Botón de Pánico' },
    { key: 'megaphone', label: 'Megáfono' },
    { key: 'vision',    label: 'Ángulo de Visión' },
  ],
  'camaras-vecinales': [
    { key: 'address',   label: 'Dirección' },
    { key: 'neighbor',  label: 'Nombre del Vecino' },
    { key: 'brand',     label: 'Marca' },
    { key: 'mode',      label: 'Modo' },
    { key: 'phone',     label: 'Teléfono (sensible)' },
    { key: 'user',      label: 'Usuario de Acceso' },
    { key: 'password',  label: 'Contraseña' },
    { key: 'serial',    label: 'Serial del Dispositivo' },
  ],
  'comisarias': [
    { key: 'name', label: 'Nombre' },
  ],
};

// Vincula cada capa de cámara con su módulo y sus campos configurables
const LAYER_CAMERA_CONFIG = {
  camaras:          { moduleKey: 'camaras-municipales', label: 'Cámaras Municipales', fields: MODULE_VISIBLE_FIELDS['camaras-municipales'] },
  camarasVecinales: { moduleKey: 'camaras-vecinales',   label: 'Cámaras Vecinales',   fields: MODULE_VISIBLE_FIELDS['camaras-vecinales']   },
  comisarias:       { moduleKey: 'comisarias',          label: 'Comisarías',          fields: MODULE_VISIBLE_FIELDS['comisarias']          },
};

const buildInitialModuleState = () =>
  Object.fromEntries(
    AVAILABLE_MODULES.map(m => [m.key, { enabled: false, can_create: false, can_edit: false, can_delete: false, visible_fields: [] }])
  );

const buildInitialLayerState = () =>
  Object.fromEntries(AVAILABLE_LAYERS.map(l => [l.key, false]));

// ─── Helpers de conversión ────────────────────────────────────────────────────

// Devuelve la clave de capa de cámara para un moduleKey, si existe
const cameraLayerKeyFor = (moduleKey) =>
  Object.entries(LAYER_CAMERA_CONFIG).find(([, c]) => c.moduleKey === moduleKey)?.[0] ?? null;

// moduleState: { [key]: { enabled, can_create, can_edit, can_delete, visible_fields } }
// layerState:  { [key]: boolean }
// Para módulos de cámara: se guarda siempre que la capa esté activa (para visible_fields),
// aunque "Acceso" no esté marcado — can_access = false en ese caso.
const moduleStateToApi = (moduleState, layerState) =>
  AVAILABLE_MODULES
    .filter(m => {
      if (moduleState[m.key]?.enabled) return true;
      const layerKey = cameraLayerKeyFor(m.key);
      return layerKey ? !!layerState[layerKey] : false;
    })
    .map(m => ({
      module_key:     m.key,
      can_access:     moduleState[m.key].enabled,       // "Acceso" = acceso al panel
      can_create:     moduleState[m.key].can_create,
      can_edit:       moduleState[m.key].can_edit,
      can_delete:     moduleState[m.key].can_delete,
      visible_fields: moduleState[m.key].visible_fields ?? [],
    }));

const layerStateToApi = (layerState) =>
  AVAILABLE_LAYERS
    .filter(l => layerState[l.key])
    .map(l => ({ layer_key: l.key }));

const apiToModuleState = (modulePermissions = []) => {
  const state = buildInitialModuleState();
  modulePermissions.forEach(({ module_key, can_access, can_create, can_edit, can_delete, visible_fields }) => {
    if (state[module_key] !== undefined) {
      // enabled = can_access (con fallback true para datos anteriores sin este campo)
      state[module_key] = {
        enabled:        can_access ?? true,
        can_create,
        can_edit,
        can_delete,
        visible_fields: visible_fields ?? [],
      };
    }
  });
  return state;
};

const apiToLayerState = (layerPermissions = []) => {
  const state = buildInitialLayerState();
  layerPermissions.forEach(({ layer_key }) => {
    if (state[layer_key] !== undefined) state[layer_key] = true;
  });
  return state;
};

// ─── Componente principal ─────────────────────────────────────────────────────

const GestionRoles = () => {
  const location = useLocation();
  const { addParams, getParams, removeParams } = UseUrlParamsManager();
  const params = getParams();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [update, setUpdate] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formJurisdictions, setFormJurisdictions] = useState([]);
  const [availableJurisdictions, setAvailableJurisdictions] = useState([]);
  const [jurisdictionsLoading, setJurisdictionsLoading] = useState(false);
  const [moduleState, setModuleState] = useState(buildInitialModuleState);
  const [layerState, setLayerState] = useState(buildInitialLayerState);

  // Grupos de capas: sólo el primero abierto por defecto para no saturar
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(LAYER_GROUPS.map((g, i) => [g, i === 0]))
  );

  useEffect(() => {
    loadRoles();
  }, [location.search, update]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rolesService.getAll({
        search: params.search || '',
        page:   parseInt(params.page) || 1,
        limit:  parseInt(params.limit) || 20,
      });
      setRoles(response.data);
      setCount(response.count);
    } catch (err) {
      setError(err.message);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => setUpdate(p => !p);

  const loadJurisdictions = async () => {
    try {
      setJurisdictionsLoading(true);
      const data = await pnpIncidenceService.getJurisdictions();
      setAvailableJurisdictions(Array.isArray(data) ? data : []);
    } catch {
      setAvailableJurisdictions([]);
    } finally {
      setJurisdictionsLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedRole(null);
    setFormName('');
    setFormDescription('');
    setFormJurisdictions([]);
    setModuleState(buildInitialModuleState());
    setLayerState(buildInitialLayerState());
    loadJurisdictions();
    setShowModal(true);
  };

  const openEditModal = async (rol) => {
    try {
      setLoading(true);
      setError(null);
      const full = await rolesService.getById(rol.id);
      setModalMode('edit');
      setSelectedRole(full);
      setFormName(full.name || '');
      setFormDescription(full.description || '');
      setFormJurisdictions(full.allowed_jurisdictions || []);
      setModuleState(apiToModuleState(full.module_permissions));
      setLayerState(apiToLayerState(full.layer_permissions));
      loadJurisdictions();
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { setError('El nombre del rol es obligatorio'); return; }

    try {
      setLoading(true);
      setError(null);
      const payload = {
        name:                  formName.trim(),
        description:           formDescription.trim() || undefined,
        allowed_jurisdictions: formJurisdictions,
        modules:               moduleStateToApi(moduleState, layerState),
        layers:                layerStateToApi(layerState),
      };

      if (modalMode === 'create') {
        await rolesService.create(payload);
        setSuccess('Rol creado exitosamente');
      } else {
        await rolesService.update(selectedRole.id, payload);
        setSuccess('Rol actualizado exitosamente');
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

  const handleSeedDefaults = async () => {
    if (!window.confirm('¿Crear los roles base del sistema (Administrador, Supervisor, CODISEC, Operador, Visualizador, PNP) y asignarlos automáticamente a todos los usuarios que aún no tengan un rol personalizado?')) return;
    try {
      setSeedLoading(true);
      setError(null);
      const res = await rolesService.seedDefaults();
      const data = res.data || res;
      setSuccess(`Migración completada: ${data.created ?? 0} roles creados, ${data.migrated ?? 0} usuarios actualizados`);
      refreshData();
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleDelete = async (rol) => {
    if (!window.confirm(`¿Eliminar el rol "${rol.name}"?`)) return;
    try {
      setLoading(true);
      await rolesService.delete(rol.id);
      setSuccess('Rol eliminado');
      refreshData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers de permisos ──────────────────────────────────────────────────

  const toggleModule = (key) => {
    setModuleState(prev => {
      const current = prev[key];
      const enabled = !current.enabled;
      return {
        ...prev,
        [key]: {
          enabled,
          can_create: enabled ? current.can_create : false,
          can_edit:   enabled ? current.can_edit   : false,
          can_delete: enabled ? current.can_delete : false,
          visible_fields: current.visible_fields ?? [],
        },
      };
    });
  };

  const toggleModulePerm = (key, perm) => {
    setModuleState(prev => ({
      ...prev,
      [key]: { ...prev[key], [perm]: !prev[key][perm] },
    }));
  };

  const toggleVisibleField = (moduleKey, fieldKey) => {
    setModuleState(prev => {
      const current = prev[moduleKey].visible_fields ?? [];
      const next = current.includes(fieldKey)
        ? current.filter(f => f !== fieldKey)
        : [...current, fieldKey];
      return { ...prev, [moduleKey]: { ...prev[moduleKey], visible_fields: next } };
    });
  };

  const toggleLayer = (key) => {
    setLayerState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGroup = (group) =>
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const selectAllInGroup = (group, value) => {
    const keys = AVAILABLE_LAYERS.filter(l => l.group === group).map(l => l.key);
    setLayerState(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = value; });
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="gestion-container">
      {/* Header */}
      <div className="gestion-header roles-header">
        <div className="gestion-header-content">
          <div className="gestion-header-icon roles-icon">
            <Shield size={24} />
          </div>
          <div className="gestion-header-text">
            <h1>Gestión de Roles</h1>
            <p>Define roles personalizados con permisos de módulos y capas</p>
          </div>
        </div>
        <div className="gestion-header-actions">
          <button onClick={refreshData} className="btn-secondary">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>

          <button onClick={openCreateModal} className="btn-primary roles-btn-primary">
            <Plus size={18} />
            <span>Nuevo Rol</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && !showModal && (
        <div className="alert alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="alert-close"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <Save size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="alert-close"><X size={16} /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="gestion-filters">
        <SearchInput
          placeholder="Buscar por nombre o descripción..."
          onSearch={(term) => term ? addParams({ search: term, page: '1' }) : (removeParams(['search']), addParams({ page: '1' }))}
          defaultValue={params.search || ''}
        />
      </div>

      {/* Contenido */}
      <div className="gestion-content">
        {loading && roles.length === 0 ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando roles...</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="empty-state">
            <Shield size={48} />
            <h3>No hay roles personalizados</h3>
            <p>Crea el primer rol con permisos específicos</p>
            <button onClick={openCreateModal} className="btn-primary roles-btn-primary">
              <Plus size={18} /><span>Crear Rol</span>
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table roles-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'center' }}><Settings size={13} style={{ verticalAlign: 'middle' }} /> Módulos</th>
                    <th style={{ textAlign: 'center' }}><Layers size={13} style={{ verticalAlign: 'middle' }} /> Capas</th>
                    <th style={{ textAlign: 'center' }}><Users size={13} style={{ verticalAlign: 'middle' }} /> Usuarios</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(rol => (
                    <tr key={rol.id}>
                      <td>
                        <div className="role-name-cell">
                          <div className="role-icon-badge">
                            <Shield size={14} />
                          </div>
                          <span className="username">{rol.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="role-description">{rol.description || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="count-badge modules-badge">
                          {rol.module_permissions?.length ?? rol._count?.module_permissions ?? 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="count-badge layers-badge">
                          {rol.layer_permissions?.length ?? rol._count?.layer_permissions ?? 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="count-badge users-badge">
                          {rol._count?.users ?? 0}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => openEditModal(rol)} className="btn-icon btn-edit" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(rol)} className="btn-icon btn-delete" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={parseInt(params.page) || 1}
              totalItems={count}
              itemsPerPage={parseInt(params.limit) || 20}
              onPageChange={(page) => addParams({ page: page.toString() })}
              onLimitChange={(limit) => addParams({ limit: limit.toString(), page: '1' })}
            />
          </>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content roles-modal-content">
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? <><Plus size={22} /><span>Crear Rol</span></> : <><Edit2 size={22} /><span>Editar Rol</span></>}
              </h2>
              <button onClick={closeModal} className="btn-icon"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="roles-form-wrapper">
              {/* Área scrollable */}
              <div className="modal-body">
                {error && (
                  <div className="alert alert-error" style={{ marginBottom: 16 }}>
                    <X size={18} /><span>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="alert-close"><X size={16} /></button>
                  </div>
                )}

                {/* Datos básicos */}
                <div className="roles-section">
                  <div className="roles-section-title">Información del Rol</div>
                  <div className="form-group">
                    <label><Shield size={15} /><span>Nombre *</span></label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Ej: Supervisor Cámaras"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label><span>Descripción</span></label>
                    <textarea
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Descripción opcional del rol..."
                      rows={2}
                    />
                  </div>
                  <div className="jurisdiction-section">
                    <div className="jurisdiction-header">
                      <div className="jurisdiction-header-left">
                        <span className="jurisdiction-title">Filtro de Jurisdicciones PNP</span>
                        <span className="jurisdiction-badge">
                          {formJurisdictions.length === 0
                            ? 'Acceso a todas'
                            : `${formJurisdictions.length} / ${availableJurisdictions.length}`}
                        </span>
                      </div>
                      {!jurisdictionsLoading && availableJurisdictions.length > 0 && (
                        <div className="jurisdiction-actions">
                          <button type="button" className="jur-action-btn jur-action-all"
                            onClick={() => setFormJurisdictions([...availableJurisdictions])}>
                            Todas
                          </button>
                          <button type="button" className="jur-action-btn jur-action-none"
                            onClick={() => setFormJurisdictions([])}>
                            Ninguna
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="jurisdiction-body">
                      {jurisdictionsLoading ? (
                        <div className="jurisdiction-loading">
                          <RefreshCw size={14} className="spinning" />
                          <span>Cargando jurisdicciones...</span>
                        </div>
                      ) : availableJurisdictions.length === 0 ? (
                        <div className="jurisdiction-empty">No hay jurisdicciones registradas aún.</div>
                      ) : (
                        <div className="jurisdiction-grid">
                          {availableJurisdictions.map(j => {
                            const checked = formJurisdictions.includes(j);
                            return (
                              <label key={j} className={`jurisdiction-item${checked ? ' checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  className="perm-checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setFormJurisdictions(prev =>
                                      prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]
                                    )
                                  }
                                />
                                <span className="jurisdiction-item-label">{j}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permisos de módulos */}
                <div className="roles-section">
                  <div className="roles-section-title">
                    <Settings size={15} />
                    Módulos del Panel
                    <span className="roles-section-count">
                      {AVAILABLE_MODULES.filter(m => moduleState[m.key]?.enabled).length} / {AVAILABLE_MODULES.length}
                    </span>
                  </div>
                  <div className="modules-table">
                    <div className="modules-table-header">
                      <span>Módulo</span>
                      <span>Acceso</span>
                      <span>Crear</span>
                      <span>Editar</span>
                      <span>Eliminar</span>
                    </div>
                    {AVAILABLE_MODULES.map(mod => {
                      const s = moduleState[mod.key];
                      const cameraFields = MODULE_VISIBLE_FIELDS[mod.key];
                      return (
                        <div key={mod.key} className={`modules-table-row-wrapper${s.enabled ? ' enabled' : ''}${cameraFields ? ' has-camera-fields' : ''}`}>
                          <div className="modules-table-row">
                            <span className="module-label">
                              {mod.label}
                              {cameraFields && (
                                <span className="camera-fields-badge" title="Este módulo tiene configuración de campos visibles">
                                  <Camera size={11} /> campos
                                </span>
                              )}
                            </span>
                            <label className="perm-cell">
                              <input type="checkbox" checked={s.enabled} onChange={() => toggleModule(mod.key)} className="perm-checkbox" />
                            </label>
                            <label className="perm-cell" style={!s.enabled ? { pointerEvents: 'none', opacity: 0.35 } : {}}>
                              <input type="checkbox" checked={s.can_create} onChange={() => toggleModulePerm(mod.key, 'can_create')} disabled={!s.enabled} className="perm-checkbox" />
                            </label>
                            <label className="perm-cell" style={!s.enabled ? { pointerEvents: 'none', opacity: 0.35 } : {}}>
                              <input type="checkbox" checked={s.can_edit} onChange={() => toggleModulePerm(mod.key, 'can_edit')} disabled={!s.enabled} className="perm-checkbox" />
                            </label>
                            <label className="perm-cell" style={!s.enabled ? { pointerEvents: 'none', opacity: 0.35 } : {}}>
                              <input type="checkbox" checked={s.can_delete} onChange={() => toggleModulePerm(mod.key, 'can_delete')} disabled={!s.enabled} className="perm-checkbox" />
                            </label>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Permisos de capas */}
                <div className="roles-section" style={{ marginBottom: 0 }}>
                  <div className="roles-section-title">
                    <Layers size={15} />
                    Capas del Mapa
                    <span className="roles-section-count">
                      {AVAILABLE_LAYERS.filter(l => layerState[l.key]).length} / {AVAILABLE_LAYERS.length}
                    </span>
                  </div>
                  {LAYER_GROUPS.map(group => {
                    const groupLayers = AVAILABLE_LAYERS.filter(l => l.group === group);
                    const selectedCount = groupLayers.filter(l => layerState[l.key]).length;
                    const isExpanded = expandedGroups[group];

                    return (
                      <div key={group} className="layer-group">
                        <div className="layer-group-header" onClick={() => toggleGroup(group)}>
                          <div className="layer-group-left">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="layer-group-name">{group}</span>
                            <span className="layer-group-count">{selectedCount}/{groupLayers.length}</span>
                          </div>
                          <div className="layer-group-actions" onClick={e => e.stopPropagation()}>
                            <button type="button" className="layer-select-btn" onClick={() => selectAllInGroup(group, true)}>Todo</button>
                            <button type="button" className="layer-select-btn" onClick={() => selectAllInGroup(group, false)}>Ninguno</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <>
                            <div className="layer-group-items">
                              {groupLayers.map(layer => (
                                <label key={layer.key} className={`layer-item${layerState[layer.key] ? ' checked' : ''}${LAYER_CAMERA_CONFIG[layer.key] ? ' camera-layer' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={layerState[layer.key]}
                                    onChange={() => toggleLayer(layer.key)}
                                    className="perm-checkbox"
                                  />
                                  <span>{layer.label}</span>
                                  {LAYER_CAMERA_CONFIG[layer.key] && <Camera size={12} className="layer-camera-icon" />}
                                </label>
                              ))}
                            </div>

                            {/* Panel de campos visibles para capas de cámara activas */}
                            {groupLayers
                              .filter(layer => LAYER_CAMERA_CONFIG[layer.key] && layerState[layer.key])
                              .map(layer => {
                                const config = LAYER_CAMERA_CONFIG[layer.key];
                                const moduleEnabled = moduleState[config.moduleKey]?.enabled ?? false;
                                const selectedFields = moduleState[config.moduleKey]?.visible_fields ?? [];
                                return (
                                  <div key={layer.key} className="layer-camera-fields-panel">
                                    <div className="layer-camera-fields-title">
                                      <Camera size={13} />
                                      <span style={{ flex: 1 }}>{config.label} — Datos Visibles</span>
                                      <span className="module-fields-count">
                                        {selectedFields.length === 0 ? 'Todo' : `${selectedFields.length}/${config.fields.length}`}
                                      </span>
                                    </div>
                                    <div className="module-fields-list">
                                      {config.fields.map(field => (
                                        <label
                                          key={field.key}
                                          className={`field-item${selectedFields.includes(field.key) ? ' checked' : ''}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedFields.includes(field.key)}
                                            onChange={() => toggleVisibleField(config.moduleKey, field.key)}
                                            className="perm-checkbox"
                                            style={{ width: 13, height: 13 }}
                                          />
                                          {field.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="module-fields-hint">
                                      Sin selección = sin restricción (el rol verá todos los campos)
                                    </div>
                                  </div>
                                );
                              })
                            }
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer siempre visible */}
              <div className="roles-modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary roles-btn-primary" disabled={loading}>
                  {loading
                    ? <><RefreshCw size={16} className="spinning" /><span>Guardando...</span></>
                    : <><Save size={16} /><span>{modalMode === 'create' ? 'Crear Rol' : 'Guardar Cambios'}</span></>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionRoles;
