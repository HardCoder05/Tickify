# 📋 Mapeo de Pruebas E2E con Historias de Usuario

**Fecha:** 4 de noviembre de 2025  
**Versión:** 1.0  
**Proyecto:** Sistema Tickify - Gestión de Tickets para Eventos

---

## 📊 RESUMEN EJECUTIVO

### Estado de Cobertura
- **✅ Historias con Pruebas Implementadas:** 13
- **⏳ Historias con Pruebas Pendientes (`.skip`):** 28+
- **❌ Historias sin Pruebas:** ~15
- **📈 Cobertura Actual Activa:** ~23%
- **📈 Cobertura Total (si se activan `.skip`):** ~70%

---

## 🎯 MÓDULO 1: AUTENTICACIÓN Y REGISTRO

### ✅ IMPLEMENTADAS Y ACTIVAS (13 pruebas - 100% pasando)

| # | Historia de Usuario | Test E2E | Archivo | Estado | Prioridad |
|---|---------------------|----------|---------|--------|-----------|
| **HU-001** | Como **usuario nuevo**, quiero **registrarme como cliente** para poder **comprar tickets** | ✅ `Registrarme como cliente - Registro exitoso con datos válidos` | `auth/authentication.spec.ts:18` | ✅ PASANDO | ALTA |
| **HU-002** | Como **usuario nuevo**, quiero **registrarme como organizador** para poder **crear eventos** | ✅ `Registrarme como organizador - Registro exitoso` | `auth/authentication.spec.ts:83` | ✅ PASANDO | ALTA |
| **HU-003** | Como **sistema**, quiero **validar que las contraseñas coincidan** para **garantizar seguridad** | ✅ `Registro - Debe mostrar error con contraseñas que no coinciden` | `auth/authentication.spec.ts:33` | ✅ PASANDO | ALTA |
| **HU-004** | Como **sistema**, quiero **validar el formato del email** para **mantener datos consistentes** | ✅ `Registro - Debe mostrar error con email inválido` | `auth/authentication.spec.ts:56` | ✅ PASANDO | ALTA |
| **HU-005** | Como **cliente registrado**, quiero **iniciar sesión con mis credenciales** para **acceder al sistema** | ✅ `Login - Cliente con credenciales válidas` | `auth/authentication.spec.ts:106` | ✅ PASANDO | ALTA |
| **HU-006** | Como **organizador registrado**, quiero **iniciar sesión** para **gestionar mis eventos** | ✅ `Login - Organizador con credenciales válidas` | `auth/authentication.spec.ts:116` | ✅ PASANDO | ALTA |
| **HU-007** | Como **sistema**, quiero **mostrar error con credenciales incorrectas** para **proteger cuentas** | ✅ `Login - Debe mostrar error con credenciales incorrectas` | `auth/authentication.spec.ts:126` | ✅ PASANDO | ALTA |
| **HU-008** | Como **sistema**, quiero **validar campos requeridos en login** para **garantizar datos completos** | ✅ `Login - Debe mostrar error con campos vacíos` | `auth/authentication.spec.ts:140` | ✅ PASANDO | ALTA |
| **HU-009** | Como **usuario autenticado**, quiero **cerrar sesión** para **proteger mi cuenta** | ✅ `Logout - Cerrar sesión correctamente` | `auth/authentication.spec.ts:156` | ✅ PASANDO | ALTA |
| **HU-010** | Como **usuario autenticado**, quiero **ver mi perfil** para **revisar mi información** | ✅ `Ver mi perfil - Acceder y ver información del usuario` | `auth/authentication.spec.ts:178` | ✅ PASANDO | ALTA |
| **HU-011** | Como **usuario autenticado**, quiero **visualizar mis datos de perfil** para **confirmar mi información** | ✅ `Perfil - Actualizar información del usuario` | `auth/authentication.spec.ts:199` | ✅ PASANDO | MEDIA |
| **HU-012** | Como **sistema**, quiero **proteger rutas privadas** para **garantizar seguridad** | ✅ `No debe permitir acceder a perfil sin autenticación` | `auth/authentication.spec.ts:225` | ✅ PASANDO | ALTA |
| **HU-013** | Como **sistema**, quiero **control de acceso por roles** para **separar funcionalidades** | ✅ `No debe permitir acceder a área de organizador siendo cliente` | `auth/authentication.spec.ts:233` | ✅ PASANDO | ALTA |

