import { X, Calendar} from "lucide-react";
import { useState } from "react";

interface Ticket {
  id: number;
  zona: string;
  tipo: string;
  tarifa: string;
  numero: string;
  precio: number;
  descuento?: number;
  compraCodigo?: string | null;
  compraEstado?: string | null;
  eventoFechaId?: number | null;
}

interface UserDetail {
  nombre: string;
  email: string;
  horario: string;
  fechaRegistro: string;
  tickets: Ticket[];
  totalPagado: number;
  descuentoTotal?: number;
  subtotal?: number;
}

interface Props {
  userDetail: UserDetail;
  onClose: () => void;
}

export default function OrganizerDetailUser({ userDetail, onClose }: Props) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-gray-900/30"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
  {/* Header */}
  <div className="bg-black text-white px-5 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Detalles de Inscripción</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-blue-700 rounded"
              aria-label="Cerrar"
            >
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* User Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Nombre</label>
              <div className="text-sm font-medium text-gray-900 mt-1">{userDetail.nombre}</div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Email</label>
              <div className="text-sm text-gray-700 mt-1">{userDetail.email}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span>Horario Seleccionado</span>
                </label>
                <div className="text-sm text-gray-900 flex items-center">
                  <span>{userDetail.horario}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span>Fecha de Registro</span>
                </label>
                <div className="text-sm text-gray-900 flex items-center">
                  <span>{userDetail.fechaRegistro}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎫</span>
              <h3 className="text-sm font-semibold text-gray-900">
                Tickets Comprados ({userDetail.tickets.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {userDetail.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 rounded-md p-3 space-y-2 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
                        {ticket.zona}
                      </span>
                      <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded">
                        {ticket.tipo}
                      </span>
                      <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-300">
                        {ticket.tarifa}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-500">Precio Final</div>
                      <div className="text-green-600 font-semibold text-sm">
                        S/ {ticket.precio.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {/*<div className="text-xs text-gray-600">
                    Ticket #{ticket.numero}
                  </div>*/}
                  {/* Debug fields: compra codigo / estado / fecha id */}
                  {/*<div className="text-xs text-gray-500 mt-1">
                    {ticket.compraCodigo ? <span className="mr-3">Compra: {ticket.compraCodigo}</span> : null}
                    {ticket.compraEstado ? <span className="mr-3">Estado compra: {ticket.compraEstado}</span> : null}
                    {ticket.eventoFechaId ? <span>Fecha ID: {ticket.eventoFechaId}</span> : null}
                  </div>*/}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-3 space-y-2">
            {/* Subtotal */}
            {userDetail.subtotal && userDetail.subtotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">S/ {userDetail.subtotal.toFixed(2)}</span>
              </div>
            )}

            {/* Descuento Total si aplica */}
            {userDetail.descuentoTotal && userDetail.descuentoTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-orange-600">
                  <span className="font-medium">Descuento Aplicado</span>
                </div>
                <div className="font-bold text-orange-600">
                  - S/ {userDetail.descuentoTotal.toFixed(2)}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-green-600">
                <span className="font-semibold text-sm">Total Pagado</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                S/ {userDetail.totalPagado.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-between items-center bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Cerrar
          </button>
          {/* Email button removed as requested */}
        </div>
      </div>
    </div>
  );
}
