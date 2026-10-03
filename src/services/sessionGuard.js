// Intercepta todas las respuestas 401 de la API hechas con token.
// Si el backend revocó la sesión (otro inicio de sesión superó el límite del usuario
// o el token expiró), limpia la sesión local y avisa a AuthContext.
const API_URL = import.meta.env.VITE_API_URL;

export const SESSION_ENDED_EVENT = 'auth:session-ended';
export const PERMS_CHANGED_EVENT = 'auth:perms-changed';

const NOTICES = {
  SESSION_REPLACED: 'Tu sesión se cerró porque hubo otro inicio de sesión con tu usuario en otro dispositivo.',
  SESSION_LIMIT_REDUCED: 'Tu sesión se cerró porque se redujo el límite de sesiones de tu usuario.',
  USER_DISABLED: 'Tu usuario fue desactivado. Comunícate con el administrador.',
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
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { notice } }));
  setTimeout(() => { ending = false; }, 1000);
};

// Canal en tiempo real: el backend avisa al instante cuando otro inicio de sesión
// revoca esta sesión. Devuelve una función para cerrar la conexión.
export const watchSession = () => {
  const token = localStorage.getItem('token');
  if (!token || !API_URL || typeof EventSource === 'undefined') return () => {};
  const source = new EventSource(`${API_URL}auth/session-events?token=${encodeURIComponent(token)}`);
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
  // Si se corta la conexión, EventSource reintenta solo; al reconectar el backend
  // vuelve a validar la sesión y avisa si fue revocada mientras tanto.
  return () => source.close();
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
