"""
Configuración de fixtures para tests de Casos de Prueba
"""
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Configurar variables de entorno mock ANTES de importar main
os.environ["GOOGLE_CLIENT_ID"] = "mock-test-client-id-123456"
os.environ["GOOGLE_CLIENT_SECRET"] = "mock-test-secret-abcdef"
os.environ["GOOGLE_REDIRECT_URL"] = "http://testserver/api/v1/users/auth_google_callback"

# Añadir el directorio Backend al PYTHONPATH
BACKEND_DIR = Path(__file__).parent.parent.parent.parent / "Backend"
sys.path.insert(0, str(BACKEND_DIR))

from datetime import timedelta
from sqlalchemy import text, create_engine, event
from sqlalchemy.pool import StaticPool
import unittest.mock

from database import get_db, Database

# Importar todos los modelos
from events.models.Asiento import Asiento
from events.models.AsientoFecha import AsientoFecha
from events.models.Notificacion import Notificacion
from users.models.Usuario import Usuario
from users.models.Organizador import Organizador
from events.models.Evento import Evento
from events.models.EventoFecha import EventoFecha
from events.models.Zona import Zona
from events.models.Tarifa import Tarifa
from events.models.Etapa import Etapa
from events.models.EtapaTarifa import EtapaTarifa
from events.models.CategoriaPublico import CategoriaPublico
from events.models.Descuento import Descuento
from tickets.models.Ticket import Ticket
from tickets.models.TipoTicket import TipoTicket
from compras.models.Compra import Compra
from pago.models.Pago import Pago

# Importar app después de configurar el path
from main import app
from users.services.AutenticacionServicio import create_access_token, hash_password

