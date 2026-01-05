/* import "./ControlStyles.css"; */
import "./ControlRutas.css";

const ControlRutas = ({ visible, rutaInfo, onLimpiarRuta, mapType, topPosition = 10 }) => {
    if (!visible) return null;

    return (
        <div
            className={`control-rutas ${mapType === 'google' ? 'google-mode' : ''}`}
            style={{ top: `${topPosition}px` }}
        >
            <div className="control-rutas-header">
                <div className="header-content">
                    <div>
                        <h3 style={{color: 'white'}}>🛣️ Calculador de Rutas</h3>
                        {/* <small>{mapType === 'google' ? 'Google Directions API' : 'OpenStreetMap OSRM'}</small> */}
                    </div>
                </div>
            </div>
            <div className="control-rutas-content">
                {mapType === 'google' ? (
                    <p style={{fontSize: '0.9em', margin: '10px 0px 10px 0px'}}>Utiliza la API de Directions de Google Maps para calcular rutas óptimas con información de tráfico en tiempo real.</p>
                ) : (
                    <p style={{fontSize: '0.9em', margin: '10px 0px'}}>Haga clic en dos puntos del mapa para calcular la ruta óptima entre ellos.</p>
                )}

                {rutaInfo && (
                    <div className="ruta-info">
                        <h4>📊 Información de la Ruta</h4>
                        <div className="info-grid">
                            <p style={{ margin: 0 }}><strong>📏 Distancia:</strong> {rutaInfo.distance?.text || `${rutaInfo.distance} km`}</p>
                            {/* <p style={{ margin: 0 }}><strong>⏱️ Tiempo estimado:</strong> {rutaInfo.duration?.text || `${rutaInfo.duration} min`}</p> */}

                            {rutaInfo.durationInTraffic && (
                                <p style={{ color: '#ff9800', margin: 0 }}>
                                    <strong>🚦 Con tráfico:</strong> {rutaInfo.durationInTraffic.text}
                                </p>
                            )}

                            {rutaInfo.waypointsCount > 0 && (
                                <p style={{ margin: 0 }}><strong>📍 Paradas intermedias:</strong> {rutaInfo.waypointsCount}</p>
                            )}

                            {rutaInfo.totalStops && (
                                <p style={{ margin: 0 }}><strong>🎯 Total de puntos:</strong> {rutaInfo.totalStops}</p>
                            )}

                            {rutaInfo.optimizedOrder && (
                                <p style={{ color: '#4caf50', fontSize: '0.9em' }}>
                                    ✓ Ruta optimizada automáticamente
                                </p>
                            )}
                        </div>

                        <div className="botones-container">
                            <button
                                className="btn-limpiar-ruta"
                                onClick={onLimpiarRuta}
                                style={{ fontSize: '0.9em', marginTop: '10px' }}
                            >
                                🗑️ Limpiar Ruta
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
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '0.9em' }}>
                                <strong>💡 Características:</strong>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
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