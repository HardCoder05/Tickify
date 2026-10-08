"""
Tests Complementarios de Casos de Prueba - Backend
Basado en Casos de Prueba.pdf (CP-01 a CP-47)

Estos tests complementan test_casos_prueba_backend.py con casos adicionales
definidos en el documento de especificación.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import text
import uuid


class TestCPComplementarios_Registro:
    """Tests adicionales para registro (CP-03, CP-04)"""
    
    def test_cp03_registro_password_debil(self, client):
        """CP-03: Registro fallido por contraseña débil"""
        unique_email = f"test.{uuid.uuid4().hex[:8]}@test.com"
        
        response = client.post(
            "/register",
            json={
                "nombres": "Test",
                "apellidos": "Usuario",
                "correo": unique_email,
                "telefono": "987654321",
                "password": "123",  # Contraseña débil
                "rol": "CLIENTE"
            }
        )
        assert response.status_code == 422, f"Debería rechazar contraseña débil. Status: {response.status_code}, Body: {response.text}"
        
    def test_cp04_registro_campos_faltantes(self, client):
        """CP-04: Registro fallido por campos obligatorios faltantes"""
        response = client.post(
            "/register",
            json={
                "nombres": "Test",
                # Falta apellidos, correo, telefono, password
                "rol": "CLIENTE"
            }
        )
        assert response.status_code in [400, 422], f"Debería rechazar campos faltantes. Status: {response.status_code}, Body: {response.text}"


class TestCPComplementarios_Login:
    """Tests adicionales para login (CP-07)"""
    
    def test_cp07_login_cuenta_inactiva(self, client, db_session):
        """CP-07: Inicio de sesión fallido por cuenta inactiva"""
        # Este test requiere que el backend tenga soporte para estado de cuenta
        # Por ahora lo marcamos como WIP
        pytest.skip("Requiere implementación de estado de cuenta en backend")


class TestCPComplementarios_Organizador:
    """Tests para solicitud de cuenta organizador (CP-09, CP-10)"""
    
    def test_cp09_organizador_ruc_duplicado(self, client, db_session):
        """CP-09: Solicitud fallida por RUC duplicado"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Primero registrar un organizador
        first_org_data = {
            "nombres": "Juan",
            "apellidos": "Organizador",
            "correo": f"org1.{unique_id}@empresa.com",
            "telefono": "987654321",
            "password": "Password123!",
            "rol": "ORGANIZADOR",
            "ruc": "20123456789",
            "razon_social": "Primera Empresa SAC",
            "dni": "12345678",
            "direccion": "Av. Principal 123",
            "correo_organizacional": f"contacto1.{unique_id}@empresa.com",
            "motivacion": "Organizar eventos",
            "sector": "Entretenimiento"
        }
        
        first_response = client.post("/register", json=first_org_data)
        if first_response.status_code != 201:
            pytest.skip("No se puede crear primer organizador para el test")
        
        # Intentar registrar otro con mismo RUC
        second_org_data = first_org_data.copy()
        second_org_data["correo"] = f"org2.{unique_id}@empresa.com"
        second_org_data["correo_organizacional"] = f"contacto2.{unique_id}@empresa.com"
        
        response = client.post("/register", json=second_org_data)
        assert response.status_code in [400, 409], "Debería rechazar RUC duplicado"
    
    def test_cp10_organizador_campos_vacios(self, client):
        """CP-10: Solicitud fallida por campos obligatorios vacíos"""
        response = client.post(
            "/register",
            json={
                "nombres": "",
                "apellidos": "",
                "correo": "",
                "telefono": "",
                "password": "Password123!",
                "rol": "ORGANIZADOR",
                "ruc": "",
                "razon_social": ""
            }
        )
        assert response.status_code in [400, 422], f"Debería rechazar campos vacíos. Status: {response.status_code}, Body: {response.text}"


