import { test, expect } from '@playwright/test';
import { generateUniqueEmail, TEST_CONFIG } from './helpers';

/**
 * Registro duplicado vía API — verifica que no se pueda registrar el mismo email dos veces
 */
test.use({ baseURL: TEST_CONFIG.baseURL });

test('registro duplicado vía API devuelve error', async ({ request }) => {
  const email = generateUniqueEmail('dup');
  const payload = {
    nombres: 'Dup',
    apellidos: 'Test',
    correo: email,
    telefono: '+51999999999',
    password: 'Testpass123!',
    rol: 'cliente'
  };

  // 1) Crear usuario (primera vez) - debe ser exitoso
  const r1 = await request.post(`${TEST_CONFIG.backendURL}/register`, { 
    data: payload 
  });
  expect([200, 201]).toContain(r1.status());

  // 2) Intentar crear nuevamente con el mismo email -> debe fallar
  const r2 = await request.post(`${TEST_CONFIG.backendURL}/register`, { 
    data: payload 
  });
  expect([400, 409, 422]).toContain(r2.status());
});