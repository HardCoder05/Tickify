from datetime import datetime, time
from typing import Any, Dict, List, Optional
from sqlalchemy import update,and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from compras.models.Compra import Compra
from events.models.Etapa import Etapa
from events.models.Evento import Evento
from events.models.EventoEsquema import (
    EtapaEvento,
    EventoCompletoResponse,
    EventoCreate,
    FechaEvento,
    TarifaEvento,   
    TipoTicketEvento,
    ZonaEvento,
    EventoFiltro,
    DescuentoCreate,
    DescuentoUpdate,
    FechaEventoUpdate,
)
from events.models.Descuento import Descuento
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa
from events.models.Zona import Zona
from tickets.models.Ticket import Ticket
from tickets.models.TipoTicket import TipoTicket
from users.models.Organizador import Organizador
from users.models.Usuario import Usuario
from events.services.CloudinaryServicios import upload_image, upload_pdf
from fastapi import UploadFile, HTTPException, status
from users.models.Usuario import RolUsuario
from decimal import Decimal
from events.models.Notificacion import Notificacion


ESTADO_ELIMINADO = "eliminado"
ESTADO_ACTIVO = "activo"
ESTADO_BORRADOR = "borrador"
ESTADO_CANCELADO = "cancelado"
ESTADO_FINALIZADO = "finalizado"

ESTADOS_VISIBLES_CLIENTE = [ESTADO_ACTIVO]
ESTADOS_VISIBLES_ORGANIZADOR = [ESTADO_ACTIVO, ESTADO_BORRADOR, ESTADO_CANCELADO, ESTADO_FINALIZADO]
ESTADOS_VISIBLES_ADMIN = [ESTADO_ACTIVO, ESTADO_BORRADOR, ESTADO_CANCELADO, ESTADO_FINALIZADO]

def get_estados_visibles(rol: str):
    print(rol)
    if(rol == "PUBLICO" or rol == "CLIENTE"):
        estados = ESTADOS_VISIBLES_CLIENTE
    elif(rol == "ORGANIZADOR"):
        estados = ESTADOS_VISIBLES_ORGANIZADOR
    elif(rol == "ADMIN"):
        estados = ESTADOS_VISIBLES_ADMIN

    return estados

def get_fecha_by_id(db: Session,fecha_id: int):
    return db.query(EventoFecha).filter(EventoFecha.id == fecha_id).first()

def get_evento_by_evento_fecha_id(db: Session, evento_fecha_id: int, rol: str) -> Optional[Evento]:
    """Obtiene un Evento a través de su EventoFecha ID."""
    estados_visibles_por_rol = get_estados_visibles(rol)
    return (
        db.query(Evento)
        .join(EventoFecha, EventoFecha.evento_id == Evento.id)
        .filter(EventoFecha.id == evento_fecha_id, Evento.estado.in_(estados_visibles_por_rol))
        .first()
    )

def get_evento_by_id(db: Session, evento_id: int, rol: str = "ADMIN") -> Optional[Evento]:
    """Obtiene un evento base por su ID."""
    estados_visibles_por_rol = get_estados_visibles(rol)
    print(f"🔎 Buscando evento con id={evento_id} para rol={rol}")
    print(f"➡️ Estados visibles: {estados_visibles_por_rol}")
    return db.query(Evento).filter(Evento.id == evento_id, Evento.estado.in_(estados_visibles_por_rol)).first()

def get_tipo_ticket_by_id(db: Session, tipo_ticket_id: int) -> Optional[TipoTicket]:
    """Obtiene un tipo ticket base por su ID."""
    return db.query(TipoTicket).filter(TipoTicket.id == tipo_ticket_id).first()

def get_zona_by_id(db: Session, zona_id: int) -> Optional[Zona]:
    """Obtiene una zona base por su ID."""
    return db.query(Zona).filter(Zona.id == zona_id).first()

def get_etapa_by_id(db: Session, etapa_id: int) -> Optional[Etapa]:
    """Obtiene una etapa base por su ID."""
    return db.query(Etapa).filter(Etapa.id == etapa_id).first()

def get_fecha_by_id(db: Session, fecha_id: int) -> Optional[EventoFecha]:
    """Obtiene una etapa base por su ID."""
    return db.query(EventoFecha).filter(EventoFecha.id == fecha_id).first()

