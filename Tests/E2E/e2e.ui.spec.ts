import { test, expect } from '@playwright/test';
import path from 'path';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
test.use({ baseURL: BASE });

// ⚠️ DESHABILITADO: Tests antiguos reemplazados por test/e2e/auth
test.skip('flujo de login (UI) y ver perfil (robusto)', async ({ page }) => {
  // 1) Abrir la app
  await page.goto('/');

  // 2) Ir a login (acepta variaciones de texto)
  await page.getByRole('link', { name: /login|iniciar sesión|ingresar/i }).click();

  // 3) Rellenar credenciales (etiquetas en español)
  await page.getByLabel(/correo electrónico|email|correo/i).fill('organizador@test.com');
  await page.getByLabel(/contraseña|password/i).fill('org123');

  // 4) Pulsar login
  await page.getByRole('button', { name: /ingresar|entrar|login/i }).click();

  // 5) Esperar evidencia de sesión:
  // - Primero: un toast de "Inicio de sesión exitoso" o equivalente
  // - Si no aparece, buscar el avatar/botón de usuario en la cabecera con varios fallbacks
  const toast = page.getByText(/inicio de sesión exitoso|login exitoso|redireccionando/i);
  const avatarSelectors = [
    'button[aria-label="user-menu"]',
    'button[aria-label*="user"]',
    'button.rounded-full',
    'button:has(svg)',
    'button[class*="avatar"], .user-avatar, .avatar-button'
  ];

  // espera corta por el toast
  try {
    await toast.waitFor({ timeout: 5000 });
  } catch {
    // no se vio el toast; continuamos a buscar avatar
  }

  // buscamos avatar por los selectores ofrecidos
  let avatarFound = null;
  for (const sel of avatarSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      avatarFound = sel;
      break;
    } catch {
      // sigue con siguiente selector
    }
  }

  if (!avatarFound) {
    // Como fallback, buscar cualquier botón en la cabecera (top-right) que tenga role button y esté visible
    const headerButtons = page.locator('header button, nav button').filter({ hasText: '' });
    if ((await headerButtons.count()) > 0) {
      avatarFound = (await headerButtons.nth(0).evaluate((el) => {
        // devolver selector aproximado runtime (no perfecto, pero servirá)
        return el.getAttribute('class') ? `button[class="${el.getAttribute('class')}"]` : null;
      })) || 'header button';
    }
  }

  if (!avatarFound) {
    throw new Error('No se encontró botón/avatar de usuario tras el login (buscados varios selectores).');
  }

  // 6) Abrir menú de usuario
  await page.click(avatarFound);

  // 7) Hacer click en "Mi perfil" (usamos texto flexible)
  const perfil = page.getByRole('menuitem', { name: /mi perfil|perfil|usuario/i }).first();
  if (await perfil.count() === 0) {
    // fallback: click en link con texto
    await page.getByText(/mi perfil|perfil|usuario/i).click({ timeout: 5000 }).catch(() => {});
  } else {
    await perfil.click();
  }

  // 8) Verificar que estamos en perfil (o que el título aparece)
  await page.waitForURL(/\/perfil(?:$|\/)/, { timeout: 10_000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible({ timeout: 5_000 });

  // 9) Verificar campos del formulario
  await expect(page.getByLabel(/nombre|nombres/i)).toBeVisible({ timeout: 3_000 });
  await expect(page.getByLabel(/email|correo/i)).toBeVisible({ timeout: 3_000 });
});