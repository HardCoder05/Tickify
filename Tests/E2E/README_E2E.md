# Pruebas E2E - End-to-End Testing

## Descripción

Las pruebas E2E (End-to-End) son pruebas integrales que verifican el flujo completo del sistema desde la perspectiva del usuario. Cubren todas las historias de usuario del proyecto Tickify, validando la interacción entre frontend, backend y base de datos.

### Alcance de las Pruebas E2E

Las pruebas E2E cubren **67+ tests** organizados en **7 módulos principales**:

## Módulos de Pruebas

### 1. Autenticación (12 tests)
- **Registro**: Cliente y Organizador
- **Login**: Diferentes roles (Cliente, Organizador, Admin)
- **Gestión de Perfil**: Ver y actualizar información
- **Logout**: Cerrar sesión correctamente
- **Control de Acceso**: Verificación de permisos por rol

### 2. Eventos - Gestión (10 tests)
- **Listar eventos**: Ver eventos disponibles
- **Buscar eventos**: Por nombre o criterios
- **Filtrar eventos**: Por fecha y estado
- **Crear eventos**: Como organizador
- **Editar eventos**: Modificar información
- **Eliminar eventos**: Borrar eventos propios
- **Ver detalles**: Información completa del evento

### 3. Eventos - Funciones y Reportes (10 tests)
- **Gestionar funciones**: Crear, editar, eliminar
- **Listar funciones**: Ver funciones de evento
- **Lista de inscritos**: Ver participantes
- **Exportar inscritos**: Descargar listado
- **Reportes de ventas**: Por función y zona
- **Gráficos**: Visualización de ingresos
- **Estadísticas**: Métricas de ventas

### 4. Tickets - Configuración (9 tests)
- **Tipos de tickets**: Crear General, VIP, etc.
- **Tarifas por zona**: Configurar precios
- **Precios por combinación**: Tipo + Zona + Etapa
- **Modificar tipos**: Editar configuración
- **Eliminar tipos**: Borrar tipos de ticket

### 5. Tickets - Mis Tickets (9 tests)
- **Listar tickets**: Ver tickets propios próximos
- **Filtrar tickets**: Por fecha
- **Ver detalles**: Información del ticket
- **Descargar**: PDF y código QR
- **Agrupar tickets**: Organizar por evento
- **Buscar tickets**: Búsqueda rápida
- **Estado del ticket**: Verificar validez

### 6. Compras (7 tests)
- **Flujo de compra**: Proceso completo
- **Seleccionar tipo**: General o VIP
- **Seleccionar cantidad**: Número de tickets
- **Resumen de compra**: Verificar total
- **Recibir tickets**: Post-compra
- **Validaciones**: Restricciones de compra

### 7. Administración (10 tests)
- **Listar usuarios**: Ver todos los usuarios
- **Filtrar por rol**: Admin, Organizador, Cliente
- **Filtrar por estado**: Activo, Inactivo
- **Buscar usuarios**: Por nombre o email
- **Agregar usuario**: Crear nuevos
- **Modificar usuario**: Editar información
- **Eliminar usuario**: Borrar usuarios
- **Deshabilitar/Reactivar**: Gestión de estado
- **Actualizar comisión**: Configurar comisiones
- **Control de acceso**: Solo Admin

## Estadísticas

- **Total de tests**: 67+
- **Módulos cubiertos**: 7
- **Historias de usuario**: 18/18 (100%)
- **Cobertura de roles**: Cliente, Organizador, Admin
- **Tipos de prueba**: Happy path, validaciones, control de acceso

## Comandos de Ejecución

### Ejecutar todas las pruebas E2E

```bash
cd Tests
npx playwright test E2E --project=chromium
```

### Ejecutar por módulo

```bash
# Autenticación
npx playwright test E2E/auth

# Eventos
npx playwright test E2E/events

# Tickets
npx playwright test E2E/tickets

# Compras
npx playwright test E2E/purchases

# Administración
npx playwright test E2E/admin
```

### Modo interactivo con UI

```bash
cd Tests
npx playwright test E2E --ui
```

### Generar reporte PDF

```bash
python scripts/generate_e2e_report_pdf.py
```

## Historial de Ejecución

### Última Ejecución

**Tipo de Pruebas:** E2E (End-to-End) - Pruebas integrales del sistema

**Cobertura Completa:**

**Módulo Autenticación (12 tests)**
- ✅ Registro de cliente y organizador
- ✅ Login con diferentes roles
- ✅ Gestión de perfil de usuario
- ✅ Logout y control de sesión
- ✅ Validación de acceso por rol

**Módulo Eventos (20 tests)**
- ✅ Listar y buscar eventos
- ✅ Crear, editar y eliminar eventos
- ✅ Gestionar funciones de eventos
- ✅ Exportar lista de inscritos
- ✅ Ver reportes y gráficos de ventas

**Módulo Tickets (18 tests)**
- ✅ Configurar tipos y tarifas
- ✅ Gestionar precios por zona
- ✅ Listar tickets propios
- ✅ Descargar tickets (PDF/QR)
- ✅ Filtrar y buscar tickets

**Módulo Compras (7 tests)**
- ✅ Flujo completo de compra
- ✅ Selección de tipo y cantidad
- ✅ Validaciones de compra
- ✅ Recepción de tickets

**Módulo Administración (10 tests)**
- ✅ Gestión completa de usuarios
- ✅ Filtros por rol y estado
- ✅ Actualización de comisiones
- ✅ Control de acceso administrativo

**Objetivo:** Validar que todos los flujos críticos del sistema funcionen correctamente end-to-end con integración completa de frontend, backend y base de datos.

**Estado:** Las pruebas E2E cubren el 100% de las historias de usuario del proyecto y validan todos los flujos principales del sistema Tickify.

**Requisitos:**
- Backend corriendo en `http://localhost:8000`
- Frontend corriendo en `http://localhost:5173`
- Base de datos con usuarios de prueba configurados
