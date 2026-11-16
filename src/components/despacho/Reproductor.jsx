// Reproducción de recorrido (fase 4): elegir unidad y rango, y reproducir su GPS sobre el mapa con línea de tiempo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PiPlayFill, PiPauseFill, PiXCircle, PiSkipBackFill } from 'react-icons/pi';
import * as api from '../../services/patrullajeService';
import { fmtHora } from './util';

const VELOCIDADES = [1, 10, 30, 60, 120];
const RANGOS = [
  ['2h', 'Últimas 2 h'], ['4h', 'Últimas 4 h'], ['turno', 'Turno elegido'], ['custom', 'Rango…'],
];
const HORAS_TURNO = { MORNING: [6, 14], AFTERNOON: [14, 22], NIGHT: [22, 30] };

const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * Barra flotante. `unidad` = { tipo, id, codigo }. Entrega a `onEstado` la posición actual y la cola de puntos
 * para que el mapa los dibuje; `onCerrar` la cierra.
 */
export const Reproductor = ({ unidad, fecha, turno, onEstado, onCerrar, avisar }) => {
  const [rango, setRango] = useState('2h');
  const [custom, setCustom] = useState(() => ({ desde: isoLocal(new Date(Date.now() - 2 * 3600 * 1000)), hasta: isoLocal(new Date()) }));
  const [puntos, setPuntos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [i, setI] = useState(0);              // índice del punto actual
  const [play, setPlay] = useState(false);
  const [vel, setVel] = useState(30);
  const timer = useRef(null);

  const ventana = useMemo(() => {
    const ahora = new Date();
    if (rango === '2h' || rango === '4h') return { desde: new Date(ahora.getTime() - (rango === '2h' ? 2 : 4) * 3600 * 1000), hasta: ahora };
    if (rango === 'turno') {
      const [h0, h1] = HORAS_TURNO[turno] ?? [6, 14];
      const desde = new Date(`${fecha}T${String(h0 % 24).padStart(2, '0')}:00:00-05:00`);
      const hasta = new Date(desde.getTime() + (h1 - h0) * 3600 * 1000);
      return { desde, hasta: new Date(Math.min(hasta.getTime(), ahora.getTime())) };
    }
    return { desde: new Date(custom.desde), hasta: new Date(custom.hasta) };
  }, [rango, custom, fecha, turno]);

  // Carga del recorrido al cambiar unidad o rango
  useEffect(() => {
    let vivo = true;
    (async () => {
      setPlay(false); setI(0); setCargando(true);
      try {
        const pts = await api.obtenerRecorridoRango(unidad.tipo, unidad.id, ventana.desde.toISOString(), ventana.hasta.toISOString());
        if (!vivo) return;
        setPuntos(pts);
        if (!pts.length) avisar?.(`${unidad.codigo} no tiene posiciones en ese rango.`, 'alerta');
      } catch (e) { if (vivo) { setPuntos([]); avisar?.(e.message, 'error'); } } finally { if (vivo) setCargando(false); }
    })();
    return () => { vivo = false; };
  }, [unidad.tipo, unidad.id, unidad.codigo, ventana, avisar]);

  // Avance: cada tic salta al siguiente punto respetando el tiempo real dividido por la velocidad (máx. 2 s por tic)
  useEffect(() => {
    clearTimeout(timer.current);
    if (!play || !puntos.length) return undefined;
    if (i >= puntos.length - 1) { setPlay(false); return undefined; }
    const dt = Math.max(0, new Date(puntos[i + 1].t) - new Date(puntos[i].t));
    timer.current = setTimeout(() => setI((x) => x + 1), Math.min(2000, Math.max(60, dt / vel)));
    return () => clearTimeout(timer.current);
  }, [play, i, puntos, vel]);

  useEffect(() => {
    if (!puntos.length) { onEstado(null); return; }
    onEstado({ actual: puntos[i], cola: puntos.slice(0, i + 1).map((p) => [p.lat, p.lng]), todo: puntos.map((p) => [p.lat, p.lng]), codigo: unidad.codigo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos, i]);

  const actual = puntos[i];
  return (
    <div className="cdp-repro" role="region" aria-label="Reproducción de recorrido">
      <div className="cdp-repro-head">
        <b>Recorrido de {unidad.codigo}</b>
        <select value={rango} onChange={(e) => setRango(e.target.value)} aria-label="Rango">
          {RANGOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {rango === 'custom' && (
          <>
            <input type="datetime-local" value={custom.desde} onChange={(e) => setCustom((c) => ({ ...c, desde: e.target.value }))} aria-label="Desde" />
            <input type="datetime-local" value={custom.hasta} onChange={(e) => setCustom((c) => ({ ...c, hasta: e.target.value }))} aria-label="Hasta" />
          </>
        )}
        <button className="cdp-icon-btn" aria-label="Cerrar" onClick={onCerrar}><PiXCircle size={15} /></button>
      </div>
      <div className="cdp-repro-ctrl">
        <button className="cdp-icon-btn" aria-label="Al inicio" onClick={() => { setI(0); setPlay(false); }} disabled={!puntos.length}><PiSkipBackFill size={14} /></button>
        <button className="cdp-icon-btn primario" aria-label={play ? 'Pausa' : 'Reproducir'} onClick={() => { if (i >= puntos.length - 1) setI(0); setPlay((p) => !p); }} disabled={!puntos.length}>
          {play ? <PiPauseFill size={14} /> : <PiPlayFill size={14} />}
        </button>
        <input type="range" min={0} max={Math.max(0, puntos.length - 1)} value={i} onChange={(e) => { setI(Number(e.target.value)); setPlay(false); }} disabled={!puntos.length} aria-label="Línea de tiempo" />
        <select value={vel} onChange={(e) => setVel(Number(e.target.value))} aria-label="Velocidad">
          {VELOCIDADES.map((v) => <option key={v} value={v}>{v}x</option>)}
        </select>
      </div>
      <div className="cdp-repro-info">
        {cargando ? 'Cargando posiciones…' : !puntos.length ? 'Sin posiciones en el rango' : (
          <>
            <b>{fmtHora(actual.t)}</b>{actual.velocidad !== null && actual.velocidad !== undefined ? `, ${actual.velocidad} km/h` : ''} · punto {i + 1} de {puntos.length} · {fmtHora(puntos[0].t)} a {fmtHora(puntos[puntos.length - 1].t)}
          </>
        )}
      </div>
    </div>
  );
};

export default Reproductor;
