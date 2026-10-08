from datetime import datetime, timedelta
from typing import Callable, List, Optional
import re
import logging
from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt, ExpiredSignatureError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from users.models.UserSchema import LoginRequest
from users.models.Usuario import Usuario, RolUsuario

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"
PASSWORD_REGEX = (
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)"
    r"(?=.*[^a-zA-Z0-9])"
    r".{8,}$"
)

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")
    return pwd_context.hash(pw_bytes[:72])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, rol: str, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    #Agregar rol
    to_encode.update({"rol": rol})
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user_payload(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se puede validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # token may be an HTTPAuthorizationCredentials object (with .credentials)
        # or sometimes a plain string; normalize and strip any leading 'Bearer '.
        raw_token = None
        try:
            raw_token = token.credentials
        except Exception:
            raw_token = token

        # Check if token is None before processing
        if raw_token is None:
            raise credentials_exception

        if isinstance(raw_token, str) and raw_token.lower().startswith("bearer "):
            raw_token = raw_token.split(None, 1)[1]

        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        rol: str = payload.get("rol")

        if username is None or rol is None:
            raise credentials_exception
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        # Log minimal debug info to help trace invalid tokens (no token full dump)
        try:
            masked = (raw_token[:10] + '...') if raw_token and isinstance(raw_token, str) else None
        except Exception:
            masked = None
        logging.error("JWTError decoding token (masked)=%s: %s", masked, e)
        # Ensure the error is visible in the app log and preserve the original HTTP behavior
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido",headers={"WWW-Authenticate": "Bearer"})


async def get_current_user(payload: dict = Depends(get_current_user_payload)):
    return payload.get("sub") 


# 💡 FUNCIÓN DE FÁBRICA PARA DEPENDENCIAS DE ROL
def role_required(roles_aceptados: List[str]) -> Callable:
    
    # 1. Función interna que realiza la verificación
    def role_checker(auth_payload: dict = Security(get_current_user_payload)): 
        
        user_role = auth_payload.get("rol")
        
        if user_role not in roles_aceptados:
            # Si el rol no está en la lista de permitidos, lanza 403 Forbidden
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado. Rol '{user_role}' no autorizado para este recurso."
            )
        
        # Si el rol es válido, devuelve el payload para que el controlador lo use
        return auth_payload
        
    return role_checker


def get_role(token: str | None = Depends(oauth2_scheme)) -> str:
    
    if not token:
        return "PUBLICO"
    try:
        raw_token = getattr(token, "credentials", token)
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("rol", "PUBLICO").upper()
    except JWTError:
        return "PUBLICO"
    
def validar_correo(correo: str):
    if not re.match(EMAIL_REGEX, correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de correo inválido."
        )

def validar_password(password: str):
    if not re.match(PASSWORD_REGEX, password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "La contraseña debe tener al menos 8 caracteres, "
                "incluyendo una letra mayúscula, una letra minúscula, "
                "un número y un símbolo especial."
            )
        )