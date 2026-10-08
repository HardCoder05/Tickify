from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from compras.models.Compra import Compra
from events.models.Evento import Evento
from events.models.EventoFecha import EventoFecha
from tickets.models.Ticket import Ticket
from users.models.Organizador import Organizador, RolOrganizador
from users.models.UserSchema import UsuarioCreate, UsuarioUpdate
from users.models.Usuario import RolUsuario, Usuario
import logging
from tickets.controllers.TicketController import get_tickets_by_user_and_event
from events.models.EventoFecha import EventoFecha


ESTADO_ACTIVO = "activo"
ESTADO_ELIMINADO = "eliminado"

def get_all_usuarios(db: Session, incluir_inactivos: bool = False) -> List[Usuario]:
    """Obtener todos los usuarios."""
    query = db.query(Usuario)
    
    if not incluir_inactivos:
        query = query.filter(Usuario.estado == ESTADO_ACTIVO) 
        
    return query.all()

def get_all_usuarios_organizador(db: Session) -> List[Usuario]:
    """Obtener todos los usuarios organizadores."""

    query = db.query(Usuario)
    
    query = query.join(Organizador, Usuario.id == Organizador.usuario_id)
    
    query = query.filter(
        Usuario.rol == 'ORGANIZADOR',
        Organizador.estado == ESTADO_ACTIVO
    )
    
    return query.all()

def get_all_usuarios_organizador_solicitud(db: Session) -> List[Usuario]:
    """Obtener todos los usuarios."""
    query = db.query(Usuario)
    
    query = query.join(Organizador, Usuario.id == Organizador.usuario_id)
    
    query = query.filter(
        Usuario.rol == 'ORGANIZADOR',
        Organizador.estado == 'pendiente'
    )
    
    return query.all()

def get_all_usuarios_filter(
    db: Session,
    nombre: Optional[str] = None,
    rol: Optional[RolUsuario] = None,
    skip: int = 0,
    limit: int = 100,
    inactivos: bool = False 
) -> List[Usuario]:
    """Obtener todos los usuarios filtrados por nombre y rol."""
    query = db.query(Usuario)
        
    if inactivos:
        query = query.filter(Usuario.estado == ESTADO_ELIMINADO)
    else:
        query = query.filter(Usuario.estado == ESTADO_ACTIVO)

    if nombre:
        query = query.filter(
            or_(
            Usuario.nombres.ilike(f'%{nombre}%'),
            Usuario.apellidos.ilike(f'%{nombre}%')
            )
        )
        
    if rol:
        query = query.filter(Usuario.rol == rol)

    #Filtros de paginado
    query = query.offset(skip) 
    query = query.limit(limit)

    return query.all()

def get_usuario_by_id(db: Session, usuario_id: int,incluir_inactivos: bool = False) -> Optional[Usuario]:
    """Obtener un usuario por su ID."""
    query = db.query(Usuario).filter(Usuario.id == usuario_id)
    
    if not incluir_inactivos:
        query = query.filter(Usuario.estado == ESTADO_ACTIVO)
        
    return query.first()

def get_usuario_by_email(db: Session, email: str, incluir_inactivos: bool = False) -> Optional[Usuario]:
    """Obtener un usuario por su correo."""
    query = db.query(Usuario).filter(Usuario.correo == email)
    
    if not incluir_inactivos:
        query = query.filter(Usuario.estado == ESTADO_ACTIVO)
        
    return query.first()

