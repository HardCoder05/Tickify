from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from datetime import datetime, timedelta
from events.models.Asiento import Asiento
from events.models.AsientoFecha import AsientoFecha
from events.models.Zona import Zona
from events.models.EventoFecha import EventoFecha
from events.controllers.EventoController import get_zona_by_id, _actualizar_capacidad_evento,_actualizar_capacidad_evento_incremental
from events.models.AsientoEsquema import AsientoDeshabilitado

# ============================================================
# FUNCIONES PARA LAYOUT BASE (Tabla: Asiento)
# ============================================================

def crear_layout_zona(
    db: Session,
    zona_id: int,
    filas: int,
    columnas: int,
    asientos_deshabilitados: List[AsientoDeshabilitado]
) -> List[Asiento]:
    """
    Crea el layout base de asientos para una zona.
    Este layout se replicará luego para cada fecha del evento.
    """
    # Verificar que la zona existe
    zona = get_zona_by_id(db,zona_id)
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    
    # Verificar si ya existe un layout para esta zona
    existe = db.query(Asiento).filter(Asiento.zona_id == zona_id).first()
    if existe:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un layout para esta zona. Usa la función de actualización."
        )
    
    asientos_creados = []
    deshabilitados_set = set()
    
    if asientos_deshabilitados:
        deshabilitados_set = {(a.fila, a.numero) for a in asientos_deshabilitados}
    
    # Crear todos los asientos del layout
    for fila in range(1, filas + 1):
        for numero in range(1, columnas + 1):
            estado = "eliminado" if (fila, numero) in deshabilitados_set else "activo"
            
            asiento = Asiento(
                zona_id=zona_id,
                fila=fila,
                numero=numero,
                estado=estado
            )
            db.add(asiento)
            asientos_creados.append(asiento)

    total_creados = len(asientos_creados)
    total_deshabilitados = len(deshabilitados_set)

    nueva_capacidad_zona = total_creados - total_deshabilitados
    zona.capacidad = nueva_capacidad_zona

    db.commit()
    
    # Refrescar todos los asientos para obtener sus IDs
    for asiento in asientos_creados:
        db.refresh(asiento)
    db.refresh(zona)
    _actualizar_capacidad_evento_incremental(db, zona.evento_id, nueva_capacidad_zona)
    return asientos_creados


def obtener_layout_zona(db: Session, zona_id: int) -> List[Asiento]:
    """Obtiene el layout base de una zona"""
    asientos = (
        db.query(Asiento)
        .filter(Asiento.zona_id == zona_id)
        .order_by(Asiento.fila, Asiento.numero)
        .all()
    )
    
    if not asientos:
        raise HTTPException(
            status_code=404,
            detail="No existe layout para esta zona"
        )
    
    return asientos


def actualizar_fila_layout(
    db: Session,
    zona_id: int,
    fila: int,
    asientos_deshabilitar: List[int] = None,
    columnas_agregar: int = 0
) -> List[Asiento]:
    """
    Actualiza una fila del layout base:
    - Deshabilita asientos específicos
    - Agrega nuevas columnas al final
    """
    # Obtener asientos de la fila
    asientos = (
        db.query(Asiento)
        .filter(Asiento.zona_id == zona_id, Asiento.fila == fila)
        .order_by(Asiento.numero)
        .all()
    )
    
    if not asientos:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron asientos en la fila {fila}"
        )
    
    # Deshabilitar asientos
    if asientos_deshabilitar:
        for asiento in asientos:
            if asiento.numero in asientos_deshabilitar:
                asiento.estado = "eliminado"
                db.add(asiento)
    
    # Agregar nuevas columnas
    if columnas_agregar > 0:
        max_numero = max(a.numero for a in asientos)
        nuevos_asientos = []
        
        for i in range(1, columnas_agregar + 1):
            nuevo_asiento = Asiento(
                zona_id=zona_id,
                fila=fila,
                numero=max_numero + i,
                estado="activo"
            )
            db.add(nuevo_asiento)
            nuevos_asientos.append(nuevo_asiento)
        
        asientos.extend(nuevos_asientos)
    
    db.commit()
    
    for asiento in asientos:
        db.refresh(asiento)
    
    return asientos


# ============================================================
# FUNCIONES PARA REPLICAR A FECHAS (Tabla: AsientoFecha)
# ============================================================

