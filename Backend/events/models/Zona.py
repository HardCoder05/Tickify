from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Zona(Base):
    __tablename__ = 'zonas'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey('TickifyDB.eventos.id'), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    capacidad = Column(Integer, nullable=False)
    estado = Column(String(20), default='activo')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    precio_base = Column(Numeric(10, 2), nullable=False, server_default="0.00")

    asientos = relationship("Asiento", back_populates="zona", cascade="all, delete")

