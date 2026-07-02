# SmartKit

<!-- Aquí puedes añadir badges de estado, como el de tu workflow de GitHub Actions -->
[![Deploy to GitHub Pages](https://github.com/user/repo/actions/workflows/pages.yml/badge.svg)](https://github.com/user/repo/actions/workflows/pages.yml)

Aplicacion estatica para publicar un catalogo de pantallas DOOH, gestionarlas desde un dashboard local y generar media kits.

## Arquitectura

La estructura del proyecto es la siguiente:

```
smartkit/
├── index.html                 # Brochure publico y mapa
├── dashboard.html             # Acceso Usuarios: gestor de inventario y media kits
├── mediakit.html              # Vista publica de media kit guardado
├── shared.js                  # Lógica y helpers compartidos
├── app.js                     # Logica del brochure, mapa y cotizador
├── mediakit.js                # Logica de render de mediakit.html
├── styles.css                 # Estilos del brochure y media kit
├── base.css                   # Estilos base compartidos
├── dashboard.css              # Estilos del dashboard
├── dashboard.js               # Lógica del dashboard
├── config.js                  # Marca, WhatsApp e inventario activo inicial
├── screens-data.js            # Fuente base de pantallas
├── assets/videos/             # Videos usados en heads de cards y mapa
├── data/kits/                 # Media kits publicos en JSON
├── tests/                     # Smoke tests de Playwright
├── .github/workflows/pages.yml# Deploy de dist a GitHub Pages
├── dist/                      # Copia estatica lista para publicar
├── build.sh                   # Script para generar el directorio dist/
├── production-manifest.json   # Lista de archivos publicados
└── readme.md                  # Esta guia
```

## Como correr localmente

La aplicación es estática y no requiere un proceso de compilación para funcionar. Simplemente sirve la carpeta raíz con cualquier servidor estático.

```bash
python3 -m http.server 3000
```

## Datos

Las pantallas base viven en `screens-data.js`. Cada objeto de pantalla tiene atributos como `id`, `n` (nombre), `precio`, `status` y el nuevo campo `aud` (audiencia).

### Sincronización con `localStorage`

El `dashboard.html` guarda todas las modificaciones del inventario (precios, estados, etc.) en `localStorage` bajo la clave `smartkit-dashboard-state`.

Cuando se carga el brochure (`index.html`), este prioriza los datos guardados en `localStorage`, asegurando que los cambios del dashboard se reflejen automáticamente. Si no hay datos guardados, utiliza la información de `screens-data.js` como base.

### Reseteo de Datos

Para volver al estado original, puedes ir a la pestaña **Configuración** en el dashboard y usar el botón **"Resetear Datos Locales"**. Esto eliminará todos los datos guardados en el navegador y recargará la aplicación desde `screens-data.js`.

### Persistencia Remota

Para una persistencia multiusuario o remota, es necesario integrar un backend o un CMS que gestione el inventario y los media kits.

## Media kits publicos

El flujo PMV principal es:

```txt
index.html -> seleccion de pantallas -> Generar media kit -> mediakit.html?id={id}
```

Desde el cotizador del brochure se puede generar una propuesta local con snapshot completo de pantallas, duración, inversión, impactos, condiciones y marca. La vista `mediakit.html` permite verificar la firma digital de la propuesta, guardar PDF y contactar por WhatsApp.

La firma digital se calcula sobre un payload canonico del media kit con huella SHA-256 y HMAC-SHA-256 configurable en `config.js`. Esto permite detectar cambios en el contenido antes de imprimir o guardar el PDF. Para una firma PDF legal con certificado, el sellado debe hacerse en backend o con un proveedor de firma digital que emita la firma criptografica dentro del binario PDF.

El dashboard queda como Acceso Usuarios/backoffice y permite descargar cada propuesta como JSON, duplicarla, archivarla y restaurarla. Archivar oculta el kit del historial activo sin borrar su link publico ni su informacion local.

Para que un kit sea compartible por link fuera del navegador donde se genero, publicar ese JSON en:

```txt
data/kits/{id}.json
```

Luego abrir:

```txt
mediakit.html?id={id}
```

Cada JSON debe incluir un snapshot completo de pantallas, totales, condiciones, marca y fecha de validez.

Para una presentación comercial sin backend, usar `mediakit.html?id=demo-trapiche` como media kit publicado de referencia. Para propuestas nuevas, generar el kit desde el brochure, descargar o copiar su JSON desde `localStorage` y publicarlo en `data/kits/{id}.json` antes de compartir el link con terceros.

## Produccion

La carpeta `dist/` contiene una copia estática del sitio, lista para ser desplegada. El workflow `.github/workflows/pages.yml` automatiza el despliegue de esta carpeta a GitHub Pages.

Para actualizar la carpeta `dist/` manualmente antes de hacer `push`, simplemente ejecuta el script de construcción:

```bash
./build.sh
```

`production-manifest.json` lista los archivos esperados para produccion.

## Videos

Cada pantalla puede definir un video para el head de las cards del brochure y el panel del mapa:

```js
video: './assets/videos/peatonal-sarmiento.mp4'
```

Los videos deben vivir en `assets/videos/`. Si el campo queda vacio o el archivo falla, la UI vuelve al fallback visual con las iniciales de la pantalla.

## Tests

La suite de Playwright cubre:

- render del brochure, cards con video, cotizador y mapa;
- estado default y demo de `mediakit.html`;
- generacion de media kit y links dinamicos;
- header mobile;
- dashboard de Media Kits, incluido archivar/restaurar.
