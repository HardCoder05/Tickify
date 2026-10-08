import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { createZona, getZonasByEvento } from "../services/TariffService";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

interface ZoneModalProps {
  open: boolean;
  onClose: () => void;
  eventoId: number | string | undefined;
  onCreated?: (created: any) => void;
}

export default function ZoneModal({ open, onClose, eventoId, onCreated }: ZoneModalProps) {
  const [nombre, setNombre] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  // Use 1 as default because backend validates capacidad must be > 0
  const [capacidad, setCapacidad] = React.useState<number | string>(1);
  const [precio, setPrecio] = React.useState<number | string>(0);
  const [numeroFilas, setNumeroFilas] = React.useState<number | string>(0);
  const [asientosPorFila, setAsientosPorFila] = React.useState<number | string>(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setNombre("");
      setDescripcion("");
      setCapacidad(1);
      setPrecio(0);
      setNumeroFilas(0);
      setAsientosPorFila(0);
      setError(null);
    }
  }, [open]);

  // Calcular capacidad automáticamente
  React.useEffect(() => {
    const filas = Number(numeroFilas || 0);
    const asientos = Number(asientosPorFila || 0);
    if (!isNaN(filas) && !isNaN(asientos)) {
      setCapacidad(filas * asientos);
    }
  }, [numeroFilas, asientosPorFila]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!eventoId) {
      setError("Evento inválido");
      return;
    }
    if (!nombre || nombre.trim().length === 0) {
      setError("Ingresa un nombre para la zona");
      return;
    }

    // Validar que no exista otra zona con el mismo nombre
    try {
      const zonasExistentes = await getZonasByEvento(Number(eventoId));
      const nombreNormalizado = nombre.trim().toLowerCase();
      const zonasDuplicadas = Array.isArray(zonasExistentes) 
        ? zonasExistentes.filter((z: any) => 
            (z.nombre || z.name || '').trim().toLowerCase() === nombreNormalizado
          )
        : [];
      
      if (zonasDuplicadas.length > 0) {
        setError(`Ya existe una zona con el nombre "${nombre.trim()}". Por favor, elige otro nombre.`);
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

    // Backend requires capacidad > 0, validate accordingly
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
      
      // Paso 1: Crear la zona
      const payload: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        capacidad: capNum,
        estado: 'activo',
        precio_base: precioNum,
        precio: precioNum,
        tiene_asientos_numerados: true,
        numero_filas: filasNum,
        asientos_por_fila: asientosNum,
      };
      const created = await createZona(Number(eventoId), payload);
      
      // Paso 2: Crear el layout de asientos EN SEGUNDO PLANO
      // No bloqueamos la UI - el usuario puede continuar trabajando
      if (created && created.id) {
        // Ejecutar asíncronamente sin await - pero notificar cuando termine
        (async () => {
          try {
            console.log('🔄 Iniciando creación de layout de asientos en segundo plano...');
            const layoutResponse = await fetch(`${API_URL}/api/v1/asientos/layout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                zona_id: created.id,
                filas: filasNum,
                columnas: asientosNum,
                asientos_deshabilitados: [] // Sin asientos deshabilitados por defecto
              })
            });

            if (!layoutResponse.ok) {
              console.warn('⚠️ Error al crear layout de asientos en segundo plano');
            } else {
              console.log('✅ Layout de asientos creado exitosamente');
              
              // Paso 3: Replicar asientos en todas las fechas del evento
              try {
                console.log('🔍 Obteniendo fechas del evento...');
                const fechasResponse = await fetch(
                  `${API_URL}/api/v1/eventos/${eventoId}/fechas`,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                  }
                );

                if (fechasResponse.ok) {
                  const fechas = await fechasResponse.json();
                  console.log('📅 Fechas obtenidas:', fechas?.length || 0);
                  const fechaIds = fechas.map((f: any) => f.id);

                  if (fechaIds.length > 0) {
                    console.log('🔄 Replicando asientos en', fechaIds.length, 'fechas...');
                    const replicarResponse = await fetch(
                      `${API_URL}/api/v1/asientos/replicar?zona_id=${created.id}`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                        body: JSON.stringify({
                          evento_fecha_ids: fechaIds,
                        }),
                      }
                    );

                    if (!replicarResponse.ok) {
                      console.warn('⚠️ Error al replicar asientos en fechas:', await replicarResponse.text());
                    } else {
                      console.log('✅ Asientos replicados en todas las fechas');
                    }
                  } else {
                    console.log('ℹ️ No hay fechas para replicar asientos');
                  }
                } else {
                  console.warn('⚠️ Error al obtener fechas:', fechasResponse.status, await fechasResponse.text());
                }
                
                // Paso 4: Obtener la zona actualizada con la capacidad correcta
                // (se ejecuta siempre, independiente de si hay fechas o no)
                try {
                  console.log('🔄 Obteniendo zona actualizada del backend...');
                  const zonasActualizadas = await getZonasByEvento(Number(eventoId));
                  const zonaActualizada = Array.isArray(zonasActualizadas) 
                    ? zonasActualizadas.find((z: any) => z.id === created.id)
                    : null;
                  
                  if (zonaActualizada && onCreated) {
                    // Notificar con los datos actualizados del backend (capacidad real)
                    onCreated(zonaActualizada);
                    console.log('✅ UI actualizada con capacidad real del backend:', zonaActualizada.capacidad);
                  } else {
                    console.warn('⚠️ No se encontró la zona actualizada');
                  }
                } catch (refreshErr) {
                  console.warn('⚠️ Error al actualizar datos de zona:', refreshErr);
                }
              } catch (replicarErr) {
                console.warn('⚠️ Error general al replicar asientos:', replicarErr);
                
                // Intentar actualizar la UI de todos modos
                try {
                  const zonasActualizadas = await getZonasByEvento(Number(eventoId));
                  const zonaActualizada = Array.isArray(zonasActualizadas) 
                    ? zonasActualizadas.find((z: any) => z.id === created.id)
                    : null;
                  if (zonaActualizada && onCreated) {
                    onCreated(zonaActualizada);
                    console.log('✅ UI actualizada después de error');
                  }
                } catch (e) {
                  console.warn('⚠️ No se pudo actualizar UI después de error');
                }
              }
            }
          } catch (layoutErr) {
            console.warn('⚠️ Error al crear layout de asientos:', layoutErr);
          }
        })();
      }
      
      // Retornar inmediatamente - no esperamos a que termine el layout
      // La UI se actualiza de forma instantánea con los datos iniciales
      // Y se actualizará de nuevo cuando termine el proceso en segundo plano
      if (onCreated) onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Error al crear zona");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={"Crear zona / sector"}
      footer={(
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => handleCreate()} disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nombre de la zona</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Ej. Platea, VIP" />
        </div>
        <div>
          <label className="text-sm font-medium">Precio Base (S/)</label>
          <input value={String(precio)} onChange={(e) => setPrecio(e.target.value)} type="number" min={0} step="0.01" className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="0" />
        </div>

        {/* Configuración de asientos numerados */}
        <div className="space-y-3">
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
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-sm text-blue-800">
              <strong>Capacidad total:</strong> {Number(numeroFilas || 0) * Number(asientosPorFila || 0)} asientos
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full mt-2 border rounded-lg py-2 px-3" placeholder="Detalles de la zona" rows={3} />
        </div>
        
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Modal>
  );
}
