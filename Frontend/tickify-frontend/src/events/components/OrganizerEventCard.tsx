import { useEffect } from "react";
import type { Evento } from "../types/event";
import { Calendar, MapPin, Clock } from "lucide-react";

type Props = Evento;

export default function EventCard(event: Props) {
    // Calcular capacidad total sumando capacidades de todas las fechas
    let capacidadTotal = 0;
    if (event.fechas && event.fechas.length > 0) {
        event.fechas.forEach((fecha) => {
            capacidadTotal += (fecha.capacidad_maxima ?? event.capacidad_maxima ?? 0);
        });
    } else {
        capacidadTotal = event.capacidad_maxima ?? 0;
    }

    // Usar el conteo real de tickets vendidos del backend
    const vendidos = event.tickets_vendidos ?? 0;
    let progress = 0;
    if (capacidadTotal > 0) {
        progress = Math.round((vendidos / capacidadTotal) * 100);
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
    }

    const fechaObj = (event.fechas && event.fechas.length > 0) ? event.fechas[0] : {
        capacidad_maxima: event.capacidad_maxima,
        aforo_disponible: 0,
        fecha_inicio: event.fecha_inicio,
        fecha_fin: event.fecha_fin,
    } as any;

    const startDate = new Date(event.fecha_inicio);
    const endDate = new Date(event.fecha_fin);

    const baseApiRaw = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
    // Si VITE_API_URL incluye "/api/v1" (como a veces se configura), usar el host raíz
    const baseApi = baseApiRaw.replace(/\/api\/v1\/?$/, "");
    const raw = event.banner_url as string | undefined | null;
    // Tratar como URL válida si es absoluta (http/https), protocolo de datos (data:), blob: o esquema protocol-relative (//)
    const isAbsoluteLike = raw ? /^(https?:|data:|blob:|\/\/)/i.test(raw) : false;
    const imgSrc = raw
        ? isAbsoluteLike
            ? raw
            : `${baseApi.replace(/\/+$/, "")}${raw.startsWith("/") ? "" : "/"}${raw}`
        : null;

    // Debug: log resolved image source to console to help debugging en dev
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.debug("[OrganizerEventCard] banner_url:", raw, "=> imgSrc:", imgSrc);
    }, [raw, imgSrc]);

    const fallbackImageSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect fill='%23e5e7eb' width='800' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ESin imagen%3C/text%3E%3C/svg%3E`;

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col h-[420px]">
            <div className="relative">
                <img
                    src={imgSrc || fallbackImageSvg}
                    alt={event.nombre}
                    className="w-full h-40 object-cover bg-gray-100"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImageSvg;
                    }}
                />
                {/* Badge top-left */}
                <div className="absolute top-2 left-2">
                    <span className="inline-block bg-black text-white text-xs px-2 py-1 rounded-full">{event.estado ? event.estado : 'Activo'}</span>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                <h3 className="text-lg font-semibold mb-1" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>{event.nombre}</h3>

                {/* Fecha */}
                <div className="text-xs text-gray-600 mb-2 space-y-1 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{startDate.toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="truncate block max-w-full">{event.ubicacion ?? event.ciudad ?? 'Ubicación'}</span>
                    </div>
                </div>

                {/* Asistentes y barra de progreso (sin números verdes ni precio) */}
                <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span className="">Vendidos: {vendidos} / {capacidadTotal}</span>
                        {/* Mostrar aforo_disponible tal cual vino del backend para depuración rápida */}
                    </div>
                    {/*<div className="text-xs text-gray-400 mb-2">Disponible (raw): {fechaObj.aforo_disponible ?? 'null'}</div>*/}

                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}