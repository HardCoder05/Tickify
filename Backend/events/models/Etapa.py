from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Numeric
from sqlalchemy.sql import func

from database import Base


class Etapa(Base):
    __tablename__ = 'etapas'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey('TickifyDB.eventos.id'), nullable=False)
    nombre = Column(String(100), nullable=False)
    fecha_inicio = Column(DateTime)
    fecha_fin = Column(DateTime)
    estado = Column(String(20), default='activo')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    porcentaje = Column(Numeric(10, 2), nullable=False, server_default="0.00")
