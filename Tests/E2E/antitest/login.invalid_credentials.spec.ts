import { test, expect } from '@playwright/test';
import { expectAlertWithMessage, TEST_CONFIG } from './helpers';

/**
 * Login con credenciales incorrectas — valida que se muestre un error
 */
test.use({ baseURL: TEST_CONFIG.baseURL });

test('login con credenciales inválidas muestra error', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Rellenar con credenciales inválidas
  await page.locator('input#email, input[name="email"], input[type="email"]').first().fill('admin@test.com');
  await page.locator('input#password, input[name="password"], input[type="password"]').first().fill('wrongpassword123');

  // Preparar listener para el alert o buscar error en UI
  let alertReceived = false;
  const alertPromise = new Promise<void>((resolve) => {
    page.once('dialog', async dialog => {
      alertReceived = true;
      await dialog.accept();
      resolve();
    });
  });

  // Interceptar respuesta HTTP
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/login') && resp.request().method() === 'POST',
    { timeout: 5000 }
  ).catch(() => null);

  // Click en login
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();

  // Esperar respuesta o alert
  const response = await responsePromise;

  if (response) {
    // Verificar que sea un error 401/403
    expect([400, 401, 403, 422]).toContain(response.status());
    
    // Esperar un poco para ver si hay alert
    await page.waitForTimeout(500);
    if (alertReceived) {
      await alertPromise;
    }
  } else if (alertReceived) {
    await alertPromise;
  } else {
    // Buscar mensaje de error en la UI
    const error = page.getByText(/credencial|usuario|contraseña.*incorrecto|inválid|error/i);
    await expect(error.first()).toBeVisible({ timeout: 3000 });
  }
});