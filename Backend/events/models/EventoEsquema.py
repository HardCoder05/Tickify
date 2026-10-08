from datetime import datetime
from typing import List, Optional
from fastapi import Form, File, UploadFile
from pydantic import BaseModel, Field, validator

# ... (existing imports)

class FechaEventoUpdate(BaseModel):
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None

class FechaEvento(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_maxima: Optional[int] = None

    

    class Config:
        from_attributes = True

class TarifaEvento(BaseModel):
    nombre: str
    cantidad: int
    zona_id: Optional[int] = None
    tipo_ticket_id: Optional[int] = None
    etapa_id: Optional[int] = None  

    class Config:
        from_attributes = True

class ZonaEvento(BaseModel):
    nombre: str = Field(..., min_length=1)
    descripcion: Optional[str] = None
    precio_base: float
    capacidad: Optional[int] = 0

    @validator('capacidad')
    def validate_capacidad(cls, v):
        if v is not None and v <= 0:
            raise ValueError('La capacidad debe ser mayor a 0')
        return v

    class Config:
        from_attributes = True

class EtapaEvento(BaseModel):
    nombre: str = Field(..., min_length=1)
    fecha_inicio: datetime
    fecha_fin: datetime
    porcentaje: float

    class Config:
        from_attributes = True

class TipoTicketEvento(BaseModel):
    nombre: str = Field(..., min_length=1)
    descripcion: Optional[str] = None
    incremento: float

    class Config:
        from_attributes = True

class EventoCreate(BaseModel):
    organizador_id: int
    categoria_publico_id: int
    nombre: str = Field(..., min_length=1)
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    ubicacion: str
    ciudad: str
    # Campos opcionales para crear todo de una vez
    fechas: Optional[List[FechaEvento]] = None
    capacidad_maxima: Optional[int] = None # Agregado para validacion si se pasa

    

    @validator('fecha_fin')
    def validate_fecha_fin(cls, v, values):
        if 'fecha_inicio' in values and v <= values['fecha_inicio']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v
    

class EventoUpdate(BaseModel):
    organizador_id: Optional[int] = None
    categoria_publico_id: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_inicio: Optional[datetime]= None
    fecha_fin: Optional[datetime]= None
    ubicacion: Optional[str] = None
    ciudad: Optional[str] = None
    # Campos opcionales para crear todo de una vez
    fechas: Optional[List[FechaEvento]] = None
    capacidad_maxima: Optional[int] = None

    @validator('capacidad_maxima')
    def validate_capacidad(cls, v):
        if v is not None and v <= 0:
            raise ValueError('La capacidad debe ser mayor a 0')
        return v
    

class EventoRead(BaseModel):
    id: int
    organizador_id: int
    categoria_publico_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_maxima: int
    banner_url: Optional[str] = None
    estado: str
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    ubicacion: str
    ciudad: str
    tickets_vendidos: Optional[int] = 0
    politica_url: Optional[str] = None
    class Config:
        from_attributes = True

class FechaEventoRead(BaseModel):
    id: int
    evento_id: int
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_maxima: int
    aforo_disponible: Optional[int]
    estado: Optional[str]
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    class Config:
        from_attributes = True


class TarifaEventoRead(BaseModel):
    id: int
    zona_id: Optional[int] = None #TEMPORAL
    tipo_ticket_id: Optional[int] = None #TEMPORAL
    etapa_id: Optional[int] = None #TEMPORAL
    nombre: str
    precio: float
    cantidad: int
    estado: Optional[str]
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    class Config:
        from_attributes = True


class ZonaEventoRead(BaseModel):
    id: int
    evento_id: int
    nombre: str
    descripcion: Optional[str]
    capacidad: int
    precio_base: Optional[float] = None
    estado: Optional[str]
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    class Config:
        from_attributes = True


class EtapaEventoRead(BaseModel):
    id: int
    evento_id: int
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    porcentaje: float
    estado: Optional[str]
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    class Config:
        from_attributes = True


class TipoTicketEventoRead(BaseModel):
    id: int
    evento_id: int
    nombre: str
    descripcion: Optional[str]
    estado: Optional[str]
    incremento: Optional[float] = 0.0
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    class Config:
        from_attributes = True


class EventoCompletoResponse(BaseModel):
    evento: EventoRead
    fechas: List[FechaEventoRead] = []
    zonas: List[ZonaEventoRead] = []
    etapas: List[EtapaEventoRead] = []
    tipos_ticket: List[TipoTicketEventoRead] = []
    tarifas: List[TarifaEventoRead] = []
    class Config:
        from_attributes = True


class EventoFiltro(BaseModel):
    estado: Optional[str] = None
    organizador_id: Optional[int] = None
    nombre: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    categoria_id: Optional[int] = None
    class Config:
        from_attributes = True


class DescuentoCreate(BaseModel):
    evento_id: int
    codigo: str
    valor: float
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: str = 'inactivo'
    descripcion: str
    usos_maximos: int
    tipo_descuento: str
    
    class Config:
        from_attributes = True

class DescuentoUpdate(BaseModel):
    evento_id: Optional[int] = None
    codigo: Optional[str] = None
    valor: Optional[float] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    estado: Optional[str] = None 
    descripcion: Optional[str] = None
    usos_maximos: Optional[int] = None
    tipo_descuento: Optional[str] = None
    
    class Config:
        from_attributes = True
    
class DescuentoRead(DescuentoCreate):
    """Esquema para la respuesta de un descuento."""
    id: int
    usos_actuales: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime]
    
    class Config:
        from_attributes = True

class ResultadoTarifas(BaseModel):
    creadas: List[TarifaEventoRead]
    actualizadas: List[TarifaEventoRead]