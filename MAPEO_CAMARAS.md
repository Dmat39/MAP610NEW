# Mapeo de Tipos de Cámaras

## 📹 Tipos de Cámaras según el Backend

El backend envía el campo `camera` con los siguientes valores:

### **C180 → TIPO I**
- **Modelo:** C180
- **Ángulo de visión:** 180°
- **Icono:** `/icon/camera.png` (rojo)
- **Descripción:** Cámara con campo de visión semicircular (180 grados)

### **C360 → TIPO II**
- **Modelo:** C360
- **Ángulo de visión:** 360°
- **Icono:** `/icon/camera2.png` (verde)
- **Descripción:** Cámara con campo de visión completo (360 grados)

### **LPR → TIPO III**
- **Modelo:** LPR (License Plate Recognition)
- **Ángulo de visión:** Específico para lectura de placas
- **Icono:** `/icon/camera3.png` (azul)
- **Descripción:** Cámara lectora de placas vehiculares

---

## 🎯 Campo de Visión (Geometry)

Todas las 610 cámaras incluyen el campo `geometry` con el polígono que indica su ángulo de visión real:

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-76.98827957503762, -11.93842179077752],
        [-76.98828565400201, -11.93852805813231],
        // ... más coordenadas del polígono
      ]
    ]
  }
}
```

### Características del polígono:
- **Formato:** GeoJSON Polygon
- **Coordenadas:** `[longitude, latitude]`
- **Uso:** Se renderiza directamente en el mapa para mostrar el área que cubre cada cámara
- **Color en selección:** Morado/Azul (`#667eea`)
- **Color en seguimiento:** Verde (`#10b981`)

---

## 🔄 Transformación de Datos

### Backend → Frontend

```javascript
// Del backend:
{
  "camera": "C360",
  "geometry": { ... },
  "megaphone": true,
  "buttom": false
}

// Transformado en el frontend:
{
  tipo: "TIPO II",
  camara: "360",
  cameraModel: "C360",
  geometryVision: { ... },
  megafono: true,
  boton: false
}
```

### Mapeo de Iconos

| Backend | Tipo   | Icono               | Color Visual |
|---------|--------|---------------------|--------------|
| C180    | TIPO I | `/icon/camera.png`  | Rojo         |
| C360    | TIPO II| `/icon/camera2.png` | Verde        |
| LPR     | TIPO III| `/icon/camera3.png`| Azul         |

---

## 📊 Estadísticas

De las **610 cámaras municipales**:
- Todas tienen polígono de visión (`geometry`)
- Todas tienen coordenadas de ubicación (`latitude`, `longitude`)
- Algunas tienen megáfono (`megaphone: true/false`)
- Algunas tienen botón de pánico (`buttom: true/false`)

---

## 💻 Implementación en Código

### Leaflet (React Leaflet)

```jsx
// Renderizar polígono de visión
<Polygon
  positions={latLngs}  // [[lat, lng], [lat, lng], ...]
  pathOptions={{
    color: '#667eea',
    fillColor: '#667eea',
    fillOpacity: 0.2,
    weight: 2,
  }}
/>
```

### Google Maps

```javascript
// Renderizar polígono de visión
const polygon = new google.maps.Polygon({
  paths: paths,  // [{lat, lng}, {lat, lng}, ...]
  strokeColor: '#667eea',
  fillColor: '#667eea',
  fillOpacity: 0.2,
  strokeWeight: 2,
  map: map
});
```

---

## ⚠️ Notas Importantes

1. **No confundir el mapeo:**
   - ❌ `C360 ≠ TIPO I`
   - ✅ `C360 = TIPO II`
   - ✅ `C180 = TIPO I`
   - ✅ `LPR = TIPO III`

2. **El polígono determina el ángulo real:**
   - No necesitamos calcular el ángulo manualmente
   - El backend ya envía el polígono exacto de cobertura

3. **Conversión de coordenadas:**
   - Backend: `[lng, lat]` (GeoJSON estándar)
   - Leaflet: `[lat, lng]`
   - Google Maps: `{lat: lat, lng: lng}`
