import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from compras.controllers.CompraController import get_compra_by_codigo, get_compra_by_id
from compras.models.Compra import Compra
from database import get_db
from events.controllers.EventoController import get_evento_by_id
from events.models.Evento import Evento
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa
from events.models.Zona import Zona
from tickets.controllers.TicketController import (
    check_compra_exists,
    check_evento_fecha_exists,
    check_tarifa_exists,
    create_ticket_db,
    get_organizador_id_by_ticket_id,
    get_ticket_by_id,
    get_ticket_with_details_by_id,
    get_tickets_by_compra_id,
    get_tickets_by_user_id,
    get_tickets_by_user_and_event,
    update_ticket_estado_db,
    get_tickets_with_details_filtered,
    get_resumen_tickets_por_evento_fecha_y_zona,
    get_ticket_by_qr
)
from tickets.models.Ticket import Ticket
from tickets.models.TicketSchema import (
    TicketCreate,
    TicketRead,
    TicketUpdate,
    TicketWithDetails,
)
from tickets.services.TicketServicio import validar_nuevo_estado_ticket
from users.controllers.UsuarioController import get_usuario_by_email, get_usuario_by_id
from users.models.Usuario import Usuario
from users.services.AutenticacionServicio import get_current_user_payload, role_required
from users.models.Organizador import Organizador
from users.controllers.UsuarioController import get_usuario_organizador_by_evento_id

# Router con prefijo
router = APIRouter(
    prefix="/api/v1/tickets",
    tags=["tickets"]
)
print("DEBUG: Loading Tickets.py router")

ESTADO_COMPRA_PAGADA = "pagada"

# Obtener tickets de un usuario específico
@router.get("/usuario/{usuario_id}", response_model=List[TicketWithDetails])
def obtener_tickets_usuario(usuario_id: int, db: Session = Depends(get_db),
                            auth_payload: dict = Depends(role_required(["ADMIN", "CLIENTE", "ORGANIZADOR"]))):
    """Obtener todos los tickets de un usuario específico con detalles completos"""
    
    # Verificar que el usuario existe
    usuario = get_usuario_by_id(db,usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver los tickets de otros usuarios."
        )
    
    return get_tickets_by_user_id(db,usuario_id)

# Obtener un ticket específico por ID
@router.get("/{ticket_id}", response_model=TicketWithDetails)
def obtener_ticket(ticket_id: int, db: Session = Depends(get_db),
                   auth_payload: dict = Depends(role_required(["ADMIN", "CLIENTE"]))):
    """Obtener un ticket específico con todos sus detalles"""
    
    ticket_data = get_ticket_with_details_by_id(db,ticket_id)
    
    if ticket_data is None:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    compra = get_compra_by_codigo(db, ticket_data.compra_codigo_confirmacion)

    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    if current_user.rol.value != 'ADMIN' and current_user.id != compra.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver los tickets de esta compra."
        )
    
    return ticket_data

