# Ejecución de Casos de Prueba (Backend)

Este documento describe cómo ejecutar los casos de prueba del backend ubicados en `CasosDePrueba/tests/backend`.

## Script de Ejecución

Se ha creado un script `run_cp_backend.sh` en la raíz del proyecto para facilitar la ejecución. Este script se encarga de:
1. Crear y configurar un entorno virtual (`venv_test`) si no existe.
2. Instalar las dependencias necesarias desde `Backend/requirements.txt`.
3. Configurar el `PYTHONPATH` para incluir el código del Backend.
4. Ejecutar los tests con `pytest`.

## Uso

### Ejecutar todos los tests
```bash
./run_cp_backend.sh
```

### Ejecutar un archivo específico
```bash
./run_cp_backend.sh CasosDePrueba/tests/backend/test_cp_complementarios.py
```

## Estado de los Tests
## Historial de Ejecución

### Ejecución Remota (2025-11-26)
**Entorno:** `https://tickify.duckdns.org`
**Estado:** Parcialmente Exitoso

**Resumen:**
- Se ejecutaron los tests contra el entorno de producción/remoto.
- **Tests Pasados:** 78
- **Tests Fallidos:** 6
- **Tests Skipped:** 38

**Fallos Conocidos (Backend Bugs en Remoto):**
1. **Capacidad Negativa:** El backend remoto permite crear eventos con capacidad negativa (CP-12).
2. **Campos Vacíos:** El backend remoto permite crear tipos de ticket con campos vacíos (CP-23).
3. **Contraseña Débil:** No se valida la complejidad de la contraseña en el registro (CP-03).
4. **Estado Inválido:** Se permite cambiar a estados no válidos (CP-70).

**Fallos de Configuración/Datos:**
1. **Listado de Tickets (CP-110):** Falla con 403 Forbidden. Probable desincronización entre el ID del usuario en el token (generado localmente) y el ID real en la base de datos remota.
2. **Validación de Tickets (CP-41):** Falla con 404 Not Found. El endpoint de validación por QR no parece estar desplegado en el servidor remoto.

**Notas:**
- Las correcciones aplicadas localmente (`Backend/events/services/EventoServicios.py`, `Backend/tickets/routes/Tickets.py`) **NO** están reflejadas en el servidor remoto, por lo que los tests que verifican estas correcciones fallan.
- Se corrigieron los scripts de prueba (`test_cp_avanzados.py`) para usar los parámetros de consulta correctos (`fecha_inicio`/`fecha_fin`), lo que solucionó CP-106.

## Solución de Problemas

Si encuentras errores de conexión a la base de datos, asegúrate de que la base de datos esté corriendo y las credenciales en `.env` (o variables de entorno) sean correctas.
