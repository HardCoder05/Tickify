# Tests E2E con Playwright

Este proyecto utiliza **Playwright** para tests end-to-end (e2e). Los tests unitarios con Vitest han sido eliminados para enfocarnos únicamente en tests e2e.

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
# o
npm run test:e2e
```

### Tests específicos por módulo
```bash
npm run test:e2e:auth        # Tests de autenticación
npm run test:e2e:events      # Tests de eventos
npm run test:e2e:tickets     # Tests de tickets
npm run test:e2e:purchases   # Tests de compras
npm run test:e2e:admin       # Tests de administración
```

### Tests críticos (smoke tests)
```bash
npm run test:e2e:smoke
```

### Tests con UI interactiva
```bash
npm run test:e2e:ui
```

### Tests en modo debug
```bash
npm run test:e2e:debug
```

### Ver reporte de tests
```bash
npm run test:e2e:report
```

## 🧹 Limpieza Automática de Datos de Prueba

**¡Limpieza automática habilitada!** Los datos de prueba se limpian automáticamente después de ejecutar:

```bash
npm run test:e2e         # Limpia automáticamente después de los tests
npm run test:e2e:headed  # Limpia automáticamente después de los tests
```

La limpieza automática:
- ✅ Se ejecuta solo si hay datos para limpiar
- ✅ Elimina usuarios, eventos, compras y tickets creados durante tests
- ✅ Preserva los usuarios base (`admin@test.com`, `organizador@test.com`, `cliente@test.com`)
- ✅ Preserva los datos reales del script `02_Datos_Reales.sql`
- ✅ No requiere confirmación (modo silencioso)

### Limpieza manual (con confirmación)

Si necesitas limpiar manualmente:

```bash
npm run test:e2e:cleanup  # Pide confirmación y muestra detalles
```

**Nota:** En GitHub Actions no es necesario limpiar, ya que usa una base de datos temporal que se destruye automáticamente.

Ver más detalles en [CLEANUP_E2E.md](./CLEANUP_E2E.md)

## �🤖 CI/CD - Ejecución Automática

Los tests e2e se ejecutan automáticamente en GitHub Actions cuando:

- ✅ Haces **push** a cualquier rama (si afecta Frontend o Backend)
- ✅ Abres un **pull request** hacia `main`, `dev` o `dev/pruebas`
- ✅ Ejecutas manualmente desde la pestaña Actions en GitHub

### Workflow: `.github/workflows/e2e-tests.yml`

El workflow:
1. Levanta una base de datos PostgreSQL de prueba
2. Inicia el Backend con FastAPI
3. Inicia el Frontend con Vite
4. Ejecuta smoke tests primero (tests críticos)
5. Ejecuta todos los tests e2e
6. Guarda los reportes como artifacts

## 📁 Estructura de Tests

```
test/
├── e2e/                          # Tests end-to-end principales
│   ├── auth/                     # Tests de autenticación
│   ├── events/                   # Tests de gestión de eventos
│   ├── tickets/                  # Tests de tickets
│   ├── purchases/                # Tests de compras
│   └── admin/                    # Tests de administración
├── antitest/                     # Tests negativos (casos de error)
└── README.md                     # Este archivo
```

## 🔧 Configuración

La configuración de Playwright está en `playwright.config.ts`

### Variables de entorno necesarias:
```bash
VITE_API_URL=http://localhost:8000
```

## 📝 Notas

- Los tests unitarios con Vitest fueron removidos
- `npm test` ahora ejecuta Playwright en lugar de Vitest
- El comando `test:e2e` sigue funcionando como alias
