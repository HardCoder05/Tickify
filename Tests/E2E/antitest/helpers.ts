import { Page, expect } from '@playwright/test';

/**
 * Helper para rellenar el formulario de registro completo
 */
export async function fillRegisterForm(page: Page, data: {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  await page.locator('input#nombres').fill(data.nombres);
  await page.locator('input#apellidos').fill(data.apellidos);
  await page.locator('input#telefono').fill(data.telefono);
  await page.locator('input#email').fill(data.email);
  await page.locator('input#password').fill(data.password);
  await page.locator('input#confirmPassword').fill(data.confirmPassword);
}

/**
 * Helper para esperar y verificar un alert dialog con un mensaje específico
 */
export async function expectAlertWithMessage(page: Page, messagePattern: string | RegExp) {
  return new Promise<void>((resolve, reject) => {
    // aumentar timeout para entornos lentos
    const timeout = setTimeout(() => {
      reject(new Error('Alert no apareció en 5 segundos'));
    }, 5000);

    page.once('dialog', async dialog => {
      clearTimeout(timeout);
      try {
        if (typeof messagePattern === 'string') {
          expect(dialog.message()).toContain(messagePattern);
        } else {
          expect(dialog.message()).toMatch(messagePattern);
        }
        await dialog.accept();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Helper para deshabilitar validación HTML5 de un input
 */
export async function disableHTML5Validation(page: Page, selector: string) {
  await page.locator(selector).evaluate(el => {
    el.removeAttribute('type');
    el.removeAttribute('required');
    // También deshabilitar validación del formulario padre
    const form = el.closest('form');
    if (form) {
      form.setAttribute('novalidate', 'novalidate');
    }
  });
}

/**
 * Helper para deshabilitar validación HTML5 de todo el formulario
 */
export async function disableFormValidation(page: Page) {
  await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.setAttribute('novalidate', 'novalidate'));
  });
}

/**
 * Forzar el envío del formulario disparando un evento 'submit'.
 * Útil para bypassear validación HTML5 que impide que el handler JS se ejecute.
 */
export async function submitFormByDispatch(page: Page, selector = 'form') {
  await page.evaluate((sel) => {
    const form = document.querySelector(sel) as HTMLFormElement | null;
    if (!form) throw new Error('submitFormByDispatch: form not found for selector ' + sel);
    // Dispatch a submit event so React/handlers attached to onSubmit run.
    const evt = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(evt);
  }, selector);
}

/**
 * Generar email único para tests
 */
export function generateUniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}@example.com`;
}

/**
 * Configuración común para tests
 */
export const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  backendURL: 'http://localhost:8000'
};
