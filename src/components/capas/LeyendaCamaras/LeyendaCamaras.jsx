// LeyendaCamaras.jsx
import React from 'react';
import { useMapContext } from '../../../context/MapContext';
import './LeyendaCamaras.css';

const LeyendaCamaras = ({ camarasVecinalesVisible, camarasMunicipalesVisible, isPanelExpanded }) => {
    const { marcasCamarasVisibles, handleToggleMarcaCamara } = useMapContext();

    // No mostrar la leyenda si las cámaras vecinales no están visibles
    if (!camarasVecinalesVisible) {
        return null;
    }

    return (
        <div className={`leyenda-camaras ${isPanelExpanded ? 'panel-expanded' : ''}`}>
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
                                disabled={true}
                            />
                            <label htmlFor="marca-hikvision" className="leyenda-item-label" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                <div className="leyenda-color-badge" style={{
                                    background: '#fef2f2',
                                    border: '2px solid #ef4444',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    color: '#ef4444',
                                    fontSize: '11px'
                                }}>
                                    HIK
                                </div>
                                <span>HIKVISION</span>
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
                                <div className="leyenda-color-badge" style={{
                                    background: '#eff6ff',
                                    border: '2px solid #3b82f6',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    color: '#3b82f6',
                                    fontSize: '11px'
                                }}>
                                    DAH
                                </div>
                                <span>DAHUA</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeyendaCamaras;