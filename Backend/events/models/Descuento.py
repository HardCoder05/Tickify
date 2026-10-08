from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean, Numeric, Enum
from sqlalchemy.sql import func
from database import Base
import enum

class TipoDescuento(enum.Enum):
    efectivo = "efectivo"
    porcentaje = "porcentaje"

class Descuento(Base):
    __tablename__ = 'descuentos'
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50),nullable=False, unique=True)
    evento_id = Column(Integer, ForeignKey('TickifyDB.eventos.id'), nullable=False)
    valor = Column(Numeric(5,2), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    estado = Column(String(20),nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now(),server_default=func.now())
    descripcion = Column(String(100), nullable=False)
    usos_maximos = Column(Integer, nullable=False)
    usos_actuales = Column(Integer, nullable=False)
    tipo_descuento = Column(Enum(TipoDescuento), nullable=False)

