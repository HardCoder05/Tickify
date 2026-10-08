import os
import logging

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from sqlalchemy.pool import QueuePool, NullPool

# Cargar variables de entorno desde .env
load_dotenv()

print(f"[DEBUG] Loading database.py. TEST_DB_TYPE={os.getenv('TEST_DB_TYPE')}")

schema = "TickifyDB"
if os.getenv('TEST_DB_TYPE') == 'sqlite':
    schema = None

metadata = MetaData(schema=schema)
Base = declarative_base()

class Database:
    _engine = None
    _SessionLocal = None

    @classmethod
    def get_engine(cls):
        if cls._engine is None:
            if os.getenv('TEST_DB_TYPE') == 'sqlite':
                # Construir ruta absoluta al archivo test.db en la raíz del proyecto
                # database.py está en Backend/, así que la raíz es parent.parent
                from pathlib import Path
                base_dir = Path(__file__).resolve().parent.parent
                db_path = base_dir / "test.db"
                database_url = f"sqlite:///{db_path}"
                
                logging.error(f"[DEBUG] Usando SQLite: {database_url}")
                cls._engine = create_engine(
                    database_url,
                    connect_args={"check_same_thread": False},
                    poolclass=NullPool,
                )
                
                def do_connect(dbapi_connection, connection_record):
                    logging.error("[DEBUG] Attaching TickifyDB...")
                    cursor = dbapi_connection.cursor()
                    # Usar la misma ruta absoluta para el ATTACH
                    cursor.execute(f"ATTACH DATABASE '{db_path}' AS TickifyDB")
                    cursor.close()
                    logging.error("[DEBUG] TickifyDB attached.")
                
                event.listen(cls._engine, 'connect', do_connect)
            else:
                # Obtener credenciales desde variables de entorno
                user = os.getenv('DB_USER', 'postgres')
                password = os.getenv('DB_PASSWORD', 'password')
                port = os.getenv('DB_PORT', '5432')   
                server = os.getenv('DB_HOST', 'localhost')
                dbname = os.getenv('DB_NAME', 'tickify')

                database_url = f"postgresql+psycopg2://{user}:{password}@{server}:{port}/{dbname}"
                print(f"[DEBUG] String de conexión usado: {database_url}")

                # Configuración del pool de conexiones para evitar TimeoutError
                cls._engine = create_engine(
                    database_url,
                    poolclass=QueuePool,
                    pool_size=10,           # Conexiones base en el pool
                    max_overflow=20,        # Conexiones adicionales permitidas
                    pool_timeout=30,        # Timeout para obtener conexión (segundos)
                    pool_recycle=1800,      # Reciclar conexiones cada 30 minutos
                    pool_pre_ping=True,     # Verificar conexión antes de usar
                )
        return cls._engine

    @classmethod
    def get_session(cls):
        if cls._SessionLocal is None:
            cls._SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=cls.get_engine()
            )
        return cls._SessionLocal()
    
    @classmethod
    def dispose_engine(cls):
        """Libera todas las conexiones del pool"""
        if cls._engine is not None:
            cls._engine.dispose()
            cls._engine = None
            cls._SessionLocal = None

def get_db():
    db = Database.get_session()
    try:
        yield db
    finally:
        db.close()

# Prueba de conexión y consulta a la tabla organizadores
def test_organizadores():
    from sqlalchemy import text
    session = Database.get_session()
    try:
        result = session.execute(text('SELECT * FROM organizadores LIMIT 5'))
        for row in result:
            print(row)
    finally:
        session.close()

def registrar_evento(db_session, evento_data):
    from events.models.Evento import Evento
    nuevo_evento = Evento(**evento_data)
    db_session.add(nuevo_evento)
    db_session.commit()
    db_session.refresh(nuevo_evento)
    return nuevo_evento
