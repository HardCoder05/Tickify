import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from decimal import Decimal
from compras.models.Compra import Compra
from compras.models.CompraSchema import CompraCreate, CompraWithTickets
from tickets.controllers.TicketController import (
    create_ticket_db,
    get_tickets_by_compra_id,
)
from events.services.DescuentoServicios import aplicar_descuento_a_compra
from events.controllers.EventoController import get_evento_by_evento_fecha_id
from events.models import EventoFecha, Evento
from tickets.models.Ticket import Ticket
from events.models.AsientoFecha import AsientoFecha
# --- Helpers de Mapeo de Datos ---

def map_compra_to_with_tickets(compra: Compra, db: Session) -> CompraWithTickets:
    """Mapea un objeto Compra a CompraWithTickets, incluyendo todos los detalles de sus tickets."""
    tickets_data = []

    # Get tickets regardless of compra estado (pendiente, pagada, etc.)
    for t in get_tickets_by_compra_id(db, compra.id, compra_estado=compra.estado):
        tickets_data.append({
            "id": t.id,
            "numero": t.numero,
            "estado": t.estado,
            "precio_pagado": float(t.precio_pagado or 0.0),
            "fecha_compra": t.fecha_compra,
            "evento_nombre": t.evento_nombre,
            "evento_fecha_inicio": t.evento_fecha_inicio,
            "evento_fecha_fin": t.evento_fecha_fin,
            "zona_nombre": t.zona_nombre,
            "tarifa_nombre": t.tarifa_nombre,
            "tipo_ticket_nombre": t.tipo_ticket_nombre,
            "tipo_ticket_descripcion": t.tipo_ticket_descripcion,
        })

    return CompraWithTickets(
        id=compra.id,
        usuario_id=compra.usuario_id,
        fecha=compra.fecha,
        monto_subtotal=float(compra.monto_subtotal or 0.0),
        monto_total=float(compra.monto_total or 0.0),
        descuento_total_aplicado=float(compra.descuento_total_aplicado or 0.0),
        metodo_pago=compra.metodo_pago,
        estado=compra.estado,
        codigo_confirmacion=compra.codigo_confirmacion,
        tickets=tickets_data,
    )


# --- Funciones CRUD de Compras ---

def create_compra_db(db: Session, compra: CompraCreate) -> Compra:
    """Crea una nueva compra en la base de datos."""
    codigo_confirmacion = f"CONF{str(uuid.uuid4())[:8].upper()}"

    nueva_compra = Compra(
        usuario_id=compra.usuario_id,
        metodo_pago=compra.metodo_pago,
        codigo_confirmacion=codigo_confirmacion,
        estado='pendiente',
        monto_subtotal=Decimal('0.00'),
        monto_total=Decimal('0.00'),
        descuento_total_aplicado=Decimal('0.00'),
        codigo_descuento = compra.codigo_descuento
    )

    try:
        db.add(nueva_compra)
        db.flush() 
        
        print(f"🔍 DEBUG: Creando compra {nueva_compra.id} con {len(compra.tickets)} tickets")

        asiento_fecha_ids = [ticket.asiento_fecha_id for ticket in compra.tickets]

        asientos_reservados = (
            db.query(AsientoFecha)
            .filter(
                AsientoFecha.id.in_(asiento_fecha_ids),
                AsientoFecha.estado == "reservado",
                AsientoFecha.reservado_por == compra.usuario_id
            )
            .all()
        )
        
        if len(asientos_reservados) != len(compra.tickets):
            db.rollback()
            raise ValueError(
                "Algunos asientos no están reservados por ti o la reserva expiró. "
                "Por favor, vuelve a seleccionar tus asientos."
            )
        
        # Verificar que las reservas no hayan expirado
        ahora = datetime.utcnow()
        for asiento in asientos_reservados:
            if asiento.reserva_expira and asiento.reserva_expira < ahora:
                db.rollback()
                raise ValueError(
                    "Tu reserva ha expirado. Por favor, vuelve a seleccionar tus asientos."
                )
        
        monto_subtotal_calculado = Decimal('0.00')

        for i, ticket_data in enumerate(compra.tickets):
            print(f"🎫 DEBUG: Creando ticket {i+1}/{len(compra.tickets)} - tarifa_id={ticket_data.tarifa_id}, evento_fecha_id={ticket_data.evento_fecha_id}")
            try:
                ticket_creado = create_ticket_db(db, ticket_data, nueva_compra.id,nueva_compra.usuario_id)
                monto_subtotal_calculado += Decimal(str(ticket_creado.precio_pagado))
                print(f"✅ DEBUG: Ticket {i+1} creado exitosamente - precio={ticket_creado.precio_pagado}")
            except Exception as e:
                print(f"❌ DEBUG: Error creando ticket {i+1}: {str(e)}")
                raise e

        nueva_compra.monto_subtotal = monto_subtotal_calculado
        
        # Only process descuento if there are tickets
        descuento_total = Decimal('0.00')
        if compra.tickets and compra.codigo_descuento:
            evento = get_evento_by_evento_fecha_id(db, compra.tickets[0].evento_fecha_id, "CLIENTE")
            descuento_total = aplicar_descuento_a_compra(db, compra.codigo_descuento, evento.id, monto_subtotal_calculado, len(compra.tickets))
            
        nueva_compra.descuento_total_aplicado = descuento_total
        nueva_compra.monto_total = monto_subtotal_calculado - descuento_total

        db.commit()
        db.refresh(nueva_compra)
        return nueva_compra

    except ValueError as e:
        # 💡 Captura errores de negocio (aforo, no encontrado) de create_ticket_db
        db.rollback() 
        raise e
    except IntegrityError as e:
        db.rollback() 
        print(f"IntegrityError completo: {str(e)}")
        print(f"Error original: {e.orig}")
        
        # Analiza el mensaje de error
        error_msg = str(e.orig).lower()
        
        if 'foreign key' in error_msg or 'violates foreign key' in error_msg:
            raise ValueError("ID de evento, tarifa o usuario no válido")
        elif 'unique' in error_msg or 'duplicate' in error_msg:
            raise ValueError("Conflicto: registro duplicado")
        elif 'check' in error_msg:
            raise ValueError("Violación de restricción: valor no permitido")
        else:
            # Si no sabemos qué es, lanzamos el error original
            raise ValueError(f"Error de base de datos: {str(e.orig)}")
    except Exception as e:
        db.rollback()
        raise e


