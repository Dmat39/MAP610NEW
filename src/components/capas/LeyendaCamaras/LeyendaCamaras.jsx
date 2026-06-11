// LeyendaCamaras.jsx
import React, { useEffect } from 'react';
import { useMapContext } from '../../../context/MapContext';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaCamaras.css';

const PANEL_ID = 'leyendaCamaras';
const PANEL_ORDER = 0;
const PANEL_HEIGHT = 170;
const BASE_RIGHT = 20;

const LeyendaCamaras = ({ camarasVecinalesVisible }) => {
    const { marcasCamarasVisibles, handleToggleMarcaCamara, conteoCamarasVecinales } = useMapContext();
    const { registerPanel, unregisterPanel, getBottomOffset, rightOffset } = useMapLayout();

    useEffect(() => {
        if (camarasVecinalesVisible) {
            registerPanel(PANEL_ID, { order: PANEL_ORDER, height: PANEL_HEIGHT });
            return () => unregisterPanel(PANEL_ID);
        }
    }, [camarasVecinalesVisible, registerPanel, unregisterPanel]);

    if (!camarasVecinalesVisible) {
        return null;
    }

    return (
        <div
            className="leyenda-camaras"
            style={{
                bottom: getBottomOffset(PANEL_ID),
                right: BASE_RIGHT + rightOffset,
                transition: 'bottom 0.3s ease, right 0.3s ease',
            }}
        >
            <div className="leyenda-header">
                <h4>Marcas de Cámaras</h4>
            </div>

            <div className="leyenda-content">
                {/* Solo Marcas con checkboxes */}
                <div className="leyenda-section">
                    <div className="leyenda-items">
                        <div className="leyenda-item">
                            <input
                                type="checkbox"
                                id="marca-hikvision"
                                checked={marcasCamarasVisibles.HIKVISION}
                                onChange={() => handleToggleMarcaCamara('HIKVISION')}
                                className="leyenda-checkbox"
                            />
                            <label htmlFor="marca-hikvision" className="leyenda-item-label">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="23" viewBox="0 0 28 36" className="leyenda-pin-vecinal">
                                    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke="#ef4444" strokeWidth="2.5"/>
                                    <circle cx="14" cy="13" r="9" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                                    <rect x="7" y="10" width="14" height="9" rx="1.5" fill="#ef4444"/>
                                    <circle cx="14" cy="14.5" r="3.5" fill="white"/>
                                    <circle cx="14" cy="14.5" r="1.8" fill="#ef4444"/>
                                    <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="#ef4444"/>
                                </svg>
                                <span>HIKVISION ({conteoCamarasVecinales.HIKVISION})</span>
                            </label>
                        </div>
                        <div className="leyenda-item">
                            <input
                                type="checkbox"
                                id="marca-dahua"
                                checked={marcasCamarasVisibles.DAHUA}
                                onChange={() => handleToggleMarcaCamara('DAHUA')}
                                className="leyenda-checkbox"
                            />
                            <label htmlFor="marca-dahua" className="leyenda-item-label">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="23" viewBox="0 0 28 36" className="leyenda-pin-vecinal">
                                    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke="#3b82f6" strokeWidth="2.5"/>
                                    <circle cx="14" cy="13" r="9" fill="white" stroke="#3b82f6" strokeWidth="1.5"/>
                                    <rect x="7" y="10" width="14" height="9" rx="1.5" fill="#3b82f6"/>
                                    <circle cx="14" cy="14.5" r="3.5" fill="white"/>
                                    <circle cx="14" cy="14.5" r="1.8" fill="#3b82f6"/>
                                    <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="#3b82f6"/>
                                </svg>
                                <span>DAHUA ({conteoCamarasVecinales.DAHUA})</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeyendaCamaras;