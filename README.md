# La Tiendita

## Experiencia de compra

El catálogo permite buscar por nombre o categoría sin depender de las tildes, filtrar productos disponibles y ordenar por precio o nombre. Si la carga tarda demasiado o falla, muestra un aviso y permite reintentar sin confundir el problema de conexión con un catálogo vacío. El carrito se conserva en el navegador para que una recarga no borre la selección; al volver a cargar el catálogo, las cantidades se ajustan a las existencias actuales. En pantallas pequeñas aparece un acceso rápido al pago. El carrito local guarda únicamente identificadores de productos y cantidades, no datos personales ni de pago.

El delivery permite buscar y seleccionar un punto en el mapa, usar el GPS o pegar un enlace de Google Maps. En el mapa se muestran comercios cercanos (abastos, supermercados, farmacias y centros comerciales) a partir de OpenStreetMap mediante Photon; son referencias aproximadas y la cobertura depende de los datos comunitarios. El estimado usa distancia en línea recta desde Caracas centro, no una ruta vial; la tienda confirma la tarifa final. El GPS requiere permiso del navegador y una conexión HTTPS o localhost.

## Publicar en GitHub Pages

En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue. El sitio no se publica con cada cambio: desde **Actions → Deploy La Tiendita to GitHub Pages → Run workflow**, selecciona `yes` en `confirm_deploy` únicamente cuando esté listo para ser público. La dirección del proyecto será `https://gxbo-cell.github.io/proyecto-mio/`.

## Activar Google Maps como alternativa

Si Mapbox no está configurado o no carga, el selector puede usar Google Maps como alternativa. Requiere una clave de navegador restringida:

1. En Google Cloud, crea un proyecto, habilita facturación y activa **Maps JavaScript API** y **Places API (New)**.
2. Crea una clave de API para navegador. Restríngela a esos dos servicios y a este referente: `https://gxbo-cell.github.io/proyecto-mio/*`.
3. En GitHub, abre **Settings → Secrets and variables → Actions** y crea el secreto de repositorio `GOOGLE_MAPS_API_KEY` con esa clave.
4. Cuando quieras publicar, ejecuta **Deploy La Tiendita to GitHub Pages** desde **Actions** y confirma con `yes`. No se publica automáticamente al hacer push. Al terminar, abre la URL de Pages.

La clave de navegador estará visible para quien visite el sitio, como es normal para Maps JavaScript API; las restricciones de referente y de API son necesarias para limitar su uso. Revisa los presupuestos y cuotas del proyecto de Google Cloud, ya que Maps y Places pueden generar cargos según el uso. Si la clave falta o Google Maps no carga, el selector usa el mapa interactivo alternativo. La página abierta directamente como `file://` no puede cargar la configuración local; usa Live Server.

### Probar Google Maps en Live Server

1. En Google Cloud, agrega a las restricciones de sitios web el referente local `http://127.0.0.1:5500/*` (y `http://localhost:5500/*` si abres la tienda con ese nombre).
2. Abre `MAPS_CONFIG.LOCAL.JS` en tu equipo y pega la clave entre las comillas de `window.GOOGLE_MAPS_API_KEY`. Este archivo está excluido de Git; no lo subas ni compartas.
3. Inicia Live Server y abre la tienda con la misma dirección y puerto que agregaste como referente.
4. En el formulario de delivery, pulsa **Elegir en el mapa**. Prueba buscar una dirección y seleccionarla. Si la clave no está lista, aparecerá un aviso en lugar de un mapa distinto.

No pegues aquí la clave ni uses una clave `service_role` de Supabase. Para activar el mapa de Google hacen falta **Maps JavaScript API**, **Places API (New)**, facturación habilitada y restricciones correctas. En GitHub Pages, la clave se incorpora con el secreto de Actions; nunca la guardes en `MAPS_CONFIG.JS`.

## Activar Mapbox

El selector puede mostrar Mapbox como mapa principal y conservar los abastos y comercios de referencia consultados por separado desde Photon/OpenStreetMap. Si Mapbox no está disponible, se intenta Google Maps y luego el mapa alternativo.

1. Crea una cuenta Mapbox y genera un **token público** (`pk...`); no uses ni compartas un token secreto (`sk...`).
2. Restringe el token público a los orígenes donde se abrirá la tienda (por ejemplo, `http://127.0.0.1:5500/*`, `http://localhost:5500/*` y `https://gxbo-cell.github.io/proyecto-mio/*`) y conserva solo los permisos públicos de lectura necesarios para estilos y fuentes.
3. Para pruebas locales, pega el token en `MAPBOX_CONFIG.LOCAL.JS`, dentro de `window.MAPBOX_PUBLIC_TOKEN`. Este archivo está excluido de Git.
4. Para GitHub Pages, crea el secreto de Actions `MAPBOX_PUBLIC_TOKEN` con el mismo token público restringido. Ejecuta manualmente el workflow de despliegue y confirma `yes`.
5. Abre Delivery y pulsa **Elegir en el mapa**. Mapbox es el mapa visual; los abastos y comercios se mantienen como referencias independientes de OpenStreetMap/Photon.

