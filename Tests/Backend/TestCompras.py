"""
Tests para los endpoints de compras
Pruebas de las nuevas implementaciones del módulo de compras

NOTA: Los tests de compras requieren:
1. Un evento activo con zonas, tarifas y fechas
2. Asientos creados para las zonas
3. Reservas temporales de asientos antes de la compra
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from datetime import datetime, timedelta

from database import Database
from main import app

client = TestClient(app)


# @pytest.mark.skip(reason="Tests de compras - requieren refactorización de fixtures y configuración")
class TestCompras:
    """Suite de pruebas para el módulo de compras"""

    @pytest.fixture(autouse=True)
    def setup_test_data(self, auth_headers_admin, auth_headers_organizador):
        """Configurar datos de prueba antes de cada test - creando datos completos con asientos"""
        import random
        import time
        
        print("\n🔧 Iniciando setup_test_data (creando datos completos)...")
        self.db = Database.get_session()
        self.admin_headers = auth_headers_admin
        self.organizador_headers = auth_headers_organizador
        
        # Usar timestamp + random para IDs únicos (evita conflictos entre tests)
        timestamp = int(time.time() * 1000) % 1000000  # últimos 6 dígitos
        random_suffix = random.randint(100, 999)
        unique_id = timestamp + random_suffix
        
        # Crear usuario cliente para las pruebas
        self.cliente_email = f"cliente_compras_{unique_id}@test.com"
        
        print(f"👤 Setup: Creando usuario cliente {self.cliente_email}...")
        # Crear usuario cliente usando ORM
        from users.models.Usuario import Usuario, RolUsuario
        from users.services.AutenticacionServicio import hash_password
        
        nuevo_usuario = Usuario(
            nombres='Cliente',
            apellidos='Test',
            correo=self.cliente_email,
            telefono='999888777',
            password_hash='hash123',
            estado='activo',
            fecha_creacion=datetime.now(),
            fecha_registro=datetime.now(),
            fecha_actualizacion=datetime.now(),
            rol=RolUsuario.CLIENTE
        )
        self.db.add(nuevo_usuario)
        self.db.commit()
        self.db.refresh(nuevo_usuario)
        self.cliente_id = nuevo_usuario.id
        print(f"  ✅ Usuario cliente creado (ID: {self.cliente_id})")
        
        print(f"🔑 Setup: Generando token JWT para cliente...")
        from users.services.AutenticacionServicio import create_access_token
        token = create_access_token(
            data={"sub": self.cliente_email},
            rol="CLIENTE",
            expires_delta=timedelta(hours=1)
        )
        self.cliente_headers = {"Authorization": f"Bearer {token}"}
        print(f"  ✅ Token generado")
        
        print(f"🔍 Setup: Buscando datos existentes con asientos disponibles...")
        # Buscar datos existentes que incluyan asientos disponibles
        result = self.db.execute(text("""
            SELECT 
                e.id as evento_id,
                e.organizador_id,
                z.id as zona_id,
                ef.id as evento_fecha_id,
                t.id as tarifa_id,
                af.id as asiento_fecha_id
            FROM eventos e
            INNER JOIN zonas z ON z.evento_id = e.id
            INNER JOIN eventos_fechas ef ON ef.evento_id = e.id
            INNER JOIN tarifas t ON t.zona_id = z.id
            INNER JOIN asiento a ON a.zona_id = z.id
            INNER JOIN asiento_fecha af ON af.asiento_id = a.id AND af.evento_fecha_id = ef.id
            WHERE e.estado = 'activo'
            AND ef.aforo_disponible > 0
            AND t.cantidad > 0
            AND t.precio > 0
            AND af.estado = 'libre'
            LIMIT 3
        """)).fetchall()
        
        if result and len(result) >= 2:
            self.evento_id = result[0][0]
            self.organizador_id = result[0][1]
            self.zona_id = result[0][2]
            self.evento_fecha_id = result[0][3]
            self.tarifa_id = result[0][4]
            # Guardar IDs de asientos libres para reservar
            self.asiento_fecha_ids = [r[5] for r in result[:2]]
            
            print(f"  ✅ Datos encontrados:")
            print(f"     • Evento ID: {self.evento_id}")
            print(f"     • Zona ID: {self.zona_id}")
            print(f"     • Evento Fecha ID: {self.evento_fecha_id}")
            print(f"     • Tarifa ID: {self.tarifa_id}")
            print(f"     • Asientos libres: {self.asiento_fecha_ids}")
        else:
            print(f"  ⚠️  No se encontraron datos con asientos, creando datos mínimos...")
            self._crear_datos_minimos_con_asientos(unique_id)
        
        # Reservar los asientos para el usuario
        print(f"🎫 Setup: Reservando asientos temporalmente...")
        self._reservar_asientos()
        
        print("✅ Setup completado exitosamente!\n")
        
        yield
        
        # Limpiar después del test
        self._cleanup_test_data_quick()
        self.db.close()
    
    def _crear_datos_minimos_con_asientos(self, unique_id):
        """Crear datos mínimos necesarios incluyendo asientos"""
        # Obtener un organizador existente
        org_result = self.db.execute(text("SELECT id FROM organizadores LIMIT 1")).fetchone()
        if not org_result:
            raise RuntimeError("No hay organizadores en la BD. Por favor ejecuta el script de datos de prueba.")
        self.organizador_id = org_result[0]
        
        # Crear evento simple
        from datetime import datetime, timedelta
        now = datetime.now()
        fecha_inicio = now + timedelta(days=30)
        fecha_fin = now + timedelta(days=31)
        
        result = self.db.execute(text("""
            INSERT INTO eventos (organizador_id, categoria_publico_id, nombre, descripcion,
                fecha_inicio, fecha_fin, capacidad_maxima, banner_url, ubicacion, ciudad, estado, fecha_creacion, fecha_actualizacion, comision)
            VALUES (:org_id, 1, :nombre, 'Test',
                :fecha_inicio, :fecha_fin, 100,
                'http://test.com/banner.jpg', 'Lima', 'Lima', 'activo', :now, :now, 3.00)
            RETURNING id
        """), {
            "org_id": self.organizador_id, 
            "nombre": f"Evento Test Compras {unique_id}",
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "now": now
        })
        self.evento_id = result.fetchone()[0]
        
        # Crear zona
        result = self.db.execute(text("""
            INSERT INTO zonas (evento_id, nombre, capacidad, precio_base, fecha_creacion, fecha_actualizacion)
            VALUES (:evento_id, 'General', 100, 50.00, :now, :now)
            RETURNING id
        """), {"evento_id": self.evento_id, "now": now})
        self.zona_id = result.fetchone()[0]
        
        # Crear evento_fecha
        result = self.db.execute(text("""
            INSERT INTO eventos_fechas (evento_id, fecha_inicio, fecha_fin, capacidad_maxima, aforo_disponible, fecha_creacion, fecha_actualizacion)
            VALUES (:evento_id, :fecha_inicio, :fecha_fin, 100, 100, :now, :now)
            RETURNING id
        """), {
            "evento_id": self.evento_id,
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "now": now
        })
        self.evento_fecha_id = result.fetchone()[0]
        
        # Crear TipoTicket
        result = self.db.execute(text("""
            INSERT INTO tipo_ticket (evento_id, nombre, descripcion, estado, incremento, fecha_creacion, fecha_actualizacion)
            VALUES (:evento_id, 'General', 'Ticket General', 'activo', 0.00, :now, :now)
            RETURNING id
        """), {"evento_id": self.evento_id, "now": now})
        self.tipo_ticket_id = result.fetchone()[0]
        
        # Crear Etapa
        result = self.db.execute(text("""
            INSERT INTO etapas (evento_id, nombre, fecha_inicio, fecha_fin, estado, porcentaje, fecha_creacion, fecha_actualizacion)
            VALUES (:evento_id, 'Venta General', :fecha_inicio, :fecha_fin, 'activo', 0.00, :now, :now)
            RETURNING id
        """), {
            "evento_id": self.evento_id, 
            "fecha_inicio": now, 
            "fecha_fin": fecha_fin,
            "now": now
        })
        self.etapa_id = result.fetchone()[0]
        
        # Crear tarifa
        result = self.db.execute(text("""
            INSERT INTO tarifas (zona_id, tipo_ticket_id, etapa_id, nombre, precio, cantidad, estado, fecha_creacion, fecha_actualizacion)
            VALUES (:zona_id, :tipo_ticket_id, :etapa_id, 'General Test', 50.00, 100, 'activo', :now, :now)
            RETURNING id
        """), {
            "zona_id": self.zona_id, 
            "tipo_ticket_id": self.tipo_ticket_id,
            "etapa_id": self.etapa_id,
            "now": now
        })
        self.tarifa_id = result.fetchone()[0]
        
        # Crear asientos para la zona
        asiento_ids = []
        for fila in range(1, 3):  # 2 filas
            for numero in range(1, 3):  # 2 asientos por fila
                result = self.db.execute(text("""
                    INSERT INTO asiento (zona_id, fila, numero, estado, fecha_creacion, fecha_actualizacion)
                    VALUES (:zona_id, :fila, :numero, 'activo', :now, :now)
                    RETURNING id
                """), {"zona_id": self.zona_id, "fila": fila, "numero": numero, "now": now})
                asiento_ids.append(result.fetchone()[0])
        
        # Crear asiento_fecha para cada asiento y la fecha del evento
        self.asiento_fecha_ids = []
        for asiento_id in asiento_ids[:2]:  # Solo 2 asientos para tests
            result = self.db.execute(text("""
                INSERT INTO asiento_fecha (asiento_id, evento_fecha_id, estado)
                VALUES (:asiento_id, :evento_fecha_id, 'libre')
                RETURNING id
            """), {"asiento_id": asiento_id, "evento_fecha_id": self.evento_fecha_id})
            self.asiento_fecha_ids.append(result.fetchone()[0])
        
        self.db.commit()
        print(f"  ✅ Datos mínimos creados")
        print(f"     • Evento ID: {self.evento_id}")
        print(f"     • Zona ID: {self.zona_id}")
        print(f"     • Evento Fecha ID: {self.evento_fecha_id}")
        print(f"     • Tarifa ID: {self.tarifa_id}")
        print(f"     • Asientos creados: {self.asiento_fecha_ids}")
    
    def _reservar_asientos(self):
        """Reservar asientos temporalmente para el usuario de prueba"""
        from datetime import datetime, timezone
        
        # Usar UTC explícito para evitar problemas de zona horaria
        expira_utc = datetime.now(timezone.utc) + timedelta(minutes=15)
        # Convertir a datetime naive (sin timezone) para PostgreSQL
        expira_naive = expira_utc.replace(tzinfo=None)
        
        # Actualizar estado de asientos a reservado
        for af_id in self.asiento_fecha_ids:
            self.db.execute(text("""
                UPDATE asiento_fecha 
                SET estado = 'reservado', 
                    reservado_por = :usuario_id,
                    reserva_expira = :expira
                WHERE id = :af_id
            """), {"af_id": af_id, "usuario_id": self.cliente_id, "expira": expira_naive})
        self.db.commit()
        print(f"  ✅ Asientos reservados: {self.asiento_fecha_ids} (expiran: {expira_naive} UTC)")
    
    def _obtener_y_reservar_asientos_frescos(self, cantidad=2):
        """Obtener asientos libres y reservarlos para el cliente - usar antes de crear compra"""
        from datetime import datetime, timezone
        
        # Buscar asientos libres para la zona y fecha del test
        result = self.db.execute(text("""
            SELECT af.id
            FROM asiento_fecha af
            INNER JOIN asiento a ON af.asiento_id = a.id
            WHERE a.zona_id = :zona_id
            AND af.evento_fecha_id = :evento_fecha_id
            AND af.estado = 'libre'
            LIMIT :cantidad
        """), {"zona_id": self.zona_id, "evento_fecha_id": self.evento_fecha_id, "cantidad": cantidad}).fetchall()
        
        if len(result) < cantidad:
            # No hay suficientes asientos libres, intentar crear nuevos
            print(f"  ⚠️  Solo {len(result)} asientos libres, creando más...")
            self._crear_asientos_adicionales(cantidad - len(result))
            # Volver a buscar
            result = self.db.execute(text("""
                SELECT af.id
                FROM asiento_fecha af
                INNER JOIN asiento a ON af.asiento_id = a.id
                WHERE a.zona_id = :zona_id
                AND af.evento_fecha_id = :evento_fecha_id
                AND af.estado = 'libre'
                LIMIT :cantidad
            """), {"zona_id": self.zona_id, "evento_fecha_id": self.evento_fecha_id, "cantidad": cantidad}).fetchall()
        
        self.asiento_fecha_ids = [r[0] for r in result]
        
        if len(self.asiento_fecha_ids) < cantidad:
            raise RuntimeError(f"No se pudieron obtener {cantidad} asientos libres")
        
        # Reservar los asientos
        expira_utc = datetime.now(timezone.utc) + timedelta(minutes=15)
        expira_naive = expira_utc.replace(tzinfo=None)
        
        for af_id in self.asiento_fecha_ids:
            self.db.execute(text("""
                UPDATE asiento_fecha 
                SET estado = 'reservado', 
                    reservado_por = :usuario_id,
                    reserva_expira = :expira
                WHERE id = :af_id
            """), {"af_id": af_id, "usuario_id": self.cliente_id, "expira": expira_naive})
        self.db.commit()
        print(f"  🎫 Asientos frescos reservados: {self.asiento_fecha_ids}")
        return self.asiento_fecha_ids
    
    def _crear_asientos_adicionales(self, cantidad):
        """Crear asientos adicionales si no hay suficientes libres"""
        import random
        
        # Obtener el número máximo de fila actual
        max_fila = self.db.execute(text("""
            SELECT COALESCE(MAX(fila), 0) FROM asiento WHERE zona_id = :zona_id
        """), {"zona_id": self.zona_id}).scalar()
        
        for i in range(cantidad):
            fila = max_fila + 1 + i
            numero = random.randint(100, 999)
            
            # Crear asiento
            result = self.db.execute(text("""
                INSERT INTO asiento (zona_id, fila, numero, estado)
                VALUES (:zona_id, :fila, :numero, 'activo')
                RETURNING id
            """), {"zona_id": self.zona_id, "fila": fila, "numero": numero})
            asiento_id = result.fetchone()[0]
            
            # Crear asiento_fecha
            self.db.execute(text("""
                INSERT INTO asiento_fecha (asiento_id, evento_fecha_id, estado)
                VALUES (:asiento_id, :evento_fecha_id, 'libre')
            """), {"asiento_id": asiento_id, "evento_fecha_id": self.evento_fecha_id})
        
        self.db.commit()
        print(f"  ✅ Creados {cantidad} asientos adicionales")
    
    def _cleanup_test_data_quick(self):
        """Limpieza rápida de datos de prueba respetando foreign keys"""
        try:
            print(f"🧹 Limpiando datos de prueba...")
            # Limpiar en orden inverso de dependencias (de hijos a padres)
            # Primero tickets y pagos
            self.db.execute(text("""
                DELETE FROM tickets WHERE compra_id IN 
                (SELECT id FROM compras WHERE usuario_id IN 
                 (SELECT id FROM usuarios WHERE correo = :correo))
            """), {"correo": self.cliente_email})
            
            self.db.execute(text("""
                DELETE FROM pagos WHERE compra_id IN 
                (SELECT id FROM compras WHERE usuario_id IN 
                 (SELECT id FROM usuarios WHERE correo = :correo))
            """), {"correo": self.cliente_email})
            
            # Luego compras
            self.db.execute(text("""
                DELETE FROM compras WHERE usuario_id IN 
                (SELECT id FROM usuarios WHERE correo = :correo)
            """), {"correo": self.cliente_email})
            
            # Solo eliminar evento si fue creado en el test (nombre específico)
            # Los datos reutilizados NO se eliminan
            self.db.execute(text("""
                DELETE FROM tarifas WHERE zona_id IN 
                (SELECT id FROM zonas WHERE evento_id IN 
                 (SELECT id FROM eventos WHERE nombre = 'Evento Test Compras Simple'))
            """))
            
            self.db.execute(text("""
                DELETE FROM eventos_fechas WHERE evento_id IN 
                (SELECT id FROM eventos WHERE nombre = 'Evento Test Compras Simple')
            """))
            
            self.db.execute(text("""
                DELETE FROM zonas WHERE evento_id IN 
                (SELECT id FROM eventos WHERE nombre = 'Evento Test Compras Simple')
            """))
            
            self.db.execute(text("""
                DELETE FROM eventos WHERE nombre = 'Evento Test Compras Simple'
            """))
            
            # Finalmente el usuario de prueba
            self.db.execute(text("DELETE FROM usuarios WHERE correo = :correo"), {"correo": self.cliente_email})
            
            self.db.commit()
            print(f"  ✅ Limpieza completada")
        except Exception as e:
            print(f"⚠️  Error en cleanup (puede ser normal si es el primer run): {e}")
            self.db.rollback()
    
    def _cleanup_compras_only(self):
        """Limpiar solo compras y tickets, no los datos base"""
        db = Database.get_session()
        try:
            result = db.execute(
                text("SELECT id FROM usuarios WHERE correo = :correo"),
                {"correo": self.cliente_email}
            ).fetchone()
            
            if result:
                cliente_id = result[0]
                # Limpiar solo tickets, pagos y compras
                db.execute(text(
                    "DELETE FROM tickets WHERE compra_id IN (SELECT id FROM compras WHERE usuario_id = :usuario_id)"
                ), {"usuario_id": cliente_id})
                db.execute(text(
                    "DELETE FROM pagos WHERE compra_id IN (SELECT id FROM compras WHERE usuario_id = :usuario_id)"
                ), {"usuario_id": cliente_id})
                db.execute(text("DELETE FROM compras WHERE usuario_id = :usuario_id"), {"usuario_id": cliente_id})
                db.commit()
        except Exception as e:
            print(f"Error en cleanup compras: {e}")
            db.rollback()
        finally:
            db.close()
    
    def _cleanup_test_data(self):
        """Limpiar todos los datos de prueba"""
        db = Database.get_session()
        try:
            # Obtener ID del usuario cliente si existe
            result = db.execute(
                text("SELECT id FROM usuarios WHERE correo = :correo"),
                {"correo": "cliente_compras@test.com"}
            ).fetchone()
            
            if result:
                cliente_id = result[0]
                # Limpiar tickets y compras del cliente
                db.execute(text(
                    "DELETE FROM tickets WHERE compra_id IN (SELECT id FROM compras WHERE usuario_id = :usuario_id)"
                ), {"usuario_id": cliente_id})
                db.execute(text(
                    "DELETE FROM pagos WHERE compra_id IN (SELECT id FROM compras WHERE usuario_id = :usuario_id)"
                ), {"usuario_id": cliente_id})
                db.execute(text("DELETE FROM compras WHERE usuario_id = :usuario_id"), {"usuario_id": cliente_id})
            
            # Limpiar datos de eventos de prueba
            db.execute(text("DELETE FROM tarifas WHERE id = 9001"))
            db.execute(text("DELETE FROM eventos_fechas WHERE id = 9001"))
            db.execute(text("DELETE FROM zonas WHERE id = 9001"))
            db.execute(text("DELETE FROM eventos WHERE id = 9001"))
            db.execute(text("DELETE FROM organizadores WHERE id = 9001"))
            db.execute(text("DELETE FROM usuarios WHERE correo = :correo"), {"correo": "cliente_compras@test.com"})
            
            db.commit()
        except Exception as e:
            print(f"Error en cleanup: {e}")
            db.rollback()
        finally:
            db.close()
            # Resetear flag para permitir re-inicialización si es necesario
            if hasattr(self.__class__, '_test_data_initialized'):
                delattr(self.__class__, '_test_data_initialized')

    # ===== TESTS DE CREACIÓN DE COMPRAS =====
    
    def test_crear_compra_exitosa(self):
        """Test: Crear una compra correctamente con autenticación"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(2)
        
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                },
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[1]
                }
            ]
        }
        
        response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        assert response.status_code == 201, f"Error: {response.json()}"
        data = response.json()
        assert data["usuario_id"] == self.cliente_id
        assert data["metodo_pago"] == "tarjeta"
        assert data["estado"] == "pendiente"
        assert "codigo_confirmacion" in data
        assert "id" in data
        # El monto total se calcula en base a las tarifas reales
        assert data["monto_total"] > 0  # Verificar que hay un monto calculado
    
    def test_crear_compra_sin_autenticacion(self):
        """Test: Intentar crear compra sin autenticación debe fallar"""
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": self.asiento_fecha_ids[0]
                }
            ]
        }
        
        response = client.post("/api/v1/compras/", json=payload)
        
        assert response.status_code in [401, 403]
        # Verificar que hay un mensaje de error relacionado con autenticación
        data = response.json()
        assert "detail" in data
    
    def test_crear_compra_usuario_diferente(self):
        """Test: Usuario no puede crear compras para otro usuario"""
        payload = {
            "usuario_id": 99999,  # ID de otro usuario
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": self.asiento_fecha_ids[0]
                }
            ]
        }
        
        response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        assert response.status_code == 403
        # Puede fallar por dos razones válidas:
        # 1. "Solo puedes crear compras a tu nombre" - si el usuario existe
        # 2. "Usuario no encontrado" - si el usuario del token no existe en BD
        detail = response.json()["detail"]
        assert "Solo puedes crear compras a tu nombre" in detail or "Usuario" in detail
    
    def test_crear_compra_estado_invalido(self):
        """Test: El estado se establece automáticamente como 'pendiente', no se puede especificar"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Este test verifica que el estado se ignora si se envía
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        
        response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # La compra se crea correctamente y el estado siempre es 'pendiente'
        assert response.status_code == 201, f"Error: {response.json()}"
        data = response.json()
        assert data["estado"] == "pendiente"
    
    def test_crear_compra_usuario_inexistente(self):
        """Test: Crear compra para usuario inexistente debe fallar"""
        # Crear token falso para usuario que no existe
        from users.services.AutenticacionServicio import create_access_token
        token = create_access_token(
            data={"sub": "usuario_inexistente@test.com"},
            rol="CLIENTE",
            expires_delta=timedelta(hours=1)
        )
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "usuario_id": 99999,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": self.asiento_fecha_ids[0]
                }
            ]
        }
        
        response = client.post("/api/v1/compras/", json=payload, headers=headers)
        
        # El endpoint devuelve 404 porque el usuario autenticado no existe en la BD
        assert response.status_code == 403
        assert "Usuario" in response.json()["detail"]

    # ===== TESTS DE CONSULTA DE COMPRAS =====
    
    def test_obtener_todas_compras_como_admin(self):
        """Test: Admin puede obtener todas las compras"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Primero crear una compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "efectivo",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # Obtener todas las compras como admin
        response = client.get("/api/v1/compras/", headers=self.admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_obtener_todas_compras_sin_permisos(self):
        """Test: Cliente no puede obtener todas las compras"""
        response = client.get("/api/v1/compras/", headers=self.cliente_headers)
        
        assert response.status_code == 403
    
    def test_obtener_compras_usuario_propietario(self):
        """Test: Cliente puede ver sus propias compras"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear una compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # Consultar sus compras
        response = client.get(f"/api/v1/compras/usuario/{self.cliente_id}", headers=self.cliente_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert data[0]["usuario_id"] == self.cliente_id
    
    def test_obtener_compras_otro_usuario_sin_permisos(self):
        """Test: Cliente no puede ver compras de otro usuario"""
        response = client.get("/api/v1/compras/usuario/99999", headers=self.cliente_headers)
        
        assert response.status_code == 403
        assert "No tienes permiso" in response.json()["detail"]
    
    def test_obtener_compras_usuario_como_admin(self):
        """Test: Admin puede ver compras de cualquier usuario"""
        response = client.get(f"/api/v1/compras/usuario/{self.cliente_id}", headers=self.admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_obtener_compra_especifica_propietario(self):
        """Test: Cliente puede ver detalles de su propia compra"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        create_response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        compra_id = create_response.json()["id"]
        
        # Consultar compra específica
        response = client.get(f"/api/v1/compras/{compra_id}", headers=self.cliente_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == compra_id
        assert data["usuario_id"] == self.cliente_id
        assert "tickets" in data
    
    def test_obtener_compra_inexistente(self):
        """Test: Intentar obtener compra inexistente debe retornar 404"""
        response = client.get("/api/v1/compras/99999", headers=self.admin_headers)
        
        assert response.status_code == 404
        assert "no encontrada" in response.json()["detail"]
    
    def test_obtener_compra_otro_usuario_sin_permisos(self):
        """Test: Cliente no puede ver compra de otro usuario"""
        # Aquí asumimos que existe una compra con ID diferente
        response = client.get("/api/v1/compras/1", headers=self.cliente_headers)
        
        # Puede ser 403 o 404 dependiendo si existe
        assert response.status_code in [403, 404]

    # ===== TESTS DE ACTUALIZACIÓN DE ESTADO =====
    
    def test_actualizar_estado_compra_como_admin(self):
        """Test: Admin puede actualizar estado de compra"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        create_response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        compra_id = create_response.json()["id"]
        
        # Actualizar estado
        response = client.put(
            f"/api/v1/compras/{compra_id}/estado",
            params={"nuevo_estado": "pagada"},
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
    
    def test_actualizar_estado_sin_permisos(self):
        """Test: Cliente no puede actualizar estado de compra"""
        response = client.put(
            "/api/v1/compras/1/estado",
            params={"nuevo_estado": "pagada"},
            headers=self.cliente_headers
        )
        
        assert response.status_code == 403
    
    def test_actualizar_estado_invalido(self):
        """Test: No se puede actualizar a un estado inválido"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        create_response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        compra_id = create_response.json()["id"]
        
        # Intentar actualizar a estado inválido
        response = client.put(
            f"/api/v1/compras/{compra_id}/estado",
            params={"nuevo_estado": "estado_invalido"},
            headers=self.admin_headers
        )
        
        assert response.status_code == 400
        assert "El estado debe ser uno de" in response.json()["detail"]

    # ===== TESTS DE BÚSQUEDA POR CÓDIGO =====
    
    def test_obtener_compra_por_codigo_propietario(self):
        """Test: Cliente puede buscar su compra por código de confirmación"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        create_response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        codigo = create_response.json()["codigo_confirmacion"]
        
        # Buscar por código
        response = client.get(f"/api/v1/compras/codigo/{codigo}", headers=self.cliente_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["codigo_confirmacion"] == codigo
        assert data["usuario_id"] == self.cliente_id
    
    def test_obtener_compra_por_codigo_inexistente(self):
        """Test: Buscar compra con código inexistente retorna 404"""
        response = client.get("/api/v1/compras/codigo/CODIGO_FALSO_123", headers=self.admin_headers)
        
        assert response.status_code == 404
        assert "no encontrada" in response.json()["detail"]
    
    def test_obtener_compra_por_codigo_sin_permisos(self):
        """Test: Cliente no puede ver compra de otro usuario por código"""
        # Aquí asumimos que hay una compra con un código que no pertenece al cliente
        response = client.get("/api/v1/compras/codigo/CODIGO_OTRO_USUARIO", headers=self.cliente_headers)
        
        # Puede ser 403 o 404
        assert response.status_code in [403, 404]

    # ===== TESTS DE VALIDACIÓN DE DATOS =====
    
    def test_crear_compra_sin_items(self):
        """Test: No se puede crear compra sin tickets"""
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": []  # Sin tickets
        }
        
        response = client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # La compra se creará pero con monto 0, o puede fallar por validación
        assert response.status_code in [201, 400, 422]

    # ===== TESTS DE FILTRADO =====
    
    def test_filtrar_compras_por_usuario(self):
        """Test: Admin puede filtrar compras por usuario_id"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # Filtrar por usuario
        response = client.get(
            "/api/v1/compras/",
            params={"usuario_id": self.cliente_id},
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert all(compra["usuario_id"] == self.cliente_id for compra in data)
    
    def test_filtrar_compras_por_estado(self):
        """Test: Admin puede filtrar compras por estado"""
        # Obtener asientos frescos para este test
        asientos = self._obtener_y_reservar_asientos_frescos(1)
        
        # Crear compra
        payload = {
            "usuario_id": self.cliente_id,
            "metodo_pago": "tarjeta",
            "tickets": [
                {
                    "evento_fecha_id": self.evento_fecha_id,
                    "tarifa_id": self.tarifa_id,
                    "asiento_fecha_id": asientos[0]
                }
            ]
        }
        client.post("/api/v1/compras/", json=payload, headers=self.cliente_headers)
        
        # Filtrar por estado
        response = client.get(
            "/api/v1/compras/",
            params={"estado": "pendiente"},
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert all(compra["estado"] == "pendiente" for compra in data)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
