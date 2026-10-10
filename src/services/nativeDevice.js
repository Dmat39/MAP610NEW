// Integración con la app móvil (map610-app). Dentro de la app existe window.SivecamNative,
// que firma los retos del backend con la llave del Keystore del celular. En el navegador
// normal no existe y todo funciona como siempre.
const API_URL = import.meta.env.VITE_API_URL;

const REFRESH_KEY = 'refresh_token';
const EXPIRES_KEY = 'token_expires_at';
export const TOKEN_REFRESHED_EVENT = 'auth:token-refreshed';

export const isNativeApp = () => !!window.SivecamNative?.isApp;

const native = (method, params) => window.SivecamNative.request(method, params);

const postJson = async (path, body) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
};

const requestChallenge = async (username, purpose) => {
  const { ok, json } = await postJson('auth/device/challenge', { username, purpose });
  if (!ok) throw new Error(json.message || 'No se pudo iniciar la verificación del dispositivo');
  return json.data;
};

const loginError = (json, fallback) => {
  const err = new Error(json?.message || fallback);
  err.code = json?.code;
  return err;
};

/**
 * Login desde la app: contraseña + firma del celular.
 * - Si el celular ya tiene llave, firma con ella (usuario ya vinculado).
 * - Si el backend responde que el usuario no tiene celular vinculado (primera vez o
 *   tras un reset del admin), crea una llave nueva con Key Attestation y la vincula.
 * Devuelve la respuesta `data` del backend.
 */
export async function nativeLogin(username, password) {
  let info;
  try {
    info = await native('device.info');
  } catch {
    throw new Error('No se pudo acceder al dispositivo');
  }
  if (!info.keyAvailable) throw new Error('Este celular no soporta la llave segura que requiere SIVECAM');

  const attempt = async (device) => {
    const { ok, json } = await postJson('auth/login', { username, password, device });
    if (ok) return json.data;
    throw loginError(json, 'Error en el inicio de sesión');
  };

  const signWithExistingKey = async () => {
    const ch = await requestChallenge(username, 'login');
    const { signature } = await native('device.sign', { message: ch.message });
    return attempt({ challenge_id: ch.challenge_id, signature, device_name: info.deviceName });
  };

  const bindNewKey = async () => {
    const ch = await requestChallenge(username, 'login');
    // El nonce del reto queda dentro del certificado de attestation de la llave nueva
    const key = await native('device.createKey', { challenge: ch.nonce });
    const { signature } = await native('device.sign', { message: ch.message });
    return attempt({
      challenge_id: ch.challenge_id,
      signature,
      public_key: key.publicKey,
      attestation: key.certificateChain,
      device_name: info.deviceName,
    });
  };

  if (!info.hasKey) return bindNewKey();
  try {
    return await signWithExistingKey();
  } catch (err) {
    // El usuario no tiene celular vinculado: vincular este con una llave nueva
    if (err.code === 'DEVICE_KEY_REQUIRED') return bindNewKey();
    throw err;
  }
}

// Guarda los datos de sesión móvil que entrega el login o el refresh
export function storeMobileSession(data) {
  if (!data?.refresh_token) return;
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  if (data.expires_in) localStorage.setItem(EXPIRES_KEY, String(Date.now() + data.expires_in * 1000));
}

export function clearMobileSession() {
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export const hasMobileSession = () => isNativeApp() && !!localStorage.getItem(REFRESH_KEY);

let refreshing = null;

/**
 * Renueva el access token (refresh token + firma nueva del celular).
 * Una sola renovación a la vez: el backend revoca la sesión si recibe dos con el mismo
 * refresh token. Devuelve { ok: true } o { ok: false, code } si la sesión terminó.
 */
export function refreshMobileSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh_token = localStorage.getItem(REFRESH_KEY);
    const username = (() => {
      try { return JSON.parse(localStorage.getItem('user'))?.username; } catch { return null; }
    })();
    if (!isNativeApp() || !refresh_token || !username) return { ok: false };
    try {
      const ch = await requestChallenge(username, 'refresh');
      const { signature } = await native('device.sign', { message: ch.message });
      const { ok, json } = await postJson('auth/refresh', { refresh_token, challenge_id: ch.challenge_id, signature });
      if (!ok) {
        // Sesión revocada o vencida: no tiene sentido reintentar
        if (json?.code) clearMobileSession();
        return { ok: false, code: json?.code };
      }
      localStorage.setItem('token', json.data.token);
      storeMobileSession(json.data);
      window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT));
      return { ok: true };
    } catch (error) {
      // Sin red u otro error transitorio: se reintenta en el próximo ciclo
      console.warn('No se pudo renovar la sesión móvil:', error);
      return { ok: false, transient: true };
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

// Renueva antes de que venza (revisa cada 30 s; también al volver la app al frente)
export function startMobileTokenRefresh() {
  if (window.__mobileRefreshStarted) return;
  window.__mobileRefreshStarted = true;
  const tick = () => {
    if (!hasMobileSession()) return;
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY)) || 0;
    if (expiresAt - Date.now() < 90_000) refreshMobileSession();
  };
  setInterval(tick, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
