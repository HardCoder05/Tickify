import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullEventById, getEventById, updateEvent } from "../services/EventService";
import type { Evento } from "../types/event";
import EventForm from "../components/EventForm";
import BackButton from "@/components/ui/backButton";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function OrganizerEditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useNotificationContext();
  const [initialData, setInitialData] = useState<Partial<Evento> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFullEventById(Number(id));
      // The "completo" endpoint returns a wrapper object like { evento: {...}, fechas: [...], zonas: [...], ... }
      // Normalize to the shape EventForm expects: top-level event fields plus fechas/zonas arrays.
      let normalized: Partial<Evento> | null = null;
      if ((data as any).evento) {
        const wrapper: any = data as any;
        normalized = {
          ...(wrapper.evento || {}),
          fechas: wrapper.fechas ?? wrapper.evento?.fechas ?? null,
          zonas: wrapper.zonas ?? wrapper.evento?.zonas ?? [],
          // keep other collections if present
          etapas: wrapper.etapas ?? wrapper.evento?.etapas ?? undefined,
          tipos_ticket: wrapper.tipos_ticket ?? wrapper.evento?.tipos_ticket ?? undefined,
        } as Partial<Evento>;
      } else {
        // already in expected shape
        normalized = data as Partial<Evento>;
      }
      setInitialData(normalized);
      console.log("OrganizerEditEventPage - fetched initialData (normalized):", normalized);
    } catch (err: any) {
      console.warn("getFullEventById failed, trying fallback", err);
      try {
  const fallback = await getEventById(Number(id));
  // fallback likely already has the top-level shape
  setInitialData(fallback);
  console.log("OrganizerEditEventPage - fetched fallback initialData:", fallback);
      } catch (err2: any) {
        console.error("Both fetch attempts failed", err2);
        setError("No se pudo cargar el evento para editar");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleSubmit = async (data: Partial<Evento>) => {
    if (!id) return;
    try {
      setSaving(true);
      const updatedEvent = await updateEvent(Number(id), { ...(data as Evento), id: Number(id) } as Evento);
      // Actualizar los datos locales con los cambios
      setInitialData(data);
      success("Evento actualizado con éxito 🎉");
      // Redirigir a la página de detalles después de guardar
      navigate(`/organizerEvent/${id}`);
      return updatedEvent; // Devolver el evento actualizado para que EventForm pueda usarlo
    } catch (err) {
      console.error(err);
      // If update failed due to missing authentication token, redirect to login
      const code = (err as any)?.code;
      const respDetail = (err as any)?.response?.data?.detail || (err as any)?.message;
      if (code === 'NO_TOKEN' || respDetail === 'Not authenticated' || /not authenticated/i.test(String(respDetail))) {
        showError('Necesitas iniciar sesión para editar este evento. Te redirigiré al login.');
        navigate('/login');
        return;
      }
      showError("Error al actualizar el evento");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-10">Cargando evento para editar...</p>;
  if (error) return (
    <div className="text-center mt-10">
      <p className="text-red-500">{error}</p>
      <div className="mt-4">
        <BackButton to="/organizerEvent" />
      </div>
    </div>
  );

  return (
    <div className="flex">
      <main className="flex-1 pl-12 pr-20 pt-3">
        <BackButton to={`/organizerEvent/${id}`} />
        <h1 className="text-2xl font-bold pt-5">Editar Evento</h1>

        <EventForm 
          initialData={initialData} 
          onSubmit={handleSubmit} 
          submitting={saving} 
          submitLabel="Actualizar evento"
          onSuccess={(eventId) => navigate(`/organizerEvent/${eventId}`)}
          isEditing={true}
        />

      </main>
    </div>
  );
}