def get_eventos_filtrados(
    db: Session, 
    evento_filtro: EventoFiltro,
    rol: str
) -> List[Evento]:
    """Obtiene todos los eventos con filtros opcionales (estado, organizador_id, nombre y rango de fecha)."""
    estados_visibles_por_rol = get_estados_visibles(rol)
    query = db.query(Evento).filter(Evento.estado.in_(estados_visibles_por_rol))
    query = query.filter(Evento.fecha_inicio >= datetime.today())
    if evento_filtro.estado:
        estado_solicitado = evento_filtro.estado
        if estado_solicitado not in estados_visibles_por_rol:
            # Si el usuario pide un estado que no tiene permitido, la consulta debe fallar o devolver vacío.
            # Una forma simple es forzar una condición que no se cumple:
            return []
        query = query.filter(Evento.estado == estado_solicitado)
    
    if evento_filtro.organizador_id:
        query = query.filter(Evento.organizador_id == evento_filtro.organizador_id)

    if evento_filtro.nombre:
        # Usa ilike para SQL LIKE y % para búsqueda parcial
        query = query.filter(Evento.nombre.ilike(f'%{evento_filtro.nombre}%'))
        
    if evento_filtro.fecha_inicio:
        fecha_inicio_dt = datetime.combine(evento_filtro.fecha_inicio.date(), time.min)
        query = query.filter(Evento.fecha_inicio >= fecha_inicio_dt)
    
    if evento_filtro.fecha_fin:
        fecha_fin_dt = datetime.combine(evento_filtro.fecha_fin.date(), time.max)
        query = query.filter(Evento.fecha_fin <= fecha_fin_dt)

    if evento_filtro.categoria_id:
        query = query.filter(Evento.categoria_publico_id == evento_filtro.categoria_id)
        
    return query.all()

def get_fechas_by_evento_id(db: Session, evento_id: int, rol: str | None = None) -> List[EventoFecha]:
    """Obtiene todas las fechas de un evento."""
    return (
        db.query(EventoFecha)
        .filter(
            EventoFecha.evento_id == evento_id,
            EventoFecha.estado == ESTADO_ACTIVO
        )
        .order_by(EventoFecha.fecha_inicio.asc())
        .all()
    )

def get_zonas_by_evento_id(db: Session, evento_id: int, rol: str | None = None) -> List[Zona]:
    """Obtiene todas las zonas de un evento visibles por rol."""
    return (db.query(Zona)
            .filter(Zona.evento_id == evento_id, Zona.estado == ESTADO_ACTIVO)
            .order_by(Zona.nombre.asc())
            .all()
    )

def get_tipo_ticket_by_evento_id(db: Session, evento_id: int, rol: str | None = None) -> List[TipoTicket]:
    """Obtiene todas los tipos tickets de un evento visibles por rol."""
    return (db.query(TipoTicket).filter(TipoTicket.evento_id == evento_id, TipoTicket.estado == ESTADO_ACTIVO)
            .order_by(TipoTicket.nombre.asc())
            .all())

def get_tarifas_by_evento_id(db: Session, evento_id: int, rol: str | None = None) -> List[Tarifa]: 
    """Obtiene todas las tarifas de un evento visibles por rol."""
    return (
            db.query(Tarifa)
            .join(Zona, Tarifa.zona_id == Zona.id)
            .filter(Zona.evento_id == evento_id, Tarifa.estado == ESTADO_ACTIVO, Zona.estado == ESTADO_ACTIVO)
            .order_by(Tarifa.nombre.asc())
            .all()
        )


def get_tarifa_by_id(db: Session, tarifa_id: int) -> Optional[Tarifa]:
    """Obtiene una tarifa por su ID."""
    return db.query(Tarifa).filter(Tarifa.id == tarifa_id).first()

def get_eventos_by_usuario_id(db: Session, usuario_id: int, rol: str) -> Optional[Evento]:
    """Obtiene un evento  por su usuario."""
    estados_visibles = get_estados_visibles(rol) 

    return (
        db.query(Evento)
        .join(Organizador, Evento.organizador_id == Organizador.id)
        .filter(
            Organizador.usuario_id == usuario_id,
            Evento.estado.in_(estados_visibles)
        )
        .all()
    )

def get_etapas_by_evento_id(db: Session, evento_id: int, rol: str) -> List[Etapa]:
    """Obtiene todas las etapas de un evento visibles por rol."""
    return (db.query(Etapa).filter(Etapa.evento_id == evento_id, Etapa.estado == ESTADO_ACTIVO)
            .order_by(Etapa.fecha_inicio.asc())
            .all())

def get_evento_completo(db: Session, evento_id: int, rol: str) -> Optional[EventoCompletoResponse]:
    
    evento = get_evento_by_id(db, evento_id, rol)
    if not evento:
        return None
        
    fechas = get_fechas_by_evento_id(db, evento_id, rol)
    zonas = get_zonas_by_evento_id(db, evento_id, rol)
    tarifas = get_tarifas_by_evento_id(db,evento_id, rol)
    etapas = get_etapas_by_evento_id(db,evento_id, rol)
    tipos_ticket = get_tipo_ticket_by_evento_id(db,evento_id, rol)

    # Mapeo final a Pydantic
    return EventoCompletoResponse(
        evento=evento,
        fechas=fechas,
        zonas= zonas,
        tarifas=tarifas,
        etapas=etapas,
        tipos_ticket = tipos_ticket 
    )

