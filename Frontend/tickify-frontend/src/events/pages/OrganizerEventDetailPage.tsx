import React, { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getFullEventById, getEventById, updateEventoEstado, deleteEvent, deleteEventoFecha, cancelarEvento, publicarEvento } from "../services/EventService";
import type { Evento } from "../types/event";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MapPin, Clock, Users, Check, ChevronDown, ChevronUp, Download } from "lucide-react";
import BackButton from "@/components/ui/backButton";
import TariffTypes from "../components/TariffTypes";
import type { ZonaEvento, Tarifa } from "../types/event";
import { getUsuariosByEvento, getUsuarioTicketsDetalle, getTicketsByUserAndEvent } from "../services/EventService";
import { getCategorias } from "@/events/services/CategoryService";
import { getCompraByCodigo } from "@/users/services/PurcharseService";
import type { Categoria } from "@/events/types/event";
import { useMemo } from "react";
import OrganizerDetailUser from "../components/OrganizerDetailUser";
import DiscountsPanel from "@/users/components/discounts/DiscountsPanel";
import TicketsByFunctionZone from "@/users/components/reports/TicketsByFunctionZone";
import RefundPolicyPDFUpload from "@/users/components/policies/RefundPolicyPDFUpload";
import { useNotificationContext } from "@/contexts/NotificationContext";
import ScheduleModal from "../components/ScheduleModal";
import RefundPolicyExport from "@/users/components/policies/RefundPolicyExport";
import RefundPolicyManager from "@/users/components/policies/RefundPolicyManager";

