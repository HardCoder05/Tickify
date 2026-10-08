from datetime import datetime
from typing import Optional

from pydantic import BaseModel, validator


class EventoBase(BaseModel):
    organizador_id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_maxima: int
    estado: Optional[str] = 'activo'

    @validator('capacidad_maxima')
    def validate_capacidad(cls, v):
        if v <= 0:
            raise ValueError('La capacidad debe ser mayor a 0')
        return v

class EventoCreate(EventoBase):
    pass

class EventoResponse(EventoBase):
    id: int

    class Config:
        orm_mode = True
