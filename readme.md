# SmartKit

Aplicacion estatica para publicar un catalogo de pantallas DOOH, gestionarlas desde un dashboard local y generar media kits.

## Arquitectura

```txt
smartkit/
├── index.html                 # Brochure publico y mapa
├── dashboard.html             # Acceso Usuarios: gestor de inventario y media kits
├── mediakit.html              # Vista publica de media kit guardado
├── shared.js                  # Helpers compartidos entre brochure y media kit
├── app.js                     # Logica del brochure, mapa y cotizador
├── mediakit.js                # Logica de render de mediakit.html
├── styles.css                 # Estilos compartidos del sitio y media kit
├── config.js                  # Marca, WhatsApp e inventario activo inicial
├── screens-data.js            # Fuente base de pantallas y helpers compartidos
├── assets/videos/             # Videos usados en heads de cards y mapa
├── data/kits/                 # Media kits publicos en JSON
├── tests/                     # Smoke tests de Playwright
├── .github/workflows/pages.yml# Deploy de dist a GitHub Pages
├── dist/                      # Copia estatica lista para publicar
├── production-manifest.json   # Lista de archivos publicados
└── readme.md                  # Esta guia
```

## Como correr localmente

La aplicacion es estatica y no requiere build para verse en navegador. Servir la carpeta con cualquier servidor estatico:

```bash
python3 -m http.server 3000
```

Luego abrir:

- `http://localhost:3000/index.html`
- `http://localhost:3000/mediakit.html` para ver la invitacion a crear una propuesta
- `http://localhost:3000/mediakit.html?id=demo-trapiche` para ver un kit demo publicado
- `http://localhost:3000/dashboard.html` para Acceso Usuarios

Para correr los tests automatizados hace falta instalar dependencias Node:

```bash
npm install
npm test
```

## Datos

Las pantallas base viven en `screens-data.js`.

El Gestor guarda cambios del navegador en `localStorage` con la clave `smartkit-dashboard-state`. Esos cambios son leidos por `index.html` cuando se abren en el mismo navegador.

Los media kits generados localmente se guardan en `localStorage` con la clave `smartkit-public-kits`. `mediakit.html` usa primero `data/kits/{id}.json` y luego cae a ese almacenamiento local como fallback.

Para persistencia multiusuario hace falta agregar un backend, CMS o archivo remoto.

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

La carpeta `dist/` contiene una copia estatica publicable como raiz del sitio. El workflow `.github/workflows/pages.yml` publica `dist` como artefacto de GitHub Pages.

Cuando se modifican archivos fuente, sincronizar `dist/` antes de pushear:

```bash
rm -rf dist && mkdir -p dist
cp index.html dashboard.html mediakit.html styles.css app.js shared.js mediakit.js config.js screens-data.js production-manifest.json readme.md dist/
cp -R assets data dist/
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
