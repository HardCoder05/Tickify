import { useEffect, useState } from "react";
import { getTicketsByUser, getCompraByCodigo } from "../services/PurcharseService";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";

// Tipos
interface TicketWithDetails {
  id: number;
  numero: string;
  fecha_compra: string;
  estado: string;
  precio_pagado: number;
  evento_nombre: string;
  evento_fecha_inicio: string;
  evento_fecha_fin: string;
  tarifa_nombre: string;
  zona_nombre: string;
  compra_codigo_confirmacion: string;
  tipo_ticket_nombre: string;
}

interface TicketsPorCompra {
  compra_codigo: string;
  evento_nombre: string;
  evento_fecha: string;
  tickets: TicketWithDetails[];
  monto_subtotal: number;
  monto_total: number;
  descuento_aplicado: number;
  metodo_pago: string;
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState<TicketsPorCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarHistoricos, setMostrarHistoricos] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user) throw new Error("Debes iniciar sesión para ver tus tickets.");

        const uid = user.id_user || user.id;
        if (!uid) throw new Error("Error de usuario.");

        // 1. Obtener todos los tickets
        const ticketsData: TicketWithDetails[] = await getTicketsByUser(uid);

        if (!ticketsData || ticketsData.length === 0) {
          setCompras([]);
          return;
        }

        // 2. Agrupar tickets por código de compra
        const gruposTemp: Record<string, TicketWithDetails[]> = {};
        ticketsData.forEach((t) => {
          if (!gruposTemp[t.compra_codigo_confirmacion]) {
            gruposTemp[t.compra_codigo_confirmacion] = [];
          }
          gruposTemp[t.compra_codigo_confirmacion].push(t);
        });

        // 3. Obtener detalles financieros (Fetch & Enrich)
        const codigosUnicos = Object.keys(gruposTemp);

        const comprasEnriquecidas = await Promise.all(
          codigosUnicos.map(async (codigo) => {
            const ticketsDelGrupo = gruposTemp[codigo];
            let detalleCompra = { monto_total: 0, monto_subtotal: 0, descuento_total_aplicado: 0, metodo_pago: '-' };

            try {
              detalleCompra = await getCompraByCodigo(codigo);
            } catch (e) {
              console.error(`No se pudo cargar detalle para compra ${codigo}`, e);
              const totalSumado = ticketsDelGrupo.reduce((sum, t) => sum + t.precio_pagado, 0);
              detalleCompra.monto_total = totalSumado;
              detalleCompra.monto_subtotal = totalSumado;
            }

            return {
              compra_codigo: codigo,
              evento_nombre: ticketsDelGrupo[0].evento_nombre,
              evento_fecha: ticketsDelGrupo[0].evento_fecha_inicio,
              tickets: ticketsDelGrupo,
              monto_total: detalleCompra.monto_total,
              monto_subtotal: detalleCompra.monto_subtotal,
              descuento_aplicado: detalleCompra.descuento_total_aplicado,
              metodo_pago: detalleCompra.metodo_pago
            };
          })
        );

        setCompras(comprasEnriquecidas);

      } catch (err: any) {
        setError(err.message || "No se pudieron cargar tus tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f9fafb]">
        <div className="w-14 h-14 border-4 border-gray-300 border-t-secondary rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium text-lg">
          Cargando historial de compras...
        </p>
      </div>
    );
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const ahora = new Date();

  // Filtrar y Ordenar
  const comprasFiltradas = compras
    .filter((c) => {
      const fechaEvento = new Date(c.tickets[0].evento_fecha_fin);
      return mostrarHistoricos ? fechaEvento < ahora : fechaEvento >= ahora;
    })
    .sort((a, b) => {
      const fechaA = new Date(a.evento_fecha).getTime();
      const fechaB = new Date(b.evento_fecha).getTime();
      return mostrarHistoricos ? fechaB - fechaA : fechaA - fechaB;
    });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {mostrarHistoricos ? "Historial de Eventos" : "Mis Próximos Eventos"}
        </h1>
        <Button
          variant="outline"
          onClick={() => setMostrarHistoricos(!mostrarHistoricos)}
        >
          {mostrarHistoricos ? "Ver Próximos" : "Ver Históricos"}
        </Button>
      </div>

      {comprasFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl shadow-inner">
          <p className="text-lg text-gray-700 font-medium mb-2">
            {mostrarHistoricos
              ? "No tienes tickets vencidos."
              : "No tienes tickets próximos."}
          </p>
          <p className="text-gray-500 mb-6">
            {mostrarHistoricos
              ? "No se encontraron eventos pasados asociados a tus tickets."
              : "No se encontraron eventos futuros asociados a tus tickets."}
          </p>
          {!mostrarHistoricos && (
            <Button asChild>
              <a href="/eventos">Ver eventos disponibles</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {comprasFiltradas.map((compra) => {
            // Agrupar tickets visualmente
            const ticketsAgrupados = Object.values(
              compra.tickets.reduce((acc: any, t) => {
                const key = `${t.tipo_ticket_nombre}-${t.zona_nombre}-${t.tarifa_nombre}`;
                if (!acc[key]) {
                  acc[key] = { ...t, cantidad: 0, total_grupo: 0 };
                }
                acc[key].cantidad += 1;
                acc[key].total_grupo += t.precio_pagado;
                return acc;
              }, {})
            ) as (TicketWithDetails & { cantidad: number, total_grupo: number })[];

            return (
              <div
                key={compra.compra_codigo}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
              >
                {/* Header Original CON BOTÓN DE IMPRIMIR */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{compra.evento_nombre}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        📅 {new Date(compra.evento_fecha).toLocaleDateString("es-PE", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Código de compra</p>
                        <p className="font-mono text-sm font-semibold">{compra.compra_codigo}</p>
                      </div>

                      {/* NUEVO BOTÓN AÑADIDO AQUÍ */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                        onClick={() => navigate(`/mis-tickets/imprimir/${compra.compra_codigo}`)}
                      >
                        <Printer className="w-3 h-3" />
                        Imprimir Tickets
                      </Button>

                    </div>
                  </div>
                </div>

                {/* Tickets agrupados (Diseño Original) */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700 text-sm mb-2">
                    Tus tickets ({compra.tickets.length})
                  </h3>

                  <div className="divide-y divide-gray-200 border rounded-lg">
                    {ticketsAgrupados.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{t.tipo_ticket_nombre}</p>
                          <p className="text-xs text-gray-500">Zona: {t.zona_nombre}</p>
                          <p className="text-xs text-gray-500">Tarifa: {t.tarifa_nombre}</p>
                          <p className="text-xs text-gray-500">
                            Cantidad: {t.cantidad} × S/ {t.precio_pagado.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">
                            S/ {t.total_grupo.toFixed(2)}
                          </p>
                          <p className={`text-xs font-medium ${t.estado.toLowerCase() === "valido" ? "text-green-600" : "text-gray-500"}`}>
                            {t.estado.toLowerCase() === "valido" ? "Vigente" : t.estado}
                          </p>
                          {/* Opcional: Mantener el botón individual o quitarlo si ya tienes el general */}
                          <div className="mt-1">
                            <Button
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/mis-tickets/${t.id}`)}
                            >
                              Ver detalle
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Original con Descuento */}
                <div className="border-t pt-4 mt-4 flex justify-end items-center">
                  <div className="text-right">
                    {compra.descuento_aplicado > 0 && (
                      <p className="text-xs text-green-600 mb-1">
                        Descuento aplicado: - S/ {compra.descuento_aplicado.toFixed(2)}
                      </p>
                    )}

                    <div className="flex items-baseline gap-2 justify-end">
                      <p className="text-sm text-gray-600">Total pagado: </p>
                      <p className="text-2xl font-bold text-gray-800">
                        S/ {compra.monto_total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}