def create_evento_full(db: Session, evento_data: EventoCreate, banner_url: str = None) -> Evento:
    """Crea el evento principal y todos sus objetos anidados (fechas, zonas, tarifas)."""
    
    from events.services.EventoServicios import validar_evento_creacion
    
    # Validar datos del evento principal
    validar_evento_creacion(evento_data)

    try:
        # 1. Crear evento principal
        evento_dict = evento_data.dict(exclude_unset=True, exclude={'fechas', 'zonas','tarifas','etapas','tipos_ticket'})
        evento_dict['estado'] = ESTADO_BORRADOR
        nuevo_evento = Evento(**evento_dict)
        
        db.add(nuevo_evento)
        db.flush() # Obtener el ID antes de commit

        if evento_data.fechas:
            for fecha_data in evento_data.fechas:
                create_fecha_evento(db,nuevo_evento.id,fecha_data)
        
        nuevo_evento.capacidad_maxima = 0
        
        nuevo_evento.estado = ESTADO_BORRADOR
        nuevo_evento.fecha_creacion = datetime.utcnow()
        nuevo_evento.fecha_actualizacion = datetime.utcnow()

        db.commit()
        db.refresh(nuevo_evento)
        return nuevo_evento
        
    except Exception as e:
        db.rollback()
        raise e

def create_banner(db: Session, file: UploadFile, evento: Evento) -> Evento:
    # Subir imagen a Cloudinary
    public_id = None
    if evento.banner_url:
        try:
            # Extrae solo el nombre del archivo sin extensión
            # Ejemplo: .../eventos/623/co5amuywv7xhp0ltoatc.jpg → "co5amuywv7xhp0ltoatc"
            public_id = evento.banner_url.split("/")[-1].split(".")[0]
        except Exception:
            public_id = None

    url = upload_image(file, folder=f"eventos/{evento.id}",public_id=public_id)

    evento.banner_url = url
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento
    

def update_evento_db(db: Session, evento: Evento, evento_data: Dict[str, Any]) -> Evento:
    """Actualiza el evento principal con los datos proporcionados."""
    for key, value in evento_data.items():
        setattr(evento, key, value)
    
    evento.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(evento)
    return evento

def update_evento_fecha(db: Session, fecha: EventoFecha, fecha_data: FechaEventoUpdate) -> EventoFecha:
    """Actualiza una fecha específica de un evento"""
    for key, value in fecha_data.model_dump(exclude_unset=True).items():
        setattr(fecha, key, value)

    fecha.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(fecha)
    return fecha

def update_evento_fechas(db: Session, evento_id: int, fechas_data: List[FechaEvento]) -> None:
    """Actualiza las fechas de un evento. Elimina las fechas existentes y crea las nuevas."""
    try:
        # Eliminar fechas existentes
        db.query(EventoFecha).filter(EventoFecha.evento_id == evento_id).delete()
        db.flush()
        
        # Crear nuevas fechas
        for fecha_data in fechas_data:
            nueva_fecha = EventoFecha(
                evento_id=evento_id,
                fecha_inicio=fecha_data.fecha_inicio,
                fecha_fin=fecha_data.fecha_fin,
                capacidad_maxima=fecha_data.capacidad_maxima,
                aforo_disponible=fecha_data.aforo_disponible if fecha_data.aforo_disponible is not None else fecha_data.capacidad_maxima,
                estado=fecha_data.estado or "activo",
                fecha_creacion=datetime.utcnow(),
                fecha_actualizacion=datetime.utcnow()
            )
            db.add(nueva_fecha)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

def delete_evento_db(db: Session, evento: Evento):
    """Eliminado lógico de un evento y todos sus elementos relacionados."""
    
    # Obtener todos los elementos relacionados SIN filtrado por estado (consultas directas)
    # porque en eliminación necesitamos marcar TODO como eliminado
    
    # Tarifas: obtener a través de zonas del evento
    tarifas = db.query(Tarifa).join(Zona).filter(Zona.evento_id == evento.id).all()
    for tarifa in tarifas:
        tarifa.estado = ESTADO_ELIMINADO
        tarifa.fecha_actualizacion = datetime.utcnow()
        db.add(tarifa)

    # Zonas del evento
    zonas = db.query(Zona).filter(Zona.evento_id == evento.id).all()
    for zona in zonas:
        zona.estado = ESTADO_ELIMINADO
        db.add(zona)

    # Etapas del evento
    etapas = db.query(Etapa).filter(Etapa.evento_id == evento.id).all()
    for etapa in etapas:
        etapa.estado = ESTADO_ELIMINADO
        db.add(etapa)

    # Tipos de ticket del evento
    tipos_ticket = db.query(TipoTicket).filter(TipoTicket.evento_id == evento.id).all()
    for tipo in tipos_ticket:
        tipo.estado = ESTADO_ELIMINADO
        db.add(tipo)

    # Fechas del evento
    fechas = db.query(EventoFecha).filter(EventoFecha.evento_id == evento.id).all()
    for fecha in fechas:
        fecha.estado = ESTADO_ELIMINADO
        db.add(fecha)

    # Finalmente, el evento mismo
    evento.estado = ESTADO_ELIMINADO
    evento.fecha_actualizacion = datetime.utcnow()
    db.add(evento)

    db.commit()
    return

