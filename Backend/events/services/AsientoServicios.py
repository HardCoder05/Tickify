from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from events.models.Asiento import Asiento


def validar_permisos_asientos(evento_id, auth_payload):
    if auth_payload["role"] not in ["ADMIN", "ORGANIZADOR"]:
        raise HTTPException(status_code=403, detail="Sin permisos.")

    if auth_payload["evento_id"] != evento_id and auth_payload["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="No puedes modificar asientos para este evento.")
