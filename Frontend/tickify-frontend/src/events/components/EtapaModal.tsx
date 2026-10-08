import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { createEtapa, getEtapasByEvento } from "../services/TariffService";
import { getEventById } from "../services/EventService";

interface EtapaModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  onCreated?: (created: any) => void;
}

export default function EtapaModal({ open, onClose, eventoId, onCreated }: EtapaModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descuentoAdicional, setDescuentoAdicional] = React.useState<number | string>(0);
  const [fechaInicio, setFechaInicio] = React.useState<string | null>(null);
  const [fechaFin, setFechaFin] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [maxFecha, setMaxFecha] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setNombre("");
      setDescuentoAdicional(0);
      setFechaInicio(null);
      setFechaFin(null);
      setError(null);
    } else if (eventoId) {
      // Validar que eventoId sea un número válido
      const eventoIdNum = Number(eventoId);
      if (isNaN(eventoIdNum) || eventoIdNum <= 0) {
        console.error('❌ eventoId inválido:', eventoId);
        return;
      }
      
      console.log('🔍 Obteniendo fechas del evento ID:', eventoIdNum);
      // Obtener la última fecha del evento cuando se abre el modal
      getEventById(eventoIdNum)
        .then((evento) => {
          // Buscar la última fecha entre las funciones del evento
          if (evento.fechas && evento.fechas.length > 0) {
            const ultimaFecha = evento.fechas.reduce((latest: any, fecha: any) => {
              const fechaInicio = new Date(fecha.fecha_inicio);
              const latestInicio = new Date(latest.fecha_inicio);
              return fechaInicio > latestInicio ? fecha : latest;
            });
            const fechaLimite = new Date(ultimaFecha.fecha_inicio);
            // Formatear a YYYY-MM-DD para el input date
            const fechaStr = fechaLimite.toISOString().split('T')[0];
            setMaxFecha(fechaStr);
          } else if (evento.fecha_inicio) {
            // Si no hay fechas específicas, usar la fecha de inicio del evento
            const fechaLimite = new Date(evento.fecha_inicio);
            const fechaStr = fechaLimite.toISOString().split('T')[0];
            setMaxFecha(fechaStr);
          }
        })
        .catch((err) => {
          console.error('Error obteniendo fechas del evento:', err);
        });
    }
  }, [open, eventoId]);

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

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
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

    // Validar que no exista otra etapa con el mismo nombre
    try {
      const etapasExistentes = await getEtapasByEvento(Number(eventoId));
      const nombreNormalizado = nombre.trim().toLowerCase();
      const etapasDuplicadas = Array.isArray(etapasExistentes) 
        ? etapasExistentes.filter((e: any) => 
            (e.nombre || '').trim().toLowerCase() === nombreNormalizado
          )
        : [];
      
      if (etapasDuplicadas.length > 0) {
        setError(`Ya existe una etapa con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
        return;
      }

      // Validar que las fechas no se superpongan con otras etapas activas
      const inicioDate = new Date(fechaInicio + 'T00:00:00');
      const finDate = new Date(fechaFin + 'T23:59:59');
      
      if (finDate < inicioDate) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio.');
        return;
      }

      const etapasActivas = Array.isArray(etapasExistentes)
        ? etapasExistentes.filter((e: any) => e.estado?.toLowerCase() === 'activo')
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
        // API expects field 'porcentaje' for the discount — include it and keep descuento_adicional for compatibility
        porcentaje: Number(isNaN(descNum) ? 0 : descNum),
        fecha_inicio: dateOnlyToISO(fechaInicio),
        fecha_fin: dateOnlyToISO(fechaFin),
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        estado: "activo",
      };

      const created = await createEtapa(Number(eventoId), payload);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err: any) {
      // Improved logging to help debugging from UI
      console.error("❌ Error al crear etapa:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        headers: err?.response?.headers,
      });

      const serverMsg = err?.response?.data?.detail || err?.response?.data || err?.message;
      try {
        // If server returned an object, stringify it for display
        setError(typeof serverMsg === 'object' ? JSON.stringify(serverMsg) : String(serverMsg));
      } catch (e) {
        setError(err?.message || 'Error al crear etapa');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={"Agregar Nueva Etapa"}
      size="md"
      footer={(
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => handleCreate()} disabled={loading}>{loading ? 'Creando...' : 'Agregar Etapa'}</Button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-3">
        <p className="text-sm text-gray-600">Define el nombre, descuento y periodo de validez para esta etapa de venta</p>

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
            <input 
              type="date" 
              value={fechaInicio ?? ''} 
              onChange={(e) => setFechaInicio(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
              max={maxFecha ?? undefined}
              className="w-full mt-2 border rounded-lg py-2 px-3" 
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fecha de Fin</label>
            <input 
              type="date" 
              value={fechaFin ?? ''} 
              onChange={(e) => setFechaFin(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
              max={maxFecha ?? undefined}
              className="w-full mt-2 border rounded-lg py-2 px-3" 
            />
          </div>
        </div>

        <p className="text-sm text-gray-400">La etapa solo estará activa durante este período de fechas</p>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
