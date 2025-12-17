import { MapContainer, TileLayer } from 'react-leaflet';
import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import authService from './services/authService';
import CapaJurisdiccion from './components/capas/Jurisdiccion/CapaJurisdiccion';
import CapaCamarasMunicipales from './components/capas/CamarasMunicipales/CapaCamarasMunicipales';
import CapaCamarasVecinales from './components/capas/CamarasVecinales/CapaCamarasVecinales';
import CapaParaderosAutorizados from './components/capas/Paraderos/CapaParaderosAutorizados';
import CapaParaderosNoAutorizados from './components/capas/Paraderos/CapaParaderosNoAutorizados';
import CapaDefensaCivil from './components/capas/DefensaCivil/CapaDefensaCivil';
import CapaRobos from './components/capas/Incidencias/CapaRobos';
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
import CapaCoordenadasNuevas from './components/capas/CoordenadasNuevas/CapaCoordenadasNuevas';
import ClusterIncidencias from './components/capas/ClusterIncidencias/ClusterIncidencias';
import ControlClusters from './components/Controles/Mapa_Clusters/ControlClusters';
import FiltroGiro from './components/filtros/FiltroGiro';
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
import GoogleClusterIncidencias from './components/googlemaps/GoogleClusterIncidencias';
import LeyendaCamaras from './components/capas/LeyendaCamaras/LeyendaCamaras';