**Notas:**
- ✅ **13/13 pruebas pasando (100%)**
- Auto-login implementado después del registro
- RUC único generado para organizadores
- Ejecutar con `--workers=1` para evitar race conditions

---

## 🎪 MÓDULO 2: GESTIÓN DE EVENTOS

### ⏳ IMPLEMENTADAS PERO DESHABILITADAS (`.skip`) - 11 pruebas

| # | Historia de Usuario | Test E2E | Archivo | Estado | Prioridad | Razón Skip |
|---|---------------------|----------|---------|--------|-----------|------------|
| **HU-014** | Como **cliente**, quiero **ver eventos futuros** para **encontrar eventos de mi interés** | ⏳ `Observar eventos futuros - Listar eventos disponibles` | `events/events-management.spec.ts:11` | ⏸️ SKIP | ALTA | Ajustar según implementación |
| **HU-015** | Como **cliente**, quiero **buscar eventos por nombre** para **encontrar eventos específicos** | ⏳ `Observar eventos futuros - Buscar eventos por nombre` | `events/events-management.spec.ts:24` | ⏸️ SKIP | ALTA | Ajustar selectores |
| **HU-016** | Como **cliente**, quiero **filtrar eventos por fecha** para **planificar asistencia** | ⏳ `Observar eventos futuros - Filtrar por fecha` | `events/events-management.spec.ts:42` | ⏸️ SKIP | MEDIA | Ajustar selectores |
| **HU-017** | Como **cliente**, quiero **ver detalles de un evento** para **conocer información completa** | ⏳ `Observar eventos - Ver detalles de un evento` | `events/events-management.spec.ts:63` | ⏸️ SKIP | ALTA | Ajustar URL pattern |
| **HU-018** | Como **organizador**, quiero **listar mis eventos** para **gestionar mi portafolio** | ⏳ `Gestionar Eventos - Listar mis eventos como organizador` | `events/events-management.spec.ts:82` | ⏸️ SKIP | ALTA | Verificar ruta organizador |
| **HU-019** | Como **organizador**, quiero **crear un nuevo evento** para **ofrecer tickets** | ⏳ `Gestionar Eventos - Crear nuevo evento` | `events/events-management.spec.ts:95` | ⏸️ SKIP | ALTA | Ajustar formulario |
| **HU-020** | Como **organizador**, quiero **editar un evento** para **actualizar información** | ⏳ `Gestionar Eventos - Editar evento existente` | `events/events-management.spec.ts:140` | ⏸️ SKIP | ALTA | Ajustar formulario |
| **HU-021** | Como **organizador**, quiero **filtrar eventos por estado** para **organizar gestión** | ⏳ `Gestionar Eventos - Filtrar mis eventos por estado` | `events/events-management.spec.ts:159` | ⏸️ SKIP | MEDIA | Ajustar filtros |
| **HU-022** | Como **organizador**, quiero **ver detalles de mi evento** para **revisar configuración** | ⏳ `Gestionar Eventos - Ver detalles de mi evento` | `events/events-management.spec.ts:176` | ⏸️ SKIP | MEDIA | Ajustar navegación |

**Acciones Requeridas:**
1. Revisar selectores según implementación actual
2. Verificar rutas de eventos (`/eventos`, `/evento/:id`, `/organizerEvent`)
3. Ajustar formularios de creación/edición
4. Validar filtros y búsquedas
5. Quitar `.skip` cuando estén listos

---

## 🎫 MÓDULO 3: MIS TICKETS (CLIENTE)

### ⏳ IMPLEMENTADAS PERO DESHABILITADAS (`.skip`) - 8 pruebas

