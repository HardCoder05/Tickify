from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from database import Base


class AsientoFecha(Base):
    __tablename__ = "asiento_fecha"
    __table_args__ = {"schema": "TickifyDB"}

    id = Column(Integer, primary_key=True, index=True)

    asiento_id = Column(
        Integer,
        ForeignKey("TickifyDB.asiento.id", ondelete="CASCADE"),
        nullable=False
    )

    evento_fecha_id = Column(
        Integer,
        ForeignKey("TickifyDB.eventos_fechas.id", ondelete="CASCADE"),
        nullable=False
    )

    # Estado específico por fecha
    estado = Column(String(20), nullable=False, default="libre")
    # libre | reservado | vendido

    reservado_por = Column(
        Integer,
        ForeignKey("TickifyDB.usuarios.id"),
        nullable=True
    )

    reserva_expira = Column(DateTime, nullable=True)

    # ---- RELACIONES ----
    asiento = relationship("Asiento", back_populates="evento_fechas")
    evento_fecha = relationship("EventoFecha", back_populates="asientos")
    ticket = relationship("Ticket", back_populates="asiento_fecha", uselist=False)

    def __repr__(self):
        return (
            f"<AsientoFecha asiento={self.asiento_id} fecha={self.evento_fecha_id} "
            f"estado={self.estado} "
        )
