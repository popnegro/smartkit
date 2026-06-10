# SmartKit

Aplicacion estatica para publicar un catalogo de pantallas DOOH, gestionarlas desde un dashboard local y generar media kits.

## Arquitectura

```txt
smartkit/
├── index.html                 # Brochure publico y mapa
├── dashboard.html             # Gestor de inventario y media kits
├── mediakit.html              # Vista publica de media kit guardado
├── app.js                     # Logica del brochure, mapa y cotizador
├── styles.css                 # Estilos del brochure
├── config.js                  # Marca, WhatsApp e inventario activo inicial
├── screens-data.js            # Fuente base de pantallas y helpers compartidos
├── assets/videos/             # Videos usados en heads de cards y mapa
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
- `http://localhost:3000/dashboard.html`
- `http://localhost:3000/mediakit.html`

## Datos

Las pantallas base viven en `screens-data.js`.

El Gestor guarda cambios del navegador en `localStorage` con la clave `smartkit-dashboard-state`. Esos cambios son leidos por `index.html` y `mediakit.html` cuando se abren en el mismo navegador.

Para persistencia multiusuario hace falta agregar un backend, CMS o archivo remoto.

## Videos

Cada pantalla puede definir un video para el head de las cards del brochure y el panel del mapa:

```js
video: './assets/videos/peatonal-sarmiento.mp4'
```

Los videos deben vivir en `assets/videos/`. Si el campo queda vacio o el archivo falla, la UI vuelve al fallback visual con las iniciales de la pantalla.
