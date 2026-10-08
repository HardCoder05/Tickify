from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from users.models.Usuario import Usuario

get_all_router = APIRouter(prefix="/users", tags=["users"])

@get_all_router.get("/all")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(Usuario).all()
    return [
        {
            "id": user.id,
            "nombres": user.nombres,
            "apellidos": user.apellidos,
            "correo": user.correo,
            "telefono": user.telefono,
            "password_hash": user.password_hash,
            "fecha_registro": user.fecha_registro.strftime("%Y-%m-%d %H:%M:%S") if user.fecha_registro else None,
            "fecha_creacion": user.fecha_creacion.strftime("%Y-%m-%d %H:%M:%S") if user.fecha_creacion else None,
            "fecha_actualizacion": user.fecha_actualizacion.strftime("%Y-%m-%d %H:%M:%S") if user.fecha_actualizacion else None
        }
        for user in users
    ]