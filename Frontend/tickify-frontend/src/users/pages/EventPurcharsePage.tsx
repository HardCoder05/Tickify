import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEventoCompleto } from "../services/PurcharseService";
import type { EventoCompleto } from "@/events/types/event";
import { Button } from "@/components/ui/button";

export default function EventPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [eventoCompleto, setEventoCompleto] = useState<EventoCompleto | null>(null);
  const [selectedFechaId, setSelectedFechaId] = useState<number | null>(null);
  const [selectedTipoTicketId, setSelectedTipoTicketId] = useState<number | null>(null);
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchEventoCompleto(Number(id))
      .then((data: EventoCompleto) => {
        setEventoCompleto(data);
        setError(null);
      })
      .catch(() => setError("No se pudo cargar la información del evento"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!eventoCompleto?.etapas) {
      setSelectedEtapaId(null);
      return;
    }

    const now = new Date();
    const etapaActual = eventoCompleto.etapas.find(
      (e) => new Date(e.fecha_inicio) <= now && new Date(e.fecha_fin) >= now
    );

    setSelectedEtapaId(etapaActual ? etapaActual.id : null);
  }, [eventoCompleto]);

  const etapaSeleccionada = useMemo(() => {
    if (!selectedEtapaId || !eventoCompleto?.etapas) return null;
    return eventoCompleto.etapas.find((e) => e.id === selectedEtapaId);
  }, [selectedEtapaId, eventoCompleto]);

  const tarifasFiltradas = useMemo(() => {
    if (!eventoCompleto?.tarifas || !selectedTipoTicketId || !selectedEtapaId)
      return [];

    return eventoCompleto.tarifas.filter((t) =>
      t.tipo_ticket_id === selectedTipoTicketId &&
      t.etapa_id === selectedEtapaId
    );
  }, [eventoCompleto, selectedTipoTicketId, selectedEtapaId]);

  const handleSeleccionarTarifa = (tarifaId: number, zonaId: number, tar: { nombre: string, precio: number }) => {
    if (!selectedFechaId) {
      setError("Debes seleccionar una fecha antes de continuar");
      return;
    }

    navigate(
      `/eventos/${id}/seleccionar-asientos?fecha=${selectedFechaId}&zona=${zonaId}&tarifa=${tarifaId}&zonaNombre=${eventoCompleto?.zonas.find((z) => z.id === zonaId)?.nombre}&tarifaNombre=${tar.nombre}&tarifaPrecio=${tar.precio}` // 👈 CORRECCIÓN AQUÍ
    );
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f9fafb]">
        <h1 className="text-3xl font-bold text-secondary mb-4">⌘ Tickify</h1>
        <div className="w-14 h-14 border-4 border-gray-300 border-t-secondary rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium text-lg">Cargando evento...</p>
      </div>
    );

  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!eventoCompleto) return <div className="p-6 text-center">Evento no encontrado</div>;

  const { evento, zonas, tarifas, fechas, etapas, tipos_ticket } = eventoCompleto;

  const eventoNoConfigurado =
    !zonas?.length || !etapas?.length || !tipos_ticket?.length || !tarifas?.length;

  if (eventoNoConfigurado) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Evento en configuración
          </h2>
          <p className="text-gray-700 mb-6">
            Este evento aún no está listo para la venta de tickets.
          </p>

          <Button onClick={() => navigate(-1)} className="bg-yellow-400 hover:bg-yellow-500 text-black">
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-28">
      {/* Volver */}
      <button
        onClick={() => navigate(-1)}
        className="text-base text-gray-600 mb-4 flex items-center gap-1 mt-5"
      >
        <span>←</span> Volver
      </button>

      {/* Banner */}
      <div className="w-full h-48 sm:h-60 lg:h-64 mb-6 rounded-xl overflow-hidden">
        <img
          src={evento.banner_url}
          alt={evento.nombre}
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Info evento */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{evento.nombre}</h1>
        <p className="text-gray-600 mb-4">{evento.descripcion}</p>
      </div>

      {/* Etapa (solo lectura) */}
      {etapaSeleccionada && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Etapa</h2>

          <div className="flex flex-wrap gap-3">
            <button
              disabled
              className="
                    px-4 py-2 rounded-lg border text-sm
                    bg-purple-100 border-purple-400 text-purple-800 font-medium
                    opacity-70 cursor-not-allowed
                  "
            >
              {etapaSeleccionada.nombre}
            </button>
          </div>
        </div>
      )}

      {/* Tipos de ticket */}
      {tipos_ticket && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Selecciona el tipo de ticket</h2>
          <div className="flex flex-wrap gap-3">
            {tipos_ticket.map((t) => {
              const selected = selectedTipoTicketId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTipoTicketId(t.id)}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${selected
                    ? "bg-blue-100 border-blue-400 text-blue-800 font-medium"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  {t.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fecha */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Selecciona tu fecha</h2>
        <div className="flex flex-wrap gap-3">
          {fechas
            .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
            .map((fecha) => {
              const selected = selectedFechaId === fecha.id;

              return (
                <button
                  key={fecha.id}
                  onClick={() => setSelectedFechaId(fecha.id)}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${selected
                    ? "bg-yellow-100 border-yellow-400 text-yellow-800 font-medium"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  {new Date(fecha.fecha_inicio).toLocaleDateString()} –{" "}
                  {new Date(fecha.fecha_inicio).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              );
            })}
        </div>
      </div>

      {/* Tarifa → elegir asientos */}
      {selectedTipoTicketId && selectedEtapaId && selectedFechaId && (
        <>
          <h2 className="text-lg font-semibold mb-3">Selecciona tu tarifa</h2>

          {tarifasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay tarifas disponibles.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tarifasFiltradas.map((tar) => {
                const zona = eventoCompleto.zonas.find((z) => z.id === tar.zona_id);

                return (
                  <div
                    key={tar.id}
                    className="bg-[#fdfdf7] border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{tar.nombre}</h3>
                        <div className="text-yellow-600 font-bold text-2xl">s/. {tar.precio}</div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        Zona: <strong>{zona?.nombre || "Sin zona"}</strong>
                      </p>
                    </div>

                    <Button
                      disabled={!selectedEtapaId}
                      className="mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-400 hover:bg-yellow-500 text-black"
                      onClick={() => handleSeleccionarTarifa(tar.id, tar.zona_id, tar)}
                    >
                      Elegir asientos
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
