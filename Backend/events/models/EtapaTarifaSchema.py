from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class EtapaTarifaBase(BaseModel):
    etapa_id: int
    tarifa_id: int
    precio: Decimal
    cantidad: Optional[int] = None
    estado: Optional[bool] = True

class EtapaTarifaResponse(EtapaTarifaBase):
    id: int

    class Config:
        orm_mode = True
