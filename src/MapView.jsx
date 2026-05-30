import { MapContainer, TileLayer, Pane } from 'react-leaflet';
import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import CapaJurisdiccion from './components/capas/Jurisdiccion/CapaJurisdiccion';
import CapaCamarasMunicipales from './components/capas/CamarasMunicipales/CapaCamarasMunicipales';
import CapaCamarasVecinales from './components/capas/CamarasVecinales/CapaCamarasVecinales';
import CapaParaderosAutorizados from './components/capas/Paraderos/CapaParaderosAutorizados';
import CapaParaderosNoAutorizados from './components/capas/Paraderos/CapaParaderosNoAutorizados';
import CapaDefensaCivil from './components/capas/DefensaCivil/CapaDefensaCivil';
import CapaComisarias from './components/capas/Comisarias/CapaComisarias';
import CapaRobos from './components/capas/Incidencias/CapaRobos';
import {
  CapaRoboPersonas, CapaRoboCasa, CapaRoboGanado, CapaRoboEmpresas,
  CapaRoboVehiculos, CapaRoboAutopartes, CapaRoboPasajeros,
  CapaHurtoPersonas, CapaHurtoCasa, CapaHurtoGanado, CapaHurtoEmpresas,
  CapaHurtoVehiculos, CapaHurtoPasajeros, CapaDanos,
} from './components/capas/Incidencias/CapasPatrimonio';

const PATRIMONIO_SUBTIPO_KEYS = [
  'roboPersonas','roboCasa','roboGanado','roboEmpresas','roboVehiculos','roboAutopartes','roboPasajeros',
  'hurtoPersonas','hurtoCasa','hurtoGanado','hurtoEmpresas','hurtoVehiculos','hurtoPasajeros','danos',
];
import FiltroIncidentes from './components/filtros/FiltroIncidentes';
import LayerTogglePanel from './components/Controles/LayerTogglePanel';
import CapaExtorsion from './components/capas/Incidencias/CapaExtorsion';
import CapaHomicidios from './components/capas/Incidencias/CapaHomicidios';
import CapaFeminicidios from './components/capas/Incidencias/CapaFeminicidios';
import CapaSicariatos from './components/capas/Incidencias/CapaSicariatos';
import CapaSecuestros from './components/capas/Incidencias/CapaSecuestros';
import CapaDrogas from './components/capas/Incidencias/CapaDrogas';
import CapaBarras from './components/capas/Incidencias/CapaBarras';
import CapaResiduos from './components/capas/Residuos/CapaResiduos';
import CapaSostenimiento from './components/capas/Sostenimiento/CapaSostenimiento';
import CapaActividades from './components/capas/Actividades/CapaActividades';
import FiltroGiro from './components/filtros/FiltroGiro';
import FiltroIncidenciasPNP from './components/filtros/FiltroIncidenciasPNP';
import CapaBusquedaDirecciones from './components/capas/BusquedaDirecciones/CapaBusquedaDirecciones';
import CapaUbicadorPunto from './components/capas/UbicadorPuntos/CapaUbicadorPunto';
import ControlBusqueda from './components/Controles/Busqueda_Direcciones/ControlBusqueda';
import ControlMarcadorCamaras from './components/Controles/Marcador_Camaras/ControlMarcadorCamaras';
import ControlCamaras from './components/Controles/Busqueda_Camaras/ControlCamaras';
import CapaRutas from './components/capas/RutasVehiculo/CapaRutas';
import ControlRutas from './components/Controles/Rutas_Moviles/ControlRutas';
import GoogleMapWrapper from './components/googlemaps/GoogleMapContainer';
import GoogleRoutesCalculator from './components/googlemaps/GoogleRoutesCalculator';
import GoogleCapaJurisdiccion from './components/googlemaps/GoogleCapaJurisdiccion';
import GoogleCapaCamarasMunicipales from './components/googlemaps/GoogleCapaCamarasMunicipales';
import GoogleCapaCamarasVecinales from './components/googlemaps/GoogleCapaCamarasVecinales';
import GoogleCapaRobos from './components/googlemaps/GoogleCapaRobos';
import GoogleCapaExtorsion from './components/googlemaps/GoogleCapaExtorsion';
import GoogleCapaHomicidios from './components/googlemaps/GoogleCapaHomicidios';
import GoogleCapaFeminicidios from './components/googlemaps/GoogleCapaFeminicidios';
import GoogleCapaSicariatos from './components/googlemaps/GoogleCapaSicariatos';
import GoogleCapaSecuestros from './components/googlemaps/GoogleCapaSecuestros';
import GoogleCapaDrogas from './components/googlemaps/GoogleCapaDrogas';
import GoogleCapaBarras from './components/googlemaps/GoogleCapaBarras';
import GoogleCapaResiduos from './components/googlemaps/GoogleCapaResiduos';
import GoogleCapaBusquedaDirecciones from './components/googlemaps/GoogleCapaBusquedaDirecciones';
import GoogleCapaUbicadorPunto from './components/googlemaps/GoogleCapaUbicadorPuntos/GoogleCapaUbicadorPunto';
import LeyendaCamaras from './components/capas/LeyendaCamaras/LeyendaCamaras';
import LeyendaCamarasMunicipales from './components/capas/LeyendaCamarasMunicipales/LeyendaCamarasMunicipales';
import ClusterIncidencias from './components/capas/ClusterIncidencias/ClusterIncidencias';
import GoogleClusterIncidencias from './components/googlemaps/GoogleClusterIncidencias';
import GoogleCapaActividades from './components/googlemaps/GoogleCapaActividades';
import CapaJurisdiccionCodisec from './components/capas/Jurisdiccion/CapaJurisdiccionCodisec';
import GoogleCapaJurisdiccionCodisec from './components/googlemaps/GoogleCapaJurisdiccionCodisec';
import ControlClusters from './components/Controles/Mapa_Clusters/ControlClusters';
import CapaIncidenciasPNP from './components/capas/IncidenciasPNP/CapaIncidenciasPNP';
import ClusterCombinado from './components/capas/ClusterCombinado/ClusterCombinado';
import GoogleClusterCombinado from './components/googlemaps/GoogleClusterCombinado';
import ControlClusterCombinado from './components/Controles/Cluster_Combinado/ControlClusterCombinado';
import ClusterIncidenciasPNP from './components/capas/ClusterIncidenciasPNP/ClusterIncidenciasPNP';
import ControlClusterPNP from './components/Controles/Cluster_PNP/ControlClusterPNP';

