import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, RefreshCw, Filter, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import auditService from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import './GestionAuditoria.css';

const ACTION_LABELS = {
  CREATE:  { label: 'Creación',    color: '#10b981' },
  UPDATE:  { label: 'Edición',     color: '#f59e0b' },
  DELETE:  { label: 'Eliminación', color: '#ef4444' },
  RESTORE: { label: 'Restauración',color: '#6366f1' },
};

const ENTITY_LABELS = {
  User:         'Usuario',
  Activity:     'Actividad',
  Communal:     'Cámara Vecinal',
  Municipal:    'Cámara Municipal',
  PnpIncidence: 'Incidencia PNP',
};

const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatChanges = changes => {
  if (!changes) return '-';
  const entries = Object.entries(changes).filter(([k]) => k !== 'target_username' && k !== 'target_rol');
  if (entries.length === 0) return '-';
  return entries.map(([key, val]) => {
    if (val && typeof val === 'object' && 'from' in val) {
      return `${key}: "${val.from}" → "${val.to}"`;
    }
    return `${key}: ${JSON.stringify(val)}`;
  }).join(' | ');
};

const GestionAuditoria = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const limit = 20;

  const { hasModuleAccess } = useAuth();
  const hasAccess = hasModuleAccess('auditoria');

  useEffect(() => {
    if (hasAccess) loadLogs();
  }, [page, filterAction, filterEntity]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await auditService.getAll({
        action: filterAction || undefined,
        entity: filterEntity || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setLogs(res.data ?? []);
      setCount(res.count ?? 0);
    } catch (err) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const clearFilters = () => {
    setSearch('');
    setFilterAction('');
    setFilterEntity('');
    setPage(1);
  };

  const totalPages = Math.ceil(count / limit);

  if (!hasAccess) {
    return (
      <div className="auditoria-container">
        <div className="auditoria-alert auditoria-alert-error">
          <X size={18} />
          <span>No tienes permisos para acceder a este módulo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="auditoria-container">
      {/* Header */}
      <div className="auditoria-header">
        <div className="auditoria-header-content">
          <div className="auditoria-header-icon"><ClipboardList size={24} /></div>
          <div className="auditoria-header-text">
            <h1>Auditoría del Sistema</h1>
            <p>Registro de cambios de edición y eliminación — {count} registros</p>
          </div>
        </div>
        <div className="auditoria-header-actions">
          <button onClick={loadLogs} className="btn-auditoria-secondary">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="auditoria-alert auditoria-alert-error">
          <X size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="auditoria-toolbar">
        <form onSubmit={handleSearch} className="auditoria-search-form">
          <div className="auditoria-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-auditoria-search">Buscar</button>
        </form>

        <div className="auditoria-filters">
          <Filter size={16} />
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
            <option value="">Todas las acciones</option>
            <option value="CREATE">Creación</option>
            <option value="UPDATE">Edición</option>
            <option value="DELETE">Eliminación</option>
            <option value="RESTORE">Restauración</option>
          </select>

          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }}>
            <option value="">Todas las entidades</option>
            <option value="User">Usuario</option>
            <option value="Activity">Actividad</option>
            <option value="Communal">Cámara Vecinal</option>
            <option value="Municipal">Cámara Municipal</option>
            <option value="PnpIncidence">Incidencia PNP</option>
          </select>

          {(filterAction || filterEntity || search) && (
            <button onClick={clearFilters} className="btn-auditoria-clear">
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        <span className="auditoria-count">
          Total: <strong>{count}</strong>
        </span>
      </div>

      {/* Tabla */}
      <div className="auditoria-content">
        {loading ? (
          <div className="auditoria-loading">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando registros...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="auditoria-empty">
            <ClipboardList size={48} />
            <h3>No hay registros de auditoría</h3>
            <p>Los cambios realizados en el sistema aparecerán aquí</p>
          </div>
        ) : (
          <>
            <div className="auditoria-table-wrapper">
              <table className="auditoria-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha y Hora</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Afectado</th>
                    <th>Realizado por</th>
                    <th>Cambios</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280' };
                    const entityLabel = ENTITY_LABELS[log.entity] || log.entity;
                    const targetName = log.changes?.target_username || log.entity_id;
                    const globalIdx = (page - 1) * limit + idx + 1;

                    return (
                      <tr key={log.id}>
                        <td>{globalIdx}</td>
                        <td className="auditoria-date">{formatDate(log.created_at)}</td>
                        <td>
                          <span
                            className="auditoria-badge"
                            style={{ backgroundColor: actionInfo.color + '22', color: actionInfo.color, borderColor: actionInfo.color + '44' }}
                          >
                            {actionInfo.label}
                          </span>
                        </td>
                        <td>{entityLabel}</td>
                        <td className="auditoria-target">{targetName}</td>
                        <td className="auditoria-performer">{log.performed_by || '-'}</td>
                        <td className="auditoria-changes">{formatChanges(log.changes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="auditoria-pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-auditoria-page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-auditoria-page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GestionAuditoria;
