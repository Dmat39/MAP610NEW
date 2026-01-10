// LeyendaCamarasMunicipales.jsx
import React from 'react';
import './LeyendaCamarasMunicipales.css';

const LeyendaCamarasMunicipales = ({ visible, isPanelExpanded }) => {
    // No mostrar la leyenda si las cámaras municipales no están visibles
    if (!visible) {
        return null;
    }

    return (
        <div className={`leyenda-camaras-municipales ${isPanelExpanded ? 'panel-expanded' : ''}`}>
            <div className="leyenda-municipales-header">
                <h4>Cámaras Municipales</h4>
            </div>

            <div className="leyenda-municipales-content">
                <div className="leyenda-municipales-section">
                    <div className="leyenda-municipales-items">
                        {/* TIPO I - C180 */}
                        <div className="leyenda-municipales-item">
                            <img src="/icon/camera.png" alt="TIPO I" className="leyenda-municipales-icon" />
                            <div className="leyenda-municipales-info">
                                <span className="leyenda-municipales-tipo">TIPO I</span>
                                <span className="leyenda-municipales-desc">Cámara 180°</span>
                            </div>
                        </div>

                        {/* TIPO II - C360 */}
                        <div className="leyenda-municipales-item">
                            <img src="/icon/camera2.png" alt="TIPO II" className="leyenda-municipales-icon" />
                            <div className="leyenda-municipales-info">
                                <span className="leyenda-municipales-tipo">TIPO II</span>
                                <span className="leyenda-municipales-desc">Cámara 360°</span>
                            </div>
                        </div>

                        {/* TIPO III - LPR */}
                        <div className="leyenda-municipales-item">
                            <img src="/icon/camera3.png" alt="TIPO III" className="leyenda-municipales-icon" />
                            <div className="leyenda-municipales-info">
                                <span className="leyenda-municipales-tipo">TIPO III</span>
                                <span className="leyenda-municipales-desc">LPR (Placas)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeyendaCamarasMunicipales;
