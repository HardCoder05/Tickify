from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TicketCreate(BaseModel):
    evento_fecha_id: int
    tarifa_id: int
    asiento_fecha_id: int

class TicketRead(BaseModel):
    id: int
    compra_id: int
    tarifa_id: int
    evento_fecha_id: int
    numero: str
    fecha_compra: datetime
    estado: str
    codigo_qr: str
    precio_pagado: float
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketUpdate(BaseModel):
    estado: Optional[str] = None
    precio_pagado: Optional[float] = None
    descuento_aplicado: Optional[float] = None
    comision_aplicada: Optional[float] = None

class TicketWithDetails(BaseModel):
    id: int
    evento_fecha_id: int
    numero: str
    fecha_compra: datetime
    estado: str
    codigo_qr: str
    precio_pagado: float
    # Detalles del evento
    evento_nombre: str
    evento_fecha_inicio: datetime
    evento_fecha_fin: datetime
    # Detalles de la tarifa/zona
    tarifa_nombre: str
    zona_nombre: str
    # Detalles de la compra
    compra_codigo_confirmacion: str
    compra_estado: str
    #Detalle tipo ticket
    tipo_ticket_nombre: str
    tipo_ticket_descripcion: str
    class Config:
        from_attributes = True