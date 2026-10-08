from sqlalchemy import Column, DateTime, Integer, String, Enum
from sqlalchemy.sql import func

from database import Base
import enum

class RolOrganizador(str, enum.Enum):
    activo = "activo"
    eliminado = "eliminado"
    pendiente = "pendiente"

class Organizador(Base):
    __tablename__ = 'organizadores'
    __table_args__ = {"schema": "TickifyDB"}
    

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=False)
    ruc = Column(String(11), nullable=False)
    razon_social = Column(String(200), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now(),server_default=func.now())
    estado = Column(
        Enum(RolOrganizador), 
        nullable=False, 
        default=RolOrganizador.pendiente.value,
        server_default=RolOrganizador.pendiente.value
    )
    dni = Column(String(8), nullable=False)
    telefono = Column(String(20), nullable=False)
    direccion = Column(String(100), nullable=False)
    sector = Column(String(100), nullable=False)
    correo_organizacional = Column(String(100), nullable=False)
    motivacion = Column(String(500), nullable=False)