| # | Historia de Usuario | Test E2E | Archivo | Estado | Prioridad | Razón Skip |
|---|---------------------|----------|---------|--------|-----------|------------|
| **HU-023** | Como **cliente**, quiero **ver mis tickets comprados** para **gestionar mis entradas** | ⏳ `Listar tickets próximos - Ver mis tickets comprados` | `tickets/my-tickets.spec.ts:15` | ⏸️ SKIP | ALTA | Ruta `/mis-tickets` |
| **HU-024** | Como **cliente**, quiero **filtrar tickets por fecha** para **ver eventos próximos** | ⏳ `Listar tickets próximos - Filtrar por fecha` | `tickets/my-tickets.spec.ts:39` | ⏸️ SKIP | MEDIA | Implementar filtros |
| **HU-025** | Como **cliente**, quiero **ver detalles de un ticket** para **revisar información** | ⏳ `Ver detalles de ticket - Abrir modal/página de detalles` | `tickets/my-tickets.spec.ts:57` | ⏸️ SKIP | ALTA | Modal o página |
| **HU-026** | Como **cliente**, quiero **verificar información del ticket** para **confirmar compra** | ⏳ `Ver ticket - Verificar información del ticket` | `tickets/my-tickets.spec.ts:79` | ⏸️ SKIP | ALTA | Campos visibles |
| **HU-027** | Como **cliente**, quiero **descargar mi ticket** para **tenerlo offline** | ⏳ `Descargar ticket - Opción de descarga PDF/QR` | `tickets/my-tickets.spec.ts:99` | ⏸️ SKIP | ALTA | Generar PDF/QR |
| **HU-028** | Como **cliente**, quiero **ver tickets agrupados por evento** para **mejor organización** | ⏳ `Mis Tickets - Agrupar por evento` | `tickets/my-tickets.spec.ts:122` | ⏸️ SKIP | MEDIA | Implementar agrupación |
| **HU-029** | Como **cliente**, quiero **ver el estado del ticket** para **saber si es válido** | ⏳ `Mis Tickets - Mostrar estado del ticket (válido/usado/cancelado)` | `tickets/my-tickets.spec.ts:139` | ⏸️ SKIP | ALTA | Badge de estado |
| **HU-030** | Como **cliente**, quiero **buscar tickets por evento** para **encontrarlos rápidamente** | ⏳ `Mis Tickets - Buscar tickets por nombre de evento` | `tickets/my-tickets.spec.ts:154` | ⏸️ SKIP | MEDIA | Barra de búsqueda |

**Acciones Requeridas:**
1. Implementar ruta `/mis-tickets`
2. Crear componentes de ticket card
3. Implementar descarga de PDF/QR
4. Agregar filtros y búsqueda
5. Mostrar estados (válido, usado, anulado)

---

## 🛒 MÓDULO 4: COMPRA DE TICKETS

### ⏳ IMPLEMENTADAS PERO DESHABILITADAS (`.skip`) - 7 pruebas

