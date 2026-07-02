#!/bin/bash

# Script para generar el directorio de producción `dist`
# Este script limpia, copia archivos, y minifica JS y CSS.

set -e # Salir inmediatamente si un comando falla

echo "Limpiando y creando el directorio dist..."
rm -rf dist
mkdir -p dist/assets dist/data

echo "Copiando archivos y directorios necesarios..."

# Copia de HTML y otros archivos raíz
cp index.html dashboard.html mediakit.html production-manifest.json readme.md dist/

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

echo "✅ Directorio 'dist' generado y optimizado para producción."