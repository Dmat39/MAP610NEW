import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, useMapEvents, GeoJSON } from 'react-leaflet';
import { useTheme } from '../../context/ThemeContext';

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK  = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
import './GestionCamarasMunicipales.css';
import './GestionRadiosGPS.css';
import {
  Radio, MapPin, Route, BarChart2, RefreshCw, Download,
  X, Eye, EyeOff, Trash2, Plus, Check, Save, Filter, Pencil,
} from 'lucide-react';
import { obtenerRadios, obtenerHistoricoRadio, obtenerKmDias, buscarInfoRadio, actualizarRadio } from '../../services/radiosService';
import { obtenerZonas, crearZona, actualizarZona, eliminarZona } from '../../services/zonaService';
import SearchInput from '../Table/SearchInput';
import TablePagination from '../Table/TablePagination';

/* ─── helpers ────────────────────────────────────────────────────── */
const BADGE_COLOR = {
  verde:    { label: 'OK',      bg: 'rgba(22,163,74,0.18)',   color: 'var(--badge-ok)' },
  amarillo: { label: 'SIN GPS', bg: 'rgba(234,179,8,0.18)',   color: 'var(--badge-singps)' },
  rojo:     { label: 'APAGADO', bg: 'rgba(220,38,38,0.18)',   color: 'var(--badge-apagado)' },
};
const badgeRadio = (r) => BADGE_COLOR[r.color] ?? { label: r.color || '—', bg: '#f3f4f6', color: '#6b7280' };
const COLORES_ZONA = ['#6366f1','#22c55e','#ef4444','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

const exportXLS = (filas, nombre) => {
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Datos"><Table>
    ${filas.map(row=>`<Row>${row.map(c=>`<Cell><Data ss:Type="${typeof c==='number'?'Number':'String'}">${String(c??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')}</Row>`).join('')}
    </Table></Worksheet></Workbook>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));
  a.download = `${nombre}-${Date.now()}.xls`; a.click();
};

/* ─── Mini-mapa para dibujar polígono de zona ─────────────────────── */
const CENTER_SJL = [-11.9699, -76.998];

const PolyClickHandler = ({ onAdd, canClose, onClose }) => {
  useMapEvents({
    click:    (e) => onAdd([e.latlng.lat, e.latlng.lng]),
    dblclick: ()  => { if (canClose) onClose(); },
  });
  return null;
};

const jurisStyle = f => ({ color: f.properties.color || '#34b429', weight: 1.5, fillOpacity: 0.12, interactive: false });

const ZonaPolyMap = ({ color, coords, closed, onAdd, onClose, onClear, mapKey }) => {
  const { dark } = useTheme();
  const [jurisData, setJurisData] = useState(null);
  useEffect(() => {
    fetch('/data/juridiccion.geojson').then(r => r.json()).then(setJurisData).catch(() => {});
  }, []);

  return (
    <div style={{ position:'relative', height:300, borderRadius:8, overflow:'hidden', border:'1px solid #e2e8f0', marginTop:6 }}>
      <MapContainer
        key={mapKey}
        center={CENTER_SJL}
        zoom={13}
        style={{ height:'100%', width:'100%' }}
        doubleClickZoom={false}
        scrollWheelZoom={false}
      >
        <TileLayer url={dark ? TILE_DARK : TILE_LIGHT} attribution={dark ? '&copy; CARTO' : '&copy; OpenStreetMap'} />
        {jurisData && <GeoJSON data={jurisData} style={jurisStyle} interactive={false} />}
        <PolyClickHandler onAdd={onAdd} canClose={!closed && coords.length >= 3} onClose={onClose} />
        {/* Línea de trayecto abierto */}
        {!closed && coords.length >= 2 && (
          <Polyline positions={coords} color={color} weight={2} />
        )}
        {/* Línea guía de cierre */}
        {!closed && coords.length >= 3 && (
          <Polyline positions={[coords[coords.length - 1], coords[0]]} color={color} weight={1} dashArray="5,5" opacity={0.4} />
        )}
        {/* Polígono cerrado */}
        {closed && coords.length >= 3 && (
          <Polygon positions={coords} color={color} fillColor={color} fillOpacity={0.25} weight={2} />
        )}
        {/* Vértices */}
        {coords.map((p, i) => (
          <CircleMarker key={i} center={p} radius={i === 0 ? 6 : 4}
            color={color} fillColor={i === 0 ? color : 'white'} fillOpacity={1} weight={2} />
        ))}
      </MapContainer>

      {/* Instrucción flotante */}
      <div style={{ position:'absolute', bottom:8, left:8, right:8, zIndex:500, display:'flex', justifyContent:'space-between', alignItems:'flex-end', pointerEvents:'none' }}>
        <span style={{ background:'rgba(255,255,255,0.92)', padding:'3px 8px', borderRadius:6, fontSize:11, color:'#374151' }}>
          {closed
            ? `✓ Polígono cerrado — ${coords.length} vértices`
            : coords.length === 0
            ? 'Clic para agregar puntos — las jurisdicciones son de referencia'
            : coords.length < 3
            ? `${coords.length} punto(s) — necesitas al menos 3`
            : `${coords.length} puntos — doble clic para cerrar`}
        </span>
        {coords.length > 0 && (
          <button onClick={onClear}
            style={{ pointerEvents:'all', background:'white', border:'1px solid #fca5a5', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', color:'#dc2626' }}>
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Selector múltiple de radios para el modal de zona ──────────── */
const RadiosPicker = ({ radios, selected, onChange }) => {
  const [q, setQ] = useState('');
  const filtrados = radios.filter(r => {
    if (!q) return true;
    const t = q.toLowerCase();
    return String(r.issi).includes(t) || String(r.unicocodigo || '').toLowerCase().includes(t);
  });
  const labelR = r => r.unicocodigo ? `${r.unicocodigo} — ISSI ${r.issi}` : `ISSI ${r.issi}`;
  const toggle = issi => {
    const s = String(issi);
    onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  };
  return (
    <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden', marginTop:4 }}>
      <div style={{ padding:'6px 10px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8, background:'#f8fafc' }}>
        <input placeholder="Buscar radio..." value={q} onChange={e => setQ(e.target.value)}
          className="rgps-filter-select" style={{ flex:1, height:30 }} />
        {selected.length > 0 && (
          <span style={{ fontSize:11, color:'#6366f1', fontWeight:600, whiteSpace:'nowrap' }}>
            {selected.length} asignada(s)
          </span>
        )}
      </div>
      <div style={{ maxHeight:150, overflowY:'auto' }}>
        {radios.length === 0
          ? <div style={{ padding:'10px', fontSize:12, color:'#94a3b8', textAlign:'center' }}>Cargando radios...</div>
          : filtrados.length === 0
          ? <div style={{ padding:'10px', fontSize:12, color:'#94a3b8', textAlign:'center' }}>Sin resultados</div>
          : filtrados.map(r => {
              const issi = String(r.issi);
              const checked = selected.includes(issi);
              const badge = BADGE_COLOR[r.color];
              return (
                <label key={r.issi} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                  cursor:'pointer', background: checked ? '#eef2ff' : 'white',
                  borderBottom:'1px solid #f8fafc', fontSize:13, color: checked ? '#4f46e5' : '#374151' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(issi)}
                    style={{ accentColor:'#6366f1', width:14, height:14, flexShrink:0 }} />
                  <span style={{ flex:1 }}>{labelR(r)}</span>
                  {badge && (
                    <span style={{ fontSize:11, padding:'1px 7px', borderRadius:10,
                      background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  )}
                </label>
              );
            })
        }
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   TAB RADIOS — toolbar separado + tabla
   ════════════════════════════════════════════════════════════════════ */
const ToolbarRadios = ({ radios, loading, onRecargar, filtros, setFiltros }) => {
  const { busqueda, filtroEstado, filtroTipo } = filtros;
  const tipos = ['TODOS', ...new Set(radios.map(r => r.tipo).filter(Boolean))];
  const totales = {
    ok:      radios.filter(r => r.color === 'verde').length,
    sinGps:  radios.filter(r => r.color === 'amarillo').length,
    apagado: radios.filter(r => r.color === 'rojo').length,
  };
  const click = (label) => setFiltros(p => ({ ...p, filtroEstado: p.filtroEstado === label ? 'TODOS' : label, pagina: 1 }));

  const filtrados = radios.filter(r => {
    const b = badgeRadio(r);
    const t = busqueda.toLowerCase().trim();
    return (
      (!t || String(r.issi).includes(t) || String(r.unicocodigo||'').toLowerCase().includes(t)) &&
      (filtroEstado === 'TODOS' || b.label === filtroEstado) &&
      (filtroTipo   === 'TODOS' || r.tipo === filtroTipo)
    );
  });

  const exportar = () => exportXLS(
    [['ISSI','Código','Tipo','Estado','Velocidad (km/h)','Dirección','Lat','Lng','Fecha/Hora'],
     ...filtrados.map(r=>[r.issi,r.unicocodigo||'',r.tipo||'',badgeRadio(r).label,r.velocidad,r.direccion||'',r.latitud,r.longitud,r.fechaHora||''])],
    'radios-gps'
  );

  return (
    <div className="municipales-toolbar rgps-toolbar-outer">
      {/* Stats chips */}
      <div className="rgps-stats-inline">
        <span className="rgps-stat-chip total">
          <span className="rgps-stat-chip-num">{radios.length}</span> radios
        </span>
        {[
          { key:'OK',      num: totales.ok,      dot:'#16a34a', cls:'ok' },
          { key:'SIN GPS', num: totales.sinGps,  dot:'#a16207', cls:'singps' },
          { key:'APAGADO', num: totales.apagado, dot:'#dc2626', cls:'apagado' },
        ].map(({ key, num, dot, cls }) => (
          <button key={key}
            className={`rgps-stat-chip ${cls}${filtroEstado === key ? ' activo' : ''}`}
            onClick={() => click(key)}
          >
            <span className="rgps-dot" style={{ background: dot }} />
            <span className="rgps-stat-chip-num">{num}</span> {key}
          </button>
        ))}
        {filtroEstado !== 'TODOS' && (
          <button className="rgps-chip-clear" onClick={() => setFiltros(p=>({...p,filtroEstado:'TODOS',pagina:1}))}>
            <X size={11}/> Limpiar
          </button>
        )}
      </div>

      {/* Búsqueda + filtros + acciones */}
      <div className="rgps-actions-row">
        <SearchInput placeholder="Buscar ISSI o código..."
          value={busqueda}
          onChange={v => setFiltros(p=>({...p,busqueda:v,pagina:1}))} />
        <div className="rgps-filter-item">
          <label>Tipo</label>
          <select className="rgps-filter-select" value={filtroTipo}
            onChange={e => setFiltros(p=>({...p,filtroTipo:e.target.value,pagina:1}))}>
            {tipos.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn-municipales-refresh" onClick={onRecargar}>
          <RefreshCw size={13} className={loading?'spinning':''}/> Actualizar
        </button>
        <button className="btn-municipales-excel" onClick={exportar} disabled={!filtrados.length}>
          <Download size={13}/> XLS
        </button>
      </div>
    </div>
  );
};

const TablaRadios = ({ radios, filtros, setFiltros, onEditar }) => {
  const { busqueda, filtroEstado, filtroTipo, pagina, pageSize } = filtros;

  const filtrados = radios.filter(r => {
    const b = badgeRadio(r);
    const t = busqueda.toLowerCase().trim();
    return (
      (!t || String(r.issi).includes(t) || String(r.unicocodigo||'').toLowerCase().includes(t)) &&
      (filtroEstado==='TODOS' || b.label===filtroEstado) &&
      (filtroTipo==='TODOS'   || r.tipo===filtroTipo)
    );
  });

  const paginados = filtrados.slice((pagina-1)*pageSize, pagina*pageSize);

  if (filtrados.length === 0) return (
    <div className="municipales-empty-state">
      <Radio size={36}/><h3>Sin resultados</h3>
      <p>No hay radios que coincidan con los filtros aplicados</p>
    </div>
  );

  return (
    <>
      <div className="municipales-table-wrapper" style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        <table className="municipales-table">
          <thead>
            <tr><th>#</th><th>ISSI</th><th>Código</th><th>Tipo</th><th>Estado</th><th>Velocidad</th><th>Dirección</th><th>Última act.</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {paginados.map((r,i) => {
              const b = badgeRadio(r);
              return (
                <tr key={r.issi}>
                  <td style={{color:'#94a3b8',fontSize:12}}>{(pagina-1)*pageSize+i+1}</td>
                  <td><strong>{r.issi}</strong></td>
                  <td>{r.unicocodigo||'—'}</td>
                  <td><span className="municipales-badge municipales-badge-type">{r.tipo||'—'}</span></td>
                  <td>
                    <span className="municipales-badge" style={{background:b.bg,color:b.color}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:b.color,display:'inline-block',marginRight:5}}/>
                      {b.label}
                    </span>
                  </td>
                  <td>{r.velocidad} km/h</td>
                  <td className="rgps-td-truncate">{r.direccion||'—'}</td>
                  <td style={{whiteSpace:'nowrap'}}>{r.fechaHora||'—'}</td>
                  <td>
                    <div className="municipales-action-buttons">
                      <button className="btn-icon-municipales btn-edit" onClick={() => onEditar(r)} title="Editar"><Pencil size={13}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={pagina} totalItems={filtrados.length} itemsPerPage={pageSize}
        onPageChange={p => setFiltros(prev=>({...prev,pagina:p}))}
        onLimitChange={n => setFiltros(prev=>({...prev,pageSize:n,pagina:1}))}
      />
    </>
  );
};

/* ════════════════════════════════════════════════════════════════════
   TAB ZONAS GPS
   ════════════════════════════════════════════════════════════════════ */
const ToolbarZonas = ({ onNueva, onRecargar, total }) => (
  <div className="municipales-toolbar rgps-toolbar-outer">
    <span style={{fontSize:13,color:'#64748b',fontWeight:500}}>{total} zona{total!==1?'s':''} registrada{total!==1?'s':''}</span>
    <div style={{marginLeft:'auto',display:'flex',gap:8}}>
      <button className="btn-municipales-refresh" onClick={onRecargar}><RefreshCw size={13}/> Actualizar</button>
      <button className="btn-rgps-primary" onClick={onNueva}><Plus size={13}/> Nueva zona</button>
    </div>
  </div>
);

const TablaZonas = ({ zonas, onEditar, onToggle, onBorrar }) => {
  if (zonas.length === 0) return (
    <div className="municipales-empty-state">
      <MapPin size={36}/><h3>Sin zonas GPS</h3>
      <p>Crea la primera zona para delimitar áreas de patrullaje</p>
    </div>
  );
  return (
    <div className="municipales-table-wrapper" style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
      <table className="municipales-table">
        <thead>
          <tr><th>#</th><th>Nombre</th><th>Descripción</th><th>Color</th><th>Radios</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {zonas.map((z,i) => {
            let issiCount = 0;
            try { issiCount = JSON.parse(z.radios_issi || '[]').length; } catch {}
            return (
            <tr key={z.id} style={{opacity:z.activo?1:0.55}}>
              <td style={{color:'#94a3b8',fontSize:12}}>{i+1}</td>
              <td><strong>{z.nombre}</strong></td>
              <td style={{color:'#6b7280'}}>{z.descripcion||'—'}</td>
              <td><span style={{display:'inline-block',width:18,height:18,borderRadius:'50%',background:z.color,border:'2px solid rgba(0,0,0,0.1)',verticalAlign:'middle'}}/></td>
              <td>{issiCount > 0 ? <span style={{background:'#eef2ff',color:'#4f46e5',padding:'2px 8px',borderRadius:10,fontSize:12,fontWeight:600}}>{issiCount}</span> : <span style={{color:'#94a3b8',fontSize:12}}>—</span>}</td>
              <td><span className={`municipales-badge ${z.activo?'municipales-badge-success':'municipales-badge-gray'}`}>{z.activo?'Activa':'Inactiva'}</span></td>
              <td>
                <div className="municipales-action-buttons">
                  <button className="btn-icon-municipales btn-edit" onClick={()=>onEditar(z)} title="Editar"><Save size={13}/></button>
                  <button className="btn-icon-municipales btn-edit" onClick={()=>onToggle(z)} title={z.activo?'Desactivar':'Activar'}>{z.activo?<EyeOff size={13}/>:<Eye size={13}/>}</button>
                  <button className="btn-icon-municipales btn-delete" onClick={()=>onBorrar(z.id)} title="Eliminar"><Trash2 size={13}/></button>
                </div>
              </td>
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
};

/* ── RadioSelector: input de búsqueda + select filtrado ─────────────────────── */
const RadioSelector = ({ radios, value, onChange }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = radios.find(r => String(r.issi) === String(value));
  const label = (r) => r.unicocodigo ? `${r.unicocodigo} — ISSI ${r.issi}` : `ISSI ${r.issi}`;
  const filtrados = radios.filter(r => {
    const t = q.toLowerCase();
    return !t || String(r.issi).includes(t) || String(r.unicocodigo||'').toLowerCase().includes(t);
  });

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (r) => { onChange(String(r.issi)); setQ(''); setOpen(false); };
  const clear   = (e) => { e.stopPropagation(); onChange(''); setQ(''); };

  return (
    <div ref={ref} style={{ position:'relative', minWidth:240 }}>
      <div className="rgps-filter-select" onClick={() => { setOpen(o => !o); setQ(''); }}
        style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none', paddingRight:28 }}>
        {selected
          ? <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#374151' }}>{label(selected)}</span>
          : <span style={{ flex:1, color:'#94a3b8' }}>— Seleccionar radio —</span>}
        {selected
          ? <button onClick={clear} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, lineHeight:1, position:'absolute', right:8 }}><X size={13}/></button>
          : <span style={{ position:'absolute', right:8, color:'#94a3b8', fontSize:10 }}>▼</span>}
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'white',
          border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:9999 }}>
          <div style={{ padding:'6px 8px', borderBottom:'1px solid #f1f5f9' }}>
            <input autoFocus className="rgps-filter-select" style={{ width:'100%', height:30, boxSizing:'border-box' }}
              placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()} />
          </div>
          <div style={{ maxHeight:180, overflowY:'auto' }}>
            {filtrados.length === 0
              ? <div style={{ padding:'8px 12px', fontSize:12, color:'#94a3b8' }}>Sin resultados</div>
              : filtrados.map(r => (
                <div key={r.issi} onClick={() => select(r)}
                  style={{ padding:'7px 12px', fontSize:13, cursor:'pointer', color:'#374151',
                    background: String(r.issi)===String(value) ? '#eef2ff' : 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = String(r.issi)===String(value)?'#eef2ff':'white'}>
                  {label(r)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════════
   TAB HISTORIAL
   ════════════════════════════════════════════════════════════════════ */
const ToolbarHistorial = ({ radios, form, setForm, onBuscar, onLimpiar, loading, puntos, buscado }) => {
  const exportarKML = () => {
    const coords = puntos.map(p=>`${p.longitud},${p.latitud},0`).join(' ');
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Recorrido ${form.issi}</name><Placemark><name>Recorrido</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`;
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([kml],{type:'application/vnd.google-earth.kml+xml'})); a.download=`recorrido-${form.issi}-${form.fechaInicio}.kml`; a.click();
  };
  return (
    <div className="municipales-toolbar rgps-toolbar-outer rgps-form-bar">
      <div className="rgps-form-fields">
        <div className="rgps-field">
          <label>Radio</label>
          <RadioSelector radios={radios} value={form.issi} onChange={v => setForm(p=>({...p,issi:v}))} />
        </div>
        <div className="rgps-field"><label>Fecha inicio</label><input type="date" className="rgps-filter-select" value={form.fechaInicio} onChange={e=>setForm(p=>({...p,fechaInicio:e.target.value}))}/></div>
        <div className="rgps-field"><label>Hora inicio</label><input type="time" className="rgps-filter-select" value={form.horaInicio} onChange={e=>setForm(p=>({...p,horaInicio:e.target.value}))}/></div>
        <div className="rgps-field"><label>Fecha fin</label><input type="date" className="rgps-filter-select" value={form.fechaFin} onChange={e=>setForm(p=>({...p,fechaFin:e.target.value}))}/></div>
        <div className="rgps-field"><label>Hora fin</label><input type="time" className="rgps-filter-select" value={form.horaFin} onChange={e=>setForm(p=>({...p,horaFin:e.target.value}))}/></div>
      </div>
      <div className="rgps-form-actions">
        <button className="btn-rgps-primary" onClick={onBuscar} disabled={!form.issi||!form.fechaInicio||!form.fechaFin||loading}>
          {loading?<><RefreshCw size={13} className="spinning"/> Buscando...</>:<><Route size={13}/> Buscar</>}
        </button>
        {buscado && <>
          <button className="btn-municipales-refresh" onClick={onLimpiar}><X size={13}/> Limpiar</button>
          {puntos.length>0 && <>
            <button className="btn-municipales-excel" onClick={()=>exportXLS([['#','Lat','Lng','Vel','Fecha/Hora','Estado'],...puntos.map((p,i)=>[i+1,p.latitud,p.longitud,p.velocidad,p.fechaHora||'',p.estado||''])],`recorrido-${form.issi}`)}>
              <Download size={13}/> XLS
            </button>
            <button className="btn-municipales-refresh" onClick={exportarKML}><MapPin size={13}/> KML</button>
          </>}
        </>}
      </div>
    </div>
  );
};

const TablaHistorial = ({ puntos, buscado, loading, pagina, pageSize, setPagina, setPageSize }) => {
  if (!buscado) return <div className="municipales-empty-state" style={{color:'#94a3b8'}}><Route size={36}/><p>Selecciona una radio y un rango de fechas para ver el recorrido</p></div>;
  if (loading)  return <div className="municipales-loading-state"><RefreshCw size={28} className="spinning"/><p>Buscando recorrido...</p></div>;
  if (!puntos.length) return <div className="municipales-empty-state"><Route size={36}/><h3>Sin datos</h3><p>No hay puntos GPS para el período seleccionado</p></div>;
  const paginados = puntos.slice((pagina-1)*pageSize, pagina*pageSize);
  return (
    <>
      <div className="municipales-table-wrapper" style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
        <table className="municipales-table">
          <thead><tr><th>#</th><th>Fecha/Hora</th><th>Latitud</th><th>Longitud</th><th>Velocidad</th><th>Estado</th></tr></thead>
          <tbody>
            {paginados.map((p,i)=>(
              <tr key={i}>
                <td style={{color:'#94a3b8',fontSize:12}}>{(pagina-1)*pageSize+i+1}</td>
                <td style={{whiteSpace:'nowrap'}}>{p.fechaHora||'—'}</td>
                <td>{p.latitud?.toFixed(6)}</td><td>{p.longitud?.toFixed(6)}</td>
                <td>{p.velocidad} km/h</td><td>{p.estado||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination currentPage={pagina} totalItems={puntos.length} itemsPerPage={pageSize} onPageChange={setPagina} onLimitChange={n=>{setPageSize(n);setPagina(1);}}/>
    </>
  );
};

/* ════════════════════════════════════════════════════════════════════
   TAB KILOMETRAJE
   ════════════════════════════════════════════════════════════════════ */
const ToolbarKm = ({ radios, form, setForm, onBuscar, onLimpiar, loading, datos, buscado }) => (
  <div className="municipales-toolbar rgps-toolbar-outer rgps-form-bar">
    <div className="rgps-form-fields">
      <div className="rgps-field">
        <label>Radio</label>
        <RadioSelector radios={radios} value={form.issi} onChange={v => setForm(p=>({...p,issi:v}))} />
      </div>
      <div className="rgps-field"><label>Fecha inicio</label><input type="date" className="rgps-filter-select" value={form.fechaInicio} onChange={e=>setForm(p=>({...p,fechaInicio:e.target.value}))}/></div>
      <div className="rgps-field"><label>Fecha fin</label><input type="date" className="rgps-filter-select" value={form.fechaFin} onChange={e=>setForm(p=>({...p,fechaFin:e.target.value}))}/></div>
    </div>
    <div className="rgps-form-actions">
      <button className="btn-rgps-primary" onClick={onBuscar} disabled={!form.issi||!form.fechaInicio||!form.fechaFin||loading}>
        {loading?<><RefreshCw size={13} className="spinning"/> Consultando...</>:<><BarChart2 size={13}/> Consultar</>}
      </button>
      {buscado && <>
        <button className="btn-municipales-refresh" onClick={onLimpiar}><X size={13}/> Limpiar</button>
        {datos.length>0 && (
          <button className="btn-municipales-excel" onClick={()=>{
            const radio = radios.find(r=>String(r.issi)===String(form.issi));
            const nombre = radio?(radio.unicocodigo||radio.issi):form.issi;
            const total = datos.reduce((s,d)=>s+(parseFloat(d.kilometros)||0),0);
            exportXLS([['Radio','ISSI','Día','Fecha','Kilómetros'],...datos.map(d=>[nombre,form.issi,d.diaNombre||'',d.fecha||'',parseFloat(d.kilometros)||0]),['','','','TOTAL',total]],`kilometraje-${form.issi}`);
          }}><Download size={13}/> XLS</button>
        )}
      </>}
    </div>
  </div>
);

const TablaKm = ({ datos, buscado, loading }) => {
  if (!buscado) return <div className="municipales-empty-state" style={{color:'#94a3b8'}}><BarChart2 size={36}/><p>Selecciona una radio y un rango de fechas para consultar el kilometraje</p></div>;
  if (loading)  return <div className="municipales-loading-state"><RefreshCw size={28} className="spinning"/><p>Consultando...</p></div>;
  if (!datos.length) return <div className="municipales-empty-state"><BarChart2 size={36}/><h3>Sin datos</h3><p>No hay kilometraje registrado en ese período</p></div>;
  const total = datos.reduce((s,d)=>s+(parseFloat(d.kilometros)||0),0);
  return (
    <>
      <div className="rgps-km-chips">
        <div className="rgps-km-chip"><span>{datos.length}</span><small>días</small></div>
        <div className="rgps-km-chip accent"><span>{total.toFixed(2)} km</span><small>total recorrido</small></div>
        <div className="rgps-km-chip"><span>{(total/datos.length).toFixed(2)} km</span><small>promedio/día</small></div>
      </div>
      <div className="municipales-table-wrapper" style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
        <table className="municipales-table">
          <thead><tr><th>#</th><th>Día</th><th>Fecha</th><th style={{textAlign:'right'}}>Kilómetros</th></tr></thead>
          <tbody>
            {datos.map((d,i)=>(
              <tr key={i}>
                <td style={{color:'#94a3b8',fontSize:12}}>{i+1}</td>
                <td>{d.diaNombre||'—'}</td><td>{d.fecha||'—'}</td>
                <td style={{textAlign:'right',fontWeight:600,color:'#0891b2'}}>{parseFloat(d.kilometros||0).toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{background:'#f0f9ff',borderTop:'2px solid #bae6fd'}}>
              <td colSpan={3} style={{fontWeight:700}}>TOTAL</td>
              <td style={{textAlign:'right',fontWeight:700,color:'#0891b2'}}>{total.toFixed(2)} km</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key:'radios',      label:'Radios',      icon:Radio },
  { key:'zonas',       label:'Zonas GPS',   icon:MapPin },
  { key:'historial',   label:'Historial',   icon:Route },
  { key:'kilometraje', label:'Kilometraje', icon:BarChart2 },
];

const GestionRadiosGPS = () => {
  const [tab, setTab]       = useState('radios');
  const [radios, setRadios] = useState([]);
  const [loadingRadios, setLoadingRadios] = useState(false);

  // ── radios tab state ──
  const [filtros, setFiltros] = useState({ busqueda:'', filtroEstado:'TODOS', filtroTipo:'TODOS', pagina:1, pageSize:20 });

  // ── modal editar radio ──
  const [showModalRadio, setShowModalRadio] = useState(false);
  const [loadingInfoRadio, setLoadingInfoRadio] = useState(false);
  const [savingRadio, setSavingRadio] = useState(false);
  const [errorRadio, setErrorRadio] = useState(null);
  const [successRadio, setSuccessRadio] = useState(null);
  const [formRadio, setFormRadio] = useState({ issi:'', tipdesc:'', tipabre:'', unicodigo:'', unidesc:'', uniplaca:'', unimodelo:'', imei:'', idtipunidad:0 });

  // ── zonas tab state ──
  const [zonas, setZonas]           = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [showModalZona, setShowModalZona] = useState(false);
  const [editandoZona, setEditandoZona]   = useState(null);
  const [formZona, setFormZona]           = useState({ nombre:'', descripcion:'', color:COLORES_ZONA[0], radios_issi:[] });
  const [errorZona, setErrorZona]         = useState(null);
  const [successZona, setSuccessZona]     = useState(null);
  const [polygonCoords, setPolygonCoords] = useState([]);   // [[lat,lng], ...]
  const [polygonClosed, setPolygonClosed] = useState(false);
  const mapKeyRef = useRef(0);

  // ── historial tab state ──
  const [formHist, setFormHist] = useState({ issi:'', fechaInicio:'', horaInicio:'00:00', fechaFin:'', horaFin:'23:59' });
  const [puntos, setPuntos]     = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [buscadoHist, setBuscadoHist] = useState(false);
  const [paginaHist, setPaginaHist]   = useState(1);
  const [pageSizeHist, setPageSizeHist] = useState(20);

  // ── km tab state ──
  const [formKm, setFormKm]   = useState({ issi:'', fechaInicio:'', fechaFin:'' });
  const [datos, setDatos]     = useState([]);
  const [loadingKm, setLoadingKm]   = useState(false);
  const [buscadoKm, setBuscadoKm]   = useState(false);

  /* ── carga inicial ── */
  const cargarRadios = async () => {
    setLoadingRadios(true);
    try { setRadios(await obtenerRadios()); } catch {}
    setLoadingRadios(false);
  };
  const cargarZonas = async () => {
    setLoadingZonas(true);
    try { setZonas(await obtenerZonas()); } catch {}
    setLoadingZonas(false);
  };

  useEffect(() => { cargarRadios(); }, []);
  useEffect(() => { if (tab === 'zonas') cargarZonas(); }, [tab]);

  /* ── zonas handlers ── */
  const resetPoly = (z) => {
    try {
      const geo = JSON.parse(z?.geojson ?? 'null');
      const raw = geo?.geometry?.coordinates?.[0] ?? [];
      const pts = raw.length > 1 ? raw.slice(0, -1) : [];
      setPolygonCoords(pts);
      setPolygonClosed(pts.length >= 3);
    } catch { setPolygonCoords([]); setPolygonClosed(false); }
    mapKeyRef.current += 1;
  };
  const abrirNueva  = () => {
    if (radios.length === 0) cargarRadios();
    setFormZona({ nombre:'', descripcion:'', color:COLORES_ZONA[0], radios_issi:[] });
    setEditandoZona(null); resetPoly(null); setShowModalZona(true); setErrorZona(null);
  };
  const abrirEditar = (z) => {
    if (radios.length === 0) cargarRadios();
    let issis = [];
    try { issis = JSON.parse(z.radios_issi || '[]'); } catch {}
    setFormZona({ nombre:z.nombre, descripcion:z.descripcion||'', color:z.color, radios_issi: issis });
    setEditandoZona(z); resetPoly(z); setShowModalZona(true); setErrorZona(null);
  };
  const cerrarModal = () => { setShowModalZona(false); setEditandoZona(null); setPolygonCoords([]); setPolygonClosed(false); setErrorZona(null); };

  const polyAdd   = (pt) => { if (!polygonClosed) setPolygonCoords(p => [...p, pt]); };
  const polyClose = ()   => { if (polygonCoords.length >= 3) setPolygonClosed(true); };
  const polyClear = ()   => { setPolygonCoords([]); setPolygonClosed(false); };

  const guardarZona = async () => {
    if (!formZona.nombre.trim()) { setErrorZona('El nombre es obligatorio'); return; }
    const ring = polygonCoords.length >= 3
      ? [...polygonCoords, polygonCoords[0]]
      : [];
    const geojson = JSON.stringify({ type:'Feature', geometry:{ type:'Polygon', coordinates:[ring] } });
    const payload = { ...formZona, geojson, radios_issi: JSON.stringify(formZona.radios_issi) };
    try {
      if (editandoZona) {
        const u = await actualizarZona(editandoZona.id, payload);
        setZonas(p=>p.map(z=>z.id===editandoZona.id?{...z,...u}:z));
      } else {
        const n = await crearZona(payload);
        setZonas(p=>[n,...p]);
      }
      cerrarModal(); setSuccessZona(editandoZona?'Zona actualizada':'Zona creada'); setTimeout(()=>setSuccessZona(null),3000);
    } catch { setErrorZona('Error al guardar'); }
  };
  const toggleZona = async (z) => {
    try { await actualizarZona(z.id,{activo:!z.activo}); setZonas(p=>p.map(x=>x.id===z.id?{...x,activo:!x.activo}:x)); } catch {}
  };
  const borrarZona = async (id) => {
    if (!confirm('¿Eliminar esta zona GPS?')) return;
    try { await eliminarZona(id); setZonas(p=>p.filter(z=>z.id!==id)); } catch {}
  };

  /* ── historial handler ── */
  const buscarHistorial = async () => {
    setLoadingHist(true);
    try { setPuntos(await obtenerHistoricoRadio(formHist.issi,formHist.fechaInicio,formHist.horaInicio,formHist.fechaFin,formHist.horaFin)); setBuscadoHist(true); setPaginaHist(1); }
    catch {}
    setLoadingHist(false);
  };

  /* ── km handler ── */
  const buscarKm = async () => {
    setLoadingKm(true);
    try { setDatos(await obtenerKmDias(formKm.issi,formKm.fechaInicio,formKm.fechaFin)); setBuscadoKm(true); }
    catch {}
    setLoadingKm(false);
  };

  /* ── editar radio (Dolphin) ── */
  const abrirEditarRadio = async (radio) => {
    setErrorRadio(null); setSuccessRadio(null);
    setFormRadio({ issi: radio.issi, tipdesc:'', tipabre:'', unicodigo:'', unidesc:'', uniplaca:'', unimodelo:'', imei:'', idtipunidad:0 });
    setShowModalRadio(true);
    setLoadingInfoRadio(true);
    try {
      const info = await buscarInfoRadio(radio.issi);
      setFormRadio({
        issi:        info.issi,
        idtipunidad: info.idtipunidad ?? 0,
        tipdesc:     info.tipdesc    ?? '',
        tipabre:     info.tipabre    ?? '',
        unicodigo:   info.unicodigo  ?? '',
        unidesc:     info.unidesc    ?? '',
        uniplaca:    info.uniplaca   ?? '',
        unimodelo:   info.unimodelo  ?? '',
        imei:        info.imei       ?? '',
      });
    } catch { setErrorRadio('No se pudo cargar la información de la radio'); }
    setLoadingInfoRadio(false);
  };

  const guardarRadio = async () => {
    setSavingRadio(true); setErrorRadio(null);
    try {
      await actualizarRadio(formRadio.issi, {
        idtipunidad: formRadio.idtipunidad,
        tipdesc:     formRadio.tipdesc,
        tipabre:     formRadio.tipabre,
        unicodigo:   formRadio.unicodigo,
        unidesc:     formRadio.unidesc,
        uniplaca:    formRadio.uniplaca,
        unimodelo:   formRadio.unimodelo,
        imei:        formRadio.imei,
      });
      setSuccessRadio('Radio actualizada correctamente');
      setShowModalRadio(false);
      cargarRadios();
    } catch { setErrorRadio('Error al guardar los cambios'); }
    setSavingRadio(false);
  };

  /* ── limpiar handlers ── */
  const limpiarHistorial = () => {
    setFormHist({ issi:'', fechaInicio:'', horaInicio:'00:00', fechaFin:'', horaFin:'23:59' });
    setPuntos([]); setBuscadoHist(false);
  };
  const limpiarKm = () => {
    setFormKm({ issi:'', fechaInicio:'', fechaFin:'' });
    setDatos([]); setBuscadoKm(false);
  };

  /* ── render toolbars (fuera del card) ── */
  const renderToolbar = () => {
    if (tab === 'radios') return (
      <>
        {successRadio && (
          <div className="municipales-alert municipales-alert-success" style={{margin:'0 0 8px'}}>
            <Check size={14}/><span>{successRadio}</span>
            <button className="municipales-alert-close" onClick={() => setSuccessRadio(null)}><X size={12}/></button>
          </div>
        )}
        <ToolbarRadios radios={radios} loading={loadingRadios} onRecargar={cargarRadios} filtros={filtros} setFiltros={setFiltros} />
      </>
    );
    if (tab === 'zonas') return (
      <>
        {(errorZona||successZona) && (
          <div className={`municipales-alert ${errorZona?'municipales-alert-error':'municipales-alert-success'}`} style={{margin:'0 0 8px'}}>
            {errorZona?<X size={14}/>:<Check size={14}/>}<span>{errorZona||successZona}</span>
            <button className="municipales-alert-close" onClick={()=>{setErrorZona(null);setSuccessZona(null);}}><X size={12}/></button>
          </div>
        )}
        <ToolbarZonas onNueva={abrirNueva} onRecargar={cargarZonas} total={zonas.length}/>
      </>
    );
    if (tab === 'historial') return (
      <ToolbarHistorial radios={radios} form={formHist} setForm={setFormHist} onBuscar={buscarHistorial} loading={loadingHist} puntos={puntos} buscado={buscadoHist} onLimpiar={limpiarHistorial}/>
    );
    if (tab === 'kilometraje') return (
      <ToolbarKm radios={radios} form={formKm} setForm={setFormKm} onBuscar={buscarKm} loading={loadingKm} datos={datos} buscado={buscadoKm} onLimpiar={limpiarKm}/>
    );
  };

  /* ── render tabla (dentro del card) ── */
  const renderTabla = () => {
    if (tab === 'radios') return (
      loadingRadios
        ? <div className="municipales-loading-state"><RefreshCw size={28} className="spinning"/><p>Cargando radios GPS...</p></div>
        : <TablaRadios radios={radios} filtros={filtros} setFiltros={setFiltros} onEditar={abrirEditarRadio}/>
    );
    if (tab === 'zonas') return (
      loadingZonas
        ? <div className="municipales-loading-state"><RefreshCw size={28} className="spinning"/><p>Cargando zonas...</p></div>
        : <TablaZonas zonas={zonas} onEditar={abrirEditar} onToggle={toggleZona} onBorrar={borrarZona}/>
    );
    if (tab === 'historial')   return <TablaHistorial puntos={puntos} buscado={buscadoHist} loading={loadingHist} pagina={paginaHist} pageSize={pageSizeHist} setPagina={setPaginaHist} setPageSize={setPageSizeHist}/>;
    if (tab === 'kilometraje') return <TablaKm datos={datos} buscado={buscadoKm} loading={loadingKm}/>;
  };

  return (
    <div className="gestion-municipales-container">
      {/* Header */}
      <div className="municipales-header rgps-header">
        <div className="municipales-header-content">
          <div className="municipales-header-icon rgps-header-icon"><Radio size={22}/></div>
          <div className="municipales-header-text">
            <h1>Gestión de Radios GPS</h1>
            <p>Monitoreo de unidades, zonas de cerco, historial de recorrido y kilometraje</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rgps-tabs-bar">
        {TABS.map(({key,label,icon:Icon})=>(
          <button key={key} className={`rgps-tab${tab===key?' activo':''}`} onClick={()=>setTab(key)}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* Toolbar — FUERA del card, encima de la tabla */}
      {renderToolbar()}

      {/* Card de tabla — empieza directo con el header índigo */}
      <div className="municipales-content rgps-content">
        {renderTabla()}
      </div>

      {/* Modal editar radio */}
      {showModalRadio && (
        <div className="municipales-modal-overlay">
          <div className="municipales-modal-content" style={{maxWidth:480}}>
            <div className="municipales-modal-header">
              <h2><Pencil size={18}/><span>Editar Radio — ISSI {formRadio.issi}</span></h2>
              <button className="btn-icon-municipales" onClick={() => setShowModalRadio(false)}><X size={16}/></button>
            </div>
            <div className="municipales-modal-body">
              {errorRadio && <div className="municipales-alert municipales-alert-error"><X size={13}/><span>{errorRadio}</span></div>}
              {loadingInfoRadio ? (
                <div className="municipales-loading-state"><RefreshCw size={24} className="spinning"/><p>Cargando datos...</p></div>
              ) : (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="municipales-form-group">
                      <label><span>Tipo (desc)</span></label>
                      <input value={formRadio.tipdesc} onChange={e => setFormRadio(p=>({...p,tipdesc:e.target.value}))} placeholder="Ej: POLICIA"/>
                    </div>
                    <div className="municipales-form-group">
                      <label><span>Tipo (abrev)</span></label>
                      <input value={formRadio.tipabre} onChange={e => setFormRadio(p=>({...p,tipabre:e.target.value}))} placeholder="Ej: POL"/>
                    </div>
                    <div className="municipales-form-group">
                      <label><span>Código único</span></label>
                      <input value={formRadio.unicodigo} onChange={e => setFormRadio(p=>({...p,unicodigo:e.target.value}))} placeholder="Código"/>
                    </div>
                    <div className="municipales-form-group">
                      <label><span>Descripción</span></label>
                      <input value={formRadio.unidesc} onChange={e => setFormRadio(p=>({...p,unidesc:e.target.value}))} placeholder="Descripción"/>
                    </div>
                    <div className="municipales-form-group">
                      <label><span>Placa</span></label>
                      <input value={formRadio.uniplaca} onChange={e => setFormRadio(p=>({...p,uniplaca:e.target.value}))} placeholder="Placa"/>
                    </div>
                    <div className="municipales-form-group">
                      <label><span>Modelo</span></label>
                      <input value={formRadio.unimodelo} onChange={e => setFormRadio(p=>({...p,unimodelo:e.target.value}))} placeholder="Modelo"/>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="municipales-modal-footer" style={{paddingTop:8, paddingBottom:12, justifyContent:'flex-end', paddingRight:10}}>
              <button className="btn-cancel" onClick={() => setShowModalRadio(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardarRadio} disabled={savingRadio||loadingInfoRadio}>
                {savingRadio ? <><RefreshCw size={13} className="spinning"/> Guardando...</> : <><Save size={13}/> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal zonas */}
      {showModalZona && (
        <div className="municipales-modal-overlay rgps-zona-modal-overlay">
          <div className="municipales-modal-content" style={{maxWidth:620}}>
            <div className="municipales-modal-header">
              <h2>{editandoZona?<><Save size={18}/><span>Editar zona</span></>:<><Plus size={18}/><span>Nueva zona GPS</span></>}</h2>
              <button className="btn-icon-municipales" onClick={cerrarModal}><X size={16}/></button>
            </div>
            <div className="municipales-modal-body">
              {errorZona && <div className="municipales-alert municipales-alert-error"><X size={13}/><span>{errorZona}</span></div>}
              <div className="municipales-form-group">
                <label><MapPin size={13}/><span>Nombre *</span></label>
                <input placeholder="Ej: Zona Norte" value={formZona.nombre} onChange={e=>setFormZona(p=>({...p,nombre:e.target.value}))}/>
              </div>
              <div className="municipales-form-group">
                <label><Filter size={13}/><span>Descripción</span></label>
                <input placeholder="Descripción opcional" value={formZona.descripcion} onChange={e=>setFormZona(p=>({...p,descripcion:e.target.value}))}/>
              </div>
              <div className="municipales-form-group">
                <label><span>Color</span></label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                  {COLORES_ZONA.map(c=>(
                    <button key={c} type="button" onClick={()=>setFormZona(p=>({...p,color:c}))}
                      style={{width:26,height:26,borderRadius:'50%',background:c,border:formZona.color===c?'3px solid #1e293b':'2px solid rgba(0,0,0,0.15)',cursor:'pointer',transform:formZona.color===c?'scale(1.15)':'scale(1)'}}/>
                  ))}
                </div>
              </div>
              <div className="municipales-form-group">
                <label><Radio size={13}/><span>Radios asignadas a esta zona</span></label>
                <RadiosPicker
                  radios={radios}
                  selected={formZona.radios_issi}
                  onChange={v => setFormZona(p => ({...p, radios_issi: v}))}
                />
              </div>
              <div className="municipales-form-group">
                <label><MapPin size={13}/><span>Polígono de la zona</span></label>
                <ZonaPolyMap
                  color={formZona.color}
                  coords={polygonCoords}
                  closed={polygonClosed}
                  onAdd={polyAdd}
                  onClose={polyClose}
                  onClear={polyClear}
                  mapKey={mapKeyRef.current}
                />
              </div>
            </div>
            <div className="municipales-modal-footer">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-save" onClick={guardarZona}><Save size={13}/> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionRadiosGPS;
