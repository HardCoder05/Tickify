import { useEffect, useState } from "react";
import EventCard from "@/events/components/EventCard";
import { getEventos } from "@/events/services/EventService";
import { getCategorias } from "@/events/services/CategoryService";
import type { Evento, Categoria } from "@/events/types/event";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function normalizeDateInput(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export default function EventsPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [filteredEventos, setFilteredEventos] = useState<Evento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("");

  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [nombre, setNombre] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Cargar eventos y categorías
  useEffect(() => {
    setLoading(true);

    Promise.all([getEventos(), getCategorias()])
      .then(([eventData, catData]) => {
        eventData.sort(
          (a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
        );
        setEventos(eventData);
        setFilteredEventos(eventData);
        setCategorias(catData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...eventos];

    // Filtro por nombre
    if (nombre) {
      filtered = filtered.filter((ev) =>
        ev.nombre.toLowerCase().includes(nombre.toLowerCase())
      );
    }

    // Filtro por rango de fecha
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde ? normalizeDateInput(fechaDesde) : null;
      const hasta = fechaHasta ? normalizeDateInput(fechaHasta) : null;

      if (hasta) {
        hasta.setHours(23, 59, 59, 999);
      }

      filtered = filtered.filter((ev) => {
        const evDate = new Date(ev.fecha_inicio);

        if (desde && evDate < desde) return false;
        if (hasta && evDate > hasta) return false;
        return true;
      });
    }

    // Filtro por categoría
    if (categoriaSeleccionada && categoriaSeleccionada !== "all") {
      filtered = filtered.filter(ev =>
        ev.categoria_publico_id === Number(categoriaSeleccionada)
      );
    }

    setFilteredEventos(filtered);
    setPage(1);
  }, [nombre, fechaDesde, fechaHasta, categoriaSeleccionada, eventos]);

  const totalPages = Math.ceil(filteredEventos.length / perPage);
  const paginatedEventos = filteredEventos.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 items-end">
        <div className="flex flex-col gap-2">
          <Label>Buscar por nombre</Label>
          <Input
            type="text"
            placeholder="Nombre del evento"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-2">
            <Label>Fecha desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Fecha hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label>Categoría</Label>
          <Select
            value={categoriaSeleccionada}
            onValueChange={(value) => setCategoriaSeleccionada(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="mt-2 sm:mt-0"
          onClick={() => {
            setNombre("");
            setFechaDesde("");
            setFechaHasta("");
            setCategoriaSeleccionada("");
          }}
        >
          Limpiar filtros
        </Button>
      </div>

      {/* --- SECCIÓN DE CARGA MODIFICADA --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          {/* Logo Marca con animación */}
          <div className="text-5xl font-extrabold text-gray-300 animate-pulse tracking-widest select-none">
            ⌘ Tickify
          </div>

          {/* Loader Spinner */}
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800"></div>
            <p className="text-gray-500 font-medium text-sm animate-pulse">Cargando eventos...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Grilla */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedEventos.map((ev) => (
              <EventCard key={ev.id} {...ev} />
            ))}
          </div>

          {/* Paginación */}
          {paginatedEventos.length > 0 ? (
            <div className="flex justify-center mt-6 gap-2">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="px-4 py-2">
                {page} / {totalPages || 1}
              </span>
              <Button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              No se encontraron eventos con estos filtros.
            </div>
          )}
        </>
      )}
    </div>
  );
}