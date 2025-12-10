# DOCUMENTACIÓN COMPLETA: LÓGICA DE TABLAS PARA MÓDULOS

Esta documentación describe la arquitectura completa del sistema de tablas implementado en este proyecto React. Está diseñada para ser implementada en otros proyectos.

---

## 📋 ÍNDICE

1. [Arquitectura General](#arquitectura-general)
2. [Componente Principal: CRUDTable](#componente-principal-crudtable)
3. [Sistema de Scroll y Layout Responsivo](#sistema-de-scroll-y-layout-responsivo)
4. [Sistema de Paginación](#sistema-de-paginación)
5. [Sistema de Búsqueda](#sistema-de-búsqueda)
6. [Sistema de Filtros](#sistema-de-filtros)
7. [Gestión de URLs y Parámetros](#gestión-de-urls-y-parámetros)
8. [Manejo de Datos con Hooks](#manejo-de-datos-con-hooks)
9. [Implementación en Páginas/Módulos](#implementación-en-páginas-módulos)
10. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)

---

## 🏗️ ARQUITECTURA GENERAL

### Componentes Principales

```
📦 Sistema de Tablas
├── 📄 CRUDTable.jsx (Componente tabla principal)
├── 📄 TablePagination.jsx (Paginación)
├── 📄 SearchInput.jsx (Búsqueda)
├── 📄 CustomPopover.jsx (Contenedor de filtros)
├── 📄 Filtro.jsx (Select de filtros)
├── 🔧 UseUrlParamsManager.jsx (Gestión de parámetros URL)
├── 🔧 useFetch.js (Peticiones HTTP)
└── 🔧 GeneralFunctions.js (Funciones de ordenamiento)
```

### Flujo de Datos

```
Usuario interactúa → URL params se actualizan → useEffect detecta cambio →
fetchData() con params → Backend responde → Datos se formatean →
CRUDTable renderiza → Usuario ve resultados
```

---

## 🗂️ COMPONENTE PRINCIPAL: CRUDTable

### Ubicación
`src/Components/Table/CRUDTable.jsx`

### Propósito
Componente reutilizable que muestra datos en formato tabla con funcionalidades de:
- **Scroll vertical y horizontal** dentro de la tabla
- **Header sticky** que permanece visible al hacer scroll
- Ordenamiento por columnas (ASC/DESC)
- Acciones CRUD (Editar/Eliminar)
- Paginación automática
- Estados de carga
- Lookup de datos relacionados
- Acciones personalizadas (iconos con tooltips)
- **Layout responsivo** que se adapta a diferentes tamaños de pantalla

### Props del Componente

```javascript
{
  data: [],              // Array de objetos a mostrar
  onDelete: null,        // Función callback para eliminar
  onEdit: null,          // Función callback para editar
  ArrLookup: [],        // Array para transformar IDs en nombres
  loading: false,        // Estado de carga
  rowOnClick: null,      // Función al hacer click en fila
  count: 100,           // Total de registros (para paginación)
  noDataText: 'No hay datos registrados.',
  filter: false,        // Habilitar filtrado local (deprecated)
  pagination: true,     // Mostrar paginación
  legend: ''           // Texto de leyenda al pie
}
```

### Estructura de Datos

#### Formato de Data
```javascript
const data = [
  {
    id: 1,                    // ID único (requerido)
    nombres: 'Juan',          // Columnas dinámicas
    cargo: 'Gerente',
    sueldo: 5000,
    notShow: 'valor_oculto'  // Columnas que no se muestran
  }
]
```

#### Formato ArrLookup
```javascript
const ArrLookup = [
  {
    key: 'id_cargo',         // Campo en data
    obj: [                   // Array de objetos para lookup
      { id: 1, nombre: 'Gerente' },
      { id: 2, nombre: 'Asistente' }
    ]
  }
]
```

#### Acciones Personalizadas (Iconos)
```javascript
const dataWithActions = [
  {
    id: 1,
    nombre: 'Juan',
    "": [  // Columna vacía para acciones personalizadas
      {
        icon: <EditIcon />,
        action: () => handleEdit(id),
        label: 'Editar'
      },
      {
        icon: <Switch checked={estado} />,
        action: () => toggleEstado(id),
        label: 'Activar/Desactivar'
      }
    ]
  }
]
```

### Características Clave

#### 1. **Sistema de Ordenamiento**
```javascript
// Estado de ordenamiento
const [orderBy, setOrderBy] = useState('index');
const [orderDirection, setOrderDirection] = useState('asc');

// Función de ordenamiento
const handleSortRequest = (property) => {
  const isAsc = orderBy === property && orderDirection === 'asc';
  setOrderDirection(isAsc ? 'desc' : 'asc');
  setOrderBy(property);
};

// Aplicación del ordenamiento
useEffect(() => {
  const dataWithIndex = data.map((item, index) => ({
    ...item,
    index: index + 1,
  }));
  setSortedData(SortData(dataWithIndex, orderBy, orderDirection));
}, [data, orderBy, orderDirection]);
```

#### 2. **Generación Automática de Headers**
```javascript
// Extrae automáticamente las columnas del primer objeto
const headers = data.length > 0
  ? Object.keys(data[0]).filter((key) => key !== 'id' && key !== 'notShow')
  : [];
```

#### 3. **Índice con Paginación**
```javascript
// El índice se ajusta según la página actual
<TableCell>{(row.index + (page - 1) * limit)}</TableCell>
```

#### 4. **Renderizado de Headers con Ordenamiento**
```javascript
<TableHead className='bg-green-600 sticky top-0 z-10'>
  <TableRow>
    {/* Columna de índice */}
    <TableCell>
      <TableSortLabel
        active={orderBy === 'index'}
        direction={orderBy === 'index' ? orderDirection : 'asc'}
        onClick={() => handleSortRequest('index')}
      >
        #
      </TableSortLabel>
    </TableCell>

    {/* Headers dinámicos */}
    {headers.map((header) => (
      <TableCell key={header}>
        <TableSortLabel
          active={orderBy === header}
          direction={orderBy === header ? orderDirection : 'asc'}
          onClick={() => handleSortRequest(header)}
        >
          {header.charAt(0).toUpperCase() + header.slice(1)}
        </TableSortLabel>
      </TableCell>
    ))}

    {/* Columna de acciones */}
    {(onEdit || onDelete) && <TableCell></TableCell>}
  </TableRow>
</TableHead>
```

#### 5. **Lookup de Datos Relacionados**
```javascript
// Función helper para lookup
const getValueById = (id, lookupArray) => {
  const item = lookupArray.find(obj => obj.id === id);
  return item ? item.nombre : id;
};

// Uso en renderizado
{headers.map((header) => {
  const lookup = ArrLookup.find(item => item.key === header);
  const value = lookup ? getValueById(row[header], lookup.obj) : row[header];

  return (
    <TableCell key={header}>
      {Array.isArray(value) ? (
        value.map((item, index) => (
          <Tooltip title={item.label} key={index}>
            {item.icon}
          </Tooltip>
        ))
      ) : (
        value
      )}
    </TableCell>
  );
})}
```

---

## 📜 SISTEMA DE SCROLL Y LAYOUT RESPONSIVO

### Arquitectura de Contenedores

El sistema de scroll está diseñado con una jerarquía de contenedores que garantiza que:
1. El **scroll vertical** ocurra dentro de la tabla (no en toda la página)
2. El **scroll horizontal** permita ver columnas que excedan el ancho de pantalla
3. El **header permanezca fijo** al hacer scroll vertical
4. La **paginación siempre sea visible** en la parte inferior

### Estructura de Contenedores

```jsx
<div className='h-full flex flex-col w-full bg-gray-100 p-4'>  {/* Contenedor principal - altura completa */}
  <header>...</header>  {/* Header fijo */}

  <main className='flex-1 bg-white shadow rounded-lg p-4 h-full overflow-hidden'>  {/* Main - toma espacio restante */}
    <div className='flex flex-col w-full h-full'>  {/* Contenedor flex vertical */}

      <div className='w-full flex flex-col md:flex-row justify-space-between pb-6 gap-3'>  {/* Toolbar */}
        {/* Búsqueda, filtros, botones */}
      </div>

      {/* COMPONENTE CRUDTABLE */}
      <div className='flex flex-1 overflow-hidden'>  {/* Contenedor tabla - clave para scroll */}
        <div className='flex flex-col w-full'>

          <div className='flex-1 max-h-full overflow-y-auto'>  {/* Scroll vertical AQUÍ */}
            <Table size='small' className='text-nowrap'>  {/* text-nowrap = scroll horizontal */}
              <TableHead className='bg-green-600 sticky top-0 z-10'>  {/* Header sticky */}
                {/* Headers */}
              </TableHead>
              <TableBody>
                {/* Rows */}
              </TableBody>
            </Table>
          </div>

          {/* Paginación fuera del scroll */}
          <div className='flex justify-between pt-4'>
            <CustomTablePagination count={count} />
          </div>

        </div>
      </div>

    </div>
  </main>
</div>
```

### Clases CSS Clave

#### 1. **Contenedor Principal del Módulo**
```jsx
<div className='h-full flex flex-col w-full bg-gray-100 p-4'>
```
- `h-full`: Altura 100% del viewport disponible
- `flex flex-col`: Layout vertical con flexbox
- `w-full`: Ancho completo
- `p-4`: Padding de 1rem

#### 2. **Main (Contenedor de Tabla)**
```jsx
<main className='flex-1 bg-white shadow rounded-lg p-4 h-full overflow-hidden'>
```
- `flex-1`: Toma todo el espacio vertical restante
- `h-full`: Altura 100%
- `overflow-hidden`: Previene scroll en este nivel
- `bg-white shadow rounded-lg`: Estilos visuales

#### 3. **Contenedor Interno**
```jsx
<div className='flex flex-col w-full h-full'>
```
- `flex flex-col`: Layout vertical
- `w-full h-full`: Ocupa todo el espacio del padre

#### 4. **Contenedor de CRUDTable (Clave)**
```jsx
<div className='flex flex-1 overflow-hidden'>
```
- `flex-1`: Toma espacio restante después del toolbar
- `overflow-hidden`: **CRÍTICO** - previene que el scroll se propague hacia arriba

#### 5. **Contenedor con Scroll Vertical**
```jsx
<div className='flex-1 max-h-full overflow-y-auto'>
```
- `flex-1`: Expande para llenar espacio
- `max-h-full`: Altura máxima = 100% del padre
- `overflow-y-auto`: **Scroll vertical activo AQUÍ**

#### 6. **Tabla con Scroll Horizontal**
```jsx
<Table size='small' className='text-nowrap'>
```
- `text-nowrap`: Previene wrap de texto = scroll horizontal automático
- `size='small'`: Tamaño compacto de celdas

#### 7. **Header Sticky**
```jsx
<TableHead className='bg-green-600 sticky top-0 z-10'>
```
- `sticky top-0`: Header permanece fijo al hacer scroll vertical
- `z-10`: Índice Z para que esté sobre las filas
- `bg-green-600`: Color de fondo (evita transparencia al hacer scroll)

### Código Completo del CRUDTable con Scroll

```javascript
return (
    <div className='flex flex-1 overflow-hidden'>
        {loading ? (
            <div className='flex justify-center pt-4 h-full w-full'>
                <CircularProgress size={30} thickness={5} />
            </div>
        ) : (
            <>
                {sortedData && sortedData?.length > 0 ? (
                    <div className='flex flex-col w-full'>

                        {/* ÁREA DE SCROLL VERTICAL */}
                        <div className='flex-1 max-h-full overflow-y-auto'>
                            <Table size='small' className='text-nowrap'>

                                {/* HEADER STICKY */}
                                <TableHead className='bg-green-600 sticky top-0 z-10'>
                                    <TableRow>
                                        <TableCell sx={headerStyles}>
                                            <TableSortLabel>#</TableSortLabel>
                                        </TableCell>
                                        {headers.map((header) => (
                                            <TableCell key={header} sx={headerStyles}>
                                                <TableSortLabel>{header}</TableSortLabel>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                {/* BODY CON SCROLL */}
                                <TableBody>
                                    {sortedData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.index}</TableCell>
                                            {headers.map((header) => (
                                                <TableCell key={header}>
                                                    {row[header]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>

                            </Table>
                        </div>

                        {/* PAGINACIÓN FIJA (fuera del scroll) */}
                        {pagination && (
                            <div className='flex justify-between pt-4 lg:flex-row flex-col-reverse'>
                                <div className='flex-1 flex items-center justify-end lg:justify-start'>
                                    {legend && (
                                        <span className='text-sm text-gray-500 italic p-3'>
                                            {legend}
                                        </span>
                                    )}
                                </div>
                                <CustomTablePagination count={count} />
                            </div>
                        )}

                    </div>
                ) : (
                    <div className='text-center text-sm mt-6 w-full'>
                        {noDataText}
                    </div>
                )}
            </>
        )}
    </div>
)
```

### Estilos para Header Sticky

```javascript
const headerStyles = {
    color: 'white',
    '&.Mui-active': {
        color: 'white',
        '& svg': {
            color: 'white !important',
        }
    },
    '&:hover': {
        color: 'white',
        '& svg': {
            color: 'white !important',
        }
    },
    '&:focus': {
        color: 'white',
        '& svg': {
            color: 'white !important',
        }
    }
}
```

### Comportamiento del Scroll

#### Scroll Vertical
- **Activado en:** `<div className='flex-1 max-h-full overflow-y-auto'>`
- **Comportamiento:**
  - El usuario puede desplazarse verticalmente para ver más filas
  - El header permanece fijo en la parte superior (sticky)
  - La paginación permanece fija en la parte inferior
  - Solo el `<TableBody>` se desplaza

#### Scroll Horizontal
- **Activado por:** `className='text-nowrap'` en `<Table>`
- **Comportamiento:**
  - Si las columnas exceden el ancho disponible, aparece scroll horizontal
  - Permite ver todas las columnas sin comprimir el contenido
  - El header también hace scroll horizontal junto con el body

### Persistencia de Posición de Scroll

```javascript
// En TablePagination.jsx
onPageChange={(event, newPage) => {
    localStorage.setItem('scrollPosition', 0);  // Resetear scroll al cambiar página
    addParams({ page: newPage + 1, limit });
}}
```

### Layout Responsivo

#### Toolbar Responsivo
```jsx
<div className='w-full flex flex-col md:flex-row justify-space-between pb-6 gap-3'>
  {/* Contador de filas */}
  <div className='w-full flex items-center gap-2'>
    <span>Total: {count}</span>
  </div>

  {/* Acciones y búsqueda */}
  <div className='w-full flex items-center justify-end gap-3'>
    <SearchInput />
  </div>
</div>
```
- `flex-col md:flex-row`: Vertical en móvil, horizontal en tablet+
- `w-full`: Ancho completo en ambos breakpoints

#### Paginación Responsiva
```jsx
<div className='flex justify-between pt-4 lg:flex-row flex-col-reverse'>
  {/* Leyenda */}
  <div className='flex-1 flex items-center justify-end lg:justify-start'>
    {legend && <span>{legend}</span>}
  </div>

  {/* Paginación */}
  <CustomTablePagination count={count} />
</div>
```
- `flex-col-reverse lg:flex-row`: Vertical invertido en móvil, horizontal en desktop
- En móvil la paginación aparece primero, luego la leyenda

### Diagrama Visual del Sistema de Scroll

```
┌─────────────────────────────────────────────────────────────┐
│ PÁGINA COMPLETA (h-full)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ HEADER (Fijo - sin scroll)                              │ │
│ │ "CARGOS"                                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ MAIN (flex-1, overflow-hidden)                          │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ TOOLBAR (Fijo - sin scroll)                         │ │ │
│ │ │ [Total: 150] [Refrescar] [Agregar] [Búsqueda]      │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                          │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ÁREA DE SCROLL (overflow-y-auto)                    │ │ │
│ │ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ │ │
│ │ │ ┃ HEADER STICKY (bg-green, sticky top-0)        ┃ │ │ │
│ │ │ ┃ #  │ Nombre  │ Cargo    │ Sueldo │ Acciones ┃ │ │ │
│ │ │ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │ │ │
│ │ │ ┃ 1  │ Juan    │ Gerente  │ 5000   │ [✎] [🗑] ┃ │ │ │
│ │ │ ┃ 2  │ María   │ Contador │ 4000   │ [✎] [🗑] ┃ │ │ │
│ │ │ ┃ 3  │ Pedro   │ Asist.   │ 3000   │ [✎] [🗑] ┃ │ │ │
│ │ │ ┃ ... (más filas)                               ┃ │ │ │ ↕ SCROLL
│ │ │ ┃ 18 │ Ana     │ Aux.     │ 2500   │ [✎] [🗑] ┃ │ │ │ VERTICAL
│ │ │ ┃ 19 │ Luis    │ Op.      │ 2800   │ [✎] [🗑] ┃ │ │ │
│ │ │ ┃ 20 │ Carmen  │ Sup.     │ 4500   │ [✎] [🗑] ┃ │ │ │
│ │ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │ │
│ │ │ ←────────────────────────────────────────────────→  │ │ │
│ │ │              SCROLL HORIZONTAL (text-nowrap)        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                          │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ PAGINACIÓN (Fija - sin scroll)                      │ │ │
│ │ │ Filas por página: 20 ▼  [<] [1] 2 3 ... 8 [>]      │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Ventajas de este Sistema

1. **UX Mejorada:**
   - Usuario siempre ve header y paginación
   - No necesita scroll hasta arriba para ver columnas
   - Orientación constante en grandes datasets

2. **Performance:**
   - Solo renderiza filas visibles en viewport
   - Scroll nativo del navegador (más rápido que virtual scroll)

3. **Responsivo:**
   - Scroll horizontal automático en pantallas pequeñas
   - Layout adaptable móvil/desktop

4. **Accesibilidad:**
   - Navegación con teclado (Tab, flechas)
   - Screen readers pueden navegar correctamente

### Problemas Comunes y Soluciones

#### ❌ Problema: Header no se queda fijo
```javascript
// MALO: Falta sticky o z-index
<TableHead className='bg-green-600'>
```

✅ **Solución:**
```javascript
// BUENO: sticky + top-0 + z-index alto
<TableHead className='bg-green-600 sticky top-0 z-10'>
```

#### ❌ Problema: Scroll de toda la página en vez de solo la tabla
```javascript
// MALO: Falta overflow-hidden en contenedor padre
<main className='flex-1 bg-white'>
  <div className='overflow-y-auto'>  {/* Scroll escapa */}
```

✅ **Solución:**
```javascript
// BUENO: overflow-hidden previene escape
<main className='flex-1 bg-white overflow-hidden'>
  <div className='flex flex-1 overflow-hidden'>
    <div className='overflow-y-auto'>  {/* Scroll contenido */}
```

#### ❌ Problema: Tabla se corta o no muestra todas las filas
```javascript
// MALO: Falta flex-1 o max-h-full
<div className='overflow-y-auto'>
```

✅ **Solución:**
```javascript
// BUENO: flex-1 + max-h-full permite expansión correcta
<div className='flex-1 max-h-full overflow-y-auto'>
```

#### ❌ Problema: No hay scroll horizontal con muchas columnas
```javascript
// MALO: Las celdas se comprimen
<Table size='small'>
```

✅ **Solución:**
```javascript
// BUENO: text-nowrap previene wrap = scroll horizontal
<Table size='small' className='text-nowrap'>
```

---

## 📄 SISTEMA DE PAGINACIÓN

### Ubicación
`src/Components/Pagination/TablePagination.jsx`

### Características
- Integración con URL params
- Persistencia de estado en URL
- Opciones de filas por página: [20, 50, 100]
- Etiquetas personalizadas en español
- Guardado de posición de scroll

### Código Completo
```javascript
import React from 'react'
import { useLocation } from 'react-router-dom';
import UseUrlParamsManager from '../hooks/UseUrlParamsManager';
import { TablePagination } from '@mui/material';

const CustomTablePagination = ({count}) => {
    const { addParams } = UseUrlParamsManager();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    // Obtener página y límite desde URL
    const page = parseInt(queryParams.get('page')) || 1;
    const limit = parseInt(queryParams.get('limit')) || 20;

    return (
        <TablePagination
            className='select-none'
            component="div"
            count={count || 1000}
            page={page - 1}  // MUI usa índice base 0
            onPageChange={(event, newPage) => {
                localStorage.setItem('scrollPosition', 0);
                addParams({ page: newPage + 1, limit });
            }}
            rowsPerPage={limit}
            onRowsPerPageChange={(event) => {
                const newLimit = parseInt(event.target.value);
                addParams({ page: 1, limit: newLimit });
            }}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            rowsPerPageOptions={[20, 50, 100]}
        />
    )
}

export default CustomTablePagination
```

### Integración en CRUDTable
```javascript
{pagination && (
  <div className='flex justify-between pt-4 lg:flex-row flex-col-reverse'>
    <div className='flex-1 flex items-center justify-end lg:justify-start'>
      {legend && <span className='text-sm text-gray-500 italic p-3'>{legend}</span>}
    </div>
    <CustomTablePagination count={count} />
  </div>
)}
```

---

## 🔍 SISTEMA DE BÚSQUEDA

### Ubicación
`src/Components/Inputs/SearchInput.jsx`

### Características
- Detección automática de tipo (DNI o texto)
- Debounce de 800ms
- Limpieza automática de parámetros
- Reseteo a página 1 al buscar
- Persistencia en URL

### Código Completo
```javascript
import React, { useState, useRef } from 'react';
import { FormControl, InputAdornment, InputLabel, Input } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UseUrlParamsManager from '../hooks/UseUrlParamsManager';
import { v4 as uiu4d } from 'uuid';

const SearchInput = () => {
    const url = new URLSearchParams(location.search);
    const { addParams } = UseUrlParamsManager();

    // Inicializar con valor existente en URL
    const [searchTerm, setSearchTerm] = useState(
      url.get('search') || url.get('dni') || ''
    );
    const timeoutRef = useRef(null);
    const inputId = uiu4d();

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchTerm(value);

        // Limpiar timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce de 800ms
        timeoutRef.current = setTimeout(() => {
            if (!value.trim()) {
                // Limpiar ambos parámetros si está vacío
                addParams({ dni: '', search: '' });
            } else {
                // Detectar tipo basado en primer carácter
                const firstChar = value.trim().charAt(0);
                const paramKey = /^[0-9]$/.test(firstChar) ? 'dni' : 'search';
                const otherKey = /^[0-9]$/.test(firstChar) ? 'search' : 'dni';

                addParams({
                  [paramKey]: value.trim(),
                  [otherKey]: '',
                  page: 1,
                  limit: 20
                });
            }
        }, 800);
    };

    return (
        <FormControl variant="standard" size='small' className='w-full max-w-full md:max-w-sm'>
            <InputLabel htmlFor={inputId}>Buscar</InputLabel>
            <Input
                id={inputId}
                value={searchTerm}
                onChange={handleSearchChange}
                startAdornment={
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                }
            />
        </FormControl>
    );
};

export default SearchInput;
```

### Uso en Módulos
```javascript
<div className='w-full flex items-center justify-end gap-3'>
  <SearchInput />
</div>
```

---

## 🎛️ SISTEMA DE FILTROS

### Componentes Involucrados

#### 1. CustomPopover (Contenedor)
**Ubicación:** `src/Components/Popover/CustomPopover.jsx`

```javascript
import { Button, IconButton, Popover } from '@mui/material';
import React from 'react'
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const CustomPopover = ({ label, CustomIcon, CustomIconClose, children }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;

    return (
        <>
            <Button
                aria-describedby={id}
                variant="text"
                onClick={handleClick}
                size='small'
                className={`${open ? 'active' : ''} flex items-center`}
                sx={{
                    padding: '3px 10px',
                    textTransform: 'none',
                    '&.active': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                    },
                }}
            >
                {!open ? (
                    CustomIcon ? <CustomIcon sx={{ marginRight: '5px', width: '1.1rem', height: '1.1rem' }} />
                    : <FilterListIcon sx={{ marginRight: '5px', width: '1.1rem', height: '1.1rem' }} />
                ) : (
                    CustomIconClose ? <CustomIconClose sx={{ marginRight: '5px', width: '1.1rem', height: '1.1rem' }} />
                    : <FilterListIcon sx={{ marginRight: '5px', width: '1.1rem', height: '1.1rem' }} />
                )}
                <div className='mt-1 hidden lg:block text-nowrap'>{label}</div>
            </Button>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                sx={{ marginTop: '10px' }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <div className='p-3 relative'>
                    <IconButton
                        onClick={handleClose}
                        className='!absolute !top-1 !right-1 cursor-pointer z-10'
                    >
                        <CloseRoundedIcon/>
                    </IconButton>
                    {children}
                </div>
            </Popover>
        </>
    )
}

export default CustomPopover
```

#### 2. FiltroSelect (Select de Filtro)
**Ubicación:** `src/Components/Filtroselect/Filtro.jsx`

```javascript
import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';

const Filtro = ({
  label,
  placeholder,
  name,
  value,
  onChange,
  onBlur,
  options,
  error,
  touched,
  className,
  defaultValue
}) => {
  return (
    <Box>
      <FormControl
        fullWidth
        variant="outlined"
        size="small"
        className={`bg-white ${className}`}
        error={touched && Boolean(error)}
      >
        <InputLabel id={`${name}-label`} shrink={true}>
          {label}
        </InputLabel>
        <Select
          labelId={`${name}-label`}
          label={label}
          name={name}
          value={defaultValue?.toString() || value}
          onChange={onChange}
          onBlur={onBlur}
          displayEmpty={Boolean(placeholder)}
          MenuProps={{
            PaperProps: {
              style: {
                marginTop: 3,
                maxHeight: 300,
              },
            },
          }}
          sx={{ fontSize: '0.9rem', height: "100%" }}
        >
          <MenuItem value="" sx={{ fontSize: '0.9rem' }}>
            <em>{placeholder || 'Seleccione una opción'}</em>
          </MenuItem>
          {options?.map((option) => (
            <MenuItem
              key={option.id || option.value}
              value={option.value}
              sx={{ fontSize: '0.9rem' }}
            >
              {option.label || option.valor}
            </MenuItem>
          ))}
        </Select>
        {touched && error && <FormHelperText error>{error}</FormHelperText>}
      </FormControl>
    </Box>
  );
};

export default Filtro;
```

### Implementación Completa de Filtros

#### Ejemplo de Módulo con Filtros (Empleados)

```javascript
// 1. Estado para opciones de filtros
const [DataSelects, setDataSelects] = useState({
  subgerencias: [],
  cargos: [],
  turnos: [],
  regimenLaboral: [],
  sexos: [],
  lugar: [],
  funciones: [],
  areas: []
});

// 2. Obtener parámetros actuales de URL
const { addParams, getParams, removeParams } = UseUrlParamsManager();
const params = getParams();

// 3. Cargar datos de filtros
useEffect(() => {
  loadFiltersData();
}, []);

const loadFiltersData = async () => {
  try {
    const [subgerenciasData, turnosData, cargosData, ...rest] = await Promise.all([
      fetchSubgerencias(),
      fetchTurnos(),
      fetchCargos(),
      // ... más fetches
    ]);

    setDataSelects({
      subgerencias: mapToSelectOptions(subgerenciasData?.data),
      turnos: mapToSelectOptions(turnosData?.data),
      cargos: mapToSelectOptions(cargosData?.data),
      // ... más mapeos
    });
  } catch (error) {
    console.error('Error al cargar los datos de filtros:', error);
  }
};

// 4. Filtros dependientes (ejemplo: cargos filtrados por subgerencia)
useEffect(() => {
  if (!params.subgerencia) {
    setDataSelects((prev) => ({
      ...prev,
      cargos: mapToSelectOptions(Cargos),
    }));
    return;
  }

  addParams({ cargo: '' }); // Limpiar cargo al cambiar subgerencia

  const validSubgerencias = [10, 13, 23];
  const filteredCargos = params.subgerencia == 4
    ? Cargos
    : Cargos.filter(c => validSubgerencias.includes(c.id) || c.id_subgerencia == params.subgerencia);

  setDataSelects((prev) => ({
    ...prev,
    cargos: mapToSelectOptions(filteredCargos),
  }));
}, [params.subgerencia, Cargos]);

// 5. JSX de Filtros
<CustomPopover
  CustomIcon={FilterListIcon}
  CustomIconClose={FilterAltOffIcon}
  label={"Filtro Personal"}
>
  <div className="p-6">
    <h1 className="text-xl font-bold text-gray-700 pb-4">Filtros</h1>
    <div className="flex flex-wrap justify-center max-w-[500px] max-h-[500px] overflow-y-auto overflow-x-hidden">

      {/* Filtro de Subgerencia */}
      <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
        <label className="text-sm font-semibold text-gray-600">
          Subgerencia
        </label>
        <FiltroSelect
          name="subgerencias"
          placeholder={'Seleccione una subgerencia'}
          onChange={(e) => addParams({ subgerencia: e.target.value })}
          value={params.subgerencia || ''}
          options={DataSelects.subgerencias}
        />
      </div>

      {/* Filtro de Cargo */}
      <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
        <label className="text-sm font-semibold text-gray-600">
          Cargo
        </label>
        <FiltroSelect
          name="cargo"
          placeholder={'Seleccione un cargo'}
          onChange={(e) => addParams({ cargo: e.target.value })}
          value={params.cargo || ''}
          options={DataSelects.cargos}
        />
      </div>

      {/* Filtro Condicional */}
      {params.subgerencia == 3 ? (
        <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
          <label className="text-sm font-semibold text-gray-600">
            Funciones
          </label>
          <FiltroSelect
            name="funcion"
            placeholder={'Seleccione una funcion'}
            onChange={(e) => addParams({ funcion: e.target.value })}
            value={params.funcion || ''}
            options={DataSelects.funciones}
          />
        </div>
      ) : (
        <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
          <label className="text-sm font-semibold text-gray-600">
            Lugar de trabajo
          </label>
          <FiltroSelect
            name="Lugar"
            placeholder={'Seleccione un lugar'}
            onChange={(e) => addParams({ lugar: e.target.value })}
            value={params.lugar || ''}
            options={DataSelects.lugar}
          />
        </div>
      )}

    </div>

    {/* Botón para limpiar filtros */}
    <div className="flex justify-end mt-6">
      <Button
        className="!capitalize"
        onClick={() => removeParams()}
        variant="outlined"
        color="error"
        size="small"
      >
        Limpiar filtros
      </Button>
    </div>
  </div>
</CustomPopover>
```

---

## 🔗 GESTIÓN DE URLs Y PARÁMETROS

### Hook: UseUrlParamsManager
**Ubicación:** `src/Components/hooks/UseUrlParamsManager.jsx`

```javascript
import { useLocation, useNavigate } from 'react-router-dom';

const UseUrlParamsManager = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Obtener todos los parámetros como objeto
    const getParams = () => {
        const url = new URLSearchParams(location.search);
        const params = {};
        url.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    };

    // Agregar o actualizar parámetros
    const addParams = (params) => {
        const url = new URLSearchParams(location.search);

        Object.keys(params).forEach(key => {
          let value = params[key];
          // Convertir arrays a string con guiones
          if (Array.isArray(value)) {
            value = value.join('-');
          }
          url.set(key, value);
        });

        navigate({ search: url.toString() });
    };

    // Eliminar todos los parámetros
    const removeParams = () => {
        const url = new URLSearchParams();
        navigate({ search: url.toString() });
    }

    // Eliminar un parámetro específico
    const removeParam = (param) => {
        const url = new URLSearchParams(location.search);
        url.delete(param);
        navigate({ search: url.toString() });
    };

    return { getParams, addParams, removeParams, removeParam };
}

export default UseUrlParamsManager
```

### Ejemplo de Uso
```javascript
const { addParams, getParams, removeParams, removeParam } = UseUrlParamsManager();
const params = getParams();

// Agregar múltiples parámetros
addParams({ page: 2, limit: 50, search: 'Juan' });

// Obtener valor específico
const currentPage = params.page; // "2"

// Limpiar todos los filtros
removeParams();

// Eliminar solo la búsqueda
removeParam('search');
```

---

## 🌐 MANEJO DE DATOS CON HOOKS

### useFetch Hook
**Ubicación:** `src/Components/hooks/useFetch.js`

```javascript
import axios from 'axios'
import { useDispatch } from 'react-redux';
import CustomSwal from '../../helpers/swalConfig';
import { logout, moduleLoading } from '../../Redux/Slices/AuthSlice';

function useFetch() {
  const dispatch = useDispatch()

  // Manejo centralizado de errores de autenticación
  const handleAuthError = (error, lazy) => {
    if (error.response && error.response.status === 401 && !lazy) {
      CustomSwal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
        didClose: () => {
          dispatch(logout())
        }
      })
      return { isAuthError: true, message: 'Sesión expirada' }
    }
    return { isAuthError: false }
  }

  // GET request
  const getData = async (url, token, lazy = false, apiKey = false) => {
    try {
      !lazy && dispatch(moduleLoading(true))

      let headers = {}
      if(apiKey) headers["x-api-key"] = `${import.meta.env.VITE_APP_API_KEY}`
      else headers["Authorization"] = `Bearer___${token}`

      const response = await axios.get(url, { headers });

      return {
        data: response.data,
        status: true
      }
    } catch (error) {
      const authError = handleAuthError(error, lazy)
      if (authError.isAuthError) return authError

      return {
        error: error,
        status: false
      }
    } finally {
      dispatch(moduleLoading(false))
    }
  }

  // POST request
  const postData = async (url, data, token, lazy = false, apiKey = false) => {
    try {
      !lazy && dispatch(moduleLoading(true))

      let headers = {}
      if(apiKey) headers["x-api-key"] = `${import.meta.env.VITE_APP_API_KEY}`
      else headers["Authorization"] = `Bearer___${token}`

      const response = await axios.post(url, data, { headers });

      return {
        data: response.data,
        status: true
      }
    } catch (error) {
      const authError = handleAuthError(error)
      if (authError.isAuthError) return authError

      return {
        error: error,
        status: false
      }
    } finally {
      dispatch(moduleLoading(false))
    }
  }

  // PATCH request
  const patchData = async (url, data, token, lazy = false) => {
    try {
      !lazy && dispatch(moduleLoading(true))
      const response = await axios.patch(url, data, {
        headers: { Authorization: `Bearer___${token}` },
      });

      return {
        data: response.data,
        status: true
      }
    } catch (error) {
      const authError = handleAuthError(error)
      if (authError.isAuthError) return authError

      return {
        error: error,
        status: false
      }
    } finally {
      dispatch(moduleLoading(false))
    }
  }

  // DELETE request
  const deleteData = async (url, token, data, lazy = false) => {
    try {
      !lazy && dispatch(moduleLoading(true))
      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer___${token}` },
        data: data,
      });

      return {
        data: response.data,
        status: true
      }
    } catch (error) {
      const authError = handleAuthError(error)
      if (authError.isAuthError) return authError

      return {
        error: error,
        status: false
      }
    } finally {
      dispatch(moduleLoading(false))
    }
  }

  return { getData, postData, patchData, deleteData }
}

export default useFetch
```

### Función de Ordenamiento
**Ubicación:** `src/helpers/GeneralFunctions.js`

```javascript
export function SortData(data, orderBy, orderDirection) {
    return [...data]
        .sort((a, b) => {
            // Separar orderBy por puntos para propiedades anidadas
            const orderByKeys = orderBy.split('.');

            // Acceder a propiedades anidadas
            const aValue = orderByKeys.reduce(
              (obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null,
              a
            );
            const bValue = orderByKeys.reduce(
              (obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null,
              b
            );

            // Aplicar orden
            if (orderDirection === 'asc') {
                return aValue < bValue ? -1 : 1;
            }
            return aValue > bValue ? -1 : 1;
        });
}
```

---

## 📄 IMPLEMENTACIÓN EN PÁGINAS/MÓDULOS

### Ejemplo Completo: Módulo Cargo

**Ubicación:** `src/Pages/Cargo/Cargo.jsx`

```javascript
import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import CRUDTable from '../../Components/Table/CRUDTable';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { IconButton, Tooltip } from '@mui/material';
import AddCargo from './AddCargo';
import EditCargo from './EditCargo';
import deleteCargo from './DeleteCargo';
import usePermissions from '../../Components/hooks/usePermission';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import useFetch from '../../Components/hooks/useFetch';
import UseUrlParamsManager from '../../Components/hooks/UseUrlParamsManager';
import SearchInput from '../../Components/Inputs/SearchInput';

const Cargo = ({ moduleName }) => {
    // 1. HOOKS Y ESTADO
    const { canCreate, canDelete, canEdit } = usePermissions(moduleName);
    const location = useLocation();
    const { token } = useSelector((state) => state.auth);
    const { getData, deleteData } = useFetch();
    const { addParams } = UseUrlParamsManager();
    const navigate = useNavigate();

    const [data, setdata] = useState([]);
    const [Update, setUpdate] = useState(false);
    const [Loading, setLoading] = useState(false);
    const [Selected, setSelected] = useState(null);
    const [count, setCount] = useState(0);

    // 2. EFECTOS
    // Recargar datos cuando cambian los params de URL o Update
    useEffect(() => {
        fetchData(location.search || undefined);
    }, [location.search, Update]);

    // 3. FUNCIONES DE DATOS
    const fetchData = async (url) => {
        setLoading(true);
        const urlParams = url || '';

        try {
            const response = await getData(
              `${import.meta.env.VITE_APP_ENDPOINT}/cargos/${urlParams}`,
              token
            );

            setCount(response.data.data.totalCount);

            // Formatear datos para la tabla
            const dataFormated = response.data.data.data.map((item) => ({
                id: item.id,
                nombres: item.nombre,
                sueldo: item.sueldo,
                subgerencia: item.Subgerencia.nombre,
            }));

            setdata(dataFormated);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        setUpdate((prev) => !prev);
    }

    // 4. HANDLERS DE ACCIONES
    const onEdit = (obj) => {
        setSelected(obj);
    };

    const onDelete = (obj) => {
        deleteCargo(obj, refreshData, token, deleteData);
    }

    // 5. RENDER
    return (
        <>
            <div className='h-full flex flex-col w-full bg-gray-100 p-4'>
                {/* HEADER */}
                <header className="text-white bg-green-700 py-4 px-3 mb-6 w-full rounded-lg flex justify-center relative">
                    <Link onClick={() => navigate(-1)} className='flex items-center gap-1'>
                        <ArrowBackIosNewRoundedIcon className='!size-5 md:!size-6 mt-[0.1rem] absolute left-4' />
                    </Link>
                    <h1 className="md:text-2xl lg:text-4xl font-bold text-center">
                        CARGOS
                    </h1>
                </header>

                {/* MAIN */}
                <main className='flex-1 bg-white shadow rounded-lg p-4 h-full overflow-hidden'>
                    <div className='flex flex-col w-full h-full'>
                        {/* TOOLBAR */}
                        <div className='w-full flex flex-col md:flex-row justify-space-between pb-6 gap-3'>
                            {/* Contador de filas */}
                            <div className='w-full flex items-center gap-2'>
                                <span className='text-gray-600'>
                                  Total de filas: <span className='font-bold'>{count || 0}</span>
                                </span>
                            </div>

                            {/* Acciones */}
                            <div className='w-full flex items-center justify-end gap-3'>
                                <div className='flex items-center'>
                                    <Tooltip title="Refrescar" placement='top' arrow>
                                        <IconButton aria-label="refresh" onClick={refreshData}>
                                            <RefreshRoundedIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {canCreate && <AddCargo refreshData={refreshData} />}
                                </div>
                                <SearchInput />
                            </div>
                        </div>

                        {/* TABLA */}
                        <CRUDTable
                            data={data}
                            loading={Loading}
                            onDelete={canDelete ? onDelete : null}
                            onEdit={canEdit ? onEdit : null}
                            count={count}
                        />
                    </div>
                </main>
            </div>

            {/* MODALES */}
            {canEdit && <EditCargo Selected={Selected} setSelected={setSelected} refreshData={refreshData} />}
        </>
    )
}

export default Cargo
```

### Ejemplo Avanzado: Módulo Empleados (con Filtros)

**Características adicionales:**
- Múltiples filtros
- Filtros dependientes
- Acciones personalizadas en tabla
- Componentes custom (Switch, badges)

```javascript
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CRUDTable from '../../Components/Table/CRUDTable';
import { IconButton, Switch, Button } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import FilterListIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AddEmpleado from './AddEmpleado';
import EditEmpleado from './EditEmpleado';
import deleteEmpleado from './DeleteEmpleado';
import blacklistEmpleado from './BlacklistEmpleado';
import usePermissions from '../../Components/hooks/usePermission';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import useFetch from '../../Components/hooks/useFetch';
import useFetchData from '../../Components/hooks/useFetchData';
import UseUrlParamsManager from '../../Components/hooks/UseUrlParamsManager';
import SearchInput from '../../Components/Inputs/SearchInput';
import CustomPopover from '../../Components/Popover/CustomPopover';
import FiltroSelect from '../../Components/Filtroselect/Filtro';
import { ESTADOS } from '../../helpers/Constants';
import { mapToSelectOptions } from '../../helpers/mapSelectOptions';

const Empleados = ({ moduleName }) => {
    // HOOKS
    const { canCreate, canDelete, canEdit } = usePermissions(moduleName);
    const location = useLocation();
    const { token } = useSelector((state) => state.auth);
    const { fetchCargos, fetchTurnos, fetchSubgerencias, ... } = useFetchData(token);
    const { addParams, getParams, removeParams } = UseUrlParamsManager();
    const params = getParams();
    const { getData, deleteData, postData } = useFetch();
    const navigate = useNavigate();

    // ESTADO
    const [Cargos, setCargos] = useState([]);
    const [DataSelects, setDataSelects] = useState({});
    const [data, setData] = useState([]);
    const [update, setUpdate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [count, setCount] = useState(0);

    // EFECTOS
    useEffect(() => {
        fetchData(location.search || undefined);
    }, [location.search, update]);

    useEffect(() => {
        loadFiltersData();
    }, []);

    // Filtros dependientes
    useEffect(() => {
        if (!params.subgerencia) {
            setDataSelects((prev) => ({
                ...prev,
                cargos: mapToSelectOptions(Cargos),
            }));
            return;
        }

        addParams({ cargo: '' });

        const validSubgerencias = [10, 13, 23];
        const filteredCargos = params.subgerencia == 4
          ? Cargos
          : Cargos.filter(c => validSubgerencias.includes(c.id) || c.id_subgerencia == params.subgerencia);

        setDataSelects((prev) => ({
            ...prev,
            cargos: mapToSelectOptions(filteredCargos),
        }));
    }, [params.subgerencia, Cargos]);

    // FUNCIONES
    const loadFiltersData = async () => {
        try {
            const [subgerenciasData, turnosData, cargosData, ...rest] = await Promise.all([
                fetchSubgerencias(),
                fetchTurnos(),
                fetchCargos(),
                // ... más fetches
            ]);

            setCargos(cargosData?.data);
            setDataSelects({
                subgerencias: mapToSelectOptions(subgerenciasData?.data),
                turnos: mapToSelectOptions(turnosData?.data),
                cargos: mapToSelectOptions(cargosData?.data),
                // ... más opciones
            });
        } catch (error) {
            console.error('Error al cargar los datos de filtros:', error);
        }
    };

    const fetchData = async (url) => {
        setLoading(true);
        const urlParams = url || '';

        try {
            const response = await getData(
              `${import.meta.env.VITE_APP_ENDPOINT}/empleados/${urlParams}`,
              token
            );

            setCount(response.data.data.totalCount);

            const dataFormated = response.data.data.data.map((item) => ({
                id: item.id,
                apellidos: item.apellidos,
                nombres: item.nombres,
                dni: item.dni,
                celular: item.celular,
                cargo: item.cargo?.nombre || '',
                subgerencia: item.subgerencia?.nombre || 'Sin Subgerencia',
                turno: item.turno?.nombre || 'Sin Turno',
                estado: item.state ? 'Trabajando' : 'Cesado',
                "": [  // Acciones personalizadas
                    canEdit && {
                      icon: <EditIcon />,
                      action: () => onEdit(item.id),
                      label: 'Editar'
                    },
                    canDelete && {
                      icon: <Switch className='drop-shadow-md' size='small' checked={item.state} />,
                      action: () => onDelete(item),
                      label: ''
                    },
                    {
                      icon: <BlockIcon className='text-red-500' />,
                      action: () => onBlacklist(item.id),
                      label: 'Blacklist'
                    }
                ]
            }));

            setData(dataFormated);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        setUpdate((prev) => !prev);
    };

    const onEdit = async (id) => {
        try {
            const response = await getData(
              `${import.meta.env.VITE_APP_ENDPOINT}/empleados/${id}`,
              token
            );
            setSelected(response.data.data);
        } catch (error) {
            console.error('Error al obtener los datos del empleado:', error);
        }
    };

    const onDelete = (obj) => {
        deleteEmpleado(obj, refreshData, token, deleteData);
    };

    const onBlacklist = async (id) => {
        try {
            const response = await getData(
              `${import.meta.env.VITE_APP_ENDPOINT}/empleados/${id}`,
              token
            );
            blacklistEmpleado(response.data.data, refreshData, token, postData);
        } catch (error) {
            console.error('Error al obtener los datos del empleado:', error);
        }
    };

    // Componente de badge de estado
    const StatusButton = ({ estado }) => (
        <span
            style={{
                backgroundColor: estado === "Trabajando" ? 'green' : 'red',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 12px',
                fontWeight: 'bold',
                display: 'inline-block',
            }}
        >
            {estado === "Trabajando" ? 'Trabajando' : 'Cesado'}
        </span>
    );

    return (
        <>
            <div className='h-full flex flex-col w-full bg-gray-100 p-4'>
                {/* HEADER */}
                <header className="text-white bg-green-700 py-4 px-3 mb-6 w-full rounded-lg flex justify-center relative">
                    <Link onClick={() => navigate(-1)}>
                        <ArrowBackIosNewRoundedIcon className='!size-5 md:!size-6 mt-[0.1rem] absolute left-4' />
                    </Link>
                    <h1 className="md:text-2xl lg:text-4xl font-bold text-center">
                        EMPLEADOS
                    </h1>
                </header>

                <main className='flex-1 bg-white shadow rounded-lg p-4 h-full overflow-hidden'>
                    <div className='flex flex-col w-full h-full'>
                        {/* TOOLBAR CON FILTROS */}
                        <div className='w-full flex flex-col md:flex-row justify-space-between pb-6 gap-3'>
                            <div className='w-full flex items-center gap-2'>
                                <span className='text-gray-600'>
                                  Total de filas: <span className='font-bold'>{count || 0}</span>
                                </span>

                                {/* POPOVER DE FILTROS */}
                                <CustomPopover
                                    CustomIcon={FilterListIcon}
                                    CustomIconClose={FilterAltOffIcon}
                                    label={"Filtro Personal"}
                                >
                                    <div className="p-6">
                                        <h1 className="text-xl font-bold text-gray-700 pb-4">Filtros</h1>
                                        <div className="flex flex-wrap justify-center max-w-[500px] max-h-[500px] overflow-y-auto overflow-x-hidden">

                                            {/* Filtro Subgerencia */}
                                            <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
                                                <label className="text-sm font-semibold text-gray-600">
                                                  Subgerencia
                                                </label>
                                                <FiltroSelect
                                                    name="subgerencias"
                                                    placeholder={'Seleccione una subgerencia'}
                                                    onChange={(e) => addParams({ subgerencia: e.target.value })}
                                                    value={params.subgerencia || ''}
                                                    options={DataSelects.subgerencias}
                                                />
                                            </div>

                                            {/* Filtro Cargo (dependiente de Subgerencia) */}
                                            <div className="w-full sm:w-1/2 md:w-1/2 px-2 py-2">
                                                <label className="text-sm font-semibold text-gray-600">
                                                  Cargo
                                                </label>
                                                <FiltroSelect
                                                    name="cargo"
                                                    placeholder={'Seleccione un cargo'}
                                                    onChange={(e) => addParams({ cargo: e.target.value })}
                                                    value={params.cargo || ''}
                                                    options={DataSelects.cargos}
                                                />
                                            </div>

                                            {/* Más filtros... */}

                                        </div>

                                        {/* Botón limpiar */}
                                        <div className="flex justify-end mt-6">
                                            <Button
                                                className="!capitalize"
                                                onClick={() => removeParams()}
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                            >
                                                Limpiar filtros
                                            </Button>
                                        </div>
                                    </div>
                                </CustomPopover>
                            </div>

                            <div className='w-full flex items-center justify-end gap-3'>
                                <div className='flex items-center'>
                                    <IconButton onClick={refreshData}>
                                        <RefreshRoundedIcon />
                                    </IconButton>
                                    {canCreate && <AddEmpleado refreshData={refreshData} />}
                                </div>
                                <SearchInput />
                            </div>
                        </div>

                        {/* TABLA CON ESTADOS CUSTOM */}
                        <CRUDTable
                            data={data.map((item) => ({
                                ...item,
                                estado: <StatusButton estado={item.estado} />,
                            }))}
                            loading={loading}
                            count={count}
                        />
                    </div>
                </main>
            </div>

            {canEdit && <EditEmpleado Selected={selected} setSelected={setSelected} refreshData={refreshData} />}
        </>
    );
};

export default Empleados;
```

---

## ✅ PATRONES Y MEJORES PRÁCTICAS

### 1. Estructura de Estado
```javascript
// ✅ BUENO: Estado organizado y tipado
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [count, setCount] = useState(0);
const [selected, setSelected] = useState(null);
const [update, setUpdate] = useState(false);

// ❌ MALO: Estado desorganizado
const [stuff, setStuff] = useState({});
```

### 2. Manejo de Efectos
```javascript
// ✅ BUENO: Un useEffect para datos, reacciona a cambios de URL
useEffect(() => {
    fetchData(location.search || undefined);
}, [location.search, update]);

// ❌ MALO: Múltiples useEffects que se solapan
useEffect(() => { fetchData(); }, []);
useEffect(() => { fetchData(); }, [update]);
useEffect(() => { fetchData(); }, [location.search]);
```

### 3. Formateo de Datos
```javascript
// ✅ BUENO: Transformar datos al recibirlos del backend
const dataFormated = response.data.data.data.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    cargo: item.cargo?.nombre || 'Sin Cargo',  // Relaciones
    estado: item.state ? 'Activo' : 'Inactivo', // Transformaciones
}));

// ❌ MALO: Transformar en el render
<CRUDTable data={rawData} /> // y transformar dentro de CRUDTable
```

### 4. Parámetros de URL
```javascript
// ✅ BUENO: Agregar múltiples parámetros a la vez
addParams({ page: 1, limit: 20, search: 'Juan' });

// ❌ MALO: Múltiples llamadas
addParams({ page: 1 });
addParams({ limit: 20 });
addParams({ search: 'Juan' });
```

### 5. Filtros Dependientes
```javascript
// ✅ BUENO: Limpiar filtros dependientes al cambiar padre
useEffect(() => {
  if (!params.subgerencia) return;

  addParams({ cargo: '' }); // Limpiar cargo

  const filteredCargos = Cargos.filter(
    c => c.id_subgerencia == params.subgerencia
  );

  setDataSelects(prev => ({
    ...prev,
    cargos: mapToSelectOptions(filteredCargos)
  }));
}, [params.subgerencia]);

// ❌ MALO: No limpiar dependientes
// El usuario ve cargos que no corresponden a la subgerencia seleccionada
```

### 6. Acciones CRUD
```javascript
// ✅ BUENO: Funciones separadas y claras
const onEdit = (obj) => {
    setSelected(obj);
};

const onDelete = (obj) => {
    deleteFunction(obj, refreshData, token, deleteData);
};

// ❌ MALO: Lógica inline
onEdit={(obj) => { /* mucha lógica aquí */ }}
```

### 7. Refresh de Datos
```javascript
// ✅ BUENO: Toggle booleano para forzar re-fetch
const [update, setUpdate] = useState(false);
const refreshData = () => setUpdate(prev => !prev);

// En useEffect
useEffect(() => {
    fetchData();
}, [update]);

// ❌ MALO: Llamar directamente fetchData()
// Puede causar problemas si hay peticiones en progreso
```

### 8. Permisos
```javascript
// ✅ BUENO: Usar hook de permisos y condicionar render
const { canCreate, canDelete, canEdit } = usePermissions(moduleName);

{canCreate && <AddButton />}
<CRUDTable
  onEdit={canEdit ? onEdit : null}
  onDelete={canDelete ? onDelete : null}
/>

// ❌ MALO: Renderizar siempre y ocultar con CSS
```

### 9. Componentes Custom en Tabla
```javascript
// ✅ BUENO: Crear componente fuera y usarlo en map
const StatusBadge = ({ estado }) => (
  <span className={estado === 'Activo' ? 'badge-green' : 'badge-red'}>
    {estado}
  </span>
);

<CRUDTable
  data={data.map(item => ({
    ...item,
    estado: <StatusBadge estado={item.estado} />
  }))}
/>

// ❌ MALO: JSX inline complejo
estado: <span style={{...muchoEstilo}}>{item.estado}</span>
```

### 10. Manejo de Errores
```javascript
// ✅ BUENO: Try-catch con finally para loading
const fetchData = async (url) => {
    setLoading(true);
    try {
        const response = await getData(url, token);
        setData(response.data);
    } catch (error) {
        console.error(error);
        // Opcional: mostrar toast de error
    } finally {
        setLoading(false);
    }
};

// ❌ MALO: Sin manejo de errores
const fetchData = async (url) => {
    const response = await getData(url, token);
    setData(response.data);
    setLoading(false);
};
```

### 11. Jerarquía de Contenedores para Scroll
```javascript
// ✅ BUENO: Jerarquía correcta con overflow controlado
<div className='h-full flex flex-col w-full bg-gray-100 p-4'>
  <header>...</header>
  <main className='flex-1 bg-white overflow-hidden'>
    <div className='flex flex-col w-full h-full'>
      <div>Toolbar</div>
      <div className='flex flex-1 overflow-hidden'>  {/* Clave */}
        <div className='flex flex-col w-full'>
          <div className='flex-1 max-h-full overflow-y-auto'>  {/* Scroll aquí */}
            <Table className='text-nowrap'>...</Table>
          </div>
          <div>Paginación</div>
        </div>
      </div>
    </div>
  </main>
</div>

// ❌ MALO: Sin overflow-hidden en contenedores
<div className='h-full'>
  <main className='flex-1'>  {/* Falta overflow-hidden */}
    <div className='overflow-y-auto'>  {/* Scroll escapa */}
      <Table>...</Table>
    </div>
  </main>
</div>
```

### 12. Header Sticky
```javascript
// ✅ BUENO: Header con sticky, z-index y color de fondo
<TableHead className='bg-green-600 sticky top-0 z-10'>
  <TableRow>...</TableRow>
</TableHead>

// ❌ MALO: Sin sticky o sin fondo (se ve transparente)
<TableHead className='sticky top-0'>  {/* Sin color de fondo */}
  <TableRow>...</TableRow>
</TableHead>
```

### 13. Scroll Horizontal
```javascript
// ✅ BUENO: text-nowrap para prevenir wrap
<Table size='small' className='text-nowrap'>
  <TableBody>
    <TableRow>
      <TableCell>Contenido largo que no se corta</TableCell>
    </TableRow>
  </TableBody>
</Table>

// ❌ MALO: Las celdas se comprimen y el texto se corta
<Table size='small'>
  <TableBody>
    <TableRow>
      <TableCell className='truncate'>Contenido...</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 🚀 CHECKLIST DE IMPLEMENTACIÓN

Al implementar un nuevo módulo con tabla, verifica:

### Backend
- [ ] Endpoint acepta params: `?page=1&limit=20&search=...`
- [ ] Respuesta incluye `totalCount` para paginación
- [ ] Filtros están implementados en backend
- [ ] Ordenamiento se maneja en backend (opcional)

### Frontend - Componente Página
- [ ] Import de `CRUDTable`, `SearchInput`, `TablePagination`
- [ ] Hook `UseUrlParamsManager` para params
- [ ] Hook `useFetch` para peticiones
- [ ] Hook `usePermissions` para permisos
- [ ] Estado: `data`, `loading`, `count`, `update`, `selected`
- [ ] `useEffect` reacciona a `location.search` y `update`
- [ ] Función `fetchData` que acepta URL params
- [ ] Función `refreshData` para actualizar
- [ ] Handlers `onEdit`, `onDelete` si aplica
- [ ] Formateo de datos antes de pasar a tabla
- [ ] Contenedor principal con `className='h-full flex flex-col'`
- [ ] Main con `className='flex-1 overflow-hidden'`

### Frontend - CRUDTable
- [ ] Prop `data` con datos formateados
- [ ] Prop `loading` con estado de carga
- [ ] Prop `count` con total de registros
- [ ] Props `onEdit` y `onDelete` si se requieren
- [ ] Prop `ArrLookup` si hay relaciones
- [ ] Prop `pagination={true}`
- [ ] Contenedor con `className='flex flex-1 overflow-hidden'`
- [ ] Scroll vertical en `className='flex-1 max-h-full overflow-y-auto'`
- [ ] Table con `className='text-nowrap'` para scroll horizontal
- [ ] TableHead con `className='sticky top-0 z-10 bg-[color]'`

### Frontend - Búsqueda
- [ ] Componente `<SearchInput />` en toolbar
- [ ] Backend recibe param `search` o `dni`

### Frontend - Filtros (Opcional)
- [ ] Componente `<CustomPopover>` con filtros
- [ ] Estado `DataSelects` con opciones
- [ ] `useEffect` para cargar opciones de filtros
- [ ] Lógica de filtros dependientes si aplica
- [ ] Botón "Limpiar filtros" con `removeParams()`
- [ ] Backend recibe params de filtros

### Extras
- [ ] Header con título del módulo
- [ ] Botón "Refrescar"
- [ ] Contador de filas
- [ ] Botón "Agregar" si `canCreate`
- [ ] Modales de edición/eliminación
- [ ] Mensajes de error amigables

---

## 📊 DIAGRAMA DE FLUJO

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARIO INTERACTÚA                       │
│  (Cambia página, busca, filtra, ordena)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              UseUrlParamsManager.addParams()                 │
│         URL: ?page=2&search=Juan&subgerencia=3              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         useEffect detecta cambio en location.search          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         fetchData(location.search) se ejecuta                │
│                  setLoading(true)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          useFetch.getData(url + params, token)               │
│            axios.get(url, { headers })                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND RESPONDE                           │
│   { data: [...], totalCount: 150 }                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Formateo de Datos (map)                         │
│   data.map(item => ({ id, nombre, cargo, ... }))           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    setData(dataFormated)                     │
│                    setCount(totalCount)                      │
│                    setLoading(false)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               CRUDTable recibe props                         │
│         { data, loading, count, ... }                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            CRUDTable genera headers                          │
│      Object.keys(data[0]).filter(...)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         CRUDTable aplica ordenamiento local                  │
│          SortData(data, orderBy, direction)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RENDERIZADO DE TABLA                            │
│   - Headers con TableSortLabel                              │
│   - Rows con datos formateados                              │
│   - Acciones Edit/Delete                                    │
│   - Paginación con CustomTablePagination                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                USUARIO VE RESULTADOS                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 RESUMEN EJECUTIVO

Este sistema de tablas proporciona:

1. **Componente reutilizable** (`CRUDTable`) que se adapta automáticamente a cualquier estructura de datos
2. **Sistema de scroll optimizado** con scroll vertical dentro de la tabla y header sticky
3. **Scroll horizontal automático** para tablas con muchas columnas (text-nowrap)
4. **Paginación persistente** mediante URL params que siempre permanece visible
5. **Búsqueda inteligente** con detección de tipo y debounce
6. **Sistema de filtros** modular y escalable con dependencias entre filtros
7. **Ordenamiento local** por cualquier columna
8. **Gestión centralizada de URLs** para mantener estado
9. **Hooks reutilizables** para fetch y permisos
10. **Acciones personalizadas** por fila (iconos, switches, badges)
11. **Estados de carga** consistentes
12. **Manejo de errores** unificado
13. **Layout responsivo** que se adapta a móvil, tablet y desktop

### Para implementar en otro proyecto:

1. Copiar componentes base (`CRUDTable.jsx`, `TablePagination.jsx`, `SearchInput.jsx`)
2. Copiar hooks (`UseUrlParamsManager.jsx`, `useFetch.js`)
3. Copiar funciones helper (`SortData` de `GeneralFunctions.js`)
4. Adaptar el backend para que acepte y procese los params de URL
5. Seguir el patrón de implementación mostrado en los ejemplos
6. Usar el checklist de implementación para cada nuevo módulo

---

**Autor:** Proyecto Tareaje Frontend
**Fecha:** 2025
**Versión:** 1.0
