import logging
import os
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from users.routes.Router import router as users_router
from users.routes.Usuarios import router as usuarios_router
# Exponer las rutas de login en la raíz para que coincidan con la
# configuración de nginx (p. ej. /login_google, /auth_google_callback)
from users.routes.Login import login_router

load_dotenv(dotenv_path=".env")

# Configuración flexible de Google OAuth
def get_google_config():
    """Obtiene y valida la configuración de Google OAuth"""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_url = os.getenv("GOOGLE_REDIRECT_URL")
    # No imprimir el valor real en logs de nivel INFO/STDOUT para evitar exponer URLs
    logging.debug("Google redirect_url set: %s", bool(redirect_url))

    if not all([client_id, client_secret]):
        # En lugar de fallar, solo advertir
        logging.warning("Google OAuth no configurado completamente")
        logging.debug("CLIENT_ID set: %s", bool(client_id))
        logging.debug("CLIENT_SECRET set: %s", bool(client_secret))
        logging.debug("REDIRECT_URL set: %s", bool(redirect_url))

        # En testing/desarrollo, permitir continuar con valores mock
        if os.getenv("PYTEST_CURRENT_TEST"):  # Detecta si estamos en pytest
            logging.info("Modo testing detectado, usando configuración mock")
            return {
                "client_id": client_id or "mock-client-id",
                "client_secret": client_secret or "mock-secret",
                "redirect_url": redirect_url or "http://localhost:8000/auth_google_callback"
            }

        # En desarrollo, usar valores mock
        logging.info("Usando configuración mock para desarrollo")
        return {
            "client_id": "mock-client-id",
            "client_secret": "mock-secret", 
            "redirect_url": "http://localhost:8000/callback"
        }
    
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_url": redirect_url
    }

# Obtener configuración (pero no fallar en testing)
try:
    GOOGLE_CONFIG = get_google_config()
    GOOGLE_CLIENT_ID = GOOGLE_CONFIG["client_id"]
    GOOGLE_CLIENT_SECRET = GOOGLE_CONFIG["client_secret"]
    GOOGLE_REDIRECT_URL = GOOGLE_CONFIG["redirect_url"]
except RuntimeError as e:
    # Si estamos en GitHub Actions o testing, no fallar
    if os.getenv("CI") or os.getenv("PYTEST_CURRENT_TEST"):
        logging.warning("%s - Continuando con valores mock para testing", str(e))
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "mock-client-id")
        GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "mock-secret")
        GOOGLE_REDIRECT_URL = os.getenv("GOOGLE_REDIRECT_URL", "http://localhost:8000/callback")
    else:
        raise

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"

# Añadir el directorio padre al path para importar database
sys.path.insert(0, str(Path(__file__).parent.parent))
from database import get_db, registrar_evento

app = FastAPI()

# Health check endpoint para CI/CD
@app.get("/health")
def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "service": "tickify-backend"}

# Orígenes permitidos para CORS
origins = [
    "http://localhost:5173",   # Vite dev server (desarrollo local)
    "http://localhost",         # Nginx local (puerto 80)
    "http://localhost:80",      # Nginx local explícito
    "http://127.0.0.1",         # Loopback local
    "http://127.0.0.1:80",      # Loopback explícito
    "http://100.25.132.139",    # IP pública del EC2
    "http://100.25.132.139:80", # IP pública con puerto explícito
    "https://100.25.132.139",   # HTTPS del EC2 (futuro)
]

# En desarrollo puede ser conveniente permitir todos los orígenes para evitar problemas
# de CORS durante pruebas locales. Para seguridad, no activar esto en producción.
if os.getenv("DEV_ALLOW_ALL_CORS", "true").lower() in ("1", "true", "yes"):
    origins = ["*"]

# Middleware de sesiones para Google OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "clave_temporal"))

# If origins is a wildcard, browsers disallow credentialed responses with "*".
# To avoid confusing preflight/credential issues during local testing, when
# origins is the wildcard we force allow_credentials=False and log a warning.
cors_allow_credentials = True
if origins == ["*"]:
    cors_allow_credentials = False
    logging.warning("CORS configured with allow_origins=['*'] — setting allow_credentials=False for safety in dev environment")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

def setup_logging():
    try:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
       
        log_file = log_dir / "app.log"
       
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
       
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
        )
       
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=5*1024*1024,
            backupCount=10,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
       
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.DEBUG)
       
        logger.handlers.clear()
       
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
       
        logging.info("Sistema de logging configurado correctamente")
       
    except Exception as e:
        logging.error("Error al configurar logging: %s", str(e))
        raise

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para logging de peticiones HTTP"""
    start_time = time.time()
   
    try:
        response = await call_next(request)
    except Exception as e:
        logging.error(f"Error en petición: {str(e)}", exc_info=True)
        raise
   
    process_time = (time.time() - start_time) * 1000
    formatted_time = f"{process_time:.2f}ms"
   
    logging.info(
        f"method={request.method} "
        f"path={request.url.path} "
        f"status_code={response.status_code} "
        f"response_time={formatted_time}"
    )
   
    return response

setup_logging()

@app.get("/")
def root():
    """Endpoint raíz con logging"""
    logging.info("Acceso al endpoint raíz")
    return {"message": "API funcionando"}

#app.include_router(users_router, prefix="/api/v1/users")
# Rutas de autenticación en la raíz (mantener compatibilidad con nginx)
app.include_router(login_router)
app.include_router(usuarios_router)

from events.models.CategoriaPublico import CategoriaPublico

# Importar modelos para registrar relaciones en SQLAlchemy
from events.models.Evento import Evento
#from events.routes.Eventos import router as eventos_router
from users.models.Organizador import Organizador
from events.models.AsientoFecha import AsientoFecha
from events.models.Asiento import Asiento
from events.models.EventoFecha  import EventoFecha

#app.include_router(eventos_router)

# Intentar registrar routers adicionales (events, tickets, reports) si existen
try:
    from events.routes.Eventos import router as events_router
    app.include_router(events_router)
    logging.info("Router 'events' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'events': {e}")

try:
    from tickets.routes.Tickets import router as tickets_router
    app.include_router(tickets_router)
    logging.info("Router 'tickets' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'tickets': {e}")

try:
    from tarifa.routes.Tarifas import router as tarifas_router
    app.include_router(tarifas_router)
    logging.info("Router 'tarifas' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'tarifas': {e}")

try:
    from pago.routes.Pagos import router as pagos_router
    app.include_router(pagos_router)
    logging.info("Router 'pagos' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'pagos': {e}")

try:
    from compras.routes.Compras import router as compras_router
    app.include_router(compras_router)
    logging.info("Router 'compras' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'compras': {e}")

try:
    from reports.routes.Reportes import router as reports_router
    app.include_router(reports_router)
    logging.info("Router 'reports' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'reports': {e}")

try:
    from events.routes.Descuentos import router as descuentos_router
    app.include_router(descuentos_router)
    logging.info("Router 'descuentos' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'descuentos': {e}")

try:
    from events.routes.CategoriasPublico import router as categorias_router
    app.include_router(categorias_router)
    logging.info("Router 'categorias' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'categorias': {e}")

try:
    from events.routes.Notificaciones import router as notificaciones_router
    app.include_router(notificaciones_router)
    logging.info("Router 'notificaciones' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'notificaciones': {e}")

try:
    from events.routes.Asientos import router as asientos_router
    app.include_router(asientos_router)
    logging.info("Router 'asientos' incluido correctamente")
except Exception as e:
    logging.warning(f"No se pudo incluir router 'asientos': {e}")

# Permite ejecutar el backend directamente con 'python -m app.main' o usando uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
