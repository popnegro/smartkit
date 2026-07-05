#!/bin/bash

# Script para generar el directorio de producción para SmartKit.
# Modos de ejecución:
#   - static: (default) Build estándar con datos de `screens-data.js`.
#   - demo: Build para Vercel, fuerza la carga de datos por defecto.
#   - api: Build para un entorno con backend, ajusta los scripts para que consuman la API.

# --- Configuración de Seguridad y Errores ---
set -e # Salir inmediatamente si un comando falla
set -o pipefail # Salir si un comando en una tubería falla

# --- Configuración del Build ---
MODE=${1:-static}
DEST_DIR="dist"

# Archivos a minificar. `app.js` y `dashboard.js` se manejan por separado.
JS_FILES_TO_MINIFY=(
    "shared.js"
    "mediakit.js"
    "map.js"
    "config.js"
)
CSS_FILES_TO_MINIFY=(
    "styles.css"
    "dashboard.css"
    "map.css"
)
HTML_FILES=("index.html" "dashboard.html" "mediakit.html" "map.html" "screens.json")
STATIC_ASSETS=("assets" "data") # Directorios para copiar

# --- Funciones ---

limpiar() {
    echo "Limpiando y creando el directorio '$DEST_DIR' para el modo '$MODE'..."
    rm -rf "$DEST_DIR"
    mkdir -p "$DEST_DIR/assets" "$DEST_DIR/data"
}

copiar_archivos() {
    echo "Copiando archivos y directorios..."
    # Copia los archivos HTML y el readme
    for file in "${HTML_FILES[@]}" "readme.md"; do
        cp "$file" "$DEST_DIR/"
    done
    # Copia los directorios de assets
    for asset_dir in "${STATIC_ASSETS[@]}"; do
        cp -R "$asset_dir/" "$DEST_DIR/$asset_dir/"
    done
}

minificar_js() {
    echo "Minificando JavaScript con Terser..."
    echo "  Minificando app.js y dashboard.js..."
    (./node_modules/.bin/terser -c -m -- "app.js" > "$DEST_DIR/app.js" && echo "  ✅ Minificado: app.js") &
    (./node_modules/.bin/terser -c -m -- "dashboard.js" > "$DEST_DIR/dashboard.js" && echo "  ✅ Minificado: dashboard.js") &

    # Ejecuta la minificación en paralelo para acelerar el proceso
    for file in "${JS_FILES_TO_MINIFY[@]}"; do
        # El `&` al final ejecuta el comando en segundo plano
        (./node_modules/.bin/terser -c -m -- "$file" > "$DEST_DIR/$file" && echo "  ✅ Minificado: $file") &
    done
    wait # Espera a que todos los procesos en segundo plano terminen
}

minificar_css() {
    echo "Minificando CSS con postcss y cssnano..."
    # Ejecuta la minificación en paralelo
    for file in "${CSS_FILES_TO_MINIFY[@]}"; do
        (./node_modules/.bin/postcss "$file" --use cssnano -o "$DEST_DIR/$file" && echo "  ✅ Minificado: $file") &
    done
    wait # Espera a que todos los procesos en segundo plano terminen
}

versionar_assets() {
    echo "Versionando assets con ID de build para invalidar caché..."
    # Usar el hash corto del último commit como ID de versión.
    # Esto es más fiable que una fecha si se reconstruye el mismo commit.
    if command -v git &> /dev/null; then
        BUILD_ID=$(git rev-parse --short HEAD)
    else
        BUILD_ID=$(date +%s) # Fallback a timestamp si git no está disponible
    fi

    echo "  ID de Build: $BUILD_ID"
    # Use a more portable sed command that works on both Linux (Vercel) and macOS.
    find "$DEST_DIR" -name "*.html" -exec sed -i.bak -e "s/\(href=\"[^\"]*\.css\)\"/\1?v=$BUILD_ID\"/g" {} +
    find "$DEST_DIR" -name "*.html" -exec sed -i.bak -e "s/\(src=\"[^\"]*\.js\)\"/\1?v=$BUILD_ID\"/g" {} +
}

# Función para generar un manifiesto de los archivos de producción.
# Útil para verificar la integridad del despliegue.
generar_manifiesto() {
    echo "Generando production-manifest.json..."
    if command -v jq &> /dev/null; then
        echo "Usando 'jq' para generar el manifiesto."
        find "$DEST_DIR" -type f | sed "s|$DEST_DIR/||" | jq -R . | jq -s '.' > "$DEST_DIR/production-manifest.json"
    else
        echo "Advertencia: 'jq' no encontrado. Usando Node.js como alternativa para generar el manifiesto."
        find "$DEST_DIR" -type f | sed "s|$DEST_DIR/||" | node -e "const fs=require('fs');const lines=fs.readFileSync(0,'utf-8').trim().split('\n').filter(Boolean);console.log(JSON.stringify(lines,null,2));" > "$DEST_DIR/production-manifest.json"
    fi
}

verificar_dependencias() {
    echo "Verificando dependencias de build..."
    if [ ! -d "node_modules" ]; then
        echo "❌ Error: El directorio 'node_modules' no se encuentra. Ejecuta 'npm install' primero." >&2
        exit 1
    fi
    if [ ! -f "./node_modules/.bin/terser" ] || [ ! -f "./node_modules/.bin/postcss" ]; then
        echo "❌ Error: Faltan binarios de build. Asegúrate de que 'terser' y 'postcss-cli' estén en tu package.json y ejecuta 'npm install'." >&2
        exit 1
    fi
    echo "✅ Dependencias encontradas."
}

# --- Ejecución ---

START_TIME=$SECONDS

verificar_dependencias
limpiar
copiar_archivos
minificar_js
minificar_css
versionar_assets
generar_manifiesto

ELAPSED_TIME=$(($SECONDS - $START_TIME))
echo "✅ Build completado en ${ELAPSED_TIME}s. Directorio '$DEST_DIR' generado para modo '$MODE'."