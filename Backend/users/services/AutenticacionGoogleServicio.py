import os
import logging
from urllib.parse import urlencode, quote

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from users.models.Usuario import Usuario
from users.services.AutenticacionServicio import create_access_token

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"

# -------------------------------
# Paso 1: Login
# -------------------------------
async def login_google(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_url = os.getenv("GOOGLE_REDIRECT_URL")
   
    # Seguridad extra
    if not client_id or not redirect_url:
        raise HTTPException(status_code=500, detail="Google configuration missing at runtime.")
   
    query_params = {
        "client_id": client_id,
        "redirect_uri": redirect_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(query_params)}"
    return RedirectResponse(url)

# -------------------------------
# Paso 2: Callback
# -------------------------------
async def auth_google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_url = os.getenv("GOOGLE_REDIRECT_URL")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        # Seguridad extra
        if not all([client_id, client_secret, redirect_url]):
            logging.error(
                "Google OAuth configuration missing. CLIENT_ID=%s CLIENT_SECRET_SET=%s REDIRECT_URL=%s",
                bool(client_id), bool(client_secret), redirect_url,
            )
            raise HTTPException(status_code=500, detail="Google configuration missing in callback.")

        # Manejar caso de error (usuario canceló o hubo un error de Google)
        error = request.query_params.get("error")
        if error:
            logging.info("Google OAuth cancelled or error: %s", error)
            # Redirigir al login del frontend (RedirectResponse ya importado arriba)
            return RedirectResponse(url=f"{frontend_url}/login?error={error}")

        code = request.query_params.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code not found")

        # Intercambiar el code por access token
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_url,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            token_response = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)

            if token_response.status_code != 200:
                # Esto capturará errores como "invalid_grant" (código inválido/expirado)
                body = await token_response.aread()
                logging.error("Error al obtener token desde Google: status=%s body=%s", token_response.status_code, body)
                raise HTTPException(status_code=400, detail="Failed to retrieve access token from Google")

            # httpx.Response.json() is synchronous and returns a dict
            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(status_code=400, detail="Failed to retrieve access token")

            # Obtener información del usuario
            headers = {"Authorization": f"Bearer {access_token}"}
            userinfo_response = await client.get(GOOGLE_USERINFO_ENDPOINT, headers=headers)

            # ✅ VALIDAR status_code antes de parsear el JSON
            if userinfo_response.status_code != 200:
                body = await userinfo_response.aread()
                logging.error("Error al obtener userinfo: status=%s body=%s", userinfo_response.status_code, body)
                raise HTTPException(status_code=400, detail="Failed to retrieve user info from Google")

            # httpx.Response.json() is synchronous and returns a dict
            userinfo = userinfo_response.json()

        correo = userinfo.get("email")
        nombres = userinfo.get("name", "")
        picture = userinfo.get("picture", "")

        # Buscar usuario en BD
        user = db.query(Usuario).filter(Usuario.correo == correo).first()

        if not user:
            from datetime import datetime

            from users.models.Usuario import RolUsuario

            user = Usuario(
                nombres=nombres,
                apellidos="",
                correo=correo,
                telefono="",
                password_hash="",
                rol=RolUsuario.CLIENTE,  # Rol por defecto
                fecha_registro=datetime.now(),
                fecha_creacion=datetime.now(),
                fecha_actualizacion=datetime.now(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if user.estado == "eliminado":   
                raise HTTPException(
                    status_code=403,
                    detail="Tu cuenta está desactivada. Comunícate con el soporte."
                )

        # Crear JWT con el rol del usuario
        access_token_jwt = create_access_token(data={"sub": correo}, rol=user.rol.value)

        # Preferir redirigir al frontend con el token en el fragment (#) para que no sea renderizado
        # directamente por el backend como JSON (evita que el token aparezca en una página HTML).
        frontend_url = os.getenv("FRONTEND_URL")

        # Si el cliente pide JSON explícitamente (por ejemplo tests/API clients), devolver JSON.
        accept = request.headers.get("accept", "")
        if "application/json" in accept or not frontend_url:
            return JSONResponse({"access_token": access_token_jwt, "token_type": "bearer"})

        # Construir URL con fragmento (no enviado al servidor) para que el frontend lo reciba
        # y lo maneje en el cliente. Escapar el token por seguridad en la URL.
        token_escaped = quote(access_token_jwt, safe='')
        redirect_to = f"{frontend_url}/login#access_token={token_escaped}&token_type=bearer"

        # Devolver RedirectResponse hacia el frontend. El frontend debe leer el fragmento
        # y guardar el token en memoria/localStorage según su diseño.
        return RedirectResponse(redirect_to)

    except HTTPException:
        # Re-lanzar HTTPException sin alterar el status
        raise
    except Exception as e:
        # Log completo para diagnóstico y devolver 500 genérico
        logging.exception("Error inesperado en auth_google_callback: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error during Google OAuth callback")