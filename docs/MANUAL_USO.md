# Manual de uso resumido

ZeroWaste ayuda a registrar productos, controlar caducidades, detectar
desperdicio y preparar sugerencias de compra.

## 1. Registro e inicio de sesion

Al abrir `http://127.0.0.1:4200/`, si no hay sesion activa aparece el login.

- `Crear cuenta`: registra nombre de usuario, email y contrasena.
- `Entrar`: inicia sesion con nombre de usuario y contrasena.
- `Cerrar sesion`: sale de la cuenta desde la parte superior derecha.

La sesion usa tokens JWT y se guarda en el navegador.

## 2. Navegacion general

El menu lateral principal permite entrar en:

- Dashboard
- Inventario
- Productos
- Lista de compra
- Recetas
- Desperdicio
- Estadisticas

Ademas:

- `Cuenta` esta en la parte superior derecha.
- El icono de campana abre las notificaciones.
- `Nosotros` esta en el footer.

En Dashboard, Inventario, Productos, Lista de compra y Desperdicio aparece una
barra lateral de filtros para buscar por nombre o codigo de barras, filtrar por
categoria, consumo y estado de caducidad.

## 3. Dashboard

Muestra los alimentos activos que necesitan atencion por caducidad.

- Los productos se ordenan por prioridad.
- `Caduca muy pronto` aparece cuando faltan 2 dias o menos.
- `Consumir pronto` aparece cuando faltan entre 3 y 6 dias.
- Desde cada tarjeta se puede marcar un producto como consumido.
- El icono de notificaciones muestra avisos del dia y avisos anteriores.

## 4. Inventario

Sirve para registrar lo que hay en casa.

Acciones principales:

- `Crear registro de inventario`: anade un alimento.
- Seleccionar un producto existente o escribir un producto nuevo.
- Indicar cantidad, fecha de compra, fecha de caducidad y marca.
- Ver detalle del registro.
- Editar el registro.
- Eliminar el registro.
- Marcar como `Consumido`.

Cuando se guarda un alimento, la app calcula automaticamente su estado de
caducidad segun la fecha indicada.

## 5. Productos

Es el catalogo base de alimentos.

Acciones principales:

- Crear producto con nombre, categoria, descripcion, precio y codigo de barras.
- Ver detalle.
- Editar.
- Eliminar.
- Buscar un codigo de barras escrito para autocompletar datos si hay
  informacion disponible.
- Escanear con camara en el formulario de Productos si el navegador soporta
  `BarcodeDetector`.

La busqueda por codigo de barras consulta el backend, que intenta obtener datos
desde Open Food Facts.

## 6. Lista de compra

Muestra productos que conviene volver a comprar.

La lista se genera automaticamente desde:

- Productos marcados como consumidos.
- Productos caducados no consumidos.

Cada tarjeta muestra cantidad, categoria, codigo de barras y motivo de la
sugerencia. El boton `Actualizar` recalcula la lista.

## 7. Recetas

Muestra alimentos urgentes para combinarlos en una receta.

- Se pueden seleccionar varios ingredientes.
- El contador indica cuantos productos se han seleccionado.
- El boton de SuperCook esta preparado como prototipo para una integracion
  futura.

## 8. Desperdicio

Muestra productos que han caducado sin estar marcados como consumidos.

Incluye:

- Total de productos desperdiciados.
- Dinero perdido estimado.
- Tarjetas con producto, categoria, marca, codigo y fecha de caducidad.

Esta pantalla sirve para revisar patrones y ajustar mejor futuras compras.

## 9. Estadisticas

Muestra graficas de desperdicio usando Chart.js.

Modos disponibles:

- `Meses`: compara los meses de un ano.
- `Anos`: compara varios anos.
- `Mes elegido`: muestra el detalle de un mes concreto.

La grafica combina cantidad de productos desperdiciados y dinero perdido
estimado.

## 10. Cuenta

Permite actualizar:

- Nombre de usuario.
- Email.
- Contrasena.

Si el campo de contrasena se deja vacio, se mantiene la contrasena actual.

## 11. Nosotros

Desde el footer se puede abrir `Nosotros`, una pagina breve con el articulo
institucional de la app. Resume:

- Vision
- Mision
- Objetivo

## 12. Reglas importantes de la app

- Los productos consumidos desaparecen del inventario activo, pero se conservan
  para estadisticas y sugerencias.
- Los productos caducados se muestran en Desperdicio si no estan consumidos.
- La lista de compra se sincroniza cuando se crea, actualiza, consume o elimina
  un registro de inventario.
- El dashboard y las notificaciones solo muestran avisos de productos activos,
  no consumidos y no caducados.