def replicar_layout_a_fechas(
    db: Session,
    zona_id: int,
    evento_fecha_ids: List[int]
) -> List[AsientoFecha]:
    """
    Replica el layout base de una zona a múltiples fechas del evento.
    Solo crea registros para asientos con estado 'activo'.
    """
    # Obtener el layout base
    asientos_base = (
        db.query(Asiento)
        .filter(Asiento.zona_id == zona_id)
        .all()
    )
    
    if not asientos_base:
        raise HTTPException(
            status_code=404,
            detail="No existe layout activo para esta zona"
        )
    
    # Verificar que todas las fechas existen
    fechas = db.query(EventoFecha).filter(EventoFecha.id.in_(evento_fecha_ids), EventoFecha.estado == "activo").all()
    if len(fechas) != len(evento_fecha_ids):
        raise HTTPException(
            status_code=404,
            detail="Algunas fechas no existen"
        )
    
    asientos_fecha_creados = []
    
    # Replicar para cada fecha
    for fecha in fechas:
        # Verificar si ya existe
        existe = (
            db.query(AsientoFecha)
            .join(Asiento)
            .filter(
                AsientoFecha.evento_fecha_id == fecha.id,
                Asiento.zona_id == zona_id
            )
            .first()
        )
        
        if existe:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existen asientos para la fecha {fecha.id} y zona {zona_id}"
            )
        
        capacidad_maxima = 0

        # Crear AsientoFecha para cada asiento base activo
        for asiento_base in asientos_base:
            estado = "libre" if asiento_base.estado == "activo" else "eliminado"

            if estado != "eliminado":
                capacidad_maxima += 1

            asiento_fecha = AsientoFecha(
                asiento_id=asiento_base.id,
                evento_fecha_id=fecha.id,
                estado=estado
            )
            db.add(asiento_fecha)
            asientos_fecha_creados.append(asiento_fecha)

        fecha.capacidad_maxima = capacidad_maxima
        fecha.aforo_disponible = capacidad_maxima
    
    db.commit()
    
    for af in asientos_fecha_creados:
        db.refresh(af)
    for fecha in fechas:
        db.refresh(fecha)
        
    return asientos_fecha_creados


def obtener_asientos_por_fecha(
    db: Session,
    evento_fecha_id: int,
    zona_id: int = None
) -> List[AsientoFecha]:
    """
    Obtiene todos los asientos disponibles para una fecha específica.
    Opcionalmente filtra por zona.
    """
    liberar_reservas_expiradas(db)
    query = (
        db.query(AsientoFecha)
        .join(Asiento)
        .filter(AsientoFecha.evento_fecha_id == evento_fecha_id)
    )
    
    if zona_id:
        query = query.filter(Asiento.zona_id == zona_id)
    
    asientos = query.order_by(Asiento.fila, Asiento.numero).all()
    
    return asientos


# ============================================================
# FUNCIONES PARA RESERVAS TEMPORALES
# ============================================================

def liberar_reservas_expiradas(db: Session):
    """Libera automáticamente las reservas que ya expiraron"""
    ahora = datetime.utcnow()
    
    asientos_expirados = (
        db.query(AsientoFecha)
        .filter(
            AsientoFecha.estado == "reservado",
            AsientoFecha.reserva_expira <= ahora
        )
        .all()
    )
    
    for af in asientos_expirados:
        af.estado = "libre"
        af.reservado_por = None
        af.reserva_expira = None
        db.add(af)
    
    if asientos_expirados:
        db.commit()
    
    return len(asientos_expirados)


def reservar_asientos_temporal(
    db: Session,
    usuario_id: int,
    asiento_fecha_ids: List[int],
    duracion_minutos: int = 15
) -> List[AsientoFecha]:
    """
    Reserva temporalmente un conjunto de asientos para un usuario.
    La reserva expira después de X minutos.
    """
    # Primero liberar reservas expiradas
    liberar_reservas_expiradas(db)
    
    # Obtener los asientos
    asientos_fecha = (
        db.query(AsientoFecha)
        .filter(AsientoFecha.id.in_(asiento_fecha_ids))
        .all()
    )
    
    if len(asientos_fecha) != len(asiento_fecha_ids):
        raise HTTPException(
            status_code=404,
            detail="Algunos asientos no existen"
        )
    
    # Verificar que todos estén libres
    for af in asientos_fecha:
        if af.estado != "libre":
            raise HTTPException(
                status_code=400,
                detail=f"El asiento en fila {af.asiento.fila}, número {af.asiento.numero} no está disponible"
            )
    
    # Reservar todos
    expiracion = datetime.utcnow() + timedelta(minutes=duracion_minutos)
    
    for af in asientos_fecha:
        af.estado = "reservado"
        af.reservado_por = usuario_id
        af.reserva_expira = expiracion
        db.add(af)
    
    db.commit()
    
    for af in asientos_fecha:
        db.refresh(af)
    
    return asientos_fecha

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def obtener_estadisticas_fecha(
    db: Session,
    evento_fecha_id: int,
    zona_id: int = None
) -> dict:
    """Obtiene estadísticas de disponibilidad para una fecha"""
    query = (
        db.query(AsientoFecha)
        .join(Asiento)
        .filter(AsientoFecha.evento_fecha_id == evento_fecha_id)
    )
    
    if zona_id:
        query = query.filter(Asiento.zona_id == zona_id)
    
    asientos = query.all()
    
    return {
        "total": len(asientos),
        "libres": sum(1 for a in asientos if a.estado == "libre"),
        "reservados": sum(1 for a in asientos if a.estado == "reservado"),
        "vendidos": sum(1 for a in asientos if a.estado == "vendido")
    }