from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventoFechaBase(BaseModel):
    evento_id: int
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_maxima: int
    aforo_disponible: int
    estado: Optional[str] = 'activo'

class EventoFechaCreate(EventoFechaBase):
    pass

class EventoFechaResponse(EventoFechaBase):
    id: int

    class Config:
        orm_mode = True
