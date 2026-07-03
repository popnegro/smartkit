#!/bin/bash

# Script para generar el directorio de producción.
# Acepta un argumento para el modo: 'static' (default), 'demo', o 'api'.

# Verifica si npx está disponible
if ! command -v npx &> /dev/null; then
    echo "Error: 'npx' no se encuentra. Por favor, instala Node.js y npm." >&2
    exit 1
fi

set -e # Salir inmediatamente si un comando falla

MODE=${1:-static} # 'static' es el modo por defecto si no se pasa argumento
DEST_DIR="dist"

if [ "$MODE" == "api" ]; then
    DEST_DIR="dist-api"
# Si el modo es 'demo' o 'static', el directorio de destino será 'dist'.
fi

echo "Limpiando y creando el directorio '$DEST_DIR' para el modo '$MODE'..."
rm -rf $DEST_DIR
mkdir -p $DEST_DIR/assets $DEST_DIR/data

echo "Copiando archivos y directorios..."

# Copia de HTML y otros archivos raíz
cp index.html dashboard.html mediakit.html readme.md $DEST_DIR/

# Copia de directorios
cp -R assets/ $DEST_DIR/assets/
cp -R data/ $DEST_DIR/data/

echo "Minificando JavaScript con Terser..."
JS_FILES=("app.js" "shared.js" "mediakit.js" "dashboard.js" "config.js" "screens-data.js")

if [ "$MODE" == "demo" ]; then
    echo "  Modificando app.js y dashboard.js para modo DEMO..."
    sed "s/if (savedState && savedState.rows?.length && !loadDefault)/if (false)/g" app.js | npx --yes terser -c -m > "$DEST_DIR/app.js"
    sed "s/if (savedState && !loadDefault)/if (false)/g" dashboard.js | npx --yes terser -c -m > "$DEST_DIR/dashboard.js"
    # Excluir los archivos ya procesados
    JS_FILES=("shared.js" "mediakit.js" "config.js" "screens-data.js")
elif [ "$MODE" == "api" ]; then
    echo "  Modificando app.js y dashboard.js para modo API..."
    sed "s/const MODE = 'static';/const MODE = 'api';/" app.js | npx --yes terser -c -m > "$DEST_DIR/app.js"
    sed "s/const MODE = 'static';/const MODE = 'api';/" dashboard.js | npx --yes terser -c -m > "$DEST_DIR/dashboard.js"
    # Excluir los archivos ya procesados
    JS_FILES=("shared.js" "mediakit.js" "config.js" "screens-data.js")
fi

for file in "${JS_FILES[@]}"; do
    echo "  Minificando $file..."
    # Solo minificar si el archivo existe en el array (para evitar doble procesamiento)
    if [[ " ${JS_FILES[*]} " =~ " ${file} " ]]; then
        npx --yes terser -c -m -- "$file" > "$DEST_DIR/$file"
    fi
done

echo "Minificando CSS con cssnano..."
CSS_FILES=("styles.css" "base.css" "dashboard.css")
for file in "${CSS_FILES[@]}"; do
    echo "  Minificando $file..."
    npx --yes cssnano-cli "$file" "$DEST_DIR/$file"
done

echo "Generando production-manifest.json..."

# Verifica si jq está instalado. Si es así, lo usa. Si no, usa Node.js como fallback.
if command -v jq &> /dev/null; then
    echo "Usando 'jq' para generar el manifiesto."
    find $DEST_DIR -type f | sed "s|$DEST_DIR/||" | jq -R . | jq -s '.' > "$DEST_DIR/production-manifest.json"
else
    echo "Advertencia: 'jq' no encontrado. Usando Node.js como alternativa para generar el manifiesto."
    find $DEST_DIR -type f | sed "s|$DEST_DIR/||" | node -e "const fs=require('fs');const lines=fs.readFileSync(0,'utf-8').trim().split('\n').filter(Boolean);console.log(JSON.stringify(lines,null,2));" > "$DEST_DIR/production-manifest.json"
fi

echo "✅ Directorio '$DEST_DIR' generado y optimizado para producción en modo '$MODE'."
echo "Manifest de producción actualizado en '$DEST_DIR/production-manifest.json'."