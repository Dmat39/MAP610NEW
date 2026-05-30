import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isDateInRange } from '../utils/dateUtils';
import { logger } from '../utils';

// Función para normalizar texto
const normalizarTexto = texto =>
  (texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Mapeos para convertir filtros a parámetros de API
const mapMes = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const mapTurno = {
  'turno manana': 1,
  'turno tarde': 2,
  'turno noche': 3,
};

const mapDia = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

const mapHorario = {
  '00:00 - 01:59': 1,
  '02:00 - 03:59': 2,
  '04:00 - 05:59': 3,
  '06:00 - 07:59': 4,
  '08:00 - 09:59': 5,
  '10:00 - 11:59': 6,
  '12:00 - 13:59': 7,
  '14:00 - 15:59': 8,
  '16:00 - 17:59': 9,
  '18:00 - 19:59': 10,
  '20:00 - 21:59': 11,
  '22:00 - 23:59': 12,
};

const mapJurisdiccion = {
  'caja de agua': 1,
  zarate: 2,
  huayrona: 3,
  'canto rey': 4,
  'santa elizabeth': 5,
  bayovar: 6,
  'mariscal caceres': 7,
  '10 de octubre': 8,
};

// Función para obtener fechas por defecto (últimos 30 días)
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
    start: formatDate(thirtyDaysAgo),
    end: formatDate(today)
  };
};

// Función para construir parámetros de consulta para el nuevo endpoint /incidence
const buildQueryParams = (filtros, tipo, subtipo) => {
  const params = new URLSearchParams();

  // Parámetro obligatorio type (tipología)
  params.append('type', tipo);

  // Parámetro opcional subtype (subtipología específica)
  if (subtipo) params.append('subtype', subtipo);

  // Parámetros de fecha - usar fechas por defecto si no se proporcionan o están vacías
  const defaultDates = getDefaultDates();
  const startDate = (filtros?.fechaInicio && filtros.fechaInicio.trim() !== '')
    ? filtros.fechaInicio
    : defaultDates.start;
  const endDate = (filtros?.fechaFin && filtros.fechaFin.trim() !== '')
    ? filtros.fechaFin
    : defaultDates.end;

  params.append('start', startDate);
  params.append('end', endDate);

  // Parámetros opcionales de filtrado
  if (filtros?.Turno) {
    const turnoId = mapTurno[normalizarTexto(filtros.Turno)];
    if (turnoId) params.append('shift', turnoId);
  }

  if (filtros?.Horario) {
    const horarioId = mapHorario[normalizarTexto(filtros.Horario)];
    if (horarioId) params.append('schedule', horarioId);
  }

  if (filtros?.Jurisdiccion) {
    const jurisdiccionId = mapJurisdiccion[normalizarTexto(filtros.Jurisdiccion)];
    if (jurisdiccionId) params.append('jurisdiction', jurisdiccionId);
  }

  return params.toString();
};

// Nombres de tipologías para logging
const tipologiaNombres = {
  1: 'Homicidio/Feminicidio/Sicariato',
  2: 'Secuestro/Extorsión',
  3: 'Robo/Patrimonio',
  5: 'Drogas',
  7: 'Barras/Tranquilidad',
};

// Función para hacer la petición a la API con timeout
const fetchIncidencias = async (filtros, tipo, subtipo) => {
  const API_URL = import.meta.env.VITE_API_URL;
  if (!API_URL) {
    throw new Error('VITE_API_URL no está configurada. Por favor, define la variable de entorno.');
  }
  const TOKEN = localStorage.getItem('token'); // Obtener token del localStorage
  const queryString = buildQueryParams(filtros, tipo, subtipo);
  const url = `${API_URL}incidence?${queryString}`;

  logger.log(`Fetching ${tipologiaNombres[tipo] || `tipo ${tipo}`} from API:`, url);
  // logger.log(`🔑 Token presente:`, TOKEN ? `Sí (${TOKEN.substring(0, 20)}...)` : 'No'); // COMENTADO: No exponer token en producción

  const headers = {
    'Content-Type': 'application/json',
  };

  // Agregar token si existe
  if (TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  } else {
    logger.warn('⚠️ No se encontró token en localStorage');
  }

  // Crear AbortController para timeout de 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Error HTTP ${response.status}:`, errorText);
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Log completo de la respuesta para debugging
    logger.log(`📦 Respuesta completa del backend para ${tipologiaNombres[tipo]}:`, result);

    // Manejar la estructura de respuesta del backend: { message: "", data: { count: N, data: [...] } }
    let rawData = [];
    if (result.data && Array.isArray(result.data.data)) {
      rawData = result.data.data;
      logger.log(`✅ Datos extraídos: ${rawData.length} registros`);
    } else {
      // Fallback para otras estructuras posibles
      rawData = result.result || result.data || result || [];
      logger.warn(`⚠️ Estructura de respuesta diferente, usando fallback. Datos: ${rawData.length} registros`);
    }

    logger.log(`📊 Raw data obtenida (${rawData.length} registros):`, rawData.slice(0, 2)); // Log primeros 2 registros

    // Normalizar los campos del backend al formato esperado por los componentes
    // Backend: code, latitude, longitude, description, date, hour, shift, schedule, jurisdiction
    // Componentes: codigo_incidencia, Latitud, Longitud, Descripcion, Fecha, Hora, Turno, Horario, Jurisdiccion
    const normalizedData = rawData.map(item => ({
      codigo_incidencia: item.code || item.codigo_incidencia || '',
      Latitud: item.latitude || item.Latitud || 0,
      Longitud: item.longitude || item.Longitud || 0,
      Descripcion: item.description || item.Descripcion || '',
      Fecha: item.date || item.Fecha || '',
      Hora: item.hour || item.Hora || '',
      Turno: item.shift || item.Turno || '',
      Horario: item.schedule || item.Horario || '',
      Jurisdiccion: item.jurisdiction || item.Jurisdiccion || '',
    }));

    logger.log(`🔄 Datos normalizados (${normalizedData.length} registros):`, normalizedData.slice(0, 2));

    return normalizedData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      logger.error(`⏱️ Timeout después de 30 segundos para ${tipologiaNombres[tipo]}`);
      throw new Error(`La petición tardó demasiado (timeout 30s)`);
    }

    logger.error(`❌ Error en fetch para ${tipologiaNombres[tipo]}:`, error);
    throw error;
  }
};

