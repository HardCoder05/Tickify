from fastapi import HTTPException

from events.services.event_service import create_evento as create_evento_service
from events.services.event_service import get_evento as get_evento_service
from events.services.event_service import list_eventos as list_eventos_service


def get_evento(db, evento_id: int):
    evento = get_evento_service(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    return evento

def list_eventos(db, skip=0, limit=100):
    return list_eventos_service(db, skip, limit)

def create_evento(db, evento_data: dict):
    return create_evento_service(db, evento_data)
