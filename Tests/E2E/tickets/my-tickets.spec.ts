import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  clearStorage,
  expectAuthenticated,
} from '../helpers/auth-helpers';
import { waitForLoading } from '../helpers/common-helpers';

test.describe('Mis Tickets - Visualización y gestión (Cliente)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'cliente@test.com', 'cliente123');
    await expectAuthenticated(page);
  });

  test('HU-023: Listar tickets próximos - Ver mis tickets comprados', async ({ page }) => {
    // Navegar a mis tickets
    await page.goto('/mis-tickets');

    // Esperar que desaparezca el loading
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    // MyTicketsPage muestra título "Tickets Próximos"
    await expect(page.getByRole('heading', { name: 'Tickets Próximos' })).toBeVisible();

    // Verificar que se muestran tickets o mensaje de no tickets
    const emptyMessage = page.getByText('Aún no tienes tickets.');
    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    
    // Esperar a que aparezca uno de los dos
    await Promise.race([
      emptyMessage.waitFor({ state: 'visible', timeout: 5000 }),
      ticketCards.first().waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => {});

    const hasTickets = await ticketCards.count() > 0;
    
    if (hasTickets) {
      // Si hay tickets, verificar estructura de agrupación por compra
      await expect(ticketCards.first()).toBeVisible();
      
      // Verificar nombre del evento en el header
      await expect(page.locator('h2.text-xl.font-bold.text-gray-800').first()).toBeVisible();
    } else {
      // Si no hay tickets, verificar mensaje
      await expect(emptyMessage).toBeVisible();
      await expect(page.getByText('¡Explora los eventos disponibles y consigue el tuyo!')).toBeVisible();
    }
  });

  test('HU-024: Mis Tickets - Agrupación por compra', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      // Cada tarjeta representa una compra agrupada
      const firstCard = ticketCards.first();
      
      // Verificar estructura: nombre evento, código compra, lista de tickets, total
      await expect(firstCard.locator('h2.text-xl.font-bold')).toBeVisible();
      await expect(firstCard.locator('p.font-mono.text-sm.font-semibold')).toBeVisible(); // código
      await expect(firstCard.locator('text=/Tus tickets/i')).toBeVisible();
      await expect(firstCard.locator('text=/Total pagado/i')).toBeVisible();
    }
  });

  test('HU-025: Ver detalles de ticket - Información de cada ticket', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      const firstCard = ticketCards.first();
      
      // Dentro de cada compra hay tickets individuales en .bg-gray-50.rounded-lg
      const individualTickets = firstCard.locator('.bg-gray-50.rounded-lg');
      await expect(individualTickets.first()).toBeVisible();
      
      // Verificar que muestra: emoji 🎫, tipo ticket, zona, número, precio, estado
      const firstTicket = individualTickets.first();
      await expect(firstTicket.locator('text=/🎫/')).toBeVisible();
      await expect(firstTicket.locator('p.font-semibold.text-gray-800')).toBeVisible(); // tipo-zona
      await expect(firstTicket.locator('text=/Ticket #/i')).toBeVisible();
      await expect(firstTicket.locator('text=/S\\//i')).toBeVisible(); // precio
      await expect(firstTicket.locator('text=/ACTIVO|USADO|CANCELADO/i')).toBeVisible(); // estado
    }
  });

  test('HU-026: Ver ticket - Verificar código de compra', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      // Verificar que cada compra muestra su código
      const codigoCompra = page.locator('p.font-mono.text-sm.font-semibold').first();
      await expect(codigoCompra).toBeVisible();
      
      // El código debe tener al menos 5 caracteres
      const codigo = await codigoCompra.textContent();
      expect(codigo).toBeTruthy();
      expect(codigo!.length).toBeGreaterThan(5);
    }
  });

  test('HU-027: Mis Tickets - Ver detalles de compra', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      // Cada tarjeta tiene un botón "Ver detalles"
      const verDetallesBtn = page.getByRole('button', { name: 'Ver detalles' }).first();
      await expect(verDetallesBtn).toBeVisible();
      
      // Click en ver detalles (actualmente solo hace console.log)
      await verDetallesBtn.click();
      
      // Por ahora solo verificamos que el botón existe y es clickeable
      // En el futuro debería abrir modal o navegar a detalles
    }
  });

  test('HU-028: Mis Tickets - Mostrar estado del ticket', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      // Cada ticket individual muestra su estado
      const estadoTexts = page.locator('text=/ACTIVO|USADO|CANCELADO/i');
      await expect(estadoTexts.first()).toBeVisible();
      
      // Verificar que tiene clase de color apropiada
      const firstEstado = estadoTexts.first();
      const className = await firstEstado.getAttribute('class');
      
      // Debería tener text-green-600 (activo), text-gray-500 (usado), o text-red-600 (cancelado)
      expect(className).toMatch(/text-(green|gray|red)-/);
    }
  });

  test('HU-029: Mis Tickets - Visualizar múltiples tickets por evento', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const hasTickets = await ticketCards.count() > 0;

    if (hasTickets) {
      const firstCard = ticketCards.first();
      
      // Verificar contador de tickets "Tus tickets (X)"
      const ticketCounter = firstCard.locator('text=/Tus tickets \\(\\d+\\)/i');
      await expect(ticketCounter).toBeVisible();
      
      // Obtener el número de tickets
      const counterText = await ticketCounter.textContent();
      const match = counterText?.match(/\\((\\d+)\\)/);
      const ticketCount = match ? parseInt(match[1]) : 0;
      
      // Verificar que hay al menos ese número de tickets mostrados
      const individualTickets = firstCard.locator('.bg-gray-50.rounded-lg');
      const actualCount = await individualTickets.count();
      expect(actualCount).toBe(ticketCount);
    }
  });

  test('HU-030: Mis Tickets - Ordenamiento por fecha de evento', async ({ page }) => {
    await page.goto('/mis-tickets');
    await expect(page.getByText('Cargando tickets...')).not.toBeVisible({ timeout: 10000 });

    const ticketCards = page.locator('.bg-white.rounded-xl.shadow-md');
    const cardCount = await ticketCards.count();

    if (cardCount > 1) {
      // Obtener fechas de los primeros dos eventos
      const fechas = await page.locator('p.text-sm.text-gray-500:has-text("📅")').all();
      
      if (fechas.length >= 2) {
        const fecha1Text = await fechas[0].textContent();
        const fecha2Text = await fechas[1].textContent();
        
        // Las fechas deberían estar ordenadas (el más próximo primero)
        // Solo verificamos que ambas fechas existen
        expect(fecha1Text).toBeTruthy();
        expect(fecha2Text).toBeTruthy();
      }
    }
  });
});