def get_usuarios_by_evento_id(db: Session, evento_id: int, fecha_evento_id: int | None = None) -> List[dict]:
    """Obtiene los usuarios con su información de tickets para un evento específico"""
    from sqlalchemy import func
    import logging
    
    logging.info(f"[DEBUG] get_usuarios_by_evento_id - evento_id: {evento_id}, fecha_evento_id: {fecha_evento_id}")
    
    # Query para obtener usuario, horario y cantidad de tickets
    query = (
        db.query(
            Usuario.id,
            Usuario.nombres,
            Usuario.apellidos,
            Usuario.correo,
            Usuario.estado,  # Agregar estado para debug
            EventoFecha.id.label('evento_fecha_id'),
            EventoFecha.fecha_inicio,
            EventoFecha.fecha_fin,
            func.count(Ticket.id).label('cantidad_tickets')
        )
        .join(Compra, Compra.usuario_id == Usuario.id)
        .join(Ticket, Ticket.compra_id == Compra.id)
        .join(EventoFecha, EventoFecha.id == Ticket.evento_fecha_id)
        .join(Evento, Evento.id == EventoFecha.evento_id)
        .filter(Evento.id == evento_id)
        # REMOVIDO TEMPORALMENTE: .filter(Usuario.estado == 'activo')
    )

    if fecha_evento_id is not None:
        query = query.filter(EventoFecha.id == fecha_evento_id)

    # Group by usuario y horario
    query = query.group_by(
        Usuario.id,
        Usuario.nombres,
        Usuario.apellidos,
        Usuario.correo,
        Usuario.estado,  # Agregar estado al group by
        EventoFecha.id,
        EventoFecha.fecha_inicio,
        EventoFecha.fecha_fin
    )

    results = query.all()
    
    logging.info(f"[DEBUG] Query results count: {len(results)}")
    for row in results[:3]:  # Log primeros 3 para no saturar
        logging.info(f"[DEBUG] Usuario: {row.nombres} {row.apellidos}, estado: {row.estado}, tickets: {row.cantidad_tickets}")
    
    # Obtener counts de tickets por usuario Y fecha para evitar duplicaciones
    # Agrupamos por usuario_id y evento_fecha_id para obtener el conteo correcto por horario
    try:
        from sqlalchemy import func

        counts_q = (
            db.query(
                Compra.usuario_id.label('usuario_id'), 
                EventoFecha.id.label('evento_fecha_id'),
                func.count(Ticket.id).label('ticket_count')
            )
            .join(Ticket, Ticket.compra_id == Compra.id)
            .join(EventoFecha, EventoFecha.id == Ticket.evento_fecha_id)
            .join(Evento, Evento.id == EventoFecha.evento_id)
            .filter(Evento.id == evento_id)
        )

        if fecha_evento_id is not None:
            counts_q = counts_q.filter(EventoFecha.id == fecha_evento_id)

        counts_q = counts_q.group_by(Compra.usuario_id, EventoFecha.id).all()
        # Crear un dict con clave compuesta (usuario_id, evento_fecha_id)
        counts_map = {(row.usuario_id, row.evento_fecha_id): int(row.ticket_count) for row in counts_q}
    except Exception:
        logging.exception('Error obteniendo counts de tickets por usuario; se usará el conteo agregado.')
        counts_map = {}

    usuarios_list = []
    for row in results:
        # Buscar en el mapa usando la clave compuesta (usuario_id, evento_fecha_id)
        tickets_count = counts_map.get((row.id, row.evento_fecha_id), int(row.cantidad_tickets or 0))
        usuarios_list.append({
            'id': row.id,
            'nombres': row.nombres,
            'apellidos': row.apellidos,
            'correo': row.correo,
            'evento_fecha_id': row.evento_fecha_id,
            'fecha_inicio': row.fecha_inicio,
            'fecha_fin': row.fecha_fin,
            # Nueva clave más ligera con el conteo real de tickets
            'tickets_count': tickets_count,
            # Mantener cantidad_tickets por compatibilidad con clientes antiguos
            'cantidad_tickets': tickets_count
        })

    return usuarios_list

def get_usuario_organizador_by_evento_id(db: Session, evento_id: int) -> Optional[Usuario]:
    """Obtiene un usuario por id del evento"""
    return (
    db.query(Usuario)
    .join(Organizador, Organizador.usuario_id == Usuario.id)
    .join(Evento, Evento.organizador_id == Organizador.id)
    .filter(Evento.id == evento_id,Usuario.estado == 'activo',Organizador.estado == 'activo')
    .first())

def get_organizador_by_usuario(db: Session, usuario_id: int) -> Optional[Organizador]:
    """Retorna el objeto Organizador asociado al usuario (o None)."""
    from users.models.Organizador import RolOrganizador
    
    # Buscar organizador sin filtrar por estado para debug
    org = db.query(Organizador).filter(Organizador.usuario_id == usuario_id).first()
    print(f"[DEBUG] get_organizador_by_usuario - Usuario ID: {usuario_id}, Organizador encontrado: {org}")
    if org:
        print(f"[DEBUG] Organizador ID: {org.id}, Estado: {org.estado}, Tipo: {type(org.estado)}")
    
    
    return db.query(Organizador).filter(
        Organizador.usuario_id == usuario_id, 
        Organizador.estado == RolOrganizador.activo
    ).first()

def get_organizador_by_id(db: Session, organizador_id: int) -> Optional[Organizador]:
    """Retorna el objeto Organizador asociado al usuario (o None)."""
    from users.models.Organizador import RolOrganizador
    return db.query(Organizador).filter(
        Organizador.id == organizador_id, 
        Organizador.estado == RolOrganizador.activo
    ).first()

