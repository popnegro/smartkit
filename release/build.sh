#!/bin/bash

# Script para generar el directorio de producción `dist`
# ----------------------------------------------------
# Este script limpia el directorio `dist` anterior, lo recrea y copia
# todos los archivos necesarios para el despliegue estático.

set -e # Salir inmediatamente si un comando falla

echo "Limpiando y creando el directorio dist..."
rm -rf dist
mkdir -p dist

echo "Copiando archivos y directorios necesarios..."

cp index.html dashboard.html mediakit.html styles.css base.css dashboard.css app.js shared.js mediakit.js dashboard.js config.js screens-data.js production-manifest.json readme.md dist/

cp -R assets data dist/

echo "Procesando el inventario para generar screens.js solo con pantallas activas..."
node -e "
const fs = require('fs');
const screensData = fs.readFileSync('screens-data.js', 'utf-8');
const activeScreens = eval(screensData.replace('const SCREENS=', '')).filter(s => s.active);
fs.writeFileSync('dist/screens.js', 'const SCREENS = ' + JSON.stringify(activeScreens, null, 2) + ';');
"

echo "✅ Directorio 'dist' generado correctamente con todos los archivos de producción."