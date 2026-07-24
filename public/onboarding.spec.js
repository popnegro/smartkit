import { test, expect } from '@playwright/test';

test.describe('Formulario de Onboarding', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding.html');
  });

  test('debe tener el botón de envío deshabilitado inicialmente', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Enviar Cuestionario' })).toBeDisabled();
  });

  test('debe habilitar el botón de envío cuando se completan los campos requeridos', async ({ page }) => {
    // Llenar los campos requeridos
    await page.getByLabel('¿Qué problema principal esperan resolver?').fill('Test problema');
    await page.getByLabel('¿Cómo medirán el éxito del proyecto?').fill('Test éxito');
    await page.getByLabel('¿Poseen manual de marca?').locator('..').getByText('Sí').click();
    await page.getByLabel('¿Tienen logo en formato vectorial?').locator('..').getByText('Sí').click();
    await page.getByLabel('¿Desean integrar WhatsApp como canal único de contacto?').locator('..').getByText('Sí').click();

    // Verificar que el botón ahora está habilitado
    await expect(page.getByRole('button', { name: 'Enviar Cuestionario' })).toBeEnabled();
  });

  test('debe mostrar los detalles de email cuando se selecciona "Sí"', async ({ page }) => {
    const emailDetails = page.locator('#email-details');
    await expect(emailDetails).toBeHidden();

    // Hacer clic en "Sí" para los correos
    await page.getByText('¿Cuántas cuentas de correo electrónico corporativas existen?').locator('..').getByText('Sí').click();

    await expect(emailDetails).toBeVisible();
    await expect(page.getByLabel('¿Cuántas cuentas de correo están activas?')).toBeVisible();
  });

  test('debe guardar el progreso en localStorage y recuperarlo al recargar', async ({ page }) => {
    const testProblem = 'Este es un test para localStorage';
    const problemTextarea = page.getByLabel('¿Qué problema principal esperan resolver?');

    // 1. Escribir en el campo
    await problemTextarea.fill(testProblem);

    // 2. Verificar que el valor se guardó
    await expect(problemTextarea).toHaveValue(testProblem);

    // 3. Recargar la página
    await page.reload();

    // 4. Verificar que el valor se recuperó de localStorage
    await expect(page.getByLabel('¿Qué problema principal esperan resolver?')).toHaveValue(testProblem);
  });
});