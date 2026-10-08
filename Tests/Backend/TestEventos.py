from datetime import datetime, timedelta

import pytest


@pytest.fixture
def admin_user_id(client):
    """Obtiene el ID de un organizador existente para usar en los tests"""
    from database import get_db
    from users.models.Organizador import Organizador
    
    db = next(get_db())
    try:
        # Obtener un organizador activo (preferiblemente el primero de los datos reales)
        organizador = db.query(Organizador).filter(
            Organizador.estado == 'activo'
        ).first()
        if organizador:
            print(f"\n✓ Usando Organizador ID={organizador.id}, usuario_id={organizador.usuario_id}")
            return organizador.id
        else:
            print("\n❌ No hay organizadores activos en la base de datos")
            print("   Por favor ejecuta: psql -U postgres -d tickify -f 'Scripts BD/02_Datos_Reales.sql'")
            return 1  # Fallback
    finally:
        db.close()

@pytest.fixture
def evento_data(admin_user_id):
    """Fixture con datos de evento válidos"""
    fecha_inicio = (datetime.now() + timedelta(days=30)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=31)).isoformat()
    
    return {
        "organizador_id": admin_user_id,
        "categoria_publico_id": 1,
        "nombre": "Evento Test",
        "descripcion": "Descripción del evento de prueba",
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "capacidad_maxima": 100,
        "banner_url": "https://ejemplo.com/banner.jpg",
        "ubicacion": "Av. Universitaria 1801",
        "ciudad": "Lima",
        "estado": "activo"
    }

def test_get_eventos(client):
    response = client.get("/api/v1/eventos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_evento(client, evento_data, auth_headers_admin):
    response = client.post("/api/v1/eventos/", json=evento_data, headers=auth_headers_admin)
    if response.status_code != 201:
        print(f"\n❌ Error response: {response.json()}")
        print(f"❌ Status code: {response.status_code}")
        print(f"📋 Evento data: {evento_data}")
    assert response.status_code == 201, f"Expected 201 but got {response.status_code}: {response.json()}"
    created_evento = response.json()
    assert created_evento["nombre"] == evento_data["nombre"]
    assert created_evento["organizador_id"] == evento_data["organizador_id"]

def test_get_evento_by_id(client, evento_data, auth_headers_admin):
    # Primero creamos un evento
    create_response = client.post("/api/v1/eventos/", json=evento_data, headers=auth_headers_admin)
    assert create_response.status_code == 201, f"Failed to create evento: {create_response.json()}"
    evento_id = create_response.json()["id"]
    
    # Luego intentamos obtenerlo (usando auth headers ya que nuevos eventos son 'borrador')
    response = client.get(f"/api/v1/eventos/{evento_id}", headers=auth_headers_admin)
    assert response.status_code == 200, f"Failed to get evento {evento_id}: {response.json()}"
    evento = response.json()
    assert evento["id"] == evento_id
    assert "nombre" in evento
    assert "fecha_inicio" in evento

def test_update_evento(client, evento_data, auth_headers_admin):
    # Primero creamos un evento
    create_response = client.post("/api/v1/eventos/", json=evento_data, headers=auth_headers_admin)
    evento_id = create_response.json()["id"]
    
    # Datos actualizados - Note: capacidad_maxima is now calculated from zones/seats,
    # not set manually during creation/update
    fecha_inicio = (datetime.now() + timedelta(days=60)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=62)).isoformat()
    
    updated_data = {
        "organizador_id": 1,
        "categoria_publico_id": 2,
        "nombre": "Evento Actualizado",
        "descripcion": "Nueva descripción del evento",
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "banner_url": "https://ejemplo.com/nuevo_banner.jpg",
        "ubicacion": "Av. Universitaria 2000",
        "ciudad": "San Miguel"
    }
    response = client.put(f"/api/v1/eventos/{evento_id}", json=updated_data, headers=auth_headers_admin)
    assert response.status_code == 200, f"Update failed: {response.json()}"
    updated_evento = response.json()
    assert updated_evento["nombre"] == updated_data["nombre"], f"Expected nombre '{updated_data['nombre']}', got '{updated_evento['nombre']}'"
    # capacidad_maxima is calculated from zones/seats, not from update data
    assert "capacidad_maxima" in updated_evento, "capacidad_maxima field should exist in response"

def test_delete_evento(client, evento_data, auth_headers_admin):
    # Primero creamos un evento
    create_response = client.post("/api/v1/eventos/", json=evento_data, headers=auth_headers_admin)
    evento_id = create_response.json()["id"]
    
    # Luego lo eliminamos
    response = client.delete(f"/api/v1/eventos/{evento_id}", headers=auth_headers_admin)
    assert response.status_code == 204  # 204 No Content es el código correcto para DELETE exitoso
    
    # Verificamos que ya no existe
    response = client.get(f"/api/v1/eventos/{evento_id}")
    assert response.status_code == 404

def test_create_evento_invalid_data(client, auth_headers_admin):
    evento_data = {
        "organizador_id": "invalid",
        "categoria_publico_id": 1,
        "nombre": "",
        "fecha_inicio": "fecha_invalida",
        "fecha_fin": "fecha_invalida",
        "capacidad_maxima": -1,
        "ubicacion": 1234,
        "ciudad": 124,
        "estado": "activo"
    }
    response = client.post("/api/v1/eventos/", json=evento_data, headers=auth_headers_admin)
    assert response.status_code == 422

def test_get_evento_not_found(client):
    response = client.get("/api/v1/eventos/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Evento no encontrado"


def test_update_evento_not_found(client, auth_headers_admin):
    fecha_inicio = (datetime.now() + timedelta(days=30)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=31)).isoformat()
    
    updated_data = {
        "organizador_id": 1,
        "categoria_publico_id": 1,
        "nombre": "Evento Test",
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "capacidad_maxima": 100,
        "ubicacion": "Av. Universitaria 1801",
        "ciudad": "Lima",
        "estado": "activo"
    }
    response = client.put("/api/v1/eventos/999999", json=updated_data, headers=auth_headers_admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Evento no encontrado"

def test_delete_evento_not_found(client, auth_headers_admin):
    response = client.delete("/api/v1/eventos/999999", headers=auth_headers_admin)
    assert response.status_code == 404
    assert response.json()["detail"] == "Evento no encontrado"
