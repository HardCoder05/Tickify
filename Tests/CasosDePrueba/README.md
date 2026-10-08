# Casos de Prueba - Sistema Tickify

Este directorio contiene las pruebas automatizadas para validar el cumplimiento de los requisitos funcionales del sistema de tickets Tickify.

## 📁 Estructura del Proyecto

```
CasosDePrueba/
├── Docs/                           # Documentación de casos de prueba
│   └── Casos de Prueba.pdf        # Especificación de casos de prueba
├── tests/                          # Pruebas automatizadas
│   ├── backend/                    # Pruebas de Backend (API)
│   │   ├── test_casos_prueba_backend.py    # Tests básicos (CP01-CP08)
│   │   ├── test_cp_complementarios.py      # Tests complementarios (CP-03 a CP-47)
│   │   ├── test_cp_avanzados.py            # Tests avanzados (CP-54 a CP-111)
│   │   ├── test_cp_admin.py                # Tests admin (CP-65 a CP-120)
│   │   ├── conftest.py            # Configuración de fixtures pytest
│   │   └── conftest_report.py     # Configuración para reportes
│   └── frontend/                   # Pruebas de Frontend (E2E)
│       └── (ver Frontend/tickify-frontend/test/e2e/casos_prueba_e2e.spec.ts)
├── scripts/                        # Scripts de ejecución
│   ├── run_remote_backend.sh      # Ejecutar tests backend en remoto
│   ├── run_remote_e2e.sh          # Ejecutar tests E2E en remoto
│   ├── run_tests_backend.ps1      # Ejecutar tests backend (local, Windows)
│   ├── run_tests_e2e.ps1          # Ejecutar tests E2E (local, Windows)
│   ├── run_all_tests.ps1          # Ejecutar todos los tests (Windows)
│   └── generate_pdf_report.py     # Generar reporte PDF
├── config/                         # Configuración de herramientas
│   └── pytest.ini                 # Configuración de pytest
├── reports/                        # Reportes generados
│   ├── report.json                # Reporte JSON de ejecución
│   └── reporte-casos-prueba.pdf   # Reporte PDF
└── README.md                       # Este archivo

```

## 🎯 Casos de Prueba Cubiertos

### Backend (API Tests)
- **CP01**: Registro de usuarios (CLIENTE, ORGANIZADOR)
- **CP02**: Autenticación y autorización
- **CP03**: Gestión de eventos
- **CP04**: Gestión de tickets y tarifas
- **CP05**: Proceso de compra
- **CP06**: Validación de tickets
- **CP07**: Reportes y consultas
- **CP08**: Casos de integración end-to-end

### Frontend (E2E Tests)
- **CP01**: Registro e inicio de sesión
- **CP02**: Navegación y consulta de eventos
- **CP03**: Gestión de eventos (organizador)
- **CP04**: Proceso de compra
- **CP05**: Consulta de tickets
- **CP06**: Perfil de usuario
- **CP07**: Validaciones de seguridad

## 🚀 Ejecución de Pruebas

### Backend - Entorno Remoto (https://tickify.duckdns.org)

```bash
# Desde la raíz del proyecto
./CasosDePrueba/scripts/run_remote_backend.sh
```

Este script:
- Conecta a la API desplegada en `https://tickify.duckdns.org/api/v1`
- Utiliza el entorno virtual en `venv/`
- ⚠️ **Nota**: Algunas pruebas fallarán si no tienen acceso a la base de datos remota

### Frontend - Entorno Remoto

```bash
# Desde la raíz del proyecto
./CasosDePrueba/scripts/run_remote_e2e.sh
```

Este script:
- Ejecuta pruebas E2E contra `https://tickify.duckdns.org`
- Usa Playwright con configuración remota
- Genera reporte HTML en `Frontend/tickify-frontend/remote-test-report`

### Backend - Entorno Local (requiere backend corriendo)

