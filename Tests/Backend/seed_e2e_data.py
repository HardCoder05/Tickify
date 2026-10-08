import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add Backend to path
# Add Backend to path
ROOT_DIR = Path(__file__).parent.parent.parent / "Backend"
sys.path.insert(0, str(ROOT_DIR))

from database import Database, Base
from users.models.Usuario import Usuario
from users.models.Organizador import Organizador
from events.models.Evento import Evento
from events.models.Zona import Zona
from events.models.Etapa import Etapa
from tickets.models.TipoTicket import TipoTicket
from events.models.EventoFecha import EventoFecha
from events.models.CategoriaPublico import CategoriaPublico
from events.models.Notificacion import Notificacion
from events.models.Asiento import Asiento
from events.models.AsientoFecha import AsientoFecha
from tickets.models.Ticket import Ticket
from users.services.AutenticacionServicio import hash_password
from events.models.Tarifa import Tarifa
from compras.models.Compra import Compra

def seed_data():
    print("Seeding E2E data...")
    # Create tables if they don't exist
    Base.metadata.create_all(bind=Database.get_engine())
    
    db = Database.get_session()
    try:
        # 1. Create Organizer User
        org_email = "organizador@test.com"
        organizador = db.query(Usuario).filter(Usuario.correo == org_email).first()
        if not organizador:
            organizador = Usuario(
                nombres="Organizador",
                apellidos="Test",
                correo=org_email,
                password_hash=hash_password("org123"), # Valid hash matching conftest.py
                rol="ORGANIZADOR",
                fecha_registro=datetime.now()
            )
            db.add(organizador)
            db.flush()
            
            org_profile = Organizador(
                usuario_id=organizador.id,
                ruc="20123456789",
                razon_social="Empresa Test SAC",
                dni="12345678",
                telefono="987654321",
                direccion="Av. Test 123",
                sector="Tecnología",
                correo_organizacional="contacto@test.com",
                motivacion="Pruebas E2E",
                estado="activo"
            )
            db.add(org_profile)
            db.commit()
            print(f"Created organizer: {org_email}")
        else:
            print(f"Organizer {org_email} already exists")

        # 1.5 Create Client User
        client_email = "cliente@test.com"
        cliente = db.query(Usuario).filter(Usuario.correo == client_email).first()
        if not cliente:
            cliente = Usuario(
                nombres="Cliente",
                apellidos="Test",
                correo=client_email,
                password_hash=hash_password("cliente123"), # Valid hash for test
                rol="CLIENTE",
                fecha_registro=datetime.now()
            )
            db.add(cliente)
            db.commit()
            print(f"Created client: {client_email}")
        else:
            print(f"Client {client_email} already exists")

        # 2. Create Category (if needed)
        categoria = db.query(CategoriaPublico).first()
        if not categoria:
            categoria = CategoriaPublico(nombre="Concierto", descripcion="Conciertos")
            db.add(categoria)
            db.commit()
            print("Created category")

        # 3. Create Event
        event_name = "Evento E2E Test"
        evento = db.query(Evento).filter(Evento.nombre == event_name).first()
        if not evento:
            evento = Evento(
                organizador_id=organizador.id if organizador else 1, # Fallback
                categoria_publico_id=categoria.id if categoria else 1,
                nombre=event_name,
                descripcion="Evento para pruebas E2E",
                fecha_inicio=datetime.now() + timedelta(days=1),
                fecha_fin=datetime.now() + timedelta(days=2),
                ubicacion="Estadio Test",
                ciudad="Lima",
                estado="activo",
                capacidad_maxima=1000,
                fecha_creacion=datetime.now()
            )
            db.add(evento)
            db.flush()
            print(f"Created event: {event_name}")

            # 4. Create Zone
            zona = Zona(
                evento_id=evento.id,
                nombre="General",
                descripcion="Zona General",
                capacidad=500,
                precio_base=100.0,
                estado="activo"
            )
            db.add(zona)
            db.flush()
            
            # 5. Create Ticket Type
            tipo = TipoTicket(
                evento_id=evento.id,
                nombre="Entrada General",
                descripcion="Entrada estándar",
                incremento=0.0,
                estado="activo"
            )
            db.add(tipo)
            db.flush()
            
            # 6. Create Stage (Etapa) - Required for pricing?
            # Check models/Etapa.py
            etapa = Etapa(
                evento_id=evento.id,
                nombre="Venta Regular",
                fecha_inicio=datetime.now(),
                fecha_fin=datetime.now() + timedelta(days=2),
                porcentaje=0.0,
                estado="activo"
            )
            db.add(etapa)
            db.flush()
            
            # 7. Create Event Date
            fecha = EventoFecha(
                evento_id=evento.id,
                fecha_inicio=evento.fecha_inicio,
                fecha_fin=evento.fecha_fin,
                capacidad_maxima=1000,
                aforo_disponible=1000,
                estado="activo"
            )
            db.add(fecha)

            # 8. Create Seats (Asientos) and AsientoFecha
            # Create 10 seats for testing
            for i in range(1, 11):
                asiento = Asiento(
                    zona_id=zona.id,
                    fila=1,
                    numero=i,
                    estado="activo"
                )
                db.add(asiento)
                db.flush() # Need ID

                # Create AsientoFecha
                asiento_fecha = AsientoFecha(
                    asiento_id=asiento.id,
                    evento_fecha_id=fecha.id,
                    estado="libre"
                )
                db.add(asiento_fecha)

            # 9. Create Tarifa (Price)
            # Required for purchase
            tarifa = Tarifa(
                zona_id=zona.id,
                etapa_id=etapa.id,
                tipo_ticket_id=tipo.id,
                precio=100.0, # Base price
                cantidad=500, # Capacity
                estado="activo",
                nombre="Tarifa General"
            )
            db.add(tarifa)

            db.commit()
            print("Created event details (Zone, TicketType, Stage, Date, Seats, Tarifa)")
        else:
            print(f"Event {event_name} already exists")
            
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