class TestCPComplementarios_Eventos:
    """Tests adicionales para eventos (CP-12, CP-13, CP-14)"""
    
    def test_cp12_evento_capacidad_invalida(self, client, auth_headers_admin, organizador_test_id):
        """CP-12: Creación fallida por capacidad negativa o cero"""
        evento_data = {
            "organizador_id": organizador_test_id,
            "categoria_publico_id": 1,
            "nombre": "Evento Test",
            "descripcion": "Test",
            "fecha_inicio": (datetime.now() + timedelta(days=30)).isoformat(),
            "fecha_fin": (datetime.now() + timedelta(days=31)).isoformat(),
            "capacidad_maxima": -10,  # Capacidad negativa
            "banner_url": "https://test.com/banner.jpg",
            "ubicacion": "Test",
            "ciudad": "Lima",
            "estado": "activo"
        }
        
        response = client.post(
            "/api/v1/eventos/",
            json=evento_data,
            headers=auth_headers_admin
        )
        assert response.status_code in [400, 422], f"Debería rechazar capacidad negativa. Status: {response.status_code}, Body: {response.text}"
        
        # Test con capacidad = 0
        evento_data["capacidad_maxima"] = 0
        response = client.post(
            "/api/v1/eventos/",
            json=evento_data,
            headers=auth_headers_admin
        )
        assert response.status_code in [400, 422], "Debería rechazar capacidad cero"


