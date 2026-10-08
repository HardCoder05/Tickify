# tickets/controllers/ticket_controller.py
import hashlib
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from compras.models.Compra import Compra
from events.models.Evento import Evento
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa
from events.models.Zona import Zona
from events.models.Etapa import Etapa
from tickets.models.Ticket import Ticket
from tickets.models.TicketSchema import TicketCreate, TicketRead, TicketWithDetails
from tickets.models.TipoTicket import TipoTicket
from users.models.Usuario import Usuario
from events.controllers.EventoController import get_tarifa_by_id, get_fecha_by_id
from events.services.CloudinaryServicios import upload_qr_image
from tickets.services.TicketService import generate_qr_image
from events.models.Asiento import Asiento
from events.models.AsientoFecha import AsientoFecha

ESTADO_ACTIVO = "valido"
ESTADO_CANCELADO = "cancelado" 

ESTADO_COMPRA_PAGADA = "pagada"

# Consulta base para obtener tickets con todos los detalles (JOINs)
def get_base_ticket_query(db: Session):
    """Retorna la query base con todos los JOINs necesarios para los detalles del ticket."""
    return db.query(
        Ticket,
        EventoFecha.id.label('evento_fecha_id'),
        Evento.nombre.label('evento_nombre'),
        EventoFecha.fecha_inicio.label('evento_fecha_inicio'),
        EventoFecha.fecha_fin.label('evento_fecha_fin'),
        Tarifa.nombre.label('tarifa_nombre'),
        Zona.nombre.label('zona_nombre'),
        Compra.codigo_confirmacion.label('compra_codigo_confirmacion'),
        Compra.estado.label('compra_estado'),
        TipoTicket.nombre.label('tipo_ticket_nombre'),
        TipoTicket.descripcion.label('tipo_ticket_descripcion')
    ).join(
        Compra, Ticket.compra_id == Compra.id
    ).join(
        EventoFecha, Ticket.evento_fecha_id == EventoFecha.id
    ).join(
        Evento, EventoFecha.evento_id == Evento.id
    ).join(
        Tarifa, Ticket.tarifa_id == Tarifa.id
    ).join(
        Zona, Tarifa.zona_id == Zona.id
    ).join(
        TipoTicket, Tarifa.tipo_ticket_id == TipoTicket.id
    ).outerjoin(
        Etapa, Tarifa.etapa_id == Etapa.id
    ).filter(Ticket.estado == ESTADO_ACTIVO)

def map_ticket_to_details(ticket_data: Tuple) -> TicketWithDetails:
    """Mapea el resultado de la consulta compleja (tuple) a TicketWithDetails."""
    (ticket, evento_fecha_id, evento_nombre, fecha_inicio, fecha_fin, tarifa_nombre, zona_nombre, codigo_confirmacion, 
     compra_estado, tipo_ticket_nombre, tipo_ticket_descripcion)= ticket_data
    
    # Asegurarse de que los decimales sean float al mapear
    precio_pagado = float(ticket.precio_pagado) if ticket.precio_pagado is not None else 0.0
    
    
    return TicketWithDetails(
        id=ticket.id,
        evento_fecha_id = evento_fecha_id,
        numero=ticket.numero,
        fecha_compra=ticket.fecha_compra,
        estado=ticket.estado,
        codigo_qr=ticket.codigo_qr,
        precio_pagado=precio_pagado,
        

        evento_nombre=evento_nombre,
        evento_fecha_inicio=fecha_inicio,
        evento_fecha_fin=fecha_fin,
        tarifa_nombre=tarifa_nombre,
        zona_nombre=zona_nombre,
        compra_codigo_confirmacion=codigo_confirmacion,
        compra_estado=compra_estado,
        tipo_ticket_nombre = tipo_ticket_nombre,
        tipo_ticket_descripcion = tipo_ticket_descripcion

    )

# --- LECTURA ---

