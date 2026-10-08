import os

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno desde .env
load_dotenv()

metadata = MetaData(schema="TickifyDB")
Base = declarative_base(metadata=metadata)

class Database:
    _engine = None
    _SessionLocal = None

    @classmethod
    def get_engine(cls):
        if cls._engine is None:
            # Obtener credenciales desde variables de entorno
            user = os.getenv('DB_USER', 'postgres')
            password = os.getenv('DB_PASSWORD', 'password')
            port = os.getenv('DB_PORT', '5432')   
            server = os.getenv('DB_HOST', 'localhost')
            dbname = os.getenv('DB_NAME', 'tickify')

            database_url = f"postgresql+psycopg2://{user}:{password}@{server}:{port}/{dbname}"
            print(f"[DEBUG] String de conexión usado: {database_url}")

            # Configure the engine to use TickifyDB schema by default
            cls._engine = create_engine(
                database_url, 
                pool_recycle=3600,
                execution_options={
                    "schema_translate_map": {None: "TickifyDB"}
                }
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
