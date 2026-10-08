from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime,
    CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Asiento(Base):
    __tablename__ = "asiento"
    __table_args__ = (
    UniqueConstraint("zona_id", "fila", "numero", name="unique_asiento_layout"),
    {"schema": "TickifyDB"},
    )

    id = Column(Integer, primary_key=True, index=True)

    zona_id = Column(
        Integer,
        ForeignKey("TickifyDB.zonas.id", ondelete="CASCADE"),
        nullable=False
    )

    fila = Column(Integer, nullable=False)
    numero = Column(Integer, nullable=False)

    # Nuevo estado SOLO del layout, no de disponibilidad
    estado = Column(String(20), nullable=False, default="activo")
    # activo | eliminado

    fecha_creacion = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    fecha_actualizacion = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    
    # ---- RELACIONES ----
    zona = relationship("Zona", back_populates="asientos")

    # relación hacia asiento_fecha
    evento_fechas = relationship(
        "AsientoFecha",
        back_populates="asiento",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Asiento zona={self.zona_id} fila={self.fila} num={self.numero} estado={self.estado}>"
