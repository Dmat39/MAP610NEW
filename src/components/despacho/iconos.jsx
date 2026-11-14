// Íconos de recursos (Phosphor, vía react-icons/pi). Misma familia en el mapa, el panel y la leyenda.
import {
  PiJeepFill, PiMotorcycleFill, PiPersonSimpleWalkFill, PiVideoCameraFill,
  PiSecurityCameraFill, PiSirenFill, PiWarningFill,
} from 'react-icons/pi';

// Ícono de vehículo: moto o camioneta (todas las demás unidades usan el mismo ícono de camioneta).
export const IconoVehiculo = ({ subtipo, ...p }) =>
  subtipo === 'MOTO' ? <PiMotorcycleFill {...p} /> : <PiJeepFill {...p} />;
export const IconoAPie = ({ tipo, ...p }) =>
  tipo === 'BODYCAM' ? <PiVideoCameraFill {...p} /> : <PiPersonSimpleWalkFill {...p} />;
export const IconoCamara = (p) => <PiSecurityCameraFill {...p} />;
export const IconoSirena = (p) => <PiSirenFill {...p} />;
export const IconoIncidencia = (p) => <PiWarningFill {...p} />;

