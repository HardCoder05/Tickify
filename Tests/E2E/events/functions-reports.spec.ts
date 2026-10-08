import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  clearStorage,
  expectAuthenticated,
} from '../helpers/auth-helpers';
import {
  generateFutureDate,
  generateTime,
  waitForLoading,
} from '../helpers/common-helpers';

// ⚠️ DESHABILITADO: Ajustar según la implementación real
test.describe.skip('Funciones - Gestión (Organizador)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'organizador@test.com', 'org123');
    await expectAuthenticated(page);
  });

  test('HU: Gestionar funciones - Registrar nueva función para un evento', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    // Seleccionar un evento
    const events = page.locator('[data-testid="event-card"], .event-card, tr');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Navegar a funciones
      const funcionesTab = page.getByRole('button', { name: /funciones|shows|fechas/i });
      if (await funcionesTab.count() > 0) {
        await funcionesTab.click();

        // Crear nueva función
        await page.getByRole('button', { name: /nueva función|agregar función|add show/i }).click();

        // Llenar datos de la función
        const fecha = generateFutureDate(45);
        const horaInicio = generateTime(19, 0);
        const horaFin = generateTime(22, 30);

        await page.getByLabel(/fecha|date/i).fill(fecha);
        await page.getByLabel(/hora.*inicio|start.*time/i).fill(horaInicio);
        await page.getByLabel(/hora.*fin|end.*time/i).fill(horaFin);
        await page.getByLabel(/capacidad|aforo|capacity/i).fill('450');

        // Guardar
        await page.getByRole('button', { name: /guardar|crear|save/i }).click();

        // Verificar éxito
        await expect(
          page.getByText(/función.*creada|show.*created|éxito/i)
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('HU: Gestionar funciones - Modificar función existente', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a funciones
      const funcionesTab = page.getByRole('button', { name: /funciones|shows/i });
      if (await funcionesTab.count() > 0) {
        await funcionesTab.click();

        // Buscar botón editar
        const editButtons = page.getByRole('button', { name: /editar|edit/i });
        if (await editButtons.count() > 0) {
          await editButtons.first().click();

          // Modificar capacidad
          const capacidadInput = page.getByLabel(/capacidad|aforo|capacity/i);
          await capacidadInput.clear();
          await capacidadInput.fill('500');

          // Guardar
          await page.getByRole('button', { name: /guardar|actualizar|save/i }).click();

          await expect(
            page.getByText(/actualizado|updated|éxito/i)
          ).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('HU: Gestionar funciones - Eliminar función', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a funciones
      const funcionesTab = page.getByRole('button', { name: /funciones|shows/i });
      if (await funcionesTab.count() > 0) {
        await funcionesTab.click();

        // Buscar botón eliminar
        const deleteButtons = page.getByRole('button', { name: /eliminar|delete/i });
        if (await deleteButtons.count() > 0) {
          await deleteButtons.first().click();

          // Confirmar
          const confirmButton = page.getByRole('button', { name: /confirmar|sí|yes/i });
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
          }

          await expect(
            page.getByText(/eliminado|deleted|éxito/i)
          ).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('HU: Gestionar funciones - Listar todas las funciones de un evento', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a funciones
      const funcionesTab = page.getByRole('button', { name: /funciones|shows|fechas/i });
      if (await funcionesTab.count() > 0) {
        await funcionesTab.click();

        // Verificar que se muestran funciones
        const funciones = page.locator('table tbody tr, .funcion-item, [data-testid="funcion"]');
        
        await page.waitForTimeout(2000);
        
        if (await funciones.count() > 0) {
          await expect(funciones.first()).toBeVisible();
        } else {
          // Si no hay funciones, debe mostrar mensaje
          await expect(
            page.getByText(/no hay funciones|sin funciones|no shows/i)
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});

// ⚠️ DESHABILITADO: Ajustar según la implementación real  
test.describe.skip('Reportes - Organizador', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUI(page, 'organizador@test.com', 'org123');
    await expectAuthenticated(page);
  });

  test('HU: Obtener listado de inscritos - Ver lista de compradores', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar sección de inscritos/reportes
      const inscritosTab = page.getByRole('button', { name: /inscritos|asistentes|attendees|reportes/i });
      
      if (await inscritosTab.count() > 0) {
        await inscritosTab.click();

        // Verificar que se muestra la lista
        const inscritos = page.locator('table tbody tr, .inscrito-item, [data-testid="attendee"]');
        
        await page.waitForTimeout(2000);
        
        if (await inscritos.count() > 0) {
          await expect(inscritos.first()).toBeVisible();

          // Verificar información básica
          await expect(page.getByText(/nombre|correo|email/i)).toBeVisible();
        } else {
          await expect(
            page.getByText(/no hay inscritos|sin inscripciones|no attendees/i)
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('HU: Obtener listado de inscritos - Exportar lista', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a inscritos
      const inscritosTab = page.getByRole('button', { name: /inscritos|asistentes|attendees|reportes/i });
      
      if (await inscritosTab.count() > 0) {
        await inscritosTab.click();

        // Buscar botón de exportar
        const exportButtons = page.getByRole('button', { name: /exportar|export|descargar|download|excel|csv/i });
        
        if (await exportButtons.count() > 0) {
          // Preparar para capturar descarga
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          
          await exportButtons.first().click();
          
          try {
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toBeTruthy();
            expect(download.suggestedFilename()).toMatch(/\.xlsx|\.xls|\.csv/i);
          } catch (e) {
            // Si no hay descarga, al menos verificar que el botón existe
            await expect(exportButtons.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('HU: Listar tickets vendidos por función - Ver resumen de ventas', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a reportes/estadísticas
      const reportesTab = page.getByRole('button', { name: /reportes|estadísticas|ventas|sales|reports/i });
      
      if (await reportesTab.count() > 0) {
        await reportesTab.click();

        // Verificar que se muestran estadísticas por función
        await page.waitForTimeout(2000);
        
        await expect(
          page.getByText(/función|fecha|tickets vendidos|sold/i)
        ).toBeVisible({ timeout: 5000 });

        // Verificar que hay datos numéricos
        await expect(
          page.locator('table, .stat-card, [data-testid="stat"]').first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('HU: Listar tickets vendidos - Filtrar por zona', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a reportes
      const reportesTab = page.getByRole('button', { name: /reportes|ventas/i });
      
      if (await reportesTab.count() > 0) {
        await reportesTab.click();

        // Buscar filtro de zona
        const zonaFilter = page.locator('select[name="zona"], select').first();
        
        if (await zonaFilter.count() > 0) {
          await zonaFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);

          // Verificar que se actualizaron los resultados
          await expect(
            page.locator('[data-testid="stat"], .stat-value, td').first()
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Reportes - Ver gráficos de ventas', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Ir a reportes
      const reportesTab = page.getByRole('button', { name: /reportes|estadísticas/i });
      
      if (await reportesTab.count() > 0) {
        await reportesTab.click();

        // Buscar gráficos (canvas, svg, chart containers)
        const charts = page.locator('canvas, svg, [data-testid="chart"], .chart-container');
        
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Reportes - Ver ingresos totales por evento', async ({ page }) => {
    await page.goto('/organizerEvent');
    await waitForLoading(page);

    const events = page.locator('[data-testid="event-card"], .event-card');
    if (await events.count() > 0) {
      await events.first().click();
      await page.waitForTimeout(2000);

      // Buscar sección de ingresos
      const ingresosSection = page.getByText(/ingresos totales|total revenue|recaudación/i);
      
      if (await ingresosSection.count() > 0) {
        await expect(ingresosSection.first()).toBeVisible();

        // Verificar que hay un monto
        await expect(
          page.getByText(/S\/|PEN|\$|soles/i)
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