const PNP_TIPOS = [
  { key: 'pnpPatrimonio',       tipo: 'PATRIMONIO (DELITO)',                  label: 'Patrimonio' },
  { key: 'pnpSeguridadPublica', tipo: 'SEGURIDAD PÚBLICA (DELITO)',           label: 'Seguridad Pública' },
  { key: 'pnpVidaSalud',        tipo: 'VIDA, EL CUERPO Y LA SALUD (DELITO)', label: 'Vida y Salud' },
  { key: 'pnpLibertad',         tipo: 'LIBERTAD (DELITO)',                    label: 'Libertad' },
  { key: 'pnpAdminPublica',     tipo: 'ADMINISTRACIÓN PÚBLICA (DELITO)',      label: 'Adm. Pública' },
  { key: 'pnpTrafico',          tipo: 'TRÁFICO ILÍCITO DE DROGAS',            label: 'Tráfico Drogas' },
  { key: 'pnpFamilia',          tipo: 'FAMILIA (DELITO)',                     label: 'Familia' },
  { key: 'pnpMenorInfractor',   tipo: 'MENOR INFRACTOR DE LA LEY PENAL',     label: 'Menor Infractor' },
  { key: 'pnpFePublica',        tipo: 'FE PÚBLICA (DELITO)',                  label: 'Fe Pública' },
  { key: 'pnpTranquilidad',     tipo: 'TRANQUILIDAD PÚBLICA (DELITO)',        label: 'Tranquilidad Pública' },
];

