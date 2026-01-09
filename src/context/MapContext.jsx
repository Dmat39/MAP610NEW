import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Context para gestionar el estado global del mapa
 * Centraliza: capas visibles, filtros, búsquedas, puntos de usuario, etc.
 */

const MapContext = createContext(null);

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext debe usarse dentro de MapProvider');
  }
  return context;
};

export const MapProvider = ({ children }) => {
  // ==================== ESTADO DE CAPAS ====================
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
    rutas: false,
  });

  // ==================== FILTROS ====================
  const payloadVacio = {
    Año: '',
    Mes: '',
    Turno: '',
    Dia: '',
    Horario: '',
    Jurisdiccion: '',
  };

  const [payloadFiltros, setPayloadFiltros] = useState(null);
  const [filtrosRobos, setFiltrosRobos] = useState(null);
  const [filtrosExtorsion, setFiltrosExtorsion] = useState(null);
  const [filtrosCamaras, setFiltrosCamaras] = useState(null);

  // Filtro de marcas de cámaras - HIKVISION bloqueadas temporalmente
  const [marcasCamarasVisibles, setMarcasCamarasVisibles] = useState({
    HIKVISION: false,
    DAHUA: true
  });

  // Filtros para tipos de incidencias en clusters - todos activos por defecto
  const [tiposIncidenciasCluster, setTiposIncidenciasCluster] = useState({
    robos: true,
    extorsiones: true,
    homicidios: true,
    feminicidios: true,
    sicariatos: true,
    secuestros: true,
    drogas: true,
    barras: true
  });

  // Fechas para clusters - últimos 30 días por defecto
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      fechaInicio: formatDate(thirtyDaysAgo),
      fechaFin: formatDate(today)
    };
  };

  const [fechasClusters, setFechasClusters] = useState(getDefaultDates());

  // ==================== BÚSQUEDAS Y SELECCIONES ====================
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(null);
  const [camarasFiltradas, setCamarasFiltradas] = useState([]);
  const [seguimientoCamara, setSeguimientoCamara] = useState(null);
  const [limpiarSeguimiento, setLimpiarSeguimiento] = useState(null);
  const [camaraConVision, setCamaraConVision] = useState(null);

  // ==================== PUNTOS Y MARCADORES ====================
  const [puntosUsuario, setPuntosUsuario] = useState([]);
  const [marcadorActivo, setMarcadorActivo] = useState(false);

  // ==================== RUTAS ====================
  const [rutaInfo, setRutaInfo] = useState(null);

  // ==================== CONFIGURACIONES ====================
  const [radioCluster, setRadioCluster] = useState(50);

  // ==================== FUNCIONES DE CONTROL ====================

  /**
   * Toggle de capas con lógica de filtros
   */
  const handleToggleCapa = useCallback(
    nombre => {
      setCapasVisibles(prev => {
        const updated = { ...prev, [nombre]: !prev[nombre] };

        // Si se activa
        if (!prev[nombre]) {
          if (nombre === 'robos' && payloadFiltros) setFiltrosRobos(payloadFiltros);
          if (nombre === 'extorsiones' && payloadFiltros) setFiltrosExtorsion(payloadFiltros);
        } else {
          // Si se desactiva, fuerza vaciado
          if (nombre === 'robos') setFiltrosRobos(payloadVacio);
          if (nombre === 'extorsiones') setFiltrosExtorsion(payloadVacio);
        }

        return updated;
      });
    },
    [payloadFiltros, payloadVacio]
  );

  /**
   * Aplicar filtros de incidencias
   */
  const handleFiltrar = useCallback(
    payload => {
      setPayloadFiltros(payload);
      if (capasVisibles.robos) setFiltrosRobos(payload);
      else setFiltrosRobos(payloadVacio);

      if (capasVisibles.extorsiones) setFiltrosExtorsion(payload);
      else setFiltrosExtorsion(payloadVacio);
    },
    [capasVisibles.robos, capasVisibles.extorsiones, payloadVacio]
  );

  /**
   * Limpiar filtros
   */
  const handleLimpiarFiltros = useCallback(() => {
    setFiltrosRobos(payloadVacio);
    setFiltrosExtorsion(payloadVacio);
  }, [payloadVacio]);

  /**
   * Manejar búsqueda de direcciones
   */
  const handleBusquedaRealizada = useCallback((resultados, idSeleccionado) => {
    setResultadosBusqueda(resultados);
    setResultadoSeleccionado(idSeleccionado);
  }, []);

  /**
   * Toggle de marcador
   */
  const handleToggleMarcador = useCallback(() => {
    setMarcadorActivo(prev => !prev);
  }, []);

  /**
   * Agregar punto de usuario
   */
  const handleAgregarPunto = useCallback(nuevoPunto => {
    setPuntosUsuario(prevPuntos => {
      const existe = prevPuntos.find(p => p.id === nuevoPunto.id);
      if (existe) {
        return prevPuntos.map(p => (p.id === nuevoPunto.id ? nuevoPunto : p));
      } else {
        return [...prevPuntos, nuevoPunto];
      }
    });
  }, []);

  /**
   * Eliminar punto de usuario
   */
  const handleEliminarPunto = useCallback(puntoId => {
    setPuntosUsuario(prevPuntos => prevPuntos.filter(p => p.id !== puntoId));
  }, []);

  /**
   * Manejar ruta calculada
   */
  const handleRutaCalculada = useCallback(infoRuta => {
    setRutaInfo(infoRuta);
  }, []);

  /**
   * Limpiar ruta
   */
  const handleLimpiarRuta = useCallback(() => {
    setRutaInfo(null);
    window.dispatchEvent(new CustomEvent('clearRoute'));
  }, []);

  /**
   * Seleccionar cámara
   */
  const handleCamaraSeleccionada = useCallback(camara => {
    setCamaraSeleccionada(camara);
  }, []);

  /**
   * Aplicar filtros de cámaras
   */
  const handleFiltrosCamaras = useCallback((camarasFiltradas, filtros) => {
    setCamarasFiltradas(camarasFiltradas);
    setFiltrosCamaras(filtros);
  }, []);

  /**
   * Seguimiento de cámara
   */
  const handleSeguimientoCamara = useCallback(camara => {
    setSeguimientoCamara(camara);
    setTimeout(() => setSeguimientoCamara(null), 100);
  }, []);

  /**
   * Limpiar seguimiento
   */
  const handleLimpiarSeguimiento = useCallback(() => {
    setLimpiarSeguimiento(Date.now());
    setTimeout(() => setLimpiarSeguimiento(null), 100);
  }, []);

  /**
   * Limpiar selección de cámara
   */
  const handleLimpiarSeleccion = useCallback(() => {
    setCamaraSeleccionada(null);
    setCamarasFiltradas([]);
    setFiltrosCamaras(null);
  }, []);

  /**
   * Toggle de marca de cámara
   */
  const handleToggleMarcaCamara = useCallback((marca) => {
    setMarcasCamarasVisibles(prev => ({
      ...prev,
      [marca]: !prev[marca]
    }));
  }, []);

  /**
   * Toggle de tipo de incidencia en clusters
   */
  const handleToggleTipoIncidenciaCluster = useCallback((tipo) => {
    setTiposIncidenciasCluster(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  }, []);

  /**
   * Actualizar fechas de clusters
   */
  const handleFechasClustersChange = useCallback((fechas) => {
    setFechasClusters(fechas);
  }, []);

  // ==================== VALOR DEL CONTEXT ====================
  const value = {
    // Estado
    capasVisibles,
    payloadFiltros,
    filtrosRobos,
    filtrosExtorsion,
    filtrosCamaras,
    radioCluster,
    resultadosBusqueda,
    resultadoSeleccionado,
    puntosUsuario,
    marcadorActivo,
    rutaInfo,
    camaraSeleccionada,
    camarasFiltradas,
    seguimientoCamara,
    limpiarSeguimiento,
    camaraConVision,
    marcasCamarasVisibles,
    tiposIncidenciasCluster,
    fechasClusters,

    // Setters directos (para casos especiales)
    setCapasVisibles,
    setRadioCluster,
    setCamaraConVision,

    // Funciones de control
    handleToggleCapa,
    handleFiltrar,
    handleLimpiarFiltros,
    handleBusquedaRealizada,
    handleToggleMarcador,
    handleAgregarPunto,
    handleEliminarPunto,
    handleRutaCalculada,
    handleLimpiarRuta,
    handleCamaraSeleccionada,
    handleFiltrosCamaras,
    handleSeguimientoCamara,
    handleLimpiarSeguimiento,
    handleLimpiarSeleccion,
    handleToggleMarcaCamara,
    handleToggleTipoIncidenciaCluster,
    handleFechasClustersChange,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export default MapContext;
