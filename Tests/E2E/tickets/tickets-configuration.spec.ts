import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  clearStorage,
  expectAuthenticated,
} from '../helpers/auth-helpers';
import {
  generatePrice,
  waitForLoading,
} from '../helpers/common-helpers';

// ⚠️ DESHABILITADO: Ajustar según la implementación real
test.describe.skip('Tarifas y Zonas - Gestión (Organizador)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'organizador@test.com', 'org123');
    await expectAuthenticated(page);
  });

  test('HU: Configurar tarifas por zona - Crear nueva tarifa', async ({ page }) => {
    // Navegar a un evento específico
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar un evento
    const eventCards = page.locator('[data-testid="event-card"], .event-card, tr');
    if (await eventCards.count() > 0) {
      await eventCards.first().click();
      await page.waitForTimeout(2000);

      // Buscar sección de tarifas
      const tarifasButton = page.getByRole('button', { name: /tarifas|precios|pricing/i });
      if (await tarifasButton.count() > 0) {
        await tarifasButton.click();

        // Click en crear nueva tarifa
        await page.getByRole('button', { name: /nueva tarifa|crear tarifa|add price/i }).click();

        // Llenar formulario
        await page.getByLabel(/zona|zone|área/i).fill('Platea Baja');
        await page.getByLabel(/precio|price|monto/i).fill(generatePrice(50, 200).toString());

        // Guardar
        await page.getByRole('button', { name: /guardar|crear|save/i }).click();

        // Verificar éxito
        await expect(
          page.getByText(/tarifa.*creada|precio.*creado|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Configurar tarifas - Registrar precios por combinación (tipo, zona, etapa)', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar evento
    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Navegar a tarifas
      const tarifasTab = page.getByRole('link', { name: /tarifas|precios/i });
      if (await tarifasTab.count() > 0) {
        await tarifasTab.click();
      }

      // Crear tarifa con combinación
      await page.getByRole('button', { name: /nueva tarifa|crear/i }).click();

      // Tipo de ticket
      const tipoSelect = page.locator('select[name="tipo"], select[id*="tipo"]').first();
      if (await tipoSelect.count() > 0) {
        await tipoSelect.selectOption('VIP');
      }

      // Zona
      const zonaSelect = page.locator('select[name="zona"], select[id*="zona"]').first();
      if (await zonaSelect.count() > 0) {
        await zonaSelect.selectOption('Platea Alta');
      }

      // Etapa (ej: preventa, venta general)
      const etapaSelect = page.locator('select[name="etapa"], select[id*="etapa"]').first();
      if (await etapaSelect.count() > 0) {
        await etapaSelect.selectOption('preventa');
      }

      // Precio
      await page.getByLabel(/precio|price/i).fill('150');

      // Guardar
      await page.getByRole('button', { name: /guardar|save/i }).click();

      await page.waitForTimeout(2000);
    }
  });

  test('HU: Configurar tarifas - Modificar tarifa existente', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar evento y navegar a tarifas
    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar botones de editar tarifa
      const editButtons = page.getByRole('button', { name: /editar.*tarifa|edit.*price/i });
      
      if (await editButtons.count() > 0) {
        await editButtons.first().click();

        // Modificar precio
        const precioInput = page.getByLabel(/precio|price/i);
        await precioInput.clear();
        await precioInput.fill(generatePrice(60, 180).toString());

        // Guardar cambios
        await page.getByRole('button', { name: /guardar|actualizar|save|update/i }).click();

        // Verificar éxito
        await expect(
          page.getByText(/actualizado|updated|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Configurar tarifas - Eliminar tarifa', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar evento
    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar botón eliminar
      const deleteButtons = page.getByRole('button', { name: /eliminar.*tarifa|delete.*price/i });
      
      if (await deleteButtons.count() > 0) {
        await deleteButtons.first().click();

        // Confirmar eliminación
        const confirmButton = page.getByRole('button', { name: /confirmar|sí|yes|eliminar/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }

        // Verificar éxito
        await expect(
          page.getByText(/eliminado|deleted|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Configurar tarifas - Listar todas las tarifas de un evento', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar evento
    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Navegar a tarifas
      const tarifasSection = page.getByRole('button', { name: /tarifas|precios/i });
      if (await tarifasSection.count() > 0) {
        await tarifasSection.click();

        // Verificar que se muestran tarifas
        await expect(
          page.locator('table, .tarifa-item, [data-testid="tarifa"]').first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ⚠️ DESHABILITADO: Ajustar según la implementación real
test.describe.skip('Tipos de Tickets - Gestión (Organizador)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'organizador@test.com', 'org123');
    await expectAuthenticated(page);
  });

  test('HU: Configurar tipos de tickets - Registrar tipo General', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Navegar a un evento
    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar sección de tipos de tickets
      const tiposButton = page.getByRole('button', { name: /tipos.*ticket|ticket types/i });
      if (await tiposButton.count() > 0) {
        await tiposButton.click();

        // Crear nuevo tipo
        await page.getByRole('button', { name: /nuevo tipo|crear tipo/i }).click();

        await page.getByLabel(/nombre|name|tipo/i).fill('General');
        await page.getByLabel(/descripción|description/i).fill('Ticket de acceso general');
        await page.getByLabel(/cantidad|stock|available/i).fill('300');

        await page.getByRole('button', { name: /guardar|crear|save/i }).click();

        await expect(
          page.getByText(/tipo.*creado|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Configurar tipos de tickets - Registrar tipo VIP', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Crear tipo VIP
      const tiposButton = page.getByRole('button', { name: /tipos.*ticket|ticket types/i });
      if (await tiposButton.count() > 0) {
        await tiposButton.click();

        await page.getByRole('button', { name: /nuevo tipo|crear tipo/i }).click();

        await page.getByLabel(/nombre|name|tipo/i).fill('VIP');
        await page.getByLabel(/descripción|description/i).fill('Ticket VIP con beneficios exclusivos');
        await page.getByLabel(/cantidad|stock/i).fill('50');

        await page.getByRole('button', { name: /guardar|crear|save/i }).click();

        await page.waitForTimeout(2000);
      }
    }
  });

  test('HU: Configurar tipos de tickets - Modificar tipo existente', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar tipos de tickets y editar
      const editButtons = page.getByRole('button', { name: /editar.*tipo|edit.*type/i });
      
      if (await editButtons.count() > 0) {
        await editButtons.first().click();

        // Modificar cantidad disponible
        const cantidadInput = page.getByLabel(/cantidad|stock|available/i);
        await cantidadInput.clear();
        await cantidadInput.fill('400');

        await page.getByRole('button', { name: /guardar|actualizar|save/i }).click();

        await expect(
          page.getByText(/actualizado|updated|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Configurar tipos de tickets - Eliminar tipo', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar y eliminar tipo
      const deleteButtons = page.getByRole('button', { name: /eliminar.*tipo|delete.*type/i });
      
      if (await deleteButtons.count() > 0) {
        await deleteButtons.first().click();

        // Confirmar
        const confirmButton = page.getByRole('button', { name: /confirmar|sí|yes/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
      }
    }
  });
});