```bash
# Ejecutar TODOS los tests de backend
./CasosDePrueba/scripts/run_all_tests_backend.sh

# Windows PowerShell (solo tests básicos)
./CasosDePrueba/scripts/run_tests_backend.ps1

# Linux/Mac - Tests específicos
cd CasosDePrueba/tests/backend

# Tests básicos (CP01-CP08)
pytest test_casos_prueba_backend.py -v

# Tests complementarios (CP-03 a CP-47)
pytest test_cp_complementarios.py -v

# Tests avanzados (CP-54 a CP-111) 
pytest test_cp_avanzados.py -v

# Tests de administración (CP-65 a CP-120)
pytest test_cp_admin.py -v
```

## 📋 Requisitos

### Backend Tests
- Python 3.8+
- Entorno virtual con dependencias instaladas:
  ```bash
  python3 -m venv venv
  ./venv/bin/pip install -r Backend/requirements.txt
  ./venv/bin/pip install pytest httpx
  ```

### Frontend Tests
- Node.js 16+
- Playwright instalado:
  ```bash
  cd Frontend/tickify-frontend
  npm install
  npx playwright install chromium
  ```

## 🔧 Configuración

### Variables de Entorno

#### Backend (tests/backend/conftest.py)
- `TEST_URL`: URL del backend remoto (ej: `https://tickify.duckdns.org/api/v1`)
  - Si está definida, usa `httpx.Client` para conexión remota
  - Si no está definida, usa `TestClient` para tests locales in-process

#### Frontend (playwright.config.remote.ts)
- Configuración para tests remotos en `Frontend/tickify-frontend/playwright.config.remote.ts`
- `baseURL`: `https://tickify.duckdns.org`

## 📊 Reportes

Los reportes se generan automáticamente en el directorio `reports/`:

- **report.json**: Reporte JSON con resultados detallados
- **reporte-casos-prueba.pdf**: Reporte PDF generado con `generate_pdf_report.py`

### Generar Reporte PDF

```bash
cd CasosDePrueba/scripts
python generate_pdf_report.py
```

## ⚠️ Notas Importantes

### Limitaciones de Tests Remotos

1. **Backend Tests**: 
   - Los tests actuales verifican datos directamente en la base de datos usando `db_session`
   - Al ejecutar contra el servidor remoto, las pruebas modifican el servidor remoto vía API pero verifican en la BD local
   - Esto causará **fallos en las verificaciones** a menos que se tenga acceso a la BD remota

2. **Frontend Tests**:
   - Son pruebas "Black Box" que funcionan perfectamente contra el entorno remoto
   - No requieren acceso a la base de datos

### SSL Certificate Verification

Los tests remotos deshabilitan la verificación SSL (`verify=False`) para funcionar con el certificado de DuckDNS. Esto es **solo para entornos de prueba**.

## 🐛 Troubleshooting

### Error: "pytest no encontrado"
```bash
# Asegúrate de tener el venv creado e instalado
python3 -m venv venv
./venv/bin/pip install -r Backend/requirements.txt pytest httpx
```

### Error: "connection to server at localhost"
- Esto indica que `db_session` fixtures están intentando conectarse a la BD local
- Es esperado al ejecutar tests remotos sin acceso a la BD remota
- Solución: Proveer credenciales de BD remota o ejecutar solo los tests que no requieren DB

### Error: SSL Certificate Verification
- Ya está configurado `verify=False` en `conftest.py`
- Si persiste, verificar que estás usando la versión actualizada del archivo

## 📝 Contribuir

Al agregar nuevos casos de prueba:

1. **Backend**: Agregar en `tests/backend/test_casos_prueba_backend.py`
2. **Frontend**: Agregar en `Frontend/tickify-frontend/test/e2e/`
3. Actualizar este README con los nuevos casos cubiertos
4. Ejecutar los tests localmente antes de hacer commit

## 📞 Contacto

Para preguntas o problemas con las pruebas, contactar al equipo de desarrollo.