def get_all_compras(db: Session, usuario_id: Optional[int] = None, estado: Optional[str] = None) -> List[Compra]:
    query = db.query(Compra)
    if usuario_id:
        query = query.filter(Compra.usuario_id == usuario_id)
    if estado:
        query = query.filter(Compra.estado == estado)
    return query.all()


def get_compras_by_user_id(db: Session, usuario_id: int) -> List[CompraWithTickets]:
    compras = db.query(Compra).filter(Compra.usuario_id == usuario_id).all()
    return [map_compra_to_with_tickets(compra, db) for compra in compras]


def get_compra_by_id(db: Session, compra_id: int) -> Optional[CompraWithTickets]:
    compra = db.query(Compra).filter(Compra.id == compra_id).first()
    if not compra:
        return None
    return map_compra_to_with_tickets(compra, db)


def get_compra_by_codigo(db: Session, codigo_confirmacion: str) -> Optional[CompraWithTickets]:
    compra = db.query(Compra).filter(Compra.codigo_confirmacion == codigo_confirmacion).first()
    if not compra:
        return None
    return map_compra_to_with_tickets(compra, db)


def update_compra_estado(db: Session, compra_id: int, nuevo_estado: str) -> Optional[Compra]:
    compra = db.query(Compra).filter(Compra.id == compra_id).first()
    if not compra:
        return None

    compra.estado = nuevo_estado
    compra.fecha_actualizacion = datetime.utcnow()

    db.add(compra)
    db.commit()
    db.refresh(compra)

    return compra

def get_compras_by_evento(db:Session, evento_id: int):
    return (
        db.query(Compra)
        .join(Ticket, Compra.id == Ticket.compra_id)
        .join(EventoFecha, Ticket.evento_fecha_id == EventoFecha.id)
        .join(Evento, Evento.id == EventoFecha.evento_id)
        .filter(Evento.id == evento_id, Evento.estado == "activo")
        .all()  
    )

def get_compras_by_fecha_evento(db: Session, evento_fecha_id: int):
    return (
        db.query(Compra)
        .join(Ticket, Ticket.compra_id == Compra.id)
        .filter(
            Ticket.evento_fecha_id == evento_fecha_id,
            Compra.estado == "activo"
        )
        .all()
    )

def get_ganancias_evento_compra(db:Session, compras: List[Compra]):
    total_ganancias = 0.0
    for compra in compras:
        total_ganancias += compra.monto_total
    return total_ganancias


    
