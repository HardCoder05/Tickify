from datetime import datetime

import pytest


def test_login_usuario_cliente(client):
    """Test para login de usuario con rol CLIENTE"""
    response = client.post(
        "/login",
        json={
            "username": "cliente@test.com",
            "password": "cliente123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"
    
    # Verificar que el token funciona obteniendo datos del usuario
    token = response.json()["access_token"]
    me_response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["usuario"]["rol"] == "CLIENTE"


def test_login_organizador(client):
    """Test para login de usuario con rol ORGANIZADOR"""
    response = client.post(
        "/login",
        json={
            "username": "organizador@test.com",
            "password": "org123"
        }
    )
    
    # Si el usuario está inactivo, saltamos el test con mensaje informativo
    if response.status_code == 403:
        pytest.skip("Usuario organizador@test.com está inactivo. Ejecutar: python scripts/setup_test_users.py crear")
    
    assert response.status_code == 200, f"Login failed: {response.json()}"
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"
    
    # Verificar que el token funciona y tiene rol correcto
    token = response.json()["access_token"]
    me_response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["usuario"]["rol"] == "ORGANIZADOR"


def test_login_admin(client):
    """Test para login de usuario con rol ADMIN"""
    response = client.post(
        "/login",
        json={
            "username": "admin@test.com",
            "password": "admin123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"
    
    # Verificar que el token funciona y tiene rol correcto
    token = response.json()["access_token"]
    me_response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["usuario"]["rol"] == "ADMIN"

def test_login_credenciales_incorrectas(client):
    """Test para login con credenciales incorrectas"""
    response = client.post(
        "/login",
        json={
            "username": "usuario_inexistente@example.com",
            "password": "password_incorrecto"
        }
    )
    assert response.status_code in [401,403]
    assert "detail" in response.json()

def test_login_sin_username(client):
    """Test para login sin username"""
    response = client.post(
        "/login",
        json={
            "password": "password123"
        }
    )
    assert response.status_code == 422

def test_login_sin_password(client):
    """Test para login sin password"""
    response = client.post(
        "/login",
        json={
            "username": "test@example.com"
        }
    )
    assert response.status_code == 422

def test_login_con_datos_vacios(client):
    """Test para login con datos vacíos"""
    response = client.post(
        "/login",
        json={
            "username": "",
            "password": ""
        }
    )
    assert response.status_code in [401, 422]

# Tests para registro
def test_registro_exitoso(client):
    """Test para registro de nuevo usuario"""
    import time
    unique_email = f"test_{int(time.time() * 1000)}@test.com"
    
    response = client.post(
        "/register",
        json={
            "nombres": "Test User",
            "apellidos": "Test Lastname",
            "correo": unique_email,
            "telefono": "987654321",  # Required, non-empty
            "password": "Testpassword123!",  # Must meet password requirements
            "rol": "CLIENTE"
        }
    )
    
    if response.status_code == 400:
        print(f"Registration failed with 400: {response.json()}")
    
    assert response.status_code == 201, f"Expected 201 but got {response.status_code}: {response.json()}"
    assert "message" in response.json()

def test_registro_correo_duplicado(client):
    """Test para registro con correo existente"""
    response = client.post(
        "/register",
        json={
            "nombres": "Test User",
            "apellidos": "Test Lastname",
            "correo": "cliente@test.com",  # Este correo ya existe
            "telefono": "987654321",
            "password": "Testpassword123!",
            "rol": "CLIENTE"  # Campo requerido
        }
    )
    assert response.status_code in [400, 409]

# Tests para verificación de usuario actual
def test_get_me_sin_token(client):
    """Test para obtener usuario actual sin token"""
    response = client.get("/me")
    assert response.status_code in [401, 403]  # Accept both Unauthorized and Forbidden

def test_get_me_con_token(client):
    """Test para obtener usuario actual con token válido"""
    # Primero hacemos login para obtener un token usando un usuario existente
    login_response = client.post(
        "/login",
        json={
            "username": "cliente@test.com",
            "password": "cliente123"
        }
    )
    assert login_response.status_code == 200, f"Login falló: {login_response.json()}"
    token = login_response.json()["access_token"]
    
    # Usamos el token para obtener el usuario actual
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "usuario" in response.json()

