from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from database import Base


class Compra(Base):
    __tablename__ = 'compras'
    __table_args__ = {"extend_existing": True, "schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey('TickifyDB.usuarios.id'), nullable=False)
    fecha = Column(DateTime, server_default=func.now())
    monto_subtotal = Column(Numeric(10, 2), nullable=False)
    monto_total = Column(Numeric(10, 2), nullable=False)
    descuento_total_aplicado = Column(Numeric(10, 2), default=0)
    metodo_pago = Column(String(50), nullable=False)
    estado = Column(String(20), nullable=False)
    codigo_confirmacion = Column(String(100), nullable=False, unique=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())

    codigo_descuento = Column(String(50),nullable=True, default=None)
