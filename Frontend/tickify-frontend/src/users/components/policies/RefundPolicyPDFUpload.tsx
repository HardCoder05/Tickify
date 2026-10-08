import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, UploadCloud, Loader2 } from "lucide-react";
import axios from "axios";
import { useNotificationContext } from "@/contexts/NotificationContext";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_URL = `${BASE_URL}/api/v1`;
const UPLOAD_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;
const GET_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;
const DELETE_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export default function RefundPolicyPDFUpload({ eventId }: { eventId: number }) {
  const { success, error: showError, confirm } = useNotificationContext();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar PDF existente al montar el componente
  useEffect(() => {
    fetchExistingPolicy();
  }, [eventId]);

  async function fetchExistingPolicy() {
    try {
      const response = await axios.get(`${GET_ENDPOINT}?evento_id=${eventId}`, {
        headers: authHeaders(),
        withCredentials: false,
      });
      if (response.data?.url) {
        setExistingPdfUrl(response.data.url);
        setUploaded(true);
      }
    } catch (error: any) {
      // Si no hay política (404), no es un error crítico
      if (error?.response?.status !== 404) {
        console.error("Error al cargar política existente:", error);
      }
    }
  }

  function validateFile(file: File) {
    setError(null);
    if (!file) {
      setError("Archivo inválido.");
      return false;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se admiten archivos PDF.");
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`El archivo supera el tamaño máximo permitido (${Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB).`);
      return false;
    }
    return true;
  }

  async function handleFileSelect(file: File | null) {
    setError(null);
    setSuccessMsg(null);
    if (!file) return;
    if (!validateFile(file)) return;
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFileName(file.name);
      setFileSize(file.size);
      setFileObject(file);
    } catch (e) {
      console.error(e);
      setError("Error procesando el archivo.");
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    handleFileSelect(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFileSelect(f);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  async function uploadPolicy() {
    if (!fileObject) {
      setError("Selecciona un PDF antes de guardar.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append("pdf", fileObject, fileObject.name);

      // evento_id debe ir como query parameter, no en FormData
      const response = await axios.post(`${UPLOAD_ENDPOINT}?evento_id=${eventId}`, formData, {
        headers: {
          ...authHeaders(),
          Accept: "application/json",
          // Content-Type multipart lo setea axios automáticamente
        },
        withCredentials: false,
      });

      setUploaded(true);
      setExistingPdfUrl(response.data);
      success("Política de devolución cargada correctamente");
      
      // Notificar al componente padre para refrescar
      try {
        window.dispatchEvent(new CustomEvent("refundPolicy:uploaded", { detail: { fileName: fileObject.name } }));
      } catch {}
      
      // Limpiar selección local después de subir
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileObject(null);
    } catch (e: any) {
      console.error("Error subiendo PDF:", e);
      let msg = "No se pudo subir la política. Intenta nuevamente.";
      
      // Manejar errores de validación 422
      if (e?.response?.data?.detail) {
        const detail = e.response.data.detail;
        if (Array.isArray(detail)) {
          // Es un array de errores de validación de Pydantic
          msg = detail.map((err: any) => {
            const field = err.loc ? err.loc.join('.') : 'campo';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } else if (typeof detail === 'string') {
          msg = detail;
        } else {
          msg = JSON.stringify(detail);
        }
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      
      showError(msg);
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function removeLocalSelection() {
    const confirmed = await confirm({
      title: 'Descartar PDF',
      message: '¿Deseas descartar el PDF seleccionado (no elimina el ya subido al servidor)?',
      confirmText: 'Descartar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    if (!confirmed) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setFileSize(null);
    setFileObject(null);
    setSuccessMsg(null);
    setError(null);
  }

  async function deleteServerPolicy() {
    const confirmed = await confirm({
      title: 'Eliminar Política',
      message: '¿Estás seguro de eliminar la política de devolución del servidor? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await axios.delete(`${DELETE_ENDPOINT}?evento_id=${eventId}`, {
        headers: authHeaders(),
        withCredentials: false,
      });
      
      setExistingPdfUrl(null);
      setUploaded(false);
      success("Política de devolución eliminada correctamente");
      
      // Notificar al componente padre
      try {
        window.dispatchEvent(new CustomEvent("refundPolicy:deleted", { detail: { eventId } }));
      } catch {}
    } catch (e: any) {
      console.error("Error eliminando PDF:", e);
      let msg = "No se pudo eliminar la política. Intenta nuevamente.";
      if (e?.response?.data?.detail) {
        msg = e.response.data.detail;
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      showError(msg);
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  async function downloadCurrentPdf() {
    const urlToDownload = previewUrl || existingPdfUrl;
    if (!urlToDownload) {
      setError("No hay PDF para descargar.");
      return;
    }

    try {
      // Para blob URLs locales, descargar directamente
      if (previewUrl) {
        const a = document.createElement("a");
        a.href = previewUrl;
        a.download = fileName || `politica_devoluciones_evento_${eventId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Para URLs del servidor, hacer fetch y descargar
      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `politica_devoluciones_evento_${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      setError("Error al descargar el PDF.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Política de Devoluciones</h3>
        <p className="text-sm text-muted-foreground">
          Sube el PDF oficial con las condiciones de devolución para este evento.
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-dashed border-2 border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-white hover:bg-gray-50"
      >
        <UploadCloud className="w-10 h-10 text-gray-500 mb-3" />
        <div className="text-sm text-gray-700 mb-2">Arrastra y suelta el PDF aquí o selecciona desde tu equipo</div>
        <div className="flex gap-2">
          <label htmlFor="refund-policy-pdf-input">
            <Button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="px-3 py-2"
              type="button"
            >
              Seleccionar PDF
            </Button>
          </label>
          <input
            id="refund-policy-pdf-input"
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onInputChange}
            title="Seleccionar archivo PDF de política de devoluciones"
            aria-label="Seleccionar archivo PDF de política de devoluciones"
          />
        </div>
        <div className="text-xs text-gray-500 mt-3">
          Formato aceptado: PDF — Tamaño máximo: {Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {successMsg && <div className="text-sm text-green-600">{successMsg}</div>}

      {/* Mostrar PDF seleccionado localmente */}
      {previewUrl && (
        <div className="bg-white border rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Archivo seleccionado</div>
              <div className="font-medium">{fileName}</div>
              {fileSize !== null && (
                <div className="text-xs text-gray-500">{(fileSize / 1024).toFixed(1)} KB</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={downloadCurrentPdf}
                className="inline-flex items-center gap-2 px-3 py-2"
                title="Descargar PDF"
                disabled={!fileObject}
              >
                <Download size={14} /> Descargar
              </Button>
              <Button
                variant="outline"
                onClick={removeLocalSelection}
                className="inline-flex items-center gap-2 px-3 py-2"
                title="Descartar selección"
                disabled={uploading}
              >
                <Trash2 size={14} /> Quitar
              </Button>
            </div>
          </div>

            <div className="border rounded overflow-hidden" style={{ height: 420 }}>
              <object data={previewUrl} type="application/pdf" width="100%" height="100%">
                <div className="p-4 text-sm text-gray-600">
                  Vista previa no disponible.{" "}
                  <button onClick={downloadCurrentPdf} className="underline text-blue-600">
                    Descargar PDF
                  </button>
                </div>
              </object>
            </div>

          <div className="flex justify-end gap-3">
            <Button
              className="bg-black hover:bg-black/90 text-white disabled:opacity-70"
              onClick={uploadPolicy}
              disabled={uploading || !fileObject}
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Subiendo...
                </span>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Estado vacío: no hay PDF en servidor ni seleccionado */}
      {!existingPdfUrl && !previewUrl && (
        <div className="bg-white border rounded p-4 text-sm text-gray-600">
          No hay PDF seleccionado. Sube el documento oficial de la política de devoluciones.
        </div>
      )}
    </div>
  );
}