from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from users.services.AutenticacionServicio import (
    get_current_user_payload,  # Para obtener el rol y el sub(correo)
    get_role,
)
from users.services.AutenticacionServicio import (
    role_required,  # Para la verificación simple de roles
)

from events.controllers.EventoController import obtener_no_leidas, marcar_como_leida
from users.controllers.UsuarioController import get_usuario_by_email

router = APIRouter(prefix="/api/v1/notificaciones", tags=["notificaciones"])

@router.get("/{usuario_id}/no-leidas")
def listar_no_leidas(
    usuario_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload)
):
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver estas notificaciones"
        )
    return obtener_no_leidas(db, usuario_id, limit)

@router.patch("/{notificacion_id}/marcar-leida")
def marcar_notificacion(
    notificacion_id: int,
    usuario_id: int = Query(...),
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload),
):
    current_user = get_usuario_by_email(db, auth_payload.get("sub"))

    if current_user.rol.value != 'ADMIN' and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para marcar esta notificación"
        )

    ok = marcar_como_leida(db, usuario_id, notificacion_id)

    if not ok:
        raise HTTPException(
            status_code=404,
            detail="Notificación no encontrada o ya estaba leída."
        )

    return {"message": "Notificación marcada como leída"}



