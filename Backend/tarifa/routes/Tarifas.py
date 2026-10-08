from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from events.models.EtapaTarifaSchema import EtapaTarifaResponse
from tarifa.services.tarifa_service import list_tarifas_por_zona, tarifa_aplicable

router = APIRouter(prefix='/tickets/tarifas', tags=['tarifas'])

@router.get('/zona/{zona_id}')
def get_tarifas_por_zona(zona_id: int, db: Session = Depends(get_db)):
    tarifas = list_tarifas_por_zona(db, zona_id)
    return tarifas

@router.get('/aplicable')
def get_tarifa_aplicable(evento_fecha_id: int, zona_id: int, db: Session = Depends(get_db)):
    tarifa = tarifa_aplicable(db, evento_fecha_id, zona_id)
    if tarifa is None:
        raise HTTPException(status_code=404, detail='Tarifa no encontrada')
    return tarifa
