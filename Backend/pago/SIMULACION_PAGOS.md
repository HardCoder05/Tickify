# Simulación de Pagos - Testing Local

## Endpoint de Simulación

**POST** `/api/v1/pagos/simular`

Este endpoint permite simular el procesamiento de pagos sin necesidad de integración con pasarelas reales. Útil para testing y desarrollo local.

## Request Body

```json
{
  "compra_id": 123,
  "metodo_pago": "simulado",
  "monto": 108.00,
  "aprobado": true
}
```

### Parámetros

- `compra_id` (int, required): ID de la compra a pagar
- `metodo_pago` (str, optional): Método de pago. Default: "simulado"
- `monto` (float, required): Monto del pago
- `aprobado` (bool, optional): 
  - `true` → Simula pago exitoso (compra pasa a estado "pagada")
  - `false` → Simula pago fallido (compra pasa a estado "fallida")
  - Default: `true`

**Nota:** La referencia de transacción se genera automáticamente (formato: `SIM-XXXXXXXXXX`)

## Ejemplos de Uso

### 1. Simular Pago Exitoso

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/pagos/simular" \
  -H "Content-Type: application/json" \
  -d '{
    "compra_id": 123,
    "monto": 108.00,
    "aprobado": true
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": 456,
  "compra_id": 123,
  "monto": 108.00,
  "metodo_pago": "simulado",
  "fecha_pago": "2025-01-27T10:30:00",
  "numero_de_transaccion": "SIM-A7B9C3D2E1",
  "estado": "exitoso"
}
```

**Efecto:** 
- Se crea un pago con estado "exitoso"
- La compra #123 cambia a estado "pagada"

---

### 2. Simular Pago Fallido

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/pagos/simular" \
  -H "Content-Type: application/json" \
  -d '{
    "compra_id": 124,
    "monto": 50.00,
    "aprobado": false,
    "metodo_pago": "tarjeta_rechazada"
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": 457,
  "compra_id": 124,
  "monto": 50.00,
  "metodo_pago": "tarjeta_rechazada",
  "fecha_pago": "2025-01-27T10:35:00",
  "numero_de_transaccion": "SIM-X1Y2Z3A4B5",
  "estado": "fallido"
}
```

**Efecto:**
- Se crea un pago con estado "fallido"
- La compra #124 cambia a estado "fallida"

---

### 3. Simular con diferentes métodos de pago

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/pagos/simular" \
  -H "Content-Type: application/json" \
  -d '{
    "compra_id": 125,
    "monto": 200.00,
    "aprobado": true,
    "metodo_pago": "yape"
  }'
```

---

## Validaciones

El endpoint valida:
- ✓ La compra debe existir
- ✓ La compra no puede estar ya pagada
- ✓ El monto debe ser positivo

## Errores Comunes

### 400 - Compra no encontrada
```json
{
  "detail": "Compra no encontrada"
}
```

### 400 - Compra ya pagada
```json
{
  "detail": "La compra ya está pagada"
}
```

---

## Flujo Completo de Prueba

1. Crear una compra:
```bash
POST /api/v1/compras/
```

2. Obtener el ID de la compra creada (ej: 123)

3. Simular el pago:
```bash
POST /api/v1/pagos/simular
{
  "compra_id": 123,
  "monto": 108.00,
  "aprobado": true
}
```

4. Verificar que la compra cambió de estado:
```bash
GET /api/v1/compras/123
```

---

## Notas Técnicas

- **Para pagos exitosos:** se usa el stored procedure `sp_procesar_pago` (igual que el endpoint real `/api/v1/pagos/`)
- **Para pagos fallidos:** se crea el registro de pago directamente con estado "fallido" y se actualiza la compra
- La referencia se genera automáticamente en formato `SIM-XXXXXXXXXX` (10 caracteres alfanuméricos aleatorios) y se guarda en el campo `numero_de_transaccion`
- El endpoint está disponible en el mismo router de pagos bajo `/api/v1/pagos/simular`

---

## Swagger UI

Puedes probar este endpoint desde la interfaz interactiva:

**http://127.0.0.1:8000/docs#/pagos/simular_pago_endpoint_api_v1_pagos_simular_post**
