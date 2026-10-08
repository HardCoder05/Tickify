import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { TicketDetail } from "@/events/types/event";
import { getTicketById } from "@/users/services/PurcharseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQrLoaded, setIsQrLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    getTicketById(Number(ticketId))
      .then((data) => setTicket(data))
      .catch(() => setError("No se pudo cargar el ticket."))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f9fafb]">
        {/* Logo Tickify */}
        <h1 className="text-3xl font-bold text-secondary mb-4">⌘ Tickify</h1>

        {/* Spinner */}
        <div className="w-14 h-14 border-4 border-gray-300 border-t-secondary rounded-full animate-spin"></div>

        {/* Texto */}
        <p className="mt-4 text-gray-600 font-medium text-lg">
          Cargando ticket...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-500">
        {error}
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );

  if (!ticket)
    return (
      <div className="p-6 text-center text-gray-600">
        No se encontró la información del ticket.
      </div>
    );

  const fecha = new Date(ticket.evento_fecha_inicio);
  const fechaTexto = fecha.toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const horaTexto = fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-md mx-auto p-6">
      {/* --- ESTILOS DE IMPRESIÓN --- */}
      {/* Esto asegura que SOLO se imprima el ticket y se centre en la hoja */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-ticket, #printable-ticket * {
              visibility: visible;
            }
            #printable-ticket {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              border: none;
              box-shadow: none;
            }
            /* Ocultar headers y footers del navegador si es posible */
            @page {
              margin: 0;
              size: auto;
            }
          }
        `}
      </style>

      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-600 flex items-center gap-1 mb-4 hover:underline print:hidden" // print:hidden oculta esto
      >
        ← Volver
      </button>

      {/* Asignamos un ID para identificar el área de impresión */}
      <Card id="printable-ticket" className="shadow-lg rounded-2xl print:shadow-none print:border-2 print:border-black">
        <CardContent className="p-6 space-y-6 text-center">

          {/* --- LOGO PARA IMPRESIÓN --- */}
          {/* hidden en pantalla, block al imprimir */}
          <div className="hidden print:block mb-6">
            {/* Reemplaza esto con tu etiqueta <img> real si tienes el logo en assets */}
            <div className="flex justify-center items-center gap-2 mb-2">
              {/* Simulación del logo Tickify */}
              <span className="text-3xl font-bold text-black">⌘ Tickify</span>
            </div>
            <hr className="border-black" />
          </div>

          {/* Encabezado */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800 print:text-black">
              {ticket.evento_nombre}
            </h1>
            <p className="text-sm text-gray-500 mt-1 print:text-black">
              {ticket.tipo_ticket_nombre} • {ticket.zona_nombre}
            </p>
          </div>

          {/* QR con loader */}
          <div className="flex justify-center">
            <div className="relative w-56 h-56 flex items-center justify-center border rounded-lg shadow-sm bg-gray-50 print:border-black print:bg-white">
              {!isQrLoaded && (
                <div className="absolute inset-0 flex items-center justify-center print:hidden">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full"></div>
                </div>
              )}

              <img
                src={ticket.codigo_qr}
                alt="Código QR del ticket"
                onLoad={() => setIsQrLoaded(true)}
                onError={() => setIsQrLoaded(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${isQrLoaded ? "opacity-100" : "opacity-0"
                  }`}
              />
            </div>
          </div>

          {/* Información del evento */}
          <div className="space-y-2 text-left text-gray-700 text-sm print:text-black">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 print:text-black" />
              <span>
                <strong>Fecha:</strong> {fechaTexto}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 print:text-black" />
              <span>
                <strong>Hora:</strong> {horaTexto}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500 print:text-black" />
              <span>
                <strong>Lugar:</strong>{" "}
                {ticket.evento_nombre.includes("Estadio")
                  ? ticket.evento_nombre
                  : "Estadio Nacional"}
              </span>
            </div>
          </div>

          {/* Estado y compra */}
          <div className="text-xs text-gray-500 border-t pt-4 space-y-1 print:text-black print:border-black">
            <p>
              <strong>Código de compra:</strong> {ticket.compra_codigo_confirmacion}
            </p>
            <p>
              <strong>Estado:</strong>{" "}
              <span
                className={
                  ticket.estado.toLowerCase() === "valido"
                    ? "text-green-600 font-medium print:text-black"
                    : "text-red-600 font-medium print:text-black"
                }
              >
                {ticket.estado.toLowerCase() === "valido" ? "Vigente" : ticket.estado}
              </span>
            </p>
          </div>

          {/* Botón - OCULTO AL IMPRIMIR */}
          {/*<Button
            variant="outline"
            className="w-full mt-4 print:hidden"
            onClick={() => window.print()}
          >
            Descargar / Imprimir
          </Button>*/}
        </CardContent>
      </Card>
    </div>
  );
}