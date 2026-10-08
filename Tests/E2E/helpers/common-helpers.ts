import { Page } from '@playwright/test';

const BACKEND_API = process.env.BACKEND_API ?? 'http://localhost:8000';

/**
 * Espera a que un elemento desaparezca (útil para spinners, loaders)
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout = 10000
) {
  try {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  } catch {
    // El elemento podría no aparecer en absoluto, lo cual está bien
  }
}

/**
 * Espera a que termine la carga (spinner, loading)
 */
export async function waitForLoading(page: Page) {
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    '.spinner',
    'text=/cargando/i',
  ];

  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      await waitForElementToDisappear(page, selector);
      return;
    } catch {
      continue;
    }
  }
}

/**
 * Scroll hasta un elemento
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Tomar screenshot con nombre descriptivo
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = Date.now();
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Verifica que la URL contiene un patrón
 */
export async function expectURLContains(page: Page, pattern: string | RegExp) {
  const url = page.url();
  if (typeof pattern === 'string') {
    if (!url.includes(pattern)) {
      throw new Error(`Expected URL to contain "${pattern}", but got "${url}"`);
    }
  } else {
    if (!pattern.test(url)) {
      throw new Error(`Expected URL to match ${pattern}, but got "${url}"`);
    }
  }
}

/**
 * Llena un campo de fecha
 */
export async function fillDateField(page: Page, selector: string, date: string) {
  // date debe estar en formato YYYY-MM-DD
  await page.fill(selector, date);
}

/**
 * Llena un campo de tiempo
 */
export async function fillTimeField(page: Page, selector: string, time: string) {
  // time debe estar en formato HH:MM
  await page.fill(selector, time);
}

/**
 * Genera una fecha futura (para eventos)
 */
export function generateFutureDate(daysFromNow: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Genera una hora
 */
export function generateTime(hour: number = 18, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Espera por una respuesta de API específica
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Genera un número aleatorio entre min y max
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un precio aleatorio
 */
export function generatePrice(min = 10, max = 500): number {
  return randomInt(min, max);
}

/**
 * Formatea un precio para mostrar
 */
export function formatPrice(price: number): string {
  return `S/ ${price.toFixed(2)}`;
}

/**
 * Espera un tiempo específico (usar con moderación)
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Hace click en un botón por texto con múltiples intentos
 */
export async function clickButtonByText(page: Page, text: string | RegExp) {
  const button = page.getByRole('button', { name: text });
  await button.click();
}

/**
 * Selecciona una opción de un dropdown/select
 */
export async function selectOption(
  page: Page,
  selector: string,
  value: string
) {
  await page.selectOption(selector, value);
}

/**
 * Verifica que un texto existe en la página
 */
export async function expectTextVisible(page: Page, text: string | RegExp) {
  await page.getByText(text).isVisible();
}
