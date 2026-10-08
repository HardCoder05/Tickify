# Tests Anti-Patrón (Validación de Errores)

Esta carpeta contiene tests E2E que verifican que el sistema maneja correctamente casos de **error y validación**.

## 🎯 Objetivo

Validar que el sistema detecta y maneja apropiadamente:
- Datos inválidos (emails mal formateados, contraseñas que no coinciden)
- Credenciales incorrectas
- Registros duplicados
- Accesos no autorizados

## 📁 Tests Incluidos

### 1. `register.invalid_email.ui.spec.ts`
**Qué prueba:** Formulario de registro con email en formato inválido  
**Comportamiento esperado:** Alert de JavaScript con mensaje "Correo electrónico no válido"  
**Nota técnica:** Desactiva validación HTML5 nativa para probar la validación JavaScript del formulario

### 2. `register.password_mismatch.ui.spec.ts`
**Qué prueba:** Formulario de registro con contraseñas que no coinciden  
**Comportamiento esperado:** Alert de JavaScript con mensaje "Las contraseñas no coinciden"

### 3. `login.invalid_credentials.spec.ts`
**Qué prueba:** Login con credenciales incorrectas  
**Comportamiento esperado:** 
- Respuesta HTTP 401/403 del backend, O
- Alert de JavaScript con mensaje de error, O  
- Mensaje de error visible en la UI

### 4. `register.duplicate.api.spec.ts`
**Qué prueba:** Registro duplicado vía API directa  
**Comportamiento esperado:** 
- Primer registro exitoso (200/201)
- Segundo registro falla (400/409/422)

### 5. `access.profile.unauth.spec.ts`
**Qué prueba:** Acceso a rutas protegidas sin autenticación  
**Comportamiento esperado:**
- Redirección a `/login`, O
- Botón de login visible en la página

## 🔧 Características Técnicas

### Manejo de Validación HTML5 vs JavaScript

El formulario de registro tiene dos capas de validación:

1. **HTML5 nativa:** El atributo `type="email"` previene el submit si el formato es inválido
2. **JavaScript:** La función `handleSubmit` valida los datos con `isValidEmail()` y `isValidPassword()`

Los tests **desactivan la validación HTML5** para poder probar la validación JavaScript:

```typescript
await disableHTML5Validation(page, 'input#email');
```

### Captura de Alerts

Como el formulario usa `alert()` para mostrar errores, los tests capturan estos dialogs:

```typescript
const alertPromise = expectAlertWithMessage(page, 'Correo electrónico no válido');
await page.getByRole('button', { name: /registrar/i }).click();
await alertPromise;
```

## 🚀 Cómo Ejecutar

```bash
# Todos los tests de antipatrones
npx playwright test test/antitest

# Test específico
npx playwright test test/antitest/register.invalid_email.ui.spec.ts

# Con UI
npx playwright test test/antitest --ui

# Debug
npx playwright test test/antitest --debug
```

## 📋 Requisitos

- **Backend:** Debe estar corriendo en `http://localhost:8000`
- **Frontend:** Debe estar corriendo en `http://localhost:5173`
- **Endpoint de registro:** `POST /register` debe aceptar:
  ```json
  {
    "nombres": "string",
    "apellidos": "string",
    "correo": "string",
    "telefono": "string",
    "password": "string",
    "rol": "cliente" | "organizador"
  }
  ```

## 🐛 Troubleshooting

### ❌ "Alert no apareció en 3 segundos"

**Causa:** El formulario no está mostrando el alert esperado  
**Solución:** Verifica que:
1. La función `handleSubmit` en `RegisterForm.tsx` tiene los `alert()` correctos
2. La validación está ejecutándose (no está siendo bloqueada por HTML5)

### ❌ "No se encontró input de email en registro"

**Causa:** El selector `input#email` no existe  
**Solución:** Verifica que el input en `RegisterForm.tsx` tiene `id="email"`

### ❌ Test de registro duplicado falla

**Causa:** El email ya existe en la base de datos  
**Solución:** El test genera emails únicos con timestamp, pero si el backend no limpia datos de prueba, pueden quedar registros. Considera:
1. Limpiar la BD de pruebas antes de ejecutar
2. Agregar endpoint de cleanup en el backend (solo para tests)

## 📚 Helpers Disponibles

Ver `helpers.ts` para funciones reutilizables:

- `fillRegisterForm()` - Rellena todos los campos del formulario
- `expectAlertWithMessage()` - Espera y valida un alert
- `disableHTML5Validation()` - Desactiva validación nativa del navegador
- `generateUniqueEmail()` - Genera email único para tests

## 🎓 Mejores Prácticas Aplicadas

✅ **No usar `waitForTimeout` innecesariamente** - Usamos event listeners para alerts  
✅ **Selectores específicos** - Usamos IDs en lugar de selectores frágiles  
✅ **Helpers reutilizables** - DRY principle aplicado  
✅ **Configuración centralizada** - `TEST_CONFIG` en helpers.ts  
✅ **Tests independientes** - Cada test limpia su propio estado

## 🔄 Próximos Pasos

Considera mejorar la UX del frontend para:
1. Reemplazar `alert()` con mensajes en la UI (toasts, inline errors)
2. Mostrar errores de validación en tiempo real
3. Agregar feedback visual para campos inválidos

Esto hará que los tests sean más robustos y menos dependientes de browser dialogs.
