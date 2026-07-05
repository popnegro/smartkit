// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',

  /* ============== La Magia Sucede Aquí ============== */
  // Configuración para que Playwright inicie tu servidor automáticamente.
  webServer: {
    // El comando exacto para iniciar tu servidor.
    command: 'npx http-server -p 3000',
    // La URL que Playwright esperará a que esté disponible antes de correr los tests.
    url: 'http://127.0.0.1:3000',
    // Si ya tienes un servidor corriendo en ese puerto, Playwright lo reutilizará.
    // Esto es útil durante el desarrollo. En CI (Integración Continua), siempre iniciará uno nuevo.
    reuseExistingServer: !process.env.CI,
  },

  use: {
    // URL base para todas las acciones de navegación en los tests (ej. page.goto('/')).
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});