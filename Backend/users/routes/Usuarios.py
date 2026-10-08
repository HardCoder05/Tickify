from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from fastapi import Query
from database import get_db
from events.controllers.EventoController import get_evento_by_id
from users.controllers.UsuarioController import (
    create_usuario,
    delete_usuario,
    get_all_usuarios,
    get_all_usuarios_filter,
    get_usuario_by_email,
    get_usuario_by_id,
    get_usuario_organizador_by_evento_id,
    get_usuarios_by_evento_id,
    get_usuario_tickets_detalle,
    update_usuario,
    get_all_usuarios_organizador,
    get_organizador_by_usuario,
    get_all_usuarios_organizador_solicitud,
    get_organizador_by_id,
    get_solicitud_by_usuario_id,
    responder_solicitud,
    reactivar_usuario,
    change_password,
)
from users.models.UserSchema import UsuarioCreate, UsuarioRead, UsuarioUpdate, OrganizadorRead, UsuarioEventoTicketRead
from users.models.Usuario import RolUsuario, Usuario
from users.models.Organizador import Organizador
from users.services.AutenticacionServicio import (
    get_current_user,
    get_current_user_payload,
    hash_password,
    role_required,
    validar_password,
)

# Router con prefijo
router = APIRouter(
    prefix="/api/v1/usuarios",
    tags=["usuarios"]
)

# Crear usuario (POST)
@router.post("/", response_model=UsuarioRead)
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db),auth_payload: dict = Depends(role_required(["ADMIN"]))):
    # Solo validar RUC duplicado si es ORGANIZADOR y tiene RUC
    if usuario.rol.upper() == "ORGANIZADOR" and usuario.ruc:
        existing = db.query(Organizador).filter_by(ruc=usuario.ruc).first()
        if existing:
            raise HTTPException(status_code=400, detail="El RUC ya está registrado")
    validar_password(usuario.password_hash)
    usuario.password_hash = hash_password(usuario.password_hash)
    return create_usuario(db,usuario)


# Obtener todos los usuarios y se puede filtrar por nombre y rol(GET)
@router.get("/", response_model=List[UsuarioRead])
def obtener_usuarios(nombre: Optional[str] = None, rol: Optional[RolUsuario] = None, inactivos: bool = False ,skip: int = 0, limit: int = 100, db: Session = Depends(get_db), 
                     auth_payload: dict = Depends(role_required(["ADMIN"]))):
    return get_all_usuarios_filter(db,nombre,rol, skip=skip, limit=limit, inactivos=inactivos)

# Obtener todos los usuarios organizadores (GET)
@router.get("/organizadores", response_model=List[UsuarioRead])
def obtener_usuarios_organizadores(db: Session = Depends(get_db), 
                     auth_payload: dict = Depends(role_required(["ADMIN"]))):
    return get_all_usuarios_organizador(db)

@router.get("/solicitudes", response_model=List[UsuarioRead])
def obtener_solicitudes_organizador(db: Session = Depends(get_db), 
                     auth_payload: dict = Depends(role_required(["ADMIN"]))):
    return get_all_usuarios_organizador_solicitud(db)

@router.get("/solicitudes/{usuario_id}", response_model=OrganizadorRead)
def obtener_solicitud_by_usuario_id(usuario_id: int ,db: Session = Depends(get_db), 
                     auth_payload: dict = Depends(role_required(["ADMIN"]))):
    organizador = get_solicitud_by_usuario_id(db,usuario_id)
    if organizador is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró solicitud para este usuario."
        )
    return organizador

@router.put("/solicitudes/{usuario_id}", response_model=OrganizadorRead)
def responder_solicitud_by_usuario_id(usuario_id: int, respuesta: str = Query(..., pattern="^(activo|eliminado)$"), 
                                      db: Session = Depends(get_db), auth_payload: dict = Depends(role_required(["ADMIN"]))):
    organizador = get_solicitud_by_usuario_id(db,usuario_id)
    if organizador is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró solicitud para este usuario."
        )
    return responder_solicitud(db,organizador,respuesta)

@router.get("/organizadores/{id_busqueda}", response_model=OrganizadorRead)
def obtener_usuario_organizador(
    id_busqueda: int, 
    buscar_por_organizador_id: Optional[bool] = False, 
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN", "ORGANIZADOR"]))
): 
    if buscar_por_organizador_id:
        organizador_encontrado = get_organizador_by_id(db, id_busqueda)
    else:
        organizador_encontrado = get_organizador_by_usuario(db, id_busqueda)

    if not organizador_encontrado:
        raise HTTPException(status_code=404, detail="Usuario organizador no encontrado")
    
    current_user_obj = get_usuario_by_email(db, auth_payload.get("sub"))
    
    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    if current_user_obj.rol.value != 'ADMIN':
        organizador_actual = get_organizador_by_usuario(db, current_user_obj.id)
        
        if not organizador_actual or organizador_encontrado.id != organizador_actual.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permiso para ver este organizador"
            )
            
    return organizador_encontrado 

