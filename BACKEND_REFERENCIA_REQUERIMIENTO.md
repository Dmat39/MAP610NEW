# Requerimiento de Backend: Campo `referencia` para Cámaras C180

## 📋 Resumen

El frontend necesita que el backend agregue el campo `referencia` para todas las cámaras de tipo **C180** (180 grados).

---

## ❓ ¿Por qué se necesita?

Las cámaras C180 tienen un campo de visión de **semicírculo (180°)**, que apunta en una dirección específica. Para renderizar correctamente este campo de visión en el mapa, el frontend necesita saber **hacia dónde apunta la cámara**.

El campo `referencia` contiene las coordenadas de un punto hacia donde la cámara está orientada, permitiendo calcular el ángulo correcto para mostrar el semicírculo.

---

## 🎯 Campo a Agregar

### Para cámaras **C180**:
```json
{
  "id": "807555c7-1272-4328-a2d1-bdd423957c9d",
  "name": "121",
  "camera": "C180",
  "latitude": -11.945,
  "longitude": -76.9889,
  "referencia": "-11.9449707659182, -76.9895129441336",  // ← AGREGAR ESTE CAMPO
  "megaphone": true,
  "buttom": true,
  "geometry": { ... }
}
```

### Para cámaras **C360** y **LPR**:
```json
{
  "id": "...",
  "name": "1",
  "camera": "C360",
  "latitude": -11.938414,
  "longitude": -76.989381,
  "referencia": "",  // ← Vacío o null para cámaras 360° y LPR
  "megaphone": true,
  "buttom": true,
  "geometry": { ... }
}
```

---

## 📐 Formato del Campo `referencia`

- **Tipo:** String
- **Formato:** `"latitud, longitud"` (separado por coma y espacio)
- **Ejemplo:** `"-11.9449707659182, -76.9895129441336"`

**Notas importantes:**
- Las coordenadas deben estar en formato decimal (no grados/minutos/segundos)
- El orden es: **latitud, longitud** (no al revés)
- Debe haber un espacio después de la coma
- Para C360 y LPR, el campo puede estar vacío `""` o `null`

---

## 🔍 ¿Cómo Obtener las Coordenadas de Referencia?

Tienes dos opciones:

### **Opción 1: Datos Existentes del Sistema Antiguo**
Si tienen el archivo `610_updated.geojson` del sistema anterior, las coordenadas ya existen ahí:

```json
{
  "name": "121",
  "camara": "180",
  "referencia": "-11.9449707659182, -76.9895129441336",  // ← Ya existe aquí
  ...
}
```

Pueden importar estos datos directamente a la base de datos.

### **Opción 2: Calcular desde la Ubicación**
Si no tienen los datos antiguos, pueden:
1. Usar la dirección de la calle donde apunta la cámara
2. Calcular un punto a ~100 metros en la dirección que mira la cámara
3. Usar herramientas como Google Maps para obtener las coordenadas

**Ejemplo:**
- Cámara en: `-76.9889, -11.945`
- Apunta hacia el Este
- Punto de referencia: `-76.9879, -11.945` (100m al este)

---

## ✅ Checklist de Implementación

- [ ] Agregar columna `referencia` (VARCHAR) a la tabla de cámaras
- [ ] Importar datos de `referencia` desde el archivo antiguo `610_updated.geojson`
- [ ] Para cámaras C180 sin referencia, calcular o solicitar las coordenadas
- [ ] Para cámaras C360 y LPR, dejar el campo vacío `""` o `null`
- [ ] Incluir el campo `referencia` en el endpoint GET `/api/camaras-municipales`
- [ ] Probar que el campo se retorna correctamente en la API

---

## 🧪 Ejemplo Completo de Respuesta Esperada

```json
{
  "count": 610,
  "camaras": [
    {
      "id": "807555c7-1272-4328-a2d1-bdd423957c9d",
      "name": "121",
      "address": "AV. EL MURO / ALAMEDA 10 DE OCTUBRE",
      "camera": "C180",
      "latitude": -11.945,
      "longitude": -76.9889,
      "referencia": "-11.9449707659182, -76.9895129441336",  // ← NUEVO CAMPO
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "buttom": true,
      "megaphone": true,
      "created_at": "2025-12-01T05:58:21.000Z",
      "updated_at": "2025-12-01T05:58:23.000Z",
      "deleted_at": null
    },
    {
      "id": "...",
      "name": "1",
      "address": "AV. AMPLIACIÓN OESTE/AV. DEL MERCADO",
      "camera": "C360",
      "latitude": -11.938414,
      "longitude": -76.989381,
      "referencia": "",  // ← Vacío para C360
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "buttom": true,
      "megaphone": true,
      "created_at": "2025-12-01T05:58:21.000Z",
      "updated_at": "2025-12-01T05:58:23.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## 🎨 ¿Cómo se Usa en el Frontend?

Una vez que el backend retorne el campo `referencia`:

1. **Para C180 con referencia:** Se usa el método CSS con gradiente rotado
   - Calcula el ángulo entre la cámara y el punto de referencia
   - Rota el semicírculo CSS para que apunte en esa dirección
   - **Resultado:** Semicírculo preciso de 180° apuntando correctamente

2. **Para C360 o sin referencia:** Se usa el polígono del backend
   - Renderiza el polígono de `geometry` directamente
   - **Resultado:** Círculo completo de 360°

---

## 📞 Contacto

Si tienen dudas sobre el formato o necesitan ayuda con la implementación, por favor coordinen con el equipo de frontend.

---

## 📅 Prioridad

**ALTA** - Sin este campo, las cámaras C180 muestran incorrectamente un campo de visión de 360° en lugar de 180°.
