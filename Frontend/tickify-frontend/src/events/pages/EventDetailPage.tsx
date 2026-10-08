import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getFullEventById } from "../services/EventService";
import { getCategoriaById } from "../services/CategoryService";
import type { EventoCompleto, Categoria } from "../types/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react"; // Importar Loader2
import { useNotificationContext } from "@/contexts/NotificationContext";

// Nuevo componente Loader para la pantalla de carga
const Loader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div className="space-y-4 text-center">
      {/* 🚀 Logo/Marca (Reemplaza con tu logo si lo tienes) */}
      <div className="text-4xl font-extrabold text-gray-300 animate-pulse tracking-widest select-none">
        ⌘ Tickify
      </div>
      <p className="text-xl font-medium text-gray-700">Cargando el evento...</p>
      {/* Spinner de carga */}
      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-300 tracking-widest select-none" />
    </div>
  </div>
);

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { error: showError } = useNotificationContext();
  const [eventoCompleto, setEventoCompleto] = useState<EventoCompleto | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    getFullEventById(Number(id))
      .then(async (data) => {
        setEventoCompleto(data);
        setError(null);

        // Cargar categoría del evento
        if (data.evento?.categoria_publico_id) {
          try {
            const cat = await getCategoriaById(data.evento.categoria_publico_id);
            setCategoria(cat);
          } catch {
            console.warn("No se pudo obtener la categoría del evento");
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar el evento.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Se reemplaza el texto de carga por el componente Loader
  if (loading) return <Loader />;

  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!eventoCompleto) return <p className="text-center mt-10">Evento no encontrado</p>;

  const evento = eventoCompleto.evento;

  const handleCompra = () => {
    if (!evento) return;
    if (evento.estado !== "activo") {
      showError("Este evento no está disponible para la venta de entradas.");
      return;
    }
    navigate(`/eventos/${evento.id}/comprar`);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("es-PE", {
        dateStyle: "long",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const mapQuery = encodeURIComponent(evento.ubicacion || evento.ciudad || "Lima, Perú");

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div className="relative w-full h-[20vh] md:h-[30vh] lg:h-[70vh] overflow-hidden">
        {evento.banner_url ? (
          <img
            src={evento.banner_url}
            alt={evento.nombre}
            className="w-full h-full object-contain object-center"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No hay imagen disponible</span>
          </div>
        )}

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black/60 px-6 py-3 rounded-lg">
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
              {evento.nombre}
            </h1>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* COLUMNA PRINCIPAL */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <Link to="/eventos" className="text-sm text-gray-600 hover:underline">
                ← Volver a eventos
              </Link>
            </div>

            {/* Descripción */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4">Descripción</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {evento.descripcion || "No hay descripción disponible."}
              </p>
            </div>

            {/* Categoría */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4">Categoría</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {categoria?.nombre || "No hay categoría disponible."}
              </p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {categoria?.descripcion || "No hay descripción de categoría disponible."}
              </p>
            </div>

            {/* Fechas */}
            {eventoCompleto.fechas?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-3">Fechas del evento</h2>
                <ul className="space-y-2">
                  {eventoCompleto.fechas
                    .sort(
                      (a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
                    )
                    .map((fecha) => (
                      <li key={fecha.id} className="text-sm text-gray-700">
                        📅 {formatDateTime(fecha.fecha_inicio)}{" "}
                        {fecha.fecha_fin && `- ${formatDateTime(fecha.fecha_fin)}`}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* 🆕 Etapas del evento */}
            {eventoCompleto.etapas?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-3">Etapas del evento</h2>
                <ul className="space-y-2">
                  {eventoCompleto.etapas.map((etapa) => (
                    <li key={etapa.id} className="text-sm text-gray-700 flex justify-between">
                      <span className="font-medium">{etapa.nombre}</span>
                      <span className="text-gray-500">
                        {formatDateTime(etapa.fecha_inicio)} - {formatDateTime(etapa.fecha_fin)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 🆕 Tipos de ticket */}
            {eventoCompleto.tipos_ticket?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-3">Tipos de ticket</h2>
                <div className="space-y-3">
                  {eventoCompleto.tipos_ticket.map((tipo) => (
                    <div key={tipo.id} className="border rounded-lg p-4">
                      <p className="font-medium text-gray-800">{tipo.nombre}</p>
                      <p className="text-sm text-gray-600">
                        {tipo.descripcion || "Sin descripción"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Estado: {tipo.estado}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zonas y tarifas */}
            {eventoCompleto.zonas?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-3">Zonas y tarifas</h2>
                <div className="space-y-3">
                  {eventoCompleto.zonas.map((zona) => (
                    <div key={zona.id} className="border rounded-lg p-4">
                      <p className="font-medium text-gray-800">{zona.nombre}</p>
                      <p className="text-xs text-gray-500">Capacidad: {zona.capacidad}</p>

                      {eventoCompleto.tarifas
                        ?.filter((t) => t.zona_id === zona.id)
                        .map((tarifa) => (
                          <div
                            key={tarifa.id}
                            className="flex justify-between text-sm text-gray-700 mt-1"
                          >
                            <span>{tarifa.nombre}</span>
                            <span className="font-semibold">S/ {tarifa.precio.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ASIDE */}
          <aside className="md:col-span-1">
            <div className="md:sticky md:top-24 space-y-4">
              {/* Entradas */}
              <Card className="rounded-xl">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Entradas</h3>
                  <p className="text-sm text-gray-600">
                    Selecciona tus entradas y procede a la compra.
                  </p>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Capacidad</p>
                      <p className="text-lg font-bold">{evento.capacidad_maxima ?? "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Estado</p>
                      <p
                        className={`text-sm font-semibold ${evento.estado === "activo" ? "text-green-600" : "text-gray-500"
                          }`}
                      >
                        {evento.estado}
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={evento.estado !== "activo"}
                    onClick={handleCompra}
                  >
                    Comprar ahora
                  </Button>
                </CardContent>
              </Card>

              {/* Mapa */}
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium">Ubicación</p>
                      <p className="text-xs text-gray-500">
                        {evento.ubicacion || evento.ciudad || "No disponible"}
                      </p>
                    </div>
                  </div>

                  <iframe
                    title="Mapa del evento"
                    className="w-full h-52 rounded-md"
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps?q=$${mapQuery}&output=embed`}
                  />

                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=$${mapQuery}`,
                        "_blank"
                      )
                    }
                  >
                    Ver en Google Maps
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}