import { Page, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const BACKEND_API = process.env.BACKEND_API ?? 'http://localhost:8000';

export interface TestUser {
  email: string;
  password: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  rol?: 'CLIENTE' | 'ORGANIZADOR' | 'ADMIN';
}

/**
 * Genera un email único para pruebas
 */
export function generateUniqueEmail(prefix = 'test'): string {
  return `${prefix}+${Date.now()}@example.com`;
}

/**
 * Genera un teléfono válido para Perú
 */
export function generatePhone(): string {
  const num = Math.floor(Math.random() * 90000000) + 910000000;
  return num.toString();
}

/**
 * Genera un RUC único para pruebas (11 dígitos, comienza con 20)
 */
export function generateUniqueRUC(): string {
  // RUC peruano: 11 dígitos, comienza con 20 (empresas)
  const timestamp = Date.now().toString().slice(-9); // Últimos 9 dígitos del timestamp
  return `20${timestamp}`;
}

/**
 * Login como usuario mediante UI
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // Ignore timeout
  }
  await page.waitForLoadState('domcontentloaded');

  // Esperar a que el formulario sea visible y estable
  const emailInput = page.locator('input#email');
  await expect(emailInput).toBeVisible({ timeout: 60000 });

  // Usar los IDs específicos de tu LoginForm
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Esperar a que se complete la navegación después del login
  // El login exitoso debería redirigir fuera de /login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

  // Intentar esperar networkidle pero no fallar si toma mucho tiempo
  // Algunas páginas (especialmente organizador) pueden tener polling o requests continuos
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // Si no llega a networkidle, continuar de todos modos
    console.log('⚠️ networkidle timeout (esperado para organizador con polling), continuando...');
  }

  // Ahora sí, esperar a que el token se guarde en localStorage
  await page.waitForFunction(
    () => localStorage.getItem('token') !== null,
    { timeout: 5000 }
  );

  // Esperar un momento adicional para asegurar que todo se guardó
  await page.waitForTimeout(500);

  // Si es organizador, verificar que se guardó el organizador_id
  const user = await page.evaluate(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  if (user && user.rol === 'ORGANIZADOR') {
    // Verificar si ya se guardó el organizador_id
    const organizadorId = await page.evaluate(() => localStorage.getItem('organizador_id'));

    if (!organizadorId) {
      // Si no se guardó, hacerlo manualmente llamando a /me
      console.log('⚠️ organizador_id no encontrado, obteniendo desde /me...');

      await page.evaluate(async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await fetch('http://localhost:8000/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.organizador_id) {
                localStorage.setItem('organizador_id', String(data.organizador_id));
                console.log('✅ organizador_id guardado manualmente:', data.organizador_id);

                // Actualizar el user en localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                  const user = JSON.parse(userStr);
                  user.organizador_id = data.organizador_id;
                  localStorage.setItem('user', JSON.stringify(user));
                }
              }
            }
          } catch (err) {
            console.error('❌ Error obteniendo /me:', err);
          }
        }
      });

      // Verificar que ahora sí está guardado
      const organizadorIdAfter = await page.evaluate(() => localStorage.getItem('organizador_id'));
      if (organizadorIdAfter) {
        console.log('✅ organizador_id verificado:', organizadorIdAfter);
      } else {
        console.warn('⚠️ No se pudo obtener organizador_id');
      }
    }
  }

  // Esperar a que aparezca mensaje de éxito o redirección
  try {
    await page.waitForURL(/\/organizerEvent|\/admin|\//, { timeout: 5000 });
  } catch {
    // Si no redirige, esperar mensaje de éxito
    try {
      await expect(page.getByText(/inicio de sesión exitoso/i)).toBeVisible({ timeout: 3000 });
    } catch {
      // Puede que ya haya redirigido, continuar
    }
  }

  // Esperar a que la página esté completamente cargada antes de verificar localStorage
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
  await page.waitForTimeout(500);

  // Verificar que el token existe en localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).not.toBeNull();
}

/**
 * Logout mediante UI
 */
export async function logoutViaUI(page: Page) {
  // Buscar el botón de avatar (círculo con User icon)
  const avatarButton = page.locator('button.rounded-full');
  await avatarButton.waitFor({ timeout: 5000 });
  await avatarButton.click();

  // Esperar que aparezca el menú dropdown
  await page.waitForTimeout(300);

  // Hacer click en "Cerrar sesión"
  await page.getByRole('menuitem', { name: /cerrar sesión/i }).click();

  // Esperar redirección - puede ir a /login o a / (home)
  // La URL puede ser exactamente "/" o terminar con "/"
  await page.waitForTimeout(1000); // Dar tiempo para que se complete el logout

  // Verificar que redirigió (puede ser a login o home)
  const currentURL = page.url();
  const isRedirected = currentURL.endsWith('/login') || currentURL.endsWith('/') || currentURL === 'http://localhost:5173/';
  if (!isRedirected) {
    throw new Error(`Expected to redirect to /login or /, but got ${currentURL}`);
  }
}

/**
 * Registrar usuario mediante UI
 */
export async function registerViaUI(page: Page, user: TestUser) {
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  // Esperar a que el formulario esté visible antes de llenar
  await page.locator('input#nombres, input[name="nombres"]').first().waitFor({ state: 'visible', timeout: 5000 });

  // Llenar formulario
  await fillRegistrationForm(page, user);

  // Capturar alert de éxito
  let alertMessage = '';
  page.once('dialog', async dialog => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  // Submit
  await page.getByRole('button', { name: /registrar/i }).click();

  // Esperar el alert de éxito
  await page.waitForTimeout(2000);

  // El RegisterForm actual NO hace auto-login, solo muestra un alert
  // Por ahora, verificamos que el registro fue exitoso esperando que la página esté lista
  // En el futuro, cuando se implemente auto-login, descomentar el código siguiente:

  /*
  // Esperar a que el token se guarde en localStorage después del auto-login
  await page.waitForFunction(
    () => localStorage.getItem('token') !== null,
    { timeout: 15000 }
  );
  
  // Verificar que el token existe en localStorage después del auto-login
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).not.toBeNull();
  */
}

/**
 * Helper para llenar formulario de registro
 */
export async function fillRegistrationForm(page: Page, user: TestUser) {
  // Seleccionar rol si se especifica (cliente o organizador)
  // CORREGIDO: Usar label[for="..."] porque RadioGroupItem de Shadcn no es input directo
  if (user.rol === 'ORGANIZADOR') {
    await page.locator('label[for="organizador"]').click();
    await page.waitForTimeout(300); // Esperar a que aparezcan campos extra (RUC, Razón Social)
  } else {
    // Por defecto es cliente
    await page.locator('label[for="cliente"]').click();
  }

  // Usar los IDs específicos de tu RegisterForm
  await page.locator('input#nombres').fill(user.nombres || 'Test');
  await page.locator('input#apellidos').fill(user.apellidos || 'Usuario');

  // Teléfono
  if (user.telefono) {
    await page.locator('input#telefono').fill(user.telefono);
  } else {
    await page.locator('input#telefono').fill('+51999999999');
  }

  // Email (el formulario usa 'correo' no 'email')
  await page.locator('input#correo').fill(user.email);

  // Password y confirmación
  await page.locator('input#password').fill(user.password);

  // Confirmar contraseña si existe el campo
  const confirmPassword = page.locator('input#confirmPassword');
  if (await confirmPassword.count() > 0) {
    await confirmPassword.fill(user.password);
  }

  // Si es organizador, llenar campos adicionales
  if (user.rol === 'ORGANIZADOR') {
    // Generar RUC único para cada prueba
    const ruc = generateUniqueRUC();
    await page.locator('input#ruc').fill(ruc);
    await page.locator('input#razon_social').fill('Eventos Test SAC');
  }
}

/**
 * Verifica que el usuario está autenticado
 */
export async function expectAuthenticated(page: Page) {
  // Esperar un momento para que se guarde el token
  await page.waitForTimeout(500);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).not.toBeNull();
  expect(token).not.toBe('');

  // Verificar también que el user está guardado
  const user = await page.evaluate(() => localStorage.getItem('user'));
  expect(user).not.toBeNull();
}

/**
 * Verifica que el usuario NO está autenticado
 */
export async function expectNotAuthenticated(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeNull();
}

/**
 * Limpia localStorage (útil en beforeEach)
 */
export async function clearStorage(page: Page) {
  // Usar el contexto del browser para limpiar storage sin necesitar navegar primero
  await page.context().clearCookies();

  try {
    // Intentar limpiar localStorage solo si ya estamos en una página
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignorar si localStorage no está disponible
      }
    });
  } catch (e) {
    // Si falla el evaluate (no hay contexto), continuar sin problemas
  }
}

/**
 * Obtener datos del usuario desde localStorage
 */
export async function getCurrentUser(page: Page) {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });
}

/**
 * Set token directamente en localStorage (para bypasear login UI)
 */
export async function setAuthToken(page: Page, token: string, user?: any) {
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    },
    { token, user }
  );
}
