from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CategoriaPublicoCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None


class CategoriaPublicoUpdate(CategoriaPublicoCreate):
    # Todos los campos son opcionales al actualizar
    nombre: Optional[str] = Field(None, max_length=100)
    estado: Optional[bool] = None 
    

class CategoriaPublicoRead(CategoriaPublicoCreate):
    id: int
    estado: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime]
    
    class Config:
        from_attributes = True 