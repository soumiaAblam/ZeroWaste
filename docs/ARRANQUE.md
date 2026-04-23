# Arranque en un ordenador nuevo

Esta guia esta pensada para que cualquier profesor pueda ejecutar el proyecto
desde cero. Los pasos estan escritos para Windows con terminal PowerShell, que es el
entorno mas habitual en clase. Al final hay notas para errores comunes.

## 1. Requisitos previos

Instalar antes de empezar:

- Git.
- MySQL Server 8.x o MariaDB compatible.
- MySQL Workbench, recomendado para crear e importar la base de datos sin
  problemas con rutas.
- Python `3.12` o superior. El proyecto usa Django `6.0.4`, que requiere
  Python `>=3.12`.
- Node.js compatible con Angular 20: `^20.19.0`, `^22.12.0` o `>=24.0.0`.
- npm incluido con Node.
- Un navegador moderno, preferiblemente Chrome o Edge.

Versiones con las que se ha comprobado este entorno local:

- Python `3.14.4`
- Django `6.0.4`
- Node `24.2.0`
- npm `11.3.0`

## 2. Descargar el proyecto

```
git clone URL_DEL_REPOSITORIO
cd ZeroWasteApp
```

Si se descarga como ZIP desde GitHub, hay que descomprimirlo y abrir una
terminal en la carpeta raiz del proyecto, donde estan `manage.py`,
`requirements.txt` y `TablasSQLzeroWaste.sql`.

## 3. Preparar MySQL

El backend usa una base de datos MySQL llamada `zerowaste_db`.

Hay dos formas validas de prepararla:

- Opcion A, base vacia: importar `TablasSQLzeroWaste.sql` y despues ejecutar las
  migraciones de Django.
- Opcion B, mas comoda para revision: importar un unico `.sql` completo con la
  base de datos `zerowaste_db` ya preparada, incluyendo estructura y datos.

Opcion recomendada con MySQL Workbench:

1. Abrir MySQL Workbench y conectarse al servidor local.
2. Ejecutar:

```sql
CREATE DATABASE IF NOT EXISTS zerowaste_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

3. Abrir el archivo `TablasSQLzeroWaste.sql`.
4. Ejecutar todo el script.

Opcion por consola MySQL:

```sql
CREATE DATABASE IF NOT EXISTS zerowaste_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE zerowaste_db;
SOURCE C:/ruta/al/proyecto/TablasSQLzeroWaste.sql;
```

Importante:

- `TablasSQLzeroWaste.sql` crea las tablas propias de la app:
  `usuario`, `producto`, `estado_caducidad`, `inventario`,
  `lista_compra` e `item_lista_compra`.
- Despues se ejecutara `python manage.py migrate` para crear las tablas
  internas de Django, como `auth_user` y `django_session`.
- No hace falta ejecutar `makemigrations` para arrancar el proyecto.
- Si se importa un volcado SQL completo de `zerowaste_db`, lo normal es que ya
  esten tambien las tablas internas de Django y los datos de ejemplo.

## 4. Preparar el backend Django

Desde la carpeta raiz del proyecto:

```
python -m venv .venv
```

Activar el entorno virtual:

```
.\.venv\Scripts\Activate.ps1
```

Si PowerShell bloquea la activacion, ejecutar solo para esta terminal:

```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Instalar dependencias:

```
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Configurar la conexion a MySQL en la misma terminal. Ajustar usuario y
contrasena segun la instalacion local:

```
$env:DB_NAME="zerowaste_db"
$env:DB_USER="root"
$env:DB_PASSWORD="TU_CONTRASENA_MYSQL"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
```

Si MySQL no tiene contrasena para `root`, usar exactamente:

```
$env:DB_PASSWORD=""
```

Este paso es importante porque el valor por defecto del proyecto para
`DB_PASSWORD` no es una cadena vacia.

Estas variables solo duran mientras esa terminal esta abierta. Si se abre otra
terminal para ejecutar comandos de Django, hay que volver a definirlas.

Aplicar migraciones internas de Django:

```
python manage.py migrate
```

Comprobar que Django no detecta errores de configuracion:

```
python manage.py check
```

Arrancar la API:

```
python manage.py runserver
```

La API debe quedar disponible en:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/`

Dejar esta terminal abierta.

