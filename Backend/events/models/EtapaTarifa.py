from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class EtapaTarifa(Base):
    __tablename__ = 'etapa_tarifas'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    etapa_id = Column(Integer, ForeignKey('TickifyDB.etapas.id'), nullable=False)
    tarifa_id = Column(Integer, ForeignKey('TickifyDB.tarifas.id'), nullable=False)
    precio = Column(Numeric(10,2), nullable=False)
    cantidad = Column(Integer, nullable=True)
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())

    tarifa = relationship('Tarifa')
    etapa = relationship('Etapa')
