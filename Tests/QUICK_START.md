# 🚀 Quick Start - Pruebas E2E

## Instalación Rápida

```bash
cd Frontend/tickify-frontend
npm ci
npx playwright install --with-deps
```

## Ejecución Rápida

### Opción 1: Scripts de npm
```bash
# Todas las pruebas
npm run test:e2e

# Por módulo
npm run test:e2e:auth
npm run test:e2e:events
npm run test:e2e:tickets
npm run test:e2e:purchases
npm run test:e2e:admin

# Modo interactivo
npm run test:e2e:ui

# Ver navegador
npm run test:e2e:headed

# Ver reporte
npm run test:e2e:report

# Debug
npm run test:e2e:debug
```

### Opción 2: Script Interactivo (Recomendado)

**Windows:**
```powershell
.\run-e2e-tests.ps1
```

**Linux/Mac:**
```bash
chmod +x run-e2e-tests.sh
./run-e2e-tests.sh
```

### Opción 3: Comando directo de Playwright
```bash
npx playwright test
```

## ⚙️ Pre-requisitos

1. **Backend corriendo**: `http://localhost:8000`
2. **Frontend corriendo**: `http://localhost:5173`
3. **Usuarios de prueba en BD**:
   - `cliente@test.com` / `cliente123`
   - `organizador@test.com` / `org123`
   - `admin@test.com` / `admin123`

## 📁 Estructura

```
test/e2e/
├── auth/           # Autenticación (12 tests)
├── events/         # Eventos (20 tests)
├── tickets/        # Tickets (18 tests)
├── purchases/      # Compras (7 tests)
├── admin/          # Admin (10 tests)
└── helpers/        # Utilidades compartidas
```

## 📊 Ver Resultados

Los resultados se guardan automáticamente en:
- `test-results/playwright-report/` - Reporte HTML
- `test-results/artifacts/` - Screenshots y videos
- `test-results/results.json` - Resultados en JSON

## 🐛 Problemas Comunes

### "Cannot find baseURL"
```bash
# PowerShell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:5173"

# Bash
export PLAYWRIGHT_BASE_URL="http://localhost:5173"
```

### "Tests timeout"
- Verifica que backend y frontend estén corriendo
- Aumenta timeout en `playwright.config.ts`

### "Element not found"
- Ejecuta con `--headed` para ver qué pasa
- Verifica que los selectores coincidan con tu UI

## 📚 Documentación Completa

- `test/e2e/README.md` - Guía completa
- `test/E2E_SUMMARY.md` - Resumen de cobertura

## 🎯 Comandos Útiles

```bash
# Ejecutar solo tests que fallaron
npx playwright test --last-failed

# Ejecutar un archivo específico
npx playwright test test/e2e/auth/authentication.spec.ts

# Ejecutar con retries
npx playwright test --retries=2

# Ejecutar en un navegador específico
npx playwright test --project=chromium

# Modo secuencial (no paralelo)
npx playwright test --workers=1

# Actualizar snapshots (si usas visual testing)
npx playwright test --update-snapshots
```

## ✅ Verificación Rápida

Prueba que todo funciona:
```bash
npx playwright test test/e2e/auth/authentication.spec.ts --headed
```

Si ves el navegador abrirse y las pruebas corriendo, ¡estás listo! 🎉

---

**¿Necesitas ayuda?** Consulta `test/e2e/README.md` o abre un issue.
