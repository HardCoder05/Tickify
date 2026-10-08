import sys
import os
from pathlib import Path
from sqlalchemy import text

# Add Backend to path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from database import Database, get_db
from conftest import cleanup_test_data

def verify_cleanup():
    print("Starting cleanup verification...")
    
    db = Database.get_session()
    try:
        # 1. Create dummy test data that SHOULD be cleaned up
        print("Creating test data...")
        
        # Create a test user
        test_email = "test_cleanup_verification@test.com"
        db.execute(text("""
            INSERT INTO "TickifyDB".usuarios (nombre, apellido, correo, contrasena, rol, fecha_registro)
            VALUES ('Test', 'Cleanup', :email, 'hash', 'CLIENTE', NOW())
            ON CONFLICT (correo) DO NOTHING
        """), {"email": test_email})
        
        # Create a test event
        test_event_name = "Evento Test Cleanup"
        db.execute(text("""
            INSERT INTO "TickifyDB".eventos (nombre, descripcion, organizador_id, estado, categoria_id)
            VALUES (:name, 'Test Description', 1, 'activo', 1)
        """), {"name": test_event_name})
        
        db.commit()
        print("Test data created.")
        
        # Verify data exists
        user_exists = db.execute(text("SELECT 1 FROM \"TickifyDB\".usuarios WHERE correo = :email"), {"email": test_email}).scalar()
        event_exists = db.execute(text("SELECT 1 FROM \"TickifyDB\".eventos WHERE nombre = :name"), {"name": test_event_name}).scalar()
        
        if not user_exists or not event_exists:
            print("ERROR: Failed to create test data!")
            return False
            
        print("Data existence verified. Running cleanup...")
        
        # 2. Run cleanup
        cleanup_test_data()
        
        # 3. Verify data is gone
        # Re-connect to check (cleanup might close connections)
        db.close()
        db = Database.get_session()
        
        user_exists_after = db.execute(text("SELECT 1 FROM \"TickifyDB\".usuarios WHERE correo = :email"), {"email": test_email}).scalar()
        event_exists_after = db.execute(text("SELECT 1 FROM \"TickifyDB\".eventos WHERE nombre = :name"), {"name": test_event_name}).scalar()
        
        if user_exists_after:
            print(f"ERROR: User {test_email} was NOT cleaned up!")
        else:
            print(f"SUCCESS: User {test_email} was cleaned up.")
            
        if event_exists_after:
            print(f"ERROR: Event {test_event_name} was NOT cleaned up!")
        else:
            print(f"SUCCESS: Event {test_event_name} was cleaned up.")
            
        if not user_exists_after and not event_exists_after:
            print("\nALL CLEANUP CHECKS PASSED!")
            return True
        else:
            return False
            
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = verify_cleanup()
    sys.exit(0 if success else 1)
