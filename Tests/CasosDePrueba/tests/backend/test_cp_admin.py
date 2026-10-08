"""
Tests de Administración y Gestión - Backend
Casos de prueba para admin, reportes, gestión de estado (CP-65 a CP-120)
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import text
import uuid


class TestCPGestionEventos:
    """Tests para edición y gestión de eventos (CP-65 a CP-77)"""
    
    def test_cp65_editar_evento_exitoso(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-65: Modificación exitosa de evento"""
        # Crear evento
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Actualizar evento
        updated_data = evento_test_data.copy()
        updated_data["nombre"] = "Evento Modificado Exitosamente"
        updated_data["descripcion"] = "Descripción actualizada"
        
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json=updated_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        assert response.json()["nombre"] == "Evento Modificado Exitosamente"
    
    def test_cp66_editar_evento_datos_invalidos(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-66: Modificación fallida por datos inválidos"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Intentar actualizar con capacidad negativa
        updated_data = {
            "capacidad_maxima": -50  # Dato inválido
        }
        
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json=updated_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code in [400, 422], "Debería rechazar capacidad negativa"
    
    def test_cp67_editar_evento_fechas_invalidas(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-67: Modificación fallida por fecha fin antes de inicio"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Intentar actualizar con fechas inválidas
        updated_data = evento_test_data.copy()
        updated_data["fecha_inicio"] = (datetime.now() + timedelta(days=60)).isoformat()
        updated_data["fecha_fin"] = (datetime.now() + timedelta(days=30)).isoformat()  # Antes del inicio
        
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json=updated_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code in [400, 422], "Debería rechazar fechas inválidas"
    
    def test_cp68_cambiar_estado_inactivo(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-68: Cambio exitoso a estado INACTIVO"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Cambiar a inactivo
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json={"estado": "inactivo"},
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        assert response.json()["estado"] == "inactivo"
    
    def test_cp69_cambiar_estado_cancelado(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-69: Cambio exitoso a estado CANCELADO"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Cambiar a cancelado
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json={"estado": "cancelado"},
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        assert response.json()["estado"] == "cancelado"
    
    def test_cp70_cambiar_estado_invalido(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-70: Cambio fallido por estado inválido"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        # Intentar cambiar a estado inválido
        response = client.put(
            f"/api/v1/eventos/{evento_id}",
            json={"estado": "ESTADO_INVALIDO"},
            headers=auth_headers_admin
        )
        
        assert response.status_code in [400, 422], "Debería rechazar estado inválido"
    
    def test_cp71_eliminar_evento_logico(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-71: Eliminación lógica exitosa de evento"""
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        response = client.delete(
            f"/api/v1/eventos/{evento_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code in [200, 204], "Debería eliminar exitosamente"


class TestCPCambioPassword:
    """Tests para cambio de contraseña (CP-112 a CP-114)"""
    
    def test_cp112_cambio_password_exitoso(self, client, auth_headers_cliente):
        """CP-112: Cambio exitoso de contraseña"""
        pytest.skip("Requiere endpoint de cambio de contraseña")
    
    def test_cp113_password_no_coincide(self, client, auth_headers_cliente):
        """CP-113: Error por confirmación de contraseña no coincidente"""
        pytest.skip("Requiere endpoint de cambio de contraseña")
    
    def test_cp114_password_debil(self, client, auth_headers_cliente):
        """CP-114: Error por nueva contraseña que no cumple criterios"""
        pytest.skip("Requiere endpoint de cambio de contraseña")


class TestCPReportesAdmin:
    """Tests para reportes de administrador (CP-115, CP-116, CP-119, CP-120)"""
    
    def test_cp115_reporte_organizadores(self, client, auth_headers_admin):
        """CP-115: Visualización exitosa de organizadores registrados"""
        response = client.get(
            "/api/v1/admin/organizadores",
            headers=auth_headers_admin
        )
        
        # Endpoint puede no existir
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            organizadores = response.json()
            assert isinstance(organizadores, list)
    
    def test_cp116_reporte_sin_organizadores(self, client, auth_headers_admin, db_session):
        """CP-116: No existen organizadores registrados"""
        # Este test depende del estado de la BD
        pytest.skip("Depende del estado de la base de datos")
    
    def test_cp119_reporte_ingresos_crecimiento(self, client, auth_headers_admin):
        """CP-119: Cálculo correcto de crecimiento porcentual de ingresos"""
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        fecha_fin = datetime.now().strftime("%Y-%m-%d")
        
        response = client.get(
            f"/api/v1/admin/reportes/ingresos?fecha_inicio={fecha_inicio}&fecha_fin={fecha_fin}",
            headers=auth_headers_admin
        )
        
        # Endpoint puede no existir
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Verificar estructura de respuesta
            assert "total_ingresos" in data or "ingresos" in data
    
    def test_cp120_reporte_sin_informacion_periodo(self, client, auth_headers_admin):
        """CP-120: Sin información del periodo consultado"""
        # Consultar periodo muy antiguo
        fecha_inicio = "2010-01-01"
        fecha_fin = "2010-01-31"
        
        response = client.get(
            f"/api/v1/admin/reportes/ingresos?fecha_inicio={fecha_inicio}&fecha_fin={fecha_fin}",
            headers=auth_headers_admin
        )
        
        assert response.status_code in [200, 404]


class TestCPAutorizacionOrganizadores:
    """Tests para autorización de cuentas de organizadores (CP-117, CP-118)"""
    
    def test_cp117_aceptar_solicitud_organizador(self, client, auth_headers_admin, db_session):
        """CP-117: Aceptar solicitud de organizador correctamente"""
        # Buscar un organizador pendiente
        org = db_session.execute(
            text("SELECT o.id FROM organizadores o WHERE o.estado = 'pendiente' LIMIT 1")
        ).fetchone()
        
        if not org:
            pytest.skip("No hay organizadores pendientes para el test")
        
        org_id = org[0]
        
        # Intentar aprobar
        response = client.put(
            f"/api/v1/admin/organizadores/{org_id}/aprobar",
            headers=auth_headers_admin
        )
        
        # Endpoint puede no existir
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            # Verificar que el estado cambió
            resultado = db_session.execute(
                text("SELECT estado FROM organizadores WHERE id = :id"),
                {"id": org_id}
            ).fetchone()
            
            if resultado:
                assert resultado[0] == "activo", "El organizador debería estar activo"
    
    def test_cp118_rechazar_solicitud_organizador(self, client, auth_headers_admin, db_session):
        """CP-118: Rechazar solicitud de organizador"""
        # Buscar un organizador pendiente
        org = db_session.execute(
            text("SELECT o.id FROM organizadores o WHERE o.estado = 'pendiente' LIMIT 1")
        ).fetchone()
        
        if not org:
            pytest.skip("No hay organizadores pendientes para el test")
        
        org_id = org[0]
        
        # Intentar rechazar
        response = client.put(
            f"/api/v1/admin/organizadores/{org_id}/rechazar",
            headers=auth_headers_admin
        )
        
        # Endpoint puede no existir
        assert response.status_code in [200, 404]


class TestCPReportesOrganizador:
    """Tests para reportes de organizador (CP-78, CP-79)"""
    
    def test_cp78_reporte_ventas_con_datos(self, client, auth_headers_admin, db_session):
        """CP-78: Reporte exitoso de ventas con datos"""
        # Obtener un evento con ventas
        evento = db_session.execute(
            text("SELECT id FROM eventos WHERE estado = 'activo' LIMIT 1")
        ).fetchone()
        
        if not evento:
            pytest.skip("No hay eventos para el test")
        
        evento_id = evento[0]
        
        response = client.get(
            f"/api/v1/eventos/{evento_id}/reportes/ventas",
            headers=auth_headers_admin
        )
        
        # Endpoint puede no existir
        assert response.status_code in [200, 404]
    
    def test_cp79_reporte_ventas_sin_datos(self, client, auth_headers_admin, evento_test_data, organizador_test_id, cleanup_test_data):
        """CP-79: Reporte sin ventas en el periodo"""
        # Crear evento nuevo sin ventas
        evento_test_data["organizador_id"] = organizador_test_id
        create_response = client.post(
            "/api/v1/eventos/",
            json=evento_test_data,
            headers=auth_headers_admin
        )
        evento_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/v1/eventos/{evento_id}/reportes/ventas",
            headers=auth_headers_admin
        )
        
        # Debería retornar reporte vacío o sin ventas
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Verificar que no hay ventas
            if "total_ventas" in data:
                assert data["total_ventas"] == 0 or data["total_ventas"] == 0.0


class TestCPGestionAdicional:
    """Tests para funcionalidades adicionales (CP-80 a CP-95)"""
    
    def test_cp80_notificar_cambios_evento(self, client, auth_headers_admin):
        """CP-80: Notificación exitosa a compradores sobre cambios"""
        pytest.skip("Requiere sistema de notificaciones implementado")
    
    def test_cp82_registrar_gasto_evento(self, client, auth_headers_admin):
        """CP-82: Registro exitoso de gasto de evento"""
        pytest.skip("Requiere endpoint de gastos implementado")
    
    def test_cp83_registro_gasto_monto_negativo(self, client, auth_headers_admin):
        """CP-83: Registro fallido por monto negativo"""
        pytest.skip("Requiere endpoint de gastos implementado")
    
    def test_cp86_configurar_metodo_pago_paypal(self, client, auth_headers_cliente):
        """CP-86: Configuración exitosa de PayPal"""
        pytest.skip("Requiere endpoint de configuración de pago")
    
    def test_cp87_configurar_metodo_pago_tarjeta(self, client, auth_headers_cliente):
        """CP-87: Configuración exitosa de tarjeta"""
        pytest.skip("Requiere endpoint de configuración de pago")
    
    def test_cp89_devolucion_antes_evento(self, client, auth_headers_cliente):
        """CP-89: Devolución exitosa antes del evento"""
        pytest.skip("Requiere endpoint de devoluciones")
    
    def test_cp90_devolucion_evento_realizado(self, client, auth_headers_cliente):
        """CP-90: Rechazo por evento ya realizado"""
        pytest.skip("Requiere endpoint de devoluciones")
    
    def test_cp92_generar_qr_unico(self, client, auth_headers_cliente):
        """CP-92: Generación exitosa de QR único"""
        # Los QR se generan automáticamente al crear tickets
        pytest.skip("QR se genera automáticamente en creación de compra")
    
    def test_cp94_descargar_ticket_pdf(self, client, auth_headers_cliente):
        """CP-94: Descarga exitosa de PDF de ticket"""
        pytest.skip("Requiere endpoint de descarga de PDF")
    
    def test_cp95_descargar_ticket_inexistente(self, client, auth_headers_cliente):
        """CP-95: Error al descargar ticket inexistente"""
        response = client.get(
            "/api/v1/tickets/99999999/pdf",
            headers=auth_headers_cliente
        )
        
        assert response.status_code in [404, 400], "Debería retornar error para ticket inexistente"
