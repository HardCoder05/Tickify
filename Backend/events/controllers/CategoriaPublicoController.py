from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from events.models.CategoriaPublico import CategoriaPublico
from events.models.CategoriaPublicoEsquema import CategoriaPublicoCreate, CategoriaPublicoUpdate

def create_categoria(db: Session, categoria_data: CategoriaPublicoCreate) -> CategoriaPublico:
    nueva_categoria = CategoriaPublico(
        nombre=categoria_data.nombre,
        descripcion=categoria_data.descripcion,
        # estado y fechas son variables de sistema
    )
    db.add(nueva_categoria)
    db.commit()
    db.refresh(nueva_categoria)
    return nueva_categoria

def get_categoria_by_id(db: Session, categoria_id: int) -> Optional[CategoriaPublico]:
    return db.query(CategoriaPublico).filter(CategoriaPublico.id == categoria_id).first()

def get_all_categorias(db: Session, skip: int = 0, limit: int = 100) -> List[CategoriaPublico]:
    return db.query(CategoriaPublico).filter(CategoriaPublico.estado == True).offset(skip).limit(limit).all()

def update_categoria(db: Session, categoria: CategoriaPublico, categoria_data: CategoriaPublicoUpdate) -> CategoriaPublico:
    update_data = categoria_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(categoria, key, value)
        
    db.add(categoria) 
    db.commit()
    db.refresh(categoria)
    return categoria

def delete_categoria(db: Session, categoria: CategoriaPublico) -> CategoriaPublico:
    categoria.estado = False
    categoria.fecha_actualizacion = datetime.datetime.utcnow()
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria

