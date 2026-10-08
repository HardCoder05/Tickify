from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PagoCreate(BaseModel):
    compra_id: int
    metodo_pago: str  # Fixed: match DB column name
    monto: float


class PagoSimular(BaseModel):
    compra_id: int
    metodo_pago: str = "simulado"  # Fixed: match DB column name
    monto: float
    aprobado: bool = True  # True para aprobar, False para rechazar


class PagoRead(BaseModel):
    id: int
    compra_id: int
    monto: float
    metodo_pago: str  # Fixed: match DB column name
    fecha_pago: datetime  # Added: required in DB
    numero_de_transaccion: Optional[str] = None
    estado: str
    proveedor: Optional[str] = None
    id_pago_proveedor: Optional[str] = None

    class Config:
        from_attributes = True

