import { useState, useCallback, useMemo } from 'react';
import ExcelJS from 'exceljs';
import {
  FileDown, Filter, RefreshCw, CalendarDays,
  ChevronDown, ChevronRight, BarChart2, AlertTriangle, ScatterChart, SlidersHorizontal,
} from 'lucide-react';
import { realizarClustering } from '../../utils/clustering.utils.js';

const API_URL = import.meta.env.VITE_API_URL;

// ── Diseño ────────────────────────────────────────────────────────────────────
const PRIMARY    = '#1d4ed8';
const BG         = 'var(--theme-bg)';
const CARD       = 'var(--theme-surface)';
const BORDER     = '1px solid var(--theme-border)';
const SHADOW     = 'var(--theme-shadow)';
const RADIUS     = 12;
const TEXT_DARK  = 'var(--theme-text)';
const TEXT_MID   = 'var(--theme-text-3)';
const TEXT_LIGHT = 'var(--theme-text-4)';

// ── Catálogo de tipos ─────────────────────────────────────────────────────────
const GRUPOS = [
  {
    key: 'robos', label: 'Robos', color: '#1d4ed8',
    items: [
      { key: 'roboPersonas',   label: 'Robo a Personas',    tipo: 3, subtype: 10 },
      { key: 'roboCasa',       label: 'Robo Casa Habitada', tipo: 3, subtype: 11 },
      { key: 'roboGanado',     label: 'Robo de Ganado',     tipo: 3, subtype: 12 },
      { key: 'roboEmpresas',   label: 'Robo a Empresas',    tipo: 3, subtype: 13 },
      { key: 'roboVehiculos',  label: 'Robo de Vehículos',  tipo: 3, subtype: 14 },
      { key: 'roboAutopartes', label: 'Robo de Autopartes', tipo: 3, subtype: 15 },
      { key: 'roboPasajeros',  label: 'Robo a Pasajeros',   tipo: 3, subtype: 16 },
    ],
  },
  {
    key: 'hurtos', label: 'Hurtos', color: '#7c3aed',
    items: [
      { key: 'hurtoPersonas',  label: 'Hurto a Personas',    tipo: 3, subtype: 18 },
      { key: 'hurtoCasa',      label: 'Hurto Casa Habitada', tipo: 3, subtype: 19 },
      { key: 'hurtoGanado',    label: 'Hurto de Ganado',     tipo: 3, subtype: 20 },
      { key: 'hurtoEmpresas',  label: 'Hurto a Empresas',    tipo: 3, subtype: 21 },
      { key: 'hurtoVehiculos', label: 'Hurto de Vehículos',  tipo: 3, subtype: 22 },
      { key: 'hurtoPasajeros', label: 'Hurto a Pasajeros',   tipo: 3, subtype: 23 },
    ],
  },
];

const SIMPLES = [
  { key: 'danos',       label: 'Daños',       color: '#f97316', tipo: 3, subtype: 17 },
  { key: 'extorsiones', label: 'Extorsiones', color: '#ea580c', tipo: 3, subtype: 24 },
  { key: 'homicidios',  label: 'Homicidios',  color: '#1e293b', tipo: 1, subtype: 1  },
  { key: 'feminicidios',label: 'Feminicidios',color: '#a21caf', tipo: 1, subtype: 2  },
  { key: 'sicariatos',  label: 'Sicariatos',  color: '#7c3aed', tipo: 1, subtype: 3  },
  { key: 'secuestros',  label: 'Secuestros',  color: '#1d4ed8', tipo: 2, subtype: 6  },
  { key: 'drogas',      label: 'Drogas',      color: '#15803d', tipo: 5, subtype: 28 },
  { key: 'barras',      label: 'Barras',      color: '#a16207', tipo: 7, subtype: 31 },
];

const ALL_ITEMS = [...GRUPOS.flatMap(g => g.items), ...SIMPLES];

const JURISDICCIONES = [
  { id: '',  label: 'Todas las jurisdicciones' },
  { id: '1', label: 'Caja de Agua'     },
  { id: '2', label: 'Zárate'           },
  { id: '3', label: 'Huayrona'         },
  { id: '4', label: 'Canto Rey'        },
  { id: '5', label: 'Santa Elizabeth'  },
  { id: '6', label: 'Bayóvar'          },
  { id: '7', label: 'Mariscal Cáceres' },
  { id: '8', label: '10 de Octubre'    },
];

const fmt = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
const getDefault = () => {
  const end = new Date(); const start = new Date();
  start.setDate(end.getDate()-29);
  return { start: fmt(start), end: fmt(end) };
};

// ── Fetch incidencias (con coordenadas) ───────────────────────────────────────
const fetchTipologia = async ({ tipo, subtype, start, end, jurisdiction }) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const params = new URLSearchParams({ type: tipo, start, end: `${end}T23:59:59`, page: 0, limit: 5000 });
  if (subtype)      params.set('subtype', subtype);
  if (jurisdiction) params.set('jurisdiction', jurisdiction);
  const res  = await fetch(`${API_URL}incidence?${params}`, { headers });
  const json = await res.json();
  return (json.data?.data || []).map(r => ({
    codigo:       r.code || r.codigo_incidencia || '',
    descripcion:  r.description || r.Descripcion || '',
    fecha:        (r.date || r.occurred_at || '').split('T')[0],
    hora:         r.hour || '',
    turno:        r.shift || '',
    jurisdiccion: r.jurisdiction || r.Jurisdiccion || '',
    Latitud:      parseFloat(r.latitude  ?? r.Latitud),
    Longitud:     parseFloat(r.longitude ?? r.Longitud),
  })).filter(r => r.fecha && !isNaN(r.Latitud) && !isNaN(r.Longitud));
};

// ── Excel — Incidencias ───────────────────────────────────────────────────────
const generarExcelIncidencias = async (data, filtroLabel, rangoLabel) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CECOM - Sistema de Gestión'; wb.created = new Date();

  const ws1 = wb.addWorksheet('Resumen');
  ws1.columns = [{ key:'tipo', width:28 },{ key:'total', width:12 },{ key:'pct', width:14 }];
  ws1.addRow(['REPORTE DE INCIDENCIAS DELICTIVAS']).font = { bold:true, size:14, color:{ argb:'FF1D4ED8' } };
  ws1.mergeCells('A1:C1');
  ws1.addRow([`Período: ${rangoLabel}`]).font = { italic:true, color:{ argb:'FF6B7280' } };
  ws1.addRow([`Filtro: ${filtroLabel}`]).font = { italic:true, color:{ argb:'FF6B7280' } };
  ws1.addRow([`Generado: ${new Date().toLocaleString('es-PE')}`]).font = { italic:true, color:{ argb:'FF6B7280' } };
  ws1.addRow([]);
  const hdr = ws1.addRow(['Tipo de Incidencia','Total','% del Total']);
  hdr.eachCell(c => { c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4ED8'}}; c.alignment={horizontal:'center'}; });
  const total = data.reduce((s,r)=>s+r.registros.length, 0);
  data.forEach(({ label, registros }) => {
    const row = ws1.addRow([label, registros.length, total>0?`${((registros.length/total)*100).toFixed(1)}%`:'0%']);
    row.getCell(2).alignment={horizontal:'center'}; row.getCell(3).alignment={horizontal:'center'};
  });
  const tot = ws1.addRow(['TOTAL GENERAL', total, '100%']);
  tot.font={bold:true}; tot.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FF'}}; c.alignment={horizontal:'center'}; });
  ws1.addRow([]);
  const hdrJ = ws1.addRow(['Jurisdicción','Total','% del Total']);
  hdrJ.eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16A34A'}}; c.alignment={horizontal:'center'}; });
  const byJur = {};
  data.forEach(({ registros }) => registros.forEach(r => { byJur[r.jurisdiccion||'Sin datos']=(byJur[r.jurisdiccion||'Sin datos']||0)+1; }));
  Object.entries(byJur).sort((a,b)=>b[1]-a[1]).forEach(([j,n]) => {
    const row=ws1.addRow([j,n,total>0?`${((n/total)*100).toFixed(1)}%`:'0%']);
    row.getCell(2).alignment={horizontal:'center'}; row.getCell(3).alignment={horizontal:'center'};
  });

  const ws2 = wb.addWorksheet('Detalle');
  ws2.columns = [
    {header:'Tipo',key:'tipo',width:22},{header:'Código',key:'codigo',width:18},
    {header:'Jurisdicción',key:'jurisdiccion',width:22},{header:'Turno',key:'turno',width:16},
    {header:'Fecha',key:'fecha',width:14},{header:'Hora',key:'hora',width:12},
    {header:'Descripción',key:'descripcion',width:40},
  ];
  ws2.getRow(1).eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4ED8'}}; c.alignment={horizontal:'center'}; });
  let ri=2;
  data.forEach(({ label, registros }) => registros.forEach(r => {
    ws2.addRow({ tipo:label, codigo:r.codigo, jurisdiccion:r.jurisdiccion, turno:r.turno, fecha:r.fecha, hora:r.hora, descripcion:r.descripcion });
    if (ri%2===0) ws2.getRow(ri).eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; });
    ri++;
  }));

  _download(wb, `Reporte_Incidencias_${fmt(new Date())}.xlsx`);
};