def get_tickets_with_details_filtered(
    db: Session, 
    usuario_id: Optional[int] = None, # Filtro obligatorio para el cliente
    organizacion_id: Optional[int] = None, # Filtro para el organizador
    estado: Optional[str] = None,
    evento_nombre: Optional[str] = None,
    zona_nombre: Optional[str] = None,
    tipo_ticket_id: Optional[int] = None,  # Filtro por tipo de ticket
    tipo_ticket_nombre: Optional[str] = None,  # Filtro por nombre de tipo de ticket
    etapa_id: Optional[int] = None,  # Filtro por etapa
    fecha_evento_desde: Optional[datetime] = None,
    fecha_evento_hasta: Optional[datetime] = None,
) -> List[TicketWithDetails]:
    """
    Obtiene tickets con detalles, aplicando filtros opcionales de búsqueda.
    Incluye filtros por tipo de ticket y etapa.
    """
    
    query = get_base_ticket_query(db)
    
    if usuario_id is not None:
        query = query.filter(Compra.usuario_id == usuario_id)
    
    if organizacion_id is not None:
        query = query.filter(Evento.organizador_id == organizacion_id)

    #Aplicar filtros OPCIONALES
    
    if estado is not None:
        query = query.filter(Ticket.estado == estado)
        
    if evento_nombre is not None:
        # Usa ilike para búsqueda insensible a mayúsculas/minúsculas en PostgreSQL
        query = query.filter(Evento.nombre.ilike(f"%{evento_nombre}%"))

    if zona_nombre is not None:
        query = query.filter(Zona.nombre.ilike(f"%{zona_nombre}%"))
    
    if tipo_ticket_id is not None:
        query = query.filter(Tarifa.tipo_ticket_id == tipo_ticket_id)
    
    if tipo_ticket_nombre is not None:
        query = query.filter(TipoTicket.nombre.ilike(f"%{tipo_ticket_nombre}%"))
    
    if etapa_id is not None:
        query = query.filter(Tarifa.etapa_id == etapa_id)
        
    if fecha_evento_desde is not None:
        query = query.filter(EventoFecha.fecha_inicio >= fecha_evento_desde)

    if fecha_evento_hasta is not None:
        query = query.filter(EventoFecha.fecha_fin <= fecha_evento_hasta)

    tickets_data = query.all()
    return [map_ticket_to_details(data) for data in tickets_data]

def get_ticket_by_id(db: Session, ticket_id: int) -> Optional[Ticket]:
    """Obtiene un ticket base por ID (retorna el objeto DB)."""
    return db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.estado == ESTADO_ACTIVO).first()

def get_ticket_by_qr(db: Session, codigo_qr: str) -> Optional[Ticket]:
    """Obtiene un ticket por su código QR."""
    return db.query(Ticket).filter(Ticket.codigo_qr == codigo_qr).first()

def get_ticket_with_details_by_id(db: Session, ticket_id: int) -> Optional[TicketWithDetails]:
    """Obtiene un ticket por ID con todos los detalles y lo mapea al esquema."""
    ticket_data = get_base_ticket_query(db).filter(Ticket.id == ticket_id).first()
    
    return map_ticket_to_details(ticket_data) if ticket_data else None

def get_tickets_by_user_id(db: Session, usuario_id: int) -> List[TicketWithDetails]:
    """Obtiene tickets de un usuario con todos los detalles y los mapea al esquema."""
    # Filter tickets by user, including those from pending purchases (not just paid)
    tickets_data = (
        get_base_ticket_query(db)
        .filter(Compra.usuario_id == usuario_id)
        # Don't filter by Compra.estado - show tickets from all purchase states
        .all()
    )
    print(f"🔍 DEBUG: Found {len(tickets_data)} tickets for user {usuario_id}")
    return [map_ticket_to_details(data) for data in tickets_data]


def get_tickets_by_user_and_event(db: Session, usuario_id: int, evento_id: int) -> List[TicketWithDetails]:
    """Obtiene tickets de un usuario para un evento específico (usado por organizadores).

    Retorna los tickets mapeados al esquema TicketWithDetails filtrando por compra.usuario_id
    y por evento.id.
    """
    tickets_data = (
        get_base_ticket_query(db)
        .filter(Compra.usuario_id == usuario_id)
        .filter(Evento.id == evento_id)
        .all()
    )
    return [map_ticket_to_details(data) for data in tickets_data]
    
