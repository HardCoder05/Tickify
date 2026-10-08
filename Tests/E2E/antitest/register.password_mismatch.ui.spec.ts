import { test, expect } from '@playwright/test';
import { fillRegisterForm, expectAlertWithMessage, generateUniqueEmail, submitFormByDispatch, disableFormValidation, TEST_CONFIG } from './helpers';

/**
 * Registro con contraseñas que no coinciden — valida que el formulario detecte el mismatch
 */
test.use({ baseURL: TEST_CONFIG.baseURL });

test('registro con contraseña distinta de confirmación muestra error', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  // Rellenar formulario con contraseñas diferentes
  await fillRegisterForm(page, {
    nombres: 'Usuario Prueba',
    apellidos: 'Prueba',
    telefono: '+51999999999',
    email: generateUniqueEmail('mismatch'),
    password: 'Password1!',
    confirmPassword: 'DifferentPass!'
  });

  // Deshabilitar validación nativa y preparar listener para el alert
  await disableFormValidation(page);
  const alertPromise = expectAlertWithMessage(page, /contraseñas no coinciden/i);

  // Forzar el submit para ejecutar el handler JS
  await submitFormByDispatch(page);

  // Esperar a que aparezca el alert
  await alertPromise;
});