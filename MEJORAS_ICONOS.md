# Mejoras en los Iconos del Mapa

## Resumen de Cambios

Se han implementado mejoras significativas en los iconos del mapa para las siguientes capas:

- ✅ Paraderos Autorizados
- ✅ Paraderos No Autorizados
- ✅ Defensa Civil
- ✅ Puntos de Residuos Sólidos
- ✅ Sostenimiento

## Características Principales

### 1. Iconos SVG Personalizados y Elaborados

Todos los iconos ahora utilizan SVG vectorial con diseños más profesionales y representativos:

- **Paraderos Autorizados**: Icono de motocicleta en verde con fondo claro
- **Paraderos No Autorizados**: Símbolo de prohibición en rojo
- **Defensa Civil**: Edificio con escudo protector en azul
- **Residuos Sólidos**:
  - Verde: Símbolo de reciclaje
  - Amarillo: Basurero convencional
- **Sostenimiento**: Tienda/comercio en morado

### 2. Tamaño Adaptativo al Zoom

Los iconos ahora se ajustan automáticamente según el nivel de zoom del mapa:

- **Zoom bajo (10-12)**: Iconos más pequeños (28-32px)
- **Zoom medio (13-15)**: Tamaño intermedio (36-40px)
- **Zoom alto (16-18)**: Iconos más grandes (44-50px)

Esto mejora la visualización y evita que los iconos se solapen cuando hay muchos puntos cercanos.

### 3. Diseño Visual Mejorado

Cada icono incluye:

- **Círculo de fondo** con color temático suave
- **Borde sólido** del mismo color pero más oscuro
- **Pin inferior** (punta) para indicar la ubicación exacta
- **Sombras** para dar profundidad y mejor visibilidad
- **Animación hover** que agranda el icono al pasar el mouse

### 4. Animaciones Sutiles

- Animación de "pulsación" suave que hace que los iconos se muevan ligeramente arriba y abajo
- Efecto de escala al hacer hover
- Transiciones suaves en todos los cambios

### 5. Popups y Tooltips Mejorados

#### Popups:
- Diseño más limpio con bordes de color temático
- Mejor jerarquía visual de información
- Fuentes más legibles
- Espaciado mejorado

#### Tooltips:
- Se ajustan dinámicamente según el tamaño del icono
- Bordes con colores temáticos
- Mayor contraste y legibilidad

## Estructura de Archivos

### Nuevo Archivo Creado:
- `src/utils/adaptiveIcons.js` - Sistema de iconos adaptativos

### Archivos Modificados:
- `src/components/capas/Paraderos/CapaParaderosAutorizados.jsx`
- `src/components/capas/Paraderos/CapaParaderosNoAutorizados.jsx`
- `src/components/capas/DefensaCivil/CapaDefensaCivil.jsx`
- `src/components/capas/Residuos/CapaResiduos.jsx`
- `src/components/capas/Sostenimiento/CapaSostenimiento.jsx`
- `src/index.css` - Estilos globales

## Uso del Sistema de Iconos

### Ejemplo de Implementación:

```javascript
import { useMap } from 'react-leaflet';
import { createParaderoAutorizadoIcon, getIconSizeForZoom } from '../../../utils/adaptiveIcons';

// Dentro del componente
const map = useMap();
const [currentZoom, setCurrentZoom] = useState(13);

// Escuchar cambios de zoom
useEffect(() => {
  if (!map) return;

  const handleZoomEnd = () => {
    setCurrentZoom(map.getZoom());
  };

  map.on('zoomend', handleZoomEnd);
  setCurrentZoom(map.getZoom());

  return () => {
    map.off('zoomend', handleZoomEnd);
  };
}, [map]);

// Calcular tamaño adaptativo
const iconSize = getIconSizeForZoom(currentZoom, 28, 44);

// Usar el icono
<Marker
  position={[lat, lng]}
  icon={createParaderoAutorizadoIcon(iconSize)}
/>
```

## Colores Temáticos

| Capa | Color Principal | Color de Fondo |
|------|----------------|----------------|
| Paraderos Autorizados | `#28a745` (verde) | `#d4edda` (verde claro) |
| Paraderos No Autorizados | `#dc3545` (rojo) | `#f8d7da` (rojo claro) |
| Defensa Civil | `#007bff` (azul) | `#cfe2ff` (azul claro) |
| Residuos Verde | `#198754` (verde oscuro) | `#d1e7dd` (verde claro) |
| Residuos Amarillo | `#ffc107` (amarillo) | `#fff3cd` (amarillo claro) |
| Sostenimiento | `#6f42c1` (morado) | `#e0cffc` (morado claro) |

## Funciones Disponibles en adaptiveIcons.js

### Funciones de Creación de Iconos:
- `createAdaptiveIcon(options)` - Función base para crear iconos personalizados
- `createParaderoAutorizadoIcon(size)` - Icono de paradero autorizado
- `createParaderoNoAutorizadoIcon(size)` - Icono de paradero no autorizado
- `createDefensaCivilIcon(size)` - Icono de defensa civil
- `createResiduosIcon(size, tipo)` - Icono de residuos (verde o amarillo)
- `createSostenimientoIcon(size)` - Icono de sostenimiento

### Función de Utilidad:
- `getIconSizeForZoom(zoom, minSize, maxSize)` - Calcula el tamaño del icono según el zoom

### Constantes:
- `SVG_PATHS` - Objeto con todas las rutas SVG de los iconos

## Ventajas de la Nueva Implementación

1. **Mejor UX**: Los iconos son más fáciles de identificar y distinguir
2. **Rendimiento**: SVG vectorial es más ligero que imágenes PNG
3. **Escalabilidad**: Los iconos se ven perfectos en cualquier nivel de zoom
4. **Mantenibilidad**: Código centralizado y reutilizable
5. **Consistencia**: Diseño uniforme en todas las capas
6. **Accesibilidad**: Mayor contraste y visibilidad

## Notas de Compatibilidad

- Compatible con React Leaflet 4.x
- Requiere Leaflet 1.x
- CSS global necesario para animaciones

## Próximos Pasos (Opcional)

Si deseas extender el sistema:

1. Agregar más tipos de iconos en `SVG_PATHS`
2. Crear funciones helper adicionales para nuevas capas
3. Personalizar animaciones en `index.css`
4. Ajustar rangos de tamaño según preferencias

## Soporte

Para cualquier duda o mejora adicional, consultar el archivo `src/utils/adaptiveIcons.js` que contiene documentación detallada en los comentarios.
