import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EventTable from "../components/OrganizerEventTable"
import { getCurrentUser } from "@/users/services/AuthService";
import { getEventosByOrganizador, getFullEventById } from "../services/EventService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/ui/dropdown";
import { Search } from "lucide-react";


export default function OrganizerEventPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [myEvents, setMyEvents] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Resolver organizador_id preferentemente desde localStorage.user (login guardó organizador_id)
        const storedUserRaw = localStorage.getItem("user");
        let organizadorId: number | undefined;
        if (storedUserRaw) {
          try {
            const parsed = JSON.parse(storedUserRaw) as any;
            if (parsed && (parsed.organizador_id || parsed.organizadorId)) {
              organizadorId = Number(parsed.organizador_id ?? parsed.organizadorId);
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        // fallback a key plana localStorage.organizador_id
        if (!organizadorId) {
          const plainOrg = localStorage.getItem("organizador_id");
          if (plainOrg) organizadorId = Number(plainOrg);
        }

        // ultima opcion: llamar a /me y derivar id (menos ideal)
        if (!organizadorId) {
          try {
            const me = await getCurrentUser();
            // Si el endpoint /me devolviera un objeto con organizador_id lo usamos,
            // sino intentamos usar me.id (esto sólo funciona si backend devolviera organizador ids en me)
            organizadorId = (me as any)?.organizador_id ?? (me as any)?.organizadorId ?? (me as any)?.id;
          } catch (e) {
            console.warn("No se pudo obtener /me para resolver organizador_id:", e);
          }
        }

        if (organizadorId && typeof organizadorId === 'number') {
          const evs = await getEventosByOrganizador(organizadorId);
          if (!mounted) return;
          
          // Obtener los detalles completos de cada evento para tener las fechas
          const eventosCompletos = await Promise.all(
            (evs || []).map(async (evento) => {
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
          
          if (!mounted) return;
          // Filtrar eventos eliminados antes de mostrarlos en la UI
          const visibleEvents = (eventosCompletos || []).filter((e: any) => (e.estado || '').toLowerCase() !== 'eliminado');
          // Rely on backend permissions to return organizer's non-activos when appropriate.
          setMyEvents(visibleEvents);
        } else {
          // Si no se pudo resolver organizador_id mostrar vacío pero no fallar
          console.warn("No se encontró organizador_id en localStorage ni en /me. No se cargarán eventos del organizador.");
          setMyEvents([]);
        }
      } catch (err) {
        console.error('No se pudieron cargar eventos del usuario:', err);
        setMyEvents([]);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return (
    <div className="flex">
      {/* remove horizontal padding here; outer layout provides consistent px via max-w container */}
      <main className="flex-1">
        {/* Header: título y botón alineados */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mis Eventos</h1>

          <Link to="./createEvent">
            <Button
              size="sm"
              className="bg-black text-white flex items-center gap-2 hover:bg-gray-800"
            >
              Crear evento
            </Button>
          </Link>
        </div>

        {/* Toolbar: search + dropdown */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar eventos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>

            <div className="w-64">
              <Dropdown
                // use canonical backend states as values and show human labels
                options={[
                  { value: "", label: "Todos los estados" },
                  { value: "borrador", label: "Borrador" },
                  { value: "finalizado", label: "Finalizado" },
                  { value: "cancelado", label: "Cancelado" },
                  { value: "activo", label: "Activo" },
                ]}
                value={status}
                onChange={(v) => setStatus(v)}
                placeholder="Todos los estados"
              />
            </div>
          </div>
        </div>

        {/* Separación mayor entre el toolbar y la tabla/grilla */}
        <div>
          {myEvents === null ? (
            <div className="text-center p-6">Cargando tus eventos...</div>
          ) : myEvents.length === 0 ? (
            <div className="text-center p-6">
              <p className="text-lg font-medium mb-3">Aún no tienes eventos creados.</p>
              <p className="text-sm text-gray-600 mb-4">Crea tu primer evento para empezar a vender entradas.</p>
              
            </div>
          ) : (
            <EventTable searchTerm={search} statusFilter={status} events={myEvents} />
          )}
        </div>
      </main>
    </div>
  );

}