def get_tickets_by_compra_id(db: Session, compra_id: int, compra_estado: str = ESTADO_COMPRA_PAGADA) -> List[TicketWithDetails]:
    """Obtiene todos los tickets de una compra y los mapea a List[TicketWithDetails]."""
    tickets = (
        db.query(
            Ticket.id,
            Ticket.evento_fecha_id,
            Ticket.numero,
            Ticket.fecha_compra,
            Ticket.estado,
            Ticket.codigo_qr,
            Ticket.precio_pagado,
            Ticket.compra_id,      
            Ticket.tarifa_id,      
            Ticket.fecha_creacion,      
            Ticket.fecha_actualizacion,      
            Tarifa.nombre.label("tarifa_nombre"),
            Zona.nombre.label("zona_nombre"),
            Compra.codigo_confirmacion.label("compra_codigo_confirmacion"),
            Compra.estado.label("compra_estado"),
            TipoTicket.nombre.label("tipo_ticket_nombre"),
            TipoTicket.descripcion.label("tipo_ticket_descripcion"),
            Evento.nombre.label("evento_nombre"),
            EventoFecha.fecha_inicio.label("evento_fecha_inicio"),
            EventoFecha.fecha_fin.label("evento_fecha_fin"),
        )
        .join(Tarifa, Ticket.tarifa_id == Tarifa.id)
        .join(Zona, Tarifa.zona_id == Zona.id)
        .join(Compra, Ticket.compra_id == Compra.id)
        .join(TipoTicket, Tarifa.tipo_ticket_id == TipoTicket.id)
        .join(EventoFecha, Ticket.evento_fecha_id == EventoFecha.id)
        .join(Evento, EventoFecha.evento_id == Evento.id)
        .filter(Ticket.compra_id == compra_id, Compra.estado == compra_estado)
        .all()
    )
    return tickets
    
    
def get_tickets_by_evento_id(db: Session, evento_id: int) -> List[Ticket]:
    """Obtiene todas los tickets de un evento."""
    return (
    db.query(Ticket)
    .join(EventoFecha, EventoFecha.id == Ticket.evento_fecha_id)
    .join(Evento, Evento.id == EventoFecha.evento_id)
    .filter(Evento.id == evento_id, Ticket.estado == ESTADO_ACTIVO)
    .all()
)

def get_tickets_by_fecha_id(db: Session, fecha_id: int) -> List[Ticket]:
    """Obtiene todos los tickets de una fecha específica de un evento."""
    return (
        db.query(Ticket)
        .filter(Ticket.evento_fecha_id == fecha_id, Ticket.estado == ESTADO_ACTIVO)
        .all()
    )

def get_organizador_id_by_ticket_id(db: Session, ticket_id: int) -> Optional[int]:
    """Obtiene el ID del Organizador del Evento al que pertenece el ticket."""
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None
        
    #Unir Ticket -> EventoFecha -> Evento para obtener organizador_id
    organizador_id = db.query(Evento.organizador_id).join(
        EventoFecha, Evento.id == EventoFecha.evento_id
    ).filter(
        EventoFecha.id == ticket.evento_fecha_id
    ).scalar() 
    
    return organizador_id

# --- ESCRITURA ---

def create_ticket_db(db: Session, ticket_data: TicketCreate, compra_id: int, usuario_id: int) -> Ticket:
    """Crea un nuevo ticket y lo añade a la sesión de la DB """

    asiento_fecha = (
        db.query(AsientoFecha)
        .filter(
            AsientoFecha.id == ticket_data.asiento_fecha_id,
            AsientoFecha.estado == "reservado",
            AsientoFecha.reservado_por == usuario_id
        )
        .with_for_update()
        .first()
    )

    if not asiento_fecha:
        raise ValueError(
            "El asiento seleccionado no está reservado por este usuario o ya fue vendido"
        )
    
    if asiento_fecha.reserva_expira and asiento_fecha.reserva_expira < datetime.utcnow():
        raise ValueError("La reserva de este asiento ha expirado")
    
    numero_ticket = f"TCKT-{str(uuid.uuid4())[:8].upper()}"
    
    if not ticket_data.tarifa_id:
        raise ValueError("tarifa_id es requerido para crear un ticket")
    
    tarifa = get_tarifa_by_id(db,ticket_data.tarifa_id)
    if not tarifa:
        raise ValueError(f"Tarifa con ID {ticket_data.tarifa_id} no encontrada")
    
    fecha_evento = db.query(EventoFecha).filter(
        EventoFecha.id == ticket_data.evento_fecha_id
    ).with_for_update().first()

    if not fecha_evento:
        raise ValueError(f"Fecha de evento con ID {ticket_data.evento_fecha_id} no encontrada")
    
    if fecha_evento.aforo_disponible <= 0:
        raise ValueError("No hay aforo disponible para esta fecha")
    
    precio_pagado = tarifa.precio
    
    #Encriptar string usando hashlib
    raw_string = f"{numero_ticket}-{compra_id}-{tarifa.id}-{datetime.utcnow().timestamp()}"
    hash_str = hashlib.sha256(raw_string.encode()).hexdigest()
    data_string = f"TICKET-{hash_str}"

    try:
        qr_buffer = generate_qr_image(data_string)
        qr_url = upload_qr_image(qr_buffer, public_id=f"ticket_temp_{hash_str[:8]}")
    except Exception as e:
        raise Exception(f"Fallo al generar o subir el QR: {e}")
    
    nuevo_ticket = Ticket(
        compra_id=compra_id,
        tarifa_id=ticket_data.tarifa_id,
        evento_fecha_id=ticket_data.evento_fecha_id,
        numero=numero_ticket,
        estado='valido',
        precio_pagado=precio_pagado,
        codigo_qr=qr_url,
        asiento_fecha_id=asiento_fecha.id,
        fecha_creacion=datetime.utcnow(),
        fecha_actualizacion=datetime.utcnow()
    )

    
    asiento_fecha.estado = "vendido"
    asiento_fecha.reservado_por = None
    asiento_fecha.reserva_expira = None
    
    fecha_evento.aforo_disponible -= 1
    
    db.add(asiento_fecha)
    db.add(fecha_evento)
    db.add(nuevo_ticket)
    
    db.flush()

    return nuevo_ticket 


