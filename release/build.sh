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

cp index.html dashboard.html mediakit.html styles.css base.css dashboard.css app.js shared.js dashboard.js config.js screens-data.js production-manifest.json readme.md dist/

cp -R assets data dist/

# Si la variable de entorno CI es 'true' (común en entornos de CI/CD como GitHub Actions),
# ajusta el basePath para producción.
if [ "$CI" = "true" ]; then
  echo "Entorno de producción detectado. Ajustando basePath a '/release'..."
  # Usamos sed para reemplazar la línea en el config.js que está DENTRO de dist/
  sed -i "s|basePath: ''|basePath: '/release'|g" dist/config.js
else
  echo "Entorno de desarrollo. Usando basePath por defecto."
fi

echo "✅ Directorio 'dist' generado correctamente con todos los archivos de producción."