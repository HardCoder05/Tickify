from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from users.models.Organizador import Organizador
from users.models.Usuario import Usuario
from database import get_db
from users.models.UserSchema import LoginRequest, TokenResponse
from users.services.AutenticacionServicio import create_access_token, verify_password


def login_user(login_request: LoginRequest, db: Session = Depends(get_db)):
    try:
        # Usar ORM en lugar de SP para compatibilidad y seguridad
        user = db.query(Usuario).filter(Usuario.correo == login_request.username).first()

        if not user:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        user_id = user.id
        correo = user.correo
        hashed_password = user.password_hash
        # Manejar Enum de rol
        rol = user.rol.value if hasattr(user.rol, 'value') else user.rol
        estado = user.estado

        try:
            if not verify_password(login_request.password, hashed_password):
                # Hash válido, pero contraseña incorrecta
                raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        except Exception as ve:
            # Si el hash es inválido/desconocido (p.ej., espacios o formato inesperado),
            # tratamos como credenciales incorrectas para no filtrar detalles internos.
            print(f"Verificación de contraseña falló por hash inválido/formato: {ve}")
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        organizador_id = None
        if rol == "ORGANIZADOR":
            organizador = db.query(Organizador).filter(Organizador.usuario_id == user_id).first()
            if organizador:
                organizador_id = organizador.id

        # Crear el token
        access_token = create_access_token(data={"sub": correo}, rol = rol)
        return TokenResponse(access_token=access_token,role=rol,user_id=user_id,organizador_id=organizador_id)
    except HTTPException:
        # Re-lanza HTTPException sin modificar (401, 404, etc.)
        raise
    except Exception as e:
        print(f"Error en login: {str(e)}")  
        raise HTTPException(status_code=500, detail="Error interno del servidor")