# --- SQLite Setup ---
def get_sqlite_engine():
    """Crea un engine de SQLite en memoria con soporte para schema"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    
    @event.listens_for(engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("ATTACH DATABASE ':memory:' AS TickifyDB")
        cursor.close()
        
    return engine

@pytest.fixture(scope="session", autouse=True)
def configure_db_engine():
    """Configura el engine de base de datos (SQLite o Postgres)"""
    from database import Database, Base
    
    # Check if we should use SQLite (default if no DB connection or explicit env var)
    use_sqlite = os.getenv("TEST_DB_TYPE", "sqlite") == "sqlite" and not os.getenv("TEST_URL")
    
    if use_sqlite:
        print("\n[INFO] Usando SQLite en memoria para tests locales...")
        engine = get_sqlite_engine()
        
        # Create tables
        Base.metadata.create_all(engine)
        
        # Patch Database class
        Database._engine = engine
        
        yield
        
        # Cleanup
        Database.dispose_engine()
    else:
        yield

@pytest.fixture(scope="session", autouse=True)
def setup_local_users(configure_db_engine):
    """Crea usuarios locales en SQLite"""
    if os.getenv("TEST_URL"):
        yield
        return

    db = Database.get_session()
    try:
        users_to_create = [
            ("admin@test.com", "admin123", "ADMIN"),
            ("organizador@test.com", "org123", "ORGANIZADOR"),
            ("cliente@test.com", "cliente123", "CLIENTE")
        ]
        
        for email, password, rol in users_to_create:
            usuario = db.query(Usuario).filter(Usuario.correo == email).first()
            if not usuario:
                nuevo_usuario = Usuario(
                    nombres="Test",
                    apellidos="User",
                    correo=email,
                    password_hash=hash_password(password),
                    rol=rol,
                    telefono="999999999"
                )
                db.add(nuevo_usuario)
                db.flush()
                
                if rol == "ORGANIZADOR":
                    nuevo_organizador = Organizador(
                        usuario_id=nuevo_usuario.id,
                        ruc="20123456789",
                        razon_social="Organizador Test SAC",
                        estado="activo",
                        dni="12345678",
                        telefono="999999999",
                        direccion="Av. Test 123",
                        sector="Tecnologia",
                        correo_organizacional=email,
                        motivacion="Test motivation"
                    )
                    db.add(nuevo_organizador)
                
                print(f"[OK] {email} CREADO (Local)")
        
        db.commit()
    except Exception as e:
        print(f"Error creating local users: {e}")
        db.rollback()
    finally:
        db.close()
    
    yield

@pytest.fixture(scope="session", autouse=True)
def mock_qr_services():
    """Mockear servicios de QR para evitar llamadas externas"""
    with unittest.mock.patch('tickets.controllers.TicketController.generate_qr_image') as mock_gen, \
         unittest.mock.patch('tickets.controllers.TicketController.upload_qr_image') as mock_upload:
        
        mock_gen.return_value = b"fake_qr_bytes"
        mock_upload.return_value = "http://mock-url.com/qr.png"
        yield


@pytest.fixture(scope="function")
def client():
    """Cliente de test (FastAPI TestClient o httpx.Client para remoto)"""
    test_url = os.getenv("TEST_URL")
    
    if test_url:
        print(f"\n[INFO] Ejecutando tests contra entorno remoto: {test_url}")
        import httpx
        # Configurar cliente para URL remota (deshabilitando verificación SSL para DuckDNS)
        with httpx.Client(base_url=test_url, timeout=30.0, verify=False) as http_client:
            yield http_client
    else:
        # Cliente local (in-process)
        with TestClient(app, raise_server_exceptions=True) as test_client:
            yield test_client


from unittest.mock import MagicMock
from sqlalchemy.exc import OperationalError

@pytest.fixture
def db_session():
    """Sesión de base de datos para tests"""
    try:
        db = Database.get_session()
        # Forzar verificación de conexión
        db.execute(text("SELECT 1"))
        yield db
        db.close()
    except OperationalError as e:
        print(f"\n[WARN] No se pudo conectar a la base de datos: {e}")
        print("[WARN] Usando Mock para db_session (tests que requieran DB fallarán o deben ser skippeados)")
        yield MagicMock()
    except Exception as e:
        print(f"\n[WARN] Error al crear sesión de DB: {e}")
        yield MagicMock()


@pytest.fixture
def auth_headers_admin():
    """Headers de autenticación para usuario ADMIN"""
    token_data = {
        "sub": "admin@test.com",
        "usuario_id": 1
    }
    token = create_access_token(token_data, "ADMIN", timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_organizador():
    """Headers de autenticación para usuario ORGANIZADOR"""
    token_data = {
        "sub": "organizador@test.com",
        "usuario_id": 2
    }
    token = create_access_token(token_data, "ORGANIZADOR", timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_cliente():
    """Headers de autenticación para usuario CLIENTE"""
    token_data = {
        "sub": "cliente@test.com",
        "usuario_id": 3
    }
    token = create_access_token(token_data, "CLIENTE", timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def cliente_id(db_session, auth_headers_cliente):
    """Obtiene el ID real del usuario cliente@test.com"""
    test_url = os.getenv("TEST_URL")
    if test_url:
        import httpx
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        try:
            with httpx.Client(base_url=test_url, verify=False, timeout=5.0) as client:
                # Use public endpoint to get real ID from DB
                response = client.get("/api/v1/users/email/cliente@test.com")
                print(f"DEBUG: /email response: {response.status_code} {response.text}")
                if response.status_code == 200:
                    return response.json().get("id", 3)
        except Exception as e:
            print(f"Error fetching client ID: {e}")
        
        print(f"DEBUG: Returning fallback client ID: 3")
        return 3

    if isinstance(db_session, MagicMock):
        return 3

    from sqlalchemy import text
    result = db_session.execute(
        text("SELECT id FROM usuarios WHERE correo = 'cliente@test.com'")
    ).fetchone()
    return result[0] if result else 3  # Fallback a 3 si no existe


@pytest.fixture
def evento_test_data():
    """Datos de prueba para crear un evento"""
    from datetime import datetime, timedelta
    
    fecha_inicio = (datetime.now() + timedelta(days=30)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=31)).isoformat()
    
    return {
        "organizador_id": 1,
        "categoria_publico_id": 1,
        "nombre": "Evento de Prueba",
        "descripcion": "Descripción del evento de prueba",
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "capacidad_maxima": 100,
        "banner_url": "https://ejemplo.com/banner.jpg",
        "ubicacion": "Av. Universitaria 1801",
        "ciudad": "Lima",
        "estado": "activo"
    }


@pytest.fixture
def cleanup_test_data(db_session):
    """Limpia datos de prueba después de cada test"""
    yield
    # Cleanup después del test
    try:
        # Limpiar en orden respetando foreign keys
        db_session.execute(text("DELETE FROM tickets WHERE id > 1000"))
        db_session.execute(text("DELETE FROM pagos WHERE id > 1000"))
        db_session.execute(text("DELETE FROM compras WHERE id > 1000"))
        db_session.execute(text("DELETE FROM tarifas WHERE id > 1000"))
        db_session.execute(text("DELETE FROM eventos_fechas WHERE id > 1000"))
        db_session.execute(text("DELETE FROM zonas WHERE id > 1000"))
        db_session.execute(text("DELETE FROM eventos WHERE id > 1000"))
        db_session.commit()
    except Exception as e:
        print(f"⚠️ Error en cleanup: {e}")
        db_session.rollback()


@pytest.fixture
def organizador_test_id(db_session, auth_headers_organizador):
    """Obtiene el ID de un organizador existente para usar en tests"""
    test_url = os.getenv("TEST_URL")
    if test_url:
        # Retornar 2 como fallback razonable para entorno remoto
        # (Idealmente buscaríamos el ID real, pero requiere lógica compleja)
        return 2

    if isinstance(db_session, MagicMock):
        return 2

    organizador = db_session.query(Organizador).filter(
        Organizador.estado == 'activo'
    ).first()
    
    if organizador:
        return organizador.id
    else:
        # Si no hay organizadores, retornar 1 como fallback
        return 1


@pytest.fixture(scope="session", autouse=True)
def ensure_remote_users():
    """Asegura que los usuarios de prueba existan en el entorno remoto"""
    test_url = os.getenv("TEST_URL")
    if test_url:
        import httpx
        print(f"\n[INFO] Verificando usuarios en entorno remoto: {test_url}")
        
        users = [
            {
                "nombres": "Admin", 
                "apellidos": "Sistema", 
                "correo": "admin@test.com", 
                "telefono": "999999999",
                "password": "admin123", 
                "rol": "ADMIN"
            },
            {
                "nombres": "Juan", 
                "apellidos": "Organizador", 
                "correo": "organizador@test.com", 
                "telefono": "987654321",
                "password": "org123", 
                "rol": "ORGANIZADOR"
            },
            {
                "nombres": "Maria", 
                "apellidos": "Cliente", 
                "correo": "cliente@test.com", 
                "telefono": "912345678",
                "password": "cliente123", 
                "rol": "CLIENTE"
            }
        ]
        
        # Deshabilitar warnings de SSL
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        with httpx.Client(base_url=test_url, verify=False, timeout=10.0) as client:
            for user in users:
                try:
                    # Intentar registrar (endpoint puede ser /register o /api/v1/users/register)
                    # Probamos /register primero que es lo que Login.py expone
                    response = client.post("/register", json=user)
                    if response.status_code == 201:
                        print(f"✅ Usuario creado: {user['correo']}")
                    elif response.status_code in [400, 409, 422]:
                        # Asumimos que ya existe o error de validación (probablemente ya existe)
                        print(f"ℹ️ Usuario ya existe o no se pudo crear: {user['correo']} ({response.status_code})")
                    else:
                        # Intentar con /api/v1/users/register
                        response = client.post("/api/v1/users/register", json=user)
                        if response.status_code == 201:
                            print(f"✅ Usuario creado (ruta alt): {user['correo']}")
                except Exception as e:
                    print(f"⚠️ Error al intentar crear usuario {user['correo']}: {e}")
