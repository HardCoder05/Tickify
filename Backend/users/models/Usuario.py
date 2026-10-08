import enum
from sqlalchemy.orm import relationship
from sqlalchemy import Column, DateTime, Enum, Integer, String, func
from sqlalchemy.schema import UniqueConstraint

from database import Base


class RolUsuario(enum.Enum):
    ADMIN = "ADMIN"
    ORGANIZADOR = "ORGANIZADOR"
    CLIENTE = "CLIENTE"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    correo = Column(String(150), nullable=False, index=True)
    telefono = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    fecha_registro = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    rol = Column(
        Enum(RolUsuario, name='rol_usuario', create_type=False), 
        default=RolUsuario.CLIENTE, 
        nullable=False
    )
    __table_args__ = (
        UniqueConstraint('correo', name='uq_usuarios_correo'),
        {"extend_existing": True, "schema": "TickifyDB"}
    )
    estado = Column(String(20), nullable=False, server_default='activo')
    
    notificaciones = relationship("Notificacion", back_populates="usuario")
