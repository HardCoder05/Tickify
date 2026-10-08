from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from pago.models.PagoSchema import PagoCreate, PagoRead, PagoSimular
from pago.services.PagoService import procesar_pago, simular_pago

router = APIRouter(
    prefix="/api/v1/pagos",
    tags=["pagos"]
)


@router.post("/", response_model=PagoRead)
def crear_pago(pago: PagoCreate, db: Session = Depends(get_db)):
    try:
        p = procesar_pago(db, compra_id=pago.compra_id, metodo_pago=pago.metodo_pago, monto=pago.monto)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return p


@router.post("/simular", response_model=PagoRead)
def simular_pago_endpoint(pago: PagoSimular, db: Session = Depends(get_db)):
    """
    Simula un pago para pruebas locales.
    
    - aprobado=true: procesa el pago exitosamente y marca la compra como 'pagada'
    - aprobado=false: crea un pago fallido y marca la compra como 'fallida'
    
    Útil para testing sin integración con pasarelas de pago reales.
    """
    try:
        p = simular_pago(
            db, 
            compra_id=pago.compra_id, 
            metodo_pago=pago.metodo_pago, 
            monto=pago.monto, 
            aprobado=pago.aprobado
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return p
