# 🧪 Pruebas E2E - Sistema Tickify

## 📁 Estructura de Pruebas

Las pruebas E2E están organizadas por módulos funcionales:

```
test/e2e/
├── helpers/                 # Funciones auxiliares compartidas
│   ├── auth-helpers.ts     # Login, logout, registro
│   └── common-helpers.ts   # Utilidades generales
├── auth/                   # Autenticación y usuarios
│   └── authentication.spec.ts
├── events/                 # Gestión de eventos
│   ├── events-management.spec.ts
│   └── functions-reports.spec.ts
├── tickets/                # Gestión de tickets
│   ├── tickets-configuration.spec.ts
│   └── my-tickets.spec.ts
├── purchases/              # Compras
│   └── ticket-purchase.spec.ts
└── admin/                  # Administración
    └── user-management.spec.ts
```

## 📋 Historias de Usuario Cubiertas

### ✅ Autenticación (`auth/authentication.spec.ts`)
- ✓ Registrarme como cliente
- ✓ Registrarme como organizador
- ✓ Login con credenciales válidas (cliente/organizador)
- ✓ Ver y actualizar mi perfil
- ✓ Cerrar sesión
- ✓ Control de acceso (sin autenticación / roles incorrectos)

### ✅ Eventos - Cliente (`events/events-management.spec.ts`)
- ✓ Observar eventos futuros - Listar
- ✓ Buscar eventos por nombre
- ✓ Filtrar eventos por fecha
- ✓ Ver detalles de un evento

### ✅ Eventos - Organizador (`events/events-management.spec.ts`)
- ✓ Listar mis eventos
- ✓ Crear nuevo evento
- ✓ Editar evento existente
- ✓ Filtrar eventos por estado
- ✓ Ver detalles de mi evento

### ✅ Tarifas y Zonas (`tickets/tickets-configuration.spec.ts`)
- ✓ Configurar tarifas por zona (crear/modificar/eliminar)
- ✓ Registrar precios por combinación (tipo, zona, etapa)
- ✓ Listar tarifas de un evento

### ✅ Tipos de Tickets (`tickets/tickets-configuration.spec.ts`)
- ✓ Registrar tipo General
- ✓ Registrar tipo VIP
- ✓ Modificar tipos existentes
- ✓ Eliminar tipos

### ✅ Compra de Tickets (`purchases/ticket-purchase.spec.ts`)
- ✓ Flujo completo de compra
- ✓ Seleccionar tipo de ticket (General/VIP)
- ✓ Seleccionar cantidad de tickets
- ✓ Ver resumen antes de confirmar
- ✓ Recibir tickets en la plataforma
- ✓ Validaciones (cantidad mínima, etc.)

### ✅ Mis Tickets (`tickets/my-tickets.spec.ts`)
- ✓ Listar tickets próximos propios
- ✓ Filtrar por fecha
- ✓ Ver detalles de ticket
- ✓ Verificar información (número, QR, estado)
- ✓ Descargar ticket (PDF/QR)
- ✓ Agrupar por evento
- ✓ Buscar tickets

### ✅ Gestión de Usuarios - Admin (`admin/user-management.spec.ts`)
- ✓ Listar todos los usuarios
- ✓ Filtrar por rol y estado
- ✓ Buscar usuario por correo
- ✓ Agregar nuevo usuario
- ✓ Modificar usuario existente
- ✓ Deshabilitar usuario
- ✓ Reactivar usuario
- ✓ Actualizar comisión

### ✅ Funciones (`events/functions-reports.spec.ts`)
- ✓ Registrar nueva función
- ✓ Modificar función existente
- ✓ Eliminar función
- ✓ Listar funciones de un evento

### ✅ Reportes - Organizador (`events/functions-reports.spec.ts`)
- ✓ Obtener listado de inscritos
- ✓ Exportar lista de inscritos
- ✓ Listar tickets vendidos por función
- ✓ Filtrar ventas por zona
- ✓ Ver gráficos de ventas
- ✓ Ver ingresos totales

## 🚀 Cómo Ejecutar las Pruebas

### Prerrequisitos

1. **Instalar dependencias** (solo primera vez):
```bash
cd Frontend/tickify-frontend
npm ci
npx playwright install --with-deps
```

2. **Configurar variables de entorno**:

**PowerShell:**
```powershell
$env:BACKEND_API = "http://localhost:8000"
$env:PLAYWRIGHT_BASE_URL = "http://localhost:5173"
```

**Bash:**
```bash
export BACKEND_API="http://localhost:8000"
export PLAYWRIGHT_BASE_URL="http://localhost:5173"
```

3. **Levantar backend y frontend**:
```bash
# Terminal 1 - Backend
cd Backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd Frontend/tickify-frontend
npm run dev
```

### Ejecutar Pruebas

