from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from users.controllers.LoginController import login_user
from users.controllers.RegisterController import register_user
from users.models.UserSchema import LoginRequest, RegisterRequest, TokenResponse
from users.services.AutenticacionGoogleServicio import (
    auth_google_callback,
    login_google,
)
from users.services.AutenticacionServicio import get_current_user_payload, get_role

login_router = APIRouter(tags=["login"])

@login_router.post("/login", response_model=TokenResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    return login_user(login_request, db)

@login_router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    """
    Endpoint que devuelve la información del usuario actual.
    Si el usuario es ORGANIZADOR, también devuelve el organizador_id.
    """
    # Crear copia del payload del usuario para modificarlo
    user_data = dict(current_user)
    
    # Si el usuario es organizador, buscar su organizador_id
    if user_data.get("rol") == "ORGANIZADOR":
        from users.models.Organizador import Organizador
        from users.models.Usuario import Usuario
        
        # Obtener el correo del usuario desde el token
        correo = user_data.get("sub")
        
        if correo:
            # Buscar el usuario para obtener su ID
            usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
            
            if usuario:
                # Buscar el organizador asociado a este usuario
                organizador = db.query(Organizador).filter(
                    Organizador.usuario_id == usuario.id
                ).first()
                
                if organizador:
                    # Agregar organizador_id directamente al objeto de usuario
                    user_data["organizador_id"] = organizador.id
                    user_data["razon_social"] = organizador.razon_social
    
    # Devolver en formato compatible con tests y frontend anterior
    # El frontend actualizado puede acceder tanto a response.usuario como directamente a response
    return {"usuario": user_data, **user_data}

@login_router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    try:
        print(f"🔵 Intento de registro - Correo: {request.correo}, Rol: {request.rol}")
        user = register_user(db, request)
        print(f"✅ Usuario registrado exitosamente: {user.correo}")
        return {"message": f"Usuario {user.correo} registrado correctamente"}
    except HTTPException as e:
        print(f"❌ Error HTTP en registro: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        print(f"❌ Error inesperado en registro: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar usuario: {str(e)}"
        )

@login_router.get("/login_google")
async def login_google_route(request: Request):
    return await login_google(request)

@login_router.get("/auth_google_callback", name="auth_google_callback_route")
async def auth_google_callback_route(request: Request, db: Session = Depends(get_db)):
    return await auth_google_callback(request, db)

@login_router.get("/perfil")
async def obtener_perfil(rol: str = Depends(get_role)):
    if rol == "PUBLICO":
        return {"mensaje": "Acceso público limitado"}
    if(rol == "ORGANIZADOR"):
        print("ENTRA")
        print("ENTRA")
        print("ENTRA")
        print("ENTRA")
        print("ENTRA")
        
    return {"mensaje": f"Acceso permitido para el rol {rol}"}