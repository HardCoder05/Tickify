import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Calendar,
  DollarSign,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  RefreshCcw,
  Filter,
  Info,
  Award,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MetricCard from "./parts/MetricCard";
import EventIncomeReport from "./EventIncomeReport";

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_V1 = `${BASE_URL}/api/v1`;
const REPORT_EVENT_ENDPOINT = (id: number) => `${BASE_URL}/reports/ingresos/${id}`;
const DEBUG = false;
const CONCURRENCY_LIMIT = 5;

/* -------------------------------------------------------------------------- */
/*  TIPOS                                                                     */
/* -------------------------------------------------------------------------- */
type FechaEvento = {
  fecha_inicio?: string;
  fecha_fin?: string;
  capacidad_maxima?: number;
  estado?: string;
};

type PorTipoTicket = { tipo_ticket: string; cantidad: number; ingresos: number };
type MetodoPago = { metodo: string; transacciones: number; ingresos: number };
type DescuentoItem = { codigo?: string; usos?: number; monto?: number };
type EtapaItem = { etapa?: string; ingresos: number };

type EventIncomeRaw = {
  ingresos_brutos: number;
  descuentos_aplicados: number;
  ingresos_netos: number;
  ticket_promedio: number;
  por_tipo_ticket: PorTipoTicket[];
  por_etapa: EtapaItem[];
  descuentos: DescuentoItem[];
  metodos_pago: MetodoPago[];
};

type OrganizerEventReport = {
  evento_id: number;
  nombre: string;
  ingresos_brutos: number;
  ingresos_netos: number;
  descuentos_aplicados: number;
  ticket_promedio: number;
  tickets_vendidos: number;
  por_tipo_ticket: PorTipoTicket[];
  por_etapa: EtapaItem[];
  descuentos: DescuentoItem[];
  metodos_pago: MetodoPago[];
  fechas: FechaEvento[];
  capacity_total: number;
  first_date?: string;
};

interface ReportMetrics {
  totalIngresos: number;
  totalTickets: number;
  ticketPromedio: number;
  eventosRealizados: number;
  eventosProximos: number;
}

interface OccupancyRow {
  evento_id: number;
  nombre: string;
  tickets_vendidos: number;
  capacidad_total: number;
  ocupacionPorc: number;
  monto_total: number;
}

/* -------------------------------------------------------------------------- */
/*  UTILS                                                                     */
/* -------------------------------------------------------------------------- */
function formatMoney(v: number) {
  return `S/ ${v.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function formatInt(v: number) {
  return v.toLocaleString("es-PE");
}
function dateIsPast(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getTime() < Date.now();
}
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* -------------------------------------------------------------------------- */
/*  COMPONENTE PRINCIPAL                                                      */
/* -------------------------------------------------------------------------- */
export default function GlobalIncomeReport() {
  const [eventsUniverse, setEventsUniverse] = useState<{ id: number; nombre: string }[]>([]);
  const [eventReports, setEventReports] = useState<Record<number, OrganizerEventReport>>({});
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedEventoId, setSelectedEventoId] = useState<number | "all">("all");

  /* ---------------------- Cargar lista de eventos (filtrar por organizador si aplica) ----- */
  useEffect(() => {
    let mounted = true;
    setLoadingEvents(true);
    setError(null);

    // Detectar si el usuario es ORGANIZADOR y obtener su organizador_id
    const userRole = localStorage.getItem("role");
    let organizadorId: number | null = null;

    if (userRole === "ORGANIZADOR") {
      // Intentar obtener organizador_id desde localStorage
      const plainOrgId = localStorage.getItem("organizador_id");
      if (plainOrgId && !isNaN(Number(plainOrgId))) {
        organizadorId = Number(plainOrgId);
      } else {
        // Fallback: intentar desde user object
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            if (parsed && (parsed.organizador_id || parsed.organizadorId)) {
              organizadorId = Number(parsed.organizador_id ?? parsed.organizadorId);
            }
          } catch (e) {
            console.error("Error parsing user from localStorage:", e);
          }
        }
      }
    }

    // Construir URL con filtro de organizador_id si aplica
    const params = new URLSearchParams();
    if (organizadorId) {
      params.append("organizador_id", String(organizadorId));
    }
    const queryString = params.toString();
    const url = `${API_V1}/eventos/${queryString ? `?${queryString}` : ""}`;

    axios
      .get(url, { headers: authHeaders() })
      .then((res) => {
        if (!mounted) return;
        const data = res.data && (res.data.data ?? res.data);
        if (!Array.isArray(data)) {
          setError("Formato inesperado en /api/v1/eventos/");
          return;
        }
        const all = data
          .map((e: any) => ({
            id: Number(e.id ?? e.evento_id ?? NaN),
            nombre: e.nombre ?? e.titulo ?? e.evento_nombre ?? `Evento ${e.id ?? ""}`,
          }))
          .filter((x: any) => Number.isFinite(x.id));
        setEventsUniverse(all);
        if (DEBUG) console.log("[EVENTS] universo (filtrado):", all, "organizadorId:", organizadorId);
      })
      .catch((err) => setError(err?.message || "Error cargando eventos"))
      .finally(() => {
        if (mounted) setLoadingEvents(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  /* --------- Cargar reportes ingresos; incluir solo los que respondan 200 -- */
  useEffect(() => {
    if (eventsUniverse.length === 0) {
      setEventReports({});
      return;
    }

    let canceled = false;
    setLoadingReports(true);
    setError(null);

    const queue = [...eventsUniverse];
    const reportsTemp: Record<number, OrganizerEventReport> = {};

    async function worker() {
      while (queue.length && !canceled) {
        const ev = queue.shift()!;
        try {
          // 1) ingresos: si 403, este usuario no puede ver este evento => ignorar
          const r = await axios.get(REPORT_EVENT_ENDPOINT(ev.id), { headers: authHeaders() });
          const data: EventIncomeRaw = r.data && (r.data.data ?? r.data);

          const ingresos_brutos = Number(data.ingresos_brutos ?? 0);
          const descuentos_aplicados = Number(data.descuentos_aplicados ?? 0);
          const ingresos_netos = Number(data.ingresos_netos ?? (ingresos_brutos - descuentos_aplicados));
          const ticket_promedio = Number(data.ticket_promedio ?? 0);

          const por_tipo_ticket = Array.isArray(data.por_tipo_ticket)
            ? data.por_tipo_ticket.map((t: any) => ({
                tipo_ticket: String(t.tipo_ticket ?? t.tipo ?? "N/D"),
                cantidad: Number(t.cantidad ?? 0),
                ingresos: Number(t.ingresos ?? 0),
              }))
            : [];
          const tickets_vendidos = por_tipo_ticket.reduce((s, t) => s + (Number.isFinite(t.cantidad) ? t.cantidad : 0), 0);

          const por_etapa = Array.isArray(data.por_etapa)
            ? data.por_etapa.map((e: any) => ({ etapa: e.etapa ?? e.nombre ?? undefined, ingresos: Number(e.ingresos ?? 0) }))
            : [];
          const descuentos = Array.isArray(data.descuentos)
            ? data.descuentos.map((d: any) => ({ codigo: d.codigo ?? d.coupon_code ?? d.nombre, usos: Number(d.usos ?? d.usos_aplicados ?? 0), monto: Number(d.monto ?? d.monto_aplicado ?? d.valor ?? 0) }))
            : [];
          const metodos_pago = Array.isArray(data.metodos_pago)
            ? data.metodos_pago.map((m: any) => ({ metodo: String(m.metodo ?? m.medio_pago ?? m.method ?? "N/D"), transacciones: Number(m.transacciones ?? 0), ingresos: Number(m.ingresos ?? 0) }))
            : [];

          // 2) fechas/capacidad
          let fechas: FechaEvento[] = [];
          let capacity_total = 0;
          let first_date: string | undefined;
          try {
            const rf = await axios.get(`${API_V1}/eventos/${ev.id}/fechas`, { headers: authHeaders() });
            const fd = rf.data && (rf.data.data ?? rf.data);
            if (Array.isArray(fd)) {
              fechas = fd.map((f: any) => ({
                fecha_inicio: f.fecha_inicio,
                fecha_fin: f.fecha_fin,
                capacidad_maxima: Number(f.capacidad_maxima ?? 0),
                estado: f.estado,
              }));
              capacity_total = fechas.reduce((s, f) => s + Number(f.capacidad_maxima ?? 0), 0);
              first_date = fechas.slice().sort((a, b) => new Date(a.fecha_inicio || 0).getTime() - new Date(b.fecha_inicio || 0).getTime())[0]?.fecha_inicio;
            }
          } catch {
            // si falla, seguimos sin capacidad
          }

          reportsTemp[ev.id] = {
            evento_id: ev.id,
            nombre: ev.nombre,
            ingresos_brutos,
            ingresos_netos,
            descuentos_aplicados,
            ticket_promedio,
            tickets_vendidos,
            por_tipo_ticket,
            por_etapa,
            descuentos,
            metodos_pago,
            fechas,
            capacity_total,
            first_date,
          };
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 403) {
            if (DEBUG) console.log("[REPORT] skip 403 (no autorizado)", ev.id);
            // No incluimos este evento en results
            continue;
          }
          if (DEBUG) console.warn("[REPORT] error evento", ev.id, e?.message || e);
          // Para errores distintos a 403, lo incluimos vacío para no romper UI
          reportsTemp[ev.id] = {
            evento_id: ev.id,
            nombre: ev.nombre,
            ingresos_brutos: 0,
            ingresos_netos: 0,
            descuentos_aplicados: 0,
            ticket_promedio: 0,
            tickets_vendidos: 0,
            por_tipo_ticket: [],
            por_etapa: [],
            descuentos: [],
            metodos_pago: [],
            fechas: [],
            capacity_total: 0,
            first_date: undefined,
          };
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
    Promise.all(workers)
      .then(() => {
        if (!canceled) {
          setEventReports(reportsTemp);
          // Si quedó seleccionado un evento que ya no está permitido, volvemos a "all"
          if (selectedEventoId !== "all" && !reportsTemp[selectedEventoId]) {
            setSelectedEventoId("all");
          }
        }
      })
      .catch(() => {
        if (!canceled) setError("Error cargando algunos reportes");
      })
      .finally(() => {
        if (!canceled) setLoadingReports(false);
      });

    return () => {
      canceled = true;
    };
  }, [eventsUniverse, refreshKey]);

  /* --------------------- Selección filtrada para métricas ------------------ */
  const filteredReports: OrganizerEventReport[] = useMemo(() => {
    const all = Object.values(eventReports);
    if (selectedEventoId === "all") return all;
    return all.filter((r) => r.evento_id === selectedEventoId);
  }, [eventReports, selectedEventoId]);

  /* ------------------------------ Métricas --------------------------------- */
  const metrics: ReportMetrics = useMemo(() => {
    if (filteredReports.length === 0)
      return {
        totalIngresos: 0,
        totalTickets: 0,
        ticketPromedio: 0,
        eventosRealizados: 0,
        eventosProximos: 0,
      };
    const totalIngresos = filteredReports.reduce((s, r) => s + r.ingresos_brutos, 0);
    const totalTickets = filteredReports.reduce((s, r) => s + r.tickets_vendidos, 0);
    const ticketPromedio = totalTickets > 0 ? totalIngresos / totalTickets : 0;

    let realizados = 0,
      proximos = 0;
    filteredReports.forEach((r) => {
      if (r.first_date && dateIsPast(r.first_date)) realizados++;
      else if (r.first_date) proximos++;
    });

    return {
      totalIngresos,
      totalTickets,
      ticketPromedio,
      eventosRealizados: realizados,
      eventosProximos: proximos,
    };
  }, [filteredReports]);

  /* ------------------------- Datos para gráficos -------------------------- */
  const ingresosChart = useMemo(
    () =>
      filteredReports
        .slice()
        .sort((a, b) => b.ingresos_brutos - a.ingresos_brutos)
        .map((r) => ({
          label: r.nombre,
          value: r.ingresos_brutos,
          tickets: r.tickets_vendidos,
          evento_id: r.evento_id,
        })),
    [filteredReports]
  );
  const ingresosChartTop = useMemo(
    () => ingresosChart.slice(0, Math.min(6, ingresosChart.length)),
    [ingresosChart]
  );
  const top3Eventos = useMemo(() => ingresosChart.slice(0, 3), [ingresosChart]);

  const ocupacionData: OccupancyRow[] = useMemo(
    () =>
      filteredReports.map((r) => {
        const ocupacionPorc = r.capacity_total > 0 ? (r.tickets_vendidos / r.capacity_total) * 100 : 0;
        return {
          evento_id: r.evento_id,
          nombre: r.nombre,
          tickets_vendidos: r.tickets_vendidos,
          capacidad_total: r.capacity_total,
          ocupacionPorc,
          monto_total: r.ingresos_brutos,
        };
      }),
    [filteredReports]
  );

  const ocupacionDisplay = useMemo(() => {
    const nonZero = ocupacionData.filter((o) => o.ocupacionPorc > 0).sort((a, b) => b.ocupacionPorc - a.ocupacionPorc);
    if (nonZero.length >= 5) return nonZero.slice(0, 5);
    const zeros = ocupacionData.filter((o) => o.ocupacionPorc === 0).sort((a, b) => b.capacidad_total - a.capacidad_total);
    const need = Math.max(0, 6 - nonZero.length);
    return [...nonZero, ...zeros.slice(0, need)];
  }, [ocupacionData]);

  const occupancyInsight = useMemo(() => {
    if (ocupacionData.length === 0) return null;
    const best = ocupacionData.slice().sort((a, b) => b.ocupacionPorc - a.ocupacionPorc)[0];
    return best && best.ocupacionPorc > 0 ? best : null;
  }, [ocupacionData]);

  /* -------------------------- Tendencia 6 meses ---------------------------- */
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleDateString("es-PE", { month: "short" }), total: 0 });
    }
    const idx: Record<string, number> = {};
    months.forEach((m, i) => (idx[m.key] = i));
    filteredReports.forEach((r) => {
      const d = r.first_date ? new Date(r.first_date) : now;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (idx[key] !== undefined) months[idx[key]].total += r.ingresos_brutos;
    });
    return months;
  }, [filteredReports]);

  const trendMax = monthlyTrend.reduce((m, c) => (c.total > m ? c.total : m), 0);
  const trendNonZero = monthlyTrend.filter((m) => m.total > 0);
  const growthPercent = useMemo(() => {
    if (trendNonZero.length < 2) return 0;
    const first = trendNonZero[0].total;
    const last = trendNonZero[trendNonZero.length - 1].total;
    if (first <= 0) return 0;
    return ((last - first) / first) * 100;
  }, [trendNonZero]);
  const bestMonth = useMemo(() => {
    const s = monthlyTrend.slice().sort((a, b) => b.total - a.total);
    return s[0]?.total > 0 ? s[0] : null;
  }, [monthlyTrend]);
  const avgMonthlyIncome = useMemo(() => {
    if (!trendNonZero.length) return 0;
    const sum = trendNonZero.reduce((s, m) => s + m.total, 0);
    return sum / trendNonZero.length;
  }, [trendNonZero]);

  /* ----------------------------- Handlers --------------------------------- */
  function handleRefresh() {
    setEventReports({});
    setSelectedEventoId("all");
    setRefreshKey((k) => k + 1);
  }
  const barColor = "#FCD400";
  const barColorAlt = "#F7A400";

  const isGlobalLoading = loadingEvents || loadingReports;

  /* --------------------------- Vista Detallada ----------------------------- */
  if (!isGlobalLoading && !error && selectedEventoId !== "all") {
    const report = eventReports[selectedEventoId];
    if (!report) {
      return (
        <div className="p-6">
          <p className="text-sm text-red-600">
            Este evento no está autorizado para tu usuario o no cargó su reporte.
            <button onClick={() => setSelectedEventoId("all")} className="ml-2 underline">
              Volver
            </button>
          </p>
        </div>
      );
    }

    return (
      <div className="h-full w-full flex flex-col">
        <Header
          title="Reporte de Ingresos"
          subtitle="Análisis financiero detallado del evento"
          selectedEventoId={selectedEventoId}
          setSelectedEventoId={setSelectedEventoId}
          options={Object.values(eventReports).map((r) => ({ value: r.evento_id, label: r.nombre }))}
          onRefresh={handleRefresh}
        />
        <EventIncomeReport
          eventId={report.evento_id}
          eventName={report.nombre}
          ingresosBrutos={report.ingresos_brutos}
          ticketsVendidos={report.tickets_vendidos}
          globalTicketAverage={metrics.ticketPromedio}
        />
      </div>
    );
  }

  /* --------------------------- Vista Global -------------------------------- */
  return (
    <div className="h-full w-full flex flex-col">
      <Header
        title="Reporte de Ingresos"
        subtitle="Análisis comparativo de tus eventos"
        selectedEventoId={selectedEventoId}
        setSelectedEventoId={setSelectedEventoId}
        options={Object.values(eventReports).map((r) => ({ value: r.evento_id, label: r.nombre }))}
        onRefresh={handleRefresh}
      />

      {isGlobalLoading && <div className="px-6 pb-4 text-sm text-muted-foreground">Cargando eventos y reportes…</div>}
      {error && (
        <div className="px-6 pb-4 text-sm text-red-600">
          Error: {error}{" "}
          <button onClick={handleRefresh} className="ml-2 underline text-xs hover:text-red-800">
            Reintentar
          </button>
        </div>
      )}
      {!error && !isGlobalLoading && Object.keys(eventReports).length === 0 && (
        <div className="px-6 pb-4 text-sm text-muted-foreground">No hay eventos con acceso a reportes para tu usuario.</div>
      )}

      {!isGlobalLoading && !error && Object.keys(eventReports).length > 0 && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 px-6 pb-6">
            <MetricCard icon={<DollarSign size={20} />} title="Ingresos Totales" value={formatMoney(metrics.totalIngresos)} footNote="Agregado de tus eventos" iconColor="bg-green-100 text-green-700" />
            <MetricCard icon={<Calendar size={20} />} title="Eventos Realizados" value={formatInt(metrics.eventosRealizados)} footNote={metrics.eventosProximos > 0 ? `${formatInt(metrics.eventosProximos)} próximos` : "Sin próximos"} iconColor="bg-blue-100 text-blue-700" />
            <MetricCard icon={<Ticket size={20} />} title="Tickets Vendidos" value={formatInt(metrics.totalTickets)} footNote="Total sumado" iconColor="bg-yellow-100 text-yellow-700" />
            <MetricCard icon={<TrendingUp size={20} />} title="Ticket Promedio" value={formatMoney(metrics.ticketPromedio)} footNote="Promedio global" iconColor="bg-purple-100 text-purple-700" />
          </div>

          {/* Ingresos + Ocupación */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6 pb-8">
            {/* Ingresos por Evento */}
            <Card className="flex flex-col">
              <CardContent className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Ingresos por Evento <Trophy className="w-5 h-5 text-yellow-500" />
                    </h3>
                    <p className="text-sm text-muted-foreground">Comparativa de ingresos brutos</p>
                  </div>
                </div>
                <div className="flex-1 relative mb-6">
                  {ingresosChartTop.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin datos de ingresos.</div>
                  ) : (
                    <div className="h-full flex items-center">
                      <svg viewBox={`0 0 ${Math.max(ingresosChartTop.length * 100, 300)} 300`} className="w-full h-[260px]" preserveAspectRatio="xMidYMid meet">
                        {ingresosChartTop.map((c, i) => {
                          const maxIngresos = ingresosChartTop[0]?.value || 1;
                          const h = (c.value / maxIngresos) * 220;
                          const x = i * 100 + 25;
                          const y = 250 - h;
                          return (
                            <g key={c.evento_id}>
                              <rect x={x} y={y} width={50} height={h} rx={6} fill={i % 2 === 0 ? barColor : barColorAlt} />
                              <text x={x + 25} y={y - 6} textAnchor="middle" className="fill-gray-700 text-[10px]">
                                {c.value.toLocaleString("es-PE")}
                              </text>
                              <text x={x + 25} y={270} transform={`rotate(20 ${x + 25} 270)`} textAnchor="middle" className="fill-gray-600 text-[10px]">
                                {c.label.length > 18 ? c.label.slice(0, 18) + "…" : c.label}
                              </text>
                            </g>
                          );
                        })}
                        <line x1={10} x2={Math.max(ingresosChartTop.length * 100, 300)} y1={250} y2={250} stroke="#e5e7eb" strokeWidth={1} />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Top 3 */}
                <div className="mt-auto">
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-3">
                    <Award size={16} className="text-yellow-600" /> Top 3 Eventos
                  </h4>
                  <div className="space-y-3">
                    {top3Eventos.map((ev, idx) => {
                      const rankColors = ["bg-yellow-500 text-white", "bg-gray-300 text-gray-700", "bg-amber-700 text-white"];
                      return (
                        <div key={ev.evento_id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${rankColors[idx]}`}>{idx + 1}</span>
                            <div className="text-sm font-medium">
                              {ev.label.length > 30 ? ev.label.slice(0, 30) + "…" : ev.label}
                              <div className="text-xs text-muted-foreground font-normal">{ev.tickets} tickets</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-green-700">{formatMoney(ev.value)}</div>
                        </div>
                      );
                    })}
                    {top3Eventos.length === 0 && <div className="text-xs text-muted-foreground">No hay datos.</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasa de Ocupación */}
            <Card className="flex flex-col">
              <CardContent className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Tasa de Ocupación <Users className="w-5 h-5 text-yellow-500" />
                    </h3>
                    <p className="text-sm text-muted-foreground">% de capacidad utilizada por evento</p>
                  </div>
                </div>
                <div className="flex-1 relative mb-6">
                  {ocupacionDisplay.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin datos de ocupación.</div>
                  ) : (
                    <div className="h-full">
                      <svg viewBox={`0 0 600 ${ocupacionDisplay.length * 50 + 20}`} className="w-full h-[260px]" preserveAspectRatio="xMidYMid meet">
                        {ocupacionDisplay.map((row, i) => {
                          const barWidth = (row.ocupacionPorc / 100) * 400;
                          const y = i * 50 + 10;
                          return (
                            <g key={row.evento_id}>
                              <text x={0} y={y + 15} className="fill-gray-700 text-[11px]">
                                {row.nombre.length > 30 ? row.nombre.slice(0, 30) + "…" : row.nombre}
                              </text>
                              <rect x={170} y={y} width={barWidth} height={30} rx={6} fill={barColor} />
                              <text x={170 + barWidth + 8} y={y + 19} className="fill-gray-700 text-[11px]">
                                {row.ocupacionPorc.toFixed(0)}%
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                    <Lightbulb size={16} className="text-yellow-500" /> Insight
                  </h4>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm leading-relaxed">
                    {(() => {
                      const best = occupancyInsight;
                      if (!best) return <span className="text-muted-foreground">No hay datos suficientes para calcular ocupación.</span>;
                      return (
                        <>
                          <span className="font-semibold">{best.nombre}</span> tuvo la mejor ocupación con{" "}
                          <span className="font-semibold">{best.ocupacionPorc.toFixed(1)}%</span>.
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tendencia + Resumen */}
          <div className="px-6 pb-8">
            <Card className="flex flex-col">
              <CardContent className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Tendencia de Ingresos (Últimos 6 Meses)
                    </h3>
                    <p className="text-sm text-muted-foreground">Evolución por mes (primera fecha de cada evento)</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>

                <div className="flex-1 mb-6">
                  {monthlyTrend.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin datos de tendencia.</div>
                  ) : (
                    <svg viewBox={`0 0 ${Math.max(monthlyTrend.length * 110, 660)} 350`} className="w-full h-[300px]" preserveAspectRatio="xMidYMid meet">
                      {monthlyTrend.map((m, i) => {
                        const h = trendMax > 0 ? (m.total / trendMax) * 250 : 0;
                        const x = i * 110 + 40;
                        const y = 300 - h - 30;
                        return (
                          <g key={m.key}>
                            <rect x={x} y={y} width={50} height={h} rx={8} fill={barColor} />
                            <text x={x + 25} y={y - 8} textAnchor="middle" className="fill-gray-700 text-[11px]">
                              {m.total > 0 ? m.total.toLocaleString("es-PE") : ""}
                            </text>
                            <text x={x + 25} y={320} textAnchor="middle" className="fill-gray-600 text-[12px]">
                              {m.label}
                            </text>
                          </g>
                        );
                      })}
                      <line x1={20} x2={Math.max(monthlyTrend.length * 110, 660) - 20} y1={300 - 30} y2={300 - 30} stroke="#d1d5db" strokeWidth={1} />
                    </svg>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg border bg-green-50 p-4">
                    <div className="text-xs text-green-700 font-semibold mb-1">Crecimiento</div>
                    <div className="text-lg font-semibold text-green-700">{growthPercent > 0 ? `+${growthPercent.toFixed(0)}%` : "0%"}</div>
                  </div>
                  <div className="rounded-lg border bg-blue-50 p-4">
                    <div className="text-xs text-blue-700 font-semibold mb-1">Mejor Mes</div>
                    <div className="text-lg font-semibold text-blue-700">{bestMonth ? bestMonth.label : "N/D"}</div>
                  </div>
                  <div className="rounded-lg border bg-purple-50 p-4">
                    <div className="text-xs text-purple-700 font-semibold mb-1">Promedio</div>
                    <div className="text-lg font-semibold text-purple-700">{formatMoney(avgMonthlyIncome)}</div>
                  </div>
                </div>

                <div className="rounded-lg border bg-green-50/60 p-6 text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-green-700" />
                    <span className="font-semibold">Resumen General de Ingresos</span>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      • Has realizado <span className="font-semibold">{filteredReports.length} evento{filteredReports.length > 1 ? "s" : ""}</span> generando un total de{" "}
                      <span className="font-semibold">{formatMoney(metrics.totalIngresos)}</span>.
                    </li>
                    {(() => {
                      const top = filteredReports.slice().sort((a, b) => b.ingresos_brutos - a.ingresos_brutos)[0];
                      if (!top) return null;
                      return (
                        <li>
                          • El evento más rentable fue <span className="font-semibold">{top.nombre}</span> con{" "}
                          <span className="font-semibold">{formatMoney(top.ingresos_brutos)}</span>.
                        </li>
                      );
                    })()}
                    <li>
                      • Vendiste un total de <span className="font-semibold">{formatInt(metrics.totalTickets)} tickets</span> con un precio promedio de{" "}
                      <span className="font-semibold">{formatMoney(metrics.ticketPromedio)}</span>.
                    </li>
                    <li>
                      • Crecimiento estimado últimos 6 meses: <span className="font-semibold">{growthPercent > 0 ? `+${growthPercent.toFixed(0)}%` : "0%"}</span>.
                    </li>
                  </ul>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Info size={14} /> La tendencia usa la primera fecha de cada evento para ubicar sus ingresos.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  HEADER COMPONENT                                                          */
/* -------------------------------------------------------------------------- */
function Header({
  title,
  subtitle,
  selectedEventoId,
  setSelectedEventoId,
  options,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  selectedEventoId: number | "all";
  setSelectedEventoId: (v: number | "all") => void;
  options: { value: number; label: string }[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 pt-2 pb-4">
      <div className="flex flex-col">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col text-xs mb-1">
          <span className="flex items-center gap-1 font-medium text-muted-foreground">
            <Filter size={14} /> Filtrar por Evento
          </span>
        </div>
        <select
          id ="evento-filter"
          aria-label="Filtrar por Evento"
          value={selectedEventoId}
          onChange={(e) => setSelectedEventoId(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="border rounded-md px-3 py-2 text-sm bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="all">Todos los Eventos</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button onClick={onRefresh} className="bg-black text-white hover:bg-black/90 flex items-center gap-2">
          <RefreshCcw size={16} /> Refrescar
        </Button>
      </div>
    </div>
  );
}