**Todas las pruebas:**
```bash
npx playwright test
```

**Por módulo:**
```bash
# Autenticación
npx playwright test test/e2e/auth

# Eventos
npx playwright test test/e2e/events

# Tickets
npx playwright test test/e2e/tickets

# Compras
npx playwright test test/e2e/purchases

# Admin
npx playwright test test/e2e/admin
```

**Prueba específica:**
```bash
npx playwright test test/e2e/auth/authentication.spec.ts
```

**Con interfaz visible (headed):**
```bash
npx playwright test --headed
```

**En un navegador específico:**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=edge
```

**Modo secuencial (recomendado para desarrollo):**
```bash
npx playwright test --workers=1
```

**Con UI interactiva:**
```bash
npx playwright test --ui
```

## 📊 Ver Reportes

Después de ejecutar las pruebas:

```bash
npx playwright show-report
```

Esto abrirá un reporte HTML con:
- Resumen de pruebas (pasadas/fallidas)
- Screenshots de fallos
- Videos de ejecución
- Trazas de errores

## 🔧 Helpers Disponibles

### `auth-helpers.ts`
- `generateUniqueEmail(prefix)` - Genera email único
- `generatePhone()` - Genera teléfono válido
- `loginViaUI(page, email, password)` - Login por UI
- `logoutViaUI(page)` - Logout por UI
- `registerViaUI(page, user)` - Registro por UI
- `expectAuthenticated(page)` - Verifica autenticación
- `expectNotAuthenticated(page)` - Verifica no autenticación
- `clearStorage(page)` - Limpia localStorage
- `getCurrentUser(page)` - Obtiene usuario actual
- `setAuthToken(page, token, user)` - Set token directo

### `common-helpers.ts`
- `waitForLoading(page)` - Espera fin de carga
- `waitForElementToDisappear(page, selector)` - Espera desaparición
- `generateFutureDate(daysFromNow)` - Genera fecha futura
- `generateTime(hour, minute)` - Genera hora
- `generatePrice(min, max)` - Genera precio aleatorio
- `waitForAPIResponse(page, urlPattern)` - Espera respuesta API
- `takeScreenshot(page, name)` - Toma screenshot
- `clickButtonByText(page, text)` - Click en botón por texto

## 👥 Usuarios de Prueba

Asegúrate de tener estos usuarios en la base de datos:

```javascript
// Cliente
email: 'cliente@test.com'
password: 'cliente123'

// Organizador
email: 'organizador@test.com'
password: 'org123'

// Admin
email: 'admin@test.com'
password: 'admin123'
```

## 🐛 Troubleshooting

### Las pruebas fallan con "timeout"
- Verifica que backend y frontend estén corriendo
- Aumenta los timeouts en `playwright.config.ts`
- Ejecuta en modo `--headed` para ver qué está pasando

### Error "No se encontró elemento"
- Los selectores pueden cambiar según la implementación del frontend
- Revisa los `data-testid` en los componentes
- Usa `page.pause()` para debuggear

### Pruebas pasan localmente pero fallan en CI
- Verifica las variables de entorno
- Asegúrate de que la BD tiene datos de prueba
- Revisa los logs del CI

## 📝 Convenciones

### Nombres de Pruebas
- Usar formato: `HU: [Historia de Usuario] - [Acción específica]`
- Ejemplo: `HU: Comprar tickets - Flujo completo de compra exitosa`

### Estructura de Prueba
```typescript
test('HU: Descripción de la historia', async ({ page }) => {
  // 1. Setup/navegación
  await page.goto('/ruta');
  
  // 2. Acción principal
  await page.click('button');
  
  // 3. Verificación (expect)
  await expect(page.getByText('éxito')).toBeVisible();
});
```

### Selectores Preferidos (en orden)
1. `data-testid` - Más estable
2. `role` con `name` - Semántico
3. `label` - Para formularios
4. `text` - Último recurso

## 🔄 Actualización de Pruebas

Cuando agregues nuevas funcionalidades:

1. Crea un nuevo archivo `.spec.ts` en la carpeta correspondiente
2. Usa los helpers existentes
3. Sigue las convenciones de nombres
4. Actualiza este README con la nueva historia de usuario
5. Ejecuta todas las pruebas para verificar que no rompiste nada

## 📈 Métricas

Total de archivos de prueba: **7**
Total de historias de usuario cubiertas: **50+**
Cobertura de módulos: **100%**

## 🎯 Próximos Pasos

- [ ] Agregar pruebas de integración con pagos
- [ ] Pruebas de rendimiento
- [ ] Pruebas de accesibilidad
- [ ] Pruebas en móviles (viewport)
- [ ] Pruebas de internacionalización

---

**Nota:** Estas pruebas E2E son complementarias a las pruebas unitarias y de integración. Se recomienda ejecutarlas antes de cada deploy.
