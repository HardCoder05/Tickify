import { useNavigate } from "react-router-dom";
import { useState } from "react";
import BackButton from "@/components/ui/backButton";
import { useLocation } from "react-router-dom";
import { createEvent } from "../services/EventService";
import { getCurrentUser } from "@/users/services/AuthService";
import type { Evento } from "../types/event";
import EventForm from "../components/EventForm";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function OrganizerEventPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { error: showError, success } = useNotificationContext();
    const datos = (location.state as any) || {};
    const isEdit = datos.isEdit === true; // kept for backwards compatibility though clean option uses dedicated edit page

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: Partial<Evento>) => {
        try {
            setLoading(true);
            // add any required default fields before creating
            const payload: Partial<Evento> = {
                ...data,
            };
            // Ensure organizador_id is set to the current user's id (required by backend)
            try {
                // 1) Leer user desde localStorage
                let orgId: number | undefined;
                const userRaw = localStorage.getItem("user");
                let roleFromStorage = localStorage.getItem("role");
                if (userRaw) {
                    try {
                        const userObj = JSON.parse(userRaw);
                        // Si el role en storage indica ORGANIZADOR, debemos usar el organizador_id
                        // (el id de la tabla `organizadores`), no el id de usuario.
                        if (roleFromStorage === "ORGANIZADOR") {
                            if (userObj && (userObj.organizador_id || userObj.organizadorId || userObj.organizer_id)) {
                                orgId = Number(userObj.organizador_id ?? userObj.organizadorId ?? userObj.organizer_id);
                            }
                        } else {
                            // Para ADMIN o casos generales, preferimos que venga el organizador real si existe
                            if (userObj && (userObj.organizador_id || userObj.organizadorId || userObj.organizer_id)) {
                                orgId = Number(userObj.organizador_id ?? userObj.organizadorId ?? userObj.organizer_id);
                            }
                        }
                    } catch (e) {
                        console.warn("No se pudo parsear localStorage.user:", e);
                    }
                }

                // 2) Fallback a la clave dedicada `localStorage.organizador_id` si aún no tenemos orgId
                if (orgId === undefined || Number.isNaN(orgId)) {
                    const stored = localStorage.getItem("organizador_id");
                    if (stored) {
                        const parsed = Number(stored);
                        if (!Number.isNaN(parsed)) orgId = parsed;
                    }
                }

                // 3) Último recurso: llamar a /me (si el backend lo soporta en tu entorno)
                if (orgId === undefined || Number.isNaN(orgId)) {
                    try {
                        const current = await getCurrentUser();
                        const currentId = (current as any)?.id;
                        if (typeof currentId === "number") orgId = currentId;
                    } catch (e) {
                        console.warn("getCurrentUser() falló al intentar obtener organizador_id:", e);
                    }
                }

                if (orgId !== undefined && !Number.isNaN(orgId)) {
                    // Sobrescribir cualquier valor que venga en el formulario para evitar discrepancias
                    payload.organizador_id = orgId;
                } else {
                    console.warn("No se pudo determinar organizador_id desde localStorage o /me");
                }
            } catch (err) {
                console.warn("Error al resolver organizador_id antes de crear evento:", err);
            }
            // Sanity check: asegurarse que organizador_id está presente antes de enviar
            if (typeof (payload as any).organizador_id !== "number") {
                console.error("Payload antes de enviar (faltando organizador_id):", JSON.stringify(payload, null, 2));
                showError("No se pudo determinar el organizador. Revisa que estés logueado o que exista localStorage.organizador_id.");
                return;
            }
            // Log adicional para depuración: token y organizador_id
            try {
                const token = localStorage.getItem("token");
                console.log("DEBUG createEvent - token presente:", !!token);
                console.log("DEBUG createEvent - organizador_id enviado:", (payload as any).organizador_id);
            } catch (e) {
                console.warn("No se pudo leer token para debug:", e);
            }
            const createdEvent = await createEvent(payload as Evento);
            success("Evento creado con éxito 🎉");
            navigate("/organizerEvent");
            return createdEvent; // Devolver el evento creado para que EventForm pueda usarlo
        } catch (error: any) {
            console.error(error);
            // Si el error indica falta de token, redirigir al login
            if (error?.code === "NO_TOKEN" || error?.response?.status === 401) {
                showError("Necesitas iniciar sesión para crear un evento. Te redirijo al login.");
                navigate("/login");
                return;
            }
            showError("Hubo un error al crear el evento 😥");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex">
            <main className="flex-1 pl-12 pr-20 pt-3">
                <BackButton to="/organizerEvent" />
                <h1 className="text-2xl font-bold pt-5">Crear Evento</h1>

                <EventForm onSubmit={handleSubmit} submitting={loading} />

            </main>
        </div>
    );
}
