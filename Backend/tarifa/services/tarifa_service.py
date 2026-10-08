import datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from events.models.Etapa import Etapa
from events.models.EtapaTarifa import EtapaTarifa
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa


def list_tarifas_por_zona(db: Session, zona_id: int):
    return db.query(Tarifa).filter(Tarifa.zona_id == zona_id, Tarifa.estado == 'activo').all()

def tarifa_aplicable(db: Session, evento_fecha_id: int, zona_id: int):
    now = datetime.date.today()
    evento_fecha = db.query(EventoFecha).filter(EventoFecha.id == evento_fecha_id).first()
    if not evento_fecha:
        return None

    evento_id = evento_fecha.evento_id
    etapa = db.query(Etapa).filter(Etapa.evento_id == evento_id, Etapa.fecha_inicio <= now, (Etapa.fecha_fin == None) | (Etapa.fecha_fin >= now)).order_by(Etapa.fecha_inicio.desc()).first()
    if not etapa:
        return db.query(Tarifa).filter(Tarifa.zona_id == zona_id, Tarifa.estado == 'activo').first()

    tarifa = db.query(Tarifa).filter(Tarifa.zona_id == zona_id).first()
    if not tarifa:
        return None

    etapa_tarifa = db.query(EtapaTarifa).filter(EtapaTarifa.etapa_id == etapa.id, EtapaTarifa.tarifa_id == tarifa.id).first()
    if etapa_tarifa and etapa_tarifa.estado:
        return etapa_tarifa

    return tarifa
