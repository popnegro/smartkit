# 📡 LedMap Mendoza — MediaKit SaaS

Red geolocalizada de pantallas LED para Gran Mendoza con cotizador de campañas, integración Mercado Pago y panel de administración con generador de Media Kits.

---

## Índice

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura de archivos](#estructura-de-archivos)
4. [Vistas y funcionalidades](#vistas-y-funcionalidades)
5. [Stack tecnológico](#stack-tecnológico)
6. [Datos — `screens-data.js`](#datos--screens-datajs)
7. [Integración Mercado Pago](#integración-mercado-pago)
8. [Cómo correr el proyecto](#cómo-correr-el-proyecto)
9. [Deploy](#deploy)
10. [Agregar o editar pantallas](#agregar-o-editar-pantallas)
11. [Roadmap — Camino C](#roadmap--camino-c)

---

## Descripción general

**LedMap Mendoza** es una plataforma de dos capas para la comercialización de espacios publicitarios en pantallas LED out-of-home (DOOH):

| Capa | Archivo | Audiencia | Función |
|------|---------|-----------|---------|
| Pública | `index.html` | Anunciante / cliente final | Explorar pantallas en mapa, armar campaña, pagar con Mercado Pago |
| Admin | `dashboard.html` | Operador de la red | Gestionar inventario, ver métricas, generar Media Kits imprimibles |

Ambas capas comparten la misma fuente de datos (`screens-data.js`) para garantizar consistencia sin duplicación.

---

## Arquitectura

El proyecto sigue la **arquitectura Camino B**: dos páginas HTML independientes conectadas por un archivo de datos compartido. Es la base para escalar a un monorepo Turborepo (Camino C) cuando se necesite autenticación, CRUD real y multi-tenancy.

```
Camino B (actual)                  Camino C (siguiente iteración)
─────────────────                  ──────────────────────────────
index.html                         apps/
dashboard.html          →            public/     ← Next.js (LedMap)
screens-data.js                      admin/      ← Next.js (Dashboard)
                                   packages/
                                     data/       ← SCREENS, tipos, helpers
                                     ui/         ← componentes compartidos
                                   apps/api/     ← Express / Next API routes
```

### Flujo de datos

```
screens-data.js
      │
      ├──▶ index.html
      │       ├─ Mapa interactivo (Leaflet + CartoDB)
      │       ├─ Panel de ficha por pantalla
      │       ├─ Cotizador de campaña (carrito)
      │       └─ Checkout Mercado Pago
      │
      └──▶ dashboard.html
              ├─ Stats calculadas dinámicamente
              ├─ Mapa admin (mismas coords, markers esmeralda)
              ├─ Inventario con búsqueda y filtros
              ├─ Métricas con gráficas CSS
              └─ Generador de Media Kits (imprimible / PDF)
```

---

## Estructura de archivos

```
/
├── index.html            # App pública — LedMap
├── dashboard.html        # App admin — MendozaDOOH Dashboard
├── screens-data.js       # Fuente de verdad compartida
└── README.md             # Este archivo
```

### Wiring requerido en `index.html`

Agregar antes del `<script>` principal:

```html
<script src="./screens-data.js"></script>
```

Y eliminar del inline script de `index.html` las constantes que ahora viven en `screens-data.js`:

```javascript
// Eliminar de index.html:
const SCREENS   = [...];
const DURATIONS = [...];
const TIPO_COL  = {...};
function impNum(s) { ... }
```

Lo mismo aplica para `dashboard.html` una vez que se externaliza el bloque de datos inline que tiene en su `<script>`.

---

## Vistas y funcionalidades

### `index.html` — LedMap (cara pública)

#### Modo Interactivo 🗺️
- Mapa oscuro (CartoDB Dark Matter) con **20 marcadores color-coded**:
  - 🟦 Peatonal — cyan `#22D3EE`
  - 🟡 Vehicular — ámbar `#F59E0B`
  - 🟣 Mixto — violeta `#818CF8`
- Marcadores con **pulso LED animado** en pantallas de alto impacto (≥50k imp/día)
- Marcadores con indicador verde ✓ cuando están en el carrito de campaña
- Leyenda flotante en esquina inferior izquierda

#### Panel de ficha (sidebar / bottom sheet)
- **Carousel de imágenes y videos** por pantalla con navegación por flechas y dots
  - Soporta `type: 'image'` y `type: 'video'` (muted, loop, autoplay al entrar)
  - Fallback automático a emoji + gradiente si no hay media definido
  - Badge `▶ Video` en slides de video
- Atributos: dimensiones, resolución, impactos/día, tipo de tráfico
- **Estimador de alcance dinámico**: cambia duración → recalcula impresiones totales y precio en tiempo real
- Botón **Agregar a campaña** (toggle, refleja estado en el marcador del mapa)
- Pago directo por pantalla individual con Mercado Pago
- Botón WhatsApp directo con mensaje prellenado

#### Cotizador de campaña (carrito)
- FAB flotante que aparece al agregar la primera pantalla
- Muestra conteo de pantallas y total en tiempo real
- **Modal de campaña**:
  - Lista de pantallas seleccionadas con precio individual
  - Selector de duración global (aplica a todas): 1 semana / 2 semanas / 1 mes / 3 meses
  - Multiplicadores de precio: ×1 / ×1.8 / ×3.2 / ×8
  - Resumen: impresiones totales estimadas + inversión total
  - Pago único con Mercado Pago para toda la campaña
  - Botón WhatsApp con detalle de campaña prellenado

#### Pantalla de éxito post-pago
- Número de orden generado (`#LED-XXXXX`)
- 3 pasos claros: envío de creatividad, fecha de inicio (+3 días hábiles), reportes semanales
- Cierra y limpia el carrito

#### Modo Brochure 📄
- Hero con 4 stats de la red (pantallas activas, reach semanal, departamentos, operación 24/7)
- Filtros por zona (Microcentro, Las Heras, Godoy Cruz, Guaymallén, Maipú, Luján de Cuyo)
- Grilla de cards con: gradiente + emoji, tipo de tráfico, resolución, dimensiones, impactos/día, precio/semana
- Botón **"Ver en mapa"** → switch a modo interactivo + fly to pin + abre panel
- Botón **"+ Campaña"** → agrega directamente al carrito

---

### `dashboard.html` — Admin Dashboard

#### Dashboard principal
- 4 KPIs calculados desde datos reales:
  - Pantallas activas: 20
  - Reach total/día: suma de todos los `imp` del array
  - CPM promedio: `(precio / (imp × 7)) × 1000`, promediado
  - Ingreso potencial semanal: suma de todos los `precio`
- Mapa CartoDB Dark con markers color-coded (misma lógica que LedMap)
- Top 5 pantallas por impacto diario con barras CSS proporcionales

#### Inventario LED
- Tabla de las 20 pantallas con búsqueda en tiempo real
- Filtros combinables: tipo de tráfico + zona
- Columnas: ID, nombre, barrio, dimensiones, resolución, imp/día, tipo (badge), precio/semana

#### Métricas
- Reach diario por zona (barras CSS proporcionales)
- Distribución por tipo de tráfico (barras con colores del sistema)
- Potencial de ingresos por zona (barras con gradiente esmeralda)
- Todo calculado dinámicamente desde el array `SCREENS`

#### Media Kits
- Lista de kits recientes (datos de ejemplo)
- **Generador de Media Kits** (modal de dos paneles):
  - Panel izquierdo: cliente, duración, selector de pantallas con filtro por zona y precios actualizados
  - Panel derecho: preview en vivo con total de pantallas, impresiones y inversión
  - **Documento generado** con:
    - Header con logo + código de kit (`MK-XXXXX`) + fecha
    - 4 métricas de resumen
    - Tabla detallada de pantallas seleccionadas
    - Condiciones de campaña (formatos, plazos, contacto)
    - Footer institucional
  - Botón **Imprimir / PDF** → `window.print()` con estilos CSS de impresión
  - Botón **Copiar enlace** → copia URL simulada al portapapeles

---

## Stack tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| Mapa | [Leaflet.js 1.9.4](https://leafletjs.com) + CartoDB Dark Matter tiles | Mapa interactivo en ambas apps |
| Estilos públicos | CSS custom (sin framework) | `index.html` — control total, dark navy + cyan |
| Estilos admin | [Tailwind CSS CDN](https://tailwindcss.com) | `dashboard.html` — utilidades rápidas, dark zinc + emerald |
| Datos | Vanilla JS (array de objetos) | `screens-data.js` — sin backend ni BD |
| Pagos | [Mercado Pago JS SDK v2](https://www.mercadopago.com.ar/developers) | Checkout Pro (con preferencia desde backend) |
| Media | `<video>` + `<img>` nativo | Carousel en ficha de pantalla |
| Fuentes de media | [picsum.photos](https://picsum.photos) (placeholder) + Google Storage (sample video) | Demo — reemplazar con CDN propio |

### Sin dependencias de build
El proyecto corre como archivos estáticos. No requiere Node.js, bundler ni proceso de compilación para la versión actual.

---

## Datos — `screens-data.js`

### Estructura de una pantalla

```javascript
{
  id:     1,                              // Único, entero
  lat:   -32.8931,                        // Latitud WGS84
  lng:   -68.8449,                        // Longitud WGS84
  n:     'Peatonal Sarmiento',            // Nombre corto
  b:     'Microcentro',                   // Barrio / zona (usado en filtros)
  dir:   'Peatonal Sarmiento 150',        // Dirección completa
  dim:   '8×4 m',                         // Dimensiones de la pantalla
  res:   'Full HD',                       // Resolución: 'HD Ready' | 'Full HD' | '4K UHD'
  imp:   '52.000',                        // Impactos estimados por día (string con punto como separador de miles)
  precio: 95000,                          // Precio base en ARS por semana
  tipo:  'Peatonal',                      // 'Peatonal' | 'Vehicular' | 'Mixto'
  e:     '🚶',                            // Emoji representativo (usado como fallback en carousel y marcadores)
  g:     'linear-gradient(...)',          // Gradiente CSS del hero cuando no hay media

  // Opcional — si se omite, el carousel genera 2 imágenes placeholder desde picsum.photos
  media: [
    { type: 'video', src: 'https://...mp4', poster: 'https://...jpg' },
    { type: 'image', src: 'https://...jpg' },
    { type: 'image', src: 'https://...jpg' }
  ]
}
```

### Constantes exportadas

```javascript
SCREENS       // Array de 20 objetos pantalla
DURATIONS     // [{v, l, mult}] — multiplicadores de precio por duración
TIPO_COL      // {Peatonal, Vehicular, Mixto} → colores hex
METRICS       // Objeto con métricas precalculadas: totalReach, totalRevWeek, avgCPM, byZone, byTipo
impNum(s)     // Helper: parsea s.imp '52.000' → 52000
```

---

## Integración Mercado Pago

### Estado actual
El checkout está simulado con un `setTimeout` de 2 segundos. Toda la lógica está en `handleCampaignPay()` y `handleDirectPay()` en `index.html`.

### Pasos para activar el checkout real

**1. Backend — crear preferencia de pago**

```javascript
// Express / Next.js API route — POST /api/pagos/crear-preferencia
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.post('/api/pagos/crear-preferencia', async (req, res) => {
  const { items, payer_email } = req.body;

  const preference = await new Preference(client).create({
    body: {
      items,                                      // [{ title, unit_price, quantity }]
      payer: { email: payer_email },
      back_urls: {
        success: 'https://tudominio.com/gracias',
        failure: 'https://tudominio.com/error',
      },
      auto_return: 'approved',
      notification_url: 'https://tudominio.com/api/webhooks/mp'
    }
  });

  res.json({ init_point: preference.init_point, id: preference.id });
});
```

**2. Frontend — reemplazar la simulación**

En `index.html`, dentro de `handleCampaignPay()` y `handleDirectPay()`, descomentar y adaptar:

```javascript
// Reemplazar el await new Promise(r => setTimeout(r, 2000)) por:
const res = await fetch(PREF_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: items.map(({ screen: s, durMult }) => ({
      title:      `Pantalla LED — ${s.n}`,
      unit_price: Math.round(s.precio * durMult),
      quantity:   1
    })),
    payer_email: document.getElementById('f-email')?.value
  })
});

const { init_point } = await res.json();
window.location.href = init_point;  // Redirige al checkout de MP
```

**3. Variables de entorno requeridas**

```env
MP_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxx   # Token de producción o TEST-...
MP_PUBLIC_KEY=APP_USR-xxxx-xxxx-xxxx-xxxx      # Clave pública para el SDK frontend
```

**4. Webhook para confirmar pagos**

```javascript
app.post('/api/webhooks/mp', async (req, res) => {
  const { type, data } = req.body;
  if (type === 'payment') {
    const payment = await new Payment(client).get({ id: data.id });
    if (payment.status === 'approved') {
      // Registrar reserva en base de datos
      // Enviar email de confirmación
    }
  }
  res.sendStatus(200);
});
```

---

## Cómo correr el proyecto

El proyecto es HTML estático. **No requiere Node.js** para correrlo, pero sí un servidor HTTP local para que el import de `screens-data.js` funcione correctamente (los navegadores bloquean `file://` para scripts externos).

### Opción A — servidor local con Node.js

```bash
# Con npx (sin instalar nada)
npx serve .

# O con Python
python3 -m http.server 3000
```

Luego abrir:
- `http://localhost:3000/index.html` → LedMap público
- `http://localhost:3000/dashboard.html` → Admin Dashboard

### Opción B — Live Server (VS Code)

Instalar la extensión **Live Server** → click derecho en `index.html` → *Open with Live Server*.

### Opción C — sin servidor (transitorio)

Durante desarrollo, cada archivo tiene los datos inline en su propio `<script>`. Esto permite abrir los archivos directamente en el navegador (`file://`) mientras se itera. **No usar en producción.**

---

## Deploy

### Netlify / Vercel (recomendado)

```bash
# Netlify CLI
netlify deploy --dir . --prod

# Vercel CLI
vercel --prod
```

Ambas plataformas sirven carpetas estáticas sin configuración adicional. Subir los tres archivos:

```
index.html
dashboard.html
screens-data.js
```

### Configuración de rutas (opcional)

Si se quieren URLs limpias (`/dashboard` en lugar de `/dashboard.html`), agregar en la raíz:

```toml
# netlify.toml
[[redirects]]
  from = "/dashboard"
  to   = "/dashboard.html"
  status = 200

[[redirects]]
  from = "/mapa"
  to   = "/index.html"
  status = 200
```

### Variables de entorno en producción

Para Mercado Pago, las variables sensibles van en el backend (no en los archivos HTML). El frontend solo necesita la `MP_PUBLIC_KEY`, que puede exponerse con cuidado ya que es pública por diseño.

---

## Agregar o editar pantallas

Toda modificación de inventario se hace **únicamente en `screens-data.js`**, en el array `SCREENS`. Ambas apps reflejarán el cambio automáticamente.

### Agregar una pantalla

```javascript
// screens-data.js → array SCREENS
{
  id:     21,
  lat:    -32.8750,
  lng:    -68.8600,
  n:     'Nueva Ubicación',
  b:     'Microcentro',               // Debe coincidir con zonas existentes o crea una nueva
  dir:   'Av. Ejemplo 1234',
  dim:   '6×3 m',
  res:   'Full HD',                   // 'HD Ready' | 'Full HD' | '4K UHD'
  imp:   '28.000',                    // String con punto como separador de miles
  precio: 68000,                      // ARS por semana
  tipo:  'Vehicular',                 // 'Peatonal' | 'Vehicular' | 'Mixto'
  e:     '🏪',
  g:     'linear-gradient(135deg, #0A1020, #1A2440)',

  // Opcional — sin esto se generan imágenes placeholder automáticamente
  media: [
    { type: 'image', src: 'https://tu-cdn.com/pantalla21-foto1.jpg' },
    { type: 'video', src: 'https://tu-cdn.com/pantalla21-clip.mp4', poster: 'https://tu-cdn.com/pantalla21-thumb.jpg' }
  ]
}
```

### Obtener coordenadas

Usar [latlong.net](https://www.latlong.net) o Google Maps (click derecho → "¿Qué hay aquí?") para obtener lat/lng de la ubicación exacta.

### Recomendaciones para media en producción

| Formato | Especificaciones recomendadas |
|---------|-------------------------------|
| Imagen  | JPG/WebP, 800×400px mínimo, < 200KB |
| Video   | MP4 H.264, 16:9, 15–30 seg, < 5MB, con audio off |
| Hosting | Cloudflare R2, AWS S3 (con CORS abierto), Supabase Storage |

---

## Roadmap — Camino C

Cuando el proyecto necesite escalar (múltiples operadores, auth, CRUD de pantallas, reportes reales), la migración natural es a **Turborepo + Next.js**:

```
apps/
  public/         ← Next.js — LedMap público (actual index.html como punto de partida)
  admin/          ← Next.js — Dashboard (actual dashboard.html)
  api/            ← Express o Next API routes

packages/
  data/           ← SCREENS, tipos TypeScript, helpers (actual screens-data.js)
  ui/             ← Map component, Panel, CarouselCard (compartidos)
  config/         ← tsconfig, eslint, tailwind base
```

### Features pendientes para el SaaS completo

- [ ] Autenticación de operadores (NextAuth / Clerk)
- [ ] CRUD de pantallas desde el dashboard (sin editar código)
- [ ] Upload de media a Cloudflare R2 desde el panel admin
- [ ] Webhook de Mercado Pago → registro de reservas en base de datos (Neon/PostgreSQL + Prisma)
- [ ] Email de confirmación de reserva (Resend)
- [ ] Dashboard de métricas reales (por campaña, por pantalla)
- [ ] Generación de PDF server-side del Media Kit (Puppeteer o React-PDF)
- [ ] Multi-tenancy: un operador = una instancia de la red con sus propias pantallas y branding
- [ ] Mapa embebible como widget `<iframe>` para sitios de terceros

---

## Licencia

Proyecto privado. Todos los derechos reservados.

---

*Desarrollado para el mercado de publicidad DOOH en Gran Mendoza, Argentina.*
