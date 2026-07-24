import { defineConfig } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directorio donde se encuentran los tests.
  testDir: './tests',
  // Usar el servidor web de Playwright para servir los archivos estáticos.
  webServer: { command: 'npx http-server -p 3000', port: 3000, },
});