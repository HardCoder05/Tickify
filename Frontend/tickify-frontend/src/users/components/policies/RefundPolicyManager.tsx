import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle, RefreshCw, Download, UploadCloud, Edit3, Trash2 } from "lucide-react";
import RefundPolicyPDFUpload from "./RefundPolicyPDFUpload";
import RefundPolicyExport from "./RefundPolicyExport";
import axios from "axios";
import { useNotificationContext } from "@/contexts/NotificationContext";

/**
 * RefundPolicyManager:
 * Contenedor que ofrece dos caminos exclusivos:
 * - Subir PDF ya existente
 * - Generar PDF desde formulario y luego subir
 *
 * Si ya hay PDF subido (no tenemos GET aún, así que asumimos cuando usuario sube),
 * se muestra panel de "Política actual" con opciones para descargar o reemplazar.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_URL = `${BASE_URL}/api/v1`;
const GET_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;
const DELETE_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Props = { eventId: number };

export default function RefundPolicyManager({ eventId }: Props) {
  const { success, error: showError, confirm } = useNotificationContext();
  const [activeTab, setActiveTab] = useState<"upload" | "generate">("upload");
  const [hasUploaded, setHasUploaded] = useState(false);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const [justReplaced, setJustReplaced] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar política existente
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
        setPdfUrl(response.data.url);
        setHasUploaded(true);
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Error al cargar política existente:", error);
      }
    }
  }

  // Simple listener basado en CustomEvent opcional (si quieres disparar desde hijos)
  useEffect(() => {
    const uploadHandler = (e: Event) => {
      const ce = e as CustomEvent<{ fileName?: string }>;
      setHasUploaded(true);
      if (ce.detail?.fileName) setLastUploadedName(ce.detail.fileName);
      setJustReplaced(true);
      setTimeout(() => setJustReplaced(false), 3000);
      fetchExistingPolicy();
    };
    
    const deleteHandler = () => {
      setHasUploaded(false);
      setPdfUrl(null);
      setLastUploadedName(null);
    };
    
    window.addEventListener("refundPolicy:uploaded", uploadHandler);
    window.addEventListener("refundPolicy:deleted", deleteHandler);
    return () => {
      window.removeEventListener("refundPolicy:uploaded", uploadHandler);
      window.removeEventListener("refundPolicy:deleted", deleteHandler);
    };
  }, []);

  // Callback wrappers para marcar estado al terminar subida
  function onUploaded(fileName?: string) {
    setHasUploaded(true);
    if (fileName) setLastUploadedName(fileName);
    setJustReplaced(true);
    setTimeout(() => setJustReplaced(false), 3000);
  }

  async function downloadPdf() {
    if (!pdfUrl) return;
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = lastUploadedName || `politica_devoluciones_evento_${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      showError("Error al descargar el PDF.");
    }
  }

  async function deletePdf() {
    const confirmed = await confirm({
      title: 'Eliminar Política',
      message: '¿Estás seguro de eliminar la política de devolución del servidor? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await axios.delete(`${DELETE_ENDPOINT}?evento_id=${eventId}`, {
        headers: authHeaders(),
        withCredentials: false,
      });
      
      setPdfUrl(null);
      setHasUploaded(false);
      setLastUploadedName(null);
      success("Política de devolución eliminada correctamente");
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
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header / contexto */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Política de Devoluciones</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Elige una forma de registrar la política de devoluciones para este evento. Puedes subir un PDF ya aprobado
          por tu organización, o generar uno a partir de un formulario y luego guardarlo.
        </p>
      </div>

      {/* Panel de política actual (si ya se subió alguna vez) */}
      {hasUploaded && (
        <div className={`border rounded-md p-4 bg-green-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition
          ${justReplaced ? "ring-2 ring-green-400" : ""}`}>
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-green-700 mt-0.5" />
            <div>
              <div className="font-medium text-green-800">
                Política actual registrada
              </div>
              <div className="text-xs text-green-700">
                {lastUploadedName || "politica_devoluciones.pdf"} • Evento #{eventId}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={downloadPdf}
              disabled={!pdfUrl}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-green-700 border-green-200 font-medium shadow-sm"
              variant="outline"
              title="Descargar PDF"
            >
              <Download size={16} /> Descargar
            </Button>
            <Button
              onClick={deletePdf}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
              title="Eliminar política"
            >
              <Trash2 size={16} /> {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex bg-gray-100 rounded-full p-1">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2 text-sm rounded-full flex items-center gap-2 ${
            activeTab === "upload" ? "bg-white shadow font-medium" : "text-gray-600"
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Subir PDF existente
        </button>
        <button
          onClick={() => setActiveTab("generate")}
          className={`px-4 py-2 text-sm rounded-full flex items-center gap-2 ${
            activeTab === "generate" ? "bg-white shadow font-medium" : "text-gray-600"
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Generar y subir PDF
        </button>
      </div>

      {/* Contenido Tab */}
      <div className="border rounded-xl bg-white shadow-sm p-6">
        {activeTab === "upload" && (
          <div className="space-y-6">
            <div className="text-sm text-gray-700 leading-relaxed">
              Sube directamente el archivo PDF final de la política de devoluciones. Este método es ideal si ya tienes
              un documento oficial aprobado externamente.
            </div>
            {/* Se usa el componente original; puedes pasar un callback para marcar cuando termine */}
            <RefundPolicyPDFUpload eventId={eventId} />
            <div className="mt-4 text-xs text-gray-500">
              Una vez subido, podrás reemplazarlo o generar uno nuevo desde la pestaña “Generar y subir PDF”.
            </div>
          </div>
        )}

        {activeTab === "generate" && (
          <div className="space-y-6">
            <div className="text-sm text-gray-700 leading-relaxed">
              Completa el formulario para generar automáticamente un PDF con la política.
            </div>
            <RefundPolicyExport eventId={eventId} />
            <div className="mt-4 text-xs text-gray-500">
              Tras generar y subir, el PDF aparecerá como “Política actual registrada”.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}