# Cartelería MVP V2

Este proyecto es la base para un marketplace de soportes publicitarios, construido con Next.js. El objetivo es evolucionar de un prototipo con datos de prueba (mock) a un Producto Mínimo Viable (PMV) funcional.

## Arquitectura del Proyecto

La arquitectura está diseñada para ser moderna, escalable y rápida de desarrollar, ideal para un PMV.

*   **Frontend**: **Next.js** - Un framework de React que ofrece renderizado del lado del servidor (SSR) y generación de sitios estáticos (SSG), lo que mejora el SEO y el rendimiento.
*   **Backend (BaaS)**: **Supabase** - Una alternativa de código abierto a Firebase. Se utiliza para:
    *   **Base de Datos**: Una base de dados PostgreSQL para almacenar la información de los soportes y usuarios.
    *   **Autenticación**: Sistema completo para registro, inicio de sesión y gestión de usuarios.
    *   **APIs automáticas**: Genera APIs RESTful al instante sobre el esquema de la base de datos.
*   **Mapas Interactivos**: **Leaflet** - Una librería de código abierto para mapas interactivos. Se integra en Next.js a través de `react-leaflet`.

## Desarrollo de Integraciones

Para convertir el prototipo en un PMV, es necesario realizar las siguientes integraciones clave.

### 1. Integración con Supabase (Backend)

El objetivo es conectar el frontend de Next.js a una base de datos real para gestionar los soportes y los usuarios.

#### a. Configuración del Cliente de Supabase

Crea un cliente centralizado para interactuar con Supabase.

**Archivo**: `/lib/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```
*No olvides añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a tu archivo `.env.local`.*

#### b. Obtención de Datos Reales

Reemplaza los datos mock en tus componentes para que obtengan la información directamente desde Supabase.

**Ejemplo en un componente de React**:
```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function ListaDeSoportes() {
  const [soportes, setSoportes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoportes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('soportes') // Nombre de tu tabla en Supabase
        .select('*');

      if (!error) setSoportes(data);
      setLoading(false);
    };

    fetchSoportes();
  }, []);

  // ... renderizado del componente
}
```

### 2. Integración de Mapas con Leaflet

La visualización geográfica es esencial para este marketplace. Se utiliza `react-leaflet` para integrar los mapas.

#### a. Instalación

```bash
npm install leaflet react-leaflet
```

#### b. Componente de Mapa Dinámico

Dado que Leaflet manipula el DOM, es necesario importarlo de forma dinámica en Next.js para evitar problemas con el renderizado del lado del servidor (SSR).

**Página que muestra el mapa**: `/pages/index.js` (o similar)
```jsx
import dynamic from 'next/dynamic';

// Importa el componente del mapa de forma dinámica
const Mapa = dynamic(() => import('../components/Mapa'), { 
  ssr: false // Desactiva el renderizado del lado del servidor para este componente
});

export default function HomePage({ soportes }) {
  return (
    <div>
      <h1>Marketplace</h1>
      <Mapa soportes={soportes} />
    </div>
  );
}
```
El componente `Mapa.js` recibirá la lista de `soportes` y renderizará un `<Marker>` por cada uno, utilizando sus coordenadas de latitud y longitud.

## Cómo Empezar

1.  Clona el repositorio.
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Configura tus variables de entorno en un archivo `.env.local` con las claves de tu proyecto de Supabase.
4.  Ejecuta el servidor de desarrollo:
    ```bash
    npm run dev
    ```

Abre http://localhost:3000 en tu navegador para ver el resultado.
