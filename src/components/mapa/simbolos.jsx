// Íconos y símbolos (componentes React) del lenguaje visual de los mapas. Ver estados.js para la regla
// forma = qué es, color = estado. Los pines del mapa (DivIcon) están en pines.jsx.
import {
  PiJeepFill, PiMotorcycleFill, PiPersonSimpleWalkFill, PiVideoCameraFill,
  PiSecurityCameraFill, PiSirenFill, PiWarningFill, PiUserFill, PiBagFill, PiFirstAidFill, PiCarFill,
  PiMegaphoneFill, PiBeerBottleFill, PiScrollFill, PiDotsThreeCircleFill,
} from 'react-icons/pi';
import { COLOR, COLOR_RIESGO } from './estados';
import './simbolos.css';

// ─── Íconos (Phosphor, una sola familia) ──────────────────────────────────────
export const IconoVehiculo = ({ subtipo, ...p }) =>
  subtipo === 'MOTO' ? <PiMotorcycleFill {...p} /> : <PiJeepFill {...p} />;
export const IconoAPie = ({ tipo, ...p }) =>
  tipo === 'BODYCAM' ? <PiVideoCameraFill {...p} /> : <PiPersonSimpleWalkFill {...p} />;
export const IconoCamara = (p) => <PiSecurityCameraFill {...p} />;
export const IconoSirena = (p) => <PiSirenFill {...p} />;
export const IconoIncidencia = (p) => <PiWarningFill {...p} />;

// Categoría de una incidencia (la decide el backend según el tipo): un ícono por categoría, mismo color morado.
const ICONO_CATEGORIA = {
  PERSONA: PiUserFill, PATRIMONIO: PiBagFill, AUXILIO: PiFirstAidFill, TRANSITO: PiCarFill,
  TRANQUILIDAD: PiMegaphoneFill, COSTUMBRES: PiBeerBottleFill, ORDENANZAS: PiScrollFill, OTROS: PiDotsThreeCircleFill,
};
export const IconoCategoria = ({ categoria, ...p }) => {
  const I = ICONO_CATEGORIA[categoria] ?? PiWarningFill;
  return <I {...p} />;
};

// ─── Símbolos inline (leyendas y listas: mismo dibujo que en el mapa) ─────────
export const SimboloMovil = ({ subtipo = 'CAMION', estado = 'disponible', size = 24 }) => (
  <span className="pin pin-movil chico" style={{ '--c': COLOR[estado], width: size, height: size }}>
    <IconoVehiculo subtipo={subtipo} size={Math.round(size * 0.55)} />
  </span>
);
export const SimboloAPie = ({ tipo = 'RADIO', estado = 'disponible', size = 22 }) => (
  <span className="pin pin-apie" style={{ '--c': COLOR[estado], width: size, height: size }}>
    <IconoAPie tipo={tipo} size={Math.round(size * 0.55)} />
  </span>
);
export const SimboloCamara = ({ ve = false, size = 22 }) => (
  <span className={`pin pin-camara${ve ? ' ve' : ''}`} style={{ width: size, height: size }}>
    <IconoCamara size={Math.round(size * 0.55)} />
  </span>
);
export const SimboloZona = ({ nivel = 'alto' }) => (
  <span className="lg-zona" style={{ borderColor: COLOR_RIESGO[nivel], background: COLOR_RIESGO[nivel], opacity: 0.75 }} />
);
export const SimboloIncidencia = (p) => <IconoIncidencia color={COLOR.incidencia} {...p} />;