# Actualizar estado de un ticket: ADMIN U ORGANIZADOR DUEÑO
@router.put("/{ticket_id}/estado")
def actualizar_estado_ticket(ticket_id: int, nuevo_estado: str, db: Session = Depends(get_db),
                             auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Actualizar el estado de un ticket"""
    
    validar_nuevo_estado_ticket(nuevo_estado)
    
    ticket = get_ticket_by_id(db,ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN':
        organizador_id = get_organizador_id_by_ticket_id(db,ticket_id)
        if not organizador_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                detail="Ticket asociado a un evento inválido o no encontrado."
            )
        # Obtener el Organizador asociado al usuario actual y comparar por Organizador.id
        organizador = db.query(Organizador).filter(Organizador.usuario_id == current_user.id).first()
        if not organizador or organizador.id != organizador_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permiso para actualizar tickets de eventos que no organizas."
            )
        
    return update_ticket_estado_db(db,ticket,nuevo_estado)

@router.get("/resumen/{evento_id}")
def obtener_resumen_tickets_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    return get_resumen_tickets_por_evento_fecha_y_zona(db, evento_id)

# Obtener tickets por compra
@router.get("/compra/{compra_id}", response_model=List[TicketWithDetails])
def obtener_tickets_por_compra(compra_id: int, compra_estado: Optional[str] = None, db: Session = Depends(get_db),
                               auth_payload: dict = Depends(role_required(["ADMIN", "CLIENTE"]))):
    """Obtener todos los tickets de una compra específica"""
    
    # Verificar que la compra existe
    compra = get_compra_by_id(db,compra_id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != compra.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver los tickets de esta compra."
        )
    
    compra_estado = compra_estado or ESTADO_COMPRA_PAGADA
    return get_tickets_by_compra_id(db,compra_id,compra_estado)


# Obtener tickets que un usuario compró para un evento específico (ADMIN o ORGANIZADOR dueño del evento)
@router.get("/evento/{evento_id}/usuario/{usuario_id}", response_model=List[TicketWithDetails])
def obtener_tickets_usuario_en_evento(evento_id: int, usuario_id: int, db: Session = Depends(get_db),
                                     auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Permite al organizador del evento (o admin) ver los tickets que un inscrito compró para ese evento."""
    # Validar evento
    evento = get_evento_by_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    # Verificar permisos: admin o el organizador dueño del evento
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    if current_user.rol.value != 'ADMIN':
        # obtener el usuario-organizador asociado al evento para comparar
        
        organizador_usuario = get_usuario_organizador_by_evento_id(db, evento_id)
        if not organizador_usuario or organizador_usuario.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="El organizador solo tiene permisos para sus propios eventos")

    # Verificar que el usuario inscrito exista
    usuario = get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return get_tickets_by_user_and_event(db, usuario_id, evento_id)

@router.get(
    "/tickets/evento/{evento_id}/", 
    response_model=List[TicketWithDetails],
    status_code=status.HTTP_200_OK
)
def obtener_tickets_evento_por_filtros(
    evento_id: int, 
    usuario_id: Optional[int] = None, 
    estado: Optional[str] = None,
    zona_nombre: Optional[str] = None,
    fecha_evento_desde: Optional[datetime] = None,
    fecha_evento_hasta: Optional[datetime] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Permite al organizador del evento (o admin) ver los tickets que un inscrito 
    compró para ese evento, con filtros opcionales.
    """
    
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    if current_user.rol.value != 'ADMIN':
        organizador_usuario = get_usuario_organizador_by_evento_id(db, evento_id)
        if not organizador_usuario or organizador_usuario.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="El organizador solo tiene permisos para sus propios eventos")
    
    tickets = get_tickets_with_details_filtered(
        db=db,
        usuario_id=usuario_id,         
        evento_nombre=evento.nombre,   
        estado=estado,           
        zona_nombre=zona_nombre,
        fecha_evento_desde=fecha_evento_desde,
        fecha_evento_hasta=fecha_evento_hasta
    )

    if not tickets:
        # Esto puede indicar que el usuario existe, el evento existe, pero no hay tickets asociados.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="No se encontraron tickets para este usuario en este evento con los filtros aplicados.")
                            
    return tickets

@router.post("/validar/{codigo_qr:path}")
def validar_ticket(codigo_qr: str, db: Session = Depends(get_db),
                   auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Validar ingreso con ticket (QR)"""
    ticket = get_ticket_by_qr(db, codigo_qr)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    if ticket.estado == "USADO":
        raise HTTPException(status_code=409, detail="El ticket ya ha sido usado")
    
    if ticket.estado != "valido":
        raise HTTPException(status_code=400, detail=f"Ticket no válido (Estado: {ticket.estado})")
    
    # Marcar como usado
    ticket.estado = "USADO"
    ticket.fecha_actualizacion = datetime.utcnow()
    db.commit()
    
    return {"mensaje": "Ticket válido", "ticket_id": ticket.id}