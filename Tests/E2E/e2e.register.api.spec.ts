import { test, expect } from '@playwright/test';
import path from 'path';

const STORAGE_FILE = path.resolve(process.cwd(), '.auth', 'state.register.json');

// ⚠️ DESHABILITADO: Tests antiguos reemplazados por test/e2e/auth
test.skip('registro vía API y acceder al perfil usando storageState', async ({ page, request, browser }) => {
  const random = Date.now();
  const email = `api-test+${random}@example.com`;
  const password = 'Testpass123!';  

  // 1) Crear usuario por API
  const backend = process.env.BACKEND_API ?? 'http://localhost:8000';
  const registerResp = await request.post(`${backend}/register`, {
    data: {
      nombres: 'Usr',
      apellidos: 'Prueba',
      correo: email,
      telefono: '+51999999999',
      password: password
    }
  });

  expect([200, 201, 204]).toContain(registerResp.status());

  // 2) Login por API (obtener token)
  const loginResp = await request.post(`${backend}/login`, {
    data: { username: email, password }
  });
  expect(loginResp.status()).toBe(200);
  const body = await loginResp.json();
  const token = body.access_token ?? body.token;
  expect(token).toBeTruthy();

  // 3) Crear contexto con token en localStorage y generar storageState
  const context = await browser.newContext();
  const pageTmp = await context.newPage();
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
  await pageTmp.goto(baseUrl);
  // Ajusta la clave a la que tu frontend lee el token (auth_token/access_token)
  await pageTmp.evaluate((t) => localStorage.setItem('auth_token', t), token);
  const storage = await context.storageState();
  await context.storageState({ path: STORAGE_FILE }); // guarda para debug si quieres
  await pageTmp.close();
  await context.close();

  // 4) Abrir página con storage creado
  const context2 = await browser.newContext({ storageState: STORAGE_FILE });
  const page2 = await context2.newPage();
  await page2.goto('/perfil');
  await expect(page2.getByRole('heading', { name: /mi perfil/i })).toBeVisible({ timeout: 7000 });
  await context2.close();
});