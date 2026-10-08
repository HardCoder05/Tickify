import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCompra } from "../services/PurcharseService";
import { Button } from "@/components/ui/button";
// Asegúrate de que Compra y TicketCompra incluyan campos como asiento_fila y asiento_numero
import type { Compra, TicketCompra } from "@/events/types/event";
import { Home, Ticket } from "lucide-react";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function PurchaseSuccessPage() {
  const { compraId } = useParams<{ compraId: string }>();
  const { error: showError } = useNotificationContext();
  const [compra, setCompra] = useState<Compra | null>(null);
  const [tickets, setTickets] = useState<TicketCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!compraId) return;
    setLoading(true);

    getCompra(Number(compraId))
      .then((data) => {
        setCompra(data);
        setTickets(data.tickets || []);
      })
      .catch((err) => {
        console.error(err);
        showError("Hubo un error al cargar la información de la compra. Intenta más tarde o revisa tu correo.");
      })
      .finally(() => setLoading(false));
  }, [compraId, showError]);


  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Cargando comprobante de compra...
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="p-8 text-center text-gray-600">
        No se encontró la información de la compra.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-[#FFFDF6] min-h-screen">
      {/* Volver */}
      <button
        onClick={() => navigate("/")}
        className="text-sm text-gray-600 hover:underline mb-4 flex items-center"
      >
        <Home size={14} className="mr-1" /> Volver al inicio
      </button>

      {/* Encabezado */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-4xl">✓</span>
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-gray-800">
          ¡Compra exitosa!
        </h1>
        <p className="text-gray-600 mt-2">
          Tu compra ha sido procesada correctamente
        </p>
      </div>

      {/* Detalles de la orden */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Detalles de la orden</h2>

        {tickets.length > 0 && (
          <div className="space-y-4 mb-4 border-b pb-4">
            {tickets.map((t, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{t.evento_nombre}</h3>
                  <p className="text-gray-600 text-sm">
                    {t.zona_nombre} — {t.tarifa_nombre}
                    {/* 👈 AJUSTE: Muestra Fila/Asiento si está disponible */}
                    {t.asiento_fila && t.asiento_numero && (
                      <span className="text-indigo-600 ml-2 font-medium">
                        (Fila {t.asiento_fila} / Asiento #{t.asiento_numero})
                      </span>
                    )}
                  </p>
                  {t.evento_fecha_inicio && (
                    <p className="text-gray-500 text-sm">
                      {new Date(t.evento_fecha_inicio).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(t.evento_fecha_inicio).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(t.evento_fecha_fin).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-gray-900">
                  S/ {t.precio_pagado?.toFixed(2) ?? "0.00"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>S/ {compra.monto_subtotal.toFixed(2)}</span>
          </div>
          {compra.descuento_total_aplicado > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Descuento aplicado</span>
              <span>- S/ {compra.descuento_total_aplicado.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t">
            <span>Total Pagado</span>
            <span>S/ {compra.monto_total.toFixed(2)}</span>
          </div>
        </div>

        {/* Información adicional */}
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <strong>Método de pago:</strong> {compra.metodo_pago}
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            <span className="capitalize">{compra.estado}</span>
          </p>
          <p>
            <strong>Código de confirmación:</strong>{" "}
            {compra.codigo_confirmacion || "-"}
          </p>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 text-center">
        <h3 className="font-semibold text-gray-900 text-lg mb-2">
          Tus tickets están listos
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Accede a tus tickets digitales desde la aplicación
        </p>

        <Button
          onClick={() => navigate("/mis-tickets")}
          className="bg-yellow-400 text-black hover:bg-yellow-300 font-medium flex items-center justify-center mx-auto"
        >
          <Ticket size={18} className="mr-2" /> Ver tickets en la aplicación
        </Button>

        <p className="text-xs text-gray-500 mt-3">
          También puedes acceder a tus tickets desde tu perfil en cualquier
          momento
        </p>
      </div>
    </div>
  );
}