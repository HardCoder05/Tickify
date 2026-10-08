from fastapi import HTTPException, status
from events.models.Descuento import Descuento # Modelo Descuento (Asumido)
from compras.models.Compra import Compra
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from typing import Optional
from events.controllers.EventoController import get_descuento_by_codigo,usar_descuento
from events.models.Descuento import TipoDescuento
ESTADO_ACTIVO = "activo"



def aplicar_descuento_a_compra(
    db: Session, 
    codigo_descuento: str, 
    evento_id: int, 
    subtotal: Decimal,
    cantidad_tickets: int
) -> Decimal:
    """
    Busca, valida y calcula el descuento a aplicar.

    Retorna: (descuento_aplicado)
    """
    if not codigo_descuento:
        return Decimal('0.00')

    descuento = get_descuento_by_codigo(db, codigo_descuento)
    
    if not descuento or descuento.estado != ESTADO_ACTIVO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El código de descuento no es válido o está inactivo."
        )
    
    if descuento.evento_id != evento_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El código de descuento no es válido para este evento."
        )

    now = datetime.utcnow().date()
    if now < descuento.fecha_inicio or now > descuento.fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El código de descuento está fuera del período de validez."
        )

    if usar_descuento(db,descuento,cantidad_tickets):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Se ha superado la cantidad máxima de usos del descuento"
        )

    descuento_aplicado = Decimal('0.00')
    
    if descuento.tipo_descuento == TipoDescuento.porcentaje:
        porcentaje = Decimal(str(descuento.valor)) / Decimal('100.0')
        return subtotal * porcentaje
    elif descuento.tipo_descuento == TipoDescuento.efectivo:
        return min(subtotal, Decimal(str(descuento.valor))) # No descontar más del subtotal
    else:
        return Decimal('0.00')