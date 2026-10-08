import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { useNotificationContext } from "@/contexts/NotificationContext";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

interface Asiento {
  id: number;
  fila: number;
  numero: number;
  estado: string;
}

interface SeatMapModalProps {
  open: boolean;
  onClose: () => void;
  zonaId: number;
  zonaNombre: string;
}

export default function SeatMapModal({ open, onClose, zonaId, zonaNombre }: SeatMapModalProps) {
  const { error: showError, success } = useNotificationContext();
  const [asientos, setAsientos] = useState<Asiento[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ disponibles: 0, inhabilitados: 0, total: 0 });
  const [cambiosPendientes, setCambiosPendientes] = useState<Map<number, number[]>>(new Map());

  useEffect(() => {
    if (open && zonaId) {
      cargarLayout();
    }
  }, [open, zonaId]);

  const cargarLayout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/asientos/layout/zona/${zonaId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al cargar el mapa de asientos");
      }

      const data: Asiento[] = await response.json();

      // Organizar asientos en matriz
      const matriz: { [key: number]: Asiento[] } = {};
      data.forEach((asiento) => {
        if (!matriz[asiento.fila]) {
          matriz[asiento.fila] = [];
        }
        matriz[asiento.fila].push(asiento);
      });

      // Convertir a array ordenado
      const asientosOrdenados = Object.keys(matriz)
        .map(Number)
        .sort((a, b) => a - b)
        .map((fila) => matriz[fila].sort((a, b) => a.numero - b.numero));

      setAsientos(asientosOrdenados);

      // Calcular estadísticas
      const disponibles = data.filter((a) => a.estado === "activo").length;
      const inhabilitados = data.filter((a) => a.estado === "eliminado").length;
      setStats({
        disponibles,
        inhabilitados,
        total: data.length,
      });
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Error al cargar el mapa de asientos");
    } finally {
      setLoading(false);
    }
  };

  const toggleAsiento = (asiento: Asiento) => {
    const nuevoEstado = asiento.estado === "activo" ? "eliminado" : "activo";
    
    // Actualizar localmente
    setAsientos((prev) =>
      prev.map((fila) =>
        fila.map((a) =>
          a.id === asiento.id ? { ...a, estado: nuevoEstado } : a
        )
      )
    );

    // Actualizar estadísticas localmente
    setStats((prev) => ({
      ...prev,
      disponibles: prev.disponibles + (nuevoEstado === "activo" ? 1 : -1),
      inhabilitados: prev.inhabilitados + (nuevoEstado === "eliminado" ? 1 : -1),
    }));

    // Registrar cambio pendiente
    setCambiosPendientes((prev) => {
      const nuevoCambios = new Map(prev);
      const filaActual = nuevoCambios.get(asiento.fila) || [];
      
      if (nuevoEstado === "eliminado") {
        // Agregar asiento a la lista de deshabilitados
        if (!filaActual.includes(asiento.numero)) {
          nuevoCambios.set(asiento.fila, [...filaActual, asiento.numero]);
        }
      } else {
        // Remover asiento de la lista de deshabilitados
        nuevoCambios.set(asiento.fila, filaActual.filter(n => n !== asiento.numero));
      }
      
      return nuevoCambios;
    });
  };

  const guardarCambios = async () => {
    if (cambiosPendientes.size === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Procesar cambios por fila
      for (const [fila, asientosDeshabilitados] of cambiosPendientes) {
        const response = await fetch(
          `${API_URL}/api/v1/asientos/layout/zona/${zonaId}/fila/${fila}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              asientos_deshabilitar: asientosDeshabilitados,
              columnas_agregar: 0
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Error al actualizar fila ${fila}`);
        }
      }

      // Limpiar cambios pendientes y cerrar
      setCambiosPendientes(new Map());
      success('Cambios guardados exitosamente');
      onClose();
    } catch (err: any) {
      console.error('Error al guardar cambios:', err);
      showError(`Error al guardar cambios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilaLetra = (filaNum: number) => {
    return String.fromCharCode(64 + filaNum); // 1=A, 2=B, etc.
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mapa de Asientos - ${zonaNombre}`}
      size="md"
      className="!w-auto !max-w-[95vw]"
      showCloseButton={false}
    >
      <div className="space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Subtítulo */}
        <p className="text-sm text-gray-600">
          Vista del mapa de asientos numerados para esta zona
        </p>

        {/* Leyenda */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12 rounded-t-2xl bg-gradient-to-b from-green-400 to-green-500 shadow-md">
              <div className="absolute inset-x-2 top-2 h-8 bg-white/20 rounded-t-xl"></div>
              <div className="absolute inset-x-1 bottom-2 h-6 bg-black/10 rounded-lg"></div>
            </div>
            <span className="font-medium">Disponible</span>
          </div>
          {/*<div className="flex items-center gap-2">
            <div className="relative w-12 h-12 rounded-t-2xl bg-gradient-to-b from-gray-400 to-gray-500 shadow-md opacity-50">
              <div className="absolute inset-x-2 top-2 h-8 bg-white/20 rounded-t-xl"></div>
              <div className="absolute inset-x-1 bottom-2 h-6 bg-black/10 rounded-lg"></div>
            </div>
            <span className="font-medium">Vendido</span>
          </div>*/}
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12 rounded-t-2xl bg-gradient-to-b from-gray-300 to-gray-400 shadow-md opacity-50">
              <div className="absolute inset-x-2 top-2 h-8 bg-white/20 rounded-t-xl"></div>
              <div className="absolute inset-x-1 bottom-2 h-6 bg-black/10 rounded-lg"></div>
            </div>
            <span className="font-medium">Inhabilitado</span>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 Haz clic en los asientos disponibles (verde) para inhabilitarlos o en los
            inhabilitados (rojo) para habilitarlos. {/*Los asientos en gris están vendidos.*/}
          </p>
        </div>

        {/* Loading inicial */}
        {loading && asientos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Cargando mapa de asientos...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Mapa de asientos */}
        {!error && asientos.length > 0 && (
          <div className="space-y-4 relative">
            {/* Overlay de guardando */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="bg-white shadow-lg rounded-lg px-6 py-4 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-gray-700 font-medium">Guardando cambios...</p>
                </div>
              </div>
            )}
            {/* Escenario */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-700 text-white text-center py-4 rounded-xl font-semibold text-lg shadow-lg">
              🎭 ESCENARIO
            </div>

            {/* Grid de asientos - con scroll horizontal si es necesario */}
            <div className="flex justify-center overflow-x-auto pb-4">
              <div className="space-y-2 inline-block">
                {asientos.map((fila, fIndex) => (
                  <div key={fIndex} className="flex items-center gap-2 mb-2">
                    {/* Número de fila */}
                    <div className="w-12 text-center font-bold text-gray-600 text-sm flex-shrink-0">
                      {fila[0]?.fila || fIndex + 1}
                    </div>

                    {/* Asientos de la fila */}
                    <div className="flex gap-1">
                      {fila.map((asiento) => {
                        const isDisponible = asiento.estado === "activo";
                        const isVendido = asiento.estado === "vendido";
                        const isInhabilitado = asiento.estado === "eliminado";
                        
                        return (
                          <button
                            key={asiento.id}
                            onClick={() => !isVendido && toggleAsiento(asiento)}
                            disabled={isVendido}
                            className={`
                              relative w-14 h-14 rounded-t-2xl font-bold text-xs 
                              transition-all duration-200 shadow-md
                              ${isDisponible ? 'bg-gradient-to-b from-green-400 to-green-500 hover:scale-105' : ''}
                              ${isVendido ? 'bg-gradient-to-b from-gray-400 to-gray-500 cursor-not-allowed opacity-50' : ''}
                              ${isInhabilitado ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:scale-105 opacity-50' : ''}
                            `}
                            style={{
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }}
                            title={`Fila ${asiento.fila} - Asiento ${asiento.numero} (${asiento.estado})`}
                          >
                            {/* Efecto de respaldo del asiento */}
                            <div 
                              className="absolute inset-x-2 top-2 h-8 bg-white/20 rounded-t-xl"
                              style={{ pointerEvents: 'none' }}
                            />
                            {/* Efecto de base del asiento */}
                            <div 
                              className="absolute inset-x-1 bottom-2 h-6 bg-black/10 rounded-lg"
                              style={{ pointerEvents: 'none' }}
                            />
                            {/* Número del asiento */}
                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs drop-shadow-md" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                              {asiento.numero}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.disponibles}</div>
                <div className="text-sm text-green-600">Asientos Disponibles</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-700">{stats.inhabilitados}</div>
                <div className="text-sm text-gray-600">Asientos Inhabilitados</div>
              </div>
            </div>
          </div>
        )}

        {/* Sin asientos */}
        {!loading && !error && asientos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay asientos configurados para esta zona
          </div>
        )}

        {/* Footer con botones */}
        <div className="flex justify-end items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={guardarCambios} disabled={loading}>
              {loading ? 'Guardando...' : cambiosPendientes.size > 0 ? 'Guardar Cambios' : 'Cerrar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