| # | Historia de Usuario | Test E2E | Archivo | Estado | Prioridad | Razón Skip |
|---|---------------------|----------|---------|--------|-----------|------------|
| **HU-031** | Como **cliente**, quiero **comprar tickets** para **asistir a eventos** | ⏳ `Comprar tickets - Flujo completo de compra exitosa` | `purchases/ticket-purchase.spec.ts:13` | ⏸️ SKIP | ALTA | Flujo completo |
| **HU-032** | Como **cliente**, quiero **seleccionar tipo de ticket General** para **elegir ubicación** | ⏳ `Seleccionar tipo de ticket - Elegir ticket General` | `purchases/ticket-purchase.spec.ts:61` | ⏸️ SKIP | ALTA | Selector de tipos |
| **HU-033** | Como **cliente**, quiero **seleccionar tipo de ticket VIP** para **mejor experiencia** | ⏳ `Seleccionar tipo de ticket - Elegir ticket VIP` | `purchases/ticket-purchase.spec.ts:87` | ⏸️ SKIP | ALTA | Selector de tipos |
| **HU-034** | Como **cliente**, quiero **seleccionar cantidad de tickets** para **comprar para grupo** | ⏳ `Seleccionar cantidad - Comprar múltiples tickets` | `purchases/ticket-purchase.spec.ts:105` | ⏸️ SKIP | ALTA | Input cantidad |
| **HU-035** | Como **cliente**, quiero **recibir mi ticket después de comprar** para **confirmar compra** | ⏳ `Recibir ticket - Verificar que el ticket aparece después de la compra` | `purchases/ticket-purchase.spec.ts:135` | ⏸️ SKIP | ALTA | Verificar en /mis-tickets |
| **HU-036** | Como **cliente**, quiero **ver resumen antes de pagar** para **verificar compra** | ⏳ `Compra - Debe mostrar resumen antes de confirmar` | `purchases/ticket-purchase.spec.ts:165` | ⏸️ SKIP | ALTA | Página resumen |
| **HU-037** | Como **sistema**, quiero **validar cantidad mínima** para **prevenir errores** | ⏳ `Compra - No debe permitir comprar con cantidad 0` | `purchases/ticket-purchase.spec.ts:196` | ⏸️ SKIP | MEDIA | Validación |

**Acciones Requeridas:**
1. Implementar flujo de compra completo
2. Página de selección de tickets
3. Carrito de compras
4. Página de checkout/pago
5. Integración con pasarela de pagos (simulada para pruebas)
6. Generación de tickets después de pago

---

## 👨‍💼 MÓDULO 5: ADMINISTRACIÓN (ADMIN)

### ⏳ IMPLEMENTADAS PERO DESHABILITADAS (`.skip`) - 8 pruebas

| # | Historia de Usuario | Test E2E | Archivo | Estado | Prioridad | Razón Skip |
|---|---------------------|----------|---------|--------|-----------|------------|
| **HU-038** | Como **admin**, quiero **listar todos los usuarios** para **gestionar sistema** | ⏳ `Gestionar usuarios - Listar todos los usuarios` | `admin/user-management.spec.ts:15` | ⏸️ SKIP | ALTA | Ruta `/admin/usuarios` |
| **HU-039** | Como **admin**, quiero **filtrar usuarios por rol** para **encontrar específicos** | ⏳ `Gestionar usuarios - Filtrar usuarios por rol` | `admin/user-management.spec.ts:29` | ⏸️ SKIP | MEDIA | Filtro rol |
| **HU-040** | Como **admin**, quiero **filtrar usuarios por estado** para **gestionar activos/inactivos** | ⏳ `Gestionar usuarios - Filtrar usuarios por estado` | `admin/user-management.spec.ts:43` | ⏸️ SKIP | MEDIA | Filtro estado |
| **HU-041** | Como **admin**, quiero **buscar usuario por correo** para **encontrar rápidamente** | ⏳ `Gestionar usuarios - Buscar usuario por correo` | `admin/user-management.spec.ts:55` | ⏸️ SKIP | ALTA | Barra búsqueda |
| **HU-042** | Como **admin**, quiero **agregar nuevo usuario** para **crear cuentas** | ⏳ `Gestionar usuarios - Agregar nuevo usuario` | `admin/user-management.spec.ts:68` | ⏸️ SKIP | MEDIA | Modal/formulario |
| **HU-043** | Como **admin**, quiero **modificar usuario** para **actualizar datos** | ⏳ `Gestionar usuarios - Modificar usuario existente` | `admin/user-management.spec.ts:99` | ⏸️ SKIP | ALTA | Edición |
| **HU-044** | Como **admin**, quiero **deshabilitar usuario** para **suspender acceso** | ⏳ `Gestionar usuarios - Deshabilitar usuario` | `admin/user-management.spec.ts:116` | ⏸️ SKIP | ALTA | Toggle estado |
| **HU-045** | Como **admin**, quiero **reactivar usuario** para **restaurar acceso** | ⏳ `Gestionar usuarios - Reactivar usuario` | `admin/user-management.spec.ts:133` | ⏸️ SKIP | ALTA | Toggle estado |
| **HU-046** | Como **admin**, quiero **actualizar comisión** para **ajustar costos** | ⏳ `Actualizar comisión - Modificar porcentaje de comisión` | `admin/user-management.spec.ts:152` | ⏸️ SKIP | BAJA | Config sistema |

