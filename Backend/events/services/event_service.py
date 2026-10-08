import datetime

from sqlalchemy.orm import Session

from events.models.Evento import Evento
from events.models.EventoFecha import EventoFecha


def get_evento(db: Session, evento_id: int):
    return db.query(Evento).filter(Evento.id == evento_id).first()

def list_eventos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Evento).offset(skip).limit(limit).all()

def create_evento(db: Session, evento_data: dict):
    evento = Evento(**evento_data)
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento

def create_evento_fecha(db: Session, fecha_data: dict):
    fecha = EventoFecha(**fecha_data)
    db.add(fecha)
    db.commit()
    db.refresh(fecha)
    return fecha
