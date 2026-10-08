import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  clearStorage,
  expectAuthenticated,
} from '../helpers/auth-helpers';
import { waitForLoading } from '../helpers/common-helpers';

test.describe('Compra de Tickets - Flujo completo (Cliente)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'cliente@test.com', 'cliente123');
    await expectAuthenticated(page);
  });

  test('HU: Comprar tickets - Flujo completo de compra exitosa', async ({ page }) => {
    // 1. Ir a eventos
    await page.goto('/eventos');
    await waitForLoading(page);

    // Esperar que cargue la página
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });

    // 2. Seleccionar un evento
    const eventCards = page.locator('div.border.rounded-lg.overflow-hidden.shadow-sm, [data-testid="event-card"], .event-card');
    await expect(eventCards.first()).toBeVisible({ timeout: 10000 });

    // Click en el botón "Ver Detalles"
    await eventCards.first().getByRole('link', { name: /ver detalles/i }).click();

    // 3. Ver detalles del evento
    await page.waitForURL(/\/evento|\/events\/\d+/);
    await waitForLoading(page);

    // 4. Click en comprar
    const comprarButton = page.getByRole('button', { name: /comprar ahora|comprar|buy|adquirir/i });
    await expect(comprarButton).toBeVisible({ timeout: 10000 });
    await comprarButton.click();

    // 5. Seleccionar fecha (si hay)
    await page.waitForTimeout(2000);
    const fechaButtons = page.locator('button').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ });
    if (await fechaButtons.count() > 0) {
      await fechaButtons.first().click();
      await page.waitForTimeout(500);
    }

    // 6. Seleccionar tarifa (Click en "Elegir asientos")
    const ticketCards = page.locator('.bg-\\[\\#fdfdf7\\]').first();
    await expect(ticketCards).toBeVisible({ timeout: 5000 });

    const elegirAsientosButton = ticketCards.getByRole('button', { name: /elegir asientos/i });
    await elegirAsientosButton.click();

    // 7. Seleccionar asientos en el mapa
    await page.waitForURL(/\/seleccionar-asientos/);
    await waitForLoading(page);

    // Esperar a que carguen los asientos
    const asientosLibres = page.locator('.bg-green-500.cursor-pointer');
    await expect(asientosLibres.first()).toBeVisible({ timeout: 10000 });

    // Seleccionar 2 asientos
    await asientosLibres.nth(0).click();
    await page.waitForTimeout(300);
    await asientosLibres.nth(1).click();

    // 8. Reservar asientos
    const reservarButton = page.getByRole('button', { name: /reservar/i });
    await reservarButton.click();

    // Esperar confirmación de reserva (alert o cambio de UI)
    // El componente usa window.alert, Playwright lo maneja automáticamente si configuramos un handler, 
    // pero aquí el componente cambia el estado y muestra "Continuar a pago"

    // Manejar el dialog de confirmación
    page.on('dialog', dialog => dialog.accept());

    // 9. Continuar a pago
    const continuarButton = page.getByRole('button', { name: /continuar a pago/i });
    await expect(continuarButton).toBeVisible({ timeout: 10000 });
    await continuarButton.click();

    // 10. Verificar resumen
    await page.waitForURL(/\/eventos\/\d+\/compra\/resumen/, { timeout: 10000 });
    console.log('✓ Llegamos a la página de resumen');

    // 11. Confirmar compra
    const confirmarButton = page.getByRole('button', { name: /confirmar compra/i });
    await expect(confirmarButton).toBeVisible();
    await confirmarButton.click();

    // 12. Verificar éxito
    await page.waitForURL(/\/compra-exitosa\/\d+/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/compra-exitosa\/\d+/);
  });

  test('HU: Validación - No debe permitir reservar sin seleccionar asientos', async ({ page }) => {
    // 1. Ir a eventos
    await page.goto('/eventos');
    await waitForLoading(page);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });

    // 2. Seleccionar evento
    const eventCards = page.locator('div.border.rounded-lg.overflow-hidden.shadow-sm, [data-testid="event-card"], .event-card');
    await expect(eventCards.first()).toBeVisible({ timeout: 10000 });
    await eventCards.first().getByRole('link', { name: /ver detalles/i }).click();

    // 3. Ir a comprar
    await page.waitForURL(/\/evento|\/events\/\d+/);
    await waitForLoading(page);

    const comprarButton = page.getByRole('button', { name: /comprar ahora|comprar|buy|adquirir/i });
    await expect(comprarButton).toBeVisible({ timeout: 10000 });
    await comprarButton.click();

    // 4. Seleccionar fecha (si hay)
    await page.waitForTimeout(2000);
    const fechaButtons = page.locator('button').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ });
    if (await fechaButtons.count() > 0) {
      await fechaButtons.first().click();
      await page.waitForTimeout(500);
    }

    // 5. Ir a selección de asientos
    const ticketCards = page.locator('.bg-\\[\\#fdfdf7\\]').first();
    await expect(ticketCards).toBeVisible({ timeout: 5000 });
    const elegirAsientosButton = ticketCards.getByRole('button', { name: /elegir asientos/i });
    await elegirAsientosButton.click();

    // 6. Intentar reservar SIN seleccionar asientos
    await page.waitForURL(/\/seleccionar-asientos/);
    await waitForLoading(page);

    // Manejar el alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Selecciona al menos un asiento');
      await dialog.accept();
    });

    const reservarButton = page.getByRole('button', { name: /reservar/i });
    await expect(reservarButton).toBeVisible();
    await reservarButton.click();
  });
});
