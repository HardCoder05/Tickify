import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { DiscountCreate, DiscountRead, DiscountType } from "@/users/types/discount";
import { createDiscount, fetchDiscountsByEvent, updateDiscount } from "@/users/services/DiscountService";

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onCreated?: (discount: DiscountRead) => void;
  onUpdated?: (discount: DiscountRead) => void;
  discountToEdit?: DiscountRead | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
};

function toISODate(dateStr: string, endOfDay = false) {
  if (!dateStr) return "";
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function parseLocalDate(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function todayIsoLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DiscountCreateModal({
  open,
  onClose,
  eventId,
  onCreated,
  onUpdated,
  discountToEdit = null,
  eventStartDate = null,
  eventEndDate = null,
}: Props) {
  const isEdit = !!discountToEdit?.id;

  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<DiscountType>("porcentaje");
  const [valor, setValor] = useState<string>("0");
  const [usosMaximos, setUsosMaximos] = useState<string>("0");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [activarAhora, setActivarAhora] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  useEffect(() => {
    if (!open) return;

    if (discountToEdit) {
      setCodigo(discountToEdit.codigo ?? "");
      setDescripcion(discountToEdit.descripcion ?? "");
      setTipo(((discountToEdit.tipo_descuento as DiscountType) || "porcentaje") as DiscountType);
      setValor(String(discountToEdit.valor ?? "0"));
      setUsosMaximos(String(discountToEdit.usos_maximos ?? "0"));

      const fi = discountToEdit.fecha_inicio ? new Date(discountToEdit.fecha_inicio) : new Date();
      const ff = discountToEdit.fecha_fin ? new Date(discountToEdit.fecha_fin) : new Date();
      const toYmd = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setFechaInicio(toYmd(fi));
      setFechaFin(toYmd(ff));

      const today = parseLocalDate(todayIsoLocalDate())!;
      const start = parseLocalDate(toYmd(fi));
      setActivarAhora((discountToEdit.estado?.toLowerCase() === "activo") && !!start && start <= today);
    } else {
      setCodigo((prev) => prev);
      setDescripcion("");
      setTipo("porcentaje");
      setValor("0");
      setUsosMaximos("0");
      setFechaInicio(todayIsoLocalDate());
      setFechaFin(todayIsoLocalDate());
      setActivarAhora(false);
    }

    setError(null);
    setFieldErrors({});
    setAttemptedSubmit(false);

    (async () => {
      try {
        const list = await fetchDiscountsByEvent(eventId);
        const codes = (list || []).map((d: any) => (d.codigo || "").toString().toLowerCase());
        setExistingCodes(codes);
      } catch {
        setExistingCodes([]);
      }
    })();
  }, [open, eventId, discountToEdit]);

  const valorHint = useMemo(() => {
    return tipo === "porcentaje" ? "Porcentaje de descuento (0-100)" : "Monto en moneda (ej. 10.00)";
  }, [tipo]);

  function validateAll(): Record<string, string> {
    const errs: Record<string, string> = {};
    const codigoTrim = (codigo || "").trim();

    if (!codigoTrim) {
      errs.codigo = "El código es obligatorio";
    } else {
      if (!/^[A-Za-z0-9_-]{3,50}$/.test(codigoTrim)) {
        errs.codigo = "Código inválido (usar 3-50 caracteres: letras, números, _ y -)";
      } else {
        const originalCode = discountToEdit?.codigo?.toString().toLowerCase() ?? null;
        if (
          existingCodes.length > 0 &&
          existingCodes.includes(codigoTrim.toLowerCase()) &&
          codigoTrim.toLowerCase() !== originalCode
        ) {
          errs.codigo = "Ya existe un código igual para este evento";
        }
      }
    }

    const descTrim = (descripcion || "").trim();
    if (!descTrim) errs.descripcion = "La descripción es obligatoria";
    else if (descTrim.length > 100) errs.descripcion = "La descripción no puede superar 100 caracteres";

    if (usosMaximos === "") {
      errs.usosMaximos = "El límite de usos es requerido (0 = ilimitado)";
    } else {
      const u = Number(usosMaximos);
      if (!Number.isInteger(u) || u < 0) errs.usosMaximos = "Límite de usos debe ser un entero ≥ 0";
    }

    const v = Number(valor);
    if (valor === "" || Number.isNaN(v)) {
      errs.valor = "Ingrese un valor válido";
    } else {
      if (tipo === "porcentaje") {
        if (v <= 0 || v > 100) errs.valor = "El porcentaje debe ser > 0 y ≤ 100";
      } else {
        if (v <= 0) errs.valor = "El monto debe ser mayor que 0";
      }
    }

    if (!activarAhora) {
      if (!fechaInicio) errs.fechaInicio = "Fecha de inicio obligatoria";
      if (!fechaFin) errs.fechaFin = "Fecha de fin obligatoria";
    }

    const today = parseLocalDate(todayIsoLocalDate())!;
    const start = fechaInicio ? parseLocalDate(fechaInicio) : null;
    const end = fechaFin ? parseLocalDate(fechaFin) : null;

    // SOLO creación: no permitir fecha pasada
    if (!isEdit && start && start < today) {
      errs.fechaInicio = "La fecha de inicio no puede ser anterior a hoy (solo al crear)";
    }

    if (start && end && end < start) {
      errs.fechaFin = "La fecha de fin no puede ser anterior a la fecha de inicio";
    }

    // Activar ahora no puede ser con fecha futura (en ambos modos)
    if (activarAhora && start && start > today) {
      errs.activarAhora = "No se puede activar inmediatamente si la fecha de inicio está en el futuro";
    }

    return errs;
  }

  async function checkCodeUnique(value: string) {
    const val = (value || "").trim();
    if (!val) return;
    const originalCode = discountToEdit?.codigo?.toString().toLowerCase() ?? null;
    if (existingCodes.includes(val.toLowerCase()) && val.toLowerCase() !== originalCode) {
      if (attemptedSubmit) {
        setFieldErrors((prev) => ({ ...prev, codigo: "Ya existe un código igual para este evento" }));
      }
      return;
    }
    if (attemptedSubmit) {
      setFieldErrors(validateAll());
    }
  }

  useEffect(() => {
    if (!attemptedSubmit) return;
    setFieldErrors(validateAll());
  }, [codigo, descripcion, usosMaximos, valor, fechaInicio, fechaFin, tipo, activarAhora, existingCodes, attemptedSubmit]);

  async function handleSubmit() {
    setError(null);
    setAttemptedSubmit(true);
    const errs = validateAll();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Corrige los errores del formulario antes de continuar");
      return;
    }

    setSubmitting(true);
    try {
      // LÓGICA DE FECHAS:
      // Creación + activarAhora: usar HOY (si usuario dio otra, se prioriza hoy para activación inmediata).
      // Edición + activarAhora: conservar la fechaInicio elegida (aunque sea pasada).
      const today = todayIsoLocalDate();
      const fechaInicioParaPayload =
        activarAhora
          ? (isEdit
              ? (fechaInicio || today)      // edición activa: no pisar fecha anterior
              : today)                      // creación activa: se fija a hoy
          : (fechaInicio || today);

      const fechaFinParaPayload =
        fechaFin || fechaInicioParaPayload || today;

      const payload: DiscountCreate = {
        codigo: codigo.trim().toUpperCase(),
        evento_id: eventId,
        descripcion: descripcion.trim(),
        tipo_descuento: tipo,
        valor: Number(Number(valor).toFixed(2)),
        usos_maximos: Number(usosMaximos),
        usos_actuales: discountToEdit ? Number(discountToEdit.usos_actuales ?? 0) : 0,
        estado: activarAhora ? "activo" : "inactivo",
        fecha_inicio: fechaInicioParaPayload,
        fecha_fin: fechaFinParaPayload,
      };

      console.log("Payload crear/actualizar descuento:", payload);

      if (discountToEdit) {
        const updated = await updateDiscount(discountToEdit.id, payload);
        onUpdated && onUpdated(updated as DiscountRead);
      } else {
        const created = await createDiscount(payload);
        onCreated && onCreated(created as DiscountRead);
      }
      onClose();
    } catch (e: any) {
      console.error("save discount error:", e, e?.response?.data ?? e?.body ?? null);
      const detail =
        e?.response?.data?.detail ??
        e?.response?.data?.message ??
        e?.body?.detail ??
        e?.body?.message ??
        (typeof e?.body === "object" ? JSON.stringify(e?.body) : e?.body) ??
        e?.message ??
        "Error desconocido";
      setError(`No se pudo guardar el código. ${e?.status ? `(status ${e.status}) ` : ""}${detail}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div ref={modalRef} className="w-full max-w-xl">
        <Card>
          <header className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">
              {isEdit ? "Editar Código Promocional" : "Agregar Código Promocional"}
            </h3>
            <button
              aria-label="Cerrar"
              onClick={() => (!submitting ? onClose() : null)}
              className="p-2 rounded hover:bg-muted"
            >
              <X size={18} />
            </button>
          </header>

          <CardContent className="p-6">
            {/* Código y Límite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="codigo" className="text-sm block mb-1">Código</label>
                <input
                  id="codigo"
                  ref={firstInputRef}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onBlur={() => checkCodeUnique(codigo)}
                  placeholder="PROM2025"
                  title="Código único que ingresarán los usuarios"
                  className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.codigo ? "border-red-500" : ""}`}
                />
                <p className="text-xs text-muted-foreground mt-1">Código único que ingresarán los usuarios</p>
                {attemptedSubmit && fieldErrors.codigo && <div className="text-xs text-red-600 mt-1">{fieldErrors.codigo}</div>}
              </div>

              <div>
                <label htmlFor="usosMaximos" className="text-sm block mb-1">Límite de Usos</label>
                <input
                  id="usosMaximos"
                  inputMode="numeric"
                  value={usosMaximos}
                  onChange={(e) => setUsosMaximos(e.target.value)}
                  placeholder="0"
                  title="Número máximo de usos (0 = ilimitado)"
                  className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.usosMaximos ? "border-red-500" : ""}`}
                />
                {attemptedSubmit && fieldErrors.usosMaximos && <div className="text-xs text-red-600 mt-1">{fieldErrors.usosMaximos}</div>}
              </div>
            </div>

            {/* Descripción */}
            <div className="mt-4">
              <label htmlFor="descripcion" className="text-sm block mb-1">Descripción</label>
              <input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el propósito de este código promocional"
                title="Descripción breve del cupón (máx 100 caracteres)"
                className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.descripcion ? "border-red-500" : ""}`}
              />
              <div className="flex justify-between text-xs mt-1">
                <div className="text-muted-foreground">Describe el propósito del código</div>
                <div className="text-muted-foreground">{(descripcion || "").length}/100</div>
              </div>
              {attemptedSubmit && fieldErrors.descripcion && <div className="text-xs text-red-600 mt-1">{fieldErrors.descripcion}</div>}
            </div>

            {/* Tipo y Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="tipo" className="text-sm block mb-1">Tipo de Descuento</label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as DiscountType)}
                  title="Selecciona el tipo de descuento"
                  aria-label="Tipo de descuento"
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="porcentaje">Porcentual (%)</option>
                  <option value="efectivo">Monto fijo (S/)</option>
                </select>
              </div>

              <div>
                <label htmlFor="valor" className="text-sm block mb-1">Valor del Descuento</label>
                <input
                  id="valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0"
                  title="Valor del descuento (porcentaje o monto según tipo)"
                  className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.valor ? "border-red-500" : ""}`}
                />
                <p className="text-xs text-muted-foreground mt-1">{valorHint}</p>
                {attemptedSubmit && fieldErrors.valor && <div className="text-xs text-red-600 mt-1">{fieldErrors.valor}</div>}
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label htmlFor="fechaInicio" className="text-sm block mb-1">Fecha de Inicio</label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  title="Fecha de inicio del descuento"
                  aria-label="Fecha de inicio"
                  className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.fechaInicio ? "border-red-500" : ""}`}
                  disabled={activarAhora && !isEdit}
                  min={todayIsoLocalDate()}
                  max={eventEndDate || undefined}
                />
                {attemptedSubmit && fieldErrors.fechaInicio && <div className="text-xs text-red-600 mt-1">{fieldErrors.fechaInicio}</div>}
              </div>
              <div>
                <label htmlFor="fechaFin" className="text-sm block mb-1">Fecha de Fin</label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  title="Fecha de fin del descuento"
                  aria-label="Fecha de fin"
                  className={`w-full border rounded px-3 py-2 ${attemptedSubmit && fieldErrors.fechaFin ? "border-red-500" : ""}`}
                  min={todayIsoLocalDate()}
                  max={eventEndDate || undefined}
                />
                {attemptedSubmit && fieldErrors.fechaFin && <div className="text-xs text-red-600 mt-1">{fieldErrors.fechaFin}</div>}
              </div>
            </div>

            {/* Toggle activar ahora */}
            <div className="mt-6 p-4 rounded border bg-muted/30">
              <div className="flex items-center gap-3">
                <input
                  id="activarAhora"
                  type="checkbox"
                  checked={activarAhora}
                  onChange={(e) => setActivarAhora(e.target.checked)}
                  aria-label="Activar código inmediatamente"
                  title="Activar código inmediatamente"
                />
                <label htmlFor="activarAhora" className="text-sm">Activar código inmediatamente</label>
              </div>
              {!activarAhora && (
                <p className="text-xs text-muted-foreground mt-1">
                  El código estará disponible para usar según las fechas configuradas
                </p>
              )}
              {attemptedSubmit && fieldErrors.activarAhora && <div className="text-xs text-red-600 mt-1">{fieldErrors.activarAhora}</div>}
            </div>

            {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                className="bg-white text-black border hover:bg-gray-100"
                onClick={() => (!submitting ? onClose() : null)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-yellow-400 text-black hover:bg-yellow-500"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear Código"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}