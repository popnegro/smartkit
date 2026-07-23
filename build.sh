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
VERCEL_DIST_DIR="public" # Directorio de salida esperado por Vercel
# Archivos y directorios a procesar
CSS_FILES=("styles.css" "contract.css")
HTML_FILES=("index.html" "dashboard.html" "mediakit.html" "map.html" "proposal.html" "contract.html")
STATIC_ASSETS=("assets" "data") # Directorios para copiar

# --- Funciones ---

limpiar() {
    echo "Limpiando y creando el directorio '$VERCEL_DIST_DIR' para el modo '$MODE'..."
    rm -rf "$VERCEL_DIST_DIR"
    mkdir -p "$VERCEL_DIST_DIR/assets" "$VERCEL_DIST_DIR/data"
}

copiar_archivos() {
    echo "Copiando archivos y directorios..."
    # Copia los archivos HTML y el readme
    for file in "${HTML_FILES[@]}" "readme.md"; do
        cp "$file" "$DEST_DIR/"
    done # Se copiará a 'dist' y luego se moverá a 'public'
    # Copia los directorios de assets
    for asset_dir in "${STATIC_ASSETS[@]}"; do
        cp -R "$asset_dir/" "$DEST_DIR/$asset_dir/"
    done
}

minificar_js() { # Opera sobre DEST_DIR
    echo "Minificando JavaScript con Terser..."
    
    # Bundle para páginas públicas
    echo "  Creando public.js..."
    cat shared.js nav.js footer.js app.js map.js mediakit.js | ./node_modules/.bin/terser -c -m > "$DEST_DIR/public.js"
    echo "  ✅ Minificado: public.js"
    
    # Bundle para el dashboard
    echo "  Creando admin.js..."
    cat shared.js dashboard.js | ./node_modules/.bin/terser -c -m > "$DEST_DIR/admin.js"
    echo "  ✅ Minificado: admin.js"
}

minificar_css() {
    echo "Minificando CSS con postcss y cssnano..." # Opera sobre DEST_DIR
    for file in "${CSS_FILES[@]}"; do
      if [ -f "$file" ]; then
        ./node_modules/.bin/postcss "$file" --use cssnano -o "$DEST_DIR/$file"
        echo "  ✅ Minificado: $file"
      fi
    done
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
    # Versionar solo styles.css, ya que contract.css se carga dinámicamente.
    find "$DEST_DIR" -name "*.html" -exec sed -i.bak -e "s/\(href=\"styles\.css\)\"/\1?v=$BUILD_ID\"/g" {} + # Opera sobre DEST_DIR
    
    # Versionar todos los archivos JS.
    find "$DEST_DIR" -name "*.html" -exec sed -i.bak -e "s/\(src=\"[^\"]*\.js\)\"/\1?v=$BUILD_ID\"/g" {} + # Opera sobre DEST_DIR
    # Limpiar archivos .bak creados por sed
    find "$DEST_DIR" -name "*.html.bak" -delete
}

# Función para generar un manifiesto de los archivos de producción.
# Útil para verificar la integridad del despliegue.
generar_manifiesto() {
    echo "Generando production-manifest.json..."
    # Mover el contenido de DEST_DIR a VERCEL_DIST_DIR antes de generar el manifiesto final
    mv "$DEST_DIR"/* "$VERCEL_DIST_DIR"/
    if command -v jq &> /dev/null; then
        echo "Usando 'jq' para generar el manifiesto."
        find "$VERCEL_DIST_DIR" -type f | sed "s|$VERCEL_DIST_DIR/||" | jq -R . | jq -s '.' > "$VERCEL_DIST_DIR/production-manifest.json"
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

# Asegurarse de que DEST_DIR sea el directorio de salida final
DEST_DIR=$VERCEL_DIST_DIR

verificar_dependencias
limpiar
copiar_archivos
minificar_js
minificar_css
versionar_assets
generar_manifiesto
ELAPSED_TIME=$(($SECONDS - $START_TIME))
echo "✅ Build completado en ${ELAPSED_TIME}s. Directorio '$VERCEL_DIST_DIR' generado para modo '$MODE'."