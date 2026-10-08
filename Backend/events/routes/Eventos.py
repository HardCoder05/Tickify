from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from events.controllers.EventoController import (
    create_etapa_evento,
    create_evento_full,
    create_fecha_evento,
    create_tarifas_automaticamente,
    create_tipo_ticket,
    create_zona_evento,
    delete_evento_db,
    get_etapas_by_evento_id,
    get_evento_by_id,
    get_evento_completo,
    get_eventos_filtrados,
    get_fechas_by_evento_id,
    get_tarifas_by_evento_id,
    get_tipo_ticket_by_evento_id,
    get_zonas_by_evento_id,
    update_evento_db,
    create_banner,
    update_comision_db,
    get_tipo_ticket_by_id,
    update_tipo_ticket,
    update_etapa_db,
    update_zona_db,
    get_zona_by_id,
    get_etapa_by_id,
    get_eventos_by_usuario_id,
    delete_zona,
    delete_etapa,
    delete_tipo_ticket,
    delete_fecha_evento,
    get_comision_db,
    create_descuento,
    get_descuentos_by_evento,
    get_descuento_by_id,
    update_descuento,
    delete_descuento,
    publicar_evento,
    cancel_evento_db,
    get_fecha_by_id,
    update_evento_fecha,
    cancelar_evento,
    cancelar_fecha_evento,
    create_politica_devolucion,
    get_politica_devolucion_url,
    delete_politica_devolucion,
)
from events.models.Evento import Evento
from events.models.EventoEsquema import (
    EtapaEvento,
    EventoCompletoResponse,
    EventoCreate,
    EventoRead,
    FechaEvento,
    TarifaEvento,
    TipoTicketEvento,
    TipoTicketEventoRead,
    EtapaEventoRead,
    ZonaEvento,
    ZonaEventoRead,
    EventoFiltro,
    DescuentoCreate,
    DescuentoRead,
    DescuentoUpdate,
    EventoUpdate,
    TarifaEventoRead,
    FechaEventoRead,
    FechaEventoUpdate,
    ResultadoTarifas,
)
from events.models.EventoFecha import EventoFecha
from events.models.Tarifa import Tarifa
from events.models.Zona import Zona
from events.services.EventoServicios import (
    validar_evento_creacion,
    validar_evento_update,
    validar_fecha_data,
    validar_tarifa_data,
    validar_zona_data,
    validar_descuentos_permisos,
    validar_etapa_data,
    validar_tipo_ticket_data,
    validar_publicacion_evento,
    verificar_evento_borrador,
)
from users.controllers.UsuarioController import get_usuario_by_email, get_organizador_by_usuario
from users.models.Usuario import Usuario
from users.models.Organizador import Organizador
from users.services.AutenticacionServicio import (
    get_current_user_payload,  # Para obtener el rol y el sub(correo)
    get_role,
)
from users.services.AutenticacionServicio import (
    role_required,  # Para la verificación simple de roles
)

from events.services.CloudinaryServicios import upload_image
from fastapi import Form, File, UploadFile
# Router con prefijo
router = APIRouter(
    prefix="/api/v1/eventos",
    tags=["eventos"]
)

# Crear evento (básico o completo): Solo ADMIN u ORGANIZADOR
@router.post("/", response_model=EventoRead,status_code=status.HTTP_201_CREATED)
def crear_evento(evento: EventoCreate, db: Session = Depends(get_db),
                 auth_payload: dict = Depends(role_required(["ADMIN","ORGANIZADOR"]))):
    """Crear un evento básico o completo con fechas, zonas y tarifas"""
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if not current_user:
        raise HTTPException(status_code=404, detail="Usuario organizador no encontrado en el sistema.")
    
    # Si el usuario autenticado es ORGANIZADOR, verificar que el organizador
    # exista y que el evento se cree a nombre de ese organizador.
    if current_user.rol.value == 'ORGANIZADOR':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador:
            raise HTTPException(status_code=404, detail="Organizador no encontrado para el usuario autenticado.")
        # Si el cliente no envió organizador_id, lo derivamos automáticamente.
        if not evento.organizador_id:
            evento.organizador_id = organizador.id
        elif evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Un organizador solo puede crear eventos a su propio nombre (organizador_id)."
            )
    
    validar_evento_creacion(evento)
    
    try:
        # El banner_url ya viene incluido en el objeto evento
        return create_evento_full(db, evento)
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"Error al crear el evento: {str(e)}")
        
# Obtener todos los eventos: Ruta Pública
@router.get("/", response_model=List[EventoRead])
def obtener_eventos(
    estado: str | None = Query(None),
    organizador_id: int | None = Query(None),
    nombre: str | None = Query(None),
    fecha_inicio: str | None = Query(None),
    fecha_fin: str | None = Query(None),
    categoria_id: int | None = Query(None),
    db: Session = Depends(get_db),
    rol: str = Depends(get_role)
):
    """Obtener todos los eventos con filtros opcionales"""
    
    from tickets.controllers.TicketController import get_tickets_by_evento_id
    
    evento_filtro = EventoFiltro(
    estado=estado,
    organizador_id=organizador_id,
    nombre=nombre,
    fecha_inicio=fecha_inicio,
    fecha_fin=fecha_fin,
    categoria_id=categoria_id
    )
    eventos = get_eventos_filtrados(db,evento_filtro,rol)
    
    # Agregar conteo de tickets vendidos a cada evento
    eventos_con_tickets = []
    for evento in eventos:
        # Contar tickets vendidos para este evento
        tickets = get_tickets_by_evento_id(db, evento.id)
        tickets_vendidos = len(tickets)
        
        # Convertir a dict y agregar el campo
        evento_dict = {
            "id": evento.id,
            "organizador_id": evento.organizador_id,
            "categoria_publico_id": evento.categoria_publico_id,
            "nombre": evento.nombre,
            "descripcion": evento.descripcion,
            "fecha_inicio": evento.fecha_inicio,
            "fecha_fin": evento.fecha_fin,
            "capacidad_maxima": evento.capacidad_maxima,
            "banner_url": evento.banner_url,
            "estado": evento.estado,
            "fecha_creacion": evento.fecha_creacion,
            "fecha_actualizacion": evento.fecha_actualizacion,
            "ubicacion": evento.ubicacion,
            "ciudad": evento.ciudad,
            "tickets_vendidos": tickets_vendidos
        }
        eventos_con_tickets.append(evento_dict)
    
    return eventos_con_tickets

