from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ============================================================
# ESQUEMAS PARA ASIENTO (Layout Base)
# ============================================================

class AsientoDeshabilitado(BaseModel):
    fila: int
    numero: int


class AsientoLayoutCreate(BaseModel):
    """Para crear el layout base de una zona"""
    zona_id: int
    filas: int = Field(gt=0, description="Número de filas")
    columnas: int = Field(gt=0, description="Número de columnas por fila")
    asientos_deshabilitados: Optional[List[AsientoDeshabilitado]] = []

class AsientoBase(BaseModel):
    fila: int
    numero: int
    zona_id: int
    estado: str = "activo"

class AsientoRead(AsientoBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True


# ============================================================
# ESQUEMAS PARA ASIENTO_FECHA (Disponibilidad por Fecha)
# ============================================================

class AsientoFechaCreate(BaseModel):
    """Para crear asientos_fecha a partir del layout base"""
    evento_fecha_ids: List[int] = Field(
        description="IDs de las fechas del evento para replicar el layout"
    )

class AsientoFechaBase(BaseModel):
    asiento_id: int
    evento_fecha_id: int
    estado: str = "libre"

class AsientoFechaRead(AsientoFechaBase):
    id: int
    reservado_por: Optional[int] = None
    reserva_expira: Optional[datetime] = None
    
    # Información del asiento base
    asiento: Optional[AsientoRead] = None

    class Config:
        from_attributes = True

class AsientoFechaDetallado(BaseModel):
    """Para mostrar al usuario con toda la información"""
    id: int
    fila: int
    numero: int
    zona_nombre: str
    evento_fecha_id: int
    estado: str
    reservado_por: Optional[int] = None
    reserva_expira: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# ESQUEMAS PARA RESERVA TEMPORAL
# ============================================================

class ReservaTemporalCreate(BaseModel):
    asiento_fecha_ids: List[int] = Field(
        description="IDs de AsientoFecha a reservar"
    )
    duracion_minutos: int = Field(
        default=15,
        gt=0,
        le=60,
        description="Duración de la reserva en minutos (máx 60)"
    )

class ReservaTemporalRead(BaseModel):
    asiento_fecha_id: int
    fila: int
    numero: int
    zona_nombre: str
    estado: str
    reserva_expira: datetime

    class Config:
        from_attributes = True


# ============================================================
# ESQUEMAS PARA ACTUALIZACIÓN
# ============================================================

class AsientoLayoutUpdate(BaseModel):
    """Para actualizar el estado del asiento base"""
    estado: Optional[str] = Field(
        default=None,
        description="activo | eliminado"
    )

class AsientoFechaUpdate(BaseModel):
    """Para actualizar manualmente un asiento_fecha"""
    estado: Optional[str] = Field(
        default=None,
        description="libre | reservado | vendido"
    )

class FilaUpdate(BaseModel):
    """Para operaciones batch en una fila completa"""
    asientos_deshabilitar: Optional[List[int]] = Field(
        default=[],
        description="Números de asiento a marcar como 'eliminado' en el layout base"
    )
    columnas_agregar: Optional[int] = Field(
        default=0,
        ge=0,
        description="Cantidad de nuevos asientos a agregar al final de la fila"
    )


# ============================================================
# ESQUEMAS PARA RESPUESTAS CON LAYOUT COMPLETO
# ============================================================

class LayoutZonaResponse(BaseModel):
    """Respuesta con el layout completo de una zona"""
    zona_id: int
    zona_nombre: str
    total_filas: int
    total_columnas: int
    asientos: List[AsientoRead]

    class Config:
        from_attributes = True

class DisponibilidadFechaResponse(BaseModel):
    """Respuesta con disponibilidad de asientos para una fecha específica"""
    evento_fecha_id: int
    zona_id: int
    zona_nombre: str
    asientos: List[AsientoFechaDetallado]
    estadisticas: dict = Field(
        description="Ej: {'libres': 50, 'reservados': 10, 'vendidos': 15}"
    )

    class Config:
        from_attributes = True