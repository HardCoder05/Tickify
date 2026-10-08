# Pruebas de Frontend - Smoke Tests

## Descripción

Los smoke tests son pruebas rápidas y esenciales que verifican que las funcionalidades más críticas del sistema estén funcionando correctamente. Se ejecutan en cada commit/PR para detectar problemas críticos en menos de 1 minuto.

### Cobertura de Smoke Tests

Los smoke tests verifican los siguientes caminos críticos:

1. **Navegación Básica**
   - Página principal carga correctamente
   - Navbar se renderiza en todas las páginas públicas
   - Manejo de rutas inválidas (404)

2. **Autenticación**
   - Página de login es accesible
   - Formulario de login funciona correctamente
   - Login con credenciales válidas
   - Página de registro es accesible

3. **Elementos UI Críticos**
   - Verificación de elementos esenciales en cada página
   - Responsividad básica
   - No hay errores de JavaScript en consola

### Comandos de Ejecución

```bash
# Ejecutar smoke tests
npm run test:e2e:smoke

# Ejecutar con UI
npm run test:e2e:smoke:ui

# Generar reporte PDF
python scripts/generate_frontend_report_pdf.py
```

## Historial de Ejecución

### Última Ejecución

**Fecha:** Generada automáticamente

**Tests Ejecutados:** Smoke tests de caminos críticos

**Objetivo:** Verificar que las funcionalidades principales del frontend están operativas

**Cobertura:**
- ✅ Página principal carga correctamente
- ✅ Sistema de navegación funcional
- ✅ Formularios de autenticación accesibles
- ✅ Login funciona con credenciales válidas
- ✅ Registro es accesible
- ✅ Elementos UI críticos se renderizan
- ✅ Manejo de errores 404

**Estado:** En ejecución continua en CI/CD

**Notas:** Los smoke tests son ejecutados automáticamente en cada PR para garantizar que los caminos críticos del usuario no se rompan.