def cancel_evento_db(db: Session, evento: Evento):
    """Eliminado lógico de un evento y todos sus elementos relacionados."""
    
    # Tarifas: obtener a través de zonas del evento
    tarifas = db.query(Tarifa).join(Zona).filter(Zona.evento_id == evento.id).all()
    for tarifa in tarifas:
        tarifa.estado = ESTADO_CANCELADO
        tarifa.fecha_actualizacion = datetime.utcnow()
        db.add(tarifa)

    # Zonas del evento
    zonas = db.query(Zona).filter(Zona.evento_id == evento.id).all()
    for zona in zonas:
        zona.estado = ESTADO_CANCELADO
        db.add(zona)

    # Etapas del evento
    etapas = db.query(Etapa).filter(Etapa.evento_id == evento.id).all()
    for etapa in etapas:
        etapa.estado = ESTADO_CANCELADO
        db.add(etapa)

    # Tipos de ticket del evento
    tipos_ticket = db.query(TipoTicket).filter(TipoTicket.evento_id == evento.id).all()
    for tipo in tipos_ticket:
        tipo.estado = ESTADO_CANCELADO
        db.add(tipo)

    # Fechas del evento
    fechas = db.query(EventoFecha).filter(EventoFecha.evento_id == evento.id).all()
    for fecha in fechas:
        fecha.estado = ESTADO_CANCELADO
        db.add(fecha)
    #COMPRAS Y TICKETS
    tickets = db.query(Ticket).join(EventoFecha).filter(EventoFecha.evento_id == evento.id).all()
    
    tickets_cancelados = [] # Para rastrear las compras afectadas
    for ticket in tickets:
        # Solo cancelamos tickets que están 'válidos' o 'pendientes'
        if ticket.estado in ['valido']: 
            ticket.estado = ESTADO_CANCELADO
            ticket.fecha_actualizacion = datetime.utcnow()
            db.add(ticket)
            tickets_cancelados.append(ticket)
    
    
    compra_ids_afectadas = {t.compra_id for t in tickets_cancelados}

    if compra_ids_afectadas:
        compras = db.query(Compra).filter(Compra.id.in_(compra_ids_afectadas)).all()
        for compra in compras:
            # Solo actualizamos si la compra no está ya en un estado final de error (ej: 'rechazada')
            if compra.estado not in [ESTADO_CANCELADO, 'pagada']:
                compra.estado = ESTADO_CANCELADO
                compra.fecha_actualizacion = datetime.utcnow()
                db.add(compra)
                compra.fecha_actualizacion = datetime.utcnow()
                db.add(compra)

    # Finalmente, el evento mismo
    evento.estado = ESTADO_CANCELADO
    evento.fecha_actualizacion = datetime.utcnow()
    db.add(evento)

    db.commit()
    return
    
def _inhabilitar_tarifas_por_campo(db: Session, campo, id_valor):
    """
    Inhabilita todas las tarifas relacionadas a un campo:
    - campo: Tarifa.tipo_ticket_id / Tarifa.etapa_id / Tarifa.zona_id
    - id_valor: ID correspondiente
    """
    db.query(Tarifa).filter(campo == id_valor).update({
        Tarifa.estado: ESTADO_ELIMINADO,
        Tarifa.fecha_actualizacion: datetime.utcnow()
    }, synchronize_session=False)

def delete_tipo_ticket(db: Session, tipo_ticket: TipoTicket):
    """Realiza la eliminación lógica (cambiando el estado) de un TipoTicket."""
    tipo_ticket.estado =  ESTADO_ELIMINADO
    tipo_ticket.fecha_actualizacion = datetime.utcnow()
    _inhabilitar_tarifas_por_campo(db, Tarifa.tipo_ticket_id, tipo_ticket.id)
    db.commit()
    return

def delete_etapa(db: Session, etapa: Etapa):
    """Realiza la eliminación lógica (cambiando el estado) de una Etapa."""
    etapa.estado = ESTADO_ELIMINADO
    etapa.fecha_actualizacion = datetime.utcnow()
    _inhabilitar_tarifas_por_campo(db, Tarifa.etapa_id, etapa.id)
    db.commit()
    return

def delete_zona(db: Session, zona: Zona):
    """Realiza la eliminación lógica (cambiando el estado) de una Zona."""
    evento_id = zona.evento_id
    zona.estado = ESTADO_ELIMINADO
    zona.fecha_actualizacion = datetime.utcnow()
    _inhabilitar_tarifas_por_campo(db, Tarifa.zona_id, zona.id)
    db.commit()
    
    # Actualizar capacidad de fechas y evento
    _actualizar_capacidad_evento(db, evento_id)
    return

def delete_fecha_evento(db: Session, fecha: EventoFecha):
    """Realiza la eliminación lógica (cambiando el estado) de una fecha de evento."""
    evento_id = fecha.evento_id
    fecha.estado = ESTADO_ELIMINADO
    fecha.fecha_actualizacion = datetime.utcnow()
    db.add(fecha)
    
    # Inhabilitar tarifas asociadas a esta fecha si existen
    # (En caso de que haya lógica de tarifas por fecha en el futuro)
    
    db.commit()
    
    # Actualizar capacidad del evento después de eliminar la fecha
    _actualizar_capacidad_evento(db, evento_id)
    return

