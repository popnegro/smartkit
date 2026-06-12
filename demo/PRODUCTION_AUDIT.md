# SmartKit: auditoria y plan de produccion

## Auditoria

Seguridad:
- El dashboard actual no tiene autenticacion fuerte. `adminKey` vive en `config.js`, por lo que cualquier usuario puede leerlo desde el navegador.
- La persistencia principal usa `localStorage`; sirve para demo, pero no para multiusuario, auditoria, roles ni recuperacion.
- Hay buen uso de `escapeHtml` en muchas plantillas, pero varios `innerHTML` dependen de campos de inventario. Mantener sanitizacion server-side y client-side.
- La firma digital anterior era simulada en cliente. La firma real debe hacerse en backend con `SIGNATURE_SECRET`.

Rendimiento:
- La app carga videos locales y Leaflet desde CDN. Para produccion conviene cache-control, compresion, videos comprimidos y assets versionados.
- `innerHTML` re-renderiza listas completas. Es aceptable para el inventario actual; para cientos de pantallas conviene paginacion o virtualizacion.
- La cache stale-while-revalidate del brochure es buena para carga publica, pero el dashboard debe evitar cache al editar.

Escalabilidad y patrones:
- La separacion actual es estatica: `index.html`, `dashboard.html`, `mediakit.html` y helpers compartidos.
- Faltaba una frontera backend. Se agrego `backend/src` con rutas, validadores, servicios y middlewares.
- Para una evolucion React/Tailwind, extraer `ScreenTable`, `MediaKitBuilder`, `QuotePanel` y hooks `useScreens`, `useMediaKits`, `useAuth`.

UX/UI:
- Hay labels, foco visible, skip link en vista publica y responsive basico.
- Falta login real, estados de error de API, estados vacios mas completos y confirmaciones para acciones sensibles.

## Brechas criticas

- Autenticacion/autorizacion real para dashboard.
- Secretos fuera del cliente.
- Persistencia centralizada en base de datos.
- Validacion server-side para pantallas y media kits.
- Logs, backups y monitoreo.
- Publicacion de media kits por link independiente del navegador local.
- Politica de CORS, CSP, rate limiting y cookies seguras.

## Implementacion incluida

- `backend/src/server.js`: API Express y servidor estatico de `dist`.
- `backend/src/middleware/security.js`: Helmet, CORS, rate limit, compresion y logs.
- `backend/src/middleware/auth.js`: JWT y middleware `requireAuth`.
- `backend/src/routes`: auth, screens y media kits.
- `backend/src/services`: store JSON reemplazable por PostgreSQL/Supabase.
- `backend/src/validators.js`: validacion con Zod.
- `frontend/js/api-client.js`: cliente API para migrar el dashboard desde localStorage.
- `Dockerfile`, `docker-compose.yml`, `.env.example`.

## Checklist de despliegue

1. Generar secretos: `JWT_SECRET` y `SIGNATURE_SECRET` con 64+ caracteres aleatorios.
2. Generar hash bcrypt para `ADMIN_PASSWORD_HASH`; no guardar passwords planos.
3. Configurar `CORS_ORIGIN` con el dominio final exacto.
4. Sincronizar `dist/` con los archivos fuente antes de construir la imagen.
5. Reemplazar el store JSON por PostgreSQL/Supabase si habra multiples administradores o alto volumen.
6. Configurar TLS/SSL en proxy o plataforma cloud.
7. Activar backups del volumen o base de datos.
8. Configurar logs centralizados y alertas de `/api/health`.
9. Revisar CSP si se eliminan CDNs o se self-hostean Leaflet/Material Web.
10. Ejecutar smoke test: `npm run smoke` contra el contenedor levantado.
