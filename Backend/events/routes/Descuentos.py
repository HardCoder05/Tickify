
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from datetime import datetime
from events.models.EventoEsquema import DescuentoCreate, DescuentoRead, DescuentoUpdate 
from decimal import Decimal
from events.models.Descuento import TipoDescuento
from events.services.EventoServicios import validar_descuentos_permisos 
from users.services.AutenticacionServicio import get_current_user_payload
from events.controllers.EventoController import (
    create_descuento,
    get_descuentos_by_evento,
    get_descuento_by_id,
    update_descuento,
    delete_descuento,
    get_descuento_by_codigo,
)
from users.services.AutenticacionServicio import role_required
from events.services.DescuentoServicios import aplicar_descuento_a_compra
from decimal import Decimal
from events.models.Descuento import TipoDescuento

router = APIRouter(
    prefix="/api/v1/descuentos",
    tags=["descuentos"]
)


@router.post("/", response_model=DescuentoRead, status_code=status.HTTP_201_CREATED)
def crear_nuevo_descuento(
    descuento_data: DescuentoCreate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    # La validación de permisos usa el evento_id del body
    validar_descuentos_permisos(db, descuento_data.evento_id, auth_payload,descuento_data) 
    
    if descuento_data.fecha_inicio >= descuento_data.fecha_fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio debe ser anterior a la fecha de fin.")

    try:
        return create_descuento(db, descuento_data)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(ve) 
        )
    
@router.put("/{descuento_id}", response_model=DescuentoRead)
def actualizar_descuento(
    descuento_id: int,
    descuento_data: DescuentoUpdate, 
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    descuento = get_descuento_by_id(db, descuento_id)
    if not descuento:
        raise HTTPException(status_code=404, detail="Descuento no encontrado.")
    
    update_data = descuento_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(descuento, field, value)

    validar_descuentos_permisos(db, descuento.evento_id, auth_payload, descuento)

    db.commit()
    db.refresh(descuento)

    return descuento
    

@router.get("/{descuento_id}", response_model=DescuentoRead)
def obtener_descuento(
    descuento_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    descuento = get_descuento_by_id(db, descuento_id)
    if not descuento:
        raise HTTPException(status_code=404, detail="Descuento no encontrado.")

    validar_descuentos_permisos(db, descuento.evento_id, auth_payload)
    
    return descuento

@router.delete("/{descuento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_descuento(
    descuento_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    descuento = get_descuento_by_id(db, descuento_id)
    if not descuento:
        raise HTTPException(status_code=404, detail="Descuento no encontrado.")

    return delete_descuento(db, descuento)

@router.get("/evento/{evento_id}", response_model=List[DescuentoRead])
def obtener_descuentos_por_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
):
    validar_descuentos_permisos(db, evento_id, auth_payload,only_permisos=True)
    return get_descuentos_by_evento(db, evento_id)

@router.put("/evento/{evento_id}")
def aplicar_descuento_test(
    precio: float,
    evento_id: int,
    codigo_descuento: str,
    cantidad: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload)
):
    descuento = get_descuento_by_codigo(db, codigo_descuento)

    if not descuento:
        raise HTTPException(status_code=404, detail="Descuento no encontrado")
    if descuento.evento_id != evento_id:
        raise HTTPException(status_code=400, detail="El descuento no aplica para este evento")
    if descuento.estado != "activo":
        raise HTTPException(status_code=400, detail="El descuento está inactivo")

    if descuento.usos_actuales + cantidad > descuento.usos_maximos:
        raise HTTPException(
            status_code=400,
            detail="Se sobrepasan los usos máximos del descuento"
        )
    
    now = datetime.utcnow().date()

    if now < descuento.fecha_inicio or now > descuento.fecha_fin:
        raise HTTPException(status_code=400, detail="El código de descuento está fuera del período válido")
    precio = Decimal(str(precio))  
    if descuento.tipo_descuento == TipoDescuento.porcentaje:
        nuevo_precio = precio - (precio * descuento.valor / 100)
    elif descuento.tipo_descuento == TipoDescuento.efectivo:
        nuevo_precio = precio - descuento.valor

    if nuevo_precio < 0:
        nuevo_precio = 0

    return {"nuevo_precio": nuevo_precio}

