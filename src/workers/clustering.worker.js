import { realizarClustering } from '../utils/clustering.utils.js';

self.onmessage = (e) => {
  const { id, puntos, radioMaximo } = e.data;
  try {
    const clusters = realizarClustering(puntos, radioMaximo);
    self.postMessage({ id, clusters });
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
