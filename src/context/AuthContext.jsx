import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';
import rolesService from '../services/rolesService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customRolePerms, setCustomRolePerms] = useState(null);
  const [customRoleLoading, setCustomRoleLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  // Cargar permisos del rol personalizado cuando el usuario está autenticado
  useEffect(() => {
    if (!user) {
      setCustomRolePerms(null);
      setCustomRoleLoading(false);
      return;
    }
    setCustomRoleLoading(true);
    rolesService.getMine()
      .then(data => setCustomRolePerms(data || null))
      .catch(() => setCustomRolePerms(null))
      .finally(() => setCustomRoleLoading(false));
  }, [user?.username]);

  // Ref para acceder a customRolePerms sin reiniciar el intervalo
  const customRolePermsRef = useRef(customRolePerms);
  useEffect(() => { customRolePermsRef.current = customRolePerms; }, [customRolePerms]);

  // Polling: detecta cambios de permisos y recarga la página si el admin modificó el rol
  useEffect(() => {
    if (!user) return;

    const toFingerprint = (perms) => {
      if (!perms) return '';
      const layers = (perms.layer_permissions || []).map(p => p.layer_key).sort().join(',');
      const modules = (perms.module_permissions || []).map(p => `${p.module_key}:${Number(p.can_access)}`).sort().join(',');
      return `${layers}|${modules}`;
    };

    const checkPerms = async () => {
      try {
        const fresh = await rolesService.getMine();
        if (!fresh) return;
        if (toFingerprint(customRolePermsRef.current) !== toFingerprint(fresh)) {
          window.location.reload();
        }
      } catch {
        // Ignorar errores de red temporales
      }
    };

    // Verificar al recuperar el foco de la ventana
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkPerms();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Polling cada 30s — el listener de visibilitychange ya cubre el caso de regreso a la pestaña
    const interval = setInterval(checkPerms, 30_000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.username]);

  const login = useCallback(async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      return { success: true, data };
    } catch (error) {
      console.error('Error en AuthContext login:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const role = user?.role?.toUpperCase() || null;
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMINISTRATOR' || isSuperAdmin;
  const isSupervisor = role === 'SUPERVISOR';
  const isOperator = role === 'OPERATOR';
  const isViewer = role === 'VIEWER';
  const isCodisec = role === 'CODISEC';
  const isPnp = role === 'PNP';
  const hasRole = useCallback((r) => role === r?.toUpperCase(), [role]);
  const hasAnyRole = useCallback((roles) => roles.some(r => r?.toUpperCase() === role), [role]);

  // Verifica si el usuario puede acceder a un módulo.
  const hasModuleAccess = useCallback((moduleKey) => {
    if (role === 'SUPERADMIN') return true;
    if (!customRolePerms) return true;
    const perm = customRolePerms.module_permissions?.find(p => p.module_key === moduleKey);
    if (!perm) return false;
    // can_access controla el acceso al panel; fallback true para datos previos sin este campo
    return perm.can_access ?? true;
  }, [role, customRolePerms]);

  // Verifica si el usuario puede ejecutar una operación dentro de un módulo.
  const hasModuleOp = useCallback((moduleKey, op = 'create') => {
    if (role === 'SUPERADMIN') return true;
    if (!customRolePerms) return true;
    const perm = customRolePerms.module_permissions?.find(p => p.module_key === moduleKey);
    if (!perm) return false;
    if (op === 'create') return perm.can_create ?? false;
    if (op === 'edit')   return perm.can_edit   ?? false;
    if (op === 'delete') return perm.can_delete  ?? false;
    return false;
  }, [role, customRolePerms]);

  // Verifica si el usuario puede ver una capa del mapa.
  const hasLayerAccess = useCallback((layerKey) => {
    if (role === 'SUPERADMIN') return true;
    if (!customRolePerms) return true;
    const perms = customRolePerms.layer_permissions ?? [];
    // Acceso directo por key exacto
    if (perms.some(p => p.layer_key === layerKey)) return true;
    // Compat: si el rol tiene 'robos' (key legacy), concede acceso a todos los subtipos de robo
    const ROBO_SUBTIPO_KEYS = ['roboPersonas','roboCasa','roboGanado','roboEmpresas','roboVehiculos','roboAutopartes','roboPasajeros'];
    const HURTO_SUBTIPO_KEYS = ['hurtoPersonas','hurtoCasa','hurtoGanado','hurtoEmpresas','hurtoVehiculos','hurtoPasajeros'];
    if (ROBO_SUBTIPO_KEYS.includes(layerKey) && perms.some(p => p.layer_key === 'robos')) return true;
    if (HURTO_SUBTIPO_KEYS.includes(layerKey) && perms.some(p => p.layer_key === 'hurtos')) return true;
    if (layerKey === 'danos' && perms.some(p => p.layer_key === 'danos')) return true;
    return false;
  }, [role, customRolePerms]);

  // Devuelve el array de campos visibles para un módulo.
  // null = sin restricción (ver todo), [] = sin restricción (ver todo), ['x','y'] = solo esos campos.
  const getVisibleFields = useCallback((moduleKey) => {
    if (role === 'SUPERADMIN') return null;
    if (!customRolePerms) return null;
    const perm = customRolePerms.module_permissions?.find(p => p.module_key === moduleKey);
    if (!perm) return null;
    return perm.visible_fields ?? null;
  }, [role, customRolePerms]);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading: loading || customRoleLoading,
    role,
    isSuperAdmin,
    isAdmin,
    isSupervisor,
    isOperator,
    isViewer,
    isCodisec,
    isPnp,
    hasRole,
    hasAnyRole,
    hasModuleAccess,
    hasModuleOp,
    hasLayerAccess,
    getVisibleFields,
    customRolePerms,
  }), [
    user, login, logout, loading, customRoleLoading, role,
    isSuperAdmin, isAdmin, isSupervisor, isOperator, isViewer, isCodisec, isPnp,
    hasRole, hasAnyRole, hasModuleAccess, hasModuleOp, hasLayerAccess, getVisibleFields,
    customRolePerms,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