def create_fecha_evento(db: Session, evento_id: int, fecha_data: FechaEvento) -> EventoFecha:
    """Agrega una fecha a un evento existente."""
    # Obtener zonas del evento
    zonas = get_zonas_by_evento_id(db,evento_id)

    # Calcular capacidad total del evento
    capacidad_total = sum(z.capacidad for z in zonas)
    nueva_fecha = EventoFecha(
        evento_id=evento_id,
        fecha_inicio = fecha_data.fecha_inicio,
        fecha_fin = fecha_data.fecha_fin,
        capacidad_maxima=capacidad_total,
        aforo_disponible=capacidad_total,
        fecha_creacion=datetime.utcnow(),
        fecha_actualizacion=datetime.utcnow(),
        estado=ESTADO_ACTIVO
    )
    db.add(nueva_fecha)
    db.commit()
    db.refresh(nueva_fecha)
    return nueva_fecha

def _actualizar_capacidad_evento_incremental(db: Session, evento_id: int, incremento_capacidad: int):
    """
    Actualiza la capacidad del evento de forma incremental, sin recalcular todas las zonas.
    
    Args:
        db: Sesión de base de datos
        evento_id: ID del evento
        incremento_capacidad: Cantidad de capacidad a agregar (puede ser negativa)
    """
    from events.models.EventoFecha import EventoFecha
    from events.models.Evento import Evento
    
    # Obtener todas las fechas del evento
    fechas = db.query(EventoFecha).filter(EventoFecha.evento_id == evento_id).all()
    cantidad_fechas = len(fechas)
    
    # Actualizar capacidad de cada fecha (incremento directo)
    for fecha in fechas:
        fecha.capacidad_maxima = (fecha.capacidad_maxima or 0) + incremento_capacidad
        fecha.aforo_disponible = (fecha.aforo_disponible or 0) + incremento_capacidad
    
    # Actualizar capacidad del evento (incremento * cantidad de fechas)
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if evento:
        incremento_total = incremento_capacidad * cantidad_fechas if cantidad_fechas > 0 else incremento_capacidad
        evento.capacidad_maxima = (evento.capacidad_maxima or 0) + incremento_total
    
    db.commit()

def _actualizar_capacidad_evento(db: Session, evento_id: int):
    """Helper para actualizar capacidad_maxima del evento y aforo de fechas.
    La capacidad del evento es: capacidad_por_fecha * cantidad_fechas"""
    from events.models.EventoFecha import EventoFecha
    from events.models.Evento import Evento
    
    # Obtener todas las zonas activas
    zonas_evento = db.query(Zona).filter(Zona.evento_id == evento_id, Zona.estado == ESTADO_ACTIVO).all()
    capacidad_por_fecha = sum(z.capacidad for z in zonas_evento)
    
    # Obtener todas las fechas
    fechas = db.query(EventoFecha).filter(EventoFecha.evento_id == evento_id).all()
    cantidad_fechas = len(fechas)
    
    # Calcular capacidad total del evento
    capacidad_evento_total = capacidad_por_fecha * cantidad_fechas if cantidad_fechas > 0 else 0
    
    # Actualizar capacidad de cada fecha
    for fecha in fechas:
        fecha.capacidad_maxima = capacidad_por_fecha
        fecha.aforo_disponible = capacidad_por_fecha
    
    # Actualizar capacidad del evento
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if evento:
        evento.capacidad_maxima = capacidad_evento_total
    
    db.commit()

def create_zona_evento(db: Session,  evento_id: int, zona_data: ZonaEvento):
    """Crear una nueva zona para un evento existente."""
    # Verificar nombre duplicado
    existing = db.query(Zona).filter(
        Zona.evento_id == evento_id, 
        Zona.nombre == zona_data.nombre, 
        Zona.estado != ESTADO_ELIMINADO
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre de la zona ya existe en este evento"
        )

    nueva_zona = Zona(
        evento_id=evento_id,
        nombre=zona_data.nombre,
        descripcion=zona_data.descripcion,
        capacidad=zona_data.capacidad if zona_data.capacidad is not None else 0,
        precio_base = zona_data.precio_base,
        fecha_creacion=datetime.utcnow(),
        fecha_actualizacion=datetime.utcnow(),
        estado=ESTADO_ACTIVO
    )
    db.add(nueva_zona)
    db.commit()
    db.refresh(nueva_zona)
    
    return nueva_zona


def create_tipo_ticket(db: Session, evento_id: int, tipo_data: TipoTicketEvento):
    """Crear un nuevo tipo de ticket asociado a un evento."""
    # Verificar nombre duplicado
    existing = db.query(TipoTicket).filter(
        TipoTicket.evento_id == evento_id, 
        TipoTicket.nombre == tipo_data.nombre, 
        TipoTicket.estado != ESTADO_ELIMINADO
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre del tipo de ticket ya existe en este evento"
        )

    nuevo_tipo = TipoTicket(
        evento_id=evento_id,
        nombre=tipo_data.nombre,
        descripcion=tipo_data.descripcion,
        incremento=tipo_data.incremento,
        fecha_creacion=datetime.utcnow(),
        fecha_actualizacion=datetime.utcnow(),
        estado=ESTADO_ACTIVO
    )
    db.add(nuevo_tipo)
    db.commit()
    db.refresh(nuevo_tipo)
    return nuevo_tipo

