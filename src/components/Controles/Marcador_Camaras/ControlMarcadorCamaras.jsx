import React, { useState } from 'react';
import { ChevronUp, ChevronDown, MapPin, Download, Trash2, Plus } from 'lucide-react';
import ExcelJS from 'exceljs';
import './ControlMarcadorCamaras.css';

const ControlMarcadorCamaras = ({ 
  visible, 
  puntosGuardados = [], 
  onToggleMarcador, 
  onEliminarPunto,
  marcadorActivo = false,
  mapType = 'leaflet' 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!visible) return null;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const exportarExcel = async () => {
    if (puntosGuardados.length === 0) {
      alert('No hay puntos para exportar');
      return;
    }

    try {
      // Preparar datos para Excel
      const datosExcel = puntosGuardados.map((punto, index) => ({
        'ID': index + 1,
        'Latitud': punto.latitud,
        'Longitud': punto.longitud,
        'Dirección': punto.direccion || 'No disponible',
        'Fecha Creación': punto.fechaCreacion || new Date().toLocaleString()
      }));

      // Crear workbook y worksheet con ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Puntos Marcados');

      // Definir columnas con anchos
      worksheet.columns = [
        { header: 'ID', key: 'ID', width: 5 },
        { header: 'Latitud', key: 'Latitud', width: 15 },
        { header: 'Longitud', key: 'Longitud', width: 15 },
        { header: 'Dirección', key: 'Dirección', width: 50 },
        { header: 'Fecha Creación', key: 'Fecha Creación', width: 20 }
      ];

      // Agregar filas de datos
      worksheet.addRows(datosExcel);

      // Estilizar encabezados
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Generar archivo y descargarlo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nombreArchivo = `puntos_marcados_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = nombreArchivo;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al generar el archivo Excel');
    }
  };

  return (
    <div className={`control-marcador-puntos ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="control-marcador-header" onClick={toggleCollapse}>
        <div className="header-content">
          <h3>📍 Marcador de Camaras Nuevas</h3>
          <button className="collapse-btn">
            {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      
      <div className={`control-marcador-content ${isCollapsed ? 'hidden' : ''}`}>
        {/* Controles principales */}
        <div className="marcador-controls">
          <button 
            className={`btn-toggle-marcador ${marcadorActivo ? 'active' : ''}`}
            onClick={onToggleMarcador}
          >
            {marcadorActivo ? (
              <>
                <MapPin size={16} />
                Desactivar Marcador
              </>
            ) : (
              <>
                <Plus size={16} />
                Activar Marcador
              </>
            )}
          </button>

          {puntosGuardados.length > 0 && (
            <button 
              className="btn-exportar"
              onClick={exportarExcel}
            >
              <Download size={16} />
              Exportar Excel ({puntosGuardados.length})
            </button>
          )}
        </div>

        {/* Instrucciones */}
        <div className="instrucciones">
          {marcadorActivo ? (
            <p className="instruccion-activa">
              🎯 <strong>Modo marcador activo:</strong> Haz clic en el mapa para marcar un punto
            </p>
          ) : (
            <p className="instruccion-inactiva">
              💡 Activa el marcador para empezar a marcar puntos en el mapa
            </p>
          )}
        </div>

        {/* Tabla de puntos guardados */}
        {puntosGuardados.length > 0 && (
          <div className="tabla-puntos">
            <h4>📋 Puntos Guardados ({puntosGuardados.length})</h4>
            <div className="tabla-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Latitud</th>
                    <th>Longitud</th>
                    <th>Dirección</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {puntosGuardados.map((punto, index) => (
                    <tr key={punto.id}>
                      <td>{index + 1}</td>
                      <td>{punto.latitud.toFixed(6)}</td>
                      <td>{punto.longitud.toFixed(6)}</td>
                      <td className="direccion-cell" title={punto.direccion}>
                        {punto.direccion || 'Cargando...'}
                      </td>
                      <td>
                        <button 
                          className="btn-eliminar"
                          onClick={() => onEliminarPunto(punto.id)}
                          title="Eliminar punto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {puntosGuardados.length === 0 && (
          <div className="sin-puntos">
            <p>📍 No hay puntos marcados aún</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlMarcadorCamaras; 