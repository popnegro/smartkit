import { test, expect } from '@playwright/test';

test.describe('Funcionalidad del Mapa', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/map.html');
    // Esperar a que el mapa y los marcadores iniciales se carguen
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  });

  test('debe filtrar los marcadores por tipo', async ({ page }) => {
    const mapCounter = page.locator('#map-counter');
    
    // 1. Estado inicial: deben estar todas las pantallas activas (11)
    await expect(mapCounter).toHaveText('11 pantallas visibles');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(11);

    // 2. Filtrar por "Peatonal": deben quedar 2 pantallas
    await page.getByRole('button', { name: 'Peatonal' }).click();
    await expect(mapCounter).toHaveText('2 pantallas visibles');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);

    // 3. Filtrar por "Mixto": deben quedar 5 pantallas
    await page.getByRole('button', { name: 'Mixto' }).click();
    await expect(mapCounter).toHaveText('5 pantallas visibles');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
  });

});