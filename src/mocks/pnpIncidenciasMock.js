const INCIDENCE_TYPES = [
  'Robo al paso', 'Robo agravado', 'Microcomercialización de drogas',
  'Violencia familiar', 'Accidente de tránsito', 'Violencia sexual',
  'Homicidio', 'Lesiones', 'Hurto', 'Otros',
];

const JURISDICTIONS = [
  'Caja de Agua', 'Zárate', 'Huayrona', 'Canto Rey',
  'Santa Elizabeth', 'Bayóvar', 'Mariscal Cáceres', '10 de Octubre',
];

const SHIFTS = ['MORNING', 'AFTERNOON', 'NIGHT'];
const STATUSES = ['INVESTIGATING', 'REFERRED', 'CLOSED'];

const COMISARIAS = [
  'Comisaría de Zárate', 'Comisaría de Huayrona', 'Comisaría de Canto Rey',
  'Comisaría de Caja de Agua', 'Comisaría de Bayóvar', 'Comisaría de Santa Elizabeth',
];

const DESCRIPCIONES = [
  'Sujeto interceptó a la víctima y sustrajo su celular con amenaza de arma blanca',
  'Dos individuos en moto arrebataron la cartera a transeúnte en vía pública',
  'Se intervino a sujeto con sustancias ilícitas en punto crítico del sector',
  'Pareja reportó agresión física mutua dentro del domicilio conyugal',
  'Vehículo de carga impactó contra mototaxi por exceso de velocidad',
  'Vecinos reportaron escándalo con agresión entre menores de edad',
  'Víctima fue golpeada y despojada de sus pertenencias en baldío',
  'Se encontró cadáver con signos de violencia en descampado del sector',
  'Sustracción de motocicleta aprovechando descuido del propietario',
  'Pelea entre grupos rivales dejó varios heridos en la vía pública',
  'Robo a domicilio con violencia cuando los ocupantes estaban ausentes',
  'Menor fue encontrado deambulando en estado de ebriedad en la madrugada',
  'Individuo fue intervenido portando arma de fuego sin licencia',
  'Denuncia por acoso callejero reiterado en paradero de transporte público',
  'Accidente de tránsito con fuga del conductor causante del siniestro',
  'Sujeto intentó sustraer mercadería de tienda y fue reducido por vecinos',
  'Disputa entre vecinos por lindero terminó en agresión física',
  'Joven fue víctima de extorsión por parte de banda delincuencial',
  'Se reportó consumo de drogas en parque público durante la madrugada',
  'Adulto mayor fue víctima de robo al retirarse de entidad bancaria',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getHorario = (isoDate) => {
  const hour = new Date(isoDate).getHours();
  const blockStart = Math.floor(hour / 2) * 2;
  const blockEnd = blockStart + 1;
  return `${String(blockStart).padStart(2, '0')}:00 - ${String(blockEnd).padStart(2, '0')}:59`;
};

// Hotspots concentrados en zonas reales del distrito para que formen clusters
const HOTSPOTS = [
  { lat: -11.9699, lng: -76.9980 }, // Centro
  { lat: -11.9620, lng: -76.9920 }, // Zárate
  { lat: -11.9780, lng: -77.0050 }, // Caja de Agua
  { lat: -11.9550, lng: -76.9850 }, // Huayrona
  { lat: -11.9850, lng: -76.9900 }, // Bayóvar
  { lat: -11.9700, lng: -77.0100 }, // Mariscal Cáceres
];

// Genera coordenada dentro de ~80m alrededor de un hotspot
const nearHotspot = (hotspot) => ({
  lat: parseFloat((hotspot.lat + (Math.random() - 0.5) * 0.0014).toFixed(6)),
  lng: parseFloat((hotspot.lng + (Math.random() - 0.5) * 0.0014).toFixed(6)),
});

const baseDate = new Date('2026-01-01T00:00:00');

const pnpIncidenciasMock = Array.from({ length: 100 }, (_, i) => {
  const date = new Date(baseDate.getTime() + i * 864000 * 1.5 + randInt(0, 86399) * 1000);
  const hotspot = HOTSPOTS[i % HOTSPOTS.length];
  const coords = nearHotspot(hotspot);

  return {
    id: i + 1,
    description: rand(DESCRIPCIONES),
    incidence_type: rand(INCIDENCE_TYPES),
    latitude: coords.lat,
    longitude: coords.lng,
    jurisdiction: rand(JURISDICTIONS),
    shift: rand(SHIFTS),
    complaint_number: Math.random() > 0.4 ? `PNP-2026-${String(randInt(1000, 9999))}` : '',
    police_station: rand(COMISARIAS),
    case_status: rand(STATUSES),
    occurred_at: date.toISOString(),
    horario: getHorario(date.toISOString()),
  };
});

export default pnpIncidenciasMock;
