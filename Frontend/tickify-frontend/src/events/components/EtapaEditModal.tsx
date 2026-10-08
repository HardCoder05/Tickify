import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { updateEtapa, getEtapasByEvento } from "../services/TariffService";

interface EtapaEditModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  etapa: any; // the etapa object to edit
  onUpdated?: (updated: any) => void;
}

export default function EtapaEditModal({ open, onClose, eventoId, etapa, onUpdated }: EtapaEditModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descuentoAdicional, setDescuentoAdicional] = React.useState<number | string>(0);
  const [fechaInicio, setFechaInicio] = React.useState<string | null>(null);
  const [fechaFin, setFechaFin] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Helper to extract date only (YYYY-MM-DD) from ISO datetime string
  const extractDateOnly = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      // Extract YYYY-MM-DD from ISO string
      return isoString.split('T')[0];
    } catch (e) {
      return null;
    }
  };

  // Populate fields when modal opens with etapa data
  React.useEffect(() => {
    if (open && etapa) {
      setNombre(String(etapa.nombre ?? ""));
      setDescuentoAdicional(etapa.porcentaje ?? etapa.descuento_adicional ?? 0);
      setFechaInicio(extractDateOnly(etapa.fecha_inicio));
      setFechaFin(extractDateOnly(etapa.fecha_fin));
      setError(null);
    } else if (!open) {
      // reset on close
      setNombre("");
      setDescuentoAdicional(0);
      setFechaInicio(null);
      setFechaFin(null);
      setError(null);
    }
  }, [open, etapa]);

  const dateOnlyToISO = (dateStr: string) => {
    const parts = (dateStr || "").split("-");
    if (parts.length !== 3) return new Date().toISOString();
    const y = Number(parts[0]);
    const mm = Number(parts[1]);
    const d = Number(parts[2]);
    // Build a naive local datetime string (no timezone designator) because the backend
    // performs comparisons with naive datetimes and mixing offset-aware (with 'Z') and
    // naive datetimes raises TypeError: can't compare offset-naive and offset-aware datetimes.
    const pad = (n: number) => String(n).padStart(2, '0');
    // Use local midnight (no 'Z' suffix)
    return `${y}-${pad(mm)}-${pad(d)}T00:00:00`;
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
      return;
    }
    if (!etapa || !etapa.id) {
      setError("No se especificó una etapa válida para editar");
      return;
    }
    if (!nombre || nombre.trim().length === 0) {
      setError("Ingresa un nombre para la etapa");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError("Ingresa fecha inicio y fin");
      return;
    }

    // Validar que no exista otra etapa con el mismo nombre (excluyendo la actual)
    try {
      const etapasExistentes = await getEtapasByEvento(Number(eventoId));
      const nombreNormalizado = nombre.trim().toLowerCase();
      const etapasDuplicadas = Array.isArray(etapasExistentes) 
        ? etapasExistentes.filter((e: any) => 
            e.id !== etapa.id && (e.nombre || '').trim().toLowerCase() === nombreNormalizado
          )
        : [];
      
      if (etapasDuplicadas.length > 0) {
        setError(`Ya existe otra etapa con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
        return;
      }

      // Validar que las fechas no se superpongan con otras etapas activas (excluyendo la actual)
      const inicioDate = new Date(fechaInicio + 'T00:00:00');
      const finDate = new Date(fechaFin + 'T23:59:59');
      
      if (finDate < inicioDate) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio.');
        return;
      }

      const etapasActivas = Array.isArray(etapasExistentes)
        ? etapasExistentes.filter((e: any) => 
            e.id !== etapa.id && e.estado?.toLowerCase() === 'activo'
          )
        : [];

      for (const etapaExistente of etapasActivas) {
        const etapaInicio = new Date(etapaExistente.fecha_inicio);
        const etapaFin = new Date(etapaExistente.fecha_fin);
        
        // Verificar si hay superposición: (inicio1 <= fin2) AND (fin1 >= inicio2)
        const haySuperposicion = inicioDate <= etapaFin && finDate >= etapaInicio;
        
        if (haySuperposicion) {
          const etapaNombre = etapaExistente.nombre || 'una etapa existente';
          const formatFecha = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
          setError(
            `El periodo seleccionado se superpone con "${etapaNombre}" (${formatFecha(etapaInicio)} - ${formatFecha(etapaFin)}). ` +
            `Las etapas de venta no pueden tener fechas superpuestas.`
          );
          return;
        }
      }
    } catch (err: any) {
      console.error('Error al validar etapas duplicadas:', err);
      // Continuar si no se puede validar
    }

    const descNum = Number(descuentoAdicional ?? 0);
    if (Number.isNaN(descNum) || descNum < -100 || descNum > 100) {
      setError("Ingresa un porcentaje válido entre -100 y 100");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        nombre: nombre.trim(),
        porcentaje: Number(isNaN(descNum) ? 0 : descNum),
        fecha_inicio: dateOnlyToISO(fechaInicio),
        fecha_fin: dateOnlyToISO(fechaFin),
      };

      // Debug: log the payload to see what we're sending
      console.log('EtapaEditModal - Payload being sent:', payload);

      const updated = await updateEtapa(Number(etapa.id), payload);
      console.log('✅ Etapa actualizada exitosamente:', updated);
      if (onUpdated) {
        console.log('🔄 Llamando onUpdated callback para refrescar lista');
        onUpdated(updated);
      }
      onClose();
    } catch (err: any) {
      console.error("❌ Error al actualizar etapa:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const serverMsg = err?.response?.data?.detail || err?.response?.data || err?.message;
      try {
        setError(typeof serverMsg === 'object' ? JSON.stringify(serverMsg) : String(serverMsg));
      } catch (e) {
        setError(err?.message || 'Error al actualizar etapa');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Etapa"
      size="md"
      footer={(
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => handleUpdate()} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-3">
        <p className="text-sm text-gray-600">Modifica el nombre, descuento y periodo de validez para esta etapa de venta</p>

        <div>
          <label className="text-sm font-medium">Nombre de la Etapa</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej: Early Bird" />
        </div>

        <div>
          <label className="text-sm font-medium">Descuento Adicional (%)</label>
          <input value={String(descuentoAdicional)} onChange={(e) => setDescuentoAdicional(e.target.value)} type="number" min={-100} max={100} step="0.01" className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
          <p className="text-xs text-gray-500 mt-1">Este descuento se aplica sobre el precio ya con descuento de tipo</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Fecha de Inicio</label>
            <input type="date" value={fechaInicio ?? ''} onChange={(e) => setFechaInicio(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" />
          </div>
          <div>
            <label className="text-sm font-medium">Fecha de Fin</label>
            <input type="date" value={fechaFin ?? ''} onChange={(e) => setFechaFin(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" />
          </div>
        </div>

        <p className="text-sm text-gray-400">La etapa solo estará activa durante este período de fechas</p>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
