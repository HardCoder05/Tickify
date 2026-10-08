def test_crear_usuario(client, track_test_email, auth_headers_admin):
    """Prueba la creación de un nuevo usuario"""
    from datetime import datetime
    email = track_test_email(f"test_crear_usuario_{datetime.now().timestamp()}@test.com")
    
    nuevo_usuario = {
        "nombres": "Juan",
        "apellidos": "Pérez",
        "correo": email,
        "telefono": "987654321",
        "password_hash": "TestPassword123!",
        "rol": "CLIENTE"
    }
    response = client.post("/api/v1/usuarios/", json=nuevo_usuario, headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["nombres"] == nuevo_usuario["nombres"]
    assert data["apellidos"] == nuevo_usuario["apellidos"]
    assert data["correo"] == nuevo_usuario["correo"]
    assert data["telefono"] == nuevo_usuario["telefono"]
    assert "id" in data
    assert "fecha_registro" in data
    assert "fecha_creacion" in data
    assert "fecha_actualizacion" in data


def test_get_all_users(client, auth_headers_admin):
    """Prueba la obtención de todos los usuarios"""
    response = client.get("/api/v1/usuarios/", headers=auth_headers_admin)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_obtener_usuario_por_id(client, track_test_email, auth_headers_admin):
    """Prueba la obtención de un usuario específico por ID"""
    from datetime import datetime
    email = track_test_email(f"test_obtener_usuario_{datetime.now().timestamp()}@test.com")
    
    # Primero crear un usuario
    nuevo_usuario = {
        "nombres": "María",
        "apellidos": "González",
        "correo": email,
        "telefono": "912345678",
        "password_hash": "TestPassword456!",
        "rol": "CLIENTE"
    }
    response_create = client.post("/api/v1/usuarios/", json=nuevo_usuario, headers=auth_headers_admin)
    assert response_create.status_code == 200
    usuario_id = response_create.json()["id"]
    
    # Obtener el usuario por ID
    response = client.get(f"/api/v1/usuarios/{usuario_id}", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == usuario_id
    assert data["nombres"] == nuevo_usuario["nombres"]
    assert data["correo"] == nuevo_usuario["correo"]


def test_obtener_usuario_no_existente(client, auth_headers_admin):
    """Prueba la obtención de un usuario que no existe"""
    response = client.get("/api/v1/usuarios/99999", headers=auth_headers_admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"


def test_actualizar_usuario(client, track_test_email, auth_headers_admin):
    """Prueba la actualización de un usuario"""
    from datetime import datetime
    email = track_test_email(f"test_actualizar_usuario_{datetime.now().timestamp()}@test.com")
    
    # Primero crear un usuario
    nuevo_usuario = {
        "nombres": "Carlos",
        "apellidos": "Rodríguez",
        "correo": email,
        "telefono": "923456789",
        "password_hash": "TestPassword789!",
        "rol": "CLIENTE"
    }
    response_create = client.post("/api/v1/usuarios/", json=nuevo_usuario, headers=auth_headers_admin)
    assert response_create.status_code == 200
    usuario_id = response_create.json()["id"]
    
    # Actualizar el usuario
    datos_actualizacion = {
        "nombres": "Carlos Alberto",
        "telefono": "999888777"
    }
    response = client.put(f"/api/v1/usuarios/{usuario_id}", json=datos_actualizacion, headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["nombres"] == datos_actualizacion["nombres"]
    assert data["telefono"] == datos_actualizacion["telefono"]
    assert data["apellidos"] == nuevo_usuario["apellidos"]  # No debe cambiar
    assert data["correo"] == nuevo_usuario["correo"]  # No debe cambiar


def test_actualizar_usuario_no_existente(client, auth_headers_admin):
    """Prueba la actualización de un usuario que no existe"""
    datos_actualizacion = {
        "nombres": "Usuario Inexistente"
    }
    response = client.put("/api/v1/usuarios/99999", json=datos_actualizacion, headers=auth_headers_admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"


def test_eliminar_usuario(client, track_test_email, auth_headers_admin):
    """Prueba la eliminación de un usuario"""
    from datetime import datetime
    email = track_test_email(f"test_eliminar_usuario_{datetime.now().timestamp()}@test.com")
    
    # Primero crear un usuario
    nuevo_usuario = {
        "nombres": "Ana",
        "apellidos": "Martínez",
        "correo": email,
        "telefono": "934567890",
        "password_hash": "TestPasswordAbc1!",
        "rol": "CLIENTE"
    }
    response_create = client.post("/api/v1/usuarios/", json=nuevo_usuario, headers=auth_headers_admin)
    assert response_create.status_code == 200
    usuario_id = response_create.json()["id"]
    
    # Eliminar el usuario
    response = client.delete(f"/api/v1/usuarios/{usuario_id}", headers=auth_headers_admin)
    assert response.status_code == 200
    assert response.json()["detail"] == "Usuario eliminado"
    
    # Verificar que el usuario ya no existe
    response_get = client.get(f"/api/v1/usuarios/{usuario_id}", headers=auth_headers_admin)
    assert response_get.status_code == 404


def test_eliminar_usuario_no_existente(client, auth_headers_admin):
    """Prueba la eliminación de un usuario que no existe"""
    response = client.delete("/api/v1/usuarios/99999", headers=auth_headers_admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"


def test_crear_usuario_con_correo_invalido(client, auth_headers_admin):
    """Prueba la creación de un usuario con correo inválido"""
    nuevo_usuario = {
        "nombres": "Pedro",
        "apellidos": "López",
        "correo": "correo_invalido",  # Sin formato de email
        "telefono": "945678901",
        "password_hash": "TestPasswordDef1!",
        "rol": "CLIENTE"
    }
    response = client.post("/api/v1/usuarios/", json=nuevo_usuario, headers=auth_headers_admin)
    assert response.status_code == 422  # Unprocessable Entity (error de validación)