# Obtener evento por ID: Público
@router.get("/{evento_id}", response_model=EventoRead)
def obtener_evento(evento_id: int, db: Session = Depends(get_db), rol: str = Depends(get_role)):
    """Obtener un evento por su ID"""
    print("ROL DETECTADO:", rol)
    evento = get_evento_by_id(db, evento_id,rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento

# Obtener evento completo con fechas, zonas y tarifas: Público
@router.get("/{evento_id}/completo", response_model=EventoCompletoResponse)
def obtener_evento_completo(evento_id: int, db: Session = Depends(get_db),rol: str = Depends(get_role)):
    """Obtener un evento completo con todas sus fechas, zonas y tarifas"""
    from tickets.controllers.TicketController import get_tickets_by_evento_id
    
    evento_completo = get_evento_completo(db, evento_id,rol)
    if not evento_completo:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    # Agregar conteo de tickets vendidos al evento
    tickets = get_tickets_by_evento_id(db, evento_id)
    tickets_vendidos = len(tickets)
    
    # Convertir a dict para poder agregar el campo
    response_dict = {
        "evento": {
            **{k: v for k, v in evento_completo.evento.__dict__.items() if not k.startswith('_')},
            "tickets_vendidos": tickets_vendidos
        },
        "fechas": evento_completo.fechas,
        "zonas": evento_completo.zonas,
        "tarifas": evento_completo.tarifas,
        "etapas": evento_completo.etapas,
        "tipos_ticket": evento_completo.tipos_ticket
    }
    
    return response_dict

# Actualizar evento: Organizador o ADMIN
@router.put("/{evento_id}", response_model=EventoRead)
def actualizar_evento(evento_id: int, evento_data: EventoUpdate, db: Session = Depends(get_db),
                      auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Actualizar un evento"""
    try:
        evento = get_evento_by_id(db,evento_id,auth_payload.get("rol") )
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        current_user = get_usuario_by_email(db, auth_payload.get("sub"))

        # Solo ADMIN o el organizador asociado al usuario autenticado
        if current_user.rol.value != 'ADMIN':
            organizador = get_organizador_by_usuario(db, current_user.id)
            if not organizador or evento.organizador_id != organizador.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para actualizar este evento, solo el organizador o un administrador."
                )
        
        # Validar estado del evento
        if evento.estado not in ["borrador", "activo"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede actualizar un evento en estado '{evento.estado}'. Solo se pueden editar eventos en borrador o activos."
            )
        
        if hasattr(evento_data, "model_dump"):
            evento_dict = evento_data.model_dump(exclude_unset=True)
        else:
            evento_dict = evento_data
        # Si el evento está activo, solo permitir actualización de ciertos campos
        if evento.estado == "activo":
            campos_permitidos = {"descripcion", "banner_url"}
            campos_enviados = set(evento_dict.keys())
            campos_no_permitidos = campos_enviados - campos_permitidos
            
            if campos_no_permitidos:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se pueden modificar los siguientes campos en un evento activo: {', '.join(campos_no_permitidos)}. Solo se permiten: {', '.join(campos_permitidos)}."
                )
        
        # Convertir a dict para validación
        validar_evento_update(evento_data)
        
        return update_evento_db(db, evento, evento_dict)
        
    except HTTPException:
        # Re-lanzar excepciones HTTP (validaciones de negocio)
        raise
    except Exception as e:
        # Capturar cualquier otro error y devolver mensaje claro
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al actualizar el evento: {str(e)}"
        )
    
    

# Eliminar evento
@router.delete("/{evento_id}",status_code=status.HTTP_204_NO_CONTENT)
def eliminar_evento(evento_id: int, db: Session = Depends(get_db),
                    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Eliminar un evento"""
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    # Solo puede eliminar el evento el admin o el organizador asociado
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        
        # Debug logging
        print(f"[DEBUG DELETE] Usuario ID: {current_user.id}, Organizador: {organizador}")
        if organizador:
            print(f"[DEBUG DELETE] Organizador ID: {organizador.id}, Estado: {organizador.estado}")
            print(f"[DEBUG DELETE] Evento organizador_id: {evento.organizador_id}")
        
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"No tienes permiso para eliminar este evento. Organizador: {organizador.id if organizador else 'None'}, Evento organizador_id: {evento.organizador_id}"
            )
    if evento.estado == "eliminado":
        raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="El evento ya se encuentra eliminado."
            )
    if evento.estado != "borrador":
        raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Solo se puede eliminar un evento en estado borrador."
            )
    delete_evento_db(db,evento)
    return

# Publicar evento: Organizador o ADMIN
@router.patch("/{evento_id}", response_model=EventoRead)
def publicar_evento_borrador(evento_id: int, db: Session = Depends(get_db),
                      auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Publicar un evento"""
    evento = get_evento_by_id(db,evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    # Solo ADMIN o el organizador asociado al usuario autenticado
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para publicar este evento, solo el organizador o un administrador."
            )
        
    validar_publicacion_evento(db,evento)

    evento_publicado = publicar_evento(db, evento)
    
    return evento_publicado

@router.put("/{evento_id}/cancelar", response_model=EventoRead)
def cancelar_evento_completo(
    evento_id: int,
    db: Session = Depends(get_db),
    # Solo permite ADMIN u ORGANIZADOR
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"])) 
):
    """
    Marca un evento y todos sus elementos (tarifas, tickets, compras) 
    como CANCELADO (soft delete para el público).
    """
    evento = get_evento_by_id(db, evento_id,auth_payload["rol"])
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado.")
    
    if(evento.estado == "cancelado"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evento ya se encuentra cancelado.")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado.")

    # Solo ADMIN o el organizador asociado al usuario autenticado
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para publicar este evento, solo el organizador o un administrador."
            )
    if evento.estado !="activo":
        raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se puede cancelar eventos que se encuentran publicados."
            )
    try:
        cancelar_evento(db, evento)
        return evento 
    except Exception as e:
        # Esto captura errores inesperados (p. ej., problemas de DB, chequeos de integridad, etc.)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al procesar la cancelación: {str(e)}"
        )
# ==================== GESTIÓN DE FECHAS ====================

# Agregar fecha a un evento
@router.post("/{evento_id}/fechas", response_model=FechaEvento)
def agregar_fecha_evento(evento_id: int, fecha: FechaEvento, db: Session = Depends(get_db),
                         auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Agregar una fecha específica a un evento"""
    
    # Verificar que el evento existe
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    verificar_evento_borrador(evento)
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permiso para modificar este evento."
            )
    
    validar_fecha_data(db, fecha, evento)
    
    return create_fecha_evento(db,evento_id,fecha)
    
