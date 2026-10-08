import { test, expect } from '@playwright/test';
import { fillRegisterForm, expectAlertWithMessage, disableFormValidation, submitFormByDispatch, TEST_CONFIG } from './helpers';

/**
 * Registro con email inválido — valida que el formulario detecte emails con formato incorrecto
 */
test.use({ baseURL: TEST_CONFIG.baseURL });

test('registro con email inválido muestra error de validación', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  // Deshabilitar validación HTML5 del formulario completo para probar la validación JS
  await disableFormValidation(page);

  // Rellenar formulario con email inválido
  await fillRegisterForm(page, {
    nombres: 'Usuario Prueba',
    apellidos: 'Prueba',
    telefono: '+51999999999',
    email: 'email-no-valido',
    password: 'Testpass123!',
    confirmPassword: 'Testpass123!'
  });

  // Preparar listener para el alert antes de enviar el formulario
  const alertPromise = expectAlertWithMessage(page, 'Correo electrónico no válido');

  // Forzar submit vía dispatch para evitar bloqueo por validación nativa
  await submitFormByDispatch(page);

  // Esperar a que aparezca el alert
  await alertPromise;
});