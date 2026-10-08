from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from database import Base


class TipoTicket(Base):
    __tablename__ = 'tipo_ticket'
    __table_args__ = {"extend_existing": True, "schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey('TickifyDB.eventos.id'), nullable=False)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    estado = Column(String(20), nullable=False, default='activo')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    incremento = Column(Numeric(10, 2), nullable=False, server_default="0.00")
