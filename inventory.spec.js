import { test, expect } from '@playwright/test';

test.describe('Carga de Inventario', () => {

  test('debe cargar el inventario correctamente en el Brochure (index.html)', async ({ page }) => {
    await page.goto('/index.html');

    // 1. Esperar a que las cards sean visibles.
    await expect(page.locator('#cards .card').first()).toBeVisible();

    // 2. Verificar que se rendericen las 11 pantallas activas.
    const cards = page.locator('#cards .card');
    await expect(cards).toHaveCount(11);

    // 3. Verificar el contenido de la primera card para asegurar la integridad de los datos.
    const firstCard = cards.first();
    await expect(firstCard.locator('.card-title')).toHaveText('Peatonal Sarmiento');
    await expect(firstCard.locator('.card-zone')).toHaveText('Microcentro');
  });

  test('debe cargar el inventario correctamente en el Mapa (map.html)', async ({ page }) => {
    await page.goto('/map.html');

    // 1. Esperar a que los marcadores del mapa sean visibles.
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();

    // 2. Verificar que se rendericen los 11 marcadores de las pantallas activas.
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(11);
  });

  test('debe cargar el inventario correctamente en el Dashboard (dashboard.html)', async ({ page }) => {
    await page.goto('/dashboard.html');

    // 1. Esperar a que las filas de la tabla sean visibles.
    await expect(page.locator('#screen-tbody tr').first()).toBeVisible();

    // 2. Verificar que se rendericen las 22 pantallas totales del inventario.
    await expect(page.locator('#screen-tbody tr')).toHaveCount(22);
  });
});