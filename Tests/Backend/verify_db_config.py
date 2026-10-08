import sys
import os
from pathlib import Path

# Add Backend to path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from database import Database

def verify():
    print(f"TEST_DB_TYPE={os.getenv('TEST_DB_TYPE')}")
    engine = Database.get_engine()
    print(f"Engine: {engine}")
    
    # Check if listener is registered
    from sqlalchemy import event
    # This is hard to check programmatically without accessing internal listeners
    # But we can try to connect
    try:
        conn = engine.connect()
        print("Connected successfully.")
        from sqlalchemy import text
        # Try to query TickifyDB
        result = conn.execute(text("SELECT 1 FROM TickifyDB.usuarios LIMIT 1"))
        print("Query TickifyDB.usuarios success.")
        conn.close()
    except Exception as e:
        print(f"Connection/Query failed: {e}")

if __name__ == "__main__":
    verify()
