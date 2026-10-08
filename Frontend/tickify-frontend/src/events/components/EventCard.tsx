import { Button } from "@/components/ui/button";
import type { Evento } from "../types/event";

export default function EventCard(event: Evento) {
    const fallbackImageSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect fill='%23e5e7eb' width='800' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ESin imagen%3C/text%3E%3C/svg%3E`;

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col h-full">
            <img
                src={event.banner_url || fallbackImageSvg}
                alt={event.nombre}
                className="w-full h-40 object-cover"
                onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackImageSvg;
                }}
            />
            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-lg font-semibold">{event.nombre}</h3>

                <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                    {event.descripcion}
                </p>

                <p className="text-xs text-gray-500 mt-auto">
                    {new Date(event.fecha_inicio).toLocaleDateString()} -{" "}
                    {new Date(event.fecha_fin).toLocaleDateString()}
                </p>

                <div className="mt-4">
                    <Button asChild className="w-full">
                        <a href={`/eventos/${event.id}`}>Ver Detalles</a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
