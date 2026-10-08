from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Ticket(Base):
    __tablename__ = 'tickets'
    __table_args__ = {"extend_existing": True, "schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    compra_id = Column(Integer, ForeignKey('TickifyDB.compras.id'), nullable=False)
    tarifa_id = Column(Integer, ForeignKey('TickifyDB.tipo_ticket.id'), nullable=False)
    evento_fecha_id = Column(Integer, ForeignKey('TickifyDB.eventos_fechas.id'), nullable=False)
    numero = Column(String(50), nullable=False)
    fecha_compra = Column(DateTime, server_default=func.now())
    estado = Column(String(20), nullable=False)
    codigo_qr = Column(String(255), nullable=False)
    precio_pagado = Column(Numeric(10, 2), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now(),server_default=func.now())
    asiento_fecha_id = Column(
        Integer,
        ForeignKey("TickifyDB.asiento_fecha.id", ondelete="SET NULL"),
        nullable=True
    )

    asiento_fecha = relationship("AsientoFecha", back_populates="ticket", foreign_keys=[asiento_fecha_id])


