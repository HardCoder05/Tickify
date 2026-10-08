from datetime import datetime
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from compras.controllers.CompraController import (
    create_compra_db,
    get_all_compras,
    get_compra_by_codigo,
    get_compra_by_id,
    get_compras_by_user_id,
    update_compra_estado,
)
from compras.models.Compra import Compra
from compras.models.CompraSchema import CompraCreate, CompraRead, CompraUpdate, CompraWithTickets
from compras.services.compra_service import realizar_compra
from database import get_db
from tickets.models.Ticket import Ticket
from users.controllers.UsuarioController import get_usuario_by_email, get_usuario_by_id
from users.models.Usuario import Usuario
from users.services.AutenticacionServicio import get_current_user_payload, role_required
# Router con prefijo
router = APIRouter(
    prefix="/api/v1/compras",
    tags=["compras"]
)

# Crear una nueva compra: CLIENTE O ADMIN
@router.post("/", response_model=CompraRead, status_code=status.HTTP_201_CREATED)
def crear_compra(compra: CompraCreate, db: Session = Depends(get_db),
                 auth_payload: dict= Depends(get_current_user_payload)):
    """Crear una nueva compra"""

    current_user = get_usuario_by_email(db, auth_payload.get("sub"))
    
    # Verificar que el usuario autenticado existe
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Usuario no encontrado o no autenticado."
        )
    
    if current_user.id != compra.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Solo puedes crear compras a tu nombre."
        )
    
    # Validar que hay al menos un ticket
    if not compra.tickets or len(compra.tickets) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes incluir al menos un ticket en la compra"
        )
    
    if len(compra.tickets) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Solo puedes comprar como máximo 10 tickets"
        )

    # Verificar que el usuario existe
    usuario = get_usuario_by_id(db,compra.usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return create_compra_db(db,compra)

# Obtener todas las compras: SOLO ADMIN
@router.get("/", response_model=List[CompraRead])
def obtener_compras(
    usuario_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN"]))
):
    """Obtener todas las compras con filtros opcionales"""
    return get_all_compras(db,usuario_id,estado)

# Obtener compras de un usuario específico: ADMIN O CLIENTE DUEÑO
@router.get("/usuario/{usuario_id}", response_model=List[CompraWithTickets])
def obtener_compras_usuario(usuario_id: int, db: Session = Depends(get_db),
                            auth_payload: dict = Depends(get_current_user_payload)):
    """Obtener todas las compras de un usuario específico con sus tickets"""
    #Obtener usuario autenticado
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    #Lógica de propiedad
    if current_user.rol.value != 'ADMIN' and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver las compras de otros usuarios."
        )
    
    # Verificar que el usuario existe
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return get_compras_by_user_id(db,usuario_id)

# Obtener una compra específica por ID: ADMIN O CLIENTE DUEÑO
@router.get("/{compra_id}", response_model=CompraWithTickets)
def obtener_compra(compra_id: int, db: Session = Depends(get_db),
                   auth_payload: dict = Depends(get_current_user_payload)):
    """Obtener una compra específica con sus tickets"""
    
    compra = get_compra_by_id(db,compra_id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    #Obtener usuario autenticado
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != compra.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver esta compra."
        )
    
    return compra

# Actualizar estado de una compra: SOLO ADMIN
@router.put("/{compra_id}/estado", response_model=CompraRead)
def actualizar_estado_compra(compra_id: int, nuevo_estado: str, db: Session = Depends(get_db),
                             auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Actualizar el estado de una compra"""
    
    estados_validos = ['pendiente', 'pagada', 'cancelada']
    if nuevo_estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"El estado debe ser uno de: {', '.join(estados_validos)}"
        )
    
    compra = update_compra_estado(db, compra_id, nuevo_estado)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    return compra

# Obtener compras por código de confirmación: SOLO ADMIN O DUEÑO
@router.get("/codigo/{codigo_confirmacion}", response_model=CompraWithTickets)
def obtener_compra_por_codigo(codigo_confirmacion: str, db: Session = Depends(get_db),
                              auth_payload: dict = Depends(get_current_user_payload)):
    """Obtener una compra por su código de confirmación"""
    
    compra = get_compra_by_codigo(db, codigo_confirmacion)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != compra.usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver esta compra."
        )
    
    return compra
