from sqlalchemy import Column, BigInteger, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base  

class Notificacion(Base):
    __tablename__ = 'notificaciones'
    __table_args__ = {"schema": "TickifyDB"}  

    id = Column(BigInteger, primary_key=True)
    usuario_id = Column(BigInteger, ForeignKey("TickifyDB.usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(50))
    titulo = Column(Text, nullable=False)
    mensaje = Column(Text, nullable=False)
    link = Column(Text)
    datos_metadata = Column(JSON)
    fue_leida = Column(Boolean, nullable=False, server_default="false")
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="notificaciones")
