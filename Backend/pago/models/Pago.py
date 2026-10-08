from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from database import Base


class Pago(Base):
    __tablename__ = 'pagos'
    __table_args__ = {"extend_existing": True, "schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    compra_id = Column(Integer, ForeignKey('TickifyDB.compras.id'), nullable=False)
    monto = Column(Numeric(10,2), nullable=False)
    metodo_pago = Column(String(50), nullable=False)  # Fixed: column name in DB
    fecha_pago = Column(DateTime, nullable=False)  # Added: required in DB
    numero_de_transaccion = Column(String(100), nullable=True)  # Added: from DB schema
    estado = Column(String(20), nullable=False)
    proveedor = Column(String(100), nullable=True)  # Added: from DB schema
    id_pago_proveedor = Column(String(100), nullable=True)  # Added: from DB schema
    token_pago = Column(String(100), nullable=True)  # Added: from DB schema
    ultimos4 = Column(String(4), nullable=True)  # Added: from DB schema
    marca_tarjeta = Column(String(50), nullable=True)  # Added: from DB schema
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())