## 5. Preparar el frontend Angular

Abrir una segunda terminal en la carpeta raiz del proyecto y entrar en
`frontend`:

```
cd frontend
```

Instalar dependencias usando el lockfile:

```
npm ci
```

Arrancar Angular:

```
npm start
```

Abrir en el navegador:

```text
http://127.0.0.1:4200/
```

El frontend calcula la URL de la API con el mismo host del navegador y el puerto
`8000`, por ejemplo `http://127.0.0.1:8000/api`.

## 6. Primer acceso

1. Entrar en `http://127.0.0.1:4200/`.
2. Pulsar `Crear cuenta`.
3. Registrar un usuario con email real o de prueba.
4. La aplicacion entra automaticamente al dashboard.

Si se quiere revisar la app con datos ya cargados, hay dos opciones:

- Importar un volcado SQL preparado aparte con la base de datos de desarrollo (zerowaste_db_with_mock_data.sql, proporcionada junto con el proyecto).
- Arrancar la app vacia y crear productos e inventario manualmente desde la interfaz.

Para una entrega o revision, lo mas comodo suele ser un unico archivo `.sql`
con estructura y datos. En MySQL Workbench se puede generar desde:

- `Server > Data Export`
- Seleccionar solo el esquema `zerowaste_db`
- Elegir `Export to Self-Contained File`
- Marcar estructura y datos

Despues el profesor solo tiene que importarlo en su MySQL y arrancar backend y frontend.

## 7. Checklist de comprobacion

Antes de dar el proyecto por arrancado, comprobar:

- `http://127.0.0.1:8000/api/` muestra el resumen de la API.
- `http://127.0.0.1:4200/` carga la pantalla de login o dashboard.
- El registro crea usuario y entra en la app.
- El menu muestra Dashboard, Inventario, Productos, Lista de compra, Recetas,
  Desperdicio y Estadisticas.
- La parte superior permite abrir `Cuenta`, ver notificaciones y cerrar sesion.
- En Inventario se puede crear un registro con producto existente o producto
  nuevo.
- En Productos se puede crear, editar, ver y eliminar un producto, y buscar
  datos por codigo de barras.
- Si hay productos caducados o consumidos, aparecen sugerencias en Lista de
  compra.
- El enlace `Nosotros` del footer abre la pagina con Vision, Mision y Objetivo.
- `npm run build` termina correctamente desde `frontend`.

## 8. Errores comunes

`Access denied for user 'root'@'localhost'`

La contrasena de MySQL no coincide. Volver a definir:

```
$env:DB_PASSWORD="TU_CONTRASENA_MYSQL"
```

Si no hay contrasena:

```
$env:DB_PASSWORD=""
```

`Unknown database 'zerowaste_db'`

La base de datos no existe. Repetir el paso 3 y crear `zerowaste_db`.

`Table 'zerowaste_db.auth_user' doesn't exist`

Faltan migraciones internas de Django. Ejecutar:

```
python manage.py migrate
```

`Table 'zerowaste_db.usuario' doesn't exist`

No se ha importado `TablasSQLzeroWaste.sql`. Importarlo desde MySQL Workbench o
con `SOURCE`.

`Port 8000 is already in use`

Cerrar el proceso que ocupa el puerto 8000. El frontend esta configurado para
usar la API en el puerto 8000, asi que es mejor dejar Django en ese puerto.

`Port 4200 is already in use`

Cerrar el proceso que ocupa el puerto 4200 y volver a ejecutar `npm start`. Si
se cambia el puerto de Angular, tambien hay que anadir ese origen a
`CORS_ALLOWED_ORIGINS` antes de arrancar Django.

`npm ci` falla por version de Node

Instalar una version compatible con Angular 20:

```text
Node ^20.19.0, ^22.12.0 o >=24.0.0
```

La camara no escanea codigos de barras

El escaneo con camara solo esta disponible en el formulario de Productos.
En Inventario el alta se hace seleccionando un producto existente o
escribiendo uno nuevo manualmente. En Productos, el escaneo depende de que el
navegador soporte `BarcodeDetector` y de conceder permisos de camara.

## 9. Comandos finales de verificacion

Backend:

```
python manage.py check
```

Frontend:

```
cd frontend
npm run build
```
