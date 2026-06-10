const { test, expect } = require('@playwright/test');

test('brochure renders cards, quote actions and map navigation', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.getByRole('heading', { name: 'SmartKit' })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(11);
  await expect(page.locator('.card video').first()).toBeVisible();

  await page.locator('.card').first().getByText('Agregar').click();
  await expect(page.locator('#quote-status')).toHaveText('Listo');
  await expect(page.locator('#quote-mediakit')).toBeEnabled();
  await expect(page.locator('#quote-whatsapp')).toBeEnabled();

  await page.getByRole('button', { name: 'Mapa' }).click();
  await expect(page.locator('#view-map')).toHaveClass(/on/);
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
});

test('media kit default invites creation and demo renders proposal actions', async ({ page }) => {
  await page.goto('/mediakit.html');
  await expect(page.getByRole('heading', { name: 'Crea tu media kit' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir al brochure' })).toBeVisible();

  await page.goto('/mediakit.html?id=demo-trapiche');
  await expect(page.getByRole('heading', { name: 'Bodega Trapiche' })).toBeVisible();
  await expect(page.locator('.screen-card')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'Contactar por WhatsApp' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar PDF' })).toBeVisible();
});

test('generating media kit updates dynamic links and opens generated kit', async ({ page, context }, testInfo) => {
  await page.goto('/index.html');
  await page.locator('.card').first().getByText('Agregar').click();
  if (testInfo.project.name === 'mobile-chrome') {
    await page.locator('.top #mobile-quote-toggle').click();
  }

  const popupPromise = context.waitForEvent('page');
  await page.locator('#quote-mediakit').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');

  await expect(popup.getByRole('heading', { name: 'Propuesta SmartKit' })).toBeVisible();
  await expect(popup.locator('.screen-card')).toHaveCount(1);
  await expect(page.locator('[data-mediakit-link]').first()).toHaveAttribute('href', /mediakit\.html\?id=kit-/);
});

test('mobile header keeps quote near logo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile-only layout assertion');
  await page.goto('/index.html');

  await expect(page.locator('.top .brand')).toBeVisible();
  await expect(page.locator('.top #mobile-quote-toggle')).toBeVisible();
  await expect(page.locator('.mobile-action-nav')).toBeVisible();
  await expect(page.locator('.mobile-action-nav .mobile-quote-toggle')).toHaveCount(0);
});

test('dashboard media kit section renders builder and history', async ({ page }) => {
  await page.goto('/dashboard.html');
  await page.getByRole('button', { name: 'Media Kits' }).click();

  await expect(page.getByRole('heading', { name: 'Crear propuesta comercial' })).toBeVisible();
  await expect(page.locator('#kit-screen-list [data-kit-screen]').first()).toBeVisible();
  await expect(page.locator('#kit-history .kit-row').first()).toBeVisible();
});

test('dashboard archives and restores media kits without deleting public link', async ({ page }) => {
  await page.goto('/dashboard.html');
  await page.getByRole('button', { name: 'Media Kits' }).click();

  const firstKit = page.locator('#kit-history .kit-row').first();
  await expect(firstKit).toContainText('Bodega Trapiche');
  await firstKit.getByRole('button', { name: 'Archivar' }).click();

  await expect(page.locator('#kit-history')).not.toContainText('Bodega Trapiche');
  await expect(page.locator('#kit-archive')).toContainText('Bodega Trapiche');
  await expect(page.locator('#kit-archive').getByRole('link', { name: 'Ver público' }).first()).toHaveAttribute('href', /mediakit\.html\?id=demo-trapiche/);

  await page.locator('#kit-archive').getByRole('button', { name: 'Restaurar' }).first().click();
  await expect(page.locator('#kit-history')).toContainText('Bodega Trapiche');
});
