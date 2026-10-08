import { useState, useEffect } from "react";
import type { Evento } from "../types/event";
import EventCard from "./OrganizerEventCard";
import { Link } from "react-router-dom";
import Pagination from "./Pagination";
import { getEventos, deleteEvent, getFullEventById } from "../services/EventService";


interface Props {
  searchTerm?: string;
  statusFilter?: string;
  // if events prop is provided, EventTable will use it instead of fetching all events
  events?: Evento[];
}

const EventTable: React.FC<Props> = ({ searchTerm = "", statusFilter = "", events: propsEvents }) => {
  const [events, setEvents] = useState<Evento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 6;

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      if (propsEvents) {
        setEvents(propsEvents);
        setLoading(false);
        return;
      }
      try {
        const data = await getEventos();
        if (!mounted) return;
        console.log("Eventos desde API:", data);
        
        // Obtener los detalles completos de cada evento para tener las fechas
        const eventosCompletos = await Promise.all(
          data.map(async (evento) => {
            try {
              if (evento.id) {
                const eventoCompleto = await getFullEventById(evento.id);
                // Combinar el evento básico con las fechas del evento completo
                return {
                  ...evento,
                  fechas: eventoCompleto.fechas
                };
              }
              return evento;
            } catch (error) {
              console.error(`Error obteniendo detalles del evento ${evento.id}:`, error);
              return evento; // Retornar el evento básico si falla
            }
          })
        );
        
        if (mounted) {
          setEvents(eventosCompletos);
        }
      } catch (error) {
        console.error("Error cargando eventos:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEvents();
    return () => { mounted = false; };
  }, [propsEvents]);


  // Apply search / status filters before pagination
  const normalizedSearch = (searchTerm || "").trim().toLowerCase();
  const normalizedStatus = (statusFilter || "").trim().toLowerCase();

  const filtered = events.filter((ev) => {
    // Exclude events marked as deleted so they don't appear in the UI
    if ((ev.estado || '').toLowerCase() === 'eliminado') return false;
    // search by nombre or descripcion
    if (normalizedSearch) {
      const haystack = `${ev.nombre} ${ev.descripcion || ""}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (normalizedStatus) {
      const evStatus = (ev.estado || "").toLowerCase();
      // allow user-friendly options like 'Activo' or 'Inactivo'
      if (normalizedStatus === "activo" && evStatus !== "activo") return false;
      if (normalizedStatus === "inactivo" && evStatus !== "inactivo") return false;
      if (normalizedStatus === "borrador" && evStatus !== "borrador") return false;
      if (normalizedStatus === "cancelado" && evStatus !== "cancelado") return false;
      if (normalizedStatus === "finalizado" && evStatus !== "finalizado") return false;
    }

    return true;
  });

  // Cálculo de paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEvents = filtered.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <p>Cargando eventos...</p>;

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentEvents.map((event) => (
          // EventCard espera recibir las props del evento directamente (spread)
          <Link to={`/organizerEvent/${event.id}`} key={event.id} className="block">
            <EventCard {...event} />
          </Link>
        ))}
      </div>

      {/* Componente de paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>

  );
};

export default EventTable;
