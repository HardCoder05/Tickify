import React from "react";
import { SquarePen, Trash2, Calendar } from "lucide-react";

interface EtapaCardProps {
  id?: number;
  nombre: string;
  porcentaje?: number; // descuento adicional / porcentaje
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado?: string | null;
  onEdit?: (id?: number) => void;
  onDelete?: (id?: number) => void;
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    // use Spanish short month without dot if possible
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }).replace('.', '');
  } catch (e) {
    return String(dateStr);
  }
}

export default function EtapaCard({ id, nombre, porcentaje, fecha_inicio, fecha_fin, estado, onEdit, onDelete }: EtapaCardProps) {
  const pct = porcentaje ?? 0;
  const pctText = `${pct > 0 ? '+' : ''}${pct}`;

  return (
    <div className="bg-white border border-purple-50 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-medium mb-1 text-gray-800">{nombre}</h3>
          </div>

          <div className="flex items-start gap-2">
            {estado && (
              <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{estado}</div>
            )}
          </div>
        </div>

        <hr className="my-4 border-t border-gray-200" />

        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg text-purple-600 font-semibold">%</span>
              <div className="text-xl text-purple-600 font-semibold">
                <span className="font-medium">{pctText}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Inicio: {fmtDate(fecha_inicio)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Fin: {fmtDate(fecha_fin)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEdit && onEdit(id)}
              aria-label="Editar etapa"
              className="flex-1 py-2 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
            >
              <SquarePen size={18} />
            </button>

            <button
              type="button"
              onClick={() => onDelete && onDelete(id)}
              aria-label="Eliminar etapa"
              className="w-12 h-10 rounded-md border border-red-100 bg-white text-red-600 flex items-center justify-center hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