const MapView = () => {
  const { user, hasLayerAccess } = useAuth();
  const userRole = user?.role;
  const isViewer = userRole === 'VIEWER';

  const canSeeCamaras = hasLayerAccess('camaras');
  const canSeeCamarasVecinales = hasLayerAccess('camarasVecinales');

  const [mapType, setMapType] = useState('leaflet'); // 'leaflet' o 'google'
  const [capasVisibles, setCapasVisibles] = useState({
    camaras: canSeeCamaras, // Solo visible si tiene permiso de capa
    camarasVecinales: false,
    paraderosAutorizados: false,
    paraderosNoAutorizados: false,
    robos: false,
    roboPersonas: false, roboCasa: false, roboGanado: false, roboEmpresas: false,
    roboVehiculos: false, roboAutopartes: false, roboPasajeros: false,
    hurtoPersonas: false, hurtoCasa: false, hurtoGanado: false, hurtoEmpresas: false,
    hurtoVehiculos: false, hurtoPasajeros: false, danos: false,
    extorsiones: false,
    homicidios: false,
    feminicidios: false,
    sicariatos: false,
    secuestros: false,
    drogas: false,
    barras: false,
    residuos: false,
    defensaCivil: false,
    comisarias: false,
    sostenimiento: false,
    actividades: false,
    busquedaDirecciones: false,
    ubicadorPunto: false,
    rutas: false,
    clusters: false,
    clusterCombinado: false,
    clusterPNP: false,
    zonasCodisec: false,
    jurisdicciones: true,
    pnpPatrimonio: false,
    pnpSeguridadPublica: false,
    pnpVidaSalud: false,
    pnpLibertad: false,
    pnpAdminPublica: false,
    pnpTrafico: false,
    pnpFamilia: false,
    pnpMenorInfractor: false,
    pnpFePublica: false,
    pnpTranquilidad: false,
  });

  const [payloadFiltros, setPayloadFiltros] = useState(null);
  const [filtrosPnp, setFiltrosPnp] = useState(null);
  const [filtrosRobos, setFiltrosRobos] = useState(null);
  const [filtrosExtorsion, setFiltrosExtorsion] = useState(null);
  const [filtrosHomicidios, setFiltrosHomicidios] = useState(null);
  const [filtrosFeminicidios, setFiltrosFeminicidios] = useState(null);
  const [filtrosSicariatos, setFiltrosSicariatos] = useState(null);
  const [filtrosSecuestros, setFiltrosSecuestros] = useState(null);
  const [filtrosDrogas, setFiltrosDrogas] = useState(null);
  const [filtrosBarras, setFiltrosBarras] = useState(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);
  const [puntosUsuario, setPuntosUsuario] = useState([]);
  const [marcadorActivo, setMarcadorActivo] = useState(false);
  const [rutaInfo, setRutaInfo] = useState(null);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(null);
  const [camarasFiltradas, setCamarasFiltradas] = useState([]);
  const [filtrosCamaras, setFiltrosCamaras] = useState(null);
  const [seguimientoCamara, setSeguimientoCamara] = useState(null);
  const [limpiarSeguimiento, setLimpiarSeguimiento] = useState(null);
  const [camaraConVision, setCamaraConVision] = useState(null); // Track camera with vision field active

  const getDefaultFechasCombinado = () => {
    const today = new Date();
    const hace30 = new Date();
    hace30.setDate(today.getDate() - 30);
    const fmt = d => d.toISOString().split('T')[0];
    return { fechaInicio: fmt(hace30), fechaFin: fmt(today) };
  };
  const [radioClusterCombinado, setRadioClusterCombinado] = useState(50);
  const [fechasClusterCombinado, setFechasClusterCombinado] = useState(getDefaultFechasCombinado);
  const [radioClusterPNP, setRadioClusterPNP]     = useState(50);
  const [fechasClusterPNP, setFechasClusterPNP]   = useState(getDefaultFechasCombinado);
  const payloadVacio = {
    Año: '',
    Mes: '',
    Turno: '',
    Dia: '',
    Horario: '',
    Jurisdiccion: '',
  };

  const handleFiltrar = useCallback(payload => {
    setPayloadFiltros(payload);
    const anyPatrimonio = capasVisibles.robos || PATRIMONIO_SUBTIPO_KEYS.some(k => capasVisibles[k]);
    if (anyPatrimonio) setFiltrosRobos(payload);
    else setFiltrosRobos(payloadVacio);

    if (capasVisibles.extorsiones) setFiltrosExtorsion(payload);
    else setFiltrosExtorsion(payloadVacio);

    if (capasVisibles.homicidios) setFiltrosHomicidios(payload);
    else setFiltrosHomicidios(payloadVacio);

    if (capasVisibles.feminicidios) setFiltrosFeminicidios(payload);
    else setFiltrosFeminicidios(payloadVacio);

    if (capasVisibles.sicariatos) setFiltrosSicariatos(payload);
    else setFiltrosSicariatos(payloadVacio);

    if (capasVisibles.secuestros) setFiltrosSecuestros(payload);
    else setFiltrosSecuestros(payloadVacio);

    if (capasVisibles.drogas) setFiltrosDrogas(payload);
    else setFiltrosDrogas(payloadVacio);

    if (capasVisibles.barras) setFiltrosBarras(payload);
    else setFiltrosBarras(payloadVacio);
  }, [capasVisibles]);

  const handleLimpiar = useCallback(() => {
    setPayloadFiltros(null);
    setFiltrosRobos(payloadVacio);
    setFiltrosExtorsion(payloadVacio);
    setFiltrosHomicidios(payloadVacio);
    setFiltrosFeminicidios(payloadVacio);
    setFiltrosSicariatos(payloadVacio);
    setFiltrosSecuestros(payloadVacio);
    setFiltrosDrogas(payloadVacio);
    setFiltrosBarras(payloadVacio);
  }, []);

  const handleBusquedaRealizada = useCallback((resultados, idSeleccionado) => {
    setResultadosBusqueda(resultados);
    setResultadoSeleccionado(idSeleccionado);
  }, []);

  const handleToggleMarcador = useCallback(() => {
    setMarcadorActivo(prev => !prev);
  }, []);

  const handleAgregarPunto = useCallback(nuevoPunto => {
    setPuntosUsuario(prevPuntos => {
      // Si el punto ya existe (mismo ID), actualizarlo; si no, agregarlo
      const existe = prevPuntos.find(p => p.id === nuevoPunto.id);
      if (existe) {
        return prevPuntos.map(p => (p.id === nuevoPunto.id ? nuevoPunto : p));
      } else {
        return [...prevPuntos, nuevoPunto];
      }
    });
  }, []);

  const handleEliminarPunto = useCallback(puntoId => {
    setPuntosUsuario(prevPuntos => prevPuntos.filter(p => p.id !== puntoId));
  }, []);

  const handleRutaCalculada = useCallback(infoRuta => {
    setRutaInfo(infoRuta);
  }, []);

  const handleLimpiarRuta = useCallback(() => {
    setRutaInfo(null);
    // Crear un evento personalizado para notificar a los componentes de mapa
    window.dispatchEvent(new CustomEvent('clearRoute'));
  }, []);

  const handleCamaraSeleccionada = useCallback(camara => {
    setCamaraSeleccionada(camara);
  }, []);

  const handleFiltrosCamaras = useCallback((camarasFiltradas, filtros) => {
    setCamarasFiltradas(camarasFiltradas);
    setFiltrosCamaras(filtros);
  }, []);

  const handleSeguimientoCamara = camara => {
    setSeguimientoCamara(camara);
    // Limpiar seguimiento anterior después de un breve delay para permitir el re-render
    setTimeout(() => setSeguimientoCamara(null), 100);
  };

  const handleLimpiarSeguimiento = () => {
    setLimpiarSeguimiento(Date.now()); // Usar timestamp para forzar re-render
    setTimeout(() => setLimpiarSeguimiento(null), 100);
  };

  const handleLimpiarSeleccion = () => {
    setCamaraSeleccionada(null);
    setCamarasFiltradas([]);
    setFiltrosCamaras(null);
  };

  // Definir todas las capas
  const todasLasCapas = [
    { name: 'camaras', label: 'Cámaras Municipales', visible: capasVisibles.camaras },
    {
      name: 'camarasVecinales',
      label: 'Cámaras Vecinales',
      visible: capasVisibles.camarasVecinales,
    },
    { name: 'robos', label: 'Robos', visible: capasVisibles.robos, restrictedForOperator: true },
    { name: 'roboPersonas',   label: 'Robo a Personas',    visible: capasVisibles.roboPersonas,   restrictedForOperator: true },
    { name: 'roboCasa',       label: 'Robo Casa Habitada', visible: capasVisibles.roboCasa,       restrictedForOperator: true },
    { name: 'roboGanado',     label: 'Robo de Ganado',     visible: capasVisibles.roboGanado,     restrictedForOperator: true },
    { name: 'roboEmpresas',   label: 'Robo a Empresas',    visible: capasVisibles.roboEmpresas,   restrictedForOperator: true },
    { name: 'roboVehiculos',  label: 'Robo de Vehículos',  visible: capasVisibles.roboVehiculos,  restrictedForOperator: true },
    { name: 'roboAutopartes', label: 'Robo de Autopartes', visible: capasVisibles.roboAutopartes, restrictedForOperator: true },
    { name: 'roboPasajeros',  label: 'Robo a Pasajeros',   visible: capasVisibles.roboPasajeros,  restrictedForOperator: true },
    { name: 'hurtoPersonas',  label: 'Hurto a Personas',   visible: capasVisibles.hurtoPersonas,  restrictedForOperator: true },
    { name: 'hurtoCasa',      label: 'Hurto Casa Habitada',visible: capasVisibles.hurtoCasa,      restrictedForOperator: true },
    { name: 'hurtoGanado',    label: 'Hurto de Ganado',    visible: capasVisibles.hurtoGanado,    restrictedForOperator: true },
    { name: 'hurtoEmpresas',  label: 'Hurto a Empresas',   visible: capasVisibles.hurtoEmpresas,  restrictedForOperator: true },
    { name: 'hurtoVehiculos', label: 'Hurto de Vehículos', visible: capasVisibles.hurtoVehiculos, restrictedForOperator: true },
    { name: 'hurtoPasajeros', label: 'Hurto a Pasajeros',  visible: capasVisibles.hurtoPasajeros, restrictedForOperator: true },
    { name: 'danos',          label: 'Daños',              visible: capasVisibles.danos,          restrictedForOperator: true },
    { name: 'extorsiones', label: 'Extorsiones', visible: capasVisibles.extorsiones, restrictedForOperator: true },
    { name: 'homicidios', label: 'Homicidios', visible: capasVisibles.homicidios, restrictedForOperator: true },
    { name: 'feminicidios', label: 'Feminicidios', visible: capasVisibles.feminicidios, restrictedForOperator: true },
    { name: 'sicariatos', label: 'Sicariatos', visible: capasVisibles.sicariatos, restrictedForOperator: true },
    { name: 'secuestros', label: 'Secuestros', visible: capasVisibles.secuestros, restrictedForOperator: true },
    { name: 'drogas', label: 'Drogas', visible: capasVisibles.drogas, restrictedForOperator: true },
    { name: 'barras', label: 'Barras', visible: capasVisibles.barras, restrictedForOperator: true },
    { name: 'clusters', label: 'Clusters de Incidencias', visible: capasVisibles.clusters, restrictedForOperator: true },
    { name: 'clusterCombinado', label: 'Cluster Combinado (Serenos + PNP)', visible: capasVisibles.clusterCombinado, restrictedForOperator: true },
    { name: 'clusterPNP',      label: 'Cluster Incidencias PNP',           visible: capasVisibles.clusterPNP,      restrictedForOperator: true },
    {
      name: 'busquedaDirecciones',
      label: 'Búsqueda de Direcciones',
      visible: capasVisibles.busquedaDirecciones,
    },
    { name: 'ubicadorPunto', label: 'Ubicador de Puntos', visible: capasVisibles.ubicadorPunto },
    { name: 'rutas', label: 'Calculador de Rutas', visible: capasVisibles.rutas },
    {
      name: 'paraderosAutorizados',
      label: 'Paraderos Autorizados',
      visible: capasVisibles.paraderosAutorizados,
    },
    { name: 'defensaCivil', label: 'Defensa Civil', visible: capasVisibles.defensaCivil },
    { name: 'comisarias', label: 'Comisarías', visible: capasVisibles.comisarias },
    {
      name: 'paraderosNoAutorizados',
      label: 'Paraderos No Autorizados',
      visible: capasVisibles.paraderosNoAutorizados,
    },
    { name: 'residuos', label: 'Puntos Residuos Sólidos', visible: capasVisibles.residuos },
    { name: 'sostenimiento', label: 'Sostenimiento', visible: capasVisibles.sostenimiento },
    { name: 'actividades', label: 'Actividades', visible: capasVisibles.actividades },
    { name: 'zonasCodisec',   label: 'Comunas',         visible: capasVisibles.zonasCodisec,   codisecOnly: true },
    { name: 'jurisdicciones', label: 'Jurisdicciones',  visible: capasVisibles.jurisdicciones },
    ...PNP_TIPOS.map(t => ({ name: t.key, label: t.label, visible: capasVisibles[t.key] })),
  ];

  // Las capas visibles en el panel se filtran por los permisos de capa del rol actual
  const capas = todasLasCapas.filter(capa => hasLayerAccess(capa.name));

  const handleToggle = useCallback(nombre => {
    setCapasVisibles(prev => {
      let updated = { ...prev, [nombre]: !prev[nombre] };

      // Zonas geográficas: exclusividad mutua
      if (nombre === 'jurisdicciones' && updated.jurisdicciones) {
        updated.zonasCodisec = false;
      }
      if (nombre === 'zonasCodisec' && updated.zonasCodisec) {
        updated.jurisdicciones = false;
      }

      // Si se activa
      if (!prev[nombre]) {
        // Usar payloadFiltros si existe, sino inicializar con objeto vacío para usar fechas por defecto
        const filtrosIniciales = payloadFiltros || {};
        if (nombre === 'robos' || PATRIMONIO_SUBTIPO_KEYS.includes(nombre)) setFiltrosRobos(filtrosIniciales);
        if (nombre === 'extorsiones') setFiltrosExtorsion(filtrosIniciales);
        if (nombre === 'homicidios') setFiltrosHomicidios(filtrosIniciales);
        if (nombre === 'feminicidios') setFiltrosFeminicidios(filtrosIniciales);
        if (nombre === 'sicariatos') setFiltrosSicariatos(filtrosIniciales);
        if (nombre === 'secuestros') setFiltrosSecuestros(filtrosIniciales);
        if (nombre === 'drogas') setFiltrosDrogas(filtrosIniciales);
        if (nombre === 'barras') setFiltrosBarras(filtrosIniciales);
      } else {
        // Si se desactiva, fuerza vaciado con payload con guiones
        if (nombre === 'robos' || PATRIMONIO_SUBTIPO_KEYS.includes(nombre)) {
          const othersActive = (nombre !== 'robos' && updated.robos) ||
            PATRIMONIO_SUBTIPO_KEYS.filter(k => k !== nombre).some(k => updated[k]);
          if (!othersActive) setFiltrosRobos(payloadVacio);
        }
        if (nombre === 'extorsiones') setFiltrosExtorsion(payloadVacio);
        if (nombre === 'homicidios') setFiltrosHomicidios(payloadVacio);
        if (nombre === 'feminicidios') setFiltrosFeminicidios(payloadVacio);
        if (nombre === 'sicariatos') setFiltrosSicariatos(payloadVacio);
        if (nombre === 'secuestros') setFiltrosSecuestros(payloadVacio);
        if (nombre === 'drogas') setFiltrosDrogas(payloadVacio);
        if (nombre === 'barras') setFiltrosBarras(payloadVacio);
      }

      return updated;
    });
  }, [payloadFiltros]);

  const handleFiltrarPnp = useCallback(payload => {
    setFiltrosPnp(payload);
  }, []);

  const handleLimpiarPnp = useCallback(() => {
    setFiltrosPnp(null);
  }, []);

  const anyPnpVisible = PNP_TIPOS.some(t => capasVisibles[t.key]);

  const mapCenter = [-11.9699, -76.998];
  const mapZoom = 13.1;
  const mapStyle = { height: '100vh', width: '100%', position: 'relative', zIndex: 1 };

  return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Filtros bottom-left: apilan verticalmente cuando ambos están activos */}
        {((capasVisibles.robos || capasVisibles.extorsiones || capasVisibles.homicidios ||
          capasVisibles.feminicidios || capasVisibles.sicariatos || capasVisibles.secuestros ||
          capasVisibles.drogas || capasVisibles.barras ||
          PATRIMONIO_SUBTIPO_KEYS.some(k => capasVisibles[k])) || anyPnpVisible) ? (
          <div style={{
            position: 'fixed',
            bottom: 10,
            left: 'calc(var(--sidebar-width, 70px) + 15px)',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 10,
            alignItems: 'flex-start',
            zIndex: 100,
            pointerEvents: 'none',
          }}>
            {(capasVisibles.robos || capasVisibles.extorsiones || capasVisibles.homicidios ||
              capasVisibles.feminicidios || capasVisibles.sicariatos || capasVisibles.secuestros ||
              capasVisibles.drogas || capasVisibles.barras ||
              PATRIMONIO_SUBTIPO_KEYS.some(k => capasVisibles[k])) && (
              <div style={{ pointerEvents: 'auto' }}>
                <FiltroIncidentes onFiltrar={handleFiltrar} onLimpiar={handleLimpiar} />
              </div>
            )}
            {anyPnpVisible && (
              <div style={{ pointerEvents: 'auto' }}>
                <FiltroIncidenciasPNP onFiltrar={handleFiltrarPnp} onLimpiar={handleLimpiarPnp} />
              </div>
            )}
          </div>
        ) : null}
        <div className="map-view-inner">
          <LayerTogglePanel
            capas={capas}
            onToggle={handleToggle}
          />
      <ControlBusqueda
        visible={capasVisibles.busquedaDirecciones}
        onBusquedaRealizada={handleBusquedaRealizada}
        mapType={mapType}
        topPosition={10}
      />
      <ControlRutas
        visible={capasVisibles.rutas}
        onLimpiarRuta={handleLimpiarRuta}
        rutaInfo={rutaInfo}
        mapType={mapType}
        topPosition={capasVisibles.busquedaDirecciones ? 450 : 10}
      />
      {canSeeCamaras && (
        <ControlCamaras
          visible={capasVisibles.camaras}
          onCamaraSeleccionada={handleCamaraSeleccionada}
          onFiltroAplicado={handleFiltrosCamaras}
          onSeguimientoCamara={handleSeguimientoCamara}
          onLimpiarSeguimiento={handleLimpiarSeguimiento}
          onLimpiarSeleccion={handleLimpiarSeleccion}
          mapType={mapType}
          isViewer={isViewer}
          topPosition={
            (capasVisibles.busquedaDirecciones ? 450 : 0) +
            (capasVisibles.rutas ? 280 : 0) +
            10
          }
        />
      )}
      <ControlClusters
        visible={capasVisibles.clusters}
        mapType={mapType}
        topPosition={
          (capasVisibles.busquedaDirecciones ? 450 : 0) +
          (capasVisibles.rutas ? 280 : 0) +
          (capasVisibles.camaras ? 100 : 0) +
          10
        }
      />
      <ControlClusterCombinado
        visible={capasVisibles.clusterCombinado}
        clusterNormalVisible={capasVisibles.clusters}
        radio={radioClusterCombinado}
        setRadio={setRadioClusterCombinado}
        fechas={fechasClusterCombinado}
        setFechas={setFechasClusterCombinado}
        mapType={mapType}
      />
      <ControlClusterPNP
        visible={capasVisibles.clusterPNP}
        radio={radioClusterPNP}
        setRadio={setRadioClusterPNP}
        fechas={fechasClusterPNP}
        setFechas={setFechasClusterPNP}
        clusterNormalVisible={capasVisibles.clusters}
        clusterCombinadoVisible={capasVisibles.clusterCombinado}
      />

      {mapType === 'leaflet' ? (
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={mapStyle}
          minZoom={5}
          maxZoom={20}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
          />
          {/* Pane para incidencias: encima de polígonos (overlayPane=400) pero bajo marcadores (600) */}
          <Pane name="incidenciasPane" style={{ zIndex: 420 }} />
          {capasVisibles.jurisdicciones && (
            <CapaJurisdiccion
              ubicadorActivo={
                capasVisibles.ubicadorPunto ||
                capasVisibles.busquedaDirecciones ||
                capasVisibles.rutas
              }
              camaraConVision={camaraConVision}
              camaraSeleccionada={camaraSeleccionada}
            />
          )}
          {canSeeCamaras && (
            <CapaCamarasMunicipales
              visible={capasVisibles.camaras}
              camaraSeleccionada={camaraSeleccionada}
              camarasFiltradas={camarasFiltradas}
              filtrosCamaras={filtrosCamaras}
              seguimientoCamara={seguimientoCamara}
              limpiarSeguimiento={limpiarSeguimiento}
              camaraConVision={camaraConVision}
              setCamaraConVision={setCamaraConVision}
              isViewer={isViewer}
            />
          )}
          {canSeeCamarasVecinales && (
            <CapaCamarasVecinales visible={capasVisibles.camarasVecinales} />
          )}
          <CapaParaderosAutorizados visible={capasVisibles.paraderosAutorizados} />
          <CapaParaderosNoAutorizados visible={capasVisibles.paraderosNoAutorizados} />
          <CapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
          <CapaRoboPersonas   visible={capasVisibles.roboPersonas}   filtros={filtrosRobos} />
          <CapaRoboCasa       visible={capasVisibles.roboCasa}       filtros={filtrosRobos} />
          <CapaRoboGanado     visible={capasVisibles.roboGanado}     filtros={filtrosRobos} />
          <CapaRoboEmpresas   visible={capasVisibles.roboEmpresas}   filtros={filtrosRobos} />
          <CapaRoboVehiculos  visible={capasVisibles.roboVehiculos}  filtros={filtrosRobos} />
          <CapaRoboAutopartes visible={capasVisibles.roboAutopartes} filtros={filtrosRobos} />
          <CapaRoboPasajeros  visible={capasVisibles.roboPasajeros}  filtros={filtrosRobos} />
          <CapaHurtoPersonas  visible={capasVisibles.hurtoPersonas}  filtros={filtrosRobos} />
          <CapaHurtoCasa      visible={capasVisibles.hurtoCasa}      filtros={filtrosRobos} />
          <CapaHurtoGanado    visible={capasVisibles.hurtoGanado}    filtros={filtrosRobos} />
          <CapaHurtoEmpresas  visible={capasVisibles.hurtoEmpresas}  filtros={filtrosRobos} />
          <CapaHurtoVehiculos visible={capasVisibles.hurtoVehiculos} filtros={filtrosRobos} />
          <CapaHurtoPasajeros visible={capasVisibles.hurtoPasajeros} filtros={filtrosRobos} />
          <CapaDanos          visible={capasVisibles.danos}          filtros={filtrosRobos} />
          <CapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
          <CapaHomicidios visible={capasVisibles.homicidios} filtros={filtrosHomicidios} />
          <CapaFeminicidios visible={capasVisibles.feminicidios} filtros={filtrosFeminicidios} />
          <CapaSicariatos visible={capasVisibles.sicariatos} filtros={filtrosSicariatos} />
          <CapaSecuestros visible={capasVisibles.secuestros} filtros={filtrosSecuestros} />
          <CapaDrogas visible={capasVisibles.drogas} filtros={filtrosDrogas} />
          <CapaBarras visible={capasVisibles.barras} filtros={filtrosBarras} />
          <ClusterIncidencias visible={capasVisibles.clusters} filtros={payloadFiltros} />
          <ClusterCombinado visible={capasVisibles.clusterCombinado} radio={radioClusterCombinado} fechas={fechasClusterCombinado} />
          <ClusterIncidenciasPNP visible={capasVisibles.clusterPNP} radio={radioClusterPNP} fechas={fechasClusterPNP} />
          {PNP_TIPOS.map(t => (
            <CapaIncidenciasPNP
              key={t.key}
              visible={capasVisibles[t.key]}
              filtros={filtrosPnp}
              tipo={t.tipo}
            />
          ))}
          <CapaResiduos visible={capasVisibles.residuos} />
          <CapaDefensaCivil visible={capasVisibles.defensaCivil} />
          <CapaComisarias visible={capasVisibles.comisarias} />
          <CapaSostenimiento visible={capasVisibles.sostenimiento} />
          <CapaActividades visible={capasVisibles.actividades} />
          <CapaJurisdiccionCodisec
            visible={capasVisibles.zonasCodisec}
            ubicadorActivo={
              capasVisibles.ubicadorPunto ||
              capasVisibles.busquedaDirecciones ||
              capasVisibles.rutas
            }
            camaraConVision={camaraConVision}
            camaraSeleccionada={camaraSeleccionada}
          />
          <CapaBusquedaDirecciones
            visible={capasVisibles.busquedaDirecciones}
            resultados={resultadosBusqueda}
            resultadoSeleccionado={resultadoSeleccionado}
          />
          <CapaUbicadorPunto visible={capasVisibles.ubicadorPunto} />
          <CapaRutas visible={capasVisibles.rutas} onRutaCalculada={handleRutaCalculada} />
        </MapContainer>
      ) : (
        <GoogleMapWrapper center={mapCenter} zoom={mapZoom} style={mapStyle}>
          {capasVisibles.jurisdicciones && (
            <GoogleCapaJurisdiccion
              ubicadorActivo={
                capasVisibles.ubicadorPunto ||
                capasVisibles.busquedaDirecciones ||
                capasVisibles.rutas
              }
              camaraConVision={camaraConVision}
              camaraSeleccionada={camaraSeleccionada}
            />
          )}
          {canSeeCamaras && (
            <GoogleCapaCamarasMunicipales
              visible={capasVisibles.camaras}
              camaraSeleccionada={camaraSeleccionada}
              camarasFiltradas={camarasFiltradas}
              filtrosCamaras={filtrosCamaras}
              seguimientoCamara={seguimientoCamara}
              limpiarSeguimiento={limpiarSeguimiento}
              camaraConVision={camaraConVision}
              setCamaraConVision={setCamaraConVision}
              isViewer={isViewer}
            />
          )}
          {canSeeCamarasVecinales && (
            <GoogleCapaCamarasVecinales visible={capasVisibles.camarasVecinales} />
          )}
          <GoogleCapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
          <GoogleCapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
          <GoogleCapaHomicidios visible={capasVisibles.homicidios} filtros={filtrosHomicidios} />
          <GoogleCapaFeminicidios visible={capasVisibles.feminicidios} filtros={filtrosFeminicidios} />
          <GoogleCapaSicariatos visible={capasVisibles.sicariatos} filtros={filtrosSicariatos} />
          <GoogleCapaSecuestros visible={capasVisibles.secuestros} filtros={filtrosSecuestros} />
          <GoogleCapaDrogas visible={capasVisibles.drogas} filtros={filtrosDrogas} />
          <GoogleCapaBarras visible={capasVisibles.barras} filtros={filtrosBarras} />
          <GoogleClusterIncidencias visible={capasVisibles.clusters} />
          <GoogleClusterCombinado visible={capasVisibles.clusterCombinado} radio={radioClusterCombinado} fechas={fechasClusterCombinado} />
          <ClusterIncidenciasPNP visible={capasVisibles.clusterPNP} radio={radioClusterPNP} fechas={fechasClusterPNP} />
          {PNP_TIPOS.map(t => (
            <CapaIncidenciasPNP
              key={t.key}
              visible={capasVisibles[t.key]}
              filtros={filtrosPnp}
              tipo={t.tipo}
            />
          ))}
          <GoogleCapaResiduos visible={capasVisibles.residuos} />
          <CapaComisarias visible={capasVisibles.comisarias} />
          <GoogleCapaActividades visible={capasVisibles.actividades} />
          <GoogleCapaJurisdiccionCodisec
            visible={capasVisibles.zonasCodisec}
            ubicadorActivo={
              capasVisibles.ubicadorPunto ||
              capasVisibles.busquedaDirecciones ||
              capasVisibles.rutas
            }
            camaraConVision={camaraConVision}
            camaraSeleccionada={camaraSeleccionada}
          />
          <GoogleCapaBusquedaDirecciones
            visible={capasVisibles.busquedaDirecciones}
            resultados={resultadosBusqueda}
            resultadoSeleccionado={resultadoSeleccionado}
          />
          <GoogleCapaUbicadorPunto visible={capasVisibles.ubicadorPunto} />
          <GoogleRoutesCalculator
            visible={capasVisibles.rutas}
            onRouteCalculated={handleRutaCalculada}
            onClearRoute={() => setRutaInfo(null)}
            includeTraffic={true}
            optimizeWaypoints={true}
          />
          {/* Capas de Google Maps - Requiere API Key configurada */}
        </GoogleMapWrapper>
      )}

          {/* Leyenda de Cámaras Vecinales */}
          {canSeeCamarasVecinales && (
            <LeyendaCamaras
              camarasVecinalesVisible={capasVisibles.camarasVecinales}
              isPanelExpanded={false}
            />
          )}

          {/* Leyenda de Cámaras Municipales */}
          {canSeeCamaras && !isViewer && (
            <LeyendaCamarasMunicipales
              visible={capasVisibles.camaras}
              isPanelExpanded={false}
              vecinalesVisible={capasVisibles.camarasVecinales}
            />
          )}
        </div>
      </div>
  );
};

export default MapView;
