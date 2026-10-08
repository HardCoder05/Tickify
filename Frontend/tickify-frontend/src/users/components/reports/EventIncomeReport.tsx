import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DollarSign, Percent, Ticket, Tag, CreditCard } from "lucide-react";
import MetricCard from "./parts/MetricCard";
import { Card, CardContent } from "@/components/ui/card";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_V1 = `${BASE_URL}/api/v1`;

type FechaEvento = { capacidad_maxima?: number };

type PorTipoTicket = { tipo_ticket: string; cantidad: number; ingresos: number };
type MetodoPago = { metodo: string; transacciones: number; ingresos: number };

// Extiendo para soportar unitario/total y el campo normalizado aplicado
type DescuentoItem = {
  codigo?: string;
  usos?: number;
  monto?: number; // puede ser unitario o total según backend
  monto_unitario?: number;
  monto_total?: number;
  aplicado?: number; // normalizado
};

type IncomeReport = {
  ingresos_brutos: number;
  descuentos_aplicados: number; // total desde backend (resumen)
  ingresos_netos: number;
  ticket_promedio: number;
  por_tipo_ticket: PorTipoTicket[];
  por_etapa: { etapa?: string; ingresos: number }[]; // puede venir vacío
  descuentos: DescuentoItem[];
  metodos_pago: MetodoPago[];
};