def get_solicitud_by_usuario_id(db: Session, usuario_id: int) -> Optional[Organizador]:
    """Retorna el objeto Organizador asociado al usuario (o None)."""
    from users.models.Organizador import RolOrganizador
    return db.query(Organizador).filter(
        Organizador.usuario_id == usuario_id, 
        Organizador.estado.in_([RolOrganizador.pendiente, RolOrganizador.activo])
    ).first()

def create_usuario(db: Session, usuario_data: UsuarioCreate) -> Usuario:
    """Crear un nuevo usuario."""
    user_exists = db.query(Usuario).filter(Usuario.correo == usuario_data.correo).first()
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    # Validar campos obligatorios si el rol es ORGANIZADOR
    if usuario_data.rol.upper() == "ORGANIZADOR":
        if not usuario_data.ruc or not usuario_data.razon_social:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los campos 'ruc' y 'razon_social' son obligatorios para organizadores."
            )
            
    rol_enum = getattr(RolUsuario, usuario_data.rol.upper())

    new_user = Usuario(
        nombres=usuario_data.nombres,
        apellidos=usuario_data.apellidos,
        correo=usuario_data.correo,
        telefono=usuario_data.telefono,
        password_hash=usuario_data.password_hash,
        rol=rol_enum  # Usar el Enum directamente, no un String en mayúsculas
    )
    db.add(new_user)

    # 4. Crear el Organizador (si aplica)
    if new_user.rol == RolUsuario.ORGANIZADOR:
        db.flush() 
        
        organizador = Organizador(
            usuario_id=new_user.id, # El ID ya existe en la sesión
            ruc=usuario_data.ruc,
            razon_social=usuario_data.razon_social,
            dni=usuario_data.dni,
            telefono=usuario_data.telefono,
            direccion=usuario_data.direccion,
            correo_organizacional=usuario_data.correo_organizacional,
            motivacion=usuario_data.motivacion,
            sector=usuario_data.sector,
            estado = RolOrganizador.activo
        )
        db.add(organizador)
    
    db.commit()
    db.refresh(new_user) 

    return new_user

def update_usuario(db: Session, usuario: Usuario, usuario_data: UsuarioUpdate, current_user: Usuario) -> Usuario:
    """Actualizar un usuario existente."""
    exclude_fields = set()
    #Solo un ADMIN puede cambiar el rol
    if current_user.rol != RolUsuario.ADMIN:
        exclude_fields.add("rol")

    profile_fields = {'ruc', 'razon_social', 'telefono_organizacional', 'correo_organizacional', 'motivacion', 'sector', 'direccion', 'dni'}
    
    exclude_fields.update(profile_fields)

    update_data = usuario_data.model_dump(exclude_unset=True, exclude=exclude_fields)

    for key, value in update_data.items():
        setattr(usuario, key, value)
    
    if usuario.rol == RolUsuario.ORGANIZADOR:
        update_organizador_datos(db, usuario, usuario_data)

    usuario.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(usuario)
    
    return usuario

def update_organizador_datos(db: Session, usuario: Usuario, data: UsuarioUpdate):
    organizador = get_organizador_by_usuario(db, usuario.id)
    if not organizador:
        return  

    updates = {
        "ruc": data.ruc,
        "razon_social": data.razon_social,
        "dni": data.dni,
        "telefono": data.telefono_organizacional,
        "direccion": data.direccion,
        "correo_organizacional": data.correo_organizacional,
        "motivacion": data.motivacion,
        "sector": data.sector,
    }

    for campo, valor in updates.items():
        if valor is not None:
            setattr(organizador, campo, valor)

    organizador.fecha_actualizacion = datetime.utcnow()
    

def delete_usuario(db: Session, usuario_id: int):
    """Eliminar un usuario."""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        return None
    
    usuario.estado = ESTADO_ELIMINADO
    usuario.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(usuario)
    return usuario
    

def responder_solicitud(db:Session, organizador_solicitado: Organizador, respuesta: str)-> Organizador:
    organizador_solicitado.estado = respuesta
    organizador_solicitado.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(organizador_solicitado)
    return organizador_solicitado

