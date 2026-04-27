import { useQuery, useQueryClient } from '@tanstack/react-query';
import pnpIncidenceService from '../services/pnpIncidenceService';

const getDefaultDates = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fmt = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start: fmt(thirtyDaysAgo), end: fmt(today) };
};

const fetchPnpIncidencias = async filtros => {
  const defaults = getDefaultDates();
  const endDate = filtros?.end || defaults.end;
  const filters = {
    start: filtros?.start || defaults.start,
    end: endDate + 'T23:59:59',
    shift: filtros?.shift || undefined,
    jurisdiction: filtros?.jurisdiction || undefined,
    page: 0,
    limit: 1000,
  };
  const result = await pnpIncidenceService.getAll(filters);
  return result.data || [];
};

export const usePnpIncidenciasQuery = (filtros, enabled = true) => {
  return useQuery({
    queryKey: ['pnpIncidencias', filtros],
    queryFn: () => fetchPnpIncidencias(filtros),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    retryDelay: i => Math.min(1000 * 2 ** i, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
};

export const useInvalidatePnpIncidencias = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['pnpIncidencias'] });
};