// Inline editable estado dropdown
function EstadoEditable({ evento, onUpdated }: { evento: Evento; onUpdated?: () => void }) {
    const { error: showError } = useNotificationContext();
    const mapEstado = (e?: string) => {
        if (!e) return 'activo';
        const low = e.toLowerCase();
        // legacy values: map "inactivo" -> "borrador"
        if (low === 'inactivo') return 'borrador';
        return low;
    };

    const allOptions = [
        { value: 'borrador', label: 'Borrador', color: 'bg-yellow-500' },
        { value: 'activo', label: 'Activo', color: 'bg-green-500' },
        { value: 'finalizado', label: 'Finalizado', color: 'bg-blue-500' },
        { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
    ];

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [value, setValue] = useState<string>(mapEstado(evento.estado));
    
    // Filtrar opciones según el estado actual:
    // 1. Si está activo, no mostrar borrador
    // 2. Nunca mostrar la opción de finalizado (se hace automáticamente)
    // 3. Si está cancelado, no mostrar el dropdown (deshabilitar cambios)
    const options = allOptions.filter(opt => {
        // Nunca permitir seleccionar manualmente "finalizado"
        if (opt.value === 'finalizado') return false;
        
        // Si está activo, no mostrar "borrador"
        if (value === 'activo' && opt.value === 'borrador') return false;
        
        return true;
    });
    
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setValue(mapEstado(evento.estado));
    }, [evento]);

    useEffect(() => {
        const onDocClick = (ev: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(ev.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const handleSelect = async (val: string) => {
        if (saving) return;
        setSaving(true);
        try {
            // Si el estado seleccionado es cancelado, usar la API específica de cancelación
            if (val === 'cancelado') {
                await cancelarEvento((evento as any).id);
            } else if (val === 'activo') {
                // Si se está cambiando a activo (publicar), usar el endpoint PATCH
                await publicarEvento((evento as any).id);
            } else {
                await updateEventoEstado((evento as any).id, val);
            }
            // No local override persistence: rely on backend permissions to return non-activos to organizers/admins.
            // The UI will refresh using the latest server state via onUpdated callback.

            setValue(val);
            onUpdated && onUpdated();
        } catch (err) {
            console.error('Error updating estado:', err);
            showError('No se pudo actualizar el estado');
        } finally {
            setSaving(false);
            setOpen(false);
        }
    };

    const currentOption = allOptions.find(o => o.value === value) || allOptions[0];
    
    // Si está cancelado o finalizado, no permitir cambios de estado
    const isReadOnly = value === 'cancelado' || value === 'finalizado';

    return (
        <div className="relative inline-block" ref={ref}>
            <button 
                type="button" 
                onClick={() => !isReadOnly && setOpen(!open)} 
                disabled={isReadOnly}
                className={`inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md text-sm w-44 justify-between ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${currentOption.color}`} />
                    <span className="capitalize">{currentOption.label}</span>
                </div>
                {!isReadOnly && (
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
            </button>

            {open && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg border overflow-hidden z-50">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            disabled={saving}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${opt.value === value ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`${opt.color} w-3 h-3 rounded-full inline-block`} />
                                <span className="text-sm">{opt.label}</span>
                            </div>
                            {opt.value === value ? <Check className="w-4 h-4 text-gray-600" /> : null}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OrganizerEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { error: showError, success: showSuccess, confirm } = useNotificationContext();
    const [evento, setEvento] = useState<Evento | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [zonas, setZonas] = useState<ZonaEvento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"detalles" | "tarifas" | "tickets" | "inscritos" >("detalles");
    const [realInscritos, setRealInscritos] = useState<number>(0); // Contador real de tickets vendidos
    const [inscritosPorFecha, setInscritosPorFecha] = useState<Map<number, number>>(new Map()); // Tickets por fecha
    const [inscritosPorTarifa, setInscritosPorTarifa] = useState<Map<number, number>>(new Map()); // Tickets por tarifa
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [deletingFechaId, setDeletingFechaId] = useState<number | null>(null);

    const fetchEvent = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getFullEventById(Number(id));
            // Normalize if endpoint returns wrapper { evento: {...}, fechas: [...], zonas: [...], ... }
            let normalized: Evento | any = data as any;
            if ((data as any).evento) {
                const wrapper: any = data as any;
                normalized = {
                    ...(wrapper.evento || {}),
                    fechas: wrapper.fechas ?? wrapper.evento?.fechas ?? null,
                    zonas: wrapper.zonas ?? wrapper.evento?.zonas ?? [],
                    etapas: wrapper.etapas ?? wrapper.evento?.etapas ?? undefined,
                    tipos_ticket: wrapper.tipos_ticket ?? wrapper.evento?.tipos_ticket ?? undefined,
                } as Evento;
            }
            setEvento(normalized);
            console.log("OrganizerEventDetailPage - fetched (normalized):", normalized);

            // Usar el conteo de tickets_vendidos que viene del backend
            // Si no está disponible, hacer el cálculo como fallback
            const ticketsVendidos = (normalized as any).tickets_vendidos;
            if (ticketsVendidos !== undefined && ticketsVendidos !== null) {
                setRealInscritos(ticketsVendidos);
                console.log('✅ Total de tickets vendidos (desde backend):', ticketsVendidos);
            } else {
                // Fallback: calcular desde usuarios
                try {
                    const usuarios = await getUsuariosByEvento(Number(id));
                    const totalTickets = usuarios.reduce((sum, u) => {
                        const count = u.tickets_count ?? u.cantidad_tickets ?? 0;
                        return sum + count;
                    }, 0);
                    setRealInscritos(totalTickets);
                    console.log('✅ Total de tickets vendidos (calculado):', totalTickets);
                } catch (err) {
                    console.warn('No se pudo obtener el conteo de inscritos:', err);
                    setRealInscritos(0);
                }
            }

            // Calcular tickets por fecha
            try {
                const usuarios = await getUsuariosByEvento(Number(id));
                const ticketsPorFecha = new Map<number, number>();
                usuarios.forEach(u => {
                    const fechaId = u.evento_fecha_id;
                    const count = u.tickets_count ?? u.cantidad_tickets ?? 0;
                    if (fechaId) {
                        ticketsPorFecha.set(fechaId, (ticketsPorFecha.get(fechaId) || 0) + count);
                    }
                });
                setInscritosPorFecha(ticketsPorFecha);
                console.log('✅ Tickets por fecha:', Object.fromEntries(ticketsPorFecha));
            } catch (err) {
                console.warn('No se pudo calcular tickets por fecha:', err);
                setInscritosPorFecha(new Map());
            }

            // Para tickets por tarifa se calculará desde la API cuando sea necesario
            setInscritosPorTarifa(new Map());

            setError(null);
        } catch (err: any) {
            console.error("Error getting full event:", err);
            // Try fallback to basic endpoint in case /completo is not available
            try {
                const fallback = await getEventById(Number(id));
                console.warn("Fell back to getEventById");
                setEvento(fallback);
                setError(null);
            } catch (err2: any) {
                console.error("Fallback also failed:", err2);
                const message = err2?.message || err?.message || String(err) || "Error desconocido";
                setError(`No se pudo cargar el evento: ${message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    // Load available categorias_publico to map ids to names
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const cats = await getCategorias();
                if (!mounted) return;
                setCategorias(cats || []);
                console.log('✅ categorias cargadas:', cats?.length || 0);
            } catch (err) {
                console.warn('No se pudieron cargar categorias_publico:', err);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // When evento changes, merge tarifas (if present) into zonas so TariffTypes can consume them
    useEffect(() => {
        if (!evento) return;
        const rawZonas: any[] = (evento as any).zonas || [];
        const rawTarifas: any[] = (evento as any).tarifas || [];

        if (rawTarifas.length > 0 && rawZonas.length > 0) {
            const byZona: Record<string, any[]> = {};
            rawTarifas.forEach((t) => {
                const key = String(t.zona_id);
                byZona[key] = byZona[key] || [];
                byZona[key].push(t);
            });

            const merged = rawZonas.map((z) => {
                const matches = byZona[String(z.id)] || [];
                const tarifas: Tarifa[] = matches.map((m) => ({
                    id: m.id,
                    zona_id: m.zona_id,
                    tipo_ticket_id: m.tipo_ticket_id,
                    etapa_id: m.etapa_id,
                    nombre: m.nombre,
                    precio: Number(m.precio) || 0,
                    cantidad: Number(m.cantidad) || 0,
                    estado: m.estado || "activo",
                }));

                return { ...z, tarifas };
            });

            setZonas(merged as ZonaEvento[]);
        } else {
            setZonas(rawZonas as ZonaEvento[]);
        }
    }, [evento]);

    // Calcular fechas de inicio y fin del evento para los descuentos (debe estar antes de los returns)
    const eventDates = useMemo(() => {
        if (!evento?.fechas || evento.fechas.length === 0) {
            return { startDate: null, endDate: null };
        }
        
        try {
            const fechas = evento.fechas.map((f: any) => ({
                inicio: new Date(f.fecha_inicio),
                fin: new Date(f.fecha_fin)
            }));
            
            const startDate = new Date(Math.min(...fechas.map(f => f.inicio.getTime())));
            const endDate = new Date(Math.max(...fechas.map(f => f.fin.getTime())));
            
            const toYmd = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            return {
                startDate: toYmd(startDate),
                endDate: toYmd(endDate)
            };
        } catch (error) {
            console.error('Error calculando fechas del evento:', error);
            return { startDate: null, endDate: null };
        }
    }, [evento?.fechas]);

    if (loading) return <p className="text-center mt-10">Cargando evento...</p>;
    if (error)
        return (
            <div className="text-center mt-10">
                <p className="text-red-500 mb-3">{error}</p>
                <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => fetchEvent()} className="px-4">
                        Reintentar
                    </Button>
                    <Link to="/organizerEvent">
                        <Button variant="outline" className="px-4">
                            Volver
                        </Button>
                    </Link>
                </div>
            </div>
        );

    if (!evento) return <p className="text-center mt-10">Evento no encontrado</p>;

    // Intentar obtener una fecha de creación: usar created_at si existe, si no usar fecha_inicio como fallback
    const createdAtIso = (evento as any).created_at ?? evento.fecha_inicio;
    const createdAt = createdAtIso ? new Date(createdAtIso) : null;
    const createdLabel = createdAt
        ? `Creado el ${createdAt.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}`
        : "";

    // mostrar label mapeado
    const rawEstado = (evento as any).estado ?? 'activo';
    const headerEstado = rawEstado.toLowerCase() === 'borrador' ? 'Inactivo' : (rawEstado.charAt(0).toUpperCase() + rawEstado.slice(1));

    // Resolver etiqueta de categoría: preferir campo directo `categoria`, si no mapear por `categoria_publico_id`
    const categoriaIdFromEvento = (evento as any).categoria_publico_id ?? (evento as any).categoriaId ?? (evento as any).categoria_id ?? null;
    const matchedCategoria = categoriaIdFromEvento ? categorias.find(c => Number(c.id) === Number(categoriaIdFromEvento)) : undefined;
    const categoriaLabel = (evento as any).categoria || matchedCategoria?.nombre || "Tecnología";

    // Ubicación compuesta: "direccion, ciudad" si existen
    const direccion = (evento as any).ubicacion || '';
    const ciudad = (evento as any).ciudad || '';
    const locationLabel = [direccion, ciudad].filter(s => s && String(s).trim().length > 0).join(', ') || 'Centro de Convenciones';

    // Calcular capacidad total
    const totalCapacity = evento.fechas && evento.fechas.length > 0
        ? evento.fechas.reduce((sum: number, f: any) => sum + (f.capacidad_maxima ?? evento.capacidad_maxima ?? 0), 0)
        : (evento.capacidad_maxima ?? 0);

    // Usar el conteo real de tickets vendidos en lugar de calcular con aforo_disponible
    const totalInscritos = realInscritos;

    return (
        <div className="min-h-screen ">
            <BackButton to="/organizerEvent" />

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                {/* Header: título + acciones */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">{evento.nombre}</h1>
                            <span className="inline-block bg-black text-white text-xs px-2 py-1 rounded-full">{headerEstado}</span>
                        </div>
                        {createdLabel && <p className="text-sm text-gray-500 mt-2">{createdLabel}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to={rawEstado.toLowerCase() === 'cancelado' || rawEstado.toLowerCase() === 'finalizado' ? '#' : `/organizerEvent/${id}/edit`}>
                            <Button
                                size="sm"
                                className="inline-flex items-center gap-2 bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={rawEstado.toLowerCase() === 'cancelado' || rawEstado.toLowerCase() === 'finalizado'}
                                onClick={(e) => {
                                    if (rawEstado.toLowerCase() === 'cancelado' || rawEstado.toLowerCase() === 'finalizado') {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Edit2 className="w-4 h-4" />
                                Editar Evento
                            </Button>
                        </Link>

                        <Button
                            size="sm"
                            className="inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-500"
                            onClick={async () => {
                                if (!id) return;

                                // Nueva validación: impedir eliminación si hay tickets vendidos
                                if (totalInscritos > 0) {
                                    showError(`No es posible eliminar el evento porque tiene ${totalInscritos} ticket(s) vendidos. Primero debes anular o reubicar las ventas.`);
                                    return;
                                }

                                const confirmed = await confirm({
                                    title: 'Eliminar evento',
                                    message: '¿Estás seguro que deseas eliminar este evento? Esta acción no se puede deshacer.',
                                    confirmText: 'Eliminar',
                                    cancelText: 'Cancelar',
                                    type: 'danger'
                                });
                                if (!confirmed) return;
                                try {
                                    setDeleting(true);
                                    await deleteEvent(Number(id));
                                    showSuccess('Evento eliminado correctamente');
                                    // navegación de regreso a la lista de eventos del organizador
                                    navigate('/organizerEvent');
                                } catch (err: any) {
                                    console.error('Error eliminando evento:', err);
                                    const msg = err?.message || err?.response?.data || 'No se pudo eliminar el evento';
                                    showError(msg);
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                            disabled={deleting}
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleting ? 'Eliminando...' : 'Eliminar Evento'}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                        <button
                            onClick={() => setActiveTab("detalles")}
                            className={`px-4 py-2 rounded-full text-sm ${activeTab === "detalles" ? "bg-white shadow" : "text-gray-600"}`}
                        >
                            Detalles
                        </button>
                        <button
                            onClick={() => setActiveTab("tarifas")}
                            className={`px-4 py-2 rounded-full text-sm ${activeTab === "tarifas" ? "bg-white shadow" : "text-gray-600"}`}
                        >
                            Tarifas
                        </button>
                        <button
                            onClick={() => setActiveTab("tickets")}
                            className={`px-4 py-2 rounded-full text-sm ${activeTab === "tickets" ? "bg-white shadow" : "text-gray-600"}`}
                        >
                            Tickets
                        </button>
                        <button
                            onClick={() => {
                                console.log('🔘 Cambiando a tab inscritos');
                                setActiveTab("inscritos");
                            }}
                            className={`px-4 py-2 rounded-full text-sm ${activeTab === "inscritos" ? "bg-white shadow" : "text-gray-600"}`}
                        >
                            Inscritos
                        </button>
                    </div>
                </div>

                {/* Content placeholder for each tab */}
                <div className="mt-6">
                    {(() => { console.log('📋 activeTab actual:', activeTab); return null; })()}
                    {activeTab === "detalles" && (
                        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                            {/* Información General header */}
                            <div>
                                <h2 className="text-lg font-semibold">Información General</h2>
                            </div>

                            {/* Descripción */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Descripción</h3>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{evento.descripcion || "No hay descripción disponible."}</p>
                            </div>

                            <hr />

                            {/* Estado del Evento (izq) y Categoría (der) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div>
                                    <h4 className="text-sm text-gray-600 mb-2">Estado del Evento</h4>
                                    <EstadoEditable evento={evento} onUpdated={() => fetchEvent()} />
                                </div>

                                <div className="md:text-right md:pr-10">
                                    <h4 className="text-sm text-gray-600 mb-2">Categoría</h4>
                                    <div className="inline-block bg-gray-100 text-sm px-2 py-1 rounded-md">{categoriaLabel}</div>
                                </div>
                            </div>


                            <hr />

                            {/* Capacidad total */}
                            <div>
                                <h3 className="text-sm text-gray-600">Capacidad Total</h3>
                                <div className="flex items-center gap-3 mt-3">
                                    <Users className="w-5 h-5 text-gray-600" />
                                    <div className="text-sm text-gray-800">{totalInscritos} / {totalCapacity} inscritos</div>
                                </div>
                            </div>

                            <hr />

                            {/* Ubicación */}
                            <div>
                                <h3 className="text-sm text-gray-600">Ubicación</h3>
                                <div className="flex items-center gap-3 mt-3 text-sm text-gray-800">
                                    <MapPin className="w-5 h-5 text-gray-600" />
                                    <div>{locationLabel}</div>
                                </div>
                            </div>

                            <hr />

                            {/* Horarios disponibles */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg> 
                                        Horarios Disponibles
                                    </h3>
                                    <Button
                                        size="sm"
                                        onClick={() => rawEstado.toLowerCase() === 'borrador' && setShowScheduleModal(true)}
                                        className="inline-flex items-center gap-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={rawEstado.toLowerCase() !== 'borrador'}
                                        title={rawEstado.toLowerCase() !== 'borrador' ? 'Solo se pueden modificar horarios en eventos en borrador' : ''}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Modificar Horarios
                                    </Button>
                                </div>

                                <div className="mt-4 space-y-4">
                                    {evento.fechas && evento.fechas.length > 0 ? evento.fechas.map((f: any, idx: number) => {
                                        const start = new Date(f.fecha_inicio);
                                        const end = new Date(f.fecha_fin);
                                        const capacity = f.capacidad_maxima ?? evento.capacidad_maxima ?? 0;
                                        // Usar el conteo real de tickets vendidos para esta fecha
                                        const inscritos = inscritosPorFecha.get(f.id) || 0;
                                        const progress = capacity > 0 ? Math.round((inscritos / capacity) * 100) : 0;
                                        const isFull = inscritos >= capacity;
                                        const day = start.toLocaleDateString('es-PE', { day: '2-digit' });
                                        const month = start.toLocaleDateString('es-PE', { month: 'short' });

                                        return (
                                            <div key={idx} className="border rounded-lg p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-blue-50 rounded-md flex flex-col items-center justify-center text-blue-600">
                                                        <div className="text-lg font-semibold">{parseInt(day)}</div>
                                                        <div className="text-xs">{month}</div>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Clock className="w-4 h-4 text-gray-600" />
                                                            <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                                            <Users className="w-4 h-4 text-gray-600" />
                                                            <span>{inscritos} / {capacity} inscritos</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-48">
                                                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className={`h-full ${isFull ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${progress}%` }} />
                                                        </div>
                                                        {isFull && <div className="mt-2"><span className="inline-block bg-red-600 text-white text-xs px-2 py-1 rounded-full">Lleno</span></div>}
                                                    </div>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            
                                                            // Permitir eliminar en borrador y activo
                                                            if (rawEstado.toLowerCase() !== 'borrador' && rawEstado.toLowerCase() !== 'activo') return;
                                                            
                                                            const confirmed = await confirm({
                                                                title: 'Eliminar horario',
                                                                message: '¿Estás seguro de que deseas eliminar este horario?',
                                                                confirmText: 'Eliminar',
                                                                cancelText: 'Cancelar',
                                                                type: 'danger'
                                                            });
                                                            if (!confirmed) return;
                                                            
                                                            setDeletingFechaId(f.id);
                                                            try {
                                                                await deleteEventoFecha(f.id);
                                                                showSuccess('Horario eliminado correctamente');
                                                                await fetchEvent();
                                                            } catch (error: any) {
                                                                console.error('Error al eliminar horario:', error);
                                                                const errorMsg = error?.response?.data?.detail || error?.message || 'No se pudo eliminar el horario';
                                                                showError(errorMsg);
                                                            } finally {
                                                                setDeletingFechaId(null);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={(rawEstado.toLowerCase() !== 'borrador' && rawEstado.toLowerCase() !== 'activo') ? 'No se pueden eliminar horarios en este estado' : 'Eliminar horario'}
                                                        disabled={deletingFechaId === f.id || (rawEstado.toLowerCase() !== 'borrador' && rawEstado.toLowerCase() !== 'activo')}
                                                    >
                                                        <Trash2 className="w-5 h-5 text-red-600 hover:text-red-700" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    }) : (
                                        <div className="text-sm text-gray-600">No hay horarios disponibles.</div>
                                    )}
                                </div>
                            </div>
                            <hr />
                            <div>
                                <RefundPolicyManager eventId={Number(id)}/>
                            </div>
                        </div>
                    )}

                    {activeTab === "tarifas" && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <TariffTypes eventId={Number(id)} estadoEvento={evento?.estado} />

                            {/* Separador con margen */}
                            <div className="my-8" />

                            {/* Discounts Panel */}
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <DiscountsPanel 
                                    eventId={Number(id)} 
                                    eventStartDate={eventDates.startDate}
                                    eventEndDate={eventDates.endDate}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "tickets" && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <TicketsByFunctionZone eventId={Number(id)} />
                        </div>
                    )}

                    {activeTab === "inscritos" && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Inscritos</h2>
                            </div>
                            <AttendeesList eventId={Number(id)} />
                        </div>
                    )}

                </div>
            </main>

            {/* Modal para modificar horarios */}
            {showScheduleModal && (
                <ScheduleModal 
                    eventId={Number(id)} 
                    fechas={evento?.fechas || []} 
                    onClose={() => setShowScheduleModal(false)} 
                    onUpdate={() => {
                        fetchEvent();
                        setShowScheduleModal(false);
                    }}
                />
            )}
        </div>
    );
}

function AttendeesList({ eventId }: { eventId: number }) {
    const { error: showError } = useNotificationContext();
    const [users, setUsers] = useState<any[] | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoadingUsers(true);
            setUsersError(null);
            try {
                console.log('🔍 Cargando usuarios del evento:', eventId);
                const res = await getUsuariosByEvento(eventId);
                console.log('✅ Respuesta de usuarios:', res);
                if (mounted) {
                    setUsers(res || []);
                    console.log('✅ Estado users actualizado con:', res?.length || 0, 'usuarios');
                }
            } catch (err: any) {
                console.error('❌ Error al cargar usuarios:', err);
                if (mounted) setUsersError(err?.message || 'Error al cargar asistentes');
            } finally {
                if (mounted) setLoadingUsers(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [eventId]);

    const rows = useMemo(() => {
        console.log('🔄 Recalculando rows, users:', users?.length || 0);
        if (!users) return [] as any[];
        return users.map((u, index) => {
            const nombre = u.nombres ?? u.name ?? u.nombre ?? '';
            const apellidos = u.apellidos ?? u.apellido ?? u.last_name ?? '';
            const nombreCompleto = `${nombre} ${apellidos}`.trim() || 'Sin nombre';
            const email = u.correo ?? u.email ?? '—';

            // Formatear horario
            let horario = '—';
            if (u.fecha_inicio) {
                const fechaInicio = new Date(u.fecha_inicio);
                const dia = fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                const hora = fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                horario = `${dia} - ${hora}`;
            }

            // Preferir la longitud real del arreglo de tickets si está disponible
            // (por ejemplo cuando el backend retorna `tickets` o `tickets_detalle`),
            // de lo contrario usar el campo `cantidad_tickets` como fallback.
            // Prefer server-provided lightweight count when available, then arrays, then legacy field
            const cantidadTickets = typeof u.tickets_count === 'number' ? u.tickets_count
                : Array.isArray(u.tickets) ? u.tickets.length
                    : Array.isArray(u.tickets_detalle) ? u.tickets_detalle.length
                        : (u.cantidad_tickets ?? 0);

            const row = {
                id: `${u.id}-${u.evento_fecha_id}-${index}`,
                name: nombreCompleto,
                email: email,
                horario: horario,
                cantidadTickets: cantidadTickets,
                originalData: u // Guardar los datos originales para el modal
            };

            console.log('📊 Row procesado:', row);
            return row;
        });
    }, [users]);

    const handleRowClick = async (row: any) => {
        console.log('🔍 Click en fila:', row);
        try {
            // Obtener los datos reales del backend
            const usuarioId = row.originalData.id;
            const eventoFechaId = row.originalData.evento_fecha_id;

            console.log('📡 Llamando API con:', { eventId, usuarioId, eventoFechaId });
            // Preferir endpoint nuevo que devuelve solo los tickets del usuario para este evento
            console.log('📡 Llamando nuevo endpoint de tickets por usuario y evento:', { eventId, usuarioId });
            const ticketsResp = await getTicketsByUserAndEvent(eventId, usuarioId);
            console.log('✅ Tickets (nuevo endpoint) obtenidos:', ticketsResp);

            // Formatear los datos para el modal usando información del renglón y los tickets retornados
            const fechaInicio = row.originalData.fecha_inicio ? new Date(row.originalData.fecha_inicio) : null;
            const horario = fechaInicio
                ? `${fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                : '—';

            const fechaRegistro = row.originalData.fecha_registro
                ? new Date(row.originalData.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

            // Procesar tickets obtenidos desde el nuevo endpoint
            let ticketsForModal = [] as any[];
            let totalPaid = 0;
            if (Array.isArray(ticketsResp) && ticketsResp.length > 0) {
                // Filtrar por fecha de evento seleccionada
                const filteredByDate = ticketsResp.filter((t: any) => Number(t.evento_fecha_id ?? t.eventoFechaId ?? t.evento_fecha ?? -1) === Number(eventoFechaId));
                // Filtrar por estado de compra y estado del ticket para mantener solo confirmados/validos
                const confirmed = filteredByDate.filter((t: any) => {
                    const compraEstado = (t.compra_estado ?? t.compraEstado ?? '').toString().toLowerCase();
                    const ticketEstado = (t.estado ?? '').toString().toLowerCase();
                    return (compraEstado === 'confirmada' || compraEstado === 'pagada' || compraEstado === 'paid' || compraEstado === 'confirmed')
                        && (ticketEstado === 'valido' || ticketEstado === 'valid' || ticketEstado === 'active');
                });

                const toUse = confirmed.length > 0 ? confirmed : filteredByDate;
                ticketsForModal = toUse.map((t: any) => ({
                    id: t.id,
                    zona: t.zona_nombre || t.zona || '—',
                    tipo: t.tipo_ticket_nombre || t.tipo || '—',
                    tarifa: t.tarifa_nombre || t.tarifa || '—',
                    numero: t.numero,
                    precio: Number(t.precio_pagado ?? t.precio ?? t.precio_pagado ?? 0),
                    descuento: Number(t.descuento_aplicado ?? 0),
                    compraCodigo: t.compra_codigo_confirmacion ?? t.compraCodigo ?? t.compra_codigo ?? null,
                    compraEstado: t.compra_estado ?? t.compraEstado ?? null,
                    eventoFechaId: t.evento_fecha_id ?? t.eventoFechaId ?? t.evento_fecha ?? null
                }));
                totalPaid = ticketsForModal.reduce((s: number, x: any) => s + (Number(x.precio) || 0), 0);
                console.log('🔎 tickets total (nuevo endpoint):', ticketsResp.length, 'after date filter:', filteredByDate.length, 'after confirmed filter:', confirmed.length, 'used:', ticketsForModal.length);
            } else {
                ticketsForModal = [];
            }

            // Obtener información de la compra si hay tickets
            let descuentoTotal = 0;
            let montoSubtotal = totalPaid;
            let montoTotal = totalPaid;
            if (ticketsForModal.length > 0 && ticketsForModal[0].compraCodigo) {
                try {
                    const compraInfo = await getCompraByCodigo(ticketsForModal[0].compraCodigo);
                    descuentoTotal = compraInfo.descuento_total_aplicado || 0;
                    montoSubtotal = compraInfo.monto_subtotal || totalPaid;
                    montoTotal = compraInfo.monto_total || totalPaid;
                    console.log('Info de compra obtenida:', { descuentoTotal, montoSubtotal, montoTotal });
                } catch (error) {
                    console.warn('No se pudo obtener info de compra:', error);
                }
            }

            const userDetail = {
                nombre: `${row.originalData.nombres ?? row.originalData.name ?? row.originalData.nombre ?? ''} ${row.originalData.apellidos ?? ''}`.trim(),
                email: row.originalData.correo ?? row.originalData.email ?? '—',
                horario: horario,
                fechaRegistro: fechaRegistro,
                tickets: ticketsForModal,
                totalPagado: montoTotal,
                descuentoTotal: descuentoTotal,
                subtotal: montoSubtotal
            };

            console.log('👤 UserDetail formateado:', userDetail);
            setSelectedUser(userDetail);
            // Actualizar la fila en la lista de asistentes para reflejar la cantidad real
            // mostrada en el modal (evita desincronía entre tabla y popup).
            try {
                setUsers((prev: any[] | null) => {
                    if (!prev) return prev;
                    return prev.map((pu: any) => {
                        if (pu.id === usuarioId) {
                            return {
                                ...pu,
                                cantidad_tickets: ticketsForModal.length,
                                // mantener los arrays para futuras renderizaciones
                                tickets: ticketsForModal,
                                tickets_detalle: ticketsForModal
                            };
                        }
                        return pu;
                    });
                });
                console.log('🔁 Updated attendees list with ticket counts for user', usuarioId, ticketsForModal.length);
            } catch (e) {
                console.warn('No se pudo actualizar la lista de asistentes con el conteo de tickets:', e);
            }
            console.log('✅ Modal debería abrirse ahora');
        } catch (error) {
            console.error('❌ Error al obtener detalles del usuario:', error);
            // Mostrar un mensaje de error o fallback
        }
    };

    // Exportar PDF — Lista de inscritos (se mantiene sin cambios de descuento porque es por usuario agregado)
    async function exportAttendeesPDF() {
        try {
            const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
            const autoTable = autoTableModule.default;
            const doc = new jsPDF("p", "pt", "a4");
            const marginLeft = 40;
            let y = 50;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Lista de Inscritos", marginLeft, y);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const fechaGen = new Date();
            doc.text(
                `Generado: ${fechaGen.toLocaleDateString("es-PE")} ${fechaGen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                marginLeft,
                y + 16
            );
            doc.text(`Evento ID: ${eventId}`, marginLeft, y + 30);
            y += 50;

            const head = [["#", "Nombre", "Email", "Horario", "Tickets"]];
            const body = rows.map((r: any, idx: number) => [idx + 1, r.name || "—", r.email || "—", r.horario || "—", Number(r.cantidadTickets ?? 0)]);

            const totalTickets = rows.reduce((s: number, r: any) => s + Number(r.cantidadTickets ?? 0), 0);
            const foot = [["Totales", "", "", `${rows.length} inscritos`, totalTickets]];

            autoTable(doc, {
                head,
                body,
                foot,
                startY: y,
                theme: "grid",
                styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
                headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: "bold" },
                footStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 140 },
                    2: { cellWidth: 180 },
                    3: { cellWidth: 90 },
                    4: { cellWidth: 60, halign: "right" },
                },
                didDrawPage: (data: any) => {
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(
                        `Página ${data.pageNumber} de ${pageCount}`,
                        doc.internal.pageSize.getWidth() - 80,
                        doc.internal.pageSize.getHeight() - 20
                    );
                },
            });

            doc.save(`inscritos_evento_${eventId}.pdf`);
        } catch (e) {
            console.error("Error creando PDF de inscritos:", e);
            showError("No se pudo generar el PDF de inscritos. Revisa la consola.");
        }
    }

    if (loadingUsers) {
        console.log('⏳ Mostrando loading...');
        return <div>Cargando asistentes...</div>;
    }
    if (usersError) {
        console.log('❌ Mostrando error:', usersError);
        return <div className="text-red-500">{usersError}</div>;
    }
    if (!users || users.length === 0) {
        console.log('📭 No hay usuarios. users:', users);
        return <div className="text-sm text-gray-600">No hay asistentes registrados.</div>;
    }
    console.log('✅ Renderizando tabla con', rows.length, 'filas');


    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">Total inscritos: {rows.length}</div>
                <div>
                    <Button
                        onClick={exportAttendeesPDF}
                        className="inline-flex items-center gap-2 bg-black text-white hover:bg-black/90 px-3 py-2 rounded-md text-sm"
                        title="Exportar lista de inscritos a PDF"
                    >
                        <Download size={16} /> Exportar Inscritos PDF
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden bg-white">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-sm font-medium text-gray-600">Nombre</th>
                            <th className="px-4 py-2 text-sm font-medium text-gray-600">Email</th>
                            <th className="px-4 py-2 text-sm font-medium text-gray-600">Horario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: any) => (
                            <tr
                                key={r.id}
                                className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleRowClick(r)}
                            >
                                <td className="px-4 py-3 text-gray-900">{r.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 break-all">{r.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{r.horario}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de detalles del usuario */}
            {selectedUser && (
                <OrganizerDetailUser
                    userDetail={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}