export default function EventIncomeReport({
  eventId,
  eventName,
  ingresosBrutos: ingresosBrutosFromGlobal,
  ticketsVendidos,
  globalTicketAverage,
}: {
  eventId: number;
  eventName: string;
  ingresosBrutos: number;
  ticketsVendidos: number;
  globalTicketAverage: number;
}) {
  const [report, setReport] = useState<IncomeReport | null>(null);
  const [capacityTotal, setCapacityTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let mounted = true;
    setError(null);

    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Reporte principal por evento
    const fetchIncome = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/reports/ingresos/${eventId}`, { headers });
        const data = res.data && (res.data.data ?? res.data);
        if (!mounted) return;

        // Normalización de descuentos (cupones)
        const mapDescuentos = (arr: any[]): DescuentoItem[] =>
          arr.map((x: any) => {
            const usos = Number(x.usos ?? x.usos_aplicados ?? 0);
            // intento leer total directo
            const total =
              Number(x.monto_total ?? x.total ?? x.total_descuento ?? x.monto_aplicado_total ?? 0);
            // intento leer unitario
            const unit =
              Number(
                x.monto_unitario ??
                  x.monto_por_uso ??
                  x.monto_aplicado ??
                  x.valor ??
                  x.monto ??
                  0
              );
            const aplicado = total > 0 ? total : unit * usos;
            return {
              codigo: x.codigo ?? x.coupon_code ?? x.nombre ?? undefined,
              usos,
              monto_unitario: unit || undefined,
              monto_total: total || undefined,
              aplicado,
            };
          });

        // Normalización de métodos de pago
        const mapMetodosPago = (arr: any[]): MetodoPago[] =>
          arr.map((x: any) => ({
            metodo: String(x.metodo ?? x.medio_pago ?? x.method ?? "N/D"),
            transacciones: Number(x.transacciones ?? x.count ?? 0),
            ingresos: Number(x.ingresos ?? x.total ?? 0),
          }));

        const normalized: IncomeReport = {
          ingresos_brutos: Number(data.ingresos_brutos ?? 0),
          descuentos_aplicados: Number(data.descuentos_aplicados ?? 0),
          ingresos_netos: Number(data.ingresos_netos ?? 0),
          ticket_promedio: Number(data.ticket_promedio ?? 0),
          por_tipo_ticket: Array.isArray(data.por_tipo_ticket)
            ? data.por_tipo_ticket.map((x: any) => ({
                tipo_ticket: String(x.tipo_ticket ?? x.tipo ?? "N/D"),
                cantidad: Number(x.cantidad ?? 0),
                ingresos: Number(x.ingresos ?? 0),
              }))
            : [],
          por_etapa: Array.isArray(data.por_etapa)
            ? data.por_etapa.map((x: any) => ({
                etapa: x.etapa ?? x.nombre ?? undefined,
                ingresos: Number(x.ingresos ?? 0),
              }))
            : [],
          descuentos: Array.isArray(data.descuentos) ? mapDescuentos(data.descuentos) : [],
          metodos_pago: Array.isArray(data.metodos_pago) ? mapMetodosPago(data.metodos_pago) : [],
        };
        setReport(normalized);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "No se pudo obtener el reporte del evento.");
        setReport(null);
      }
    };

    // Capacidad total (para proyección)
    const fetchCapacity = async () => {
      try {
        const r = await axios.get(`${API_V1}/eventos/${eventId}/fechas`, { headers });
        const data = r.data && (r.data.data ?? r.data);
        if (!mounted) return;
        if (Array.isArray(data)) {
          const cap = data.reduce((s: number, f: any) => s + Number(f.capacidad_maxima ?? 0), 0);
          setCapacityTotal(cap);
        } else {
          setCapacityTotal(0);
        }
      } catch {
        if (!mounted) return;
        setCapacityTotal(0);
      }
    };

    fetchIncome();
    fetchCapacity();

    return () => {
      mounted = false;
    };
  }, [eventId, token]);

  const ingresosBrutos = report?.ingresos_brutos ?? ingresosBrutosFromGlobal ?? 0;
  const descuentosTotalBackend = report?.descuentos_aplicados ?? 0;
  const ingresosNetos = report?.ingresos_netos ?? Math.max(0, ingresosBrutos - descuentosTotalBackend);
  const ticketPromedio = report?.ticket_promedio ?? (ticketsVendidos > 0 ? ingresosBrutos / ticketsVendidos : 0);

  // Pie por tipo de ticket (según "ingresos")
  const tiposDistribucion = useMemo(() => {
    const arr = report?.por_tipo_ticket ?? [];
    const total = arr.reduce((s, t) => s + Number(t.ingresos ?? 0), 0) || 1;
    return arr.map((t) => ({
      label: t.tipo_ticket,
      amount: t.ingresos,
      percent: (t.ingresos / total) * 100,
    }));
  }, [report]);

  const donutStyle = useMemo(() => {
    if (!tiposDistribucion.length) return {};
    const colors = ["#FCD400", "#F7A400", "#FFC94A", "#FFB703", "#FDB813", "#FF8C00"];
    let acc = 0;
    const stops = tiposDistribucion.map((s, i) => {
      const start = acc;
      acc += s.percent;
      const end = acc;
      const color = colors[i % colors.length];
      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return { background: `conic-gradient(${stops.join(", ")})` };
  }, [tiposDistribucion]);

  // Barras por etapa (si no hay datos, se oculta el gráfico)
  const etapasBarras = useMemo(() => {
    const arr = report?.por_etapa ?? [];
    if (!arr.length) return [];
    const totalMax = Math.max(...arr.map((x) => x.ingresos), 0);
    return { arr, totalMax };
  }, [report]);

  // Métodos de pago: total por método y total recaudado desde metodos_pago
  const metodosPago = report?.metodos_pago ?? [];
  const pagosTotal = metodosPago.reduce((s, m) => s + Number(m.ingresos ?? 0), 0);
  const metodosPagoPct = metodosPago.map((m) => ({
    ...m,
    percent: pagosTotal > 0 ? (Number(m.ingresos ?? 0) / pagosTotal) * 100 : 0,
  }));

  // Códigos promocionales: total aplicado por código y total de todos los códigos
  const promos = useMemo(() => {
    const arr = report?.descuentos ?? [];
    return arr.map((p) => {
      const usos = Number(p.usos ?? 0);
      const total = Number(p.monto_total ?? 0);
      const unit =
        Number(p.monto_unitario ?? p.monto ?? 0); // por compatibilidad con normalizaciones anteriores
      const aplicado = Number(p.aplicado ?? (total > 0 ? total : unit * usos));
      return { ...p, aplicado, usos };
    });
  }, [report]);

  const promosTotalAplicado = useMemo(
    () => promos.reduce((s, p) => s + Number(p.aplicado ?? 0), 0),
    [promos]
  );

  // Proyección de ingresos
  const plazasDisponibles = Math.max(0, capacityTotal - (ticketsVendidos || 0));
  const proyeccionAdicional = plazasDisponibles * ticketPromedio;
  const proyeccionTotal = ingresosBrutos + proyeccionAdicional;
  const capacidadPct = capacityTotal > 0 ? (plazasDisponibles / capacityTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="mx-6 mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-yellow-100 text-yellow-700">
            <DollarSign size={16} />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">Mostrando ingresos de:</div>
            <div className="font-semibold">{eventName}</div>
          </div>
        </div>
      </div>

      {error && <div className="px-6 text-sm text-red-600">Error: {error}</div>}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 px-6">
        <MetricCard
          icon={<DollarSign size={20} />}
          title="Ingresos Brutos"
          value={formatMoney(ingresosBrutos)}
          iconColor="bg-green-100 text-green-700"
        />
        <MetricCard
          icon={<Percent size={20} />}
          title="Descuentos Aplicados"
          value={formatMoney(descuentosTotalBackend)}
          iconColor="bg-orange-100 text-orange-700"
        />
        <MetricCard
          icon={<DollarSign size={20} />}
          title="Ingresos Netos"
          value={formatMoney(ingresosNetos)}
          iconColor="bg-yellow-100 text-yellow-700"
        />
        <MetricCard
          icon={<Ticket size={20} />}
          title="Ticket Promedio"
          value={formatMoney(ticketPromedio)}
          iconColor="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Tipos (Pie/Donut) + Etapas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6">
        <Card className="flex flex-col">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Ingresos por Tipo de Entrada</h3>
              <p className="text-sm text-muted-foreground">Distribución según tipo</p>
            </div>
            {tiposDistribucion.length === 0 ? (
              <div className="text-xs text-muted-foreground">No hay datos.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-center">
                  <div className="relative" style={{ width: 200, height: 200 }}>
                    <div className="rounded-full" style={{ ...donutStyle, width: 200, height: 200 }} />
                    <div className="absolute inset-0 m-auto w-28 h-28 rounded-full bg-white shadow-sm flex items-center justify-center text-xs">
                      {formatMoney(ingresosBrutos)}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {tiposDistribucion.map((s, i) => {
                    const colors = ["#FCD400", "#F7A400", "#FFC94A", "#FFB703", "#FDB813", "#FF8C00"];
                    return (
                      <div key={s.label + i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="text-sm">{s.label}</span>
                        </div>
                        <div className="text-sm">
                          {formatMoney(s.amount)} <span className="text-xs text-muted-foreground">({s.percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Ingresos por Etapa de Venta</h3>
              <p className="text-sm text-muted-foreground">Comparativa por periodo</p>
            </div>

            {Array.isArray(etapasBarras) ? (
              <div className="text-xs text-muted-foreground">No hay datos de etapas.</div>
            ) : !etapasBarras.arr?.length ? (
              <div className="text-xs text-muted-foreground">No hay datos de etapas.</div>
            ) : (
              <svg viewBox={`0 0 ${Math.max(etapasBarras.arr.length * 110, 330)} 300`} className="w-full h-[260px]" preserveAspectRatio="xMidYMid meet">
                {etapasBarras.arr.map((b, i) => {
                  const h = etapasBarras.totalMax > 0 ? (b.ingresos / etapasBarras.totalMax) * 220 : 0;
                  const x = i * 110 + 40;
                  const y = 250 - h;
                  return (
                    <g key={(b.etapa ?? "etapa") + i}>
                      <rect x={x} y={y} width={50} height={h} rx={8} fill={i % 2 === 0 ? "#FCD400" : "#F7A400"} />
                      <text x={x + 25} y={y - 6} textAnchor="middle" className="fill-gray-700 text-[10px]">
                        {formatMoney(b.ingresos)}
                      </text>
                      <text x={x + 25} y={270} transform={`rotate(15 ${x + 25} 270)`} textAnchor="middle" className="fill-gray-600 text-[11px]">
                        {(b.etapa ?? "N/D").length > 16 ? (b.etapa ?? "N/D").slice(0, 16) + "…" : (b.etapa ?? "N/D")}
                      </text>
                    </g>
                  );
                })}
                <line x1={20} x2={Math.max(etapasBarras.arr.length * 110, 330) - 20} y1={250} y2={250} stroke="#d1d5db" strokeWidth={1} />
              </svg>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Códigos y Métodos de pago */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Códigos Promocionales <Tag className="w-4 h-4 text-yellow-600" />
              </h3>
              <p className="text-sm text-muted-foreground">Descuentos aplicados por cupón</p>
            </div>
            {!promos.length ? (
              <div className="text-xs text-muted-foreground">No hay cupones aplicados.</div>
            ) : (
              <div className="space-y-3">
                {promos.map((p, idx) => (
                  <div key={(p.codigo ?? "cup") + idx} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{p.codigo ?? "Cupón"}</div>
                      <div className="text-xs text-muted-foreground">{(p.usos ?? 0)} {(p.usos ?? 0) === 1 ? "uso" : "usos"}</div>
                    </div>
                    <div className="text-sm font-semibold text-red-600">- {formatMoney(p.aplicado ?? 0)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-1 pt-1 border-t">
                  <div className="text-sm">Total Descuentos</div>
                  <div className="text-sm font-semibold text-red-600">- {formatMoney(promosTotalAplicado)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Métodos de Pago <CreditCard className="w-4 h-4 text-yellow-600" />
              </h3>
              <p className="text-sm text-muted-foreground">Distribución de pagos recibidos</p>
            </div>
            {!metodosPagoPct.length ? (
              <div className="text-xs text-muted-foreground">No hay pagos registrados.</div>
            ) : (
              <div className="space-y-3">
                {metodosPagoPct.map((m, idx) => (
                  <div key={m.metodo + idx} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{m.metodo}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.transacciones} {(m.transacciones ?? 0) === 1 ? "transacción" : "transacciones"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-700">{formatMoney(m.ingresos)}</div>
                      <div className="text-[11px] text-gray-500">{m.percent.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-1 pt-1 border-t">
                  <div className="text-sm">Total Recaudado</div>
                  <div className="text-sm font-semibold text-green-700">{formatMoney(pagosTotal)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proyección de Ingresos */}
      <div className="px-6 pb-8">
        <div className="rounded-lg border bg-green-50 p-5 text-sm leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-green-700">
              <DollarSign size={16} />
            </span>
            <span className="font-semibold">Proyección de Ingresos</span>
          </div>
          {capacityTotal <= 0 ? (
            <div className="text-xs text-muted-foreground">
              No se pudo determinar la capacidad total (verifica /api/v1/eventos/{eventId}/fechas).
            </div>
          ) : (
            <ul className="space-y-1">
              <li>
                Quedan <span className="font-semibold">{plazasDisponibles} plazas disponibles</span> ({capacidadPct.toFixed(0)}% de la capacidad total).
              </li>
              <li>
                Vendiendo todas las plazas restantes al precio promedio actual se generarían{" "}
                <span className="font-semibold">{formatMoney(proyeccionAdicional)}</span> adicionales (total{" "}
                <span className="font-semibold">{formatMoney(proyeccionTotal)}</span>).
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMoney(v: number) {
  return `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}