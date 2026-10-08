from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from users.services.AutenticacionServicio import role_required, get_current_user_payload

# Importar esquemas
from events.models.AsientoEsquema import (
    AsientoLayoutCreate,
    AsientoRead,
    AsientoFechaCreate,
    AsientoFechaRead,
    AsientoFechaDetallado,
    ReservaTemporalCreate,
    ReservaTemporalRead,
    AsientoLayoutUpdate,
    AsientoFechaUpdate,
    FilaUpdate,
    LayoutZonaResponse,
    DisponibilidadFechaResponse
)

# Importar controlador
from events.controllers.AsientoController import (
    crear_layout_zona,
    obtener_layout_zona,
    actualizar_fila_layout,
    replicar_layout_a_fechas,
    obtener_asientos_por_fecha,
    liberar_reservas_expiradas,
    reservar_asientos_temporal,
    obtener_estadisticas_fecha
)

from events.models.Zona import Zona
from users.controllers.UsuarioController import get_usuario_by_email

router = APIRouter(
    prefix="/api/v1/asientos",
    tags=["asientos"]
)


# ============================================================
# RUTAS PARA LAYOUT BASE (Administrador/Organizador)
# ============================================================

@router.post("/layout", response_model=List[AsientoRead], status_code=status.HTTP_201_CREATED)
def crear_layout(
    data: AsientoLayoutCreate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Crea el layout base de asientos para una zona.
    Este layout se replicará después para cada fecha del evento.
    
    Ejemplo:
    ```json
    {
        "zona_id": 1,
        "filas": 10,
        "columnas": 15,
        "asientos_deshabilitados": [
            {"fila": 1, "numero": 1},
            {"fila": 1, "numero": 15}
        ]
    }
    ```
    """
    
    return crear_layout_zona(
        db=db,
        zona_id=data.zona_id,
        filas=data.filas,
        columnas=data.columnas,
        asientos_deshabilitados=data.asientos_deshabilitados or []
    )


@router.get("/layout/zona/{zona_id}", response_model=List[AsientoRead])
def obtener_layout(
    zona_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Obtiene el layout base de una zona específica.
    """
    return obtener_layout_zona(db, zona_id)


@router.put("/layout/zona/{zona_id}/fila/{fila}", response_model=List[AsientoRead])
def actualizar_fila(
    zona_id: int,
    fila: int,
    data: FilaUpdate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Actualiza una fila del layout base:
    - Deshabilita asientos específicos
    - Agrega nuevas columnas al final de la fila
    
    Ejemplo:
    ```json
    {
        "asientos_deshabilitar": [5, 6, 7],
        "columnas_agregar": 2
    }
    ```
    """
    return actualizar_fila_layout(
        db=db,
        zona_id=zona_id,
        fila=fila,
        asientos_deshabilitar=data.asientos_deshabilitar or [],
        columnas_agregar=data.columnas_agregar or 0
    )


# ============================================================
# RUTAS PARA REPLICAR LAYOUT A FECHAS
# ============================================================

@router.post("/replicar", response_model=List[AsientoFechaRead], status_code=status.HTTP_201_CREATED)
def replicar_layout(
    zona_id: int,
    data: AsientoFechaCreate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Replica el layout base de una zona a múltiples fechas del evento.
    
    Ejemplo:
    ```json
    {
        "evento_fecha_ids": [1, 2, 3, 4]
    }
    ```
    """
    return replicar_layout_a_fechas(
        db=db,
        zona_id=zona_id,
        evento_fecha_ids=data.evento_fecha_ids
    )


# ============================================================
# RUTAS PARA CONSULTAR DISPONIBILIDAD (Usuario)
# ============================================================

@router.get("/disponibilidad/fecha/{evento_fecha_id}", response_model=List[AsientoFechaDetallado])
def obtener_disponibilidad(
    evento_fecha_id: int,
    zona_id: Optional[int] = Query(None, description="Filtrar por zona específica"),
    db: Session = Depends(get_db)
):
    """
    Obtiene todos los asientos disponibles para una fecha específica.
    Opcionalmente puede filtrar por zona.
    
    Esta ruta es pública para que los usuarios puedan ver disponibilidad.
    """
    # Liberar reservas expiradas antes de mostrar disponibilidad
    liberar_reservas_expiradas(db)
    
    asientos = obtener_asientos_por_fecha(db, evento_fecha_id, zona_id)
    
    # Convertir a formato detallado
    resultado = []
    for af in asientos:
        resultado.append(AsientoFechaDetallado(
            id=af.id,
            fila=af.asiento.fila,
            numero=af.asiento.numero,
            zona_nombre=af.asiento.zona.nombre,
            evento_fecha_id=af.evento_fecha_id,
            estado=af.estado,
            reservado_por=af.reservado_por,
            reserva_expira=af.reserva_expira
        ))
    
    return resultado


@router.get("/estadisticas/fecha/{evento_fecha_id}")
def obtener_estadisticas(
    evento_fecha_id: int,
    zona_id: Optional[int] = Query(None, description="Filtrar por zona específica"),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de disponibilidad para una fecha.
    """
    return obtener_estadisticas_fecha(db, evento_fecha_id, zona_id)


# ============================================================
# RUTAS PARA RESERVAS TEMPORALES (Usuario)
# ============================================================

@router.post("/reserva/temporal", response_model=List[AsientoFechaRead])
def crear_reserva_temporal(
    data: ReservaTemporalCreate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload)
):
    """
    Reserva temporalmente un conjunto de asientos.
    La reserva expira después de X minutos (por defecto 15).
    
    Ejemplo:
    ```json
    {
        "asiento_fecha_ids": [101, 102, 103, 104],
        "duracion_minutos": 15
    }
    ```
    """
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    
    return reservar_asientos_temporal(
        db=db,
        usuario_id=current_user.id,
        asiento_fecha_ids=data.asiento_fecha_ids,
        duracion_minutos=data.duracion_minutos
    )


@router.post("/reserva/liberar")
def liberar_reservas(
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN"]))
):
    """
    Libera manualmente todas las reservas expiradas.
    (Normalmente esto se ejecuta automáticamente)
    """
    cantidad = liberar_reservas_expiradas(db)
    return {"mensaje": f"Se liberaron {cantidad} reservas expiradas"}


# ============================================================
# RUTAS PARA ACTUALIZACIÓN MANUAL (Administrador)
# ============================================================

@router.put("/fecha/{asiento_fecha_id}", response_model=AsientoFechaRead)
def actualizar_asiento_fecha(
    asiento_fecha_id: int,
    data: AsientoFechaUpdate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Actualiza manualmente el estado de un asiento en una fecha específica.
    """
    from events.models.AsientoFecha import AsientoFecha
    
    af = db.query(AsientoFecha).filter(AsientoFecha.id == asiento_fecha_id).first()
    
    if not af:
        raise HTTPException(status_code=404, detail="AsientoFecha no encontrado")
    
    if data.estado:
        af.estado = data.estado
        
        # Si se marca como libre, limpiar reserva
        if data.estado == "libre":
            af.reservado_por = None
            af.reserva_expira = None
    
    db.commit()
    db.refresh(af)
    
    return af


@router.delete("/fecha/{asiento_fecha_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_asiento_fecha(
    asiento_fecha_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    """
    Elimina (deshabilita) un asiento para una fecha específica.
    Solo se puede eliminar si no está vendido.
    """
    from events.models.AsientoFecha import AsientoFecha
    
    af = db.query(AsientoFecha).filter(AsientoFecha.id == asiento_fecha_id).first()
    
    if not af:
        raise HTTPException(status_code=404, detail="AsientoFecha no encontrado")
    
    if af.estado == "vendido":
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un asiento vendido"
        )
    
    # En lugar de eliminar, marcar el asiento base como eliminado
    af.asiento.estado = "eliminado"
    db.commit()
    
    return None