import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Layers } from 'lucide-react';
import incidenceSubtypeService from '../../services/incidenceSubtypeService';
import incidenceTypeService    from '../../services/incidenceTypeService';
import { useAuth } from '../../context/AuthContext';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionCatalogoPNP.css';

const EMPTY_FORM = { name: '', type_id: '' };

const GestionSubtiposIncidencia = () => {
  const location = useLocation();
  const { addParams, getParams } = UseUrlParamsManager();
  const params = getParams();

  const [items, setItems]         = useState([]);
  const [tipos, setTipos]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [count, setCount]         = useState(0);
  const [refresh, setRefresh]     = useState(false);

  const [showModal, setShowModal]       = useState(false);
  const [modalMode, setModalMode]       = useState('create');
  const [selected, setSelected]         = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]             = useState(false);

  // Filtro por tipo en la tabla
  const [filterTypeId, setFilterTypeId] = useState('');

  const { hasModuleAccess, hasModuleOp } = useAuth();
  const hasAccess = hasModuleAccess('subtipos-incidencia');
  const canWrite  = hasModuleOp('subtipos-incidencia', 'create');
  const canEdit   = hasModuleOp('subtipos-incidencia', 'edit');
  const canDelete = hasModuleOp('subtipos-incidencia', 'delete');

  useEffect(() => { loadTipos(); }, []);
  useEffect(() => { if (hasAccess) loadData(); }, [location.search, refresh, filterTypeId]);

  const loadTipos = async () => {
    try {
      const res = await incidenceTypeService.getAll({ limit: 200 });
      setTipos(Array.isArray(res.data) ? res.data : []);
    } catch { /* silencioso */ }
  };

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await incidenceSubtypeService.getAll({
        search:  params.search || '',
        type_id: filterTypeId || undefined,
        page:    parseInt(params.page)  || 1,
        limit:   parseInt(params.limit) || 20,
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
    setModalMode('edit');
    setSelected(item);
    setFormData({ name: item.name, type_id: item.type_id || item.type?.id || '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormData(EMPTY_FORM); setSelected(null); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) return showMsg('El nombre es requerido', true);
    if (!formData.type_id)     return showMsg('Selecciona el tipo de incidencia', true);
    try {
      setSaving(true);
      const payload = { name: formData.name.trim(), type_id: formData.type_id };
      if (modalMode === 'create') {
        await incidenceSubtypeService.create(payload);
        showMsg('Subtipo creado correctamente');
      } else {
        await incidenceSubtypeService.update(selected.id, payload);
        showMsg('Subtipo actualizado correctamente');
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
      await incidenceSubtypeService.delete(deleteTarget.id);
      showMsg('Subtipo eliminado correctamente');
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
      <div className="catalogo-header">
        <div className="catalogo-header-left">
          <div className="catalogo-header-icon"><Layers size={20} /></div>
          <div className="catalogo-header-text">
            <h1>Subtipos de Incidencia</h1>
            <p>{count} subtipo{count !== 1 ? 's' : ''} registrado{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canWrite && (
          <button className="btn-catalogo-primary" onClick={openCreate}>
            <Plus size={15} /> Nuevo Subtipo
          </button>
        )}
      </div>

      {success && <div className="catalogo-alert success">{success}</div>}
      {error   && <div className="catalogo-alert error">{error}</div>}

      <div className="catalogo-toolbar">
        <SearchInput placeholder="Buscar subtipo..." />
        <select
          value={filterTypeId}
          onChange={e => setFilterTypeId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, color: '#374151' }}
        >
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="catalogo-table-wrap">
        <table className="catalogo-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Creado</th>
              {(canEdit || canDelete) && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5}><div className="catalogo-empty"><p>No hay subtipos registrados</p></div></td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ color: '#94a3b8', fontSize: 12 }}>{((parseInt(params.page) || 1) - 1) * (parseInt(params.limit) || 20) + idx + 1}</td>
                <td><span className="catalogo-badge"><Layers size={11} />{item.name}</span></td>
                <td style={{ color: '#64748b', fontSize: 13 }}>{item.type?.name || '-'}</td>
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

      <div className="catalogo-pagination">
        <TablePagination
          currentPage={parseInt(params.page) || 1}
          totalItems={count}
          itemsPerPage={parseInt(params.limit) || 20}
          onPageChange={page => addParams({ page })}
          onLimitChange={limit => addParams({ limit, page: 1 })}
        />
      </div>

      {showModal && (
        <div className="catalogo-modal-overlay">
          <div className="catalogo-modal">
            <div className="catalogo-modal-header">
              <h2>{modalMode === 'create' ? 'Nuevo Subtipo' : 'Editar Subtipo'}</h2>
              <button className="catalogo-modal-close" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="catalogo-modal-body">
                <div className="catalogo-form-group">
                  <label>Tipo de incidencia *</label>
                  <select value={formData.type_id} onChange={e => setFormData(p => ({ ...p, type_id: e.target.value }))}>
                    <option value="">Seleccionar tipo...</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="catalogo-form-group">
                  <label>Nombre del subtipo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Robo al paso, Robo agravado..."
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

      {deleteTarget && (
        <div className="catalogo-confirm-overlay">
          <div className="catalogo-confirm-modal">
            <div className="catalogo-confirm-header"><Trash2 size={18} /><h2>Eliminar Subtipo</h2></div>
            <div className="catalogo-confirm-body">
              ¿Estás seguro que deseas eliminar el subtipo <strong>"{deleteTarget.name}"</strong>?
              Las modalidades asociadas también se verán afectadas.
            </div>
            <div className="catalogo-confirm-footer">
              <button className="btn-catalogo-cancel" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-catalogo-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionSubtiposIncidencia;
