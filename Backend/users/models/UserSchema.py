from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, validator
import re


class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Optional[str] = None
    user_id: int
    organizador_id: Optional[int] = None 

class RegisterRequest(BaseModel):
    nombres: str = Field(..., min_length=1)
    apellidos: str = Field(..., min_length=1)
    correo: EmailStr
    password: str = Field(..., min_length=1)
    rol: str  # "USUARIO" o "ORGANIZADOR"
    ruc: str | None = None
    razon_social: str | None = None
    dni: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    correo_organizacional: str | None = None
    motivacion: str | None = None
    sector: str | None = None

    @validator('password')
    def validate_password(cls, v):
        regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(regex, v):
            raise ValueError('La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y carácter especial')
        return v

class UsuarioCreate(BaseModel):
    nombres: str
    apellidos: str
    correo: EmailStr
    password_hash: str
    rol: str  # "USUARIO" o "ORGANIZADOR"
    ruc: str | None = None
    razon_social: str | None = None
    dni: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    correo_organizacional: str | None = None
    motivacion: str | None = None
    sector: str | None = None


class UsuarioUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None #SOLO ADMIN PUEDE
    #PARA ORGANIZADOR
    ruc: Optional[str] = None
    razon_social: Optional[str] = None
    dni: Optional[str] = None
    telefono_organizacional: Optional[str] = None
    direccion: Optional[str] = None
    correo_organizacional: Optional[str] = None
    motivacion: Optional[str] = None
    sector: Optional[str] = None
    class Config:
        orm_mode = True 

class UsuarioRead(BaseModel):
    id: int
    nombres: str
    apellidos: str
    correo: EmailStr
    telefono: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    rol: str
    class Config:
        from_attributes = True

class OrganizadorRead(BaseModel):
    dni: str
    telefono: str
    razon_social: str
    direccion: str
    sector: str
    ruc: str
    correo_organizacional: EmailStr
    motivacion: str
    class Config:
        orm_mode = True 


class UsuarioEventoTicketRead(BaseModel):
    id: int
    nombres: str
    apellidos: str
    correo: EmailStr
    evento_fecha_id: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    tickets_count: int = 0
    cantidad_tickets: int = 0

    class Config:
        from_attributes = True

