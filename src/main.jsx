import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.jsx';
import { MapProvider } from './context/MapContext.jsx';
import { MapLayoutProvider } from './context/MapLayoutContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Router from './Router.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css';


// Configurar QueryClient con caché de 12 horas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 12 * 60 * 60 * 1000, // 12 horas en milisegundos
      cacheTime: 12 * 60 * 60 * 1000, // 12 horas en milisegundos
      retry: 3, // Reintentar 3 veces en caso de error
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // No refetch cuando se enfoca la ventana
      refetchOnMount: false, // No refetch automático al montar
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MapProvider>
              <MapLayoutProvider>
                <Router />
              </MapLayoutProvider>
            </MapProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