# Obtener un usuario por ID (GET)
@router.get("/{usuario_id}", response_model=UsuarioRead)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db),
                    auth_payload: dict = Depends(get_current_user_payload)): #Requiere autenticación
    usuario = get_usuario_by_id(db,usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    current_user_obj = get_usuario_by_email(db,auth_payload.get("sub"))
    # Asegurar que el usuario actual exista en la base de datos
    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    if current_user_obj.rol != RolUsuario.ADMIN and current_user_obj.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver este perfil."
        )
    return usuario

# Obtener un usuario por correo (GET)
@router.get("/email/{correo}", response_model=UsuarioRead)
def obtener_usuario_por_email(correo: str, db: Session = Depends(get_db)):
    usuario = get_usuario_by_email(db, correo)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

# Obtener un usuario por Evento ID (GET) - SOLO ADMIN Y ORGANIZADOR
@router.get("/eventos/{evento_id}", response_model=List[UsuarioEventoTicketRead])
def obtener_usuarios_by_evento_id(
    evento_id: int, 
    fecha_evento_id: int | None = Query(None, description="ID de la fecha específica del evento (opcional)"), 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(role_required(["ADMIN","ORGANIZADOR"]))
): 
    evento = get_evento_by_id(db, evento_id, auth_payload.get("rol"))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    usuario_organizador = get_usuario_organizador_by_evento_id(db,evento_id)
    current_user_obj = get_usuario_by_email(db, auth_payload.get("sub"))

    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    if current_user_obj.rol != RolUsuario.ADMIN and current_user_obj.id != usuario_organizador.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="El organizador solo tiene permisos para sus propios eventos"
        )
    return get_usuarios_by_evento_id(db,evento_id,fecha_evento_id)

# Actualizar un usuario por ID (PUT)
@router.put("/{usuario_id}", response_model=UsuarioRead)
def actualizar_usuario(usuario_id: int, usuario_data: UsuarioUpdate, db: Session = Depends(get_db),
                       auth_payload: dict = Depends(get_current_user_payload)):
    usuario = get_usuario_by_id(db,usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    current_user_obj = get_usuario_by_email(db,auth_payload.get("sub"))
    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado")

    #Lógica de acceso: solo puede actualizar el usuario ya sea el admin o el mismo usuario
    if current_user_obj.rol != RolUsuario.ADMIN and current_user_obj.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para ver este perfil."
        )
    
    return update_usuario(db, usuario, usuario_data, current_user_obj)

# Eliminar un usuario por ID (DELETE) SOLO ADMIN
@router.delete("/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db),auth_payload: dict = Depends(role_required(["ADMIN"]))):
    usuario = get_usuario_by_id(db,usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    delete_usuario(db, usuario_id)
    return {"detail": "Usuario eliminado"}

# Reactivar Usuario (PUT) - SOLO ADMIN
@router.put("/{usuario_id}/reactivar", response_model=UsuarioRead)
def reactivar_usuario_eliminado(
    usuario_id: int,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(role_required(["ADMIN"]))
):
    """
    Restaura el estado de un usuario (ID) a 'activo'. Solo para ADMIN.
    """
    usuario_a_reactivar = get_usuario_by_id(db, usuario_id,incluir_inactivos=True)

    if not usuario_a_reactivar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {usuario_id} no encontrado."
        )

    if usuario_a_reactivar.estado == 'activo':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario ya está activo.")

    try:
        usuario_reactivado = reactivar_usuario(db, usuario_a_reactivar)
        return usuario_reactivado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al reactivar usuario: {str(e)}"
        )
    
@router.patch("/{usuario_id}/password", response_model=UsuarioRead)
def cambiar_contraseña(
    usuario_id: int,
    password: str,
    db: Session = Depends(get_db),
    # Solo requiere autenticación general, la lógica de acceso está en el cuerpo
    auth_payload: dict = Depends(get_current_user_payload) 
):
    """
    Actualiza la contraseña (hash) de un usuario por su ID.
    Acceso permitido al propio usuario o a un ADMIN.
    """
    usuario_a_modificar = get_usuario_by_id(db, usuario_id)
    current_user_obj = get_usuario_by_email(db, auth_payload.get("sub"))

    if not usuario_a_modificar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no autenticado.")

    if current_user_obj.rol != RolUsuario.ADMIN and current_user_obj.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para cambiar la contraseña de este usuario."
        )

    try:
        new_hash = hash_password(password) 
        usuario_actualizado = change_password(db, usuario_a_modificar, new_hash)
        return usuario_actualizado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar la contraseña: {str(e)}"
        )
    