**Acciones Requeridas:**
1. Implementar dashboard de administración
2. Ruta `/admin/usuarios`
3. CRUD completo de usuarios
4. Filtros y búsqueda
5. Control de estados (activo/inactivo)
6. Configuración de sistema

---

## 🚫 MÓDULO 6: CASOS DE ERROR (ANTI-TESTS)

### ❌ PENDIENTES DE IMPLEMENTACIÓN - ~6 pruebas

Estos tests están en `test/antitest/` pero no están integrados al flujo principal:

| # | Historia de Usuario | Test Potencial | Archivo | Estado | Prioridad |
|---|---------------------|----------------|---------|--------|-----------|
| **HU-047** | Como **sistema**, quiero **rechazar credenciales inválidas** para **seguridad** | ❌ Login con credenciales incorrectas | `antitest/login.invalid_credentials.spec.ts` | ❌ NO INTEGRADO | MEDIA |
| **HU-048** | Como **sistema**, quiero **rechazar emails duplicados** para **garantizar unicidad** | ❌ Registro con email existente | `antitest/register.duplicate.api.spec.ts` | ❌ NO INTEGRADO | MEDIA |
| **HU-049** | Como **sistema**, quiero **validar email en registro** para **datos correctos** | ❌ Registro con email inválido | `antitest/register.invalid_email.ui.spec.ts` | ❌ NO INTEGRADO | MEDIA |
| **HU-050** | Como **sistema**, quiero **validar coincidencia de passwords** para **evitar errores** | ❌ Registro con passwords diferentes | `antitest/register.password_mismatch.ui.spec.ts` | ❌ NO INTEGRADO | MEDIA |
| **HU-051** | Como **sistema**, quiero **proteger perfil** para **seguridad** | ❌ Acceso a perfil sin auth | `antitest/access.profile.unauth.spec.ts` | ❌ NO INTEGRADO | ALTA |

**Nota:** Algunos de estos casos ya están cubiertos en `authentication.spec.ts`, pero existen archivos separados en `antitest/`.

---

## 📊 MÓDULOS ADICIONALES SIN PRUEBAS

### ❌ CONFIGURACIÓN DE TICKETS (ORGANIZADOR)

| # | Historia de Usuario | Test Requerido | Prioridad |
|---|---------------------|----------------|-----------|
| **HU-052** | Como **organizador**, quiero **crear zonas para mi evento** para **organizar ubicaciones** | ❌ Gestión de Zonas | ALTA |
| **HU-053** | Como **organizador**, quiero **definir tipos de tickets** para **diferenciar categorías** | ❌ Tipos de Tickets | ALTA |
| **HU-054** | Como **organizador**, quiero **configurar tarifas** para **establecer precios** | ❌ Gestión de Tarifas | ALTA |
| **HU-055** | Como **organizador**, quiero **crear etapas de venta** para **ventas por fases** | ❌ Etapas de Venta | MEDIA |

**Archivo Actual:** `test/e2e/tickets/tickets-configuration.spec.ts` (probablemente vacío o `.skip`)

---

### ❌ REPORTES Y ANÁLISIS (ORGANIZADOR)

| # | Historia de Usuario | Test Requerido | Prioridad |
|---|---------------------|----------------|-----------|
| **HU-056** | Como **organizador**, quiero **ver reporte de ventas** para **conocer ingresos** | ❌ Reportes de Ventas | ALTA |
| **HU-057** | Como **organizador**, quiero **ver estadísticas de asistencia** para **analizar público** | ❌ Estadísticas de Asistencia | MEDIA |
| **HU-058** | Como **organizador**, quiero **exportar reportes** para **análisis externo** | ❌ Exportar Reportes | MEDIA |

**Archivo Actual:** `test/e2e/events/functions-reports.spec.ts` (probablemente `.skip`)

---

## 📈 PLAN DE ACCIÓN RECOMENDADO

### 🎯 Fase 1: Consolidar Autenticación (COMPLETADA ✅)
**Tiempo:** Completado  
**Estado:** ✅ 13/13 pruebas pasando (100%)

- [x] Todas las pruebas de autenticación activas
- [x] Auto-login implementado
- [x] RUC único para organizadores
- [x] Control de acceso por roles

---

### 🎯 Fase 2: Activar Gestión de Eventos (PRÓXIMO)
**Tiempo Estimado:** 1-2 semanas  
**Prioridad:** ALTA

**Acciones:**
1. **Revisar implementación actual de eventos**
   - Verificar componentes existentes
   - Validar rutas (`/eventos`, `/organizerEvent`, etc.)
   - Identificar gaps de funcionalidad

2. **Actualizar pruebas E2E**
   - Ajustar selectores según UI real
   - Corregir navegación entre páginas
   - Validar formularios de creación/edición

3. **Quitar `.skip` progresivamente**
   - Empezar con "Listar eventos" (cliente)
   - Luego "Crear evento" (organizador)
   - Finalmente "Editar evento"

4. **Ejecutar y validar**
   - Objetivo: 11 pruebas de eventos pasando
   - Total acumulado: 24/41 (58%)

---

### 🎯 Fase 3: Implementar Mis Tickets (Cliente)
**Tiempo Estimado:** 2-3 semanas  
**Prioridad:** ALTA

**Requisitos Previos:**
- Flujo de compra debe funcionar (Fase 4)
- Generación de tickets después de pago

**Acciones:**
1. **Implementar ruta `/mis-tickets`**
2. **Componente TicketCard** con toda la información
3. **Sistema de descarga PDF/QR**
4. **Filtros por fecha y búsqueda**
5. **Estados de ticket** (válido, usado, anulado)

**Validación:**
- Objetivo: 8 pruebas de tickets pasando
- Total acumulado: 32/41 (78%)

---

### 🎯 Fase 4: Implementar Compra de Tickets
**Tiempo Estimado:** 3-4 semanas  
**Prioridad:** CRÍTICA (bloquea Fase 3)

**Componentes Requeridos:**
1. **Selección de Tickets**
   - Tipos de tickets (General, VIP, etc.)
   - Cantidad
   - Validación de disponibilidad

2. **Carrito de Compras**
   - Agregar/quitar tickets
   - Resumen de compra
   - Cálculo de totales

3. **Checkout/Pago**
   - Simulación de pasarela de pago
   - Validación de datos
   - Procesamiento de compra

4. **Post-Compra**
   - Generación de tickets
   - Confirmación por email (opcional)
   - Redirección a mis tickets

**Validación:**
- Objetivo: 7 pruebas de compra pasando
- Total acumulado: 39/41 (95%)

---

### 🎯 Fase 5: Administración y Configuración
**Tiempo Estimado:** 2 semanas  
**Prioridad:** MEDIA

**Componentes:**
1. Dashboard de administración
2. Gestión de usuarios (CRUD)
3. Configuración de sistema
4. Reportes básicos

**Validación:**
- Objetivo: 8+ pruebas de admin pasando
- Total acumulado: 47+ pruebas (90%+)

---

## 📋 CHECKLIST DE ACTIVACIÓN DE PRUEBAS

### Para activar una suite de pruebas `.skip`:

- [ ] **1. Revisar implementación actual**
  - Verificar que las rutas existen
  - Confirmar que los componentes están implementados
  - Validar que la funcionalidad básica funciona manualmente

- [ ] **2. Actualizar selectores**
  - Revisar IDs de elementos (`#id`)
  - Verificar clases CSS (`.class`)
  - Actualizar `data-testid` si es necesario
  - Validar roles de botones y enlaces

- [ ] **3. Ajustar navegación**
  - Corregir URLs esperadas
  - Actualizar `waitForURL` patterns
  - Verificar redirecciones

