from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from database import Base


class Tarifa(Base):
    __tablename__ = 'tarifas'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    zona_id = Column(Integer, ForeignKey('TickifyDB.zonas.id'), nullable=False)
    tipo_ticket_id = Column(Integer, ForeignKey('TickifyDB.tipo_ticket.id'), nullable=False)
    etapa_id = Column(Integer, ForeignKey('TickifyDB.etapas.id'), nullable=False)
    nombre = Column(String(100), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    cantidad = Column(Integer, nullable=False)
    estado = Column(String(20), default='activo')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
