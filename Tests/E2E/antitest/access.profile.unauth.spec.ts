import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './helpers';

/**
 * Acceso a perfil sin autenticación — verifica que rutas protegidas redirijan al login
 */
test.use({ baseURL: TEST_CONFIG.baseURL });

test('acceso a perfil sin autenticación redirige al login', async ({ page }) => {
  // Limpiar almacenamiento para asegurar que no hay sesión
  await page.context().clearCookies();
  
  // Primero navegar a una página, luego limpiar storage
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignorar errores de seguridad en file:// protocol
    }
  });

  // Intentar acceder a una ruta protegida (perfil, mis tickets, etc.)
  await page.goto('/profile');

  // Esperar a que cargue la página
  await page.waitForLoadState('domcontentloaded');

  // Verificar que fue redirigido al login o que muestra mensaje de no autenticado
  const currentUrl = page.url();
  const isLoginPage = currentUrl.includes('/login');
  
  if (isLoginPage) {
    // Si redirigió al login, verificar que estamos en esa página
    expect(currentUrl).toContain('/login');
  } else {
    // Si no redirigió, debe mostrar mensaje de error o botón para login
    const loginButton = page.getByRole('link', { name: /login|iniciar sesión|ingresar/i });
    await expect(loginButton).toBeVisible({ timeout: 3000 });
  }
});