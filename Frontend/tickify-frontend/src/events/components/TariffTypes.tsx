import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SquarePen, Trash2, MapPin, Ticket, Tag, DollarSign, Eye } from "lucide-react";
import type { Tarifa } from "../types/event";
import { getTarifasByEvento, deleteTarifa, createTarifa } from "../services/TariffService";
import { getUsuariosByEvento } from "../services/EventService";
import { getTiposByEvento, getZonasByEvento, getEtapasByEvento, deleteTipoTicket, deleteZona, deleteEtapa } from "../services/TariffService";
import Panel from "@/components/PanelTariff";
import { Button } from "@/components/ui/button";
import ZoneCard from "./ZoneCard";
import ZoneModal from "./ZoneModal";
import ZoneEditModal from "./ZoneEditModal";
import TicketTypeModal from "./TicketTypeModal";
import TicketTypeEditModal from "./TicketTypeEditModal";
import EtapaModal from "./EtapaModal";
import EtapaEditModal from "./EtapaEditModal";
import TicketTypeCard from "./TicketTypeCard";
import EtapaCard from "./EtapaCard";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface Props {
  // view-only API mode: pass eventId to fetch tarifas
  eventId?: number;
  // Estado del evento para controlar si se pueden editar tarifas
  estadoEvento?: string;
}


