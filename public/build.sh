#!/bin/bash

# Script para generar el directorio de producción `dist`
# Este script limpia, copia archivos, y minifica JS y CSS.

set -e # Salir inmediatamente si un comando falla

echo "Limpiando y creando el directorio dist..."
rm -rf dist
mkdir -p dist/assets dist/data

echo "Copiando archivos y directorios..."

# Copia de HTML y otros archivos raíz
cp index.html dashboard.html mediakit.html readme.md dist/

# Copia de directorios
cp -R assets/ dist/assets/
cp -R data/ dist/data/

echo "Minificando JavaScript con Terser..."
npx --yes terser -c -m -- app.js > dist/app.js
npx --yes terser -c -m -- shared.js > dist/shared.js
npx --yes terser -c -m -- mediakit.js > dist/mediakit.js
npx --yes terser -c -m -- dashboard.js > dist/dashboard.js
npx --yes terser -c -m -- config.js > dist/config.js
npx --yes terser -c -m -- screens-data.js > dist/screens-data.js

echo "Minificando CSS con cssnano..."
npx --yes cssnano-cli styles.css dist/styles.css
npx --yes cssnano-cli base.css dist/base.css
npx --yes cssnano-cli dashboard.css dist/dashboard.css

echo "Generando production-manifest.json..."

# Verifica si jq está instalado. Si es así, lo usa. Si no, usa Node.js como fallback.
if command -v jq &> /dev/null; then
    echo "Usando 'jq' para generar el manifiesto."
    find dist -type f | sed 's|dist/||' | jq -R . | jq -s '.' > dist/production-manifest.json
else
    echo "Advertencia: 'jq' no encontrado. Usando Node.js como alternativa para generar el manifiesto."
    find dist -type f | sed 's|dist/||' | node -e "const fs=require('fs');const lines=fs.readFileSync(0,'utf-8').trim().split('\n').filter(Boolean);console.log(JSON.stringify(lines,null,2));" > dist/production-manifest.json
fi

echo "✅ Directorio 'dist' generado y optimizado para producción."
echo "Manifest de producción actualizado en 'dist/production-manifest.json'."