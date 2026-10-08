import { useState, useEffect } from "react"
import { uploadEventBanner } from "@/events/services/EventService";

type ImageDropzoneProps = { 
  onUpload?: (url: string) => void; // callback para devolver la URL 
  onFileSelect?: (file: File) => void; // callback para devolver el archivo seleccionado
  eventoId?: number | null; // si se pasa, se subirá la imagen al endpoint del evento
  initialUrl?: string | null; // si se pasa, mostrarla como preview inicial
  };

export default function ImageDropzone({onUpload, onFileSelect, eventoId = null, initialUrl = null}: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // keep preview in sync if initialUrl changes
  useEffect(() => {
    setPreview(initialUrl || null);
  }, [initialUrl]);

  const processFile = async (file: File) => {
    setErrorMsg(null)
    if (file) {
      console.log("📸 Archivo seleccionado:", file.name, "Tipo:", file.type);
      
      // Validate MIME type first (most reliable)
      const isJpegMime = file.type === "image/jpeg" || file.type === "image/jpg"
      // Fallback: validate extension if MIME type is empty or not trustworthy
      const nameLower = (file.name || "").toLowerCase()
      const hasJpgExt = nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")

      if (!isJpegMime && !hasJpgExt) {
        setErrorMsg("Formato no permitido. Solo se permiten imágenes JPG (.jpg/.jpeg)")
        return
      }

      const previewUrl = URL.createObjectURL(file);
      console.log("🖼️ Preview URL creada:", previewUrl);
      setPreview(previewUrl)

      // If parent provided an eventoId, upload to backend immediately
      if (eventoId) {
        console.log("☁️ Subiendo imagen al servidor para evento:", eventoId);
        setUploading(true);
        try {
          const result = await uploadEventBanner(eventoId, file);
          console.log("✅ Respuesta del servidor:", result);
          // Backend returns the full evento object with banner_url
          const remoteUrl = (result as any)?.banner_url ?? previewUrl;
          console.log("🔗 URL remota obtenida:", remoteUrl);
          setPreview(remoteUrl);
          if (onUpload) onUpload(remoteUrl);
        } catch (err) {
          console.error("❌ Error subiendo imagen:", err);
          // still call onUpload with preview so UI can show something
          if (onUpload) onUpload(previewUrl);
        } finally {
          setUploading(false);
        }
      } else {
        console.log("⚠️ No hay eventoId, guardando archivo para subir después");
        // Devolver el archivo al padre para que lo suba cuando sea necesario
        if (onFileSelect) onFileSelect(file);
        if (onUpload) onUpload(previewUrl);
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition ${
          isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 bg-white hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full object-cover rounded-lg"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-700">
              Arrastra y suelta una imagen o haz clic para subir
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Se recomienda una imagen de alta calidad
            </p>
            <span className="px-4 py-2 bg-gray-100 text-sm rounded border border-gray-300 hover:bg-gray-200 transition">
              Subir imagen
            </span>
          </div>
        )}
      </label>
      {uploading && (
        <div className="mt-2 text-sm text-gray-600">Subiendo imagen...</div>
      )}
      {errorMsg && (
        <div className="mt-2 text-sm text-red-600">{errorMsg}</div>
      )}
      <input
        id="file-upload"
        type="file"
        accept="image/jpeg,image/jpg,.jpg,.jpeg"
        className="hidden"
          onChange={handleFileChange}
      />
    </div>
  )
}