// Función para aplicar filtros adicionales (ya no es necesaria porque el backend filtra)
// NOTA: El backend ya filtra por fechas, turno, horario y jurisdicción
// Esta función se mantiene por compatibilidad pero ya no filtra nada
const applyAdditionalFilters = (data, filtros) => {
  // El backend ya aplicó todos los filtros, solo retornamos los datos
  logger.log(`📋 Aplicando filtros adicionales (backend ya filtró): ${data.length} registros`);
  return data;
};

// Hook genérico para cualquier tipología
const useTypologyQuery = (tipo, subtipo, nombreEvento, filtros, enabled = true) => {
  const queryKey = [nombreEvento, filtros];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchIncidencias(filtros, tipo, subtipo),
    enabled: enabled && filtros !== null,
    select: data => {
      const filteredData = applyAdditionalFilters(data, filtros);
      logger.log(`${nombreEvento} procesados:`, filteredData.length);
      return filteredData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutos (más apropiado para datos de incidencias)
    cacheTime: 60 * 60 * 1000, // 1 hora (datos se mantienen en cache)
    retry: 2, // Solo 2 reintentos en lugar de 3 por defecto
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Delay exponencial: 1s, 2s, 4s...
    refetchOnWindowFocus: false, // No re-fetch al volver a la ventana
    refetchOnMount: false, // No re-fetch al montar si ya hay datos en cache
    refetchOnReconnect: true, // Re-fetch al reconectar internet
  });

  useEffect(() => {
    if (enabled && query.isSuccess && query.data) {
      window.dispatchEvent(
        new CustomEvent(nombreEvento, {
          detail: query.data.length,
        })
      );
    } else if (!enabled || query.isError) {
      window.dispatchEvent(
        new CustomEvent(nombreEvento, {
          detail: 0,
        })
      );
    }
  }, [enabled, query.data, query.isSuccess, query.isError, nombreEvento]);

  return query;
};

// Hook para consultas de robos (tipo 3 = PATRIMONIO, subtipos 10-16 = robos)
export const useRobosQuery = (filtros, enabled = true) => {
  return useTypologyQuery(3, null, 'robosTotal', filtros, enabled);
};

// Hook para consultas de extorsiones (tipo 3 = PATRIMONIO, subtipo 24 = extorsión/chantaje)
export const useExtorsionesQuery = (filtros, enabled = true) => {
  return useTypologyQuery(3, 24, 'extorsionTotal', filtros, enabled);
};

// Hook para consultas de homicidios (tipo 1 = VIDA, subtipo 1 = homicidio)
export const useHomicidiosQuery = (filtros, enabled = true) => {
  return useTypologyQuery(1, 1, 'homicidiosTotal', filtros, enabled);
};

// Hook para consultas de feminicidios (tipo 1 = VIDA, subtipo 2 = feminicidio)
export const useFeminicidiosQuery = (filtros, enabled = true) => {
  return useTypologyQuery(1, 2, 'feminicidiosTotal', filtros, enabled);
};

// Hook para consultas de sicariatos (tipo 1 = VIDA, subtipo 3 = sicariato)
export const useSicariatosQuery = (filtros, enabled = true) => {
  return useTypologyQuery(1, 3, 'sicariatosTotal', filtros, enabled);
};

