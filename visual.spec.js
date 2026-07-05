import { test, expect } from '@playwright/test';

test.describe('Tests Visuales de Páginas Principales', () => {

  test('La página principal (Brochure) se ve correctamente', async ({ page }) => {
    await page.goto('/index.html');
    // Esperamos a que las tarjetas de las pantallas se carguen
    await expect(page.locator('.card').first()).toBeVisible();
    // Tomamos un snapshot de la página completa
    await expect(page).toHaveScreenshot('brochure-page.png', { fullPage: true });
  });

  test('La página del Mapa se ve correctamente', async ({ page }) => {
    await page.goto('/map.html');
    // Esperamos a que los marcadores del mapa (círculos) sean visibles
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
    // Tomamos un snapshot
    await expect(page).toHaveScreenshot('map-page.png');
  });

  test('La página del Dashboard se ve correctamente', async ({ page }) => {
    await page.goto('/dashboard.html');
    // Esperamos que la tabla de inventario se renderice
    await expect(page.locator('#screen-tbody tr').first()).toBeVisible();
    // Tomamos un snapshot
    await expect(page).toHaveScreenshot('dashboard-page.png', { fullPage: true });
  });

  test('La página de Media Kit (vacía) se ve correctamente', async ({ page }) => {
    await page.goto('/mediakit.html');
    // Esperamos a que se muestre el estado vacío
    await expect(page.getByText('Propuesta no encontrada')).toBeVisible();
    // Tomamos un snapshot
    await expect(page).toHaveScreenshot('mediakit-empty-page.png');
  });

});