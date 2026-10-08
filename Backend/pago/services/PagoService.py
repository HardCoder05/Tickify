import random
import string
from datetime import datetime
from fastapi import HTTPException, status

from sqlalchemy import text
from sqlalchemy.orm import Session

from compras.models.Compra import Compra
from pago.models.Pago import Pago


def procesar_pago(db: Session, compra_id: int, metodo_pago: str, monto: float):
    """
    Procesa un pago usando el stored procedure sp_procesar_pago.
    El SP espera: compra_id, metodo_pago, monto
    """
    compra = db.query(Compra).filter(Compra.id == compra_id).first()
    if not compra:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Compra no encontrada')

    # Delegar lógica transaccional a la función SQL sp_procesar_pago
    try:
        # El stored procedure acepta: compra_id, metodo, monto, referencia
        # Vamos a verificar qué parámetros acepta el SP
        res = db.execute(text("SELECT * FROM sp_procesar_pago(:compra_id, :metodo, :monto, :referencia)"), {
            'compra_id': compra_id,
            'metodo': metodo_pago,
            'monto': monto,
            'referencia': None
        })
        row = res.fetchone()
        if not row:
            raise Exception('Error al procesar pago via SP')

        pago_id = row[0]
        # Commit para que la actualización de la compra y el pago sean visibles a otras sesiones
        db.commit()

        pago = db.query(Pago).filter(Pago.id == pago_id).first()
        if not pago:
            raise Exception('Pago creado pero no encontrado')

        db.refresh(pago)
        return pago

    except Exception:
        db.rollback()
        raise


def simular_pago(db: Session, compra_id: int, metodo_pago: str, monto: float, aprobado: bool = True):
    """
    Simula un pago sin integración con pasarela real.
    - Si aprobado=True: crea el pago y marca la compra como 'pagada'
    - Si aprobado=False: crea el pago con estado 'fallido' y marca la compra como 'fallida'
    """
    compra = db.query(Compra).filter(Compra.id == compra_id).first()
    if not compra:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Compra no encontrada')
    
    if compra.estado == 'pagada':
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='La compra ya está pagada')

    # Generar referencia simulada
    referencia = 'SIM-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

    try:
        if aprobado:
            # Simular pago exitoso: usar el stored procedure
            res = db.execute(text("SELECT * FROM sp_procesar_pago(:compra_id, :metodo, :monto, :referencia)"), {
                'compra_id': compra_id,
                'metodo': metodo_pago,
                'monto': monto,
                'referencia': referencia
            })
            row = res.fetchone()
            if not row:
                raise Exception('Error al simular pago exitoso via SP')
            
            pago_id = row[0]
            db.commit()
            
            pago = db.query(Pago).filter(Pago.id == pago_id).first()
            if not pago:
                raise Exception('Pago simulado creado pero no encontrado')
            
            db.refresh(pago)
            return pago
        else:
            # Simular pago fallido: crear pago manual con estado fallido
            nuevo_pago = Pago(
                compra_id=compra_id,
                metodo_pago=metodo_pago,  # Fixed: use correct column name
                monto=monto,
                fecha_pago=datetime.now(),  # Fixed: required field
                numero_de_transaccion=referencia,  # Fixed: use correct column name
                estado='fallido'
            )
            db.add(nuevo_pago)
            
            # Actualizar estado de compra a fallida
            compra.estado = 'fallida'
            db.commit()
            db.refresh(nuevo_pago)
            
            return nuevo_pago

    except Exception:
        db.rollback()
        raise

