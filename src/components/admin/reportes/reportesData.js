// Datos compartidos del módulo de Reportes de Incidencias.
// Normaliza dos fuentes muy distintas (Serenazgo/CECOM y PNP) a un mismo
// registro para que los gráficos, tablas, clusters y Excel funcionen igual
// para ambas y para el reporte comparativo.

const API_URL = import.meta.env.VITE_API_URL;

// ── Fuentes ───────────────────────────────────────────────────────────────────
export const SERENO = 'Serenazgo';
export const PNP    = 'PNP';

export const FUENTES = [
  { key: 'sereno', label: 'Serenazgo', color: '#1d4ed8' },
  { key: 'pnp',    label: 'PNP',       color: '#059669' },
  { key: 'ambas',  label: 'Ambas',     color: '#7c3aed' },
];

export const FUENTE_COLOR = { [SERENO]: '#1d4ed8', [PNP]: '#059669' };

// ── Catálogos PNP ─────────────────────────────────────────────────────────────
export const SHIFT_LABELS  = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };
export const STATUS_LABELS = { INVESTIGATING: 'En investigación', REFERRED: 'Derivado', CLOSED: 'Cerrado' };
export const STATUS_COLORS = { INVESTIGATING: '#3b82f6', REFERRED: '#f59e0b', CLOSED: '#22c55e' };

export const SIN_TIPIFICAR = '__sin_tipificar__';

// ── Catálogo de tipos Serenazgo ───────────────────────────────────────────────
export const GRUPOS = [
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

export const SIMPLES = [
  { key: 'danos',       label: 'Daños',       color: '#f97316', tipo: 3, subtype: 17 },
  { key: 'extorsiones', label: 'Extorsiones', color: '#ea580c', tipo: 3, subtype: 24 },
  { key: 'homicidios',  label: 'Homicidios',  color: '#1e293b', tipo: 1, subtype: 1  },
  { key: 'feminicidios',label: 'Feminicidios',color: '#a21caf', tipo: 1, subtype: 2  },
  { key: 'sicariatos',  label: 'Sicariatos',  color: '#7c3aed', tipo: 1, subtype: 3  },
  { key: 'secuestros',  label: 'Secuestros',  color: '#1d4ed8', tipo: 2, subtype: 6  },
  { key: 'drogas',      label: 'Drogas',      color: '#15803d', tipo: 5, subtype: 28 },
  { key: 'barras',      label: 'Barras',      color: '#a16207', tipo: 7, subtype: 31 },
];

export const ALL_ITEMS = [...GRUPOS.flatMap(g => g.items), ...SIMPLES];

// El id numérico lo usa el endpoint `incidence`; el nombre lo usa `pnp-incidence`
// (que guarda la jurisdicción como texto de comisaría).
export const JURISDICCIONES = [
  { id: '',  label: 'Todas las jurisdicciones', nombre: '' },
  { id: '1', label: 'Caja de Agua',     nombre: 'Caja de Agua'     },
  { id: '2', label: 'Zárate',           nombre: 'Zárate'           },
  { id: '3', label: 'Huayrona',         nombre: 'Huayrona'         },
  { id: '4', label: 'Canto Rey',        nombre: 'Canto Rey'        },
  { id: '5', label: 'Santa Elizabeth',  nombre: 'Santa Elizabeth'  },
  { id: '6', label: 'Bayóvar',          nombre: 'Bayóvar'          },
  { id: '7', label: 'Mariscal Cáceres', nombre: 'Mariscal Cáceres' },
  { id: '8', label: '10 de Octubre',    nombre: '10 de Octubre'    },
];

export const TIPO_COLORS = ['#1d4ed8','#7c3aed','#16a34a','#dc2626','#f97316','#0891b2','#a21caf','#854d0e','#15803d','#9333ea','#0369a1','#b45309','#be185d','#065f46','#1e40af'];

// ── Helpers ───────────────────────────────────────────────────────────────────
export const fmt = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getDefault = () => {
  const end = new Date(); const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: fmt(start), end: fmt(end) };
};

// El catálogo PNP viene en MAYÚSCULAS desde el seed ("FE PÚBLICA (DELITO)").
// Se pasa a mayúscula inicial para que lea igual de limpio que el de Serenazgo.
const ACRONIMOS = new Set(['PNP', 'DNI', 'RUC', 'SOAT', 'TID', 'ONG', 'VIH', 'SUNAT', 'MTC', 'CTS', 'SIDA']);

export const limpiarNombre = valor => {
  const txt = String(valor ?? '').trim();
  if (!txt) return '';
  const lower = txt.toLocaleLowerCase('es');
  const conInicial = lower.replace(/^(\P{L}*)(\p{L})/u, (_, pre, ch) => pre + ch.toLocaleUpperCase('es'));
  return conInicial.replace(/\p{L}+/gu, w => (ACRONIMOS.has(w.toLocaleUpperCase('es')) ? w.toLocaleUpperCase('es') : w));
};

// Normaliza para comparar nombres de jurisdicción (minúsculas, sin acentos)
export const norm = s => String(s ?? '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const getJson = async url => {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} en ${url}`);
  return res.json();
};

// `occurred_at` de PNP se guarda en UTC — se muestra en hora Lima (UTC-5)
export const utcToLima = isoStr => {
  if (!isoStr) return { fecha: '', hora: '' };
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = f.formatToParts(new Date(isoStr));
  const get = t => parts.find(p => p.type === t)?.value ?? '';
  return { fecha: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` };
};

// ── Fetch Serenazgo ───────────────────────────────────────────────────────────
export const fetchSereno = async ({ tipo, subtype, start, end, jurisdiction }) => {
  const params = new URLSearchParams({ type: tipo, start, end: `${end}T23:59:59`, page: 0, limit: 5000 });
  if (subtype)      params.set('subtype', subtype);
  if (jurisdiction) params.set('jurisdiction', jurisdiction);
  const json = await getJson(`${API_URL}incidence?${params}`);
  return (json.data?.data || []).map(r => ({
    fuente:       SERENO,
    codigo:       r.code || r.codigo_incidencia || '',
    descripcion:  r.description || r.Descripcion || '',
    fecha:        (r.date || r.occurred_at || '').split('T')[0],
    hora:         r.hour || '',
    turno:        r.shift || '',
    jurisdiccion: r.jurisdiction || r.Jurisdiccion || '',
    comisaria:    '',
    estado:       '',
    Latitud:      parseFloat(r.latitude  ?? r.Latitud),
    Longitud:     parseFloat(r.longitude ?? r.Longitud),
  })).filter(r => r.fecha && !isNaN(r.Latitud) && !isNaN(r.Longitud));
};

// ── Tipología PNP (Tipo → Subtipo → Modalidad) ────────────────────────────────
export const fetchPnpTipologia = async () => {
  const [tRes, sRes, mRes] = await Promise.all([
    getJson(`${API_URL}incidence-type?page=0`),
    getJson(`${API_URL}incidence-subtype?page=0`),
    getJson(`${API_URL}incidence-modality?page=0`),
  ]);
  const unwrap = j => j.data?.data || j.data || [];
  const types     = unwrap(tRes);
  const subtypes  = unwrap(sRes);
  const modalities= unwrap(mRes);

  const modBySub = {};
  modalities.forEach(m => { (modBySub[m.subtype_id] ||= []).push({ id: m.id, name: limpiarNombre(m.name) }); });
  const subByType = {};
  subtypes.forEach(s => {
    (subByType[s.type_id] ||= []).push({
      id: s.id, name: limpiarNombre(s.name),
      modalities: (modBySub[s.id] || []).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    });
  });

  const tree = types.map(t => ({
    id: t.id, name: limpiarNombre(t.name),
    subtypes: (subByType[t.id] || []).sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })).filter(t => t.subtypes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  // Etiqueta legible por modalidad, para el reporte
  const labelByModality = {};
  tree.forEach(t => t.subtypes.forEach(s => s.modalities.forEach(m => {
    labelByModality[m.id] = { modalidad: m.name, subtipo: s.name, tipo: t.name };
  })));

  return { tree, labelByModality };
};

export const fetchPnpJurisdicciones = async () => {
  const json = await getJson(`${API_URL}pnp-incidence/jurisdictions`);
  const list = json.data || json || [];
  return Array.isArray(list) ? list : [];
};

// Resuelve el nombre exacto que usa la BD de PNP a partir del label estático
export const resolvePnpJurisdiction = (label, apiList) => {
  if (!label) return '';
  const match = (apiList || []).find(j => norm(j) === norm(label));
  return match || label;
};

// ── Fetch PNP ─────────────────────────────────────────────────────────────────
export const fetchPnp = async ({ start, end, jurisdiction }) => {
  const params = new URLSearchParams({ start, end: `${end}T23:59:59`, page: 0, limit: 5000 });
  if (jurisdiction) params.set('jurisdiction', jurisdiction);
  const json = await getJson(`${API_URL}pnp-incidence?${params}`);
  const rows = json.data?.data || json.data || [];
  return rows.map(r => {
    const { fecha, hora } = utcToLima(r.occurred_at);
    const mod  = r.modality || null;
    const sub  = mod?.subtype || null;
    const tipo = sub?.type || null;
    return {
      fuente:       PNP,
      codigo:       r.complaint_number || '',
      descripcion:  r.description || '',
      fecha, hora,
      turno:        SHIFT_LABELS[r.shift] || '',
      jurisdiccion: r.jurisdiction || '',
      comisaria:    r.police_station || '',
      estado:       STATUS_LABELS[r.case_status] || '',
      direccion:    r.address || '',
      modalityId:   r.modality_id || SIN_TIPIFICAR,
      modalidad:    limpiarNombre(mod?.name || r.incidence_type) || 'Sin tipificar',
      subtipo:      limpiarNombre(sub?.name),
      tipoPnp:      limpiarNombre(tipo?.name),
      Latitud:      parseFloat(r.latitude),
      Longitud:     parseFloat(r.longitude),
    };
  }).filter(r => r.fecha && !isNaN(r.Latitud) && !isNaN(r.Longitud));
};

// Una incidencia puede apuntar a una modalidad ya eliminada (soft delete), que
// no aparece en el árbol. Se manda al bucket "Sin tipificar" para no perderla.
export const normalizarModalidades = (registros, labelByModality) =>
  registros.map(r => (
    r.modalityId !== SIN_TIPIFICAR && !labelByModality[r.modalityId]
      ? { ...r, modalityId: SIN_TIPIFICAR, modalidad: r.modalidad || 'Sin tipificar' }
      : r
  ));

// Agrupa los registros PNP por modalidad → mismo formato que Serenazgo:
// [{ key, label, fuente, registros }]
export const agruparPnp = (registros, labelByModality) => {
  const grupos = new Map();
  registros.forEach(r => {
    const key = `pnp:${r.modalityId}`;
    const info = labelByModality[r.modalityId];
    const label = info?.modalidad || r.modalidad || 'Sin tipificar';
    if (!grupos.has(key)) grupos.set(key, { key, label, fuente: PNP, registros: [] });
    grupos.get(key).registros.push(r);
  });
  return [...grupos.values()].sort((a, b) => b.registros.length - a.registros.length);
};
