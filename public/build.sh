#!/bin/bash

# Script para generar el directorio de producción.

set -e # Salir inmediatamente si un comando falla

# --- Configuración ---
MODE=${1:-static} # 'static' es el modo por defecto si no se pasa argumento
DEST_DIR="dist"

if [ "$MODE" == "api" ]; then
    DEST_DIR="dist-api"
fi

JS_FILES_TO_MINIFY=("shared.js" "mediakit.js" "config.js" "screens-data.js")
CSS_FILES_TO_MINIFY=("styles.css" "base.css" "dashboard.css")

# --- Funciones ---

limpiar() {
    echo "Limpiando y creando el directorio '$DEST_DIR' para el modo '$MODE'..."
    rm -rf "$DEST_DIR"
    mkdir -p "$DEST_DIR/assets" "$DEST_DIR/data"
}

copiar_archivos() {
    echo "Copiando archivos y directorios..."
    cp index.html dashboard.html mediakit.html readme.md "$DEST_DIR/"
    cp -R assets/ "$DEST_DIR/assets/"
    cp -R data/ "$DEST_DIR/data/"
}

minificar_js() {
    echo "Minificando JavaScript con Terser..."
    if [ "$MODE" == "demo" ]; then
        echo "  Modificando app.js y dashboard.js para modo DEMO..."
        sed "s/if (savedState && savedState.rows?.length && !loadDefault)/if (false)/g" app.js | npx --yes terser -c -m > "$DEST_DIR/app.js"
        sed "s/if (savedState && !loadDefault)/if (false)/g" dashboard.js | npx --yes terser -c -m > "$DEST_DIR/dashboard.js"
    elif [ "$MODE" == "api" ]; then
        echo "  Modificando app.js y dashboard.js para modo API..."
        sed "s/const MODE = 'static';/const MODE = 'api';/" app.js | npx --yes terser -c -m > "$DEST_DIR/app.js"
        sed "s/const MODE = 'static';/const MODE = 'api';/" dashboard.js | npx --yes terser -c -m > "$DEST_DIR/dashboard.js"
    else
        echo "  Minificando app.js y dashboard.js..."
        npx --yes terser -c -m -- "app.js" > "$DEST_DIR/app.js"
        npx --yes terser -c -m -- "dashboard.js" > "$DEST_DIR/dashboard.js"
    fi

    for file in "${JS_FILES_TO_MINIFY[@]}"; do
        echo "  Minificando $file..."
        npx --yes terser -c -m -- "$file" > "$DEST_DIR/$file"
    done
}

minificar_css() {
    echo "Minificando CSS con cssnano..."
    for file in "${CSS_FILES_TO_MINIFY[@]}"; do
        echo "  Minificando $file..."
        npx --yes cssnano-cli "$file" "$DEST_DIR/$file"
    done
}

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

post_build() {
    echo "Realizando ajustes post-build..."
    echo "  Asegurando que index.html carga el script de datos correcto..."
    # Reemplaza la etiqueta de script original por la minificada.
    # Funciona incluso si el archivo ya fue modificado.
    sed -i 's|src="./screens-data.js"|src="screens-data.js"|' "$DEST_DIR/index.html"
}

# --- Ejecución ---

# Verifica si npx está disponible
if ! command -v npx &> /dev/null; then
    echo "Error: 'npx' no se encuentra. Por favor, instala Node.js y npm." >&2
    exit 1
fi

limpiar
copiar_archivos
minificar_js
minificar_css
generar_manifiesto
post_build

echo "✅ Directorio '$DEST_DIR' generado y optimizado para producción en modo '$MODE'."
echo "Manifest de producción actualizado en '$DEST_DIR/production-manifest.json'."