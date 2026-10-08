import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { createTipoTicket, updateTipoTicket, getTiposByEvento } from "../services/TariffService";

interface TicketTypeModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  onCreated?: (created: any) => void;
  // when passed, the modal will be in edit mode and prefill fields
  tipo?: any;
  onUpdated?: (updated: any) => void;
}

export default function TicketTypeModal({ open, onClose, eventoId, onCreated, tipo, onUpdated }: TicketTypeModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descuento, setDescuento] = React.useState<number | string>(0);
  const [descripcion, setDescripcion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset or populate fields depending on open and tipo
  React.useEffect(() => {
    // debug: log when effect runs and the incoming props
    // eslint-disable-next-line no-console
    console.debug("TicketTypeModal useEffect - open:", open, "tipo:", tipo);

    if (!open) {
      setNombre("");
      setDescuento(0);
      setDescripcion("");
      setError(null);
      return;
    }

    // If opening in edit mode and a tipo is provided, populate fields
    if (tipo && typeof tipo === "object") {
      const newNombre = String(tipo.nombre ?? "");
      const newDescuento = typeof tipo.incremento !== 'undefined' ? String(tipo.incremento) : String(tipo.descuento ?? tipo.porcentaje ?? 0);
      const newDescripcion = String(tipo.descripcion ?? "");
      // debug: show mapped values
      // eslint-disable-next-line no-console
      console.debug("TicketTypeModal populate fields:", { newNombre, newDescuento, newDescripcion });
      setNombre(newNombre);
      setDescuento(newDescuento);
      setDescripcion(newDescripcion);
      setError(null);
    } else {
      // If opening in create mode (no tipo), reset fields to defaults
      setNombre("");
      setDescuento(0);
      setDescripcion("");
      setError(null);
    }
  }, [open, tipo]);


  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
      return;
    }
    if (!nombre || nombre.trim().length === 0) {
      setError("Ingresa un nombre para el tipo");
      return;
    }

    // Validar que no exista otro tipo con el mismo nombre (solo al crear, no al editar)
    if (!tipo || !tipo.id) {
      try {
        const tiposExistentes = await getTiposByEvento(Number(eventoId));
        const nombreNormalizado = nombre.trim().toLowerCase();
        const tiposDuplicados = Array.isArray(tiposExistentes) 
          ? tiposExistentes.filter((t: any) => 
              (t.nombre || '').trim().toLowerCase() === nombreNormalizado
            )
          : [];
        
        if (tiposDuplicados.length > 0) {
          setError(`Ya existe un tipo con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
          return;
        }
      } catch (err: any) {
        console.error('Error al validar tipos duplicados:', err);
        // Continuar si no se puede validar
      }
    } else {
      // Al editar, validar que no exista otro tipo con el mismo nombre (excluyendo el actual)
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
    }

    const descNum = Number(descuento ?? 0);
    if (Number.isNaN(descNum) || descNum < -100 || descNum > 100) {
      setError("Ingresa un porcentaje válido entre -100 y 100");
      return;
    }

    try {
      setLoading(true);
      // API expects only { nombre, descripcion, incremento }
      const payload: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        incremento: Number(isNaN(descNum) ? 0 : descNum),
      };

      // If tipo is provided and has an id, do update instead of create
      if (tipo && tipo.id) {
        const updated = await updateTipoTicket(Number(eventoId), Number(tipo.id), payload);
        if (onUpdated) onUpdated(updated);
        onClose();
      } else {
        const created = await createTipoTicket(Number(eventoId), payload);
        if (onCreated) onCreated(created);
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Error al crear/actualizar tipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tipo && tipo.id ? "Editar Tipo" : "Agregar Nuevo Tipo"}
      footer={(
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => handleCreate()} disabled={loading}>{loading ? (tipo && tipo.id ? 'Guardando...' : 'Creando...') : (tipo && tipo.id ? 'Guardar cambios' : 'Agregar Tipo')}</Button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-3">
        <p className="text-sm text-gray-600">Define el nombre y el ajuste de precio sobre el precio base de la zona</p>

        <div>
          <label className="text-sm font-medium">Nombre del Tipo</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej: Estudiante" />
        </div>

        <div>
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Breve descripción del tipo (ej. acceso a zona VIP, requisitos)" rows={3} />
        </div>

        <div>
          <label className="text-sm font-medium">Incremento(%)</label>
          <input value={String(descuento)} onChange={(e) => setDescuento(e.target.value)} type="number" min={-100} max={100} step="0.01" className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
          <p className="text-xs text-gray-500 mt-1">Este incremento se aplica sobre el precio base de la zona</p>

        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