// ── Excel — Clusters ──────────────────────────────────────────────────────────
const generarExcelClusters = async (clusters, filtroLabel, rangoLabel, radio) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CECOM - Sistema de Gestión'; wb.created = new Date();

  // ── Hoja resumen ──
  const ws1 = wb.addWorksheet('Resumen Clusters');
  ws1.columns = [
    {key:'num',  width:10},{key:'jur',   width:22},{key:'cant',  width:14},
    {key:'radio',width:12},{key:'tipos', width:36},{key:'lat',   width:16},{key:'lng', width:16},
  ];
  ws1.addRow(['REPORTE DE CLUSTERS DE INCIDENCIAS']).font={bold:true,size:14,color:{argb:'FF1D4ED8'}};
  ws1.mergeCells('A1:G1');
  ws1.addRow([`Período: ${rangoLabel}`]).font={italic:true,color:{argb:'FF6B7280'}};
  ws1.addRow([`Radio de clustering: ${radio} m`]).font={italic:true,color:{argb:'FF6B7280'}};
  ws1.addRow([`Filtro: ${filtroLabel}`]).font={italic:true,color:{argb:'FF6B7280'}};
  ws1.addRow([`Generado: ${new Date().toLocaleString('es-PE')}`]).font={italic:true,color:{argb:'FF6B7280'}};
  ws1.addRow([]);
  const hdr = ws1.addRow(['Cluster #','Jurisdicción Principal','# Incidencias','Radio (m)','Tipos','Latitud Centroide','Longitud Centroide']);
  hdr.eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4ED8'}}; c.alignment={horizontal:'center'}; });

  clusters.forEach((cl, i) => {
    const jurCount = {};
    cl.puntos.forEach(p=>{ jurCount[p.jurisdiccion||'Sin datos']=(jurCount[p.jurisdiccion||'Sin datos']||0)+1; });
    const jurPrincipal = Object.entries(jurCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const tipoCount = {};
    cl.puntos.forEach(p=>{ tipoCount[p.Tipo||'—']=(tipoCount[p.Tipo||'—']||0)+1; });
    const tiposStr = Object.entries(tipoCount).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${t}(${n})`).join(', ');
    const row = ws1.addRow([
      i+1, jurPrincipal, cl.cantidad, Math.round(cl.radio),
      tiposStr, cl.centroide.lat.toFixed(6), cl.centroide.lng.toFixed(6),
    ]);
    row.getCell(3).alignment={horizontal:'center'};
    row.getCell(4).alignment={horizontal:'center'};
    if ((i+1)%2===0) row.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; });
  });

  const totRow = ws1.addRow(['', 'TOTAL', clusters.reduce((s,c)=>s+c.cantidad,0), '', '', '', '']);
  totRow.font={bold:true}; totRow.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FF'}}; });

  // ── Hoja detalle ──
  const ws2 = wb.addWorksheet('Detalle por Cluster');
  const detCols = [
    {header:'Cluster #',key:'clNum',width:12},{header:'Tipo',key:'tipo',width:22},
    {header:'Código',key:'codigo',width:18},{header:'Jurisdicción',key:'jur',width:22},
    {header:'Turno',key:'turno',width:16},{header:'Fecha',key:'fecha',width:14},
    {header:'Hora',key:'hora',width:12},{header:'Descripción',key:'desc',width:40},
  ];
  ws2.columns = detCols;
  ws2.getRow(1).eachCell(c=>{ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4ED8'}}; c.alignment={horizontal:'center'}; });

  let ri2=2;
  clusters.forEach((cl, i) => {
    // Fila cabecera del cluster
    const clHdr = ws2.addRow([`── Cluster ${i+1} — ${cl.cantidad} incidencias — Radio ${Math.round(cl.radio)} m`, '', '', '', '', '', '', '']);
    ws2.mergeCells(`A${ri2}:H${ri2}`);
    clHdr.font={bold:true,italic:true}; clHdr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE0E7FF'}};
    ri2++;
    cl.puntos.forEach(p => {
      ws2.addRow({ clNum:i+1, tipo:p.Tipo||'—', codigo:p.codigo, jur:p.jurisdiccion, turno:p.turno, fecha:p.fecha, hora:p.hora, desc:p.descripcion });
      if (ri2%2===0) ws2.getRow(ri2).eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; });
      ri2++;
    });
  });

  _download(wb, `Reporte_Clusters_${fmt(new Date())}.xlsx`);
};

const _download = async (wb, filename) => {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── Componente ────────────────────────────────────────────────────────────────
const ReporteIncidencias = () => {
  const [modo, setModo]           = useState('incidencias'); // 'incidencias' | 'clusters'
  const [range, setRange]         = useState(getDefault);
  const [jurisdiction, setJur]    = useState('');
  const [selected, setSelected]   = useState(() => Object.fromEntries(ALL_ITEMS.map(i=>[i.key,true])));
  const [expanded, setExpanded]   = useState({ robos:false, hurtos:false });
  const [radio, setRadio]         = useState(100);
  const [loading, setLoading]     = useState(false);
  const [rawData, setRawData]     = useState(null); // array de { label, key, registros[] }

  const toggleItem  = key  => setSelected(p=>({...p,[key]:!p[key]}));
  const toggleGrupo = gkey => {
    const keys = GRUPOS.find(g=>g.key===gkey)?.items.map(i=>i.key)??[];
    const allOn = keys.every(k=>selected[k]);
    setSelected(p=>({...p,...Object.fromEntries(keys.map(k=>[k,!allOn]))}));
  };
  const toggleAll = () => {
    const allOn = ALL_ITEMS.every(i=>selected[i.key]);
    setSelected(Object.fromEntries(ALL_ITEMS.map(i=>[i.key,!allOn])));
  };
  const activeItems = ALL_ITEMS.filter(i=>selected[i.key]);

  // Clusters calculados en tiempo real desde rawData
  const clusters = useMemo(() => {
    if (!rawData || modo !== 'clusters') return [];
    const allPuntos = rawData.flatMap(({ label, registros }) =>
      registros.map(r => ({ ...r, Tipo: label }))
    );
    const seen = new Set();
    const uniq = allPuntos.filter(p => {
      const k = p.codigo || `${p.Latitud.toFixed(5)},${p.Longitud.toFixed(5)}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    return realizarClustering(uniq, radio).sort((a,b)=>b.cantidad-a.cantidad);
  }, [rawData, radio, modo]);

  const cargar = useCallback(async () => {
    if (!activeItems.length) return;
    setLoading(true); setRawData(null);
    try {
      const results = await Promise.allSettled(
        activeItems.map(async item => {
          const registros = await fetchTipologia({ ...item, start:range.start, end:range.end, jurisdiction });
          return { label:item.label, key:item.key, registros };
        })
      );
      setRawData(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));
    } finally { setLoading(false); }
  }, [activeItems, range, jurisdiction]);

  const totalIncidencias = rawData?.reduce((s,r)=>s+r.registros.length, 0) ?? 0;
  const jurLabel = JURISDICCIONES.find(j=>j.id===jurisdiction)?.label ?? 'Todas';
  const tiposLabel = activeItems.length===ALL_ITEMS.length ? 'Todos los tipos' : activeItems.map(i=>i.label).join(', ');
  const rangoLabel = `${range.start} al ${range.end}`;

  const inputSt = {
    padding:'7px 10px', borderRadius:8, border:BORDER,
    background:CARD, color:TEXT_DARK, fontSize:13, outline:'none',
    fontFamily:'inherit', width:'100%', boxSizing:'border-box',
  };
  const btnSt = (bg=PRIMARY) => ({
    display:'flex', alignItems:'center', gap:7, padding:'9px 20px',
    borderRadius:9, border:'none', background:bg, color:'white',
    cursor:'pointer', fontSize:13, fontWeight:700, transition:'opacity 0.15s',
  });

  return (
    <div style={{ background:BG, minHeight:'100vh', padding:'28px 32px', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Título + tabs */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:'0 0 12px', fontSize:22, fontWeight:800, color:TEXT_DARK }}>Reportes de Incidencias</h1>
        <div style={{ display:'flex', gap:6 }}>
          {[
            { key:'incidencias', label:'Por Incidencia', icon:<BarChart2 size={14}/> },
            { key:'clusters',    label:'Por Cluster',    icon:<ScatterChart size={14}/> },
          ].map(t => (
            <button key={t.key} onClick={()=>setModo(t.key)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
              borderRadius:9, border:`1.5px solid ${modo===t.key?PRIMARY:'#e2e8f0'}`,
              background: modo===t.key ? PRIMARY : CARD,
              color: modo===t.key ? 'white' : TEXT_MID,
              cursor:'pointer', fontSize:13, fontWeight:600,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20, alignItems:'start' }}>

        {/* ── Panel filtros ── */}
        <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:TEXT_DARK, display:'flex', alignItems:'center', gap:6 }}>
            <Filter size={15} color={PRIMARY}/> Filtros
          </div>

          {/* Fechas */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
              <CalendarDays size={13}/> Período
            </label>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:TEXT_LIGHT, marginBottom:3 }}>Desde</div>
                <input type="date" value={range.start} max={range.end} style={inputSt}
                  onChange={e=>setRange(p=>({...p,start:e.target.value}))}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:TEXT_LIGHT, marginBottom:3 }}>Hasta</div>
                <input type="date" value={range.end} min={range.start} max={fmt(new Date())} style={inputSt}
                  onChange={e=>setRange(p=>({...p,end:e.target.value}))}/>
              </div>
            </div>
          </div>

          {/* Jurisdicción */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Jurisdicción</label>
            <select value={jurisdiction} onChange={e=>setJur(e.target.value)} style={inputSt}>
              {JURISDICCIONES.map(j=><option key={j.id} value={j.id}>{j.label}</option>)}
            </select>
          </div>

          {/* Radio — solo en modo clusters */}
          {modo === 'clusters' && (
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                <SlidersHorizontal size={13}/> Radio de clustering
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="range" min={10} max={500} value={radio} onChange={e=>setRadio(Number(e.target.value))}
                  style={{ flex:1, accentColor:PRIMARY }}/>
                <span style={{ fontSize:13, fontWeight:700, color:PRIMARY, minWidth:56 }}>{radio} m</span>
              </div>
              <div style={{ fontSize:11, color:TEXT_LIGHT, marginTop:3 }}>
                Incidencias dentro de {radio}m se agrupan en un cluster
              </div>
            </div>
          )}

          {/* Tipos */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tipos</label>
              <button onClick={toggleAll} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:PRIMARY, fontWeight:600 }}>
                {ALL_ITEMS.every(i=>selected[i.key]) ? 'Quitar todos' : 'Selec. todos'}
              </button>
            </div>
            {GRUPOS.map(g=>{
              const keys=g.items.map(i=>i.key), activeC=keys.filter(k=>selected[k]).length, allOn=activeC===keys.length, isExp=expanded[g.key];
              return (
                <div key={g.key} style={{ marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:7, background:'var(--theme-surface-2)', border:BORDER, marginBottom:isExp?3:0 }}>
                    <input type="checkbox" checked={allOn}
                      ref={el=>{ if(el) el.indeterminate=activeC>0&&!allOn; }}
                      onChange={()=>toggleGrupo(g.key)}
                      style={{ width:14, height:14, accentColor:g.color, cursor:'pointer', flexShrink:0 }}/>
                    <span style={{ flex:1, fontSize:12, fontWeight:600, color:g.color, cursor:'pointer' }}
                      onClick={()=>setExpanded(p=>({...p,[g.key]:!p[g.key]}))}>
                      {g.label}
                    </span>
                    <span style={{ fontSize:10, color:TEXT_LIGHT }}>({activeC}/{keys.length})</span>
                    <span style={{ color:TEXT_LIGHT, cursor:'pointer' }} onClick={()=>setExpanded(p=>({...p,[g.key]:!p[g.key]}))}>
                      {isExp ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </span>
                  </div>
                  {isExp && (
                    <div style={{ paddingLeft:14 }}>
                      {g.items.map(item=>(
                        <label key={item.key} style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 0', cursor:'pointer', fontSize:12, color:TEXT_MID }}>
                          <input type="checkbox" checked={!!selected[item.key]} onChange={()=>toggleItem(item.key)}
                            style={{ width:13, height:13, accentColor:g.color, cursor:'pointer' }}/>
                          {item.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, marginTop:4 }}>
              {SIMPLES.map(item=>(
                <label key={item.key} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 6px', borderRadius:6, background:'var(--theme-surface-2)', border:BORDER, cursor:'pointer', fontSize:12, color:TEXT_MID }}>
                  <input type="checkbox" checked={!!selected[item.key]} onChange={()=>toggleItem(item.key)}
                    style={{ width:13, height:13, accentColor:item.color, cursor:'pointer' }}/>
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <button onClick={cargar} disabled={loading||!activeItems.length}
            style={{ ...btnSt('#16a34a'), justifyContent:'center', opacity:loading||!activeItems.length?0.6:1 }}>
            <RefreshCw size={14} style={{ animation:loading?'spin 0.9s linear infinite':'none' }}/>
            {loading ? 'Cargando...' : 'Cargar datos'}
          </button>
        </div>

        {/* ── Resultados ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {!rawData && !loading && (
            <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, padding:60, textAlign:'center', color:TEXT_LIGHT }}>
              {modo==='clusters' ? <ScatterChart size={40} style={{ marginBottom:12, opacity:0.4 }}/> : <BarChart2 size={40} style={{ marginBottom:12, opacity:0.4 }}/>}
              <div style={{ fontSize:14, fontWeight:500 }}>Configura los filtros y presiona "Cargar datos"</div>
            </div>
          )}

          {loading && (
            <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, padding:60, textAlign:'center', color:TEXT_LIGHT }}>
              <div style={{ width:36, height:36, border:`3px solid ${PRIMARY}20`, borderTop:`3px solid ${PRIMARY}`, borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 12px' }}/>
              <div style={{ fontSize:14 }}>Consultando incidencias...</div>
            </div>
          )}

          {/* ════ MODO INCIDENCIAS ════ */}
          {rawData && !loading && modo === 'incidencias' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {[
                  { label:'Total incidencias',   value: totalIncidencias.toLocaleString('es-PE'), color:PRIMARY },
                  { label:'Tipos con datos',      value: rawData.filter(r=>r.registros.length>0).length, color:'#16a34a' },
                  { label:'Jurisdicción',         value: jurLabel, color:'#7c3aed', small:true },
                ].map((k,i)=>(
                  <div key={i} style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, padding:'16px 20px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontSize:k.small?16:28, fontWeight:700, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:TEXT_DARK }}>Resumen por tipo</span>
                  <button onClick={()=>generarExcelIncidencias(rawData, `${tiposLabel} — ${jurLabel}`, rangoLabel)} style={{ ...btnSt('#16a34a'), padding:'7px 16px' }}>
                    <FileDown size={15}/> Descargar Excel
                  </button>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead><tr>
                    {['Tipo de Incidencia','Registros','% del Total'].map(h=>(
                      <th key={h} style={{ padding:'9px 16px', textAlign:h==='Registros'||h==='% del Total'?'center':'left', fontWeight:600, fontSize:11, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[...rawData].sort((a,b)=>b.registros.length-a.registros.length).map((row,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid var(--theme-border-2)' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'9px 16px', color:TEXT_DARK, fontWeight:500 }}>{row.label}</td>
                        <td style={{ padding:'9px 16px', textAlign:'center', fontWeight:700, color:PRIMARY }}>{row.registros.length.toLocaleString('es-PE')}</td>
                        <td style={{ padding:'9px 16px', textAlign:'center', color:TEXT_MID }}>{totalIncidencias>0?`${((row.registros.length/totalIncidencias)*100).toFixed(1)}%`:'0%'}</td>
                      </tr>
                    ))}
                    <tr style={{ background:'#eff6ff', fontWeight:700 }}>
                      <td style={{ padding:'10px 16px', color:TEXT_DARK }}>TOTAL</td>
                      <td style={{ padding:'10px 16px', textAlign:'center', color:PRIMARY }}>{totalIncidencias.toLocaleString('es-PE')}</td>
                      <td style={{ padding:'10px 16px', textAlign:'center', color:TEXT_MID }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Vista previa detalle */}
              <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:TEXT_DARK }}>Vista previa <span style={{ fontSize:12, color:TEXT_LIGHT, fontWeight:400 }}>(primeras 20 filas — el Excel incluye todo)</span></span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>
                      {['Tipo','Código','Jurisdicción','Turno','Fecha','Descripción'].map(h=>(
                        <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontWeight:600, fontSize:10, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {rawData.flatMap(row=>row.registros.map(r=>({...r,tipo:row.label}))).slice(0,20).map((r,i)=>(
                        <tr key={i} style={{ borderBottom:'1px solid var(--theme-border-2)' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'7px 14px', whiteSpace:'nowrap' }}>
                            <span style={{ background:`${PRIMARY}12`, color:PRIMARY, borderRadius:4, padding:'2px 7px', fontSize:10, fontWeight:700 }}>{r.tipo}</span>
                          </td>
                          <td style={{ padding:'7px 14px', fontFamily:'monospace', color:PRIMARY, fontSize:11 }}>{r.codigo||'—'}</td>
                          <td style={{ padding:'7px 14px', color:TEXT_MID }}>{r.jurisdiccion||'—'}</td>
                          <td style={{ padding:'7px 14px', color:TEXT_MID }}>{r.turno||'—'}</td>
                          <td style={{ padding:'7px 14px', color:TEXT_MID, whiteSpace:'nowrap' }}>{r.fecha||'—'}</td>
                          <td style={{ padding:'7px 14px', color:TEXT_LIGHT, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.descripcion||'—'}</td>
                        </tr>
                      ))}
                      {totalIncidencias===0 && (
                        <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:TEXT_LIGHT }}>
                          <AlertTriangle size={20} style={{ marginBottom:6, opacity:0.5 }}/>
                          <div>Sin incidencias para los filtros seleccionados</div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ════ MODO CLUSTERS ════ */}
          {rawData && !loading && modo === 'clusters' && (
            <>
              {/* KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {[
                  { label:'Total clusters',    value: clusters.length,                      color:PRIMARY },
                  { label:'Total incidencias', value: clusters.reduce((s,c)=>s+c.cantidad,0).toLocaleString('es-PE'), color:'#16a34a' },
                  { label:'Radio usado',       value: `${radio} m`,                         color:'#f97316' },
                  { label:'Jurisdicción',      value: jurLabel,                             color:'#7c3aed', small:true },
                ].map((k,i)=>(
                  <div key={i} style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, padding:'16px 20px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontSize:k.small?14:26, fontWeight:700, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Tabla de clusters */}
              <div style={{ background:CARD, borderRadius:RADIUS, border:BORDER, boxShadow:SHADOW, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:TEXT_DARK }}>
                    Clusters detectados — radio {radio} m
                  </span>
                  <button
                    onClick={()=>generarExcelClusters(clusters, `${tiposLabel} — ${jurLabel}`, rangoLabel, radio)}
                    disabled={clusters.length===0}
                    style={{ ...btnSt('#16a34a'), padding:'7px 16px', opacity:clusters.length===0?0.5:1 }}>
                    <FileDown size={15}/> Descargar Excel
                  </button>
                </div>

                {clusters.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:TEXT_LIGHT }}>
                    <ScatterChart size={28} style={{ marginBottom:8, opacity:0.4 }}/>
                    <div style={{ fontSize:13 }}>No se formaron clusters con el radio seleccionado.<br/>Intenta aumentar el radio.</div>
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead><tr>
                        {['#','Jurisdicción principal','Incidencias','Radio real (m)','Tipos de incidencia'].map(h=>(
                          <th key={h} style={{ padding:'9px 14px', textAlign:h==='Incidencias'||h==='Radio real (m)'?'center':'left', fontWeight:600, fontSize:10, color:TEXT_LIGHT, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {clusters.map((cl, i) => {
                          const jurCount={};
                          cl.puntos.forEach(p=>{ jurCount[p.jurisdiccion||'Sin datos']=(jurCount[p.jurisdiccion||'Sin datos']||0)+1; });
                          const jurP = Object.entries(jurCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
                          const tipoCount={};
                          cl.puntos.forEach(p=>{ tipoCount[p.Tipo||'—']=(tipoCount[p.Tipo||'—']||0)+1; });
                          const intensidad = cl.cantidad<=3?{bg:'#fef3c7',color:'#92400e'}:cl.cantidad<=6?{bg:'#fee2e2',color:'#991b1b'}:{bg:'#fde8d8',color:'#9a3412'};
                          return (
                            <tr key={i} style={{ borderBottom:'1px solid var(--theme-border-2)' }}
                              onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <td style={{ padding:'9px 14px', fontWeight:700, color:TEXT_DARK }}>{i+1}</td>
                              <td style={{ padding:'9px 14px', color:TEXT_MID }}>{jurP}</td>
                              <td style={{ padding:'9px 14px', textAlign:'center' }}>
                                <span style={{ background:intensidad.bg, color:intensidad.color, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
                                  {cl.cantidad}
                                </span>
                              </td>
                              <td style={{ padding:'9px 14px', textAlign:'center', color:TEXT_MID, fontFamily:'monospace' }}>{Math.round(cl.radio)}</td>
                              <td style={{ padding:'9px 14px' }}>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                  {Object.entries(tipoCount).sort((a,b)=>b[1]-a[1]).map(([t,n])=>(
                                    <span key={t} style={{ background:`${PRIMARY}12`, color:PRIMARY, borderRadius:4, padding:'1px 7px', fontSize:10, fontWeight:600, whiteSpace:'nowrap' }}>
                                      {t} ×{n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Nota sobre el radio */}
              {rawData && clusters.length > 0 && (
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 16px', fontSize:12, color:TEXT_MID }}>
                  💡 <b>Tip:</b> Ajusta el slider de radio en los filtros para ver cómo cambian los clusters en tiempo real. El Excel se descarga con el radio y configuración actuales.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default ReporteIncidencias;
