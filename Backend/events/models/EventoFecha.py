from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class EventoFecha(Base):
    __tablename__ = 'eventos_fechas'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey('TickifyDB.eventos.id'), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    capacidad_maxima = Column(Integer, nullable=False)
    aforo_disponible = Column(Integer, nullable=False)
    estado = Column(String(20), default='activo')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())

    asientos = relationship("AsientoFecha", back_populates="evento_fecha", cascade="all, delete-orphan")


