import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { updateTipoTicket, getTiposByEvento } from "../services/TariffService";

interface TicketTypeEditModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  tipo: any; // the tipo object to edit
  onUpdated?: (updated: any) => void;
}

export default function TicketTypeEditModal({ open, onClose, eventoId, tipo, onUpdated }: TicketTypeEditModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descuento, setDescuento] = React.useState<number | string>(0);
  const [descripcion, setDescripcion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Populate fields when modal opens with tipo data
  React.useEffect(() => {
    if (open && tipo) {
      setNombre(String(tipo.nombre ?? ""));
      setDescuento(typeof tipo.incremento !== 'undefined' ? String(tipo.incremento) : String(tipo.descuento ?? tipo.porcentaje ?? 0));
      setDescripcion(String(tipo.descripcion ?? ""));
      setError(null);
    } else if (!open) {
      // reset on close
      setNombre("");
      setDescuento(0);
      setDescripcion("");
      setError(null);
    }
  }, [open, tipo]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
      return;
    }
    if (!tipo || !tipo.id) {
      setError("No se especificó un tipo válido para editar");
      return;
    }
    if (!nombre || nombre.trim().length === 0) {
      setError("Ingresa un nombre para el tipo");
      return;
    }

    // Validar que no exista otro tipo con el mismo nombre (excluyendo el actual)
    try {
      const tiposExistentes = await getTiposByEvento(Number(eventoId));
      const nombreNormalizado = nombre.trim().toLowerCase();
      const tiposDuplicados = Array.isArray(tiposExistentes) 
        ? tiposExistentes.filter((t: any) => 
            t.id !== tipo.id && (t.nombre || '').trim().toLowerCase() === nombreNormalizado
          )
        : [];
      
      if (tiposDuplicados.length > 0) {
        setError(`Ya existe otro tipo con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
        return;
      }
    } catch (err: any) {
      console.error('Error al validar tipos duplicados:', err);
      // Continuar si no se puede validar
    }

    const descNum = Number(descuento ?? 0);
    if (Number.isNaN(descNum) || descNum < -100 || descNum > 100) {
      setError("Ingresa un porcentaje válido entre -100 y 100");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        incremento: Number(isNaN(descNum) ? 0 : descNum),
      };

      const updated = await updateTipoTicket(Number(eventoId), Number(tipo.id), payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Error al actualizar tipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Tipo de Entrada"
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
        <p className="text-sm text-gray-600">Modifica el nombre y el porcentaje de descuento sobre el precio base de la zona</p>

        <div>
          <label className="text-sm font-medium">Nombre del Tipo</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej: Estudiante" />
        </div>

        <div>
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Breve descripción del tipo (ej. acceso a zona VIP, requisitos)" rows={3} />
        </div>

        <div>
          <label className="text-sm font-medium">Incremento (%)</label>
          <input value={String(descuento)} onChange={(e) => setDescuento(e.target.value)} type="number" min={-100} max={100} step="0.01" className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
          <p className="text-xs text-gray-500 mt-1">Este incremento se aplica sobre el precio base de la zona</p>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
