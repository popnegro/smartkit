# SmartKit

Aplicacion estatica para publicar un catalogo de pantallas DOOH, gestionarlas desde un dashboard local y generar media kits.

## Arquitectura

```txt
smartkit/
├── index.html                 # Brochure publico y mapa
├── dashboard.html             # Acceso Usuarios: gestor de inventario y media kits
├── mediakit.html              # Vista publica de media kit guardado
├── app.js                     # Logica del brochure, mapa y cotizador
├── styles.css                 # Estilos del brochure
├── config.js                  # Marca, WhatsApp e inventario activo inicial
├── screens-data.js            # Fuente base de pantallas y helpers compartidos
├── assets/videos/             # Videos usados en heads de cards y mapa
├── data/kits/                 # Media kits publicos en JSON
├── dist/                      # Copia estatica lista para publicar
├── production-manifest.json   # Lista de archivos publicados
└── readme.md                  # Esta guia
```

## Como correr

No requiere build ni dependencias de Node. Servir la carpeta con cualquier servidor estatico:

```bash
python3 -m http.server 3000
```

Luego abrir:

- `http://localhost:3000/index.html`
- `http://localhost:3000/mediakit.html` para ver la invitacion a crear una propuesta
- `http://localhost:3000/mediakit.html?id=demo-trapiche` para ver un kit demo publicado
- `http://localhost:3000/dashboard.html` para Acceso Usuarios

## Datos

Las pantallas base viven en `screens-data.js`.

El Gestor guarda cambios del navegador en `localStorage` con la clave `smartkit-dashboard-state`. Esos cambios son leidos por `index.html` y `mediakit.html` cuando se abren en el mismo navegador.

Para persistencia multiusuario hace falta agregar un backend, CMS o archivo remoto.

## Media kits publicos

El flujo PMV principal es:

```txt
index.html -> seleccion de pantallas -> Generar media kit -> mediakit.html?id={id}
```

Desde el cotizador del brochure se puede generar una propuesta local con snapshot completo de pantallas, duracion, inversion, impactos, condiciones y marca. La vista `mediakit.html` permite guardar PDF y contactar por WhatsApp.

El dashboard queda como Acceso Usuarios/backoffice y permite descargar cada propuesta como JSON. Para que un kit sea compartible por link fuera del navegador donde se genero, publicar ese JSON en:

```txt
data/kits/{id}.json
```

Luego abrir:

```txt
mediakit.html?id={id}
```

La vista publica intenta leer primero `data/kits/{id}.json` y usa `localStorage` como fallback local para propuestas generadas desde el brochure o el gestor. Cada JSON debe incluir un snapshot completo de pantallas, totales, condiciones, marca y fecha de validez.

## Produccion

La carpeta `dist/` contiene una copia estatica publicable como raiz del sitio. Para GitHub Pages, usar `dist` como artefacto de publicacion.

## Videos

Cada pantalla puede definir un video para el head de las cards del brochure y el panel del mapa:

```js
video: './assets/videos/peatonal-sarmiento.mp4'
```

Los videos deben vivir en `assets/videos/`. Si el campo queda vacio o el archivo falla, la UI vuelve al fallback visual con las iniciales de la pantalla.
