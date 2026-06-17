import { useEffect, useRef, useCallback } from 'react';

// Ejecuta realizarClustering() en un Web Worker para no bloquear el hilo
// principal — el algoritmo es O(n²) y con miles de incidencias puede tomar
// varios segundos (causa directa de los Long Tasks del profiler).
export const useClusterWorker = () => {
  const workerRef = useRef(null);
  const nextId = useRef(0);
  const pending = useRef(new Map());

  useEffect(() => {
    const worker = new Worker(new URL('../workers/clustering.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, clusters, error } = e.data;
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      if (error) entry.reject(new Error(error));
      else entry.resolve(clusters);
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      pending.current.forEach(({ reject }) => reject(new DOMException('Worker terminado', 'AbortError')));
      pending.current.clear();
      workerRef.current = null;
    };
  }, []);

  const clusterAsync = useCallback((puntos, radioMaximo) => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) { reject(new DOMException('Worker no disponible', 'AbortError')); return; }
      const id = nextId.current++;
      pending.current.set(id, { resolve, reject });
      worker.postMessage({ id, puntos, radioMaximo });
    });
  }, []);

  return clusterAsync;
};
