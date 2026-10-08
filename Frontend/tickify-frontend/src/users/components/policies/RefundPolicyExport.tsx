import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, Download } from "lucide-react";
import axios from "axios";
import { useNotificationContext } from "@/contexts/NotificationContext";

/**
 * Este componente ahora:
 * 1. Genera un PDF desde el formulario.
 * 2. Permite subir (registrar) ese PDF usando el endpoint POST /api/v1/eventos/politica-devolucion/
 *    con campos: evento_id (form-data) y pdf (multipart).
 * 3. Muestra una vista previa del PDF generado después de subirlo.
 * 4. Obtiene el NOMBRE del evento para mostrarlo en el PDF (en lugar de "Evento ID").
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_URL = `${BASE_URL}/api/v1`;
const UPLOAD_ENDPOINT = `${API_URL}/eventos/politica-devolucion/`;

type PolicyForm = {
  windowType: "before_event" | "after_purchase";
  days: number;
  feeEnabled: boolean;
  feePercent: number;
  excludeDiscounts: boolean;
  excludedZonesText: string;
  customNotes: string;
};

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RefundPolicyExport({ eventId }: { eventId: number }) {
  const { success, error: showError } = useNotificationContext();
  const [savingPdf, setSavingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nombre del evento (cargado desde API)
  const [eventName, setEventName] = useState<string>("");

  const [form, setForm] = useState<PolicyForm>({
    windowType: "before_event",
    days: 7,
    feeEnabled: false,
    feePercent: 0,
    excludeDiscounts: false,
    excludedZonesText: "",
    customNotes: ""
  });

  // Cargar nombre del evento
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/eventos/${eventId}`, {
          headers: { ...authHeaders(), Accept: "application/json" },
          withCredentials: false,
        });
        const data = res.data && (res.data.data ?? res.data);
        const name =
          data?.nombre ??
          data?.evento?.nombre ??
          data?.name ??
          data?.titulo ??
          "";
        if (mounted) setEventName(String(name || ""));
      } catch (e) {
        // Silencioso: si falla, usamos fallback con el ID
        if (mounted) setEventName("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const summary = (() => {
    const parts: string[] = [];
    if (form.windowType === "before_event") {
      parts.push(`Se aceptan devoluciones hasta ${form.days} día(s) antes de que inicie el evento.`);
    } else {
      parts.push(`Se aceptan devoluciones dentro de ${form.days} día(s) posteriores a la compra.`);
    }
    if (form.feeEnabled && form.feePercent > 0) {
      parts.push(`Se aplica una comisión del ${form.feePercent.toFixed(1)}%.`);
    } else {
      parts.push("No se aplica comisión.");
    }
    if (form.excludeDiscounts) {
      parts.push("No se aceptan devoluciones de compras realizadas con códigos de descuento.");
    }
    if (form.excludedZonesText.trim()) {
      parts.push(`Zonas excluidas: ${form.excludedZonesText.trim()}.`);
    }
    if (form.customNotes.trim()) {
      parts.push(`Notas adicionales: ${form.customNotes.trim()}.`);
    }
    return parts.join(" ");
  })();

  async function generatePDF() {
    try {
      setSavingPdf(true);
      setError(null);
      setStatusMsg(null);

      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF("p", "pt", "a4");
      const M = 40;
      let y = 50;

      // Título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Política de Devoluciones", M, y);

      // Nombre del evento (en lugar de "Evento ID")
      const nameLine = eventName && eventName.trim().length > 0 ? eventName : `Evento #${eventId}`;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nameLine, M, y + 18);

      // Metadata de generación
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const now = new Date();
      doc.text(
        `Generado: ${now.toLocaleDateString("es-PE")} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        M,
        y + 32
      );
      y += 50;

      // Sección: Resumen
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen", M, y);
      y += 18;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const wrap = doc.splitTextToSize(summary, doc.internal.pageSize.getWidth() - M * 2);
      doc.text(wrap, M, y);
      y += wrap.length * 14 + 10;

      // Sección: Detalle
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detalle de Configuración", M, y);
      y += 18;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const rows: [string, string][] = [
        ["Tipo de ventana", form.windowType === "before_event" ? "Antes del evento" : "Después de la compra"],
        ["Días", String(form.days)],
        ["Comisión activa", form.feeEnabled ? "Sí" : "No"],
        ["% Comisión", form.feeEnabled ? `${form.feePercent.toFixed(1)}%` : "0%"],
        ["Excluir compras con descuento", form.excludeDiscounts ? "Sí" : "No"],
        ["Zonas excluidas", form.excludedZonesText.trim() || "—"],
        ["Notas adicionales", form.customNotes.trim() || "—"]
      ];

      rows.forEach(([label, value]) => {
        const line = `${label}: ${value}`;
        const parts = doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - M * 2);
        if (y + parts.length * 14 > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          y = 50;
        }
        doc.text(parts, M, y);
        y += parts.length * 14 + 4;
      });

      doc.setFontSize(9);
      doc.setTextColor(120);
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = doc.internal.pageSize.getHeight() - 30;
      }
      doc.text(
        "Este documento es informativo y debe comunicarse a los compradores antes de la venta.",
        M,
        doc.internal.pageSize.getHeight() - 30
      );

      // Generar blob y file para subir
      const pdfBlob = doc.output("blob");
      const fileName = `politica_devoluciones_evento_${eventId}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl); // limpiar anterior

      setGeneratedBlobUrl(blobUrl);
      setGeneratedFile(file);
      setStatusMsg("PDF generado correctamente. Puedes guardarlo en el servidor.");
    } catch (e) {
      console.error("Error generando PDF:", e);
      setError("No se pudo generar el PDF.");
    } finally {
      setSavingPdf(false);
    }
  }

  async function uploadGeneratedPDF() {
    if (!generatedFile) {
      setError("No hay PDF generado para subir. Genera el PDF primero.");
      return;
    }
    setUploading(true);
    setError(null);
    setStatusMsg(null);
    try {
      const formData = new FormData();
      formData.append("pdf", generatedFile, generatedFile.name);

      // evento_id debe ir como query parameter, no en FormData
      await axios.post(`${UPLOAD_ENDPOINT}?evento_id=${eventId}`, formData, {
        headers: {
          ...authHeaders(),
          Accept: "application/json",
        },
        withCredentials: false,
      });

      setUploaded(true);
      success("Política de devolución subida y registrada exitosamente");

      // Opcional: notificar a un contenedor (RefundPolicyManager) si lo usas
      try {
        window.dispatchEvent(new CustomEvent("refundPolicy:uploaded", { detail: { fileName: generatedFile.name } }));
      } catch {}
    } catch (e: any) {
      console.error("Error subiendo PDF:", e);
      let msg = "Error al subir la política. Intenta nuevamente.";
      
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

  function downloadGenerated() {
    if (!generatedFile || !generatedBlobUrl) {
      setError("No hay PDF generado para descargar.");
      return;
    }
    const a = document.createElement("a");
    a.href = generatedBlobUrl;
    a.download = generatedFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function resetForm() {
    setForm({
      windowType: "before_event",
      days: 7,
      feeEnabled: false,
      feePercent: 0,
      excludeDiscounts: false,
      excludedZonesText: "",
      customNotes: ""
    });
    setGeneratedFile(null);
    if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl);
    setGeneratedBlobUrl(null);
    setStatusMsg(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Política de Devoluciones</h3>
        <p className="text-sm text-muted-foreground">
          Completa el formulario y genera un PDF con la política. Luego podrás registrarlo en el servidor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="windowType" className="text-xs font-medium uppercase text-gray-500">Tipo Ventana</label>
          <select
            id="windowType"
            className="border rounded px-2 py-2 text-sm w-full"
            value={form.windowType}
            onChange={(e) => setForm((f) => ({ ...f, windowType: e.target.value as any }))}
          >
            <option value="before_event">Antes del evento</option>
            <option value="after_purchase">Después de la compra</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="days" className="text-xs font-medium uppercase text-gray-500">Días</label>
          <input
            id="days"
            type="number"
            min={0}
            className="border rounded px-2 py-2 text-sm w-full"
            placeholder="Número de días"
            title="Número de días para aceptar devoluciones"
            value={form.days}
            onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-gray-500 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.feeEnabled}
              onChange={(e) => setForm((f) => ({ ...f, feeEnabled: e.target.checked }))}
            />
            Comisión
          </label>
          <input
            id="feePercent"
            type="number"
            step={0.1}
            min={0}
            max={100}
            disabled={!form.feeEnabled}
            className="border rounded px-2 py-2 text-sm w-full"
            placeholder="Porcentaje de comisión"
            title="Porcentaje de comisión"
            value={form.feePercent}
            onChange={(e) => setForm((f) => ({ ...f, feePercent: Number(e.target.value) }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-gray-500 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.excludeDiscounts}
              onChange={(e) => setForm((f) => ({ ...f, excludeDiscounts: e.target.checked }))}
            />
            Excluir descuentos
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase text-gray-500">Zonas Excluidas (texto libre)</label>
          <input
            type="text"
            className="border rounded px-2 py-2 text-sm w-full"
            placeholder="Ej: VIP, Platea"
            value={form.excludedZonesText}
            onChange={(e) => setForm((f) => ({ ...f, excludedZonesText: e.target.value }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase text-gray-500">Notas Adicionales</label>
          <textarea
            rows={3}
            className="border rounded px-2 py-2 text-sm w-full resize-y"
            placeholder="Ej: No se aceptan devoluciones en las últimas 24 horas..."
            value={form.customNotes}
            onChange={(e) => setForm((f) => ({ ...f, customNotes: e.target.value }))}
          />
        </div>
      </div>

      <div className="bg-gray-50 border rounded p-4 text-sm leading-relaxed">
        <span className="font-medium">Vista previa del texto: </span>
        {summary}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {statusMsg && <div className="text-sm text-green-600">{statusMsg}</div>}

      {/* Acciones de generación y subida */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          onClick={generatePDF}
          className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-70"
          disabled={savingPdf || uploading}
        >
          {savingPdf ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Generando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <UploadCloud size={16} /> Generar PDF
            </span>
          )}
        </Button>
        <Button
          onClick={uploadGeneratedPDF}
          className={`${uploaded ? 'bg-green-600 hover:bg-green-600' : 'bg-black hover:bg-black/90'} text-white disabled:opacity-70`}
          disabled={!generatedFile || uploading || uploaded}
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Subiendo...
            </span>
          ) : uploaded ? (
            <span className="inline-flex items-center gap-2">
              ✓ Política Guardada
            </span>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>

      {/* Vista previa del PDF generado */}
      {generatedBlobUrl && (
        <div className="border rounded mt-4 overflow-hidden" style={{ height: 460 }}>
          <object data={generatedBlobUrl} type="application/pdf" width="100%" height="100%">
            <div className="p-4 text-sm text-gray-600">
              Vista previa no disponible.{" "}
              <button onClick={downloadGenerated} className="underline text-blue-600">
                Descargar PDF
              </button>
            </div>
          </object>
        </div>
      )}
    </div>
  );
}