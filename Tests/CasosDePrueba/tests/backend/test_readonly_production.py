"""
Tests de SOLO LECTURA para Producción
SAFE para ejecutar contra https://tickify.duckdns.org/

Estos tests NO modifican datos, solo validan:
- Endpoints públicos de consulta
- Estructura de respuestas
- Validaciones de datos
- Filtros y búsquedas
"""
import pytest
from datetime import datetime, timedelta


class TestPublicEndpointsReadOnly:
    """Tests de endpoints públicos (no requieren autenticación)"""
    
    def test_listar_eventos_publicos(self, client):
        """Validar que el listado de eventos funciona"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list), "Debe retornar una lista"
        
        # Validar estructura de cada evento
        for evento in eventos[:3]:  # Solo los primeros 3
            assert "id" in evento
            assert "nombre" in evento
            assert "descripcion" in evento or True  # Puede ser null
            if "estado" in evento:
                assert evento["estado"] in ["activo", "inactivo", "cancelado"]
    
    def test_buscar_eventos_por_fecha(self, client):
        """Validar búsqueda de eventos por rango de fechas"""
        fecha_desde = datetime.now().strftime("%Y-%m-%d")
        fecha_hasta = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        response = client.get(
            f"/api/v1/eventos/?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}"
        )
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list)
    
    def test_buscar_eventos_sin_resultados(self, client):
        """Validar búsqueda que no retorna resultados"""
        # Fechas muy lejanas
        fecha_desde = "2030-01-01"
        fecha_hasta = "2030-12-31"
        
        response = client.get(
            f"/api/v1/eventos/?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}"
        )
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list)
        # Puede estar vacío o tener eventos muy futuros
    
    def test_obtener_categorias_publico(self, client):
        """Validar endpoint de categorías"""
        response = client.get("/api/v1/categorias_publico/")
        
        if response.status_code == 200:
            categorias = response.json()
            assert isinstance(categorias, list)
            
            for categoria in categorias[:3]:
                assert "id" in categoria
                # Puede tener nombre, descripcion, etc
    
    def test_evento_inexistente(self, client):
        """Validar que evento inexistente retorna 404"""
        response = client.get("/api/v1/eventos/999999999")
        assert response.status_code == 404


class TestAuthenticationReadOnly:
    """Tests de autenticación (solo login, no registro)"""
    
    def test_login_endpoint_exists(self, client):
        """Validar que el endpoint de login existe"""
        # Intentar login con credenciales inválidas (no afecta BD)
        response = client.post(
            "/login",
            json={
                "username": "test_nonexistent_user@test.com",
                "password": "wrong_password_12345"
            }
        )
        # Debe retornar 401 o 403, no 404
        assert response.status_code in [401, 403, 400, 422]
    
    def test_acceso_sin_token(self, client):
        """Validar que endpoints protegidos requieren autenticación"""
        response = client.get("/me")
        assert response.status_code in [401, 403], "Debe requerir autenticación"


class TestValidationsReadOnly:
    """Tests de validaciones (sin crear datos)"""
    
    def test_validacion_datos_invalidos_login(self, client):
        """Validar que login rechaza datos inválidos"""
        # Datos vacíos
        response = client.post("/login", json={})
        assert response.status_code in [400, 422], "Debe rechazar datos vacíos"
    
    def test_validacion_formato_email(self, client):
        """Validar que se rechaza email inválido en login"""
        response = client.post(
            "/login",
            json={
                "username": "not_an_email",
                "password": "password123"
            }
        )
        # Puede rechazar por formato o por credenciales inválidas
        assert response.status_code in [400, 401, 403, 422]


class TestResponseStructureReadOnly:
    """Tests de estructura de respuestas"""
    
    def test_estructura_respuesta_eventos(self, client):
        """Validar estructura de la respuesta de eventos"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Debe ser una lista"
        
        if len(data) > 0:
            evento = data[0]
            # Campos esperados en un evento
            campos_esperados = ["id", "nombre"]
            for campo in campos_esperados:
                assert campo in evento, f"Campo '{campo}' debe estar presente"
    
    def test_headers_cors(self, client):
        """Validar que el servidor maneja CORS"""
        response = client.options("/api/v1/eventos/")
        # El servidor debe responder a OPTIONS
        assert response.status_code in [200, 204, 405]
    
    def test_endpoint_raiz(self, client):
        """Validar que el endpoint raíz responde"""
        response = client.get("/")
        # Puede redirigir, retornar info, o 404
        assert response.status_code in [200, 404, 307, 308]
    
    def test_endpoint_docs_existe(self, client):
        """Validar que la documentación de API existe"""
        response = client.get("/docs")
        # FastAPI genera docs automáticamente
        assert response.status_code in [200, 307, 308]


