from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from users.services.AutenticacionServicio import role_required
from events.models.CategoriaPublicoEsquema import CategoriaPublicoCreate, CategoriaPublicoUpdate, CategoriaPublicoRead
from events.controllers.CategoriaPublicoController import (
    create_categoria, 
    get_categoria_by_id, 
    get_all_categorias, 
    update_categoria, 
    delete_categoria
)

router = APIRouter(
    prefix="/api/v1/categorias",
    tags=["Categorias de Público"]
)

@router.post("/", response_model=CategoriaPublicoRead, status_code=status.HTTP_201_CREATED)
def crear_categoria(categoria_data: CategoriaPublicoCreate, db: Session = Depends(get_db),
                    auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Crea una nueva categoría de público."""
    categorias_existentes = get_all_categorias(db)
    nombres_existentes = {c.nombre.lower() for c in categorias_existentes}

    if categoria_data.nombre.lower() in nombres_existentes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Categoría ya existe"
        )
    
    return create_categoria(db, categoria_data)

@router.get("/", response_model=List[CategoriaPublicoRead])
def obtener_categorias(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    """Obtiene una lista de categorías de público activas."""
    return get_all_categorias(db, skip=skip, limit=limit)

@router.get("/{categoria_id}", response_model=CategoriaPublicoRead)
def obtener_categoria_by_categoria_id(categoria_id: int, db: Session = Depends(get_db)):
    """Obtiene una categoría por su ID."""
    categoria = get_categoria_by_id(db, categoria_id)
    if not categoria or not categoria.estado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada o inactiva")
    return categoria

@router.patch("/{categoria_id}", response_model=CategoriaPublicoRead)
def actualizar_categoria(categoria_id: int, categoria_data: CategoriaPublicoUpdate, db: Session = Depends(get_db),
                         auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Actualiza parcialmente una categoría existente."""
    categoria = get_categoria_by_id(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    
    if categoria_data.nombre:
        categorias_existentes = get_all_categorias(db)

        nombres_existentes = {
            c.nombre.lower() for c in categorias_existentes if c.id != categoria_id
        }

        if categoria_data.nombre.lower() in nombres_existentes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoría ya existe"
            )
    return update_categoria(db, categoria, categoria_data)

@router.delete("/{categoria_id}", response_model=CategoriaPublicoRead)
def eliminar_categoria(categoria_id: int, db: Session = Depends(get_db),
                       auth_payload: dict = Depends(role_required(["ADMIN"]))):
    """Desactiva (Eliminación Lógica) una categoría por su ID."""
    from events.models.Evento import Evento
    categoria = get_categoria_by_id(db, categoria_id)
    if not categoria or not categoria.estado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada o ya inactiva")
    existe = db.query(Evento).filter(Evento.categoria_id == categoria_id, Evento.estado == "activo").first()
    if existe:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar la categoría porque tiene evento(s) asociado(s)."
        )
    return delete_categoria(db, categoria)