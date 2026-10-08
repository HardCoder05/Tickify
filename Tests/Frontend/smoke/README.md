# 🔥 Frontend Smoke Tests

Tests ultra-rápidos que verifican las funcionalidades más críticas del sistema.

## 📋 ¿Qué son los Smoke Tests?

Los smoke tests son pruebas rápidas que verifican que las funciones básicas funcionan antes de ejecutar tests más complejos. Son como una "prueba de humo" para detectar problemas críticos inmediatamente.

## ✅ Tests Incluidos

### Caminos Críticos (7 tests)
1. ✅ Página principal carga
2. ✅ Página de login es accesible
3. ✅ Login funciona con credenciales válidas
4. ✅ Página de registro es accesible
5. ✅ Navegación básica funciona
6. ✅ Navbar se renderiza
7. ✅ Página 404 maneja rutas inválidas

**Tiempo de ejecución:** ~30-60 segundos

## 🚀 Comandos Disponibles

```bash
# Ejecutar smoke tests (recomendado para desarrollo)
npm run test:e2e:smoke

# Ejecutar smoke tests en modo UI (debugging)
npm run test:e2e:smoke:ui

# Ejecutar todos los tests E2E
npm run test:e2e

# Ver reporte de última ejecución
npm run test:e2e:report
```

## 🎯 Cuándo Usar Smoke Tests

**Úsalos cuando:**
- ✅ Haces un cambio rápido y quieres verificar que no rompiste nada crítico
- ✅ Antes de hacer un commit
- ✅ Antes de crear un PR
- ✅ Como parte de tu desarrollo local

**Usa tests E2E completos cuando:**
- 🔧 Implementas una nueva feature
- 🔧 Haces cambios significativos en el backend
- 🔧 Antes de un release

## 📊 Integración con CI/CD

Los smoke tests se ejecutan automáticamente en GitHub Actions cuando:
- Haces push a `dev/pruebas`, `main`, o `dev`
- Creas un Pull Request
- Modificas archivos en `Frontend/`

**Workflow:** `.github/workflows/frontend-smoke.yml`

## ⚡ Tips para Desarrollo

### 1. Ejecutar antes de commit
```bash
npm run test:e2e:smoke && git commit -m "..."
```

### 2. Ver tests en modo interactivo
```bash
npm run test:e2e:smoke:ui
```

### 3. Debug un test específico
```bash
npx playwright test test/smoke/critical-paths.spec.ts --debug
```

### 4. Ver screenshots de tests fallidos
Los screenshots se guardan automáticamente en:
```
test-results/artifacts/
```

## 🔧 Troubleshooting

### Error: "navegador no encontrado"
```bash
npx playwright install chromium
```

### Tests pasan localmente pero fallan en CI
- Verifica que el backend esté corriendo en CI
- Revisa los logs en GitHub Actions
- Verifica que los usuarios de prueba existan

### Ver logs detallados
```bash
DEBUG=pw:api npm run test:e2e:smoke
```

## 📈 Métricas

**Estado actual:**
- Smoke Tests: 7 tests
- Tiempo: ~60 segundos
- Cobertura: Funcionalidades críticas (auth, navegación)

**Objetivo:**
- Mantener < 2 minutos de ejecución
- 100% passing rate
- Detectar problemas críticos inmediatamente
