# La Tiendita

## Publicar en GitHub Pages

En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue. Después, el workflow publica la página al hacer push a `main`. La dirección del proyecto será `https://gxbo-cell.github.io/proyecto-mio/`.

## Activar Google Maps y sus comercios

Sin una clave configurada, el selector conserva el mapa alternativo y sus datos abiertos. Para usar el mapa, las etiquetas y las búsquedas de lugares de Google:

1. En Google Cloud, crea un proyecto, habilita facturación y activa **Maps JavaScript API** y **Places API (New)**.
2. Crea una clave de API para navegador. Restríngela a esos dos servicios y a este referente: `https://gxbo-cell.github.io/proyecto-mio/*`.
3. En GitHub, abre **Settings → Secrets and variables → Actions** y crea el secreto de repositorio `GOOGLE_MAPS_API_KEY` con esa clave.
4. Haz push a `main` o ejecuta **Deploy La Tiendita to GitHub Pages** desde la pestaña **Actions**. Al terminar, abre la URL de Pages.

La clave de navegador estará visible para quien visite el sitio, como es normal para Maps JavaScript API; las restricciones de referente y de API son necesarias para limitar su uso. Revisa los presupuestos y cuotas del proyecto de Google Cloud, ya que Maps y Places pueden generar cargos según el uso. La página abierta directamente como `file://` no puede usar la integración de Google, por lo que muestra el mapa alternativo.
