import React, { useState } from "react";
import { Grid3x3, SquarePen, Trash2 } from "lucide-react";
import SeatMapModal from "./SeatMapModal";

interface ZoneProps {
  id?: number;
  nombre: string;
  precio?: number;
  capacidad?: number;
  vendidos?: number;
  onEdit?: (id?: number) => void;
  onDelete?: (id?: number) => void;
}

function fmtMoney(value?: number) {
  if (value == null) return "-";
  return `S/ ${value.toFixed(2)}`;
}

export default function ZoneCard({
  id,
  nombre,
  precio,
  capacidad = 0,
  vendidos = 0,
  onEdit,
  onDelete,
}: ZoneProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  
  // capacidad is the total capacity of the zone. soldPercent = vendidos / capacidad
  const total = Math.max(capacidad, 0);
  const soldPercent = total > 0 ? Math.round((vendidos / total) * 100) : 0;

  return (
    <>
    <div className="bg-white border border-blue-50 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-medium mb-1 text-gray-800">{nombre}</h3>
            <div className="text-sm text-blue-600 font-semibold">{fmtMoney(precio)}</div>
          </div>

          {/* small actions on top (kept for accessibility but visually we also show bottom buttons) */}
          <div className="hidden">{/* intentionally hidden on top for cleaner UI */}</div>
        </div>

        <hr className="my-4 border-t border-gray-200" />

        <div className="text-sm text-gray-600">
          <div className="flex justify-between mb-4">
            <span>Capacidad:</span>
            <span className="font-medium text-gray-800">{capacidad}</span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              aria-label="Mapa"
              className="flex-1 py-2 rounded-md border border-gray-200 bg-white flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <Grid3x3 size={18} /> <span className="font-semibold">Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit && onEdit(id)}
              aria-label="Editar zona"
              className="flex-1 py-2 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
            >
              <SquarePen size={18} />
            </button>

            <button
              type="button"
              onClick={() => onDelete && onDelete(id)}
              aria-label="Eliminar zona"
              className="w-12 h-10 rounded-md border border-red-100 bg-white text-red-600 flex items-center justify-center hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Modal de mapa de asientos */}
      {id && (
        <SeatMapModal
          open={showMapModal}
          onClose={() => setShowMapModal(false)}
          zonaId={id}
          zonaNombre={nombre}
        />
      )}
    </>
  );
}