# Obtener fechas de un evento: Público
@router.get("/{evento_id}/fechas", response_model=List[FechaEventoRead])
def obtener_fechas_evento(evento_id: int, db: Session = Depends(get_db),rol: str = Depends(get_role)):
    """Obtener todas las fechas de un evento"""
    
    evento = get_evento_by_id(db, evento_id,rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    return get_fechas_by_evento_id(db,evento_id,rol)
    
@router.put("/fechas/{fecha_id}", response_model=FechaEventoRead)
def actualizar_fecha_evento(
    fecha_id: int,
    fecha_data: FechaEventoUpdate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """Actualizar una fecha de un evento"""
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    fecha = get_fecha_by_id(db,fecha_id)  
    if not fecha:
        raise HTTPException(status_code=404, detail="Fecha no encontrada")
    evento = get_evento_by_id(db, fecha.evento_id, "ORGANIZADOR")

    verificar_evento_borrador(evento)
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or fecha.evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar esta fecha."
            )

    return update_evento_fecha(db, fecha, fecha_data)

@router.put("/fechas/{fecha_id}/cancelar")
def cancelar_funcion(
    fecha_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN","ORGANIZADOR"]))
):
    fecha = get_fecha_by_id(db, fecha_id)
    if not fecha:
        raise HTTPException(status_code=404, detail="Fecha no encontrada")

    evento = get_evento_by_id(db,fecha.evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload["sub"])

    # Validar permisos
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or organizador.id != evento.organizador_id:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para cancelar esta fecha."
            )

    # Validar estado
    if fecha.estado == "cancelado":
        raise HTTPException(
            status_code=400,
            detail="Esta fecha ya se encuentra cancelada."
        )

    cancelar_fecha_evento(db, fecha)
    return {"msg": "Se ha eliminado la fecha correctamente"}

@router.delete("/fechas/{fecha_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_fecha(
    fecha_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """Eliminación lógica de una fecha de evento."""
    
    fecha = get_fecha_by_id(db, fecha_id)
    if not fecha:
        raise HTTPException(status_code=404, detail="Fecha no encontrada")
    
    evento = get_evento_by_id(db, fecha.evento_id, auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento asociado no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    
    # Validar permisos: Solo ADMIN o el organizador del evento
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar esta fecha."
            )
    
    # Validar que no tenga tickets vendidos
    from tickets.controllers.TicketController import get_tickets_by_fecha_id
    tickets = get_tickets_by_fecha_id(db, fecha_id)
    if tickets and len(tickets) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la fecha porque tiene {len(tickets)} ticket(s) vendidos."
        )
    
    delete_fecha_evento(db, fecha)
    return

# ==================== GESTIÓN DE ZONAS ====================

