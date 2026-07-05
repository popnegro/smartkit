import { test, expect } from '@playwright/test';

test.describe('Flujo de Usuario entre Páginas', () => {

  test('debe añadir una pantalla desde el mapa y verla en el cotizador del brochure', async ({ page }) => {
    // 1. Iniciar en la página del mapa
    await page.goto('/map.html');

    // 2. Esperar a que los marcadores del mapa estén visibles y hacer clic en el primero
    const firstMarker = page.locator('.leaflet-marker-icon').first();
    await expect(firstMarker).toBeVisible();
    await firstMarker.click();

    // 3. Esperar a que el panel lateral se abra y verificar el título
    const sidePanel = page.locator('#sc-panel');
    await expect(sidePanel).toHaveClass(/open/);
    await expect(sidePanel.locator('#sc-title')).toHaveText('Peatonal Sarmiento');

    // 4. Hacer clic en "Agregar al cotizador" y esperar la navegación
    // Playwright maneja automáticamente la espera de la redirección
    await page.locator('#panel-add-btn').click();
    await page.waitForURL('**/index.html');

    // 5. En la página del brochure, verificar que la pantalla está en el cotizador
    const quoteList = page.locator('#quote-list');
    await expect(quoteList).toContainText('Peatonal Sarmiento');
    await expect(page.locator('#quote-count')).toHaveText('1');
  });

});