export default function TarrifTypes(props: Props) {
  const { error: showError, success, confirm } = useNotificationContext();

  // Determinar si el evento está activo (no se pueden editar tarifas)
  const isEventoActivo = props.estadoEvento?.toLowerCase() === 'activo';
  
  // local state for zones
  const [zonas, setZonas] = useState<any[]>([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showEditZoneModal, setShowEditZoneModal] = useState(false);
  const [selectedZona, setSelectedZona] = useState<any | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showEditTicketModal, setShowEditTicketModal] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<any | null>(null);
  const [tipos, setTipos] = useState<any[] | null>(null);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [tiposError, setTiposError] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<any[] | null>(null);
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [etapasError, setEtapasError] = useState<string | null>(null);
  const [showEtapaModal, setShowEtapaModal] = useState(false);
  const [showEditEtapaModal, setShowEditEtapaModal] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<any | null>(null);
  const [creatingTarifas, setCreatingTarifas] = useState(false);
  const [showTarifasModal, setShowTarifasModal] = useState(false);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);

  useEffect(() => {
    if (!props.eventId) return;
    let mounted = true;
    setLoadingZonas(true);
    getZonasByEvento(props.eventId)
      .then((res) => {
        if (!mounted) return;
        // Assume response is an array of zones
        setZonas(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!mounted) return;
        setZonas([]);
      })
      .finally(() => mounted && setLoadingZonas(false));

    return () => {
      mounted = false;
    };
  }, [props.eventId]);

  // Load tipos for the event when eventId is present
  useEffect(() => {
    if (!props.eventId) return;
    let mounted = true;
    setLoadingTipos(true);
    getTiposByEvento(props.eventId)
      .then((res) => {
        if (!mounted) return;
        setTipos(Array.isArray(res) ? res : []);
        setTiposError(null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error('Error cargando tipos en UI:', err);
        setTipos([]);
        setTiposError(err?.message || (err?.response?.data?.detail ?? 'Error al cargar tipos'));
      })
      .finally(() => mounted && setLoadingTipos(false));

    return () => { mounted = false; };
  }, [props.eventId]);

  // Load etapas for the event when eventId is present
  useEffect(() => {
    if (!props.eventId) return;
    let mounted = true;
    setLoadingEtapas(true);
    setEtapasError(null);
    getEtapasByEvento(props.eventId)
      .then((res) => {
        if (!mounted) return;
        setEtapas(Array.isArray(res) ? res : []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error('Error cargando etapas en UI:', err);
        setEtapas([]);
        setEtapasError(err?.message || (err?.response?.data?.detail ?? 'Error al cargar etapas'));
      })
      .finally(() => mounted && setLoadingEtapas(false));

    return () => { mounted = false; };
  }, [props.eventId]);

  const handleEditZone = (id?: number) => {
    if (!id) return;
    const found = zonas?.find((z: any) => Number(z.id) === Number(id));
    if (found) {
      setSelectedZona(found);
      setShowEditZoneModal(true);
    }
  };

  const handleDeleteZone = async (id?: number) => {
    if (!id) return;
    const zona = zonas?.find((z: any) => Number(z.id) === Number(id));
    const zonaNombre = zona?.nombre || zona?.name || 'esta zona';
    const confirmed = await confirm({
      title: 'Eliminar zona',
      message: `¿Estás seguro de que deseas eliminar "${zonaNombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await deleteZona(id);
      success(`Zona "${zonaNombre}" eliminada exitosamente`);
      // Refetch the list after successful deletion
      if (props.eventId) {
        const res = await getZonasByEvento(props.eventId);
        setZonas(Array.isArray(res) ? res : []);
        // Limpiar tarifas para forzar recarga
        setTarifas([]);
      }
    } catch (err: any) {
      showError(err?.response?.data?.detail || err?.message || 'Error al eliminar la zona');
    }
  };

  const handleZoneCreated = (created: any) => {
    if (!created) return;
    setZonas((prev) => {
      const existingIndex = prev.findIndex((z: any) => z.id === created.id);
      if (existingIndex >= 0) {
        // Actualizar zona existente - usar datos más recientes preservando estructura
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...created };
        return updated;
      } else {
        // Agregar nueva zona al inicio de la lista
        return [created, ...prev];
      }
    });
  };

  const handleCreateTarifas = async () => {
    if (!props.eventId) {
      showError('No hay evento seleccionado');
      return;
    }

    const confirmed = await confirm({
      title: 'Generar tarifas automáticamente',
      message: 'Esto creará tarifas para todas las combinaciones de:\n• Zonas\n• Tipos de entrada\n• Etapas de venta\n\nAsegúrate de haber definido estos elementos antes de continuar.',
      confirmText: 'Generar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    
    if (!confirmed) return;

    setCreatingTarifas(true);
    try {
      const result = await createTarifa(props.eventId, {});
      success(`Se crearon ${Array.isArray(result) ? result.length : 0} tarifas exitosamente`);
      // Actualizar las tarifas después de crearlas
      if (props.eventId) {
        const updatedTarifas = await getTarifasByEvento(props.eventId);
        setTarifas(Array.isArray(updatedTarifas) ? updatedTarifas : []);
      }
    } catch (err: any) {
      console.error('Error creando tarifas:', err);
      showError(err?.response?.data?.detail || err?.message || 'Error al crear las tarifas');
    } finally {
      setCreatingTarifas(false);
    }
  };

  const handleVerTarifas = async () => {
    if (!props.eventId) {
      showError('No hay evento seleccionado');
      return;
    }

    setLoadingTarifas(true);
    try {
      const result = await getTarifasByEvento(props.eventId);
      setTarifas(Array.isArray(result) ? result : []);
      setShowTarifasModal(true);
    } catch (err: any) {
      console.error('Error cargando tarifas:', err);
      showError(err?.response?.data?.detail || err?.message || 'Error al cargar las tarifas');
    } finally {
      setLoadingTarifas(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mensaje de advertencia para eventos activos */}
      {isEventoActivo && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Evento Activo:</strong> No es posible modificar las tarifas, zonas, tipos de entrada o etapas mientras el evento esté activo.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Botón para generar tarifas */}
      <div className="space-y-3">
        {/* Mensaje informativo */}
        {!isEventoActivo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-700">
                Una vez que hayas configurado todas las zonas, tipos de entrada y etapas, <strong>haz clic en "Generar Tarifas Automáticamente"</strong> para crear todas las combinaciones de tarifas posibles.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <Button 
            onClick={handleVerTarifas} 
            disabled={!props.eventId || loadingTarifas}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Eye className="mr-2" size={18} />
            {loadingTarifas ? 'Cargando...' : 'Ver Tarifas'}
          </Button>
          <Button 
            onClick={handleCreateTarifas} 
            disabled={!props.eventId || creatingTarifas || isEventoActivo}
            className="bg-black hover:bg-gray-800 text-white"
            title={isEventoActivo ? "No se pueden generar tarifas en eventos activos" : ""}
          >
            <DollarSign className="mr-2" size={18} />
            {creatingTarifas ? 'Generando Tarifas...' : 'Generar Tarifas Automáticamente'}
          </Button>
        </div>
      </div>

      <Panel
        title={
          <div className="flex items-center">
            <MapPin className="mr-2" size={20} />
            <span>Zonas del Evento</span>
          </div>
        }
        description="Define las zonas disponibles para este evento."
        action={
          <Button 
            onClick={() => setShowZoneModal(true)} 
            disabled={isEventoActivo}
            title={isEventoActivo ? "No se pueden agregar zonas en eventos activos" : ""}
          >
            + Agregar Zona
          </Button>
        }
      >
        <div>
          {!props.eventId ? (
            <div className="text-sm text-gray-600">Pasa un <code>eventId</code> para cargar las zonas.</div>
          ) : loadingZonas ? (
            <div className="text-sm text-gray-600">Cargando zonas...</div>
          ) : zonas.length === 0 ? (
            <div className="text-sm text-gray-600">Aún no hay zonas definidas para este evento.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {zonas.map((z) => (
                <ZoneCard
                  key={z.id ?? z.nombre}
                  id={z.id}
                  nombre={z.nombre || z.name}
                  precio={z.precio_base ?? z.precio ?? z.price}
                  capacidad={z.capacidad ?? z.capacity ?? z.disponibles ?? z.available}
                  vendidos={z.vendidos ?? z.sold ?? 0}
                  onEdit={isEventoActivo ? undefined : handleEditZone}
                  onDelete={isEventoActivo ? undefined : handleDeleteZone}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      <ZoneModal
        open={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        eventoId={props.eventId}
        onCreated={(c) => {
          handleZoneCreated(c);
          setShowZoneModal(false);
        }}
      />

      <ZoneEditModal
        open={showEditZoneModal}
        onClose={() => {
          setShowEditZoneModal(false);
          setSelectedZona(null);
        }}
        eventoId={props.eventId}
        zona={selectedZona}
        onUpdated={(updated) => {
          // Refetch the full list to ensure UI is in sync with backend
          if (props.eventId) {
            getZonasByEvento(props.eventId)
              .then((res) => {
                setZonas(Array.isArray(res) ? res : []);
              })
              .catch((err) => {
                console.error('Error refetching zonas after update:', err);
              });
          }
          setShowEditZoneModal(false);
          setSelectedZona(null);
        }}
      />

      <Panel
        title={
          <div className="flex items-center">
            <Ticket className="mr-2" size={20} />
            <span>Tipos de Entrada</span>
          </div>
        }
  description="Define los tipos de entrada para este evento."
  action={
    <Button 
      onClick={() => setShowTicketModal(true)} 
      disabled={isEventoActivo}
      title={isEventoActivo ? "No se pueden agregar tipos en eventos activos" : ""}
    >
      + Agregar Tipo
    </Button>
  }
      >
        <div>
          {!props.eventId ? (
            <div className="text-sm text-gray-600">Pasa un <code>eventId</code> para cargar los tipos.</div>
          ) : loadingTipos ? (
            <div className="text-sm text-gray-600">Cargando tipos...</div>
          ) : tiposError ? (
            <div className="text-sm text-red-600">Error cargando tipos: {tiposError}</div>
          ) : !tipos || tipos.length === 0 ? (
            <div className="text-sm text-gray-600">Aún no hay tipos de entrada definidos para este evento.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tipos.map((t) => (
                <TicketTypeCard
                  key={t.id ?? t.nombre}
                  id={t.id}
                  nombre={t.nombre}
                  descripcion={t.descripcion}
                  incremento={t.incremento ?? (t.descuento_porcentaje ?? t.descuento ?? t.porcentaje_descuento ?? 0)}
                  changePercent={t.descuento_porcentaje ?? t.descuento ?? t.porcentaje_descuento ?? 0}
                  // Pass a handler that closes over the full tipo object so the modal
                  // receives the exact data shown in the list (avoids mismatched field names)
                  onEdit={isEventoActivo ? undefined : () => {
                    setSelectedTipo(t);
                    setShowEditTicketModal(true);
                  }}
                  onDelete={isEventoActivo ? undefined : async (id) => {
                    if (!id) return;
                    const confirmed = await confirm({
                      title: 'Eliminar tipo de ticket',
                      message: `¿Estás seguro de que deseas eliminar el tipo "${t.nombre}"? Esta acción no se puede deshacer.`,
                      confirmText: 'Eliminar',
                      cancelText: 'Cancelar',
                      type: 'danger'
                    });
                    if (!confirmed) return;
                    
                    try {
                      await deleteTipoTicket(id);
                      success(`Tipo de ticket "${t.nombre}" eliminado exitosamente`);
                      // Refetch the list after successful deletion
                      if (props.eventId) {
                        const res = await getTiposByEvento(props.eventId);
                        setTipos(Array.isArray(res) ? res : []);
                        // Limpiar tarifas para forzar recarga
                        setTarifas([]);
                      }
                    } catch (err: any) {
                      showError(err?.response?.data?.detail || err?.message || 'Error al eliminar el tipo de ticket');
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <TicketTypeModal
          open={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          eventoId={props.eventId}
          onCreated={(created) => {
            setTipos((prev) => (created ? [created, ...(prev || [])] : prev));
            setShowTicketModal(false);
          }}
        />

        <TicketTypeEditModal
          open={showEditTicketModal}
          onClose={() => {
            setShowEditTicketModal(false);
            setSelectedTipo(null);
          }}
          eventoId={props.eventId}
          tipo={selectedTipo}
          onUpdated={(updated) => {
            // Refetch the full list to ensure UI is in sync with backend
            if (props.eventId) {
              getTiposByEvento(props.eventId)
                .then((res) => {
                  setTipos(Array.isArray(res) ? res : []);
                })
                .catch((err) => {
                  console.error('Error refetching tipos after update:', err);
                });
            }
            setShowEditTicketModal(false);
            setSelectedTipo(null);
          }}
        />
      </Panel>

      <Panel
        title={
          <div className="flex items-center">
            <Tag className="mr-2" size={20} />
            <span>Etapas de Venta</span>
          </div>
        }
        description="Define las etapas de venta para este evento."
        action={
          <Button 
            onClick={() => setShowEtapaModal(true)} 
            disabled={isEventoActivo}
            title={isEventoActivo ? "No se pueden agregar etapas en eventos activos" : ""}
          >
            + Agregar Etapa
          </Button>
        }
      >
        <div>
          {!props.eventId ? (
            <div className="text-sm text-gray-600">Pasa un <code>eventId</code> para cargar las etapas.</div>
          ) : loadingEtapas ? (
            <div className="text-sm text-gray-600">Cargando etapas...</div>
          ) : etapasError ? (
            <div className="text-sm text-red-600">Error cargando etapas: {etapasError}</div>
          ) : !etapas || etapas.length === 0 ? (
            <div className="text-sm text-gray-600">Aún no hay etapas definidas para este evento.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {etapas.map((et: any) => (
                <EtapaCard
                  key={et.id ?? et.nombre}
                  id={et.id}
                  nombre={et.nombre}
                  porcentaje={et.porcentaje ?? et.descuento_adicional ?? 0}
                  fecha_inicio={et.fecha_inicio}
                  fecha_fin={et.fecha_fin}
                  estado={et.estado}
                  onEdit={isEventoActivo ? undefined : () => {
                    setSelectedEtapa(et);
                    setShowEditEtapaModal(true);
                  }}
                  onDelete={isEventoActivo ? undefined : async (id) => {
                    if (!id) return;
                    const confirmed = await confirm({
                      title: 'Eliminar etapa',
                      message: `¿Estás seguro de que deseas eliminar la etapa "${et.nombre}"? Esta acción no se puede deshacer.`,
                      confirmText: 'Eliminar',
                      cancelText: 'Cancelar',
                      type: 'danger'
                    });
                    if (!confirmed) return;
                    
                    try {
                      await deleteEtapa(id);
                      success(`Etapa "${et.nombre}" eliminada exitosamente`);
                      // Refetch the list after successful deletion
                      if (props.eventId) {
                        const res = await getEtapasByEvento(props.eventId);
                        setEtapas(Array.isArray(res) ? res : []);
                        // Limpiar tarifas para forzar recarga
                        setTarifas([]);
                      }
                    } catch (err: any) {
                      showError(err?.response?.data?.detail || err?.message || 'Error al eliminar la etapa');
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      <EtapaModal
        open={showEtapaModal}
        onClose={() => setShowEtapaModal(false)}
        eventoId={props.eventId}
        onCreated={(created) => {
          if (created && created.id) {
            setEtapas((prev) => (created ? [created, ...(prev || [])] : prev));
            console.debug('Etapa creada desde TariffTypes:', created);
          }
          setShowEtapaModal(false);
        }}
      />

      <EtapaEditModal
        open={showEditEtapaModal}
        onClose={() => {
          setShowEditEtapaModal(false);
          setSelectedEtapa(null);
        }}
        eventoId={props.eventId}
        etapa={selectedEtapa}
        onUpdated={(updated) => {
          // Refetch the full list to ensure UI is in sync with backend
          if (props.eventId) {
            getEtapasByEvento(props.eventId)
              .then((res) => {
                setEtapas(Array.isArray(res) ? res : []);
              })
              .catch((err) => {
                console.error('Error refetching etapas after update:', err);
              });
          }
          setShowEditEtapaModal(false);
          setSelectedEtapa(null);
        }}
      />

      {/* Modal para visualizar tarifas */}
      {showTarifasModal && (
        <div 
            className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTarifasModal(false)}
        >
          <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg">
                  <DollarSign className="text-black" size={20} />
                </div>
                <div>
                  <h2 className="text-xl text-white font-semibold">Tarifas Creadas</h2>
                  <p className="text-gray-300 text-sm mt-0.5">{tarifas.length} tarifa{tarifas.length !== 1 ? 's' : ''} registrada{tarifas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTarifasModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
                aria-label="Cerrar modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {tarifas.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Tag className="text-gray-400" size={32} />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No hay tarifas creadas aún</p>
                  <p className="text-gray-400 text-sm mt-2">Genera tarifas automáticamente para comenzar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Tarifa
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Precio
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tarifas.map((t, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-2 rounded-lg">
                                <Ticket className="text-gray-600" size={18} />
                              </div>
                              <span className="text-gray-900 font-medium">{t.nombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 font-semibold rounded-lg">
                              S/{Number(t.precio || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

}