import { useEffect, useState } from "react";
import Pagination from "@/events/components/Pagination";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Info, Trash2, Check, X } from "lucide-react";
import type { Request } from "@/admin/types/request";
import { getSolicitudes, getSolicitudDetalles, deleteUsuario, responderSolicitud, updateUsuarioRol } from "@/admin/services/UserService";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function RequestsPage() {
  const { error: showError, success, confirm } = useNotificationContext();
  const [solicitudes, setSolicitudes] = useState<Request[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [solicitudDetalles, setSolicitudDetalles] = useState<any>(null);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null);

  const solicitudesPorPagina = 6;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No se encontró token.");
      return;
    }
    loadSolicitudes();
  }, []);

  async function loadSolicitudes() {
    try {
      setLoading(true);
      const data = await getSolicitudes();
      setSolicitudes(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalPaginas = Math.ceil(solicitudes.length / solicitudesPorPagina);
  const inicio = (currentPage - 1) * solicitudesPorPagina;
  const solicitudesVisibles = solicitudes.slice(inicio, inicio + solicitudesPorPagina);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPaginas) setCurrentPage(newPage);
  };

  async function handleAbrirDetalles(solicitud: Request) {
    try {
      setLoadingDetalles(true);
      setShowDetallesModal(true);

      // Cargar detalles de la solicitud
      const detalles = await getSolicitudDetalles(solicitud.id);
      setSolicitudDetalles({ ...solicitud, detalles });
    } catch (error) {
      console.error("Error al cargar detalles de la solicitud:", error);
      setSolicitudDetalles(solicitud);
    } finally {
      setLoadingDetalles(false);
    }
  }

  async function handleEliminarSolicitud(usuarioId: number) {
    const confirmed = await confirm({
      title: 'Eliminar solicitud',
      message: '¿Seguro que deseas eliminar esta solicitud?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteUsuario(usuarioId);
      // Actualizar la lista después de eliminar
      setSolicitudes((prev) => prev.filter((s) => s.id !== usuarioId));
    } catch (error) {
      console.error("Error al eliminar solicitud:", error);
      showError("No se pudo eliminar la solicitud");
    }
  }

  async function handleAceptarSolicitud(usuarioId: number) {
    const confirmed = await confirm({
      title: 'Aceptar solicitud',
      message: '¿Deseas aceptar esta solicitud?',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      type: 'info'
    });
    if (!confirmed) return;

    try {
      setRespondingRequestId(usuarioId);
      // Primero, responder la solicitud (cambiar estado a "activo")
      await responderSolicitud(usuarioId, "activo");
      // Segundo, cambiar el rol del usuario a "ORGANIZADOR"
      await updateUsuarioRol(usuarioId, "ORGANIZADOR");
      // Actualizar la lista después de aceptar
      setSolicitudes((prev) => prev.filter((s) => s.id !== usuarioId));
      setShowDetallesModal(false);
      success("Solicitud aceptada correctamente y rol actualizado a ORGANIZADOR");
    } catch (error) {
      console.error("Error al aceptar solicitud:", error);
      showError("No se pudo aceptar la solicitud");
    } finally {
      setRespondingRequestId(null);
    }
  }

  async function handleRechazarSolicitud(usuarioId: number) {
    const confirmed = await confirm({
      title: 'Rechazar solicitud',
      message: '¿Deseas rechazar esta solicitud?',
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    if (!confirmed) return;

    try {
      setRespondingRequestId(usuarioId);
      await responderSolicitud(usuarioId, "eliminado");
      // Actualizar la lista después de rechazar
      setSolicitudes((prev) => prev.filter((s) => s.id !== usuarioId));
      setShowDetallesModal(false);
      success("Solicitud rechazada correctamente");
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
      showError("No se pudo rechazar la solicitud");
    } finally {
      setRespondingRequestId(null);
    }
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-6">Solicitudes Pendientes</h1>

      {/* Tabla de solicitudes */}
      <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
        <div className="grid bg-[#F5F5E5] font-semibold text-gray-700 py-3 px-6" style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1.5fr 1fr" }}>
          <div>Nombre</div>
          <div>Correo Electrónico</div>
          <div>Teléfono</div>
          <div>Fecha Registro</div>
          <div>Acciones</div>
        </div>

        {solicitudesVisibles.length > 0 ? (
          solicitudesVisibles.map((solicitud) => (
            <div
              key={solicitud.id}
              className="grid items-center border-t border-gray-200 py-3 px-6"
              style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1.5fr 1fr" }}
            >
              <div className="font-medium text-gray-800 truncate">
                {solicitud.nombres} {solicitud.apellidos}
              </div>
              <div className="text-gray-700 truncate" title={solicitud.correo}>
                {solicitud.correo}
              </div>
              <div className="text-gray-700 truncate">{solicitud.telefono}</div>
              <div className="text-gray-700">
                {solicitud.fecha_registro ? new Date(solicitud.fecha_registro).toLocaleDateString() : "N/A"}
              </div>
              {/* Acciones */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleAbrirDetalles(solicitud)}
                  className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                  title="Ver información"
                >
                  <Info className="w-4 h-4 text-black" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleRechazarSolicitud(solicitud.id)}
                  className="bg-[#FFD700] hover:bg-[#e6c200] p-2 rounded-md"
                  title="Rechazar solicitud"
                >
                  <Trash2 className="w-4 h-4 text-black" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 px-6 text-center text-gray-500 col-span-5">
            <p className="text-lg font-medium">No hay solicitudes pendientes</p>
            <p className="text-sm mt-1">Todas las solicitudes han sido procesadas</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPaginas}
        onPageChange={handlePageChange}
      />

      {/* Modal de Detalles de Solicitud */}
      {showDetallesModal && solicitudDetalles && (
        <div
          className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
          onClick={() => setShowDetallesModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Solicitud de {solicitudDetalles.nombres} {solicitudDetalles.apellidos}
              </h2>
              <p className="text-gray-600">
                <strong>Fecha de envío:</strong> {solicitudDetalles.fecha_registro
                  ? new Date(solicitudDetalles.fecha_registro).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : "N/A"}
              </p>
            </div>

            {/* Contenido - Información del Organizador */}
            {loadingDetalles ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Cargando detalles...</p>
              </div>
            ) : solicitudDetalles.detalles ? (
              <div className="space-y-4">
                {/* DNI */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>DNI</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.dni || "N/A"}</p>
                </div>

                {/* Teléfono */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Teléfono</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.telefono || "N/A"}</p>
                </div>

                {/* Nombre de la Organización */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Nombre de la Organización</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.razon_social || "N/A"}</p>
                </div>

                {/* Dirección de la Organización */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Dirección de la Organización</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.direccion || "N/A"}</p>
                </div>

                {/* Sector de la Industria */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Sector de la Industria</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.sector || "N/A"}</p>
                </div>

                {/* RUC */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>RUC</strong>
                  </p>
                  <p className="text-gray-800">{solicitudDetalles.detalles.ruc || "N/A"}</p>
                </div>

                {/* Correo Organizacional */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Correo Organizacional</strong>
                  </p>
                  <p className="text-gray-800 break-all">{solicitudDetalles.detalles.correo_organizacional || "N/A"}</p>
                </div>

                {/* Motivación */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Motivación</strong>
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap">{solicitudDetalles.detalles.motivacion || "N/A"}</p>
                </div>

                {/* Botones Aceptar y Rechazar */}
                <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                    onClick={() => handleAceptarSolicitud(solicitudDetalles.id)}
                    disabled={respondingRequestId === solicitudDetalles.id}
                  >
                    <Check className="w-4 h-4" />
                    {respondingRequestId === solicitudDetalles.id ? "Procesando..." : "Aceptar"}
                  </Button>
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                    onClick={() => handleRechazarSolicitud(solicitudDetalles.id)}
                    disabled={respondingRequestId === solicitudDetalles.id}
                  >
                    <X className="w-4 h-4" />
                    {respondingRequestId === solicitudDetalles.id ? "Procesando..." : "Rechazar"}
                  </Button>
                  <Button
                    className="bg-[#FFD700] text-black hover:bg-[#e6c200]"
                    onClick={() => setShowDetallesModal(false)}
                    disabled={respondingRequestId === solicitudDetalles.id}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No se encontraron detalles de la solicitud</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
