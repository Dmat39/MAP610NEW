Communal
Módulo de Gestión de Cámaras Vecinales

﻿

POST
Create a communal
communal
Rol: ADMINISTRATOR

Creación de una cámara vecinal

Elementos del body:

Campo	Tipo	Descripción	Requerimiento
address
string
Dirección
Obligatorio
brand
enum
Marca (DAHUA, HIKVISION)
Obligatorio
mode
enum
Modo (FIXED, DOME, BOTH)
Obligatorio
neighbor
string
Nombre del vecino
Obligatorio
latitude
float
Latitud
Obligatorio
longitude
float
Longitud
Obligatorio
﻿

Authorization
Bearer Token
Token
Body
raw (json)
json
{
    "address": "Jr. Chinchaysuyo 128, Zarate, San Juan de Lurigancho",
    "brand": "DAHUA",
    "mode": "FIXED",
    "neighbor": "Dua Lipa",
    "latitude": -12.027257,
    "longitude": -76.999918
}
POST
Upload communal
communal/upload
Rol: ADMINISTRATOR

Carga de archivo formato geojson con los registros de las cámaras vecinales

﻿

Authorization
Bearer Token
Token
Body
form-data
file
/C:/Users/eduVB/Downloads/camaras-vecinales (1).geojson
GET
Find a communal
communal/ae6f0857-6840-4a1f-9598-0cd93a59d642
Rol: ALL

Obtener una cámara vecinal

﻿

Authorization
Bearer Token
Token
GET
Find communal
communal
Rol: ALL

Obtener todas las cámaras vecinales

Filtros:

Campo	Tipo	Descripción	Requerimiento
search
string
Dirección
Opcional
brand
enum
Marca (DAHUA, HIKVISION)
Opcional
mode
enum
Modo (FIXED, DOME, BOTH)
Opcional
﻿

Authorization
Bearer Token
Token
Query Params
search
104
PATCH
Update a communal
communal/a5e30748-9367-42d0-9767-8703c1e4b200
Rol: ADMINISTRATOR

Actualización de una cámara vecinal

Elementos del body:

Campo	Tipo	Descripción	Requerimiento
address
string
Dirección
Opcional
brand
enum
Marca (DAHUA, HIKVISION)
Opcional
mode
enum
Modo (FIXED, DOME, BOTH)
Opcional
neighbor
string
Nombre del vecino
Opcional
latitude
float
Latitud
Opcional
longitude
float
Longitud
Opcional
﻿

Authorization
Bearer Token
Token
Body
raw (json)
json
{
    "neighbor": "Calvin Harris"
}
DELETE
Delete a communal
communal/a5e30748-9367-42d0-9767-8703c1e4b200
Rol: ADMINISTRATOR

Cambio de estado de una cámara vecinal (DELETE, RESTORE)

﻿

Authorization
Bearer Token
Token