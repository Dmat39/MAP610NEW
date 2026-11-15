// Avisos sonoros de Despacho (Web Audio, sin archivos): incidencia nueva de prioridad alta y despacho atrasado.
// La configuración se guarda por operador en localStorage ('cdp.sonido').

const CLAVE = 'cdp.sonido';
const POR_DEFECTO = { activo: true, limite_min: 10 };

export const leerConfigSonido = () => {
  try { return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; } catch { return { ...POR_DEFECTO }; }
};
export const guardarConfigSonido = (cfg) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch { /* sin almacenamiento */ }
};

let ctx = null;
const contexto = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// El navegador solo deja sonar después de un gesto del usuario: se desbloquea con el primer clic o tecla.
if (typeof document !== 'undefined') {
  const desbloquear = () => { contexto(); };
  document.addEventListener('pointerdown', desbloquear, { once: true, passive: true });
  document.addEventListener('keydown', desbloquear, { once: true });
}

const tono = (c, t0, hz, dur, vol = 0.18) => {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = hz;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.setValueAtTime(vol, t0 + dur - 0.03);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur);
};

/** 'alta': dos tonos ascendentes (incidencia urgente nueva). 'atraso': tres toques graves (despacho sin llegada). */
export const sonar = (tipo) => {
  if (!leerConfigSonido().activo) return;
  const c = contexto();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + 0.02;
  if (tipo === 'alta') {
    tono(c, t, 880, 0.14);
    tono(c, t + 0.17, 1320, 0.22);
  } else {
    tono(c, t, 440, 0.11, 0.16);
    tono(c, t + 0.16, 440, 0.11, 0.16);
    tono(c, t + 0.32, 440, 0.18, 0.16);
  }
};