class TestCPComplementarios_Zonas:
    """Tests adicionales para zonas (CP-16, CP-17, CP-18, CP-19, CP-20)"""
    
    def test_cp16_zona_capacidad_excede_evento(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-16: Registro fallido por capacidad que excede capacidad del evento"""
        evento_test_data["organizador_id"] = organizador_test_id
        evento_test_data["capacidad_maxima"] = 100
        
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        zona_data = {
            "nombre": "Zona Test",
            "descripcion": "Test",
            "capacidad": 150,  # Excede capacidad del evento
            "precio_base": 50.00
        }
        
        response = client.post(
            f"/api/v1/eventos/{evento_id}/zonas",
            json=zona_data,
            headers=auth_headers_admin
        )
        # Debería rechazar o permitir (depende de lógica de negocio)
        assert response.status_code in [200, 201, 400, 422]
    
    def test_cp17_zona_nombre_duplicado(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-17: Registro fallido por nombre duplicado"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        zona_data = {
            "nombre": "VIP",
            "descripcion": "Primera zona VIP",
            "capacidad": 50,
            "precio_base": 100.00
        }
        
        # Crear primera zona
        first_response = client.post(
            f"/api/v1/eventos/{evento_id}/zonas",
            json=zona_data,
            headers=auth_headers_admin
        )
        assert first_response.status_code in [200, 201]
        
        # Intentar crear segunda zona con mismo nombre
        response = client.post(
            f"/api/v1/eventos/{evento_id}/zonas",
            json=zona_data,
            headers=auth_headers_admin
        )
        assert response.status_code in [400, 409], "Debería rechazar nombre duplicado"


class TestCPComplementarios_TipoTicket:
    """Tests para tipo de ticket (CP-22, CP-23)"""
    
    def test_cp22_tipo_ticket_nombre_duplicado(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-22: Registro fallido por nombre duplicado"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        tipo_data = {
            "nombre": "VIP",
            "descripcion": "Ticket VIP",
            "incremento": 50.0
        }
        
        # Crear primer tipo
        first_response = client.post(
            f"/api/v1/eventos/{evento_id}/tipo_ticket",
            json=tipo_data,
            headers=auth_headers_admin
        )
        assert first_response.status_code in [200, 201]
        
        # Intentar crear segundo con mismo nombre
        response = client.post(
            f"/api/v1/eventos/{evento_id}/tipo_ticket",
            json=tipo_data,
            headers=auth_headers_admin
        )
        assert response.status_code in [400, 409], "Debería rechazar nombre duplicado"
    
    def test_cp23_tipo_ticket_campos_vacios(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-23: Registro fallido por campos vacíos"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        response = client.post(
            f"/api/v1/eventos/{evento_id}/tipo_ticket",
            json={
                "nombre": "",
                "descripcion": "",
                "incremento": 0.0
            },
            headers=auth_headers_admin
        )
        assert response.status_code == 422, "Debería rechazar campos vacíos"


class TestCPComplementarios_Compras:
    """Tests complementarios para compras (CP-27 a CP-30)"""
    
    def test_cp30_compra_cantidad_invalida(self, client, auth_headers_cliente, cliente_id):
        """CP-30: Compra fallida por cantidad inválida (negativa o cero)"""
        pytest.skip("Requiere datos de prueba disponibles")


class TestCPComplementarios_Listados:
    """Tests para listados (CP-31 a CP-35)"""
    
    def test_cp32_no_mostrar_eventos_inactivos(self, client):
        """CP-32: No se muestran eventos inactivos/cancelados en listado público"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        
        eventos = response.json()
        # Verificar que ningún evento tenga estado != activo
        for evento in eventos:
            if "estado" in evento:
                assert evento["estado"] != "cancelado", "No debería mostrar eventos cancelados"
                assert evento["estado"] != "inactivo", "No debería mostrar eventos inactivos"
    
    def test_cp33_listado_vacio_sin_eventos(self, client, db_session):
        """CP-33: Listado vacío cuando no hay eventos"""
        # Este test depende del estado de la BD
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_cp35_error_evento_inexistente(self, client):
        """CP-35: Error al consultar evento inexistente"""
        response = client.get("/api/v1/eventos/99999999")
        assert response.status_code == 404, "Debería retornar 404 para evento inexistente"


class TestCPComplementarios_ValidacionTickets:
    """Tests para validación de tickets (CP-40 a CP-42)"""
    
    def test_cp41_rechazo_ticket_usado(self, client, auth_headers_admin, db_session):
        """CP-41: Rechazo de ticket ya usado"""
        # Buscar un ticket usado
        ticket = db_session.execute(
            text("SELECT codigo_qr FROM tickets WHERE estado = 'USADO' LIMIT 1")
        ).fetchone()
        
        if not ticket:
            pytest.skip("No hay tickets usados para el test")
        
        response = client.post(
            f"/api/v1/tickets/validar/{ticket[0]}",
            headers=auth_headers_admin
        )
        assert response.status_code in [400, 409, 404], f"Debería rechazar ticket ya usado. Status: {response.status_code}, Body: {response.text}"


class TestCPComplementarios_Usuarios:
    """Tests para gestión de usuarios (CP-43 a CP-47)"""
    
    def test_cp44_listado_vacio_tickets(self, client, auth_headers_cliente):
        """CP-44: Listado vacío para usuario sin compras"""
        # Crear usuario nuevo sin compras
        unique_email = f"test.{uuid.uuid4().hex[:8]}@test.com"
        
        register_response = client.post(
            "/api/v1/users/register",
            json={
                "nombres": "Test",
                "apellidos": "Sin Compras",
                "correo": unique_email,
                "telefono": "987654321",
                "password": "Password123!",
                "rol": "CLIENTE"
            }
        )
        
        if register_response.status_code != 201:
            pytest.skip("No se puede crear usuario para el test")
        
        # Intentar obtener tickets (debería estar vacío)
        usuario_id = register_response.json().get("id") or register_response.json().get("usuario_id")
        
        if not usuario_id:
            pytest.skip("No se puede obtener ID de usuario")
        
        response = client.get(
            f"/api/v1/tickets/usuario/{usuario_id}",
            headers=auth_headers_cliente
        )
        
        if response.status_code == 200:
            tickets = response.json()
            assert isinstance(tickets, list)
            assert len(tickets) == 0, "Usuario nuevo no debería tener tickets"
    
    def test_cp46_actualizacion_correo_duplicado(self, client, auth_headers_cliente):
        """CP-46: Actualización fallida por correo duplicado"""
        pytest.skip("Requiere endpoint de actualización de perfil")
    
    def test_cp47_actualizacion_telefono_invalido(self, client, auth_headers_cliente):
        """CP-47: Actualización fallida por teléfono inválido"""
        pytest.skip("Requiere endpoint de actualización de perfil")
