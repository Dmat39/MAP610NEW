// Intercepta todas las respuestas 401 de la API hechas con token.
// Si el backend revocó la sesión (otro inicio de sesión superó el límite del usuario
// o el token expiró), limpia la sesión local y avisa a AuthContext.
import {
  TOKEN_REFRESHED_EVENT,
  clearMobileSession,
  hasMobileSession,
  refreshMobileSession,
} from './nativeDevice';

const API_URL = import.meta.env.VITE_API_URL;

export const SESSION_ENDED_EVENT = 'auth:session-ended';
export const PERMS_CHANGED_EVENT = 'auth:perms-changed';

const NOTICES = {
  SESSION_REPLACED: 'Tu sesión se cerró porque hubo otro inicio de sesión con tu usuario en otro dispositivo.',
  SESSION_LIMIT_REDUCED: 'Tu sesión se cerró porque se redujo el límite de sesiones de tu usuario.',
  USER_DISABLED: 'Tu usuario fue desactivado. Comunícate con el administrador.',
  MOBILE_ONLY_ENABLED: 'Tu usuario ahora solo puede ingresar desde la app móvil autorizada.',
  MOBILE_ONLY: 'Este usuario solo puede ingresar desde la app móvil autorizada.',
  DEVICE_RESET: 'El administrador restableció la vinculación de tu dispositivo. Vuelve a ingresar.',
  REFRESH_REUSED: 'Tu sesión se cerró por seguridad. Vuelve a ingresar.',
};
const NOTICE_KEY = 'session_ended_notice';

const hasAuthHeader = (input, init) => {
  const headers = init?.headers ?? (input instanceof Request ? input.headers : null);
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('Authorization');
  return Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
};

let ending = false;

const endSession = (code) => {
  if (ending || !localStorage.getItem('token')) return;
  ending = true;
  const notice = NOTICES[code] ?? 'Tu sesión finalizó. Vuelve a ingresar.';
  sessionStorage.setItem(NOTICE_KEY, notice);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearMobileSession();
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { notice } }));
  setTimeout(() => { ending = false; }, 1000);
};

// Canal en tiempo real: el backend avisa al instante cuando otro inicio de sesión
// revoca esta sesión. Devuelve una función para cerrar la conexión.
export const watchSession = () => {
  if (!API_URL || typeof EventSource === 'undefined') return () => {};
  let source = null;
  let stopped = false;

  const connect = () => {
    const token = localStorage.getItem('token');
    if (stopped || !token) return;
    source?.close();
    source = new EventSource(`${API_URL}auth/session-events?token=${encodeURIComponent(token)}`);
    source.addEventListener('session-ended', (e) => {
      source.close();
      let code = null;
      try { code = JSON.parse(e.data)?.code; } catch { /* sin datos */ }
      endSession(code);
    });
    // El admin cambió el rol o sus permisos: AuthContext los vuelve a cargar al instante
    source.addEventListener('perms-changed', () => {
      window.dispatchEvent(new CustomEvent(PERMS_CHANGED_EVENT));
    });
    // El backend cierra el canal cuando vence el token. En la app móvil se renueva y
    // se reconecta; en la web el token dura toda la jornada.
    source.addEventListener('token-expired', async () => {
      source.close();
      if (!hasMobileSession()) return;
      const result = await refreshMobileSession();
      if (result.ok) connect();
      else if (!result.transient) endSession(result.code);
    });
  };

  // Token renovado (refresh): reconectar con el nuevo para que el canal no venza
  const onRefreshed = () => connect();
  window.addEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);
  connect();
  // Si se corta la conexión, EventSource reintenta solo; al reconectar el backend
  // vuelve a validar la sesión y avisa si fue revocada mientras tanto.
  return () => {
    stopped = true;
    window.removeEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);
    source?.close();
  };
};

// Repite la petición con el token renovado (mismas opciones, nuevo Authorization)
const withFreshToken = (input, init) => {
  const auth = `Bearer ${localStorage.getItem('token')}`;
  if (input instanceof Request && !init) {
    const headers = new Headers(input.headers);
    headers.set('Authorization', auth);
    return [new Request(input, { headers }), undefined];
  }
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', auth);
  return [input, { ...init, headers }];
};

export const installSessionGuard = () => {
  if (window.__sessionGuardInstalled) return;
  window.__sessionGuardInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    if (
      response.status === 401 &&
      API_URL && url.startsWith(API_URL) &&
      !url.includes('auth/login') &&
      hasAuthHeader(input, init) &&
      localStorage.getItem('token') &&
      !ending
    ) {
      const body = await response.clone().json().catch(() => ({}));
      // App móvil: el access token dura minutos. Si venció (401 sin código de
      // revocación), se renueva con la firma del celular y se repite la petición.
      if (!body?.code && hasMobileSession()) {
        const result = await refreshMobileSession();
        if (result.ok) return originalFetch(...withFreshToken(input, init));
        if (result.transient) return response;
        endSession(result.code);
        return response;
      }
      endSession(body?.code);
    }
    return response;
  };
};

// Devuelve (y borra) el aviso pendiente para mostrar en el Login
export const consumeSessionNotice = () => {
  const notice = sessionStorage.getItem(NOTICE_KEY);
  if (notice) sessionStorage.removeItem(NOTICE_KEY);
  return notice;
};