const MapView = () => {
  const { user } = useAuth();
  const userRole = user?.role;
  const isOperator = userRole === 'OPERATOR';

  const [mapType, setMapType] = useState('leaflet'); // 'leaflet' o 'google'
  const [capasVisibles, setCapasVisibles] = useState({
    camaras: true, // Visible por defecto
    camarasVecinales: false,
    paraderosAutorizados: false,
    paraderosNoAutorizados: false,
    robos: false,
    extorsiones: false,
    homicidios: false,
    feminicidios: false,
    sicariatos: false,
    secuestros: false,
    drogas: false,
    barras: false,
    residuos: false,
    defensaCivil: false,
    sostenimiento: false,
    clusters: false,
    busquedaDirecciones: false,
    ubicadorPunto: false,
    coordenadasNuevas: false,
    rutas: false,
  });

  const [payloadFiltros, setPayloadFiltros] = useState(null);
  const [filtrosRobos, setFiltrosRobos] = useState(null);
  const [filtrosExtorsion, setFiltrosExtorsion] = useState(null);
  const [filtrosHomicidios, setFiltrosHomicidios] = useState(null);
  const [filtrosFeminicidios, setFiltrosFeminicidios] = useState(null);
  const [filtrosSicariatos, setFiltrosSicariatos] = useState(null);
  const [filtrosSecuestros, setFiltrosSecuestros] = useState(null);
  const [filtrosDrogas, setFiltrosDrogas] = useState(null);
  const [filtrosBarras, setFiltrosBarras] = useState(null);
  const [radioCluster, setRadioCluster] = useState(50);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);
  const [puntosUsuario, setPuntosUsuario] = useState([]);
  const [marcadorActivo, setMarcadorActivo] = useState(false);
  const [rutaInfo, setRutaInfo] = useState(null);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(null);
  const [camarasFiltradas, setCamarasFiltradas] = useState([]);
  const [, setFiltrosCamaras] = useState(null);
  const [seguimientoCamara, setSeguimientoCamara] = useState(null);
  const [limpiarSeguimiento, setLimpiarSeguimiento] = useState(null);
  const [camaraConVision, setCamaraConVision] = useState(null); // Track camera with vision field active
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

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
    if (capasVisibles.robos) setFiltrosRobos(payload);
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
    { name: 'camaras', label: '📷 Cámaras Municipales', visible: capasVisibles.camaras },
    {
      name: 'camarasVecinales',
      label: '📹 Cámaras Vecinales',
      visible: capasVisibles.camarasVecinales,
    },
    { name: 'robos', label: '🦹 Robos', visible: capasVisibles.robos, restrictedForOperator: true },
    { name: 'extorsiones', label: '📞 Extorsiones', visible: capasVisibles.extorsiones, restrictedForOperator: true },
    { name: 'homicidios', label: '🔪 Homicidios', visible: capasVisibles.homicidios, restrictedForOperator: true },
    { name: 'feminicidios', label: '👩 Feminicidios', visible: capasVisibles.feminicidios, restrictedForOperator: true },
    { name: 'sicariatos', label: '🔫 Sicariatos', visible: capasVisibles.sicariatos, restrictedForOperator: true },
    { name: 'secuestros', label: '👤 Secuestros', visible: capasVisibles.secuestros, restrictedForOperator: true },
    { name: 'drogas', label: '💊 Drogas', visible: capasVisibles.drogas, restrictedForOperator: true },
    { name: 'barras', label: '⚽ Barras', visible: capasVisibles.barras, restrictedForOperator: true },
    { name: 'clusters', label: '🎯 Clusters de Incidencias', visible: capasVisibles.clusters, restrictedForOperator: true },
    {
      name: 'busquedaDirecciones',
      label: '🔍 Búsqueda de Direcciones',
      visible: capasVisibles.busquedaDirecciones,
    },
    { name: 'ubicadorPunto', label: '📍 Ubicador de Puntos', visible: capasVisibles.ubicadorPunto },
    {
      name: 'coordenadasNuevas',
      label: '🔵 Coordenadas Nuevas',
      visible: capasVisibles.coordenadasNuevas,
    },
    { name: 'rutas', label: '🛣️ Calculador de Rutas', visible: capasVisibles.rutas },
    {
      name: 'paraderosAutorizados',
      label: '🛵 Paraderos Autorizados',
      visible: capasVisibles.paraderosAutorizados,
    },
    { name: 'defensaCivil', label: '🏢 Defensa Civil', visible: capasVisibles.defensaCivil },
    {
      name: 'paraderosNoAutorizados',
      label: '🚫 Paraderos No Autorizados',
      visible: capasVisibles.paraderosNoAutorizados,
    },
    { name: 'residuos', label: '🗑️ Puntos Residuos Sólidos', visible: capasVisibles.residuos },
    { name: 'sostenimiento', label: '🏪 Sostenimiento', visible: capasVisibles.sostenimiento },
  ];

  // Filtrar capas según el rol del usuario
  const capas = isOperator
    ? todasLasCapas.filter(capa => !capa.restrictedForOperator)
    : todasLasCapas;

  const handleToggle = useCallback(nombre => {
    setCapasVisibles(prev => {
      const updated = { ...prev, [nombre]: !prev[nombre] };

      // Si se activa
      if (!prev[nombre]) {
        // Usar payloadFiltros si existe, sino inicializar con objeto vacío para usar fechas por defecto
        const filtrosIniciales = payloadFiltros || {};
        if (nombre === 'robos') setFiltrosRobos(filtrosIniciales);
        if (nombre === 'extorsiones') setFiltrosExtorsion(filtrosIniciales);
        if (nombre === 'homicidios') setFiltrosHomicidios(filtrosIniciales);
        if (nombre === 'feminicidios') setFiltrosFeminicidios(filtrosIniciales);
        if (nombre === 'sicariatos') setFiltrosSicariatos(filtrosIniciales);
        if (nombre === 'secuestros') setFiltrosSecuestros(filtrosIniciales);
        if (nombre === 'drogas') setFiltrosDrogas(filtrosIniciales);
        if (nombre === 'barras') setFiltrosBarras(filtrosIniciales);
      } else {
        // Si se desactiva, fuerza vaciado con payload con guiones
        if (nombre === 'robos') setFiltrosRobos(payloadVacio);
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

  const mapCenter = [-11.9699, -76.998];
  const mapZoom = 13.1;
  const mapStyle = { height: '100vh', width: '100%', position: 'relative', zIndex: 1 };

  return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {!isOperator && (capasVisibles.robos || capasVisibles.extorsiones || capasVisibles.homicidios ||
          capasVisibles.feminicidios || capasVisibles.sicariatos || capasVisibles.secuestros ||
          capasVisibles.drogas || capasVisibles.barras) && (
          <FiltroIncidentes onFiltrar={handleFiltrar} onLimpiar={handleLimpiar} />
        )}
        <div className="main-content">
          <LayerTogglePanel
        capas={capas}
        onToggle={handleToggle}
        mapType={mapType}
        onMapTypeChange={setMapType}
        onExpandChange={setIsPanelExpanded}
      />
      {!isOperator && (
        <ControlClusters
          visible={capasVisibles.clusters}
          radioCluster={radioCluster}
          onRadioChange={setRadioCluster}
          mapType={mapType}
        />
      )}
      <ControlBusqueda
        visible={capasVisibles.busquedaDirecciones}
        onBusquedaRealizada={handleBusquedaRealizada}
        mapType={mapType}
      />
      <ControlMarcadorCamaras
        visible={capasVisibles.coordenadasNuevas}
        puntosGuardados={puntosUsuario}
        onToggleMarcador={handleToggleMarcador}
        onEliminarPunto={handleEliminarPunto}
        marcadorActivo={marcadorActivo}
        mapType={mapType}
      />
      <ControlRutas
        visible={capasVisibles.rutas}
        onLimpiarRuta={handleLimpiarRuta}
        rutaInfo={rutaInfo}
        mapType={mapType}
      />
      <ControlCamaras
        visible={capasVisibles.camaras}
        onCamaraSeleccionada={handleCamaraSeleccionada}
        onFiltroAplicado={handleFiltrosCamaras}
        onSeguimientoCamara={handleSeguimientoCamara}
        onLimpiarSeguimiento={handleLimpiarSeguimiento}
        onLimpiarSeleccion={handleLimpiarSeleccion}
        mapType={mapType}
      />

      {mapType === 'leaflet' ? (
        <MapContainer center={mapCenter} zoom={mapZoom} style={mapStyle}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CapaJurisdiccion
            ubicadorActivo={
              capasVisibles.ubicadorPunto ||
              capasVisibles.busquedaDirecciones ||
              capasVisibles.coordenadasNuevas ||
              capasVisibles.rutas
            }
            camaraConVision={camaraConVision}
            camaraSeleccionada={camaraSeleccionada}
          />
          <CapaCamarasMunicipales
            visible={capasVisibles.camaras}
            camaraSeleccionada={camaraSeleccionada}
            camarasFiltradas={camarasFiltradas}
            seguimientoCamara={seguimientoCamara}
            limpiarSeguimiento={limpiarSeguimiento}
            camaraConVision={camaraConVision}
            setCamaraConVision={setCamaraConVision}
          />
          <CapaCamarasVecinales visible={capasVisibles.camarasVecinales} />
          <CapaParaderosAutorizados visible={capasVisibles.paraderosAutorizados} />
          <CapaParaderosNoAutorizados visible={capasVisibles.paraderosNoAutorizados} />
          {!isOperator && (
            <>
              <CapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
              <CapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
              <CapaHomicidios visible={capasVisibles.homicidios} filtros={filtrosHomicidios} />
              <CapaFeminicidios visible={capasVisibles.feminicidios} filtros={filtrosFeminicidios} />
              <CapaSicariatos visible={capasVisibles.sicariatos} filtros={filtrosSicariatos} />
              <CapaSecuestros visible={capasVisibles.secuestros} filtros={filtrosSecuestros} />
              <CapaDrogas visible={capasVisibles.drogas} filtros={filtrosDrogas} />
              <CapaBarras visible={capasVisibles.barras} filtros={filtrosBarras} />
              <ClusterIncidencias
                visible={capasVisibles.clusters}
                radioCluster={radioCluster}
                filtros={payloadFiltros}
              />
            </>
          )}
          <CapaResiduos visible={capasVisibles.residuos} />
          <CapaDefensaCivil visible={capasVisibles.defensaCivil} />
          <CapaSostenimiento visible={capasVisibles.sostenimiento} />
          <CapaCoordenadasNuevas
            visible={capasVisibles.coordenadasNuevas}
            marcadorActivo={marcadorActivo}
            puntosUsuario={puntosUsuario}
            onAgregarPunto={handleAgregarPunto}
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
          <GoogleCapaJurisdiccion
            ubicadorActivo={
              capasVisibles.ubicadorPunto ||
              capasVisibles.busquedaDirecciones ||
              capasVisibles.coordenadasNuevas ||
              capasVisibles.rutas
            }
            camaraConVision={camaraConVision}
            camaraSeleccionada={camaraSeleccionada}
          />
          <GoogleCapaCamarasMunicipales
            visible={capasVisibles.camaras}
            camaraSeleccionada={camaraSeleccionada}
            camarasFiltradas={camarasFiltradas}
            seguimientoCamara={seguimientoCamara}
            limpiarSeguimiento={limpiarSeguimiento}
            camaraConVision={camaraConVision}
            setCamaraConVision={setCamaraConVision}
          />
          <GoogleCapaCamarasVecinales visible={capasVisibles.camarasVecinales} />
          {!isOperator && (
            <>
              <GoogleCapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
              <GoogleCapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
              <GoogleCapaHomicidios visible={capasVisibles.homicidios} filtros={filtrosHomicidios} />
              <GoogleCapaFeminicidios visible={capasVisibles.feminicidios} filtros={filtrosFeminicidios} />
              <GoogleCapaSicariatos visible={capasVisibles.sicariatos} filtros={filtrosSicariatos} />
              <GoogleCapaSecuestros visible={capasVisibles.secuestros} filtros={filtrosSecuestros} />
              <GoogleCapaDrogas visible={capasVisibles.drogas} filtros={filtrosDrogas} />
              <GoogleCapaBarras visible={capasVisibles.barras} filtros={filtrosBarras} />
              <GoogleClusterIncidencias
                visible={capasVisibles.clusters}
                radioCluster={radioCluster}
                filtros={payloadFiltros}
              />
            </>
          )}
          <GoogleCapaResiduos visible={capasVisibles.residuos} />
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

          {/* Leyenda de Cámaras */}
          <LeyendaCamaras
            camarasVecinalesVisible={capasVisibles.camarasVecinales}
            camarasMunicipalesVisible={capasVisibles.camaras}
            isPanelExpanded={isPanelExpanded}
          />
        </div>
      </div>
  );
};

export default MapView;