Mapbox contabiliza las cargas del mapa y puede cobrar por uso según el plan y sus precios vigentes. Revisa el [pricing oficial de Mapbox](https://www.mapbox.com/pricing/) y configura límites/alertas antes de publicarlo. Un token público necesariamente se entrega al navegador; nunca expongas un token secreto.

## Activar cuentas, pedidos e inventario compartidos

La tienda usa Supabase para compartir el catálogo, las compras y las reseñas. Sin configurarlo, el sitio no confirma compras ni guarda datos localmente.

1. Crea un proyecto Supabase y abre **SQL Editor**.
2. Ejecuta el contenido completo de [`SUPABASE_SCHEMA.SQL`](./SUPABASE_SCHEMA.SQL). Esto crea las tablas, políticas RLS y funciones seguras para crear pedidos, descontar existencias y guardar una sola reseña por compra. Si ya tenías la tienda configurada, vuelve a ejecutar el archivo para añadir de forma segura los campos de marca y foto del producto.
3. En **Authentication → Providers**, habilita Email. Si la confirmación por correo está activa, configura la URL de GitHub Pages en **Authentication → URL Configuration → Redirect URLs**.
4. En GitHub, abre **Settings → Secrets and variables → Actions** y crea los secretos `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los valores **Project URL** y **anon/public key** del proyecto.

## Fotos y marcas de productos

En **Inventario**, cada producto puede tener una marca opcional y un enlace directo a su foto. El botón **Buscar imagen** abre una búsqueda de imágenes web con el nombre y la marca; elige una foto, copia su dirección de imagen y pégala en el formulario para revisar la vista previa. Se guarda el enlace, no se descarga la imagen, así que debe ser una URL pública `https://` que permita mostrarse en otras páginas. Usa imágenes propias o que tengas permiso de utilizar. Ejecuta la versión actualizada de `SUPABASE_SCHEMA.SQL` antes de guardar productos con estos campos.
5. Publica nuevamente la rama `main`. Crea una cuenta desde **Iniciar sesión → Crear cuenta nueva**. Si Supabase exige confirmar el correo, confirma la cuenta antes de iniciar sesión.
6. Con esa cuenta iniciada, identifica su UUID en **Authentication → Users** y ejecuta en SQL Editor, reemplazando el UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID-DE-LA-CUENTA-ADMIN');
   ```

   Cierra sesión e inicia sesión nuevamente para que aparezcan **Ventas** e **Inventario**. Los clientes pueden crear cuentas, comprar y consultar únicamente sus pedidos. El administrador puede gestionar productos y pedidos.
7. Agrega los productos desde **Inventario**. La base comienza sin catálogo.

### Datos de pago

El administrador configura el pago móvil, la transferencia y las instrucciones de efectivo desde **Inventario → Datos de pago**. La información de móvil/transferencia solo se ofrece al comprador cuando los campos requeridos están completos. Los datos guardados se pueden leer públicamente para mostrarlos en el checkout; no incluyas claves bancarias, contraseñas ni credenciales. Si agregas la tabla `store_payment_settings` a un proyecto existente, vuelve a ejecutar el SQL actualizado completo; el esquema es idempotente y no borra el catálogo ni los pedidos.

### Probar la aplicación localmente sin publicar

1. Instala la extensión **Live Server** para VS Code y abre `INICIO.HTML` con **Open with Live Server**.
2. En Supabase, copia **Project URL** y la clave **Publishable** (o `anon/public`), nunca `service_role`.
3. Abre `SUPABASE_CONFIG.LOCAL.JS` en VS Code y pega esos dos valores en `url` y `anonKey`. El archivo está excluido de Git, por lo que no se subirá al repositorio.
4. Recarga la página local de Live Server e inicia sesión. El navegador consulta el mismo proyecto Supabase; para habilitar redirecciones de confirmación/recuperación, agrega el origen local que indique Live Server a **Authentication → URL Configuration → Redirect URLs**.

No abras directamente el archivo con `file://` para iniciar sesión: el navegador no dispone del origen web local que requiere la autenticación.

La tienda puede mantenerse sin publicar mientras se desarrolla. Para volver a publicarla, se debe habilitar el workflow en GitHub si fue deshabilitado y ejecutarlo manualmente confirmando `yes`. El watcher de auto-push de VS Code ya no se inicia al abrir la carpeta; los cambios locales no se suben automáticamente.

La clave `anon/public` se entrega al navegador y no es una contraseña; las políticas RLS y las funciones SQL aplican los permisos. **Nunca** configures `service_role` en GitHub Pages ni en el JavaScript del navegador. Las compras antiguas que solo existían en el `localStorage` de un navegador no se importan automáticamente ni se atribuyen a cuentas: agrega de nuevo los productos al inventario compartido.
