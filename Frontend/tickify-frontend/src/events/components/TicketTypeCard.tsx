import React from "react";
import { SquarePen, Trash2 } from "lucide-react";

interface TicketTypeProps {
    id?: number;
    nombre: string;
    changePercent?: number; // porcentaje de cambio, puede ser negativo
    descripcion?: string;
    incremento?: number;
    onEdit?: (id?: number) => void;
    onDelete?: (id?: number) => void;
}

function fmtChange(p?: number) {
    if (p == null) return "-0%"; // fallback parecido a la imagen
    const sign = p > 0 ? "+" : p < 0 ? "" : "-"; // muestra '-' para 0 para asemejar la imagen
    return `${sign}${p}%`;
}

function fmtCurrency(value?: number) {
    if (value == null) return "S/ 0.00";
    try {
        return `S/ ${Number(value).toFixed(2)}`;
    } catch (e) {
        return `S/ ${String(value)}`;
    }
}

export default function TicketTypeCard({
    id,
    nombre,
    changePercent,
    descripcion,
    incremento,
    onEdit,
    onDelete,
}: TicketTypeProps) {
    // debug valore for troubleshooting
    // eslint-disable-next-line no-console
    return (
        <div className="bg-white border border-green-50 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-medium mb-1 text-gray-800">{nombre}</h3>
                    </div>

                    {/* placeholder para balance visual similar a ZoneCard */}
                    <div className="hidden" />
                </div>

                <hr className="my-4 border-t border-gray-200" />

                <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-3 mb-4">
                        {/* signo de porcentaje junto al valor, en verde como en la imagen */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg text-green-500 font-semibold">%</span>

                            <div className="text-xl text-green-500 font-semibold">
                                <span className="font-medium text-green-500">{(incremento)}</span>
                            </div>

                        </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onEdit && onEdit(id)}
                            aria-label="Editar tipo de ticket"
                            className="flex-1 py-2 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
                        >
                            <SquarePen size={18} />
                        </button>

                        <button
                            type="button"
                            onClick={() => onDelete && onDelete(id)}
                            aria-label="Eliminar tipo de ticket"
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