# Agregar zona a un evento: ORGANIZADOR o ADMIN
@router.post("/{evento_id}/zonas", response_model=ZonaEventoRead)
def agregar_zona_evento(evento_id: int, zona: ZonaEvento, db: Session = Depends(get_db),
                        auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Agregar una zona a un evento"""
    
    # Verificar que el evento existe
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    verificar_evento_borrador(evento)
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permiso para modificar este evento."
            )
        
    validar_zona_data(db,zona,evento)

    return create_zona_evento(db,evento_id,zona)

# Obtener zonas de un evento: Público (pero precio_base solo visible para ORGANIZADOR/ADMIN)
@router.get("/{evento_id}/zonas")
def obtener_zonas_evento(evento_id: int, db: Session = Depends(get_db),rol: str = Depends(get_role)):
    """Obtener todas las zonas de un evento con sus tarifas.

    Nota: el campo `precio_base` se incluye en la respuesta solo si el rol es ORGANIZADOR o ADMIN.
    """

    evento = get_evento_by_id(db, evento_id,rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    zonas = get_zonas_by_evento_id(db, evento_id, rol)

    # Serializar manualmente para incluir precio_base solo para organizador/admin
    zonas_serializadas = []
    for z in zonas:
        zona_dict = {
            "id": z.id,
            "evento_id": z.evento_id,
            "nombre": z.nombre,
            "descripcion": z.descripcion,
            "capacidad": z.capacidad,
            "estado": z.estado,
            "fecha_creacion": z.fecha_creacion,
            "fecha_actualizacion": z.fecha_actualizacion,
        }
        if rol in ["ORGANIZADOR", "ADMIN"]:
            # Precio base puede ser Decimal u otra representación en el modelo; convertir a float si existe
            precio_base_val = getattr(z, "precio_base", None)
            try:
                zona_dict["precio_base"] = float(precio_base_val) if precio_base_val is not None else None
            except Exception:
                zona_dict["precio_base"] = precio_base_val

        zonas_serializadas.append(zona_dict)

    return zonas_serializadas
    
# Actualizar zona: ORGANIZADOR o ADMIN (Ruta nueva)
@router.put("/zonas/{zona_id}", response_model=ZonaEventoRead)
def actualizar_zona(zona_id: int, zona_data: ZonaEvento, db: Session = Depends(get_db),
                     auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Actualizar una zona existente por su ID."""
    zona = get_zona_by_id(db, zona_id)
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada.")
    
    evento_asociado = get_evento_by_id(db, zona.evento_id)

    if not evento_asociado:
        raise HTTPException(status_code=500, detail="Error de datos: Evento asociado a la zona no encontrado.")

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para actualizar esta zona."
            )
    verificar_evento_borrador(evento_asociado)
    validar_zona_data(db,zona_data,evento_asociado,zona_id) 
    
    return update_zona_db(db, zona, zona_data)

# Eliminar zona (lógica): ORGANIZADOR o ADMIN
@router.delete("/zonas/{zona_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_zona(zona_id: int, db: Session = Depends(get_db),
                  auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Eliminación lógica de una zona."""
    
    zona = get_zona_by_id(db, zona_id)
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada.")
    
    evento_asociado = get_evento_by_id(db, zona.evento_id)
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar esta zona."
            )
            
    delete_zona(db, zona)
    return

# ==================== GESTIÓN DE ETAPAS ====================
# Agregar etapa a un evento: ORGANIZADOR o ADMIN
@router.post("/{evento_id}/etapas", response_model=EtapaEventoRead)
def agregar_etapa_evento(evento_id: int, etapa: EtapaEvento, db: Session = Depends(get_db),
                        auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Agregar una etapa a un evento"""
    
    # Verificar que el evento existe
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    verificar_evento_borrador(evento)
    # Cargar las fechas del evento para validación de eventos recurrentes
    from sqlalchemy.orm import joinedload
    evento = db.query(Evento).options(joinedload(Evento.fechas)).filter(Evento.id == evento_id).first()
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este evento."
            )
    
    validar_etapa_data(db,etapa,evento,auth_payload.get("rol"))

    return create_etapa_evento(db,evento_id,etapa)