def get_usuario_tickets_detalle(db: Session, usuario_id: int, evento_id: int, evento_fecha_id: int,
                                 incluir_inactivos: bool = False) -> Optional[dict]:
    """Retorna detalles de un usuario (info + tickets) para un evento y fecha específicos.

    Estructura de retorno (ejemplo):
    {
      'nombres': ..., 'apellidos': ..., 'correo': ..., 'fecha_registro': ...,
      'fecha_inicio': ..., 'tickets_detalle': [...], 'tickets': [...], 'total_pagado': 0
    }
    """
    # Verificar usuario
    usuario = get_usuario_by_id(db, usuario_id,incluir_inactivos)
    if not usuario:
        return None

    # Obtener tickets via helper del controlador de tickets
    try:
        all_tickets = get_tickets_by_user_and_event(db, usuario_id, evento_id) or []
    except Exception:
        logging.exception("Error obteniendo tickets del usuario desde TicketController")
        all_tickets = []

    # Filtrar por fecha específica
    filtered = [t for t in all_tickets if int(getattr(t, 'evento_fecha_id', -1) or -1) == int(evento_fecha_id)]

    # Deduplicar por ticket id (preservar primero)
    uniq_map: dict = {}
    for t in filtered:
        tid = getattr(t, 'id', None)
        if tid is None:
            continue
        if tid not in uniq_map:
            uniq_map[tid] = t

    unique_tickets = list(uniq_map.values())

    # Mapear a estructura que espera el frontend
    tickets_detalle = []
    tickets_simple = []
    total_pagado = 0.0
    for t in unique_tickets:
        try:
            precio = float(getattr(t, 'precio_pagado', 0) or 0)
        except Exception:
            precio = 0.0
        total_pagado += precio

        td = {
            'id': getattr(t, 'id', None),
            'numero': getattr(t, 'numero', None),
            'fecha_compra': getattr(t, 'fecha_compra', None),
            'estado': getattr(t, 'estado', None),
            'codigo_qr': getattr(t, 'codigo_qr', None),
            'precio_pagado': precio,
            'descuento_aplicado': getattr(t, 'descuento_aplicado', 0),
            'comision_aplicada': getattr(t, 'comision_aplicada', 0),
            'evento_fecha_id': getattr(t, 'evento_fecha_id', None),
            'evento_nombre': getattr(t, 'evento_nombre', None),
            'evento_fecha_inicio': getattr(t, 'evento_fecha_inicio', None),
            'evento_fecha_fin': getattr(t, 'evento_fecha_fin', None),
            'tarifa_nombre': getattr(t, 'tarifa_nombre', None),
            'zona_nombre': getattr(t, 'zona_nombre', None),
            'compra_codigo_confirmacion': getattr(t, 'compra_codigo_confirmacion', None),
            'compra_estado': getattr(t, 'compra_estado', None),
            'tipo_ticket_nombre': getattr(t, 'tipo_ticket_nombre', None),
            'tipo_ticket_descripcion': getattr(t, 'tipo_ticket_descripcion', None)
        }
        tickets_detalle.append(td)

        tickets_simple.append({
            'id': td['id'],
            'numero': td['numero'],
            'zona': td['zona_nombre'],
            'tipo': td['tipo_ticket_nombre'],
            'tarifa': td['tarifa_nombre'],
            'precio': td['precio_pagado'],
            'compra_codigo_confirmacion': td['compra_codigo_confirmacion'],
            'compra_estado': td['compra_estado'],
            'evento_fecha_id': td['evento_fecha_id']
        })

    # Obtener fecha_inicio si no está en tickets
    fecha_inicio = None
    if tickets_detalle and tickets_detalle[0].get('evento_fecha_inicio'):
        fecha_inicio = tickets_detalle[0]['evento_fecha_inicio']
    else:
        ef = db.query(EventoFecha).filter(EventoFecha.id == evento_fecha_id).first()
        if ef:
            fecha_inicio = ef.fecha_inicio

    result = {
        'nombres': usuario.nombres,
        'apellidos': usuario.apellidos,
        'correo': usuario.correo,
        'fecha_registro': usuario.fecha_registro,
        'fecha_inicio': fecha_inicio,
        'tickets_detalle': tickets_detalle,
        'tickets': tickets_simple,
        'total_pagado': total_pagado
    }

    return result

def responder_solicitud(db:Session, organizador_solicitado: Organizador, respuesta: str)-> Organizador:
    organizador_solicitado.estado = respuesta
    organizador_solicitado.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(organizador_solicitado)
    return organizador_solicitado

def reactivar_usuario(db:Session, usuario: Usuario)-> Optional[Usuario]:
    usuario.estado = ESTADO_ACTIVO
    usuario.fecha_actualizacion=datetime.utcnow()
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

def change_password(db:Session, usuario: Usuario, new_password_hash: str)-> Optional[Usuario]:
    usuario.password_hash = new_password_hash
    usuario.fecha_actualizacion=datetime.utcnow()
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario