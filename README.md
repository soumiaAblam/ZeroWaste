# ZeroWaste

ZeroWaste es una aplicacion web para controlar alimentos, fechas de caducidad,
productos consumidos, desperdicio y sugerencias de compra. El proyecto esta
separado en dos partes:

- Backend: API REST con Django, Django REST Framework y MySQL.
- Frontend: aplicacion Angular standalone servida en desarrollo con Angular CLI.

La interfaz de usuario vive en `frontend/` y consume la API en
`http://127.0.0.1:8000/api/`.

## Documentacion principal

- [Arranque en un ordenador nuevo](docs/ARRANQUE.md)
- [Manual de uso resumido](docs/MANUAL_USO.md)

Para arrancar el proyecto, recomiendo empezar por
`docs/ARRANQUE.md`, porque incluye la preparacion de MySQL, el entorno Python,
las dependencias de Angular y las comprobaciones finales.

## Stack usado

- Python `>=3.12`
- Django `6.0.4`
- Django REST Framework `3.16.1`
- Simple JWT `5.5.1`
- MySQL / MariaDB compatible
- Angular `20.3`
- Angular Material / CDK
- Chart.js `4.5`

## Arquitectura resumida

La arquitectura es cliente-servidor:

1. Angular muestra la interfaz, protege rutas y guarda la sesion mediante token en
   `localStorage`.
2. El interceptor del frontend envia el token `Bearer` en cada peticion.
3. Django REST Framework sirve los datos de contenido bajo `/api/`.
4. La API lee y escribe en MySQL usando los modelos del dominio.
5. Las pantallas de desperdicio, estadisticas, recetas y lista de compra se
   calculan a partir de los datos de inventario y productos.

El backend mantiene las tablas principales como tablas existentes de MySQL
(`managed = False` en los modelos). Por eso el archivo
`TablasSQLzeroWaste.sql` es importante para crear la base de datos inicial. Las
migraciones de Django se usan sobre todo para las tablas internas de Django
como `auth_user`, sesiones, permisos y admin.

## Organizacion del proyecto

```text
ZeroWasteApp/
|-- api/                    # Url's de recursos, serializers y servicios REST
|-- authentication/         # Modelo usuario de la tabla usuario
|-- config/                 # Configuracion global de Django
|-- inventory/              # Inventario y estados de caducidad
|-- products/               # Productos y busqueda por codigo de barras
|-- shopping_list/          # Lista de compra y sugerencias automaticas
|-- frontend/               # Aplicacion Angular
|-- TablasSQLzeroWaste.sql  # Tablas MySQL propias de la app
|-- manage.py               # Comandos Django
|-- requirements.txt        # Dependencias Python
```

## Archivos importantes

- `config/settings.py`: configuracion de Django, MySQL, CORS, tokens, idioma y
  correo local.
- `config/urls.py`: entrada general del backend; monta `/api/` y `/admin/`.
- `api/urls.py`: rutas REST principales de autenticacion, usuarios, productos,
  inventario, sugerencias y busqueda por codigo de barras.
- `api/views.py`: vistas y viewsets de la API.
- `api/serializers.py`: validacion y formato de los datos que entran y salen
  por la API.
- `api/services.py`: sincronizacion entre `auth_user` de Django y la tabla
  propia `usuario`.
- `products/services.py`: normalizacion de nombres y consulta a Open Food Facts
  por codigo de barras.
- `shopping_list/services.py`: genera y sincroniza sugerencias cuando un
  producto se consume o caduca.
- `frontend/src/app/app.routes.ts`: rutas principales de Angular.
- `frontend/src/app/core/config/api.config.ts`: URL base de la API.
- `frontend/src/app/core/config/resources.config.ts`: configuracion reutilizada
  para las pantallas CRUD de productos e inventario.
- `frontend/src/app/core/services/auth.service.ts`: login, registro, refresh de
  token, logout y actualizacion de perfil.
- `frontend/src/app/core/services/http-api.service.ts`: capa HTTP comun para el
  frontend.
- `frontend/src/app/core/interceptors/auth.interceptor.ts`: anade el token JWT a
  las peticiones.
- `frontend/src/app/layout/main-layout.*`: estructura comun con navegacion,
  notificaciones y zona de contenido.
- `frontend/src/app/components/`: pantallas de login, registro, dashboard,
  inventario, productos, lista de compra, recetas, desperdicio, estadisticas y
  cuenta.

## Rutas (urls) principales

- `GET /`: resumen de la API.
- `POST /api/auth/register/`: registro de usuario.
- `POST /api/auth/login/`: login y obtencion de tokens.
- `POST /api/auth/refresh/`: refresco del access token.
- `GET /api/auth/me/`: datos del usuario actual.
- `POST /api/auth/logout/`: cierre de sesion.
- `GET|POST /api/productos/`: listado y creacion de productos.
- `GET|PUT|PATCH|DELETE /api/productos/<id>/`: detalle y mantenimiento de un
  producto.
- `GET|POST /api/inventarios/`: listado y creacion de inventario.
- `GET|PUT|PATCH|DELETE /api/inventarios/<id>/`: detalle y mantenimiento de un
  registro de inventario.
- `GET /api/listas-compra/sugerencias/`: productos sugeridos para recomprar.
- `GET /api/productos/barcode-lookup/?codigo_barras=...`: busqueda externa por
  codigo de barras.

## Comandos rapidos para correr las apps

Backend:

```
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

Frontend:

```
cd frontend
npm start
```

URLs de desarrollo:

- Frontend: `http://127.0.0.1:4200/`
- API: `http://127.0.0.1:8000/api/`
- Admin Django: `http://127.0.0.1:8000/admin/`

## Verificaciones recomendadas

```
python manage.py check
cd frontend
npm run build
```

## Datos de demo

El repositorio no incluye scripts para generar datos de ejemplo en la base de
datos. Si se quiere revisar la app con contenido ya cargado, lo recomendable es
importar un volcado SQL preparado aparte para desarrollo o evaluacion.

La forma mas sencilla para un profesor suele ser un unico archivo `.sql` con la
base de datos completa `zerowaste_db` exportada con estructura y datos. Ese
archivo no conviene subirlo al repositorio; para eso `.gitignore` ya excluye la
carpeta `database_exports/` y formatos tipicos de copia de seguridad.