# Obtener etapas de un evento: Público
@router.get("/{evento_id}/etapas", response_model=List[EtapaEventoRead])
def obtener_etapas_evento(evento_id: int, db: Session = Depends(get_db),rol: str = Depends(get_role)):
    """Obtener todas las etapas de un evento"""
    evento = get_evento_by_id(db, evento_id,rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return get_etapas_by_evento_id(db,evento_id,rol)

# Actualizar etapa: ORGANIZADOR o ADMIN (Ruta nueva)
@router.put("/etapas/{etapa_id}", response_model=EtapaEventoRead)
def actualizar_etapa(etapa_id: int, etapa_data: EtapaEvento, db: Session = Depends(get_db),
                     auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Actualizar una etapa existente por su ID."""
    
    etapa = get_etapa_by_id(db, etapa_id)
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")
    
    evento_asociado = get_evento_by_id(db, etapa.evento_id)
    if not evento_asociado:
        raise HTTPException(status_code=500, detail="Error de datos: Evento asociado a la etapa no encontrado.")

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para actualizar esta etapa."
            )
    verificar_evento_borrador(evento_asociado)
    validar_etapa_data(db, etapa_data, evento_asociado, auth_payload.get("rol"), etapa_id=etapa.id)
    
    return update_etapa_db(db, etapa, etapa_data)

# Eliminar etapa (lógica): ORGANIZADOR o ADMIN
@router.delete("/etapas/{etapa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_etapa(etapa_id: int, db: Session = Depends(get_db),
                   auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Eliminación lógica de una etapa."""
    
    etapa = get_etapa_by_id(db, etapa_id)
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")
    
    evento_asociado = get_evento_by_id(db, etapa.evento_id)
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar esta etapa."
            )
            
    delete_etapa(db, etapa)
    return

# ==================== GESTIÓN DE TIPOS TICKETS ====================
# Agregar tipos de ticket a un evento: ORGANIZADOR o ADMIN
@router.post("/{evento_id}/tipo_ticket", response_model=TipoTicketEventoRead)
def agregar_tipo_ticket_evento(evento_id: int, tipo_ticket: TipoTicketEvento, db: Session = Depends(get_db),
                        auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    
    # Verificar que el evento existe
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    verificar_evento_borrador(evento)
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este evento."
            )
    validar_tipo_ticket_data(db,tipo_ticket,evento)

    return create_tipo_ticket(db,evento_id,tipo_ticket)

# Obtener tipos ticket de un evento: Público
@router.get("/{evento_id}/tipo_ticket")
def obtener_tipos_ticket_evento(evento_id: int, db: Session = Depends(get_db), rol: str = Depends(get_role)):
    """
    Obtener tipos de ticket para un evento.

    Nota: el campo `incremento` se incluirá en la respuesta sólo si el rol es ORGANIZADOR o ADMIN.
    """
    evento = get_evento_by_id(db, evento_id, rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    tipos = get_tipo_ticket_by_evento_id(db, evento_id, rol)

    tipos_serializados = []
    for t in tipos:
        tipo_dict = {
            "id": t.id,
            "evento_id": t.evento_id,
            "nombre": t.nombre,
            "descripcion": t.descripcion,
            "estado": t.estado,
            "fecha_creacion": t.fecha_creacion,
            "fecha_actualizacion": t.fecha_actualizacion,
        }
        if rol in ["ORGANIZADOR", "ADMIN"]:
            try:
                tipo_dict["incremento"] = float(t.incremento) if getattr(t, "incremento", None) is not None else 0.0
            except Exception:
                tipo_dict["incremento"] = getattr(t, "incremento", None)

        tipos_serializados.append(tipo_dict)

    return tipos_serializados


# Actualizar tipo_ticket: ORGANIZADOR o ADMIN 
@router.put("/tipo_ticket/{tipo_ticket_id}", response_model=TipoTicketEventoRead)
def actualizar_tipo_ticket(tipo_ticket_id: int, tipo_data: TipoTicketEvento, db: Session = Depends(get_db),
                      auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Actualizar tipo de ticket del evento"""
    tipo_ticket = get_tipo_ticket_by_id(db,tipo_ticket_id)
    if not tipo_ticket:
        raise HTTPException(status_code=404, detail="Tipo de ticket no encontrado.")
    
    evento_asociado = get_evento_by_id(db, tipo_ticket.evento_id)

    if not evento_asociado:
         raise HTTPException(status_code=500, detail="Error de datos: Evento asociado no encontrado.")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    
    # Solo ADMIN o el organizador asociado al usuario autenticado
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para actualizar este evento, solo el organizador o un administrador."
            )
    verificar_evento_borrador(evento_asociado)
    validar_tipo_ticket_data(db,tipo_data,evento_asociado,tipo_ticket_id)
    return update_tipo_ticket(db,tipo_ticket,tipo_data)

# Eliminar tipo_ticket (lógico): ORGANIZADOR o ADMIN
@router.delete("/tipo_ticket/{tipo_ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tipo_ticket(tipo_ticket_id: int, db: Session = Depends(get_db),
                         auth_payload: dict = Depends(role_required(["ORGANIZADOR", "ADMIN"]))):
    """Eliminación lógica de un tipo de ticket."""
    
    tipo_ticket = get_tipo_ticket_by_id(db, tipo_ticket_id)
    if not tipo_ticket:
        raise HTTPException(status_code=404, detail="Tipo de ticket no encontrado.")
    
    evento_asociado = get_evento_by_id(db, tipo_ticket.evento_id)
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        
        if not organizador or evento_asociado.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este ticket."
            )
            
    delete_tipo_ticket(db, tipo_ticket)
    return

# ==================== GESTIÓN DE TARIFAS ====================
@router.post("/{evento_id}/tarifas", response_model=List[TarifaEventoRead])
def crear_tarifa_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """Botón que crea todas las tarifas automáticamente cuando ya tiene definidas
    las zonas, etapas y tipos de ticket"""
    evento = get_evento_by_id(db, evento_id, auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != 'ADMIN':
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para generar tarifas para este evento."
            )
    
    zonas = get_zonas_by_evento_id(db, evento_id,"ORGANIZADOR")
    etapas = get_etapas_by_evento_id(db, evento_id,"ORGANIZADOR")
    tipos_ticket = get_tipo_ticket_by_evento_id(db, evento_id,"ORGANIZADOR")

    if not zonas or not etapas or not tipos_ticket:
        raise HTTPException(
            status_code=400,
            detail="El evento debe tener zonas, etapas y tipos de ticket definidos antes de generar tarifas."
        )
    
    return create_tarifas_automaticamente(db,zonas,etapas,tipos_ticket,evento_id)

# Obtener tarifas de un evento: Público
@router.get("/{evento_id}/tarifas", response_model=List[TarifaEventoRead])
def obtener_tarifas_evento(evento_id: int, db: Session = Depends(get_db),rol: str = Depends(get_role)):
    """Obtener todas las tarifas del evento"""
    evento = get_evento_by_id(db, evento_id,rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    return get_tarifas_by_evento_id(db,evento_id,rol)

@router.post("/{evento_id}/banner", response_model=EventoRead, status_code=200)
async def subir_banner_evento(
    evento_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """Subir un banner (imagen) para un evento"""

    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este evento."
            )

    # Validar tipo de archivo: solo JPG permitido según pedido del cliente
    if file.content_type not in ["image/jpeg", "image/jpg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no permitido. Solo se permiten imágenes JPG (.jpg/.jpeg)."
        )
    try:
        return create_banner(db,file,evento)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")
    
# Obtener comisión: ADMIN
@router.get("/comision/", response_model=dict)
def obtener_evento_comision(db: Session = Depends(get_db),
                      auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Obtener comision de evento"""
    return get_comision_db(db)

# Actualizar comisión: ADMIN
@router.put("/comision/{comision}", response_model=dict)
def actualizar_evento_comision(comision: float, db: Session = Depends(get_db),
                      auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Actualizar comisiones de eventos que no haya llegado a fecha fin"""
    if comision <= 0 or comision > 100:
        raise HTTPException(status_code=400, detail="La comisión debe estar entre 0 y 100")
    
    return update_comision_db(db,comision)

@router.post("/politica-devolucion/")
def subir_politica_devolucion(evento_id: int, pdf: UploadFile = File(...), db: Session = Depends(get_db),
                              auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este evento."
            )
    # Validar que realmente sea un PDF
    if pdf.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser un PDF."
        )
    
    return create_politica_devolucion(db,evento,pdf)

@router.get("/politica-devolucion/")
def obtener_politica_devolucion(evento_id: int, db: Session = Depends(get_db), rol: str = Depends(get_role)):
    """Obtiene la URL del PDF de la política de devolución del evento"""
    evento = get_evento_by_id(db, evento_id, rol)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    url = get_politica_devolucion_url(evento)
    if not url:
        raise HTTPException(status_code=404, detail="El evento no tiene política de devolución")
    
    return {"url": url, "evento_id": evento_id}

@router.delete("/politica-devolucion/")
def eliminar_politica_devolucion(evento_id: int, db: Session = Depends(get_db),
                                 auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))):
    """Elimina la política de devolución del evento"""
    evento = get_evento_by_id(db, evento_id, auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    if current_user.rol.value != "ADMIN":
        organizador = get_organizador_by_usuario(db, current_user.id)
        if not organizador or evento.organizador_id != organizador.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este evento."
            )
    
    try:
        delete_politica_devolucion(db, evento)
        return {"message": "Política de devolución eliminada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar política: {str(e)}")


