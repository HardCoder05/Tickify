import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textArea";
import Dropdown from "@/components/ui/dropdown";
import { getCategorias } from "@/events/services/CategoryService";
import type { Categoria } from "@/events/types/event";
import ImageDropzone from "@/components/ui/imageDropzone";
import TypeSelector from "../components/OrganizerTypeSelector";
import EventSchedule from "./EventSchedule";
import type { Evento, ZonaEvento, Tarifa } from "../types/event";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface Props {
  initialData?: Partial<Evento> | null;
  onSubmit: (data: Partial<Evento>) => Promise<any> | void;
  submitLabel?: string;
  submitting?: boolean;
  onSuccess?: (eventId: number) => void;
  isEditing?: boolean; // Nueva prop para indicar si estamos editando
}

export default function EventForm({ initialData = null, onSubmit, submitLabel = "Guardar evento", submitting = false, onSuccess, isEditing = false }: Props) {
  const { warning, error: showError } = useNotificationContext();
  const [nombre, setNombre] = useState(initialData?.nombre || "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || "");
  const [fechas, setFechas] = useState<any[] | null>(initialData?.fechas || null);
  const [showScheduleErrors, setShowScheduleErrors] = useState(false);
  const [ciudad, setCiudad] = useState(initialData?.ciudad || "");
  const [ubicacion, setUbicacion] = useState(initialData?.ubicacion || "");
  const [bannerUrl, setBannerUrl] = useState(initialData?.banner_url || "");
  const [tipoEvento, setTipoEvento] = useState(initialData?.fechas && initialData.fechas.length > 1 ? "Evento recurrente" : "Evento único");
  const [zonas, setZonas] = useState<ZonaEvento[]>(initialData?.zonas || []);

  useEffect(() => {
    // if initialData changes (e.g. loaded after fetch), update local state
    // Debug: log when form receives initial data to help diagnose prefill issues
    console.log("EventForm - initialData received:", initialData);
    setNombre(initialData?.nombre || "");
    setDescripcion(initialData?.descripcion || "");
    setFechas(initialData?.fechas || null);
    setCiudad(initialData?.ciudad || "");
    setUbicacion(initialData?.ubicacion || "");
    setBannerUrl(initialData?.banner_url || "");
    setTipoEvento(initialData?.fechas && initialData.fechas.length > 1 ? "Evento recurrente" : "Evento único");

    // If backend returns tarifas as a top-level array, merge them into zonas by zona_id
    const rawZonas: any[] = initialData?.zonas || [];
    const rawTarifas: any[] = (initialData as any)?.tarifas || [];

    if (rawTarifas.length > 0 && rawZonas.length > 0) {
      const byZona: Record<string, any[]> = {};
      rawTarifas.forEach((r) => {
        const key = String(r.zona_id);
        byZona[key] = byZona[key] || [];
        byZona[key].push(r);
      });

      const merged = rawZonas.map((z) => {
        const matches = byZona[String(z.id)] || [];
        const tarifas: Tarifa[] = matches.map((m) => ({
          id: m.id,
          zona_id: m.zona_id,
          tipo_ticket_id: m.tipo_ticket_id,
          etapa_id: m.etapa_id,
          nombre: m.nombre,
          descripcion: m.descripcion || "",
          precio: Number(m.precio) || 0,
          cantidad: Number(m.cantidad) || Number(m.limite) || 0,
          limite: Number(m.cantidad) || Number(m.limite) || 0,
          vendidos: m.vendidos || 0,
          estado: m.estado || "activo",
        }));

        return { ...z, tarifas };
      });

      setZonas(merged as ZonaEvento[]);
    } else {
      setZonas(rawZonas as ZonaEvento[]);
    }
  }, [initialData]);

  // local state for categorias and selected categoria id
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(
    (initialData as any)?.categoria_publico_id ?? null
  );

  // Load categorias from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await getCategorias();
        if (!mounted) return;
        setCategorias(cats || []);
        // If none selected yet, only use initialData if it exists (don't auto-select first)
        if (!selectedCategoriaId) {
          const initial = (initialData as any)?.categoria_publico_id;
          if (initial) setSelectedCategoriaId(initial);
          // No auto-select first category - user must choose explicitly
        }
      } catch (err) {
        console.warn("No se pudo cargar categorias_publico:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // show schedule errors when attempting to submit
    setShowScheduleErrors(true);
    // minimal validation: name + fechas
    if (!nombre) {
      warning("Ingresa el nombre del evento");
      return;
    }
    if (!fechas || fechas.length === 0) return; // EventSchedule will show inline message when showScheduleErrors is true

    const fecha_inicio = fechas[0].fecha_inicio;
    const fecha_fin = fechas[fechas.length - 1].fecha_fin;

    // Si estamos editando, no enviamos fechas, fecha_inicio, ni fecha_fin
    const payload: Partial<Evento> = isEditing
      ? {
          nombre,
          descripcion: descripcion || undefined,
          banner_url: bannerUrl || undefined,
          ciudad,
          ubicacion,
          categoria_publico_id: selectedCategoriaId ?? (initialData as any)?.categoria_publico_id ?? undefined,
        }
      : {
          nombre,
          descripcion: descripcion || undefined,
          fecha_inicio,
          fecha_fin,
          capacidad_maxima: initialData?.capacidad_maxima ?? 0,
          banner_url: bannerUrl || undefined,
          estado: initialData?.estado ?? "borrador",
          ciudad,
          ubicacion,
          fechas,
          zonas,
          organizador_id: initialData?.organizador_id ?? undefined,
          categoria_publico_id: selectedCategoriaId ?? (initialData as any)?.categoria_publico_id ?? undefined,
        };

    const result = await onSubmit(payload);
    
    // Obtener el ID del evento (ya sea del resultado o de initialData)
    const eventoId = (result as any)?.id || initialData?.id;
    
    // Si hay una imagen nueva y un evento ID, subirla después de guardar
    if (imageFile && eventoId) {
      try {
        console.log("📤 Subiendo imagen del evento...");
        const { uploadEventBanner } = await import("@/events/services/EventService");
        const uploadResult = await uploadEventBanner(eventoId as number, imageFile);
        console.log("✅ Imagen subida exitosamente:", uploadResult);
        setBannerUrl((uploadResult as any)?.banner_url || bannerUrl);
      } catch (err) {
        console.error("❌ Error al subir imagen:", err);
        showError("El evento se guardó pero hubo un error al subir la imagen. Intenta subirla nuevamente.");
      }
    }
    
    // Llamar callback con el ID del evento después de guardar exitosamente
    if (onSuccess && eventoId) {
      onSuccess(eventoId as number);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block mb-1 font-normal">Nombre</label>
        <Input
          type="text"
          placeholder="Ingrese el nombre del evento"
          className="bg-[#F5F5E5]"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-normal">Descripción</label>
        <Textarea
          placeholder="Descripción breve"
          className="bg-[#F5F5E5] h-24 resize-none w-full"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      {!isEditing && (
        <>
          <div>
            <label className="block mb-1 font-normal">Tipo de evento</label>
            <TypeSelector className="bg-[#F5F5E5]" nombre={nombre} descripcion={descripcion} initialTipo={tipoEvento} onTipoChange={(t) => setTipoEvento(t)} />
          </div>

          <div>
            <EventSchedule tipoEvento={tipoEvento} onFechasChange={(f) => setFechas(f)} initialFechas={fechas} showErrors={showScheduleErrors} />
          </div>
        </>
      )}

      <div>
        <label className="block mb-1 font-normal">Ciudad</label>
        <Input
          type="text"
          placeholder="Ej. Lima"
          className="bg-[#F5F5E5] w-90"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-1 font-normal">Ubicación</label>
        <Input
          type="text"
          placeholder="Ej. Dirección"
          className="bg-[#F5F5E5] w-90"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-1 font-normal">Categoría</label>
        <div className="w-90">
          <Dropdown
            className="bg-[#F5F5E5]"
            options={categorias.map((c) => ({ value: String(c.id), label: c.nombre }))}
            value={selectedCategoriaId ? String(selectedCategoriaId) : ""}
            placeholder={categorias.length === 0 ? "Cargando..." : "Seleccione una categoría"}
            onChange={(val) => {
              const id = Number(String(val || ""));
              if (!Number.isNaN(id)) setSelectedCategoriaId(id);
              else setSelectedCategoriaId(null);
            }}
          />
        </div>
      </div>

      <div>
        <ImageDropzone
          onUpload={(url: string) => {
            console.log("🖼️ Preview de imagen generado:", url);
            setBannerUrl(url);
          }}
          onFileSelect={(file: File) => {
            console.log("📁 Archivo seleccionado para subir al guardar:", file.name);
            setImageFile(file);
          }}
          eventoId={null}
          initialUrl={initialData?.banner_url ?? bannerUrl ?? null}
        />
      </div>

      <div className="mt-4">
        <Button
          type="submit"
          size="sm"
          disabled={submitting}
          className="bg-black text-white flex items-center gap-2 hover:bg-gray-800"
        >
          {submitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