def update_ticket_estado_db(db: Session, ticket: Ticket, nuevo_estado: str) -> Ticket:
    """Actualiza el estado de un ticket y retorna el esquema TicketRead actualizado."""
    ticket.estado = nuevo_estado
    ticket.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket

# --- FUNCIONES DE VERIFICACIÓN (para usarse en la ruta) ---

def check_compra_exists(db: Session, compra_id: int) -> bool:
    return db.query(Compra).filter(Compra.id == compra_id).first() is not None

def check_tarifa_exists(db: Session, tarifa_id: int) -> bool:
    return db.query(Tarifa).filter(Tarifa.id == tarifa_id).first() is not None

def check_evento_fecha_exists(db: Session, evento_fecha_id: int) -> bool:
    return db.query(EventoFecha).filter(EventoFecha.id == evento_fecha_id).first() is not None

def check_usuario_exists(db: Session, usuario_id: int) -> bool:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first() is not None

def get_resumen_tickets_por_evento_fecha_y_zona(db: Session, evento_id: int) -> List[Dict]:
    """
    Retorna el resumen de tickets vendidos por EventoFecha y Zona,
    junto con los ingresos estimados por cada zona.
    Incluye fechas y zonas aunque no tengan tickets vendidos.
    """
    resultados = (
        db.query(
            EventoFecha.id.label("evento_fecha_id"),
            EventoFecha.fecha_inicio.label("fecha_inicio"),
            Zona.nombre.label("zona_nombre"),
            func.coalesce(func.count(Ticket.id), 0).label("cantidad"),
            func.coalesce(func.sum(Ticket.precio_pagado), 0).label("ingresos_estimados")
        )
        .select_from(EventoFecha)  
        .join(Zona, Zona.evento_id == EventoFecha.evento_id)  
        .outerjoin(
            Tarifa,
            Tarifa.zona_id == Zona.id
        )
        .outerjoin(
            Ticket,
            and_(
                Ticket.tarifa_id == Tarifa.id,
                Ticket.evento_fecha_id == EventoFecha.id,
                Ticket.estado == ESTADO_ACTIVO
            )
        )
        .outerjoin(
            Compra,
            and_(
                Compra.id == Ticket.compra_id,
                Compra.estado == ESTADO_COMPRA_PAGADA
            )
        )
        .filter(EventoFecha.evento_id == evento_id)
        .group_by(EventoFecha.id, EventoFecha.fecha_inicio, Zona.nombre)
        .order_by(EventoFecha.fecha_inicio.asc(), Zona.nombre.asc())
        .all()
    )

    # Estructurar resultado agrupando por evento_fecha
    resumen = {}
    for r in resultados:
        fecha_key = r.fecha_inicio.isoformat()
        if fecha_key not in resumen:
            resumen[fecha_key] = {
                "evento_fecha": fecha_key,
                "zonas": []
            }

        resumen[fecha_key]["zonas"].append({
            "zona": r.zona_nombre,
            "cantidad": int(r.cantidad),
            "ingresos": float(r.ingresos_estimados or 0.0)
        })

    return list(resumen.values())