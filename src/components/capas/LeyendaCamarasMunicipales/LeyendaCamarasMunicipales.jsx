// LeyendaCamarasMunicipales.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaCamarasMunicipales.css';

const PANEL_ID = 'leyendaMunicipales';
const PANEL_ORDER = 1;
const PANEL_HEIGHT = 189;
const BASE_RIGHT = 20;

const LeyendaCamarasMunicipales = ({ visible }) => {
    const { registerPanel, unregisterPanel, getBottomOffset, rightOffset } = useMapLayout();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!visible) return;
        const el = containerRef.current;
        if (!el) return;
        const update = () => registerPanel(PANEL_ID, { order: PANEL_ORDER, height: el.offsetHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => { ro.disconnect(); unregisterPanel(PANEL_ID); };
    }, [visible, registerPanel, unregisterPanel]);

    if (!visible) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="leyenda-camaras-municipales"
            style={{
                bottom: getBottomOffset(PANEL_ID),
                right: BASE_RIGHT + rightOffset,
                transition: 'bottom 0.3s ease, right 0.3s ease',
            }}
        >
            <div className="leyenda-municipales-header">
                <h4>Cámaras Municipales</h4>
            </div>

            <div className="leyenda-municipales-content">
                <div className="leyenda-municipales-section">
                    <div className="leyenda-municipales-items">
                        {/* TIPO I - C180 */}
                        <div className="leyenda-municipales-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="leyenda-municipales-pin">
                                <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="#3B82F6"/>
                                <circle cx="14" cy="13" r="9" fill="white" opacity="0.93"/>
                                <rect x="7" y="10" width="14" height="9" rx="1.5" fill="#3B82F6"/>
                                <circle cx="14" cy="14.5" r="3.5" fill="white"/>
                                <circle cx="14" cy="14.5" r="1.8" fill="#3B82F6"/>
                                <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="#3B82F6"/>
                            </svg>
                            <div className="leyenda-municipales-info">
                                <span className="leyenda-municipales-tipo">TIPO I</span>
                                <span className="leyenda-municipales-desc">Cámara 180°</span>
                            </div>
                        </div>

                        {/* TIPO II - C360 */}
                        <div className="leyenda-municipales-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="leyenda-municipales-pin">
                                <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="#22C55E"/>
                                <circle cx="14" cy="13" r="9" fill="white" opacity="0.93"/>
                                <rect x="7" y="10" width="14" height="9" rx="1.5" fill="#22C55E"/>
                                <circle cx="14" cy="14.5" r="3.5" fill="white"/>
                                <circle cx="14" cy="14.5" r="1.8" fill="#22C55E"/>
                                <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="#22C55E"/>
                            </svg>
                            <div className="leyenda-municipales-info">
                                <span className="leyenda-municipales-tipo">TIPO II</span>
                                <span className="leyenda-municipales-desc">Cámara 360°</span>
                            </div>
                        </div>

                        {/* TIPO III - LPR */}
                        <div className="leyenda-municipales-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="leyenda-municipales-pin">
                                <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="#8B5CF6"/>
                                <circle cx="14" cy="13" r="9" fill="white" opacity="0.93"/>
                                <rect x="7" y="10" width="14" height="9" rx="1.5" fill="#8B5CF6"/>
                                <circle cx="14" cy="14.5" r="3.5" fill="white"/>
                                <circle cx="14" cy="14.5" r="1.8" fill="#8B5CF6"/>
                                <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="#8B5CF6"/>
                            </svg>
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
