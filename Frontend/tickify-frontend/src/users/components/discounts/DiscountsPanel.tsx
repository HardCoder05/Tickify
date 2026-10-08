import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, Calendar, DollarSign, Percent, Pencil, Trash2 } from "lucide-react";
import DiscountCreateModal from "./DiscountCreateModal";
import { fetchDiscountsByEvent, updateDiscount, deleteDiscount } from "@/users/services/DiscountService";
import type { DiscountRead } from "@/users/types/discount";
import { useNotificationContext } from "@/contexts/NotificationContext";

type Props = {
    eventId: number;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
  };

  function formatDateShort(dateISO?: string) {
    if (!dateISO) return "-";
    const d = new Date(dateISO);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }).replace(".", "");
  }

  function computeStatus(d: DiscountRead) {
    const now = new Date();
    const start = d.fecha_inicio ? new Date(d.fecha_inicio) : null;
    const end = d.fecha_fin ? new Date(d.fecha_fin) : null;

    if (end && now > end) return { label: "Expirado", color: "bg-gray-200 text-gray-700" };
    if (d.estado?.toLowerCase() === "activo") return { label: "Activo", color: "bg-green-100 text-green-800" };
    return { label: "Inactivo", color: "bg-yellow-50 text-yellow-700" };
  }

  function usagePercent(d: DiscountRead) {
    const used = Number(d.usos_actuales ?? 0);
    const max = Math.max(0, Number(d.usos_maximos ?? 0));
    if (max === 0) return { percent: 0, label: `${used}`, bar: "bg-green-500" };
    const p = Math.min(100, Math.round((used / max) * 100));
    const bar =
      p >= 90 ? "bg-red-500" :
      p >= 60 ? "bg-yellow-500" :
      "bg-green-500";
    return { percent: p, label: `${used} / ${max}`, bar };
  }

  export default function DiscountsPanel({ eventId, eventStartDate = null, eventEndDate = null }: Props) {
    const { error: showError, success, confirm } = useNotificationContext();
    const [items, setItems] = useState<DiscountRead[]>([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState<DiscountRead | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
      setError(null);
      setLoading(true);
      try {
        console.log('🔍 DiscountsPanel: Cargando descuentos para evento:', eventId);
        const data = await fetchDiscountsByEvent(eventId);
        console.log('✅ DiscountsPanel: Descuentos recibidos:', data);
        console.log('✅ DiscountsPanel: Cantidad de descuentos:', Array.isArray(data) ? data.length : 0);
        setItems(data as DiscountRead[]);
      } catch (e: any) {
        console.error("❌ DiscountsPanel: Error al cargar descuentos:", e);
        console.error("❌ Status:", e?.status);
        console.error("❌ Body:", e?.body);
        console.error("❌ Message:", e?.message);
        
        // Si no hay descuentos o hay error, establecer lista vacía sin mostrar error al usuario
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => { 
      console.log('🔄 DiscountsPanel: useEffect ejecutándose con eventId:', eventId);
      load(); 
    }, [eventId]);

    async function handleToggleActive(d: DiscountRead) {
      try {
        const next = d.estado?.toLowerCase() === "activo" ? "inactivo" : "activo";
        const updated = await updateDiscount(d.id, { estado: next });
        setItems(prev => prev.map(x => x.id === d.id ? { ...x, ...updated } : x));
      } catch (e: any) {
        console.error("updateDiscount error:", e);
        showError(e?.body?.detail || e?.message || "No se pudo actualizar el estado");
      }
    }

    async function handleDelete(d: DiscountRead) {
      const confirmed = await confirm({
        title: 'Eliminar código de descuento',
        message: `¿Eliminar el código ${d.codigo}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      });
      if (!confirmed) return;
      try {
        await deleteDiscount(d.id);
        setItems(prev => prev.filter(x => x.id !== d.id));
      } catch (e: any) {
        console.error("deleteDiscount error:", e);
        showError(e?.body?.detail || e?.message || "No se pudo eliminar el descuento");
      }
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-yellow-500" />
              Códigos Promocionales
            </h2>
            <p className="text-sm text-muted-foreground">
              Códigos de descuento especiales aplicables al precio final
            </p>
          </div>
          <Button
            className="bg-yellow-400 text-black hover:bg-yellow-500"
            onClick={() => { setEditing(null); setOpenModal(true); }}
          >
            + Agregar Código
          </Button>
        </div>

        {/* Estado de carga */}
        {loading && <div className="text-sm text-muted-foreground">Cargando descuentos…</div>}

        {/* Listado */}
        <div className="space-y-4">
          {items.map((d) => {
            const st = computeStatus(d);
            const use = usagePercent(d);
            const isPercent = d.tipo_descuento?.toString().toLowerCase() === "porcentaje";

            return (
              <Card key={d.id} className="border rounded-xl">
                <CardContent className="p-5">
                  {/* Primera fila: código + estado + acciones + toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex px-2.5 py-1 rounded-md bg-black text-white text-xs font-semibold tracking-wide">
                        {d.codigo}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded border hover:bg-gray-50"
                        title="Editar"
                        onClick={() => { setEditing(d); setOpenModal(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded border hover:bg-red-50 text-red-600"
                        title="Eliminar"
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {/* Toggle simple */}
                      <label className="relative inline-flex items-center cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={d.estado?.toLowerCase() === "activo"}
                          onChange={() => handleToggleActive(d)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                      </label>
                    </div>
                  </div>

                  {/* Descripción */}
                  {d.descripcion && (
                    <p className="mt-2 text-sm text-gray-700">{d.descripcion}</p>
                  )}

                  {/* Grid de datos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Descuento</div>
                      <div className="flex items-center gap-1 font-medium">
                        {isPercent ? <Percent className="w-4 h-4 text-green-600" /> : <DollarSign className="w-4 h-4 text-green-600" />}
                        {isPercent ? `${Number(d.valor).toString()} %` : `S/ ${Number(d.valor).toFixed(2)}`}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground mb-1">Usos</div>
                      <div className="font-medium">
                        {Number(d.usos_actuales ?? 0)} / {Number(d.usos_maximos ?? 0)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground mb-1">Inicio</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateShort(d.fecha_inicio)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground mb-1">Fin</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateShort(d.fecha_fin)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Uso del código</span>
                      <span>{use.label}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded">
                      <div
                        className={`h-2 ${use.bar} rounded`}
                        style={{ width: `${use.percent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No hay códigos aún. Crea tu primer código.
            </div>
          )}
        </div>

        {/* Modal: reutilizamos el mismo componente para crear y editar */}
        <DiscountCreateModal
          open={openModal}
          onClose={() => { setOpenModal(false); setEditing(null); }}
          eventId={eventId}
          discountToEdit={editing}
          eventStartDate={eventStartDate}
          eventEndDate={eventEndDate}
          onCreated={(created: any) => {
            setOpenModal(false);
            setItems(prev => [created, ...prev]);
          }}
          onUpdated={(updated: any) => {
            setOpenModal(false);
            setEditing(null);
            setItems(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
          }}
        />
      </div>
    );
  }