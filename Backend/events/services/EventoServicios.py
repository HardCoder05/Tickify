from typing import Any, Dict, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from events.controllers.EventoController import (
    get_etapas_by_evento_id,
    get_tipo_ticket_by_evento_id,
    get_zonas_by_evento_id,
    get_evento_by_id,
    validar_zona_nombre,
    validar_etapa_nombre,
    validar_tipo_ticket_nombre,
    get_fechas_by_evento_id,
    get_fecha_by_id,
)
from events.models.EventoEsquema import EventoCreate, FechaEvento, ZonaEvento, EtapaEvento, TipoTicketEvento,EventoUpdate
from users.controllers.UsuarioController import get_usuario_by_email, get_usuario_organizador_by_evento_id, get_organizador_by_usuario
# Import models to perform precise existence checks in validations
from events.models.Zona import Zona
from events.models.Etapa import Etapa
from tickets.models.TipoTicket import TipoTicket
from datetime import datetime, date
from events.models.Evento import Evento
from events.models.Descuento import TipoDescuento

ESTADOS_EVENTO_VALIDOS = ['publicado', 'borrador', 'cancelado','eliminado','activo','finalizado']
ESTADOS_FECHA_VALIDOS = ['activo', 'inactivo', 'cancelado']

def verificar_evento_borrador(evento: Evento):
    if evento.estado != "borrador":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede modificar un evento en estado 'borrador'."
        )
    
def validar_evento_creacion(evento: EventoCreate):
    """Realiza validaciones de reglas de negocio para la creación del evento principal."""
    if evento.fecha_inicio >= evento.fecha_fin:
        raise HTTPException(
            status_code=400, 
            detail="La fecha de inicio debe ser anterior a la fecha de fin"
        )
         
def validar_fecha_data(db: Session, fecha: FechaEvento, evento: Evento, fecha_id: int | None = None):
    """Realiza validaciones para la adición de una fecha específica."""
    if not isinstance(fecha.fecha_inicio, datetime) or not isinstance(fecha.fecha_fin, datetime):
        raise HTTPException(
            status_code=400,
            detail="Las fechas de inicio y fin deben tener formato datetime."
        )
    if fecha.fecha_inicio >= fecha.fecha_fin:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio debe ser anterior a la fecha de fin"
        )
    
    # Validar capacidad solo si los campos existen (para FechaEventoUpdate)
    if hasattr(fecha, 'capacidad_maxima') and fecha.capacidad_maxima is not None:
        if fecha.capacidad_maxima < 0:
            raise HTTPException(
                status_code=400,
                detail="La capacidad máxima debe ser mayor a 0"
            )
    
    if hasattr(fecha, 'aforo_disponible') and fecha.aforo_disponible is not None:
        if fecha.aforo_disponible < 0:
            raise HTTPException(
                status_code=400,
                detail="El aforo disponible no puede ser negativo."
            )
        
        if hasattr(fecha, 'capacidad_maxima') and fecha.capacidad_maxima is not None:
            if fecha.aforo_disponible > fecha.capacidad_maxima:
                raise HTTPException(
                    status_code=400,
                    detail="El aforo disponible no puede exceder la capacidad máxima."
                )
    
    fechas_existentes = get_fechas_by_evento_id(db,evento.id)

    # Normalizar fechas a naive (sin timezone) para comparación
    fecha_inicio_naive = fecha.fecha_inicio.replace(tzinfo=None) if fecha.fecha_inicio.tzinfo else fecha.fecha_inicio
    fecha_fin_naive = fecha.fecha_fin.replace(tzinfo=None) if fecha.fecha_fin.tzinfo else fecha.fecha_fin

    for f in fechas_existentes:
        # saltar si estamos actualizando y es la misma fecha
        if fecha_id and f.id == fecha_id:
            continue

        # Normalizar fechas existentes a naive
        f_inicio_naive = f.fecha_inicio.replace(tzinfo=None) if f.fecha_inicio.tzinfo else f.fecha_inicio
        f_fin_naive = f.fecha_fin.replace(tzinfo=None) if f.fecha_fin.tzinfo else f.fecha_fin

        # Solapamiento si se cruzan en tiempo
        if not (fecha_fin_naive <= f_inicio_naive or fecha_inicio_naive >= f_fin_naive):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"La fecha indicada se solapa con otra existente del evento: "
                    f"{f.fecha_inicio} - {f.fecha_fin}."
                )
            )
    if fecha_id:
        fecha_db = get_fecha_by_id(db,fecha_id)
        if not fecha_db:
            raise HTTPException(
                status_code=404,
                detail="La fecha del evento que intenta actualizar no existe."
            )

def validar_tipo_ticket_data(db: Session, tipo_ticket: TipoTicketEvento, evento: Evento, tipo_ticket_id: int | None = None):
    
    if not tipo_ticket.nombre or not tipo_ticket.nombre.strip():
        raise HTTPException(
            status_code=400,
            detail="El nombre del tipo de ticket no puede estar vacío."
        )
    
    tipo_existente = validar_tipo_ticket_nombre(db, evento.id, tipo_ticket.nombre)
    if tipo_existente and tipo_existente.id != tipo_ticket_id:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un tipo de ticket con el nombre '{tipo_ticket.nombre}' en este evento."
        )
    
    incremento = getattr(tipo_ticket, "incremento", None)

    if incremento is None:
        incremento = 0

    try:
        incremento_val = float(incremento)
        if incremento_val < 0.0:
            raise HTTPException(
                status_code=400,
                detail="El incremento debe ser mayor o igual a cero."
            )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="El incremento debe ser un número válido."
        )


    
def validar_zona_data(db: Session, zona: ZonaEvento, evento: Evento, zona_id: int | None = None):
    """Realiza validaciones para la adición de una zona específica."""
    if not zona.nombre or not zona.nombre.strip():
        raise HTTPException(
            status_code=400,
            detail="El nombre de la zona no puede estar vacío."
        )
    
    precio_base = getattr(zona, "precio_base", None)

    if precio_base is None:
        precio_base = 0

    if precio_base < 0:
        raise HTTPException(
            status_code=400,
            detail="El precio base de la zona no puede ser negativo."
        )
    
    zona_existente = validar_zona_nombre(db, evento.id, zona.nombre)
    if zona_existente and zona_existente.id != zona_id:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una zona con el nombre '{zona.nombre}' en este evento."
        )

def validar_evento_update(evento_data: EventoUpdate):
    """Realiza validaciones de reglas de negocio para la actualización del evento principal."""
    data = evento_data.model_dump(exclude_unset=True)

    # Validación fechas si ambas están presentes
    if "fecha_inicio" in data and "fecha_fin" in data:
        if data["fecha_inicio"] >= data["fecha_fin"]:
            raise HTTPException(
                status_code=400, 
                detail="La fecha de inicio debe ser anterior a la fecha de fin"
            )
    
    # Validación capacidad solo si se envió
    if "capacidad_maxima" in data:
        if data["capacidad_maxima"] is None or data["capacidad_maxima"] <= 0:
            raise HTTPException(
                status_code=400,
                detail="La capacidad máxima debe ser mayor a 0"
            )
        
    

def validar_tarifa_data(db, evento_id: int, tarifa_data):
        """Valida que zona, tipo de ticket y etapa pertenezcan al mismo evento"""
        # Validaciones más precisas: comprobar existencia por ID y pertenencia al evento
        # Zona
        if getattr(tarifa_data, 'zona_id', None) is not None:
            zona = db.query(Zona).filter(Zona.id == tarifa_data.zona_id, Zona.evento_id == evento_id).first()
            if not zona:
                raise HTTPException(
                    status_code=400,
                    detail=f"La zona con ID {tarifa_data.zona_id} no pertenece al evento {evento_id}."
                )

        # Tipo de ticket
        if getattr(tarifa_data, 'tipo_ticket_id', None) is not None:
            tipo = db.query(TipoTicket).filter(TipoTicket.id == tarifa_data.tipo_ticket_id, TipoTicket.evento_id == evento_id).first()
            if not tipo:
                raise HTTPException(
                    status_code=400,
                    detail=f"El tipo de ticket con ID {tarifa_data.tipo_ticket_id} no pertenece al evento {evento_id}."
                )

        # Etapa
        if getattr(tarifa_data, 'etapa_id', None) is not None:
            etapa = db.query(Etapa).filter(Etapa.id == tarifa_data.etapa_id, Etapa.evento_id == evento_id).first()
            if not etapa:
                raise HTTPException(
                    status_code=400,
                    detail=f"La etapa con ID {tarifa_data.etapa_id} no pertenece al evento {evento_id}."
                )

        # Validaciones de valores
        precio = getattr(tarifa_data, 'precio', None)
        cantidad = getattr(tarifa_data, 'cantidad', None)
        if precio is None:
            precio = 0
        if cantidad is None:
            cantidad = 0

        try:
            precio_val = float(precio)
        except Exception:
            raise HTTPException(status_code=400, detail="El campo 'precio' debe ser un número válido")

        if precio_val < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo")

        try:
            cantidad_val = int(cantidad)
        except Exception:
            raise HTTPException(status_code=400, detail="El campo 'cantidad' debe ser un entero válido")

        if cantidad_val < 0:
            raise HTTPException(status_code=400, detail="La cantidad no puede ser negativa")

        return True

def validar_descuentos_permisos(db: Session, evento_id: int, auth_payload: dict, descuento=None, only_permisos: bool = False):
    """Verifica si el usuario actual es ADMIN o el ORGANIZADOR del evento."""
    evento = get_evento_by_id(db, evento_id,auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")

    # Si el rol en el token es ADMIN, permitir acceso directamente
    if auth_payload.get("rol") == 'ADMIN':
        return
    
    # Para ORGANIZADOR, verificar que exista en la BD y que sea el dueño del evento
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado en el sistema."
        )
    
    usuario_organizador = get_usuario_organizador_by_evento_id(db, evento_id)
    organizador_del_evento = get_organizador_by_usuario(db,usuario_organizador.id)
    if not organizador_del_evento or current_user.id != organizador_del_evento.usuario_id:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el Administrador o el Organizador del evento pueden gestionar descuentos."
        )
    
    # Validaciones adicionales solo si se proporciona un descuento específico
    if descuento is not None:
        validar_fechas_descuento_con_evento(evento, descuento)
        validar_reglas_de_descuento(descuento)

def validar_reglas_de_descuento(descuento):
    
    
    if descuento.tipo_descuento:  
        # Tipo: porcentaje
        if descuento.tipo_descuento == TipoDescuento.porcentaje:
            if not (0 < descuento.valor <= 100):
                raise HTTPException(
                    status_code=400,
                    detail="El valor del descuento porcentual debe estar entre 1 y 100."
                )

        # Tipo: efectivo
        if descuento.tipo_descuento == TipoDescuento.efectivo:
            if descuento.valor <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="El descuento en efectivo debe ser mayor a 0."
                )

    # Usos máximos
    if descuento.usos_maximos:
        if descuento.usos_maximos < 1:
            raise HTTPException(
                status_code=400,
                detail="El número de usos máximos debe ser mayor o igual a 1."
            )

    # Código no vacío
    if not descuento.codigo or not descuento.codigo.strip():
        raise HTTPException(
            status_code=400,
            detail="El código de descuento no puede estar vacío."
        )
    
def validar_fechas_descuento_con_evento(evento, descuento):
    """
    Valida que las fechas del descuento estén dentro del rango del evento.
    """
    if descuento.fecha_inicio and descuento.fecha_fin:
        # Convertir a date para comparación si son datetime
        fecha_inicio = descuento.fecha_inicio.date() if isinstance(descuento.fecha_inicio, datetime) else descuento.fecha_inicio
        fecha_fin = descuento.fecha_fin.date() if isinstance(descuento.fecha_fin, datetime) else descuento.fecha_fin
        evento_fecha_fin = evento.fecha_fin.date() if isinstance(evento.fecha_fin, datetime) else evento.fecha_fin
        
        if fecha_inicio < date.today():
            raise HTTPException(
                status_code=400,
                detail="La fecha de inicio del descuento no puede ser anterior a hoy."
            )
        if fecha_fin > evento_fecha_fin:
            raise HTTPException(
                status_code=400,
                detail="La fecha de fin del descuento no puede ser posterior a la fecha de fin del evento."
            )
        if fecha_inicio >= fecha_fin:
            raise HTTPException(
                status_code=400,
                detail="La fecha de inicio del descuento debe ser anterior a la fecha de fin."
            )
    
def validar_etapa_data(db: Session, etapa: EtapaEvento, evento: Evento, rol:str, etapa_id: int | None = None):
    """
    Valida que los datos de la etapa sean coherentes con el evento:
    - La fecha de inicio y fin de la etapa no pueden estar fuera del rango del evento.
    - La fecha de fin debe ser posterior a la fecha de inicio.
    - etapa_id: ID de la etapa actual (para excluirla al validar solapamientos durante actualización)
    """
    etapa_existente = validar_etapa_nombre(db, evento.id, etapa.nombre)
    if etapa_existente and etapa_existente.id != etapa_id:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una etapa con el nombre '{etapa.nombre}' en este evento."
        )
    
    fecha_inicio_evento = evento.fecha_inicio
    fecha_fin_evento = evento.fecha_fin

    # Determinar la última función del evento
    if hasattr(evento, 'fechas') and evento.fechas:
        ultima_funcion = max(evento.fechas, key=lambda f: f.fecha_inicio).fecha_inicio
    else:
        ultima_funcion = evento.fecha_inicio
    
    # Validar fechas presentes
    if not etapa.fecha_inicio or not etapa.fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La etapa debe tener fecha de inicio y fecha de fin."
        )

    if not etapa.fecha_inicio or not etapa.fecha_fin:
        raise HTTPException(400, "La etapa debe tener fecha de inicio y fin.")
    
    if etapa.fecha_inicio.date() < datetime.now().date():
        raise HTTPException(
            status_code=400,
            detail="La etapa no puede iniciar en el pasado."
        )

    # Validar rango lógico
    if etapa.fecha_fin <= etapa.fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin de la etapa debe ser posterior a la fecha de inicio."
        )

    # Validar que termine antes de la última función
    if etapa.fecha_fin > ultima_funcion:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La etapa debe finalizar antes de que inicie la última función "
                f"({ultima_funcion.date()})."
            )
        )
    
    etapas_existentes = get_etapas_by_evento_id(db,evento.id,rol)

    ############################IMPORTANTE REVISAR TIPO DATETIME/DATE SOLUCIÓN TEMPORAL################################3
    for e in etapas_existentes:
        # Excluir la etapa actual al validar actualizaciones
        if etapa_id and e.id == etapa_id:
            continue
            
        # Solapamiento si los rangos se cruzan
        e_inicio = e.fecha_inicio.date() if isinstance(e.fecha_inicio, datetime) else e.fecha_inicio
        e_fin = e.fecha_fin.date() if isinstance(e.fecha_fin, datetime) else e.fecha_fin
        
        if not (etapa.fecha_fin.date() <= e_inicio or etapa.fecha_inicio.date() >= e_fin):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La etapa se solapa con otra existente: '{e.nombre}' "
                    f"({e.fecha_inicio} - {e.fecha_fin})."
                )
            )
        
def verificar_evento_borrador(evento: Evento):
    if evento.estado != "borrador":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede modificar un evento en estado 'borrador'."
        )
    

def validar_publicacion_evento(db: Session, evento: Evento):
    # Obtener datos relacionados
    etapas = get_etapas_by_evento_id(db, evento.id, "ORGANIZADOR")
    zonas = get_zonas_by_evento_id(db, evento.id, "ORGANIZADOR")
    tipos = get_tipo_ticket_by_evento_id(db, evento.id, "ORGANIZADOR")

    if not zonas or len(zonas) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento no puede publicarse porque no tiene zonas creadas."
        )

    for zona in zonas:
        if not zona.asientos or len(zona.asientos) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La zona '{zona.nombre}' no tiene asientos creados."
            )

    if not etapas or len(etapas) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento no puede publicarse porque no tiene etapas creadas."
        )

    if not tipos or len(tipos) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento no puede publicarse porque no tiene tipos de ticket configurados."
        )

    if not evento.fechas or len(evento.fechas) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento no tiene fecha definida."
        )

    if evento.estado == "activo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El evento ya se encuentra publicado."
        )
    
    if evento.estado !="borrador":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo puedes publicar un evento en estado borrador."
        )
    
    return True

