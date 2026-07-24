import { test, expect } from '@playwright/test';

test.describe('Navegación del Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Navegamos al dashboard antes de cada test en este grupo.
    await page.goto('/dashboard.html');
    // Esperamos a que la tabla de inventario esté visible para asegurar que la página ha cargado.
    await expect(page.locator('#section-inventory')).toBeVisible();
  });

  test('debe mostrar la sección de Inventario por defecto', async ({ page }) => {
    // Verifica que el título de la página sea el correcto para la sección inicial.
    await expect(page.locator('#page-title')).toHaveText('Gestion de pantallas');
    // Verifica que el botón de navegación de Inventario tenga la clase 'on' que indica que está activo.
    await expect(page.getByRole('button', { name: 'Inventario' })).toHaveClass(/on/);
  });

  test('debe cambiar a la sección de Media Kits al hacer clic', async ({ page }) => {
    // Hacemos clic en el botón de "Media Kits".
    await page.getByRole('button', { name: 'Media Kits' }).click();

    // Verificamos que la sección de Media Kits esté visible y la de Inventario oculta.
    await expect(page.locator('#section-mediakits')).toBeVisible();
    await expect(page.locator('#section-inventory')).toBeHidden();
    // Verificamos que el título de la página se haya actualizado.
    await expect(page.locator('#page-title')).toHaveText('Constructor de Media Kits');
  });

  test('debe cambiar a la sección de Métricas al hacer clic', async ({ page }) => {
    await page.getByRole('button', { name: 'Métricas' }).click();
    await expect(page.locator('#section-metrics')).toBeVisible();
    await expect(page.locator('#page-title')).toHaveText('Metricas comerciales');
  });

  test('debe cambiar a la sección de Configuración al hacer clic', async ({ page }) => {
    await page.getByRole('button', { name: 'Configuración' }).click();
    await expect(page.locator('#section-settings')).toBeVisible();
    await expect(page.locator('#page-title')).toHaveText('Configuracion comercial');
  });

});