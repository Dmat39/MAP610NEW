import { LocateFixed, LocateOff } from 'lucide-react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './CapaMiUbicacion.css';

// Mismo margen derecho que la leyenda de cámaras (LeyendaSeguridad)
const BASE_RIGHT = 20;

// Botón flotante para volver a centrar el mapa en la ubicación del usuario.
// `sobreLeyenda`: la leyenda de cámaras está visible y el botón se apila encima de ella;
// si no, ocupa su lugar en la esquina.
const BotonMiUbicacion = ({ posicion, error, onCentrar, sobreLeyenda = false, oculto = false }) => {
  const { rightOffset } = useMapLayout();
  const titulo = error || (posicion ? 'Centrar en mi ubicación' : 'Buscando tu ubicación…');
  if (oculto) return null;

  return (
    <button
      type="button"
      className={[
        'mi-ubicacion-fab',
        sobreLeyenda && 'mi-ubicacion-fab-sobre-leyenda',
        !posicion && 'mi-ubicacion-fab-sin-senal',
      ].filter(Boolean).join(' ')}
      style={{ right: BASE_RIGHT + rightOffset }}
      onClick={() => posicion && onCentrar(posicion)}
      disabled={!posicion}
      title={titulo}
      aria-label={titulo}
    >
      {error ? <LocateOff size={22} /> : <LocateFixed size={22} />}
    </button>
  );
};

export default BotonMiUbicacion;
