import { test, expect } from '@playwright/test';
import { BrochurePage } from './tests/poms/brochurePage.js';
import { MapPage } from './tests/poms/mapPage.js';
import { DashboardPage } from './tests/poms/dashboardPage.js';

test.describe('Carga de Inventario', () => {
  let brochurePage;
  let mapPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    brochurePage = new BrochurePage(page);
    mapPage = new MapPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('debe cargar el inventario correctamente en el Brochure (index.html)', async ({ page }) => {
    await brochurePage.goto();

    // 1. Esperar a que la página cargue.
    await brochurePage.waitForLoad();

    // 2. Verificar que se rendericen las 11 pantallas activas.
    await brochurePage.expectCardCount(11);

    // 3. Verificar el contenido de la primera card para asegurar la integridad de los datos.
    await brochurePage.expectFirstCardContent('Peatonal Sarmiento', 'Microcentro');
  });

  test('debe cargar el inventario correctamente en el Mapa (map.html)', async ({ page }) => {
    await mapPage.goto();
    await mapPage.waitForLoad();
    await mapPage.expectMarkerCount(11);
  });

  test('debe cargar el inventario correctamente en el Dashboard (dashboard.html)', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();
    await dashboardPage.expectScreenRowCount(22);
  });
});