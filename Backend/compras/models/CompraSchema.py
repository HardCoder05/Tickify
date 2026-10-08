from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from tickets.models.TicketSchema import TicketCreate


class CompraCreate(BaseModel):
    usuario_id: int
    metodo_pago: str
    codigo_descuento: Optional[str] = None
    tickets: List[TicketCreate]


class CompraRead(BaseModel):
    id: int
    usuario_id: int
    fecha: datetime
    monto_subtotal: float
    monto_total: float
    descuento_total_aplicado: float
    metodo_pago: str
    estado: str
    codigo_confirmacion: str
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompraUpdate(BaseModel):
    monto_subtotal: Optional[float] = None
    monto_total: Optional[float] = None
    descuento_total_aplicado: Optional[float] = None
    metodo_pago: Optional[str] = None
    estado: Optional[str] = None


class CompraWithTickets(BaseModel):
    id: int
    usuario_id: int
    fecha: datetime
    monto_subtotal: float
    monto_total: float
    descuento_total_aplicado: float
    metodo_pago: str
    estado: str
    codigo_confirmacion: str
    tickets: List[dict] = []

    class Config:
        from_attributes = True
