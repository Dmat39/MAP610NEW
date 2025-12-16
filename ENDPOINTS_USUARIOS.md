# Endpoints de API para Gestión de Usuarios

Este documento describe los endpoints que necesitas implementar en el backend para que la gestión de usuarios funcione correctamente.

## Base URL
```
{VITE_API_URL}user
```

Ejemplo: Si `VITE_API_URL=http://192.168.13.25:3022/api/`, entonces:
```
http://192.168.13.25:3022/api/user
```

## Autenticación
Todos los endpoints requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

---

## 1. Obtener todos los usuarios (con filtros)

**GET** `/api/user`

### Query Parameters:
- `search` (opcional): Búsqueda por nombre de usuario o email
- `role` (opcional): Filtrar por rol (ADMINISTRATOR, SUPERVISOR, OPERATOR, CEPLAN)
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 20)

### Ejemplo de Request:
```
GET /api/user?search=juan&role=OPERATOR&page=1&limit=20
```

### Response (200 OK):
```json
{
  "users": [
    {
      "id": 1,
      "username": "jperez",
      "email": "jperez@ejemplo.com",
      "role": "OPERATOR",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "username": "mgarcia",
      "email": "mgarcia@ejemplo.com",
      "role": "SUPERVISOR",
      "createdAt": "2024-01-16T14:20:00Z",
      "updatedAt": "2024-01-16T14:20:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

### Formato alternativo aceptado:
```json
{
  "data": [...],
  "count": 25
}
```

---

## 2. Obtener un usuario por ID

**GET** `/api/user/:id`

### Parámetros de URL:
- `id`: ID del usuario

### Response (200 OK):
```json
{
  "id": 1,
  "username": "jperez",
  "email": "jperez@ejemplo.com",
  "role": "OPERATOR",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Error (404 Not Found):
```json
{
  "message": "Usuario no encontrado"
}
```

---

## 3. Crear un nuevo usuario

**POST** `/api/user`

### Request Body:
```json
{
  "username": "jperez",
  "email": "jperez@ejemplo.com",
  "password": "password123",
  "role": "OPERATOR"
}
```

### Validaciones:
- `username`: Requerido, único, mínimo 3 caracteres
- `email`: Requerido, único, formato email válido
- `password`: Requerido, mínimo 6 caracteres
- `role`: Requerido, valores permitidos: ADMINISTRATOR, SUPERVISOR, OPERATOR, CEPLAN

### Response (201 Created):
```json
{
  "id": 3,
  "username": "jperez",
  "email": "jperez@ejemplo.com",
  "role": "OPERATOR",
  "createdAt": "2024-01-17T09:15:00Z",
  "updatedAt": "2024-01-17T09:15:00Z"
}
```

### Error (400 Bad Request):
```json
{
  "message": "El nombre de usuario ya está en uso"
}
```

---

## 4. Actualizar un usuario

**PUT** `/api/user/:id`

### Parámetros de URL:
- `id`: ID del usuario

### Request Body:
```json
{
  "email": "nuevo.email@ejemplo.com",
  "password": "nuevapassword123",
  "role": "SUPERVISOR"
}
```

**Nota importante:**
- El campo `username` NO debe ser actualizable
- El campo `password` es opcional. Si no se envía o está vacío, la contraseña no se modifica
- Solo se deben enviar los campos que se quieren actualizar

### Response (200 OK):
```json
{
  "id": 1,
  "username": "jperez",
  "email": "nuevo.email@ejemplo.com",
  "role": "SUPERVISOR",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-17T11:45:00Z"
}
```

### Error (404 Not Found):
```json
{
  "message": "Usuario no encontrado"
}
```

### Error (400 Bad Request):
```json
{
  "message": "El email ya está en uso por otro usuario"
}
```

---

## 5. Eliminar un usuario

**DELETE** `/api/user/:id`

### Parámetros de URL:
- `id`: ID del usuario

### Response (200 OK):
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

### Error (404 Not Found):
```json
{
  "message": "Usuario no encontrado"
}
```

### Error (403 Forbidden):
```json
{
  "message": "No puedes eliminar tu propio usuario"
}
```

---

## Roles Disponibles

Los roles del sistema son:

1. **ADMINISTRATOR** - Acceso completo al sistema
2. **SUPERVISOR** - Acceso a supervisión y reportes
3. **OPERATOR** - Acceso limitado como operador
4. **CEPLAN** - Acceso específico para CEPLAN

---

## Códigos de Error

- `200` - OK: Operación exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Datos inválidos o faltantes
- `401` - Unauthorized: Token inválido o ausente
- `403` - Forbidden: Sin permisos para realizar la operación
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error del servidor

---

## Permisos

Solo los usuarios con rol **ADMINISTRATOR** pueden acceder a estos endpoints.

---

## Notas de Implementación

1. Las contraseñas deben ser hasheadas antes de almacenarse (usar bcrypt o similar)
2. Los tokens JWT deben validarse en cada request
3. Implementar paginación eficiente para grandes cantidades de usuarios
4. No devolver el campo `password` en ninguna respuesta
5. Validar que el email tenga formato válido
6. Prevenir SQL injection y otros ataques
7. Registrar logs de todas las operaciones CRUD de usuarios para auditoría

---

## Ejemplo de Uso desde el Frontend

El servicio ya está configurado en `src/services/usuariosService.js` y se comunica con estos endpoints automáticamente.

```javascript
// Cargar usuarios con filtros
const response = await usuariosService.getAll({
  search: 'juan',
  role: 'OPERATOR',
  page: 1,
  limit: 20
});

// Crear usuario
await usuariosService.create({
  username: 'jperez',
  email: 'jperez@ejemplo.com',
  password: 'password123',
  role: 'OPERATOR'
});

// Actualizar usuario
await usuariosService.update(userId, {
  email: 'nuevo@ejemplo.com',
  role: 'SUPERVISOR'
});

// Eliminar usuario
await usuariosService.delete(userId);
```
