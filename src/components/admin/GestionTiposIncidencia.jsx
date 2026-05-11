import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';
import incidenceTypeService from '../../services/incidenceTypeService';
import { useAuth } from '../../context/AuthContext';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionCatalogoPNP.css';

const EMPTY_FORM = { name: '' };

const GestionTiposIncidencia = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [count, setCount]       = useState(0);
  const [refresh, setRefresh]   = useState(false);

  const [showModal, setShowModal]     = useState(false);
  const [modalMode, setModalMode]     = useState('create');
  const [selected, setSelected]       = useState(null);
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);

  const { hasModuleAccess, hasModuleOp } = useAuth();
  const hasAccess = hasModuleAccess('tipos-incidencia');
  const canWrite  = hasModuleOp('tipos-incidencia', 'create');
  const canEdit   = hasModuleOp('tipos-incidencia', 'edit');
  const canDelete = hasModuleOp('tipos-incidencia', 'delete');

  useEffect(() => { if (hasAccess) loadData(); }, [location.search, refresh]);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await incidenceTypeService.getAll({
        search: params.search || '',
        page:   parseInt(params.page)  || 1,
        limit:  parseInt(params.limit) || 20,
      });
      setItems(Array.isArray(res.data) ? res.data : []);
      setCount(res.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  };

  const openCreate = () => {
    setModalMode('create'); setFormData(EMPTY_FORM); setSelected(null); setShowModal(true);
  };

  const openEdit = item => {
    setModalMode('edit'); setSelected(item); setFormData({ name: item.name }); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormData(EMPTY_FORM); setSelected(null); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) return showMsg('El nombre es requerido', true);
    try {
      setSaving(true);
      if (modalMode === 'create') {
        await incidenceTypeService.create({ name: formData.name.trim() });
        showMsg('Tipo creado correctamente');
      } else {
        await incidenceTypeService.update(selected.id, { name: formData.name.trim() });
        showMsg('Tipo actualizado correctamente');
      }
      closeModal();
      setRefresh(p => !p);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await incidenceTypeService.delete(deleteTarget.id);
      showMsg('Tipo eliminado correctamente');
      setDeleteTarget(null);
      setRefresh(p => !p);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  if (!hasAccess) return (
    <div className="catalogo-container">
      <p style={{ color: '#6b7280', padding: 40 }}>No tienes permisos para acceder a este módulo.</p>
    </div>
  );

  return (
    <div className="catalogo-container">
      {/* Header */}
      <div className="catalogo-header">
        <div className="catalogo-header-left">
          <div className="catalogo-header-icon"><Tag size={20} /></div>
          <div className="catalogo-header-text">
            <h1>Tipos de Incidencia</h1>
            <p>{count} tipo{count !== 1 ? 's' : ''} registrado{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canWrite && (
          <button className="btn-catalogo-primary" onClick={openCreate}>
            <Plus size={15} /> Nuevo Tipo
          </button>
        )}
      </div>

      {/* Alertas */}
      {success && <div className="catalogo-alert success">{success}</div>}
      {error   && <div className="catalogo-alert error">{error}</div>}

      {/* Toolbar */}
      <div className="catalogo-toolbar">
        <SearchInput placeholder="Buscar tipo..." />
      </div>

      {/* Tabla */}
      <div className="catalogo-table-wrap">
        <table className="catalogo-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Creado</th>
              {(canEdit || canDelete) && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4}><div className="catalogo-empty"><p>No hay tipos registrados</p></div></td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ color: '#94a3b8', fontSize: 12 }}>{((parseInt(params.page) || 1) - 1) * (parseInt(params.limit) || 20) + idx + 1}</td>
                <td><span className="catalogo-badge"><Tag size={11} />{item.name}</span></td>
                <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('es-PE')}</td>
                {(canEdit || canDelete) && (
                  <td>
                    <div className="catalogo-actions">
                      {canEdit   && <button className="btn-catalogo-icon edit"   onClick={() => openEdit(item)}        title="Editar"><Edit2 size={13} /></button>}
                      {canDelete && <button className="btn-catalogo-icon delete" onClick={() => setDeleteTarget(item)} title="Eliminar"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="catalogo-pagination">
        <TablePagination
          currentPage={parseInt(params.page) || 1}
          totalItems={count}
          itemsPerPage={parseInt(params.limit) || 20}
          onPageChange={page => addParams({ page })}
          onLimitChange={limit => addParams({ limit, page: 1 })}
        />
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="catalogo-modal-overlay">
          <div className="catalogo-modal">
            <div className="catalogo-modal-header">
              <h2>{modalMode === 'create' ? 'Nuevo Tipo' : 'Editar Tipo'}</h2>
              <button className="catalogo-modal-close" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="catalogo-modal-body">
                <div className="catalogo-form-group">
                  <label>Nombre del tipo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ name: e.target.value })}
                    placeholder="Ej: Robo, Violencia, Homicidio..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="catalogo-modal-footer">
                <button type="button" className="btn-catalogo-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-catalogo-save" disabled={saving}>
                  <Save size={14} />{saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {deleteTarget && (
        <div className="catalogo-confirm-overlay">
          <div className="catalogo-confirm-modal">
            <div className="catalogo-confirm-header">
              <Trash2 size={18} />
              <h2>Eliminar Tipo</h2>
            </div>
            <div className="catalogo-confirm-body">
              ¿Estás seguro que deseas eliminar el tipo <strong>"{deleteTarget.name}"</strong>?
              Esto también afectará a los subtipos y modalidades asociadas.
            </div>
            <div className="catalogo-confirm-footer">
              <button className="btn-catalogo-cancel" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-catalogo-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionTiposIncidencia;
