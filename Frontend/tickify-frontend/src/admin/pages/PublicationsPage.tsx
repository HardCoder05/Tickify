import { useEffect, useState } from "react";
import Pagination from "@/events/components/Pagination";
import { getEventos, getEventosWithFilters, updateEventoEstado, deleteEventAdmin, updateComision, getComision, getOrganizerInfo, getFullEventById } from "@/events/services/EventService";
import type { Evento } from "@/events/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Search, HandCoins, Settings2, Check, Trash2, Info  } from "lucide-react";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function PublicationsPage() {
  const { error: showError, success } = useNotificationContext();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosOriginales, setEventosOriginales] = useState<Evento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const eventosPorPagina = 6;

  useEffect(() => {
    loadEventos();
    loadComision();
  }, []);

  async function loadEventos() {
    try {
      setLoading(true);
      const data = await getEventos();
      setEventos(data);
      setEventosOriginales(data);
    } catch (err: any) {
      console.error(err);
      // Si es error de autenticación, redirigir al login
      if (err.message?.includes("token") || err.message?.includes("sesión") || err.response?.status === 401) {
        window.location.href = "/login";
      } else {
        showError("No se pudo completar la acción, intente más tarde");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadComision() {
    try {
      const comisionActual = await getComision();
      setComision(String(comisionActual));
    } catch (err: any) {
      console.error("Error al cargar comisión:", err);
      // Si es error de autenticación, redirigir al login
      if (err.message?.includes("token") || err.message?.includes("sesión")) {
        window.location.href = "/login";
        return;
      }
      // Si falla por otra razón, mantener el valor por defecto
      setComision("3");
      showError("No se pudo completar la acción, intente más tarde");
    }
  }

  const totalPaginas = Math.ceil(eventos.length / eventosPorPagina);
  const inicio = (currentPage - 1) * eventosPorPagina;
  const eventosVisibles = eventos.slice(inicio, inicio + eventosPorPagina);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPaginas) setCurrentPage(newPage);
  };

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (searchTerm.trim() === "") {
      // Si está vacío, cargar todos los eventos del backend
      try {
        setLoading(true);
        const data = await getEventos();
        setEventos(data);
        setEventosOriginales(data);
      } catch (err) {
        console.error("Error al cargar eventos:", err);
        showError("No se pudo completar la acción, intente más tarde");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // Filtrar por nombre llamando al backend
      const results = await getEventosWithFilters({ nombre: searchTerm.trim() });
      setEventos(results);
    } catch (err) {
      console.error("Error al buscar eventos:", err);
      showError("No se pudo completar la acción, intente más tarde");
    } finally {
      setLoading(false);
    }
  }

  const hoy = new Date();
  const formato = "yyyy-MM-dd";
  const [fechaInicio, setFechaInicio] = useState(format(hoy, formato));
  const [fechaFin, setFechaFin] = useState(format(hoy, formato));

  const handleEliminarFiltro = async () => {
    try {
      setLoading(true);
      // Limpia los campos de fecha
      const hoy = new Date();
      const formato = "yyyy-MM-dd";
      setFechaInicio(format(hoy, formato));
      setFechaFin(format(hoy, formato));

      // Recargar todos los eventos del backend
      const data = await getEventos();
      setEventos(data);
      setEventosOriginales(data);
    } catch (error) {
      console.error("Error al eliminar filtro de fechas:", error);
      showError("No se pudo completar la acción, intente más tarde");
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarFiltro = async () => {
    try {
      setLoading(true);

      // Convertir fechas del formato yyyy-MM-dd a ISO con time
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      // Validar que la fecha de inicio no sea mayor a la fecha de fin
      if (inicio > fin) {
        showError("La fecha de inicio no puede ser mayor a la fecha de fin");
        setLoading(false);
        return;
      }

      // Crear strings ISO: "2025-11-06T00:00:00"
      const fechaInicioISO = inicio.toISOString().split('Z')[0];
      const fechaFinISO = fin.toISOString().split('Z')[0];

      // Filtrar por rango de fechas llamando al backend
      const filtrados = await getEventosWithFilters({
        fecha_inicio: fechaInicioISO,
        fecha_fin: fechaFinISO,
      });

      setEventos(filtrados);
    } catch (error) {
      console.error("Error al aplicar filtro de fechas:", error);
      showError("No se pudo completar la acción, intente más tarde");
    } finally {
      setLoading(false);
    }
  };

  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(null);
  const [loadingEstado, setLoadingEstado] = useState(false);

  async function handleFilterByEstado(estado: string) {
    try {
      setLoadingEstado(true);

      // Toggle: si ya está seleccionado, deseleccionar
      if (estadoSeleccionado === estado) {
        setEstadoSeleccionado(null);
        // Recargar todos los eventos del backend
        const data = await getEventos();
        setEventos(data);
        setEventosOriginales(data);
      } else {
        setEstadoSeleccionado(estado);

        // Filtrar por estado llamando al backend
        const filtrados = await getEventosWithFilters({ estado: estado.toLowerCase() });
        setEventos(filtrados);
      }
    } catch (error) {
      console.error("Error al filtrar por estado:", error);
      showError("No se pudo completar la acción, intente más tarde");
    } finally {
      setLoadingEstado(false);
    }
  }

  // Estado para la comisión
  const [comision, setComision] = useState<string>("3");
  const [loadingComision, setLoadingComision] = useState(false);

  // Estado para el modal de información del evento
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [eventoCompletoModal, setEventoCompletoModal] = useState<any>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [organizadorInfo, setOrganizdorInfo] = useState<any>(null);
  const [loadingOrgInfo, setLoadingOrgInfo] = useState(false);

  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoAEliminar, setEventoAEliminar] = useState<number | null>(null);

  // Estados para el modal de confirmación de cambio de estado
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [eventoACambiarEstado, setEventoACambiarEstado] = useState<{ id: number; estado: string } | null>(null);

  async function handleActualizarComision() {
    const comisionValue = parseFloat(comision);

    // Validar que sea un número válido entre 0 y 100
    if (isNaN(comisionValue) || comisionValue <= 0 || comisionValue >= 20) {
      showError("La comisión ingresada no es válida");
      return;
    }

    try {
      setLoadingComision(true);
      await updateComision(comisionValue);
      success(`La nueva comisión (${comisionValue}) será aplicada a los nuevos eventos.`);
      // Recargar la comisión desde el backend para sincronizar
      await loadComision();
    } catch (error: any) {
      console.error("Error al actualizar comisión:", error);
      showError(error.message || "No se pudo completar la acción, intente más tarde");
    } finally {
      setLoadingComision(false);
    }
  }

  function handleEliminarEvento(eventoId?: number) {
    if (eventoId === undefined) return;
    setEventoAEliminar(eventoId);
    setShowDeleteModal(true);
  }

  async function confirmarEliminarEvento() {
    if (!eventoAEliminar) return;

    try {
      // Cambiar estado a cancelado en lugar de eliminar
      await updateEventoEstado(eventoAEliminar, "cancelado");
      // Eliminar el evento de la tabla (solo cuando se usa el botón eliminar)
      setEventos((prev) => prev.filter((e) => e.id !== eventoAEliminar));
      success("Evento eliminado correctamente");
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error("Error al eliminar evento:", error);
      showError(error.message || "No se pudo completar la acción, intente más tarde");
    } finally {
      setEventoAEliminar(null);
    }
  }

  async function confirmarCambioEstado() {
    if (!eventoACambiarEstado) return;

    try {
      const actualizado = await updateEventoEstado(eventoACambiarEstado.id, eventoACambiarEstado.estado);
      setEventos((prev) =>
        prev.map((e) => (e.id === eventoACambiarEstado.id ? { ...e, estado: actualizado.estado } : e))
      );
      success("Estado actualizado correctamente");
      setShowEstadoModal(false);
    } catch (error: any) {
      console.error("Error al cambiar estado:", error);
      showError(error.message || "No se pudo completar la acción, intente más tarde");
    } finally {
      setEventoACambiarEstado(null);
    }
  }

  async function handleAbrirInfoModal(evento: Evento) {
    try {
      setLoadingOrgInfo(true);
      setEventoSeleccionado(evento);
      setShowInfoModal(true);

      // Cargar información completa del evento (fechas, zonas, etc.)
      const eventoCompleto = await getFullEventById(evento.id);
      setEventoCompletoModal(eventoCompleto);

      // Cargar información del organizador (buscar por organizador_id, no usuario_id)
      const orgInfo = await getOrganizerInfo(evento.organizador_id, true);
      setOrganizdorInfo(orgInfo);
    } catch (error) {
      console.error("Error al cargar información del evento:", error);
      setOrganizdorInfo({ nombres: "Sin información", apellidos: "" });
      showError("No se pudo completar la acción, intente más tarde");
    } finally {
      setLoadingOrgInfo(false);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-6">Publicaciones de Eventos</h1>

      <div className="flex items-center justify-between gap-4">
        {/* Campo de búsqueda */}
        <form onSubmit={handleSearch} className="relative w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E47] w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#F5F5E5] border-none rounded-full text-black placeholder-[#9E9E47] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </form>

        {/* Botones */}
        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-[#E4E4E7] text-black flex items-center gap-2"
              >
                <HandCoins className="w-4 h-4" />
                Comisión
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-white border border-[#E4E4E7] shadow-md p-4">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">Porcentaje de comisión (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                  placeholder="Ingresa el porcentaje"
                  className="border border-[#E4E4E7] text-black"
                />
                <p className="text-xs text-gray-500 mt-2">
                  ℹ️ Esta comisión se aplicará solo a todos los nuevos eventos que se creen a partir de ahora.
                </p>
                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#e5e5d6] mt-2"
                  onClick={handleActualizarComision}
                  disabled={loadingComision}
                >
                  {loadingComision ? "Actualizando..." : "Aplicar"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-[#E4E4E7] text-black flex items-center gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Fecha
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 bg-white border border-[#E4E4E7] shadow-md p-4">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border border-[#E4E4E7] text-black"
                />

                <label className="text-sm font-medium text-gray-700 mt-2">Fecha fin</label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border border-[#E4E4E7] text-black"
                />

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    className="text-black border-[#E4E4E7]"
                    onClick={handleEliminarFiltro}
                  >
                    Eliminar
                  </Button>
                  <Button
                    className="bg-[#FFD700] text-black hover:bg-[#e5e5d6]"
                    onClick={handleAplicarFiltro}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-[#E4E4E7] text-black flex items-center gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Estado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2 bg-white border border-gray-200 shadow-lg rounded-lg">
              <div className="flex flex-col gap-2">
                {["Activo", "Cancelado"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => handleFilterByEstado(estado)}
                    className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition"
                  >
                    {estado}
                    {estadoSeleccionado === estado && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
        {/* Cabecera */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-[#F5F5E5] font-semibold text-gray-700 py-3 px-6">
          <div>Nombre del evento</div>
          <div>Fecha Inicio</div>
          <div>Fecha Fin</div>
          <div>Estado</div>
          <div>Fecha de creación</div>
          <div>Acciones</div>
        </div>

        {/* Filas */}
        {eventosVisibles.length > 0 ? (
          eventosVisibles.map((evento) => (
            <div
              key={evento.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center border-t border-gray-200 py-3 px-6"
            >
            {/*Nombre*/}
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-800">{evento.nombre}</span>
            </div>

            {/* Fecha Inicio*/}
            <div className="text-gray-600">
              {new Date(evento.fecha_inicio).toLocaleDateString()}
            </div>

            {/* Fecha Fin*/}
            <div className="text-gray-600">
              {new Date(evento.fecha_fin).toLocaleDateString()}
            </div>

            {/* Estado*/}
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="border border-gray-300 bg-white text-gray-800 text-sm px-3 py-1 hover:bg-gray-100"
                  >
                    {/* Mostrar con primera letra en mayúscula */}
                    {evento.estado.charAt(0).toUpperCase() + evento.estado.slice(1)}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-40 p-2 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <div className="flex flex-col gap-2">
                    {/* Mapa de estados válidos y sus etiquetas visibles */}
                    {["activo", "cancelado"].map((estado) => (
                      <button
                        key={estado}
                        onClick={async () => {
                          const estadoActual = evento.estado.toLowerCase();
                          if (estado !== estadoActual && evento.id) {
                            // Si está cambiando a cancelado, mostrar modal de confirmación
                            if (estado === "cancelado") {
                              setEventoACambiarEstado({ id: evento.id, estado });
                              setShowEstadoModal(true);
                            } else {
                              // Cambios a otros estados sin confirmación
                              try {
                                const actualizado = await updateEventoEstado(evento.id, estado);
                                setEventos((prev) =>
                                  prev.map((e) =>
                                    e.id === evento.id ? { ...e, estado: actualizado.estado } : e
                                  )
                                );
                                success("Estado actualizado correctamente");
                              } catch (error) {
                                console.error("Error al cambiar el estado:", error);
                                showError("No se pudo completar la acción, intente más tarde");
                              }
                            }
                          }
                        }}
                        className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black transition"
                      >
                        {/* Mostrar el texto capitalizado */}
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                        {/* Mostrar check al estado actual */}
                        {evento.estado.toLowerCase() === estado && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha de creación */}
            <div className="text-gray-600 text-sm">
              {evento.fecha_creacion ? new Date(evento.fecha_creacion).toLocaleDateString() : "N/A"}
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => handleAbrirInfoModal(evento)}
                className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                title="Ver información"
              >
                <Info className="w-4 h-4 text-black" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleEliminarEvento(evento.id)}
                className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                title="Eliminar evento"
              >
                <Trash2 className="w-4 h-4 text-black" />
              </Button>
            </div>
          </div>
          ))
        ) : (
          <div className="py-8 px-6 text-center text-gray-500">
            <p className="text-lg font-medium">No se encontraron resultados</p>
            <p className="text-sm mt-1">Intenta con otros criterios de búsqueda o filtros</p>
          </div>
        )}

      </div>
      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPaginas}
        onPageChange={handlePageChange}
      />

      {/* Modal de Información del Evento */}
      {showInfoModal && eventoSeleccionado && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-2xl font-bold text-gray-800">{eventoSeleccionado.nombre}</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 hover:text-gray-800 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="space-y-4">
              {/* Descripción */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Descripción</h3>
                <p className="text-gray-600">
                  {eventoSeleccionado.descripcion || "Sin descripción"}
                </p>
              </div>

              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Ubicación</h3>
                  <p className="text-gray-600">
                    {eventoSeleccionado.ubicacion}, {eventoSeleccionado.ciudad}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Capacidad Máxima</h3>
                  <p className="text-gray-600">{eventoSeleccionado.capacidad_maxima} personas</p>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Fecha Inicio</h3>
                  <p className="text-gray-600">
                    {new Date(eventoSeleccionado.fecha_inicio).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Fecha Fin</h3>
                  <p className="text-gray-600">
                    {new Date(eventoSeleccionado.fecha_fin).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Estado y Organizador */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Estado</h3>
                  <p className="text-gray-600 capitalize">{eventoSeleccionado.estado}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Correo Organizador</h3>
                  <p className="text-gray-600 break-all">
                    {loadingOrgInfo ? "Cargando..." : organizadorInfo?.correo_organizacional || "Sin información"}
                  </p>
                </div>
              </div>

              {/* Tipo de Evento */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Tipo de Evento</h3>
                <p className="text-gray-600">
                  {eventoCompletoModal?.fechas && eventoCompletoModal.fechas.length > 1 ? "Recurrente" : "Único"}
                </p>
              </div>

              {/* Banner */}
              {eventoSeleccionado.banner_url && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Banner</h3>
                  <img
                    src={eventoSeleccionado.banner_url}
                    alt={eventoSeleccionado.nombre}
                    className="w-full h-auto rounded-md max-h-48 object-cover"
                  />
                </div>
              )}

              {/* Horarios del Evento */}
              {eventoCompletoModal?.fechas && eventoCompletoModal.fechas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Horarios del Evento</h3>
                  <div className="space-y-2">
                    {eventoCompletoModal.fechas.map((fecha: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-md border border-gray-200"
                      >
                        <p className="text-sm text-gray-600">
                          <strong>Horario {idx + 1}:</strong>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Inicio:</strong>{" "}
                          {new Date(fecha.fecha_inicio).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Fin:</strong>{" "}
                          {new Date(fecha.fecha_fin).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Capacidad:</strong> {fecha.capacidad_maxima} | <strong>Disponible:</strong> {fecha.aforo_disponible}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zonas */}
              {eventoCompletoModal?.zonas && eventoCompletoModal.zonas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Zonas</h3>
                  <div className="space-y-2">
                    {eventoCompletoModal.zonas.map((zona: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-md border border-gray-200"
                      >
                        <p className="font-medium text-gray-800">{zona.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {zona.descripcion || "Sin descripción"}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Capacidad:</strong> {zona.capacidad}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón Cerrar */}
              <div className="flex justify-end mt-6">
                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#e5e5d6]"
                  onClick={() => setShowInfoModal(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              ¿Eliminar evento?
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 text-center mb-6">
              Esta acción eliminará el evento de forma <strong>irreversible</strong>. El evento desaparecerá de la tabla y no podrá ser recuperado.
            </p>

            {/* Botones */}
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-red-600 text-white hover:bg-red-700 px-6"
                onClick={confirmarEliminarEvento}
              >
                Eliminar
              </Button>
              <Button
                variant="outline"
                className="px-6"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEventoAEliminar(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cambio de Estado */}
      {showEstadoModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowEstadoModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              ¿Cancelar evento?
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 text-center mb-6">
              Esta acción es <strong>irreversible</strong>. Una vez cancelado, el evento no podrá volver a activarse.
            </p>

            {/* Botones */}
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-red-600 text-white hover:bg-red-700 px-6"
                onClick={confirmarCambioEstado}
              >
                Confirmar
              </Button>
              <Button
                variant="outline"
                className="px-6"
                onClick={() => {
                  setShowEstadoModal(false);
                  setEventoACambiarEstado(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}