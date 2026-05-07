import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, RefreshCw, User, Mail, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usuariosService from '../../services/usuariosService';
import rolesService from '../../services/rolesService';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';
import './GestionUsuarios.css';

const EMPTY_FORM = {
  name: '',
  lastname: '',
  username: '',
  email: '',
  dni: '',
  phone: '',
  password: '',
  custom_role_id: '',
};

const GestionUsuarios = () => {
  const location = useLocation();
  const { addParams, getParams, removeParams } = UseUrlParamsManager();
  const params = getParams();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [count, setCount] = useState(0);
  const [update, setUpdate] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [customRoles, setCustomRoles] = useState([]);

  const { isSuperAdmin, hasModuleAccess } = useAuth();
  const isAdmin = isSuperAdmin || hasModuleAccess('usuarios');

  // Cargar roles personalizados una sola vez
  useEffect(() => {
    if (isAdmin) {
      rolesService.getAll({ limit: 100 })
        .then(res => setCustomRoles(res.data || []))
        .catch(() => setCustomRoles([]));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsuarios();
  }, [location.search, update]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {
        search: params.search || '',
        custom_role_id: params.custom_role_id || '',
        page:  parseInt(params.page)  || 1,
        limit: parseInt(params.limit) || 20,
      };
      const response = await usuariosService.getAll(filters);
      setUsuarios(Array.isArray(response.data) ? response.data : []);
      setCount(response.count || response.data?.length || 0);
    } catch (err) {
      setError(err.message);
      setUsuarios([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => setUpdate(prev => !prev);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(EMPTY_FORM);
    setSelectedUser(null);
    setShowModal(true);
    setShowPassword(false);
  };

  const openEditModal = async (usuario) => {
    try {
      setLoading(true);
      setError(null);
      setModalMode('edit');
      setSelectedUser(usuario);
      const response = await usuariosService.getById(usuario.id);
      const fullData = response.data || response;
      const editData = {
        name:           fullData.name || '',
        lastname:       fullData.lastname || '',
        username:       fullData.username || '',
        email:          fullData.email || '',
        dni:            fullData.dni || '',
        phone:          fullData.phone || '',
        password:       '',
        custom_role_id: fullData.custom_role_id || '',
      };
      setFormData(editData);
      setOriginalData({ ...editData });
      setShowModal(true);
      setShowPassword(false);
    } catch (err) {
      setError(err.message || 'Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setOriginalData(null);
    setFormData(EMPTY_FORM);
    setShowPassword(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim())     return 'El nombre es obligatorio';
    if (!formData.lastname.trim()) return 'El apellido es obligatorio';
    if (!formData.username.trim()) return 'El usuario es obligatorio';
    if (!formData.email.trim())    return 'El email es obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'El email no tiene un formato válido';
    if (!formData.dni.trim())      return 'El DNI es obligatorio';
    if (!/^\d{8}$/.test(formData.dni))   return 'El DNI debe tener exactamente 8 dígitos numéricos';
    if (!formData.phone.trim())    return 'El teléfono es obligatorio';
    if (!/^\d{9}$/.test(formData.phone)) return 'El teléfono debe tener exactamente 9 dígitos numéricos';
    if (!formData.custom_role_id)  return 'Debes seleccionar un rol';
    if (modalMode === 'create' && !formData.password.trim()) return 'La contraseña es obligatoria';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    try {
      setLoading(true);
      setError(null);

      if (modalMode === 'create') {
        await usuariosService.create({ ...formData });
        setSuccess('Usuario creado exitosamente');
      } else {
        const changedFields = {};
        const fields = ['name','lastname','email','dni','phone','custom_role_id'];
        for (const f of fields) {
          if (formData[f] !== originalData[f]) changedFields[f] = formData[f];
        }
        if (formData.password?.trim()) changedFields.password = formData.password;

        if (Object.keys(changedFields).length === 0) {
          setError('No se han realizado cambios');
          setLoading(false);
          return;
        }
        await usuariosService.update(selectedUser.id, changedFields);
        setSuccess('Usuario actualizado exitosamente');
      }

      closeModal();
      refreshData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${usuario.username}"?`)) return;
    try {
      setLoading(true);
      setError(null);
      await usuariosService.delete(usuario.id);
      setSuccess('Usuario eliminado exitosamente');
      refreshData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al eliminar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    if (searchTerm) addParams({ search: searchTerm, page: '1' });
    else { removeParams(['search']); addParams({ page: '1' }); }
  };

  const handleRoleFilter = (custom_role_id) => {
    if (custom_role_id) addParams({ custom_role_id, page: '1' });
    else { removeParams(['custom_role_id']); addParams({ page: '1' }); }
  };

  // Helpers de display: usa el nombre del rol custom si está disponible
  const getRoleName = (usuario) =>
    usuario.custom_role?.name || usuario.rol || '—';

  const getRoleColor = (usuario) => {
    const slug = usuario.custom_role?.system_slug || usuario.rol;
    const map = {
      SUPERADMIN:    '#dc2626',
      ADMINISTRATOR: '#ef4444',
      SUPERVISOR:    '#f59e0b',
      CODISEC:       '#8b5cf6',
      OPERATOR:      '#3b82f6',
      VIEWER:        '#10b981',
      PNP:           '#0ea5e9',
    };
    return map[slug] || '#6b7280';
  };

  if (!isAdmin) {
    return (
      <div className="gestion-container">
        <div className="access-denied">
          <Shield size={48} />
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-container">
      <div className="gestion-header">
        <div className="gestion-header-content">
          <div className="gestion-header-icon"><User size={24} /></div>
          <div className="gestion-header-text">
            <h1>Gestión de Usuarios</h1>
            <p>Administra los usuarios del sistema</p>
          </div>
        </div>
        <div className="gestion-header-actions">
          <button onClick={refreshData} className="btn-secondary">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={18} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

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

      <div className="gestion-filters">
        <SearchInput
          placeholder="Buscar por nombre, usuario o email..."
          onSearch={handleSearch}
          defaultValue={params.search || ''}
        />
        <select
          className="filter-select"
          value={params.custom_role_id || ''}
          onChange={(e) => handleRoleFilter(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {customRoles.map(cr => (
            <option key={cr.id} value={cr.id}>{cr.name}</option>
          ))}
        </select>
      </div>

      <div className="gestion-content">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Cargando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <h3>No hay usuarios registrados</h3>
            <p>Comienza creando un nuevo usuario</p>
            <button onClick={openCreateModal} className="btn-primary">
              <Plus size={18} /><span>Crear Usuario</span>
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>
                        <div className="user-cell">
                          <div
                            className="user-avatar-small"
                            style={{ background: getRoleColor(usuario) }}
                          >
                            {usuario.username?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="username">{usuario.username}</span>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              {usuario.name} {usuario.lastname}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="email-cell">
                          <Mail size={14} />
                          <span>{usuario.email}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="role-badge"
                          style={{
                            background: `${getRoleColor(usuario)}15`,
                            color: getRoleColor(usuario),
                            border: `1px solid ${getRoleColor(usuario)}40`,
                          }}
                        >
                          {getRoleName(usuario)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => openEditModal(usuario)} className="btn-icon btn-edit" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(usuario)} className="btn-icon btn-delete" title="Eliminar">
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {modalMode === 'create'
                  ? <><Plus size={24} /><span>Crear Usuario</span></>
                  : <><Edit2 size={24} /><span>Editar Usuario</span></>
                }
              </h2>
              <button onClick={closeModal} className="btn-icon"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <X size={18} />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="alert-close"><X size={16} /></button>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="name"><User size={16} /><span>Nombre *</span></label>
                <input type="text" id="name" name="name" value={formData.name}
                  onChange={handleInputChange} placeholder="Ej: Juan" required />
              </div>

              <div className="form-group">
                <label htmlFor="lastname"><User size={16} /><span>Apellido *</span></label>
                <input type="text" id="lastname" name="lastname" value={formData.lastname}
                  onChange={handleInputChange} placeholder="Ej: Pérez" required />
              </div>

              <div className="form-group">
                <label htmlFor="username"><User size={16} /><span>Nombre de Usuario *</span></label>
                <input type="text" id="username" name="username" value={formData.username}
                  onChange={handleInputChange} placeholder="Ej: jperez" required
                  disabled={modalMode === 'edit'} className={modalMode === 'edit' ? 'disabled' : ''} />
                {modalMode === 'edit' && (
                  <small className="form-hint">El nombre de usuario no se puede modificar</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email"><Mail size={16} /><span>Correo Electrónico *</span></label>
                <input type="email" id="email" name="email" value={formData.email}
                  onChange={handleInputChange} placeholder="usuario@ejemplo.com" required />
              </div>

              <div className="form-group">
                <label htmlFor="dni"><User size={16} /><span>DNI *</span></label>
                <input type="text" id="dni" name="dni" value={formData.dni}
                  onChange={handleInputChange} placeholder="Ej: 12345678" required maxLength="8" />
              </div>

              <div className="form-group">
                <label htmlFor="phone"><Phone size={16} /><span>Teléfono *</span></label>
                <input type="tel" id="phone" name="phone" value={formData.phone}
                  onChange={handleInputChange} placeholder="Ej: 999999999" required maxLength="9" />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Shield size={16} />
                  <span>Contraseña {modalMode === 'edit' && '(Dejar vacío para no cambiar)'}</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password" name="password" value={formData.password}
                    onChange={handleInputChange}
                    placeholder={modalMode === 'create' ? 'Ingrese la contraseña' : 'Nueva contraseña (opcional)'}
                    required={modalMode === 'create'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="custom_role_id"><Shield size={16} /><span>Rol *</span></label>
                <select
                  id="custom_role_id"
                  name="custom_role_id"
                  value={formData.custom_role_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {customRoles.map(cr => (
                    <option key={cr.id} value={cr.id}>{cr.name}</option>
                  ))}
                </select>
                {customRoles.length === 0 && (
                  <small className="form-hint" style={{ color: '#ef4444' }}>
                    No hay roles disponibles. Crea roles en la sección Roles primero.
                  </small>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading
                    ? <><RefreshCw size={18} className="spinning" /><span>Guardando...</span></>
                    : <><Save size={18} /><span>{modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}</span></>
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

export default GestionUsuarios;
