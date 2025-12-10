// LeyendaCamaras.jsx
import React from 'react';
import './LeyendaCamaras.css';

const LeyendaCamaras = ({ camarasVecinalesVisible, camarasMunicipalesVisible }) => {
    // No mostrar la leyenda si ninguna capa está visible
    if (!camarasVecinalesVisible && !camarasMunicipalesVisible) {
        return null;
    }

    return (
        <div className="leyenda-camaras">
            <div className="leyenda-header">
                <h4>Leyenda de Cámaras</h4>
            </div>

            <div className="leyenda-content">
                {/* Cámaras Vecinales */}
                {camarasVecinalesVisible && (
                    <div className="leyenda-section">
                        <h5>Cámaras Vecinales</h5>

                        {/* Tipos de cámaras */}
                        <div className="leyenda-subsection">
                            <h6>Tipos de Cámaras</h6>
                            <div className="leyenda-items">
                                <div className="leyenda-item">
                                    <div className="leyenda-icon-svg" dangerouslySetInnerHTML={{
                                        __html: `
                                            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="8" y="10" width="16" height="12" rx="2" fill="#3b82f6"/>
                                                <rect x="11" y="13" width="10" height="6" rx="1" fill="#eff6ff"/>
                                                <circle cx="16" cy="16" r="2.5" fill="#2563eb"/>
                                                <circle cx="16" cy="16" r="1" fill="#eff6ff"/>
                                                <rect x="6" y="18" width="2" height="6" rx="1" fill="#3b82f6" opacity="0.7"/>
                                                <circle cx="21" cy="13" r="1" fill="#eff6ff" opacity="0.8"/>
                                            </svg>
                                        `
                                    }} />
                                    <span>FIXED - Cámara Fija</span>
                                </div>
                                <div className="leyenda-item">
                                    <div className="leyenda-icon-svg" dangerouslySetInnerHTML={{
                                        __html: `
                                            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="16" cy="20" r="8" fill="#3b82f6" opacity="0.2"/>
                                                <path d="M16 10C11.58 10 8 13.58 8 18C8 20.21 9 22.15 10.57 23.43C11.35 24.04 12.29 24.45 13.31 24.62C14.17 24.76 15.07 24.82 16 24.82C16.93 24.82 17.83 24.76 18.69 24.62C19.71 24.45 20.65 24.04 21.43 23.43C23 22.15 24 20.21 24 18C24 13.58 20.42 10 16 10Z" fill="#3b82f6"/>
                                                <circle cx="16" cy="18" r="3.5" fill="#eff6ff"/>
                                                <circle cx="16" cy="18" r="2" fill="#2563eb"/>
                                            </svg>
                                        `
                                    }} />
                                    <span>DOME - Cámara Domo</span>
                                </div>
                                <div className="leyenda-item">
                                    <div className="leyenda-icon-svg" dangerouslySetInnerHTML={{
                                        __html: `
                                            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="10" y="8" width="12" height="8" rx="1" fill="#3b82f6"/>
                                                <rect x="13" y="10" width="6" height="4" rx="0.5" fill="#eff6ff"/>
                                                <circle cx="16" cy="12" r="1.5" fill="#2563eb"/>
                                                <path d="M16 16C13.79 16 12 17.79 12 20C12 21.1 12.45 22.09 13.17 22.83C13.67 23.33 14.3 23.68 15 23.83C15.32 23.91 15.65 23.95 16 23.95C16.35 23.95 16.68 23.91 17 23.83C17.7 23.68 18.33 23.33 18.83 22.83C19.55 22.09 20 21.1 20 20C20 17.79 18.21 16 16 16Z" fill="#3b82f6" opacity="0.8"/>
                                                <circle cx="16" cy="20" r="1.5" fill="#eff6ff"/>
                                            </svg>
                                        `
                                    }} />
                                    <span>BOTH - Cámara Mixta</span>
                                </div>
                            </div>
                        </div>

                        {/* Marcas */}
                        <div className="leyenda-subsection">
                            <h6>Marcas</h6>
                            <div className="leyenda-items">
                                <div className="leyenda-item">
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
                                </div>
                                <div className="leyenda-item">
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cámaras Municipales */}
                {camarasMunicipalesVisible && (
                    <div className="leyenda-section">
                        <h5>Cámaras Municipales</h5>
                        <div className="leyenda-items">
                            <div className="leyenda-item">
                                <img src="/icon/camera.png" alt="Camara 180" className="leyenda-icon" />
                                <span>Camara 180</span>
                            </div>
                            <div className="leyenda-item">
                                <img src="/icon/camera2.png" alt="Camara 360" className="leyenda-icon" />
                                <span>Camara 360</span>
                            </div>
                            <div className="leyenda-item">
                                <img src="/icon/camera3.png" alt="Camara LPR" className="leyenda-icon" />
                                <span>Camara LPR</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeyendaCamaras;