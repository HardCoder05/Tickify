# 🎫 API Endpoints - Sistema Tickify

## 📋 Resumen de Funcionalidades Implementadas

### 🔐 **Autenticación y Usuarios**
- `POST /api/v1/login` - Iniciar sesión
- `GET /api/v1/usuarios/` - Listar usuarios
- `POST /api/v1/usuarios/` - Crear usuario
- `GET /api/v1/usuarios/{id}` - Obtener usuario por ID
- `PUT /api/v1/usuarios/{id}` - Actualizar usuario
- `DELETE /api/v1/usuarios/{id}` - Eliminar usuario

### 🎪 **Eventos**
- `POST /api/v1/eventos/` - Crear evento
- `GET /api/v1/eventos/` - Listar eventos (con filtros: estado, organizador_id)
- `GET /api/v1/eventos/{id}` - Obtener evento por ID
- `GET /api/v1/eventos/organizador/{id}` - Eventos por organizador
- `PUT /api/v1/eventos/{id}` - Actualizar evento
- `DELETE /api/v1/eventos/{id}` - Eliminar evento

### 📅 **Fechas de Eventos (Múltiples Fechas)**
- `POST /api/v1/eventos-fechas/` - Crear fecha para evento
- `GET /api/v1/eventos-fechas/` - Listar fechas (con filtros: evento_id, estado)
- `GET /api/v1/eventos-fechas/evento/{evento_id}` - Fechas de un evento específico
- `GET /api/v1/eventos-fechas/{fecha_id}` - Obtener fecha específica
- `PUT /api/v1/eventos-fechas/{fecha_id}` - Actualizar fecha
- `PUT /api/v1/eventos-fechas/{fecha_id}/aforo` - Actualizar aforo disponible
- `DELETE /api/v1/eventos-fechas/{fecha_id}` - Eliminar fecha

### 🎫 **Tickets**
- `GET /api/v1/tickets/usuario/{usuario_id}` - **Tickets de un usuario con detalles completos**
- `GET /api/v1/tickets/{ticket_id}` - Obtener ticket específico con detalles
- `POST /api/v1/tickets/` - Crear nuevo ticket
- `GET /api/v1/tickets/compra/{compra_id}` - Tickets por compra
- `PUT /api/v1/tickets/{ticket_id}/estado` - Actualizar estado del ticket

### 🛒 **Compras**
- `POST /api/v1/compras/` - Crear nueva compra
- `GET /api/v1/compras/` - Listar compras (con filtros: usuario_id, estado)
- `GET /api/v1/compras/usuario/{usuario_id}` - **Compras de un usuario con tickets**
- `GET /api/v1/compras/{compra_id}` - Obtener compra específica con tickets
- `GET /api/v1/compras/codigo/{codigo}` - Buscar compra por código de confirmación
- `PUT /api/v1/compras/{compra_id}/estado` - Actualizar estado de compra

## 🚀 **Funcionalidades Clave Implementadas**

### ✅ **Para Usuarios - Ver sus Tickets Comprados**
```bash
# Obtener todos los tickets de un usuario con detalles completos
GET /api/v1/tickets/usuario/123

# Respuesta incluye:
# - Información del ticket (número, estado, precio)
# - Detalles del evento (nombre, fechas)
# - Información de la zona y tarifa
# - Estado de la compra
```

### ✅ **Para Eventos - Múltiples Fechas**
```bash
# Crear un evento con múltiples fechas
POST /api/v1/eventos/                    # Crear evento principal
POST /api/v1/eventos-fechas/             # Agregar fechas específicas

# Ejemplo de uso:
# 1. Crear evento "Concierto de Verano"
# 2. Agregar fecha: 2025-11-10 18:00-23:00
# 3. Agregar fecha: 2025-11-11 18:00-23:00
```

### ✅ **Sistema de Compras Completo**
```bash
# Flujo completo de compra:
# 1. Crear compra
POST /api/v1/compras/
# 2. Crear tickets para la compra
POST /api/v1/tickets/
# 3. Usuario puede ver sus compras y tickets
GET /api/v1/compras/usuario/123
GET /api/v1/tickets/usuario/123
```

## 🔧 **Validaciones Implementadas**

### **Eventos:**
- Fechas de inicio < fechas de fin
- Capacidad máxima > 0
- Estados válidos: 'activo', 'inactivo', 'cancelado'

### **Fechas de Eventos:**
- Fechas válidas
- Capacidad coherente
- Aforo disponible ≤ capacidad máxima

### **Tickets:**
- Números únicos generados automáticamente
- Códigos QR únicos
- Estados válidos: 'valido', 'anulado', 'usado'

### **Compras:**
- Montos coherentes (total ≥ subtotal)
- Códigos de confirmación únicos
- Estados válidos: 'pendiente', 'pagada', 'cancelada'

## 📊 **Modelos de Base de Datos Creados**

- ✅ `EventoFecha` - Para múltiples fechas por evento
- ✅ `Compra` - Para manejar compras de tickets
- ✅ `Ticket` - Para tickets individuales
- ✅ `Tarifa` - Para tarifas por zona
- ✅ `Zona` - Para zonas de eventos

## 🎯 **Casos de Uso Principales**

1. **Usuario compra tickets** → Ve sus compras y tickets
2. **Organizador crea evento** → Agrega múltiples fechas
3. **Sistema maneja aforo** → Control de disponibilidad por fecha
4. **Gestión de estados** → Tickets, compras, eventos, fechas


