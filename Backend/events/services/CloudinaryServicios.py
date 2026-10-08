import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET")
)

def upload_image(file, folder="banners", public_id: str = None):
    """
    Sube una imagen a Cloudinary. Si se proporciona public_id, sobrescribe la imagen existente.
    """
    options = {
        "folder": folder,
        "resource_type": "image"
    }
    
    if public_id:
        options["public_id"] = public_id
        options["overwrite"] = True 
        
    result = cloudinary.uploader.upload(
        file.file,
        **options
    )
    return result["secure_url"]

def upload_qr_image(qr_buffer, public_id: str, folder="qrs"):
    """Sube un QR generado en memoria a Cloudinary y devuelve la URL segura."""
    result = cloudinary.uploader.upload(
        qr_buffer,
        folder=folder,
        public_id=public_id,
        resource_type="image",
        format="png"
    )
    return result["secure_url"]

def upload_file(
    file,
    folder="archivos",
    public_id: str = None,
    resource_type="raw"
):
    """
    Sube un archivo a Cloudinary (PDFs, docs, imágenes, etc.)
    resource_type='raw' permite cualquier tipo de archivo.
    """

    options = {
        "folder": folder,
        "resource_type": resource_type   # raw = archivos como pdf, docx, zip, etc.
    }

    if public_id:
        options["public_id"] = public_id
        options["overwrite"] = True

    result = cloudinary.uploader.upload(
        file.file,
        **options
    )

    return result["secure_url"]

def upload_pdf(file, folder="politicas", public_id: str = None):
    return upload_file(
        file=file,
        folder=folder,
        public_id=public_id,
        resource_type="raw"  # necesario para PDFs
    )

def delete_file_from_cloudinary(public_id: str, resource_type="raw"):
    """
    Elimina un archivo de Cloudinary dado su public_id.
    resource_type='raw' es para PDFs, docs, etc.
    """
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type
        )
        return result
    except Exception as e:
        raise Exception(f"Error al eliminar archivo de Cloudinary: {str(e)}")