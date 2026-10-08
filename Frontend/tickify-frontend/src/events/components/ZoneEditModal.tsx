import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { updateZona, getZonasByEvento } from "../services/TariffService";

interface ZoneEditModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  zona: any; // the zona object to edit
  onUpdated?: (updated: any) => void;
}

export default function ZoneEditModal({ open, onClose, eventoId, zona, onUpdated }: ZoneEditModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [capacidad, setCapacidad] = React.useState<number | string>(1);
  const [precio, setPrecio] = React.useState<number | string>(0);
  const [numeroFilas, setNumeroFilas] = React.useState<number | string>(10);
  const [asientosPorFila, setAsientosPorFila] = React.useState<number | string>(8);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Populate fields when modal opens with zona data
  React.useEffect(() => {
    if (open && zona) {
      setNombre(String(zona.nombre ?? zona.name ?? ""));
      setDescripcion(String(zona.descripcion ?? zona.description ?? ""));
      setCapacidad(zona.capacidad ?? zona.capacity ?? 1);
      setPrecio(zona.precio_base ?? zona.precio ?? zona.price ?? 0);
      setNumeroFilas(zona.numero_filas ?? 10);
      setAsientosPorFila(zona.asientos_por_fila ?? 8);
      setError(null);
    } else if (!open) {
      // reset on close
      setNombre("");
      setDescripcion("");
      setCapacidad(1);
      setPrecio(0);
      setNumeroFilas(10);
      setAsientosPorFila(8);
      setError(null);
    }
  }, [open, zona]);

  // Calcular capacidad automáticamente cuando cambien filas o asientos
  React.useEffect(() => {
    const filas = Number(numeroFilas || 0);
    const asientos = Number(asientosPorFila || 0);
    if (!isNaN(filas) && !isNaN(asientos)) {
      setCapacidad(filas * asientos);
    }
  }, [numeroFilas, asientosPorFila]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
      return;
    }
    if (!zona || !zona.id) {
      setError("No se especificó una zona válida para editar");
      return;
    }
    if (!nombre || nombre.trim().length === 0) {
      setError("Ingresa un nombre para la zona");
      return;
    }

    // Validar que no exista otra zona con el mismo nombre (excluyendo la actual)
    try {
      const zonasExistentes = await getZonasByEvento(Number(eventoId));
      const nombreNormalizado = nombre.trim().toLowerCase();
      const zonasDuplicadas = Array.isArray(zonasExistentes) 
        ? zonasExistentes.filter((z: any) => 
            z.id !== zona.id && (z.nombre || z.name || '').trim().toLowerCase() === nombreNormalizado
          )
        : [];
      
      if (zonasDuplicadas.length > 0) {
        setError(`Ya existe otra zona con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
        return;
      }
    } catch (err: any) {
      console.error('Error al validar zonas duplicadas:', err);
      // Continuar si no se puede validar
    }

    const precioNum = Number(precio || 0);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError("Ingresa un precio válido (mayor o igual a 0)");
      return;
    }

    const capNum = Number(capacidad || 0);
    if (Number.isNaN(capNum) || capNum < 1) {
      setError('Ingresa una capacidad válida (mayor o igual a 1)');
      return;
    }

    // Validaciones para asientos numerados
    const filasNum = Number(numeroFilas || 0);
    const asientosNum = Number(asientosPorFila || 0);
    
    if (Number.isNaN(filasNum) || filasNum < 1) {
      setError('Ingresa un número de filas válido (mayor o igual a 1)');
      return;
    }
    
    if (Number.isNaN(asientosNum) || asientosNum < 1) {
      setError('Ingresa un número de asientos por fila válido (mayor o igual a 1)');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        capacidad: capNum,
        precio_base: precioNum,
        precio: precioNum,
        tiene_asientos_numerados: true,
        numero_filas: filasNum,
        asientos_por_fila: asientosNum,
      };

      const updated = await updateZona(Number(zona.id), payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Error al actualizar zona");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Zona"
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
        <div>
          <label className="text-sm font-medium">Nombre de la zona</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej. Platea, VIP" />
        </div>
        <div>
          <label className="text-sm font-medium">Precio Base (S/)</label>
          <input value={String(precio)} onChange={(e) => setPrecio(e.target.value)} type="number" min={0} step="0.01" className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
        </div>

      
        {/* Configuración de asientos numerados */}
        {/*
          <h3 className="text-sm font-semibold text-gray-700">Configuración de Asientos</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Número de Filas</label>
              <input 
                value={String(numeroFilas)} 
                onChange={(e) => setNumeroFilas(e.target.value)} 
                type="number" 
                min={1} 
                className="w-full mt-2 border rounded-lg py-2 px-3" 
                placeholder="10" 
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Asientos por Fila</label>
              <input 
                value={String(asientosPorFila)} 
                onChange={(e) => setAsientosPorFila(e.target.value)} 
                type="number" 
                min={1} 
                className="w-full mt-2 border rounded-lg py-2 px-3" 
                placeholder="8" 
              />
            </div>
          </div> */}
        {/*}
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-sm text-blue-800">
              <strong>Capacidad total:</strong> {Number(numeroFilas || 0) * Number(asientosPorFila || 0)} asientos
            </p>
          </div>
        */}
        <div>
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Detalles de la zona" rows={3} />
        </div>
        
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