// Hook para consultas de secuestros (tipo 2 = LIBERTAD, subtipo 6 = secuestro)
export const useSecuestrosQuery = (filtros, enabled = true) => {
  return useTypologyQuery(2, 6, 'secuestrosTotal', filtros, enabled);
};

// Hook para consultas de drogas (tipo 5 = SALUD PÚBLICA, subtipo 28 = tráfico ilícito)
export const useDrogasQuery = (filtros, enabled = true) => {
  return useTypologyQuery(5, 28, 'drogasTotal', filtros, enabled);
};

// Hook para consultas de barras (tipo 7 = TRANQUILIDAD PÚB., subtipo 31 = bandas/barras)
export const useBarrasQuery = (filtros, enabled = true) => {
  return useTypologyQuery(7, 31, 'barrasTotal', filtros, enabled);
};

// ── Subtipos de Robo (tipo 3) ─────────────────────────────────────────────────
export const useRoboPersonasQuery   = (f, e=true) => useTypologyQuery(3, 10, 'roboPersonasTotal',   f, e);
export const useRoboCasaQuery       = (f, e=true) => useTypologyQuery(3, 11, 'roboCasaTotal',       f, e);
export const useRoboGanadoQuery     = (f, e=true) => useTypologyQuery(3, 12, 'roboGanadoTotal',     f, e);
export const useRoboEmpresasQuery   = (f, e=true) => useTypologyQuery(3, 13, 'roboEmpresasTotal',   f, e);
export const useRoboVehiculosQuery  = (f, e=true) => useTypologyQuery(3, 14, 'roboVehiculosTotal',  f, e);
export const useRoboAutopartesQuery = (f, e=true) => useTypologyQuery(3, 15, 'roboAutopartesTotal', f, e);
export const useRoboPasajerosQuery  = (f, e=true) => useTypologyQuery(3, 16, 'roboPasajerosTotal',  f, e);
// ── Subtipos de Hurto (tipo 3) ────────────────────────────────────────────────
export const useHurtoPersonasQuery  = (f, e=true) => useTypologyQuery(3, 18, 'hurtoPersonasTotal',  f, e);
export const useHurtoCasaQuery      = (f, e=true) => useTypologyQuery(3, 19, 'hurtoCasaTotal',      f, e);
export const useHurtoGanadoQuery    = (f, e=true) => useTypologyQuery(3, 20, 'hurtoGanadoTotal',    f, e);
export const useHurtoEmpresasQuery  = (f, e=true) => useTypologyQuery(3, 21, 'hurtoEmpresasTotal',  f, e);
export const useHurtoVehiculosQuery = (f, e=true) => useTypologyQuery(3, 22, 'hurtoVehiculosTotal', f, e);
export const useHurtoPasajerosQuery = (f, e=true) => useTypologyQuery(3, 23, 'hurtoPasajerosTotal', f, e);
// ── Daños (tipo 3) ────────────────────────────────────────────────────────────
export const useDanosQuery          = (f, e=true) => useTypologyQuery(3, 17, 'danosTotal',          f, e);

// Hook personalizado para invalidar caché manualmente si es necesario
export const useInvalidateIncidencias = () => {
  const queryClient = useQueryClient();

  const invalidateRobos = () => queryClient.invalidateQueries(['robosTotal']);
  const invalidateExtorsiones = () => queryClient.invalidateQueries(['extorsionTotal']);
  const invalidateHomicidios = () => queryClient.invalidateQueries(['homicidiosTotal']);
  const invalidateFeminicidios = () => queryClient.invalidateQueries(['feminicidiosTotal']);
  const invalidateSicariatos = () => queryClient.invalidateQueries(['sicariatosTotal']);
  const invalidateSecuestros = () => queryClient.invalidateQueries(['secuestrosTotal']);
  const invalidateDrogas = () => queryClient.invalidateQueries(['drogasTotal']);
  const invalidateBarras = () => queryClient.invalidateQueries(['barrasTotal']);

  const invalidateAll = () => {
    queryClient.invalidateQueries(['robosTotal']);
    queryClient.invalidateQueries(['extorsionTotal']);
    queryClient.invalidateQueries(['homicidiosTotal']);
    queryClient.invalidateQueries(['feminicidiosTotal']);
    queryClient.invalidateQueries(['sicariatosTotal']);
    queryClient.invalidateQueries(['secuestrosTotal']);
    queryClient.invalidateQueries(['drogasTotal']);
    queryClient.invalidateQueries(['barrasTotal']);
  };

  return {
    invalidateRobos,
    invalidateExtorsiones,
    invalidateHomicidios,
    invalidateFeminicidios,
    invalidateSicariatos,
    invalidateSecuestros,
    invalidateDrogas,
    invalidateBarras,
    invalidateAll,
  };
};
