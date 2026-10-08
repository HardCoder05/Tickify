""""""
import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from compras.models.Compra import Compra
from compras.models.CompraSchema import CompraCreate
from compras.controllers.CompraController import create_compra_db
#from events.models.EtapaTarifa import EtapaTarifa
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa
from tarifa.services.tarifa_service import tarifa_aplicable
from users.models.Usuario import Usuario


def generar_numero_ticket(compra_id: int, index: int):
    return f"T-{compra_id}-{index+1:04d}"


def generar_codigo_qr():
    return str(uuid.uuid4())


def realizar_compra(db: Session, usuario_id: int, tickets: list, metodo_pago: str, estado: str = 'pendiente'):
    """Procesa una compra de forma transaccional.

    tickets: lista de TicketCreate con {evento_fecha_id, zona_id, tarifa_id}
    Retorna el objeto Compra recién creado (instancia SQLAlchemy).
    """

    # Verificar usuario
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise Exception("Usuario no encontrado")

    try:
        # Validar aforo disponible para cada evento_fecha antes de crear
        from collections import defaultdict
        tickets_por_fecha = defaultdict(int)
        
        for ticket in tickets:
            tickets_por_fecha[ticket.evento_fecha_id] += 1

        # Verificar aforo disponible para cada evento_fecha
        for evento_fecha_id, cantidad_total in tickets_por_fecha.items():
            ef = db.query(EventoFecha).with_for_update().filter(EventoFecha.id == evento_fecha_id).first()
            if not ef:
                raise Exception(f'EventoFecha {evento_fecha_id} no encontrado')
            if ef.aforo_disponible < cantidad_total:
                raise Exception(f'No hay suficiente aforo disponible para evento_fecha {evento_fecha_id}')

        # Crear objeto CompraCreate y delegar a create_compra_db
        compra_create = CompraCreate(
            usuario_id=usuario_id,
            metodo_pago=metodo_pago,
            tickets=tickets,
            estado=estado
        )
        
        nueva_compra = create_compra_db(db, compra_create)
        return nueva_compra

    except Exception:
        db.rollback()
        raise