- [ ] **4. Validar datos de prueba**
  - Verificar que usuarios de prueba existen
  - Confirmar que hay datos en BD si es necesario
  - Generar datos únicos (emails, RUC, etc.)

- [ ] **5. Ejecutar localmente**
  - Ejecutar solo esa suite: `npx playwright test <archivo> --workers=1`
  - Ver errores en detalle con `--headed`
  - Revisar screenshots y videos en `test-results/`

- [ ] **6. Corregir errores**
  - Ajustar selectores
  - Corregir timing con `waitForTimeout` si es necesario
  - Actualizar aserciones

- [ ] **7. Quitar `.skip`**
  - Cambiar `test.describe.skip` → `test.describe`
  - Confirmar que pasan consistentemente
  - Ejecutar varias veces para validar estabilidad

- [ ] **8. Documentar**
  - Actualizar este documento
  - Marcar como ✅ ACTIVA
  - Actualizar % de cobertura

---

## 🎯 PRIORIZACIÓN DE HISTORIAS DE USUARIO

### CRÍTICAS (Bloquean otras funcionalidades)
1. **HU-031:** Comprar tickets (bloquea recibir tickets)
2. **HU-019:** Crear evento (bloquea todas las funciones de organizador)
3. **HU-014:** Ver eventos (bloquea búsqueda y compra)

### ALTAS (Funcionalidad core)
4. **HU-023:** Ver mis tickets
5. **HU-027:** Descargar ticket
6. **HU-017:** Ver detalles de evento
7. **HU-018:** Listar mis eventos (organizador)
8. **HU-038:** Admin - Listar usuarios

### MEDIAS (Mejoran UX)
9. **HU-015:** Buscar eventos
10. **HU-024:** Filtrar tickets por fecha
11. **HU-036:** Ver resumen de compra
12. **HU-052-055:** Configuración de tickets (organizador)

### BAJAS (Nice to have)
13. **HU-028:** Agrupar tickets por evento
14. **HU-046:** Admin - Actualizar comisión
15. **HU-056-058:** Reportes

---

## 📊 MÉTRICAS DE SEGUIMIENTO

### Actualizar semanalmente:

```markdown
## Semana del [Fecha]

| Módulo | Pruebas Activas | Pruebas `.skip` | Sin Pruebas | % Cobertura |
|--------|-----------------|-----------------|-------------|-------------|
| Autenticación | 13 | 0 | 0 | 100% |
| Eventos | 0 | 11 | 0 | 0% |
| Mis Tickets | 0 | 8 | 0 | 0% |
| Compras | 0 | 7 | 0 | 0% |
| Admin | 0 | 8 | 0 | 0% |
| Config Tickets | 0 | 0 | 4 | 0% |
| Reportes | 0 | 0 | 3 | 0% |
| **TOTAL** | **13** | **34** | **7** | **24%** |
```

---

## 📝 NOTAS FINALES

### Convenciones de Nomenclatura de Tests:
- **`HU: [Título]`** → Test que valida directamente una Historia de Usuario
- **`[Funcionalidad] - [Acción]`** → Test de funcionalidad específica
- **`Debe [acción]`** → Test de validación/error

### Configuración Recomendada de Ejecución:
```bash
# Todas las pruebas activas
npx playwright test --workers=1

# Solo autenticación
npx playwright test test/e2e/auth --workers=1

# Con UI visible (debugging)
npx playwright test --headed --workers=1

# Con reporte HTML
npx playwright test --reporter=html --workers=1
```

### Archivos de Configuración:
- **`playwright.config.ts`:** Configuración global
- **`test/e2e/helpers/`:** Helpers reutilizables
- **`test-results/`:** Screenshots y videos de pruebas
- **`playwright-report/`:** Reportes HTML

---

**Mantenido por:** Equipo de QA  
**Última actualización:** 4 de noviembre de 2025  
**Próxima revisión:** Semanal  
**Contacto:** [Tu email/Slack]
