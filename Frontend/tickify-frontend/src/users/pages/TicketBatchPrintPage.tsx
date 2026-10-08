import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCompraByCodigo, getTicketById } from "../services/PurcharseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { TicketDetail } from "@/events/types/event";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface CompraDetail {
    id: number;
    codigo_confirmacion: string;
    tickets: TicketDetail[];
}

export default function TicketBatchPrintPage() {
    const { compraCodigo } = useParams<{ compraCodigo: string }>();
    const { error: showError } = useNotificationContext();
    const [compra, setCompra] = useState<CompraDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!compraCodigo) return;
        setLoading(true);

        const fetchFullData = async () => {
            try {
                // 1. Obtenemos la información básica de la compra
                const compraBasica = await getCompraByCodigo(compraCodigo);

                if (!compraBasica || !compraBasica.tickets) {
                    throw new Error("Compra incompleta");
                }

                // 2. "Enriquecemos" cada ticket pidiendo su detalle individual (que sí trae QR)
                const ticketsConQR = await Promise.all(
                    compraBasica.tickets.map(async (t: any) => {
                        try {
                            const detalle = await getTicketById(t.id);
                            return detalle;
                        } catch (error) {
                            console.error(`Error cargando ticket ${t.id}`, error);
                            return t;
                        }
                    })
                );

                // 3. Guardamos la compra con los tickets completos
                setCompra({
                    ...compraBasica,
                    tickets: ticketsConQR,
                });

            } catch (err) {
                console.error(err);
                showError("Error al cargar los tickets");
            } finally {
                setLoading(false);
            }
        };

        fetchFullData();
    }, [compraCodigo]);

    // --- LOADER DE PÁGINA PERSONALIZADO ---
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                {/* Logo con animación sutil */}
                <div className="text-4xl font-bold text-gray-300 animate-pulse mb-4 tracking-widest">
                    ⌘ Tickify
                </div>
                {/* Spinner elegante */}
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                <p className="text-gray-500 mt-4 text-sm font-medium">Preparando tus tickets...</p>
            </div>
        );
    }

    if (!compra) return <div className="p-10 text-center">No se encontró la compra.</div>;

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
            {/* ESTILOS DE IMPRESIÓN */}
            <style>
                {`
    @media print {
      body * { visibility: hidden; }
      #printable-area, #printable-area * { visibility: visible; }
      #printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .ticket-card {
        break-inside: avoid;
        page-break-inside: avoid;
        border: 1px dashed #000;
        margin-bottom: 20px;
      }
      .no-print { display: none !important; }
      
      @page {
        margin: 0;       /* Quita los márgenes para aprovechar la hoja */
        size: auto;      /* Ajuste automático */
      }
      
      /* Esto oculta específicamente los headers/footers en Chrome/Edge/Safari */
      @page {
        margin-top: 0;
        margin-bottom: 0;
      }
      
      /* Ocultar encabezados y pies de página generados por el navegador */
      body {
        margin: 1cm; /* Un pequeño margen de seguridad para el contenido */
      }
    }
  `}
            </style>

            {/* Botonera */}
            <div className="flex justify-between items-center mb-8 no-print">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    ← Volver
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => window.print()}>
                        🖨️ Imprimir Todos ({compra.tickets.length})
                    </Button>
                </div>
            </div>

            {/* ÁREA DE IMPRESIÓN */}
            <div id="printable-area" className="space-y-8">
                {/* Título del reporte */}
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-black">⌘ Tickify</span>
                    </div>
                    <p className="text-sm text-gray-600">Comprobante de compra: {compra.codigo_confirmacion}</p>
                </div>

                {/* Tickets */}
                {compra.tickets.map((ticket, index) => {
                    const fecha = new Date(ticket.evento_fecha_inicio);

                    // Creamos un estado local temporal dentro del map es complicado en React puro sin componentizar.
                    // Para simplificar y no crear un subcomponente extra solo por el estado del QR,
                    // usaremos un truco CSS: El loader está por defecto visible y la imagen lo tapa cuando carga.

                    return (
                        <Card key={ticket.id || index} className="ticket-card shadow-none border-2 border-dashed border-gray-300 print:border-black rounded-xl">
                            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">

                                {/* QR con Loader CSS */}
                                <div className="flex-shrink-0 w-40 h-40 bg-white p-2 border rounded print:border-black relative overflow-hidden">
                                    {ticket.codigo_qr ? (
                                        <>
                                            {/* Loader que se ve por detrás mientras carga */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-0">
                                                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                                            </div>

                                            {/* Imagen que tapa al loader al cargar */}
                                            <img
                                                src={ticket.codigo_qr}
                                                alt="QR"
                                                className="w-full h-full object-contain relative z-10 bg-white"
                                                onLoad={(e) => e.currentTarget.style.opacity = '1'}
                                                style={{ opacity: 0, transition: 'opacity 0.3s ease-in' }} // Efecto fade-in
                                            />
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                            Sin QR
                                        </div>
                                    )}
                                </div>

                                {/* Detalles */}
                                <div className="flex-grow text-center md:text-left space-y-3 w-full">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{ticket.evento_nombre}</h2>
                                        <p className="text-gray-600 font-medium">{ticket.tipo_ticket_nombre}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <Calendar className="w-4 h-4" />
                                            {fecha.toLocaleDateString("es-PE")}
                                        </div>
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <Clock className="w-4 h-4" />
                                            {fecha.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-2 justify-center md:justify-start sm:col-span-2">
                                            <MapPin className="w-4 h-4" />
                                            {ticket.zona_nombre}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                                        <span>Ticket #{ticket.numero || ticket.id}</span>
                                        <span className={`uppercase font-bold tracking-wider ${ticket.estado.toLowerCase() === "valido" ? "text-green-600" : "text-gray-500"}`}>
                                            {ticket.estado.toLowerCase() === "valido" ? "Vigente" : ticket.estado}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}