import { MapContainer, TileLayer } from 'react-leaflet';
import { useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar/Sidebar';
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
import CapaResiduos from './components/capas/Residuos/CapaResiduos';
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
import GoogleCapaResiduos from './components/googlemaps/GoogleCapaResiduos';
import GoogleCapaBusquedaDirecciones from './components/googlemaps/GoogleCapaBusquedaDirecciones';
import GoogleCapaUbicadorPunto from './components/googlemaps/GoogleCapaUbicadorPuntos/GoogleCapaUbicadorPunto';
import GoogleClusterIncidencias from './components/googlemaps/GoogleClusterIncidencias';
import LeyendaCamaras from './components/capas/LeyendaCamaras/LeyendaCamaras';

const App = () => {
  const [mapType, setMapType] = useState('leaflet'); // 'leaflet' o 'google'
  const [capasVisibles, setCapasVisibles] = useState({
    camaras: false,
    camarasVecinales: false,
    paraderosAutorizados: false,
    paraderosNoAutorizados: false,
    robos: false,
    extorsiones: false,
    residuos: false,
    defensaCivil: false,
    clusters: false,
    busquedaDirecciones: false,
    ubicadorPunto: false,
    coordenadasNuevas: false,
    rutas: false,
  });

  const [payloadFiltros, setPayloadFiltros] = useState(null);
  const [filtrosRobos, setFiltrosRobos] = useState(null);
  const [filtrosExtorsion, setFiltrosExtorsion] = useState(null);
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

  const payloadVacio = {
    Año: '',
    Mes: '',
    Turno: '',
    Dia: '',
    Horario: '',
    Jurisdiccion: '',
  };

  const handleFiltrar = payload => {
    setPayloadFiltros(payload);
    if (capasVisibles.robos) setFiltrosRobos(payload);
    else setFiltrosRobos(payloadVacio);

    if (capasVisibles.extorsiones) setFiltrosExtorsion(payload);
    else setFiltrosExtorsion(payloadVacio);
  };

  const handleLimpiar = () => {
    setFiltrosRobos(payloadVacio);
    setFiltrosExtorsion(payloadVacio);
  };

  const handleBusquedaRealizada = (resultados, idSeleccionado) => {
    setResultadosBusqueda(resultados);
    setResultadoSeleccionado(idSeleccionado);
  };

  const handleToggleMarcador = () => {
    setMarcadorActivo(!marcadorActivo);
  };

  const handleAgregarPunto = nuevoPunto => {
    setPuntosUsuario(prevPuntos => {
      // Si el punto ya existe (mismo ID), actualizarlo; si no, agregarlo
      const existe = prevPuntos.find(p => p.id === nuevoPunto.id);
      if (existe) {
        return prevPuntos.map(p => (p.id === nuevoPunto.id ? nuevoPunto : p));
      } else {
        return [...prevPuntos, nuevoPunto];
      }
    });
  };

  const handleEliminarPunto = puntoId => {
    setPuntosUsuario(prevPuntos => prevPuntos.filter(p => p.id !== puntoId));
  };

  const handleRutaCalculada = infoRuta => {
    setRutaInfo(infoRuta);
  };

  const handleLimpiarRuta = () => {
    setRutaInfo(null);
    // Crear un evento personalizado para notificar a los componentes de mapa
    window.dispatchEvent(new CustomEvent('clearRoute'));
  };

  const handleCamaraSeleccionada = camara => {
    setCamaraSeleccionada(camara);
  };

  const handleFiltrosCamaras = (camarasFiltradas, filtros) => {
    setCamarasFiltradas(camarasFiltradas);
    setFiltrosCamaras(filtros);
  };

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

  const capas = [
    { name: 'camaras', label: '📷 Cámaras Municipales', visible: capasVisibles.camaras },
    {
      name: 'camarasVecinales',
      label: '📹 Cámaras Vecinales',
      visible: capasVisibles.camarasVecinales,
    },
    { name: 'robos', label: '🦹 Robos', visible: capasVisibles.robos },
    { name: 'extorsiones', label: '📞 Extorsiones', visible: capasVisibles.extorsiones },
    { name: 'clusters', label: '🎯 Clusters de Incidencias', visible: capasVisibles.clusters },
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
  ];

  const handleToggle = nombre => {
    setCapasVisibles(prev => {
      const updated = { ...prev, [nombre]: !prev[nombre] };

      // Si se activa
      if (!prev[nombre]) {
        if (nombre === 'robos' && payloadFiltros) setFiltrosRobos(payloadFiltros);
        if (nombre === 'extorsiones' && payloadFiltros) setFiltrosExtorsion(payloadFiltros);
      } else {
        // Si se desactiva, fuerza vaciado con payload con guiones
        if (nombre === 'robos') setFiltrosRobos(payloadVacio);
        if (nombre === 'extorsiones') setFiltrosExtorsion(payloadVacio);
      }

      return updated;
    });
  };

  const mapCenter = [-11.9699, -76.998];
  const mapZoom = 13.1;
  const mapStyle = { height: '100vh', width: '100%' };

  return (
    <ProtectedRoute>
      <div className="app-container">
        <Sidebar />
        {(capasVisibles.robos || capasVisibles.extorsiones) && (
          <FiltroIncidentes onFiltrar={handleFiltrar} onLimpiar={handleLimpiar} />
        )}
        <div className="main-content">
          <LayerTogglePanel
        capas={capas}
        onToggle={handleToggle}
        mapType={mapType}
        onMapTypeChange={setMapType}
      />
      <ControlClusters
        visible={capasVisibles.clusters}
        radioCluster={radioCluster}
        onRadioChange={setRadioCluster}
        mapType={mapType}
      />
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
          <CapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
          <CapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
          <CapaResiduos visible={capasVisibles.residuos} />
          <CapaDefensaCivil visible={capasVisibles.defensaCivil} />
          <CapaCoordenadasNuevas
            visible={capasVisibles.coordenadasNuevas}
            marcadorActivo={marcadorActivo}
            puntosUsuario={puntosUsuario}
            onAgregarPunto={handleAgregarPunto}
          />
          <ClusterIncidencias
            visible={capasVisibles.clusters}
            radioCluster={radioCluster}
            filtros={payloadFiltros}
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
          <GoogleCapaRobos visible={capasVisibles.robos} filtros={filtrosRobos} />
          <GoogleCapaExtorsion visible={capasVisibles.extorsiones} filtros={filtrosExtorsion} />
          <GoogleCapaResiduos visible={capasVisibles.residuos} />
          <GoogleClusterIncidencias
            visible={capasVisibles.clusters}
            radioCluster={radioCluster}
            filtros={payloadFiltros}
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

          {/* Leyenda de Cámaras */}
          <LeyendaCamaras
            camarasVecinalesVisible={capasVisibles.camarasVecinales}
            camarasMunicipalesVisible={capasVisibles.camaras}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default App;
