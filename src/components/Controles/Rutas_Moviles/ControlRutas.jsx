import "./ControlRutas.css";
import { Route, BarChart3, Trash2, MapPin, Clock, Navigation, CheckCircle, Lightbulb } from 'lucide-react';

const ControlRutas = ({ visible, rutaInfo, onLimpiarRuta, mapType, topPosition = 10 }) => {
    if (!visible) return null;

    return (
        <div
            className={`control-rutas ${mapType === 'google' ? 'google-mode' : ''}`}
        >
            <div className="control-rutas-content">
                {mapType === 'google' ? (
                    <p>Utiliza la API de Directions de Google Maps para calcular rutas óptimas con información de tráfico en tiempo real.</p>
                ) : (
                    <p>Haga clic en dos puntos del mapa para calcular la ruta óptima entre ellos.</p>
                )}

                {rutaInfo && (
                    <div className="ruta-info">
                        <h4><BarChart3 size={12} color="#16a34a" /> Información de la Ruta</h4>
                        <div className="info-grid">
                            <div className="info-row">
                                <span className="info-label"><MapPin size={13} color="#16a34a" /> Distancia</span>
                                <span className="info-value">{rutaInfo.distance?.text || `${rutaInfo.distance} km`}</span>
                            </div>

                            {rutaInfo.durationInTraffic && (
                                <div className="info-row">
                                    <span className="info-label"><Clock size={13} color="#f59e0b" /> Con tráfico</span>
                                    <span className="info-value trafico">{rutaInfo.durationInTraffic.text}</span>
                                </div>
                            )}

                            {rutaInfo.waypointsCount > 0 && (
                                <div className="info-row">
                                    <span className="info-label"><Navigation size={13} color="#6b7280" /> Paradas intermedias</span>
                                    <span className="info-value">{rutaInfo.waypointsCount}</span>
                                </div>
                            )}

                            {rutaInfo.totalStops && (
                                <div className="info-row">
                                    <span className="info-label"><MapPin size={13} color="#6b7280" /> Total de puntos</span>
                                    <span className="info-value">{rutaInfo.totalStops}</span>
                                </div>
                            )}

                            {rutaInfo.optimizedOrder && (
                                <div className="info-row">
                                    <span className="info-label"><CheckCircle size={13} color="#16a34a" /> Estado</span>
                                    <span className="info-value optimizado">Ruta optimizada</span>
                                </div>
                            )}
                        </div>

                        <div className="botones-container" style={{ marginTop: 10 }}>
                            <button className="btn-limpiar-ruta" onClick={onLimpiarRuta}>
                                <Trash2 size={14} /> Limpiar Ruta
                            </button>
                        </div>
                    </div>
                )}

                {!rutaInfo && (
                    <div className="instrucciones">
                        {mapType === 'google' ? (
                            <ol>
                                <li>Haga clic en el mapa para establecer el <strong>punto de origen</strong></li>
                                <li>Haga clic nuevamente para establecer el <strong>destino</strong></li>
                                <li>Haga clics adicionales para agregar <strong>paradas intermedias</strong></li>
                                <li>Arrastre los marcadores para ajustar la ruta</li>
                            </ol>
                        ) : (
                            <ol>
                                <li>Haga clic en el mapa para marcar el <strong>punto de origen</strong></li>
                                <li>Haga clic nuevamente para marcar el <strong>punto de destino</strong></li>
                                <li>La ruta se calculará automáticamente</li>
                            </ol>
                        )}

                        {mapType === 'google' && (
                            <div className="caracteristicas-box">
                                <strong><Lightbulb size={13} /> Características</strong>
                                <ul>
                                    <li>Información de tráfico en tiempo real</li>
                                    <li>Optimización automática de waypoints</li>
                                    <li>Rutas editables arrastrando</li>
                                    <li>Modo de transporte: Automóvil</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlRutas;