def update_tipo_ticket(db: Session, tipo_ticket: TipoTicket, tipo_data: TipoTicketEvento):
    """Actualiza un tipo de ticket existente."""
    update_data = tipo_data.dict(exclude_unset=True) 
    for key, value in update_data.items():
        setattr(tipo_ticket, key, value)
    tipo_ticket.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(tipo_ticket)

    return tipo_ticket

def update_etapa_db(db: Session, etapa: Etapa, etapa_data: EtapaEvento) -> Etapa:
    """Actualiza una etapa existente con los datos proporcionados."""
    update_data = etapa_data.dict(exclude_unset=True) 
    for key, value in update_data.items():
        setattr(etapa, key, value)
        
    etapa.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(etapa)

    return etapa

def update_zona_db(db: Session, zona: Zona, zona_data: ZonaEvento) -> Zona:
    """Actualiza una zona existente con los datos proporcionados."""
    
    # Usar dict(exclude_unset=True) para manejar actualizaciones parciales
    update_data = zona_data.dict(exclude_unset=True) 
    
    for key, value in update_data.items():
        setattr(zona, key, value)
        
    zona.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(zona)
    
    # Actualizar capacidad de fechas y evento
    _actualizar_capacidad_evento(db, zona.evento_id)

    return zona

def create_tarifas_automaticamente(db: Session, zonas: List[Zona], etapas: List[Etapa], tipos_ticket: List[TipoTicket],evento_id: int):
    """Crear una nueva tarifa asociada a zona, tipo y etapa."""
    zona_ids = [z.id for z in zonas]
    etapa_ids = [e.id for e in etapas]
    tipo_ids = [t.id for t in tipos_ticket]
    
    tarifas_existentes = {
        (t.zona_id, t.etapa_id, t.tipo_ticket_id): t
        for t in db.query(Tarifa).filter(
            Tarifa.zona_id.in_(zona_ids),
            Tarifa.etapa_id.in_(etapa_ids),
            Tarifa.tipo_ticket_id.in_(tipo_ids)
        ).all()
    }
    
    tarifas_a_crear = []
    tarifas_actualizadas = []
    ahora = datetime.utcnow()

    for zona in zonas:
        for etapa in etapas:
            for tipo in tipos_ticket:

                key = (zona.id, etapa.id, tipo.id)
                precio = (
                    (zona.precio_base + tipo.incremento) * 
                    (Decimal('100') - etapa.porcentaje) / Decimal('100')
                )
                
                tarifa = tarifas_existentes.get(key)

                if tarifa:
                    # ----- ACTUALIZAR -----
                    tarifa.nombre = f"{zona.nombre} - {etapa.nombre} - {tipo.nombre}"
                    tarifa.precio = precio
                    tarifa.cantidad = zona.capacidad
                    tarifa.fecha_actualizacion = datetime.utcnow()

                    tarifas_actualizadas.append(tarifa)
                else:
                    # ----- CREAR -----
                    tarifas_a_crear.append({
                        "nombre": f"{zona.nombre} - {etapa.nombre} - {tipo.nombre}",
                        "precio": precio,
                        "cantidad": zona.capacidad,
                        "zona_id": zona.id,
                        "tipo_ticket_id": tipo.id,
                        "etapa_id": etapa.id,
                        "estado": "activo",
                        "fecha_creacion": ahora,
                        "fecha_actualizacion": ahora
                    })

    if tarifas_a_crear:
        db.bulk_insert_mappings(Tarifa, tarifas_a_crear)
    
    db.commit()
    
    tarifas_creadas = []
    if tarifas_a_crear:
        tarifas_creadas = db.query(Tarifa).filter(
            and_(
                Tarifa.zona_id.in_(zona_ids),
                Tarifa.fecha_creacion == ahora
            )
        ).all()
    
    for t in tarifas_actualizadas:
        db.refresh(t)
    
    _actualizar_capacidad_evento(db, evento_id)
    
    return tarifas_creadas+tarifas_actualizadas

def update_tarifa_evento(db: Session, tarifa_id: int, tarifa_data: TarifaEvento):
    """Actualizar una tarifa existente."""
    
    tarifa = db.query(Tarifa).filter(Tarifa.id == tarifa_id).first()
    if not tarifa:
        return None
    
    # Actualizar campos
    tarifa.nombre = tarifa_data.nombre
    tarifa.zona_id = tarifa_data.zona_id
    tarifa.tipo_ticket_id = tarifa_data.tipo_ticket_id
    tarifa.etapa_id = tarifa_data.etapa_id
    tarifa.precio = tarifa_data.precio
    tarifa.cantidad = tarifa_data.cantidad
    if tarifa_data.estado:
        tarifa.estado = tarifa_data.estado
    tarifa.fecha_actualizacion = datetime.utcnow()
    
    db.commit()
    db.refresh(tarifa)
    return tarifa

def create_etapa_evento(db: Session,  evento_id: int, etapa_data: EtapaEvento):
    """Crear una nueva tarifa asociada a zona, tipo y etapa."""
    nueva_etapa = Etapa(
        evento_id=evento_id,
        nombre=etapa_data.nombre,
        fecha_inicio = etapa_data.fecha_inicio,
        fecha_fin = etapa_data.fecha_fin,
        estado= ESTADO_ACTIVO,
        fecha_creacion=datetime.utcnow(),
        fecha_actualizacion=datetime.utcnow(),
        porcentaje = etapa_data.porcentaje
    )
    db.add(nueva_etapa)
    db.commit()
    db.refresh(nueva_etapa)
    return nueva_etapa

def update_comision_db(db: Session, comision: float):
    """Actualiza la comisión de todos los eventos cuya fecha_fin aún no haya llegado"""
    
    # Ejecutar un solo UPDATE en la base de datos
    result = db.execute(
        update(Evento)
        .where(Evento.fecha_fin >= datetime.now())
        .values(comision=comision)
    )

    db.commit()

    # Verificar si se afectaron filas
    if result.rowcount == 0:
        return  {"mensaje": "No hay eventos activos para actualizar"}

    return {"mensaje": f"Se actualizó la comisión a {comision} para {result.rowcount} eventos activos."}

def get_comision_db(db: Session):
    evento = db.query(Evento).where(Evento.fecha_fin >= datetime.now()).first()
    return {"comision": evento.comision}

def create_descuento(db: Session, descuento_data: DescuentoCreate) -> Descuento:
    """Crea un nuevo registro de descuento."""
    db_descuento = Descuento(
        **descuento_data.model_dump(),
        usos_actuales=0   # Usos iniciales
    )
    try:
        db.add(db_descuento)
        db.commit()
        db.refresh(db_descuento)
        return db_descuento
        
    except IntegrityError as e:
        db.rollback() 
        if 'duplicate key value violates unique constraint' in str(e) or 'Duplicate entry' in str(e):
             raise ValueError("El código de descuento proporcionado ya existe para este evento")
        raise

def get_descuentos_by_evento(db: Session, evento_id: int) -> List[Descuento]:
    """Obtiene todos los descuentos para un evento (excluye eliminados)."""
    return db.query(Descuento).filter(
        Descuento.evento_id == evento_id,
        Descuento.estado != ESTADO_ELIMINADO
    ).all()

def get_descuento_by_id(db: Session, descuento_id: int) -> Optional[Descuento]:
    """Obtiene un descuento por su ID (excluye eliminados)."""
    return db.query(Descuento).filter(
        Descuento.id == descuento_id,
        Descuento.estado != ESTADO_ELIMINADO
    ).first()

def get_descuento_by_codigo(db: Session, codigo: str) -> Optional[Descuento]:
    """Obtiene un descuento por su ID."""
    return db.query(Descuento).filter(Descuento.codigo == codigo, Descuento.estado == ESTADO_ACTIVO).first()

def update_descuento(db: Session, descuento: Descuento, descuento_data: DescuentoUpdate) -> Descuento:
    """Actualiza los datos de un descuento existente."""
    for key, value in descuento_data.model_dump(exclude_unset=True).items():
        setattr(descuento, key, value)
    descuento.fecha_actualizacion = datetime.now()
    db.commit()
    db.refresh(descuento)
    return descuento

def delete_descuento(db: Session, descuento: Descuento):
    """Realiza la eliminación lógica cambiando el estado a 'eliminado'."""
    descuento.estado = ESTADO_ELIMINADO
    descuento.fecha_actualizacion = datetime.now()
    db.commit()
    return

def publicar_evento(db: Session, evento: Evento)-> Optional[Evento]:
    evento.estado = ESTADO_ACTIVO
    evento.fecha_actualizacion = datetime.now()
    db.commit()
    db.refresh(evento)
    return evento

def usar_descuento(db: Session, descuento: Descuento, cantidad: int):
    if(descuento.usos_maximos>=descuento.usos_actuales+cantidad):
        descuento.usos_actuales+=cantidad
        db.commit()
        db.refresh(descuento)
        return False
    return True

def validar_zona_nombre(db: Session, evento_id: int, nombre: str):
    return db.query(Zona).filter(
        Zona.evento_id == evento_id,
        Zona.nombre.ilike(nombre),
        Zona.estado == ESTADO_ACTIVO
    ).first()

def validar_etapa_nombre(db: Session, evento_id: int, nombre: str):
    return db.query(Etapa).filter(
        Etapa.evento_id == evento_id,
        Etapa.nombre.ilike(nombre),
        Etapa.estado == ESTADO_ACTIVO
    ).first()

def validar_tipo_ticket_nombre(db: Session, evento_id: int, nombre: str):
    return db.query(TipoTicket).filter(
        TipoTicket.evento_id == evento_id,
        TipoTicket.nombre.ilike(nombre),
        TipoTicket.estado == ESTADO_ACTIVO
    ).first()

def crear_notificacion(db: Session, usuario_id: int, titulo: str, mensaje: str, tipo: str = None, link: str = None, datos_metadata: dict = None):
    n = Notificacion(usuario_id=usuario_id, titulo=titulo, mensaje=mensaje, tipo=tipo, link=link, datos_metadata=datos_metadata or {})
    db.add(n)
    db.commit()
    db.refresh(n)
    return n

def obtener_no_leidas(db: Session, usuario_id: int, limit: int = 50):
    return db.query(Notificacion).filter_by(usuario_id=usuario_id, fue_leida=False).order_by(Notificacion.fecha.desc()).limit(limit).all()

def marcar_como_leida(db: Session, usuario_id: int, notificacion_id: int):
    notificacion = (
        db.query(Notificacion)
        .filter(
            Notificacion.usuario_id == usuario_id,
            Notificacion.id == notificacion_id,
            Notificacion.fue_leida == False
        )
        .first()
    )

    if not notificacion:
        return False  # No existe o ya estaba leída

    notificacion.fue_leida = True
    db.commit()

    return True

def crear_notificaciones_batch(db: Session, notificaciones: list):
    """Inserta múltiples notificaciones en batch."""
    db.bulk_save_objects(notificaciones)

def cancelar_fecha_evento(db: Session, fecha: EventoFecha, commit: bool = True):
    """Cancela una fecha de evento y todas las compras asociadas."""
    from compras.controllers.CompraController import get_compras_by_fecha_evento

    fecha.estado = ESTADO_CANCELADO
    fecha.fecha_actualizacion = datetime.utcnow()

    compras = get_compras_by_fecha_evento(db, fecha.id)
    usuarios_afectados = set()

    notificaciones_compra = []
    notificaciones_evento = []

    for compra in compras:
        compra.estado = ESTADO_CANCELADO
        compra.fecha_actualizacion = datetime.utcnow()
        usuarios_afectados.add(compra.usuario_id)
        
        notificaciones_compra.append(
            Notificacion(
                usuario_id=compra.usuario_id,
                titulo="Reembolso generado",
                mensaje=(
                    f"Tu compra para la fecha {fecha.fecha} del evento "
                    f"'{fecha.evento.nombre}' ha sido cancelada."
                ),
                tipo="CANCELACION_COMPRA",
                datos_metadata={"evento_id": fecha.evento_id, "evento_fecha_id": fecha.id},
                fecha_creacion=datetime.utcnow()
            )
        )


    for user_id in usuarios_afectados:
        notificaciones_evento.append(
            Notificacion(
                usuario_id=user_id,
                titulo="Evento cancelado",
                mensaje=(
                    f"La fecha {fecha.fecha} del evento '{fecha.evento.nombre}' "
                    f"ha sido cancelada por el organizador."
                ),
                tipo="CANCELACION_EVENTO",
                datos_metadata={"evento_id": fecha.evento_id, "evento_fecha_id": fecha.id},
                fecha_creacion=datetime.utcnow()
            )
        )

    db.bulk_save_objects(notificaciones_compra + notificaciones_evento)

    if commit:
        db.commit()
    
    return fecha

def cancelar_evento(db: Session, evento: Evento):
    """Cancela un evento completo reutilizando cancelar_fecha_evento."""
    db.refresh(evento)
    try:
        evento.estado = ESTADO_CANCELADO
        evento.fecha_actualizacion = datetime.utcnow()

        fechas = get_fechas_by_evento_id(db, evento.id)

        for fecha in fechas:
            cancelar_fecha_evento(db, fecha, commit=False)

        db.commit()
    except Exception:
        db.rollback()
        raise
    return evento

def create_politica_devolucion(db: Session,evento: Evento, pdf: UploadFile):
    url = upload_pdf(
        file=pdf,
        folder="politicas_devolucion",
        public_id=f"evento_{evento.id}_politica"
    )

    evento.politica_url = url
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return url

def get_politica_devolucion_url(evento: Evento):
    """Obtiene la URL de la política de devolución del evento"""
    if not evento.politica_url:
        return None
    return evento.politica_url

def delete_politica_devolucion(db: Session, evento: Evento):
    """Elimina la política de devolución del evento y de Cloudinary"""
    from events.services.CloudinaryServicios import delete_file_from_cloudinary
    
    if not evento.politica_url:
        raise ValueError("El evento no tiene política de devolución")
    
    # Eliminar de Cloudinary
    public_id = f"politicas_devolucion/evento_{evento.id}_politica"
    try:
        delete_file_from_cloudinary(public_id, resource_type="raw")
    except Exception as e:
        # Log del error pero continuar con eliminación en BD
        print(f"Error eliminando archivo de Cloudinary: {str(e)}")
    
    # Eliminar referencia en BD
    evento.politica_url = None
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return True
       