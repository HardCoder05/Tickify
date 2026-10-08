from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Evento(Base):
    __tablename__ = 'eventos'
    __table_args__ = {"schema": "TickifyDB"}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organizador_id = Column(Integer, ForeignKey('TickifyDB.organizadores.id'), nullable=False)
    categoria_publico_id = Column(Integer, ForeignKey('TickifyDB.categorias_publico.id'), nullable=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    capacidad_maxima = Column(Integer, nullable=True)
    banner_url = Column(String(255), nullable=True)
    estado = Column(String(20), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now(),server_default=func.now())

    ubicacion = Column(String(100), nullable=False)
    ciudad = Column(String(50), nullable=False)
    comision = Column(Numeric(precision=5, scale=2), nullable=False, default=3.0)
    politica_url = Column(String(255), nullable=True)
    # Relaciones
    fechas = relationship("EventoFecha", backref="evento", lazy="select")
