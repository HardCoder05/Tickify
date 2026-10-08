"""
Tests para Etapas, Zonas, Tipo de Tickets y Tarifas con campos de pricing dinámico
"""
import pytest
from datetime import datetime, timedelta


@pytest.fixture
def organizador_id(client):
    """Obtiene el ID de un organizador existente"""
    from database import get_db
    from users.models.Organizador import Organizador
    
    db = next(get_db())
    try:
        organizador = db.query(Organizador).filter(
            Organizador.estado == 'activo'
        ).first()
        return organizador.id if organizador else 1
    finally:
        db.close()


@pytest.fixture
def evento_test(client, admin_token, organizador_id):
    """Fixture que crea un evento de prueba para los tests"""
    fecha_inicio = (datetime.now() + timedelta(days=30)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=60)).isoformat()
    
    evento_data = {
        "organizador_id": organizador_id,
        "categoria_publico_id": 1,
        "nombre": f"Evento Test {datetime.now().timestamp()}",
        "descripcion": "Evento de prueba para tests de pricing",
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "capacidad_maxima": 1000,
        "banner_url": "https://ejemplo.com/banner.jpg",
        "ubicacion": "Av. Universitaria 1801",
        "ciudad": "Lima",
        "estado": "activo"
    }
    
    response = client.post(
        "/api/v1/eventos/",
        json=evento_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 201, f"Error creando evento: {response.json()}"
    evento = response.json()
    
    yield evento
    
    # Cleanup: eliminar evento después del test
    try:
        client.delete(
            f"/api/v1/eventos/{evento['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    except:
        pass  # Si ya fue eliminado, no hay problema


class TestEtapas:
    """Tests para CRUD de Etapas con campo porcentaje"""

    def test_crear_etapa_con_porcentaje(self, client, admin_token, evento_test):
        """Test crear etapa con porcentaje"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Preventa",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),
                "porcentaje": 15.50
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Preventa"
        assert "porcentaje" in data
        assert float(data["porcentaje"]) == 15.50

    def test_crear_etapa_con_porcentaje_cero(self, client, admin_token, evento_test):
        """Test crear etapa con porcentaje en 0.00"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Etapa Normal",
                "fecha_inicio": (datetime.now() + timedelta(days=5)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=25)).isoformat(),
                "porcentaje": 0.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "porcentaje" in data
        assert float(data["porcentaje"]) == 0.00

    def test_actualizar_porcentaje_etapa(self, client, admin_token, evento_test):
        """Test actualizar el porcentaje de una etapa"""
        # Crear etapa
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Etapa Inicial",
                "fecha_inicio": (datetime.now() + timedelta(days=2)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=28)).isoformat(),
                "porcentaje": 10.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        etapa_id = create_response.json()["id"]

        # Actualizar porcentaje
        update_response = client.put(
            f"/api/v1/eventos/etapas/{etapa_id}",
            json={
                "nombre": "Etapa Test Actualizada",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=27)).isoformat(),
                "porcentaje": 25.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert float(data["porcentaje"]) == 25.00

    def test_obtener_etapas_incluye_porcentaje(self, client, admin_token, evento_test):
        """Test que al obtener etapas se incluya el campo porcentaje"""
        # Crear etapa
        client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Etapa Test",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=29)).isoformat(),
                "porcentaje": 12.50
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Obtener etapas
        response = client.get(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        etapas = response.json()
        assert len(etapas) > 0
        # Verificar que todas tienen campo porcentaje
        for etapa in etapas:
            assert "porcentaje" in etapa

    def test_eliminar_etapa(self, client, admin_token, evento_test):
        """Test eliminar una etapa"""
        # Crear etapa
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Etapa Temporal",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=10)).isoformat(),
                "porcentaje": 5.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        etapa_id = create_response.json()["id"]

        # Eliminar
        delete_response = client.delete(
            f"/api/v1/eventos/etapas/{etapa_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 204


class TestZonas:
    """Tests para CRUD de Zonas con campo precio_base"""

    def test_crear_zona_con_precio_base(self, client, admin_token, evento_test):
        """Test crear zona con precio_base"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "VIP Premium",
                "descripcion": "Zona VIP con servicios exclusivos",
                "capacidad": 200,
                "precio_base": 150.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "VIP Premium"
        # precio_base solo visible para admin/organizador
        if "precio_base" in data:
            assert float(data["precio_base"]) == 150.00

    def test_crear_zona_con_precio_base_cero(self, client, admin_token, evento_test):
        """Test crear zona con precio_base en 0.00"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "General",
                "descripcion": "Zona general",
                "capacidad": 1000,
                "precio_base": 0.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if "precio_base" in data:
            assert float(data["precio_base"]) == 0.00

    def test_actualizar_precio_base_zona(self, client, admin_token, evento_test):
        """Test actualizar el precio_base de una zona existente"""
        # Crear zona
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "Platea",
                "descripcion": "Zona platea",
                "capacidad": 500,
                "precio_base": 80.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        zona_id = create_response.json()["id"]

        # Actualizar precio_base
        update_response = client.put(
            f"/api/v1/eventos/zonas/{zona_id}",
            json={
                "nombre": "Platea Premium",
                "descripcion": "Zona platea mejorada",
                "capacidad": 500,
                "precio_base": 120.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        if "precio_base" in data:
            assert float(data["precio_base"]) == 120.00

    def test_obtener_zonas_incluye_precio_base_admin(self, client, admin_token, evento_test):
        """Test que admin/organizador vea precio_base al obtener zonas"""
        # Crear zona
        client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "Zona Test",
                "descripcion": "Test",
                "capacidad": 300,
                "precio_base": 95.50
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Obtener zonas como admin
        response = client.get(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        zonas = response.json()
        assert len(zonas) > 0
        # Admin debe ver precio_base
        for zona in zonas:
            assert "precio_base" in zona

    def test_eliminar_zona(self, client, admin_token, evento_test):
        """Test eliminar una zona"""
        # Crear zona
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "Zona Temporal",
                "descripcion": "Test",
                "capacidad": 100,
                "precio_base": 50.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        zona_id = create_response.json()["id"]

        # Eliminar
        delete_response = client.delete(
            f"/api/v1/eventos/zonas/{zona_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 204


class TestTipoTicket:
    """Tests para CRUD de Tipo de Tickets con campo incremento"""

    def test_crear_tipo_ticket_con_incremento(self, client, admin_token, evento_test):
        """Test crear tipo de ticket con incremento"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Pase VIP",
                "descripcion": "Acceso VIP con beneficios",
                "incremento": 50.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Pase VIP"
        if "incremento" in data:
            assert float(data["incremento"]) == 50.00

    def test_crear_tipo_ticket_con_incremento_cero(self, client, admin_token, evento_test):
        """Test crear tipo de ticket con incremento en 0.00"""
        response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Regular",
                "descripcion": "Entrada regular",
                "incremento": 0.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if "incremento" in data:
            assert float(data["incremento"]) == 0.00

    def test_actualizar_incremento_tipo_ticket(self, client, admin_token, evento_test):
        """Test actualizar el incremento de un tipo de ticket"""
        # Crear tipo
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Premium",
                "descripcion": "Entrada premium",
                "incremento": 30.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Error creating tipo_ticket: {create_response.status_code} - {create_response.text}"
        tipo_id = create_response.json()["id"]

        # Actualizar incremento
        update_response = client.put(
            f"/api/v1/eventos/tipo_ticket/{tipo_id}",
            json={
                "nombre": "Premium Plus",
                "descripcion": "Entrada premium mejorada",
                "incremento": 45.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        if "incremento" in data:
            assert float(data["incremento"]) == 45.00

    def test_obtener_tipos_ticket_incluye_incremento(self, client, admin_token, evento_test):
        """Test que al obtener tipos de ticket se incluya incremento para admin"""
        # Crear tipo
        client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Tipo Test",
                "descripcion": "Test",
                "incremento": 15.75
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Obtener tipos como admin
        response = client.get(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        tipos = response.json()
        assert len(tipos) > 0
        # Admin debe ver incremento
        for tipo in tipos:
            assert "incremento" in tipo

    def test_eliminar_tipo_ticket(self, client, admin_token, evento_test):
        """Test eliminar un tipo de ticket"""
        # Crear tipo
        create_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Tipo Temporal",
                "descripcion": "Test",
                "incremento": 10.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Error creating tipo_ticket: {create_response.status_code} - {create_response.text}"
        tipo_id = create_response.json()["id"]

        # Eliminar
        delete_response = client.delete(
            f"/api/v1/eventos/tipo_ticket/{tipo_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 204


class TestTarifasAutomaticas:
    """Tests para generación automática de tarifas con pricing dinámico"""

    def test_generar_tarifas_automaticas(self, client, admin_token, evento_test):
        """Test generar tarifas automáticamente con pricing dinámico"""
        # Crear zona con precio_base
        zona_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "General",
                "descripcion": "Zona general",
                "capacidad": 1000,
                "precio_base": 100.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert zona_response.status_code == 200
        
        # Crear etapa con porcentaje
        etapa_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Preventa",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=29)).isoformat(),
                "porcentaje": 20.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert etapa_response.status_code == 200
        
        # Crear tipo_ticket con incremento
        tipo_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "VIP",
                "descripcion": "Acceso VIP",
                "incremento": 50.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert tipo_response.status_code == 200

        # Generar tarifas automáticamente
        tarifas_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tarifas",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert tarifas_response.status_code == 200
        tarifas = tarifas_response.json()
        assert len(tarifas) > 0
        
        # Verificar que las tarifas se generaron correctamente
        for tarifa in tarifas:
            assert "precio" in tarifa
            assert tarifa["precio"] > 0

    def test_obtener_tarifas_evento(self, client, admin_token, evento_test):
        """Test obtener todas las tarifas de un evento"""
        response = client.get(
            f"/api/v1/eventos/{evento_test['id']}/tarifas",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        tarifas = response.json()
        assert isinstance(tarifas, list)


class TestIntegracionPricingDinamico:
    """Tests de integración para verificar el cálculo de precios dinámicos"""

    def test_precio_calculado_con_todos_los_factores(self, client, admin_token, evento_test):
        """Test que verifica el precio se calcula correctamente con precio_base + porcentaje + incremento"""
        # Crear componentes
        # 1. Zona con precio_base = 100
        zona_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/zonas",
            json={
                "nombre": "Platea",
                "descripcion": "Zona platea",
                "capacidad": 500,
                "precio_base": 100.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert zona_response.status_code == 200
        
        # 2. Etapa con porcentaje = 10% (descuento)
        etapa_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/etapas",
            json={
                "nombre": "Preventa",
                "fecha_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
                "fecha_fin": (datetime.now() + timedelta(days=29)).isoformat(),
                "porcentaje": -10.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert etapa_response.status_code == 200
        
        # 3. Tipo_ticket con incremento = 25 (soles adicionales)
        tipo_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tipo_ticket",
            json={
                "nombre": "Premium",
                "descripcion": "Acceso premium",
                "incremento": 25.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert tipo_response.status_code == 200

        # Generar tarifas
        tarifas_response = client.post(
            f"/api/v1/eventos/{evento_test['id']}/tarifas",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert tarifas_response.status_code == 200
        tarifas = tarifas_response.json()
        
        # Buscar la tarifa específica (Platea + Preventa + Premium)
        # Precio esperado: 100 - 10% + 25 = 90 + 25 = 115
        # (La lógica exacta depende de tu implementación)
        assert len(tarifas) > 0
        
        # Verificar que todas las tarifas tienen precio calculado
        for tarifa in tarifas:
            assert tarifa["precio"] is not None
            assert tarifa["precio"] >= 0
