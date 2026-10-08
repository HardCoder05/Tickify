import asyncio
import os
import sys
from pathlib import Path

import unittest.mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# [WARNING] IMPORTANTE: Configurar variables mock ANTES de importar main
os.environ["GOOGLE_CLIENT_ID"] = "mock-test-client-id-123456"
os.environ["GOOGLE_CLIENT_SECRET"] = "mock-test-secret-abcdef"
os.environ["GOOGLE_REDIRECT_URL"] = "http://testserver/api/v1/users/auth_google_callback"

# Añadir el directorio raíz del proyecto al PYTHONPATH
ROOT_DIR = Path(__file__).parent.parent.parent / "Backend"
sys.path.insert(0, str(ROOT_DIR))

from datetime import timedelta

from database import get_db

# [WARNING] IMPORTAR TODOS LOS MODELOS antes de importar app
# Esto asegura que SQLAlchemy registre correctamente todas las foreign keys
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
from events.models.Asiento import Asiento
from events.models.AsientoFecha import AsientoFecha
from events.models.Notificacion import Notificacion
from tickets.models.Ticket import Ticket
from tickets.models.TipoTicket import TipoTicket
from compras.models.Compra import Compra
from pago.models.Pago import Pago
from users.services.AutenticacionServicio import hash_password

# Ahora importamos app después de configurar el path Y las variables de entorno
from main import app
from users.services.AutenticacionServicio import create_access_token

# Variable global para tracking de emails creados en tests
test_emails_created = []

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
    use_sqlite = os.getenv("TEST_DB_TYPE", "sqlite") == "sqlite"
    
    if use_sqlite:
        print("\n[INFO] Usando SQLite en memoria para tests...")
        engine = get_sqlite_engine()
        
        # Create tables
        Base.metadata.create_all(engine)
        
        # Patch Database class
        Database._engine = engine
        
        # Seed data for E2E tests
        try:
            from seed_e2e_data import seed_data
            print("[INFO] Seeding in-memory database...")
            seed_data()
        except Exception as e:
            print(f"[WARN] Could not seed data: {e}")
        
        yield
        
        # Cleanup
        Database.dispose_engine()
    else:
        yield

@pytest.fixture
def admin_token():
    """Genera un token JWT para un usuario ADMIN"""
    return create_access_token(
        data={"sub": "admin@test.com"},
        rol="ADMIN",
        expires_delta=timedelta(hours=1)
    )

@pytest.fixture
def organizador_token():
    """Genera un token JWT para un usuario ORGANIZADOR"""
    return create_access_token(
        data={"sub": "organizador@test.com"},
        rol="ORGANIZADOR",
        expires_delta=timedelta(hours=1)
    )

@pytest.fixture
def auth_headers_admin(admin_token):
    """Headers de autenticación para ADMIN"""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def auth_headers_organizador(organizador_token):
    """Headers de autenticación para ORGANIZADOR"""
    return {"Authorization": f"Bearer {organizador_token}"}

@pytest.fixture(scope="session", autouse=True)
def setup_test_users():
    """Verifica que los usuarios de prueba existan en la base de datos"""
    from users.models.Usuario import Usuario
    
    db = None
    try:
        db = next(get_db())
        print("\n[*] Verificando usuarios de prueba...")
        
        # Verificar que los usuarios de prueba existan
        emails_requeridos = ["cliente@test.com", "organizador@test.com", "admin@test.com"]
        usuarios_faltantes = []
        
        for email in emails_requeridos:
            usuario = db.query(Usuario).filter(Usuario.correo == email).first()
            if usuario:
                print(f"[OK] {email} encontrado (ID: {usuario.id}, Rol: {usuario.rol.value})")
            else:
                print(f"[WARN] {email} NO ENCONTRADO - Creando usuario de prueba...")
                # Crear usuario si no existe (especialmente para SQLite)
                # Determinar password según usuario
                password_plain = "cliente123"
                if "admin" in email:
                    password_plain = "admin123"
                elif "organizador" in email:
                    password_plain = "org123"
                
                nuevo_usuario = Usuario(
                    nombres="Test",
                    apellidos="User",
                    correo=email,
                    password_hash=hash_password(password_plain),
                    rol=email.split("@")[0].upper() if "admin" in email or "organizador" in email else "CLIENTE",
                    telefono="999999999"
                )
                # Casos especiales
                if "admin" in email:
                    nuevo_usuario.rol = "ADMIN"
                elif "organizador" in email:
                    nuevo_usuario.rol = "ORGANIZADOR"
                else:
                    nuevo_usuario.rol = "CLIENTE"
                    
                db.add(nuevo_usuario)
                db.flush() # Para obtener el ID
                
                if "organizador" in email:
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
                    
                db.commit()
                print(f"[OK] {email} CREADO")
        
        if False: # Deshabilitar error bloqueante
            print("\n[WARNING] USUARIOS DE PRUEBA FALTANTES")
            print("Por favor, ejecuta el siguiente comando antes de correr los tests:")
            print("\n   python scripts/setup_test_users.py crear\n")
            raise RuntimeError(f"Usuarios de prueba no encontrados: {', '.join(usuarios_faltantes)}")
        
        print("[OK] Todos los usuarios de prueba estan disponibles\n")
            
    except RuntimeError:
        # Re-lanzar el error para que los tests no se ejecuten
        raise
    except Exception as e:
        print(f"[ERROR] Error verificando usuarios de prueba: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        if db is not None:
            db.close()
    
    yield  # Permite que los tests se ejecuten
    
    # No eliminamos los usuarios al final - se mantienen para futuros tests
    print("\n✓ Tests completados - usuarios de prueba conservados para futuros tests")

@pytest.fixture
def client(mock_qr_services): # Add dependency on mock
    """Cliente de prueba para cada test"""
    with TestClient(app, base_url="http://test", raise_server_exceptions=True) as client:
        yield client
    # No llamar cleanup aquí - se maneja en cleanup_all_tests al final

@pytest.fixture(scope="session", autouse=True)
def mock_qr_services():
    """Mockear servicios de QR para evitar llamadas externas"""
    with unittest.mock.patch('tickets.controllers.TicketController.generate_qr_image') as mock_gen, \
         unittest.mock.patch('tickets.controllers.TicketController.upload_qr_image') as mock_upload:
        
        mock_gen.return_value = b"fake_qr_bytes"
        mock_upload.return_value = "http://mock-url.com/qr.png"
        yield

@pytest.fixture
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def track_test_email():
    """Fixture para trackear emails de prueba y limpiarlos automáticamente"""
    emails = []
    
    def register_email(email):
        emails.append(email)
        test_emails_created.append(email)
        return email
    
    yield register_email
    
    # Limpieza específica de este test
    if emails:
        cleanup_specific_emails(emails)

def cleanup_test_data():
    """Limpia todos los datos de prueba creados - PRESERVA DATOS REALES"""
    from database import Database
    db = Database.get_session()
    try:
        # Solo eliminar datos creados durante tests, NO datos del script 02_Datos_Reales.sql
        
        # Primero eliminar tickets que dependen de compras (y de tarifas)
        db.execute(text("""
            DELETE FROM "TickifyDB".tickets 
            WHERE compra_id IN (
                SELECT id FROM "TickifyDB".compras 
                WHERE usuario_id IN (
                    SELECT id FROM "TickifyDB".usuarios 
                    WHERE correo LIKE 'test_%@test.com'
                    OR correo LIKE 'test@gmail.com'
                    OR correo LIKE '%@testserver%'
                    OR correo like 'mockuser_%'
                    OR correo like 'existing_%'
                    OR correo LIKE 'flow_test_%'
                    OR correo LIKE 'cliente_compras_%'
                    OR correo IN :emails
                )
            )
        """), {"emails": tuple(test_emails_created) if test_emails_created else ('',)})
        
        # Eliminar tickets de eventos de prueba TEMPORALES (no reales)
        db.execute(text("""
            DELETE FROM "TickifyDB".tickets 
            WHERE evento_fecha_id IN (
                SELECT id FROM "TickifyDB".eventos_fechas 
                WHERE evento_id IN (
                    SELECT id FROM "TickifyDB".eventos 
                    WHERE nombre LIKE 'Evento Test%'
                    OR nombre = 'Evento Actualizado'
                    OR nombre = 'Evento Test Compras Simple'
                    OR nombre LIKE '%Test%Compras%'
                    OR descripcion = 'Test'
                    OR descripcion = 'Nueva descripción del evento'
                    OR id = 999
                )
            )
        """))
        
        # Eliminar compras de usuarios de prueba
        db.execute(text("""
            DELETE FROM "TickifyDB".compras 
            WHERE usuario_id IN (
                SELECT id FROM "TickifyDB".usuarios 
                WHERE correo LIKE 'test_%@test.com'
                OR correo LIKE 'test@gmail.com'
                OR correo LIKE '%@testserver%'
                OR correo like 'mockuser_%'
                OR correo like 'existing_%'
                OR correo LIKE 'flow_test_%'
                OR correo LIKE 'cliente_compras_%'
                OR correo IN :emails
            )
        """), {"emails": tuple(test_emails_created) if test_emails_created else ('',)})
        
        # Eliminar tarifas solo de eventos TEMPORALES de test
        db.execute(text("""
            DELETE FROM "TickifyDB".tarifas 
            WHERE zona_id IN (
                SELECT id FROM "TickifyDB".zonas 
                WHERE evento_id IN (
                    SELECT id FROM "TickifyDB".eventos 
                    WHERE nombre LIKE 'Evento Test%'
                    OR nombre = 'Evento Actualizado'
                    OR nombre = 'Evento Test Compras Simple'
                    OR nombre LIKE '%Test%Compras%'
                    OR descripcion = 'Test'
                    OR descripcion = 'Nueva descripción del evento'
                    OR id = 999
                )
            )
        """))
        
        # Eliminar eventos_fechas de eventos TEMPORALES
        db.execute(text("""
            DELETE FROM "TickifyDB".eventos_fechas 
            WHERE evento_id IN (
                SELECT id FROM "TickifyDB".eventos 
                WHERE nombre LIKE 'Evento Test%'
                OR nombre = 'Evento Actualizado'
                OR nombre = 'Evento Test Compras Simple'
                OR nombre LIKE '%Test%Compras%'
                OR descripcion = 'Test'
                OR descripcion = 'Nueva descripción del evento'
                OR id = 999
            )
        """))
        
        # Eliminar zonas de eventos TEMPORALES
        db.execute(text("""
            DELETE FROM "TickifyDB".zonas 
            WHERE evento_id IN (
                SELECT id FROM "TickifyDB".eventos 
                WHERE nombre LIKE 'Evento Test%'
                OR nombre = 'Evento Actualizado'
                OR nombre = 'Evento Test Compras Simple'
                OR nombre LIKE '%Test%Compras%'
                OR descripcion = 'Test'
                OR descripcion = 'Nueva descripción del evento'
                OR id = 999
            )
        """))
        
        # Eliminar SOLO eventos TEMPORALES de test (NO los reales del script)
        db.execute(text("""
            DELETE FROM "TickifyDB".eventos 
            WHERE nombre LIKE 'Evento Test%'
            OR nombre = 'Evento Actualizado'
            OR nombre = 'Evento Test Compras Simple'
            OR nombre LIKE '%Test%Compras%'
            OR descripcion = 'Test'
            OR descripcion = 'Nueva descripción del evento'
            OR id = 999
        """))
        
        # Finalmente eliminar usuarios TEMPORALES de prueba (NO los del script 02_Datos_Reales.sql)
        db.execute(text("""
            DELETE FROM "TickifyDB".usuarios 
            WHERE correo LIKE 'test_%@test.com'
            OR correo LIKE 'test@gmail.com'
            OR correo LIKE '%@testserver%'
            OR correo like 'mockuser_%'
            OR correo like 'existing_%'
            OR correo LIKE 'flow_test_%'
            OR correo LIKE 'cliente_compras_%'
            OR correo IN :emails
        """), {"emails": tuple(test_emails_created) if test_emails_created else ('',)})
        
        db.commit()
        test_emails_created.clear()
    except Exception as e:
        print(f"Error en limpieza: {e}")
        db.rollback()
    finally:
        db.close()

def cleanup_specific_emails(emails):
    """Limpia emails específicos"""
    if not emails:
        return
    
    from database import Database
    db = Database.get_session()
    try:
        placeholders = ','.join([f':email{i}' for i in range(len(emails))])
        params = {f'email{i}': email for i, email in enumerate(emails)}
        
        # Primero eliminar tickets
        db.execute(
            text(f"""
                DELETE FROM "TickifyDB".tickets 
                WHERE compra_id IN (
                    SELECT id FROM "TickifyDB".compras 
                    WHERE usuario_id IN (
                        SELECT id FROM "TickifyDB".usuarios WHERE correo IN ({placeholders})
                    )
                )
            """),
            params
        )
        
        # Luego eliminar pagos
        db.execute(
            text(f"""
                DELETE FROM "TickifyDB".pagos 
                WHERE compra_id IN (
                    SELECT id FROM "TickifyDB".compras 
                    WHERE usuario_id IN (
                        SELECT id FROM "TickifyDB".usuarios WHERE correo IN ({placeholders})
                    )
                )
            """),
            params
        )
        
        # Luego eliminar compras
        db.execute(
            text(f"""
                DELETE FROM "TickifyDB".compras 
                WHERE usuario_id IN (
                    SELECT id FROM "TickifyDB".usuarios WHERE correo IN ({placeholders})
                )
            """),
            params
        )
        
        # Finalmente eliminar usuarios
        db.execute(
            text(f'DELETE FROM "TickifyDB".usuarios WHERE correo IN ({placeholders})'),
            params
        )
        db.commit()
    except Exception as e:
        print(f"Error limpiando emails específicos: {e}")
        db.rollback()
    finally:
        db.close()

@pytest.fixture(scope="session", autouse=True)
def cleanup_all_tests():
    """Limpieza final al terminar todas las pruebas"""
    yield
    # Limpieza final
    cleanup_test_data()
    # Liberar todas las conexiones del pool
    from database import Database
    Database.dispose_engine()
    print("\n[OK] Limpieza final completada - Pool de conexiones liberado")