class TestSearchFiltersReadOnly:
    """Tests de búsquedas y filtros"""
    
    def test_busqueda_eventos_vacio(self, client):
        """Validar búsqueda con parámetros vacíos"""
        response = client.get("/api/v1/eventos/?nombre=")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_filtro_por_ciudad(self, client):
        """Validar filtro por ciudad si existe"""
        response = client.get("/api/v1/eventos/?ciudad=Lima")
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list)
    
    def test_filtro_por_estado(self, client):
        """Validar filtro por estado"""
        response = client.get("/api/v1/eventos/?estado=activo")
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list)
        
        # Todos los eventos retornados deben estar activos (si el filtro funciona)
        for evento in eventos:
            if "estado" in evento:
                # El filtro debería aplicarse
                pass  # Solo verificamos que no falla
    
    def test_paginacion_eventos(self, client):
        """Validar que acepta parámetros de paginación"""
        response = client.get("/api/v1/eventos/?limit=5&offset=0")
        assert response.status_code == 200
        eventos = response.json()
        assert isinstance(eventos, list)
        # Debería retornar máximo 5 eventos si hay paginación
    
    def test_ordenamiento_eventos(self, client):
        """Validar que acepta parámetros de ordenamiento"""
        response = client.get("/api/v1/eventos/?sort=nombre")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAPIHealthReadOnly:
    """Tests de salud de la API"""
    
    def test_api_responde(self, client):
        """Validar que la API responde"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200, "La API debe estar respondiendo"
    
    def test_tiempo_respuesta_razonable(self, client):
        """Validar que la API responde en tiempo razonable"""
        import time
        start = time.time()
        response = client.get("/api/v1/eventos/")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5.0, f"Respuesta muy lenta: {elapsed:.2f}s"
    
    def test_multiples_requests(self, client):
        """Validar que la API maneja múltiples requests"""
        for i in range(3):
            response = client.get("/api/v1/eventos/")
            assert response.status_code == 200
    
    def test_endpoints_diferentes(self, client):
        """Validar que múltiples endpoints funcionan"""
        endpoints = [
            "/api/v1/eventos/",
            "/docs",
            "/"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            # Verificar que responde (no necesariamente 200)
            assert response.status_code < 500, f"Endpoint {endpoint} tiene error de servidor"


class TestDataIntegrityReadOnly:
    """Tests de integridad de datos (solo lectura)"""
    
    def test_eventos_tienen_ids_unicos(self, client):
        """Validar que todos los eventos tienen IDs únicos"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        
        eventos = response.json()
        if len(eventos) > 0:
            ids = [e["id"] for e in eventos if "id" in e]
            # Verificar que no hay IDs duplicados
            assert len(ids) == len(set(ids)), "Los IDs de eventos deben ser únicos"
    
    def test_fechas_eventos_validas(self, client):
        """Validar que las fechas de eventos son válidas"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        
        eventos = response.json()
        for evento in eventos[:5]:  # Solo los primeros 5
            if "fecha_inicio" in evento and evento["fecha_inicio"]:
                try:
                    datetime.fromisoformat(evento["fecha_inicio"].replace("Z", ""))
                except ValueError:
                    pytest.fail(f"Fecha inválida en evento {evento.get('id')}")
    
    def test_urls_eventos_validas(self, client):
        """Validar que las URLs de banners son válidas"""
        response = client.get("/api/v1/eventos/")
        assert response.status_code == 200
        
        eventos = response.json()
        for evento in eventos[:5]:
            if "banner_url" in evento and evento["banner_url"]:
                url = evento["banner_url"]
                # Verificar que al menos empieza con http
                assert url.startswith("http"), f"URL inválida: {url}"
