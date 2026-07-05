import { test, expect } from '@playwright/test';

test.describe('Funcionalidad del Brochure (index.html)', () => {

  test.beforeEach(async ({ page }) => {
    // Navegamos a la página principal antes de cada test
    await page.goto('/index.html');
  });

  test('debe cargar y mostrar las cards del inventario correctamente', async ({ page }) => {
    // 1. Esperar a que el contenedor de las cards esté listo y contenga al menos una card.
    await expect(page.locator('#cards .card').first()).toBeVisible();

    // 2. Verificar que se haya renderizado el número correcto de pantallas activas.
    // Según tu screens.json, hay 11 pantallas con "active": true.
    const cards = page.locator('#cards .card');
    await expect(cards).toHaveCount(11);

    // 3. Verificar el contenido de la primera card para asegurar que los datos son correctos.
    const firstCard = cards.first();
    await expect(firstCard.locator('.card-title')).toHaveText('Peatonal Sarmiento');
    await expect(firstCard.locator('.card-zone')).toHaveText('Microcentro');
    await expect(firstCard.locator('.card-price')).toContainText('$95.000');
  });

});