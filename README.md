# La Tiendita

## Publicar en GitHub Pages

En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue. El sitio no se publica con cada cambio: desde **Actions → Deploy La Tiendita to GitHub Pages → Run workflow**, selecciona `yes` en `confirm_deploy` únicamente cuando esté listo para ser público. La dirección del proyecto será `https://gxbo-cell.github.io/proyecto-mio/`.

## Activar Google Maps y sus comercios

Sin una clave configurada, el selector conserva el mapa alternativo y sus datos abiertos. Para usar el mapa, las etiquetas y las búsquedas de lugares de Google:

1. En Google Cloud, crea un proyecto, habilita facturación y activa **Maps JavaScript API** y **Places API (New)**.
2. Crea una clave de API para navegador. Restríngela a esos dos servicios y a este referente: `https://gxbo-cell.github.io/proyecto-mio/*`.
3. En GitHub, abre **Settings → Secrets and variables → Actions** y crea el secreto de repositorio `GOOGLE_MAPS_API_KEY` con esa clave.
4. Haz push a `main` o ejecuta **Deploy La Tiendita to GitHub Pages** desde la pestaña **Actions**. Al terminar, abre la URL de Pages.

La clave de navegador estará visible para quien visite el sitio, como es normal para Maps JavaScript API; las restricciones de referente y de API son necesarias para limitar su uso. Revisa los presupuestos y cuotas del proyecto de Google Cloud, ya que Maps y Places pueden generar cargos según el uso. La página abierta directamente como `file://` no puede usar la integración de Google, por lo que muestra el mapa alternativo.

## Activar cuentas, pedidos e inventario compartidos

La tienda usa Supabase para compartir el catálogo, las compras y las reseñas. Sin configurarlo, el sitio no confirma compras ni guarda datos localmente.

1. Crea un proyecto Supabase y abre **SQL Editor**.
2. Ejecuta el contenido completo de [`SUPABASE_SCHEMA.SQL`](./SUPABASE_SCHEMA.SQL). Esto crea las tablas, políticas RLS y funciones seguras para crear pedidos, descontar existencias y guardar una sola reseña por compra.
3. En **Authentication → Providers**, habilita Email. Si la confirmación por correo está activa, configura la URL de GitHub Pages en **Authentication → URL Configuration → Redirect URLs**.
4. En GitHub, abre **Settings → Secrets and variables → Actions** y crea los secretos `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los valores **Project URL** y **anon/public key** del proyecto.
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

La tienda puede mantenerse sin publicar mientras se desarrolla. Para volver a publicarla, se debe habilitar el workflow en GitHub si fue deshabilitado y ejecutarlo manualmente confirmando `yes`. El watcher de auto-push de VS Code ya no se inicia al abrir la carpeta; los cambios locales no se suben automáticamente.

La clave `anon/public` se entrega al navegador y no es una contraseña; las políticas RLS y las funciones SQL aplican los permisos. **Nunca** configures `service_role` en GitHub Pages ni en el JavaScript del navegador. Las compras antiguas que solo existían en el `localStorage` de un navegador no se importan automáticamente ni se atribuyen a cuentas: agrega de nuevo los productos al inventario compartido.
