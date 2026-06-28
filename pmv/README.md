# SmartKit API Server

Este es un servidor de API REST simple construido con Express.js para gestionar el inventario de la plataforma SmartKit. Proporciona endpoints para realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre una base de datos en memoria.

## Características

- **Express.js**: Framework web rápido y minimalista para Node.js.
- **CORS habilitado**: Permite peticiones desde cualquier origen, facilitando el desarrollo del frontend.
- **Validación de Datos**: Utiliza `express-validator` para asegurar la integridad de los datos en las peticiones `POST` y `PUT`.
- **Base de Datos en Memoria**: Simula una base de datos para un prototipado y desarrollo rápidos.

## Requisitos

- Node.js (versión 14.x o superior)
- npm (generalmente se instala con Node.js)

## Configuración y Ejecución

1.  **Clonar el repositorio (si aplica)**:
    ```bash
    git clone <url-del-repositorio>
    cd <directorio-del-proyecto>
    ```

2.  **Instalar dependencias**:
    Ejecuta el siguiente comando en la raíz del proyecto para instalar Express, CORS y otras dependencias.
    ```bash
    npm install
    ```

3.  **Crear archivo de entorno (opcional)**:
    El servidor utiliza la librería `dotenv`. Puedes crear un archivo `.env` en la raíz del proyecto para configurar el puerto.
    ```
    PORT=3000
    ```

4.  **Iniciar el servidor**:
    ```bash
    npm start
    ```
    O, si no tienes un script `start` en tu `package.json`:
    ```bash
    node server.js
    ```

El servidor estará corriendo en `http://localhost:3000`.

---

## Documentación de la API

### `GET /inventory`

Recupera la lista completa de todas las pantallas en el inventario.

-   **Método**: `GET`
-   **Respuesta Exitosa (200 OK)**:
    ```json
    [
      { "id": 1, "name": "Lujan Central", "location": "Mendoza, AR", "price": 45000, "status": "Active" },
      { "id": 2, "name": "Palmares Mall", "location": "Godoy Cruz", "price": 62000, "status": "Active" }
    ]
    ```

### `POST /inventory`

Agrega una nueva pantalla al inventario.

-   **Método**: `POST`
-   **Cuerpo de la Petición (Body)**:
    ```json
    {
      "name": "Nueva Pantalla",
      "location": "Ciudad, País",
      "price": 50000
    }
    ```
-   **Respuesta Exitosa (201 Created)**: Devuelve el objeto de la pantalla recién creada.
-   **Respuesta de Error (400 Bad Request)**: Si los datos de validación fallan (ej. `name` o `price` faltantes).

### `PUT /inventory/:id`

Actualiza el nombre y el precio de una pantalla existente.

-   **Método**: `PUT`
-   **Parámetro de URL**: `id` (el ID numérico de la pantalla a actualizar).
-   **Cuerpo de la Petición (Body)**:
    ```json
    {
      "name": "Nombre Actualizado",
      "price": 55000
    }
    ```
-   **Respuesta Exitosa (200 OK)**: Devuelve el objeto de la pantalla actualizada.
-   **Respuesta de Error (404 Not Found)**: Si no se encuentra una pantalla con el `id` proporcionado.
-   **Respuesta de Error (400 Bad Request)**: Si los datos de validación fallan.

### `DELETE /inventory/:id`

Elimina una pantalla del inventario.

-   **Método**: `DELETE`
-   **Parámetro de URL**: `id` (el ID numérico de la pantalla a eliminar).
-   **Respuesta Exitosa (204 No Content)**: La operación fue exitosa y no se devuelve contenido.
-   **Respuesta de Error (404 Not Found)**: Si no se encuentra una pantalla con el `id` proporcionado.

---