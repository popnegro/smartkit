import { test, expect } from '@playwright/test';

test.describe('Funcionalidad del Brochure (index.html)', () => {

  test.beforeEach(async ({ page }) => {
    // Navegamos a la página principal antes de cada test
    await page.goto('/index.html');
  });

  test('debe filtrar las cards por zona y limpiar el filtro', async ({ page }) => {
    const cardsContainer = page.locator('#cards');
    const initialCardCount = await cardsContainer.locator('.card').count();
    expect(initialCardCount).toBe(11);

    // 1. Aplicar filtro por zona "Microcentro"
    await page.getByRole('button', { name: 'Microcentro' }).click();

    // 2. Verificar que el número de cards se haya reducido
    const filteredCards = cardsContainer.locator('.card');
    await expect(filteredCards).toHaveCount(6);

    // 3. Verificar que el botón para limpiar filtros sea visible
    const clearButton = page.getByRole('button', { name: 'Limpiar' });
    await expect(clearButton).toBeVisible();

    // 4. Limpiar los filtros y verificar que el recuento de cards vuelva al original
    await clearButton.click();
    await expect(cardsContainer.locator('.card')).toHaveCount(initialCardCount);
    await expect(clearButton).toBeHidden();
  });
});