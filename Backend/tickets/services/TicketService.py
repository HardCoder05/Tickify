
from fastapi import HTTPException
import qrcode
from io import BytesIO
import base64

def validar_nuevo_estado_ticket(nuevo_estado: str):
    """Validación sencilla de estados permitidos para un ticket."""
    ESTADOS_TICKET = ['valido', 'usado', 'anulado', 'cancelado']
    if nuevo_estado not in ESTADOS_TICKET:
        raise HTTPException(status_code=400, detail=f"El estado debe ser uno de: {', '.join(ESTADOS_TICKET)}")


__all__ = ['validar_nuevo_estado_ticket']


def generate_qr_image(data_string: str) -> BytesIO:
    """
    Genera la imagen QR para la cadena de datos dada y la retorna como BytesIO.
    Esto permite subirla a Cloudinary sin guardar archivos en disco.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data_string)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)  # Volver al inicio del buffer
    return buffer