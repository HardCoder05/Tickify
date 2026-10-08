import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import type { TicketsReport, ZoneSummary, FunctionRow } from "@/users/types/report";
import axios from "axios";

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_URL = `${BASE_URL}/api/v1`;
const ENDPOINT_INGRESOS = (id: number) => `${BASE_URL}/reports/ingresos/${id}`;
const ENDPOINT_ZONE_TARIFF = (zonaId: number) => `${BASE_URL}/tickets/tarifas/zona/${zonaId}`;
const DEBUG = false;

/* -------------------------------------------------------------------------- */
/*  UTILS                                                                     */
/* -------------------------------------------------------------------------- */
function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractFechaIso(obj: any): string | null {
  if (!obj) return null;
  const candidates = ["fecha_inicio", "fecha_fin", "fecha_iso", "fecha", "date", "start", "inicio", "hora_iso"];
  for (const k of candidates) {
    const v = obj[k];
    if (!v) continue;
    if (typeof v === "string" && v.trim() !== "") return v;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "number" && !Number.isNaN(v)) {
      try {
        return new Date(v).toISOString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

function dateOnlyIso(isoOrDateStr: string | null): string | null {
  if (!isoOrDateStr) return null;
  try {
    const d = new Date(isoOrDateStr);
    if (Number.isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

function normalizeCountsByZone(input: any): Record<number, number> {
  const out: Record<number, number> = {};
  if (!input || typeof input !== "object") return out;
  for (const k of Object.keys(input)) {
    const nk = Number(k);
    if (!Number.isFinite(nk)) continue;
    out[nk] = Number(input[k] ?? 0);
  }
  return out;
}

function norm(s: any): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[\(\)\[\]\{\}\.\,\-\_]/g, " ") // puntaje a espacios
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "entrada", "boleto", "ticket",
  "zona", "sector", "localidad",
  "etapa", "preventa", "pre-venta", "venta",
  "promo", "promocion", "promoción", "oferta",
]);

function canonical(s: string): string {
  const parts = norm(s).split(" ").filter(Boolean);
  const filtered = parts.filter((w) => !STOPWORDS.has(w));
  return filtered.join(" ");
}

function prettyMoney(n: number) {
  return `S/ ${Number(n || 0).toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/*  FETCH REPORT (usa /reports/ingresos)                                      */
/* -------------------------------------------------------------------------- */
async function fetchIngresosReport(eventId: number): Promise<TicketsReport> {
  const r = await axios.get(ENDPOINT_INGRESOS(eventId), { headers: authHeaders(), withCredentials: false });
  const data = r.data && (r.data.data ?? r.data);

  // por_tipo_ticket: [{ tipo_ticket, cantidad, ingresos, tipo_ticket_id?, zona_id? }]
  const porTipo = Array.isArray(data?.por_tipo_ticket) ? data.por_tipo_ticket : [];

  // Guardamos como "zonas" temporales (tipos) para cargar cantidades/ingresos + hints (ids)
  const tiposAsZonas: ZoneSummary[] = porTipo.map((x: any, idx: number) => ({
    id: -(idx + 1),
    nombre: String(x.tipo_ticket ?? x.tipo ?? `Tipo ${idx + 1}`),
    precio: Number(x.precio ?? 0),
    // ephemerals:
    // @ts-ignore
    _cantidad: Number(x.cantidad ?? 0),
    // @ts-ignore
    _ingresos: Number(x.ingresos ?? 0),
    // @ts-ignore
    _tipo_ticket_id: Number.isFinite(Number(x.tipo_ticket_id ?? x.tipo_id)) ? Number(x.tipo_ticket_id ?? x.tipo_id) : undefined,
    // @ts-ignore
    _zona_id: Number.isFinite(Number(x.zona_id ?? x.zone_id)) ? Number(x.zona_id ?? x.zone_id) : undefined,
  })) as ZoneSummary[];

  const totalTickets = porTipo.reduce((s: number, x: any) => s + Number(x.cantidad ?? 0), 0);

  return {
    zonas: tiposAsZonas,   // OJO: aquí zonas === tipos temporales con cantidad/ingresos
    funciones: [],
    total_tickets: totalTickets,
  } as any;
}

/* -------------------------------------------------------------------------- */
/*  COMPONENT                                                                 */
/* -------------------------------------------------------------------------- */
export default function TicketsByFunctionZone({ eventId }: { eventId: number }) {
  const [report, setReport] = useState<TicketsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventFechas, setEventFechas] = useState<any[] | null>(null);
  const [eventZonas, setEventZonas] = useState<ZoneSummary[] | null>(null);

  // precios reales por zona (desde tarifas)
  const [zonePrices, setZonePrices] = useState<Record<number, number>>({});
  // mapeos para asignar tipos a zonas
  const [tipoNameToZona, setTipoNameToZona] = useState<Map<string, number>>(new Map());
  const [tipoIdToZona, setTipoIdToZona] = useState<Map<number, number>>(new Map());
  
  // Estados para tickets reales por fecha y zona
  const [ticketsPorFecha, setTicketsPorFecha] = useState<Map<number, number>>(new Map());
  const [ticketsPorZona, setTicketsPorZona] = useState<Map<number, number>>(new Map());
  const [ticketsPorFechaYZona, setTicketsPorFechaYZona] = useState<Map<string, number>>(new Map());

  /* ----------------------------- Cargar Reporte --------------------------- */
  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchIngresosReport(eventId)
      .then((r) => {
        if (!mounted) return;
        setReport(r);
      })
      .catch((err) => {
        console.error("fetchIngresosReport error:", err);
        const detail = err?.response?.data ?? err?.response?.data?.detail ?? err?.message ?? String(err);
        setError(typeof detail === "string" ? detail : JSON.stringify(detail));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [eventId]);

  /* ----------------------------- Fechas del evento ------------------------ */
  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/eventos/${eventId}/fechas`, { headers: authHeaders(), withCredentials: false });
        if (!mounted) return;
        const data = res.data && (res.data.data ?? res.data);
        const normalized = Array.isArray(data) ? data.map((f: any) => ({ ...f, fecha_iso: extractFechaIso(f) })) : [];
        setEventFechas(normalized);
      } catch (e) {
        console.warn("No se pudieron obtener las fechas del evento:", e);
        setEventFechas([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  /* ----------------------------- Zonas del evento ------------------------- */
  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/eventos/${eventId}/zonas`, { headers: authHeaders(), withCredentials: false });
        if (!mounted) return;
        const data = res.data && (res.data.data ?? res.data);
        if (Array.isArray(data)) {
          const mapped = data
            .map((z: any) => ({
              id: Number(z.id ?? z.zona_id ?? z.zone_id),
              nombre: z.nombre ?? z.name ?? z.nombre_zona ?? z.descripcion ?? `Zona ${z.id}`,
              precio: Number(z.precio ?? z.price ?? z.tarifa ?? 0),
            }))
            .filter((z: any) => Number.isFinite(z.id)) as ZoneSummary[];
          setEventZonas(mapped);
        } else {
          setEventZonas([]);
        }
      } catch (e) {
        console.warn("No se pudieron obtener las zonas del evento:", e);
        setEventZonas([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  /* --------- Tarifas por zona: precios + mapeos (nombre y tipo_id) -------- */
  useEffect(() => {
    if (!eventZonas || eventZonas.length === 0) return;

    let mounted = true;
    (async () => {
      try {
        const results = await Promise.all(
          eventZonas.map(async (z) => {
            try {
              const res = await axios.get(ENDPOINT_ZONE_TARIFF(Number(z.id)), { headers: authHeaders(), withCredentials: false });
              const payload = res.data && (res.data.data ?? res.data);
              const tarifas = Array.isArray(payload) ? payload : [];

              // precio candidato: primera activa o primera
              let price = 0;
              if (tarifas.length > 0) {
                const firstActiva = tarifas.find((t: any) => String(t.estado ?? "activo").toLowerCase() !== "inactivo");
                const use = firstActiva ?? tarifas[0];
                price = Number(use?.precio ?? use?.valor ?? use?.price ?? use?.monto ?? 0);
              }

              // nombres e ids de "tipo_ticket" asociados a esta zona
              const tipoNames: string[] = tarifas
                .map((t: any) => String(t.nombre ?? t.tipo_nombre ?? "").trim())
                .filter((n: string) => n.length > 0);
              const tipoIds: number[] = tarifas
                .map((t: any) => Number(t.tipo_ticket_id))
                .filter((n: any) => Number.isFinite(n));

              return { zonaId: Number(z.id), price, tipoNames, tipoIds, zonaName: z.nombre };
            } catch {
              return { zonaId: Number(z.id), price: 0, tipoNames: [] as string[], tipoIds: [] as number[], zonaName: z.nombre };
            }
          })
        );

        if (!mounted) return;

        // precios por zona
        const priceMap: Record<number, number> = {};
        results.forEach((r) => (priceMap[r.zonaId] = r.price));
        setZonePrices(priceMap);

        // mapeo por nombre (normalizado y canónico)
        const mapName = new Map<string, number>();
        // mapeo por tipo_ticket_id
        const mapId = new Map<number, number>();

        results.forEach((r) => {
          r.tipoNames.forEach((name) => {
            const k1 = norm(name);
            const k2 = canonical(name);
            if (!mapName.has(k1)) mapName.set(k1, r.zonaId);
            if (!mapName.has(k2)) mapName.set(k2, r.zonaId);
          });
          r.tipoIds.forEach((tid) => {
            if (!mapId.has(tid)) mapId.set(tid, r.zonaId);
          });
          // también mapear el nombre de la zona (algunos backends usan el nombre de zona como tipo)
          const kZone1 = norm(r.zonaName);
          const kZone2 = canonical(r.zonaName);
          if (!mapName.has(kZone1)) mapName.set(kZone1, r.zonaId);
          if (!mapName.has(kZone2)) mapName.set(kZone2, r.zonaId);
        });

        setTipoNameToZona(mapName);
        setTipoIdToZona(mapId);
        if (DEBUG) {
          console.log("[tipo name -> zona]", Array.from(mapName.entries()));
          console.log("[tipo id   -> zona]", Array.from(mapId.entries()));
        }
      } catch (e) {
        console.warn("No se pudieron mapear tarifas/tipos a zonas:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventZonas]);

  /* ----------------------------- Columnas (ZONAS) ------------------------- */
  // Solo zonas del evento (como en Figma)
  const zonas: ZoneSummary[] = useMemo(() => {
    return (eventZonas ?? []).map((z) => ({
      id: Number(z.id),
      nombre: z.nombre,
      precio: Number(z.precio ?? 0),
    }));
  }, [eventZonas]);

  /* --------- Totales por zona: usar datos reales de tickets -------------- */
  const { totalsByZone, ingresosByZone, avgPriceByZone } = useMemo(() => {
    const resultCounts: Record<number, number> = {};
    const resultIncome: Record<number, number> = {};
    
    // Inicializar con ceros
    zonas.forEach((z) => {
      const zid = Number(z.id);
      resultCounts[zid] = 0;
      resultIncome[zid] = 0;
    });

    // Usar datos reales de ticketsPorZona
    zonas.forEach((z) => {
      const zid = Number(z.id);
      const count = ticketsPorZona.get(zid) || 0;
      resultCounts[zid] = count;
      
      // Calcular ingresos basados en el precio de la zona y cantidad vendida
      const precio = Number(zonePrices[zid] ?? z.precio ?? 0);
      resultIncome[zid] = count * precio;
    });

    // Calcular precio promedio por zona (para referencia)
    const avgPrice: Record<number, number> = {};
    zonas.forEach((z) => {
      const zid = Number(z.id);
      avgPrice[zid] = Number(zonePrices[zid] ?? z.precio ?? 0);
    });

    return { totalsByZone: resultCounts, ingresosByZone: resultIncome, avgPriceByZone: avgPrice };
  }, [zonas, ticketsPorZona, zonePrices]);

  /* ----------------------------- Total Tickets ---------------------------- */
  const totalTickets = useMemo(() => {
    const fromReport = Number(report?.total_tickets ?? 0);
    const sumZones = Object.values(totalsByZone).reduce<number>((s, v) => s + Number(v ?? 0), 0);
    // Preferimos la suma por zonas si es > 0; si no, usamos la del backend
    return sumZones > 0 ? sumZones : fromReport;
  }, [report?.total_tickets, totalsByZone]);

  /* --------------------------- Precio efectivo por zona ------------------- */
  const effectiveZonePrice = useMemo(() => {
    const map: Record<number, number> = {};
    zonas.forEach((z) => {
      const zid = Number(z.id);
      const price = Number(zonePrices[zid] ?? 0);
      map[zid] = price > 0 ? price : (avgPriceByZone[zid] > 0 ? avgPriceByZone[zid] : Number(z.precio ?? 0));
    });
    return map;
  }, [zonas, zonePrices, avgPriceByZone]);

  /* --------------------------- Estimated Revenue ------------------------- */
  const estimatedRevenue = useMemo(() => {
    return zonas.reduce((sum, z) => {
      const zid = Number(z.id);
      const count = totalsByZone[zid] ?? 0;
      const price = effectiveZonePrice[zid] ?? 0;
      return sum + count * price;
    }, 0);
  }, [zonas, totalsByZone, effectiveZonePrice]);

  /* -------------- Obtener tickets reales por fecha y zona desde el backend ------- */
  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    
    (async () => {
      try {
        // Obtener resumen de tickets agrupados por fecha y zona
        const resTickets = await axios.get(`${BASE_URL}/api/v1/tickets/resumen/${eventId}`, {
          headers: authHeaders(),
          withCredentials: false
        });
        const resumen = resTickets.data && (resTickets.data.data ?? resTickets.data);
        
        if (!mounted || !Array.isArray(resumen)) {
          console.warn('No se pudo obtener resumen de tickets o formato inesperado');
          return;
        }
        
        console.log('✅ Resumen de tickets obtenido:', resumen);
        
        // Calcular tickets por fecha
        const ticketsPorFechaMap = new Map<number, number>();
        // Calcular tickets por zona (por nombre)
        const ticketsPorZonaMap = new Map<string, number>();
        // Calcular tickets por fecha Y zona (clave compuesta con nombre de zona)
        const ticketsPorFechaYZonaMap = new Map<string, number>();
        
        // Mapear fechas a sus IDs
        const fechaIsoToId = new Map<string, number>();
        if (eventFechas) {
          eventFechas.forEach((f: any) => {
            const isoFecha = extractFechaIso(f);
            if (isoFecha && f.id) {
              fechaIsoToId.set(dateOnlyIso(isoFecha) || isoFecha, Number(f.id));
            }
          });
        }
        
        // Mapear nombres de zona a IDs
        const zonaNombreToId = new Map<string, number>();
        if (eventZonas) {
          eventZonas.forEach((z: any) => {
            zonaNombreToId.set(norm(z.nombre), Number(z.id));
          });
        }
        
        resumen.forEach((fecha: any) => {
          const fechaIso = fecha.evento_fecha || fecha.fecha_inicio;
          const fechaId = fechaIsoToId.get(dateOnlyIso(fechaIso) || fechaIso);
          
          if (!fecha.zonas || !Array.isArray(fecha.zonas)) return;
          
          fecha.zonas.forEach((zona: any) => {
            const zonaNombre = zona.zona;
            const cantidad = Number(zona.cantidad ?? 0);
            
            // Buscar ID de zona por nombre
            const zonaId = zonaNombreToId.get(norm(zonaNombre));
            
            // Por fecha
            if (fechaId) {
              ticketsPorFechaMap.set(fechaId, (ticketsPorFechaMap.get(fechaId) || 0) + cantidad);
            }
            
            // Por zona (usar ID si está disponible)
            if (zonaId) {
              ticketsPorZonaMap.set(String(zonaId), (ticketsPorZonaMap.get(String(zonaId)) || 0) + cantidad);
            }
            
            // Por fecha y zona
            if (fechaId && zonaId) {
              const key = `${fechaId}-${zonaId}`;
              ticketsPorFechaYZonaMap.set(key, cantidad);
            }
          });
        });
        
        if (mounted) {
          // Convertir mapas de string a number para zonas
          const ticketsPorZonaNumMap = new Map<number, number>();
          ticketsPorZonaMap.forEach((valor, clave) => {
            ticketsPorZonaNumMap.set(Number(clave), valor);
          });
          
          setTicketsPorFecha(ticketsPorFechaMap);
          setTicketsPorZona(ticketsPorZonaNumMap);
          setTicketsPorFechaYZona(ticketsPorFechaYZonaMap);
          console.log('✅ Tickets por fecha:', Object.fromEntries(ticketsPorFechaMap));
          console.log('✅ Tickets por zona:', Object.fromEntries(ticketsPorZonaNumMap));
          console.log('✅ Tickets por fecha y zona:', Object.fromEntries(ticketsPorFechaYZonaMap));
        }
      } catch (err) {
        console.warn('No se pudo obtener resumen de tickets:', err);
      }
    })();
    
    return () => { mounted = false; };
  }, [eventId, eventFechas, eventZonas]);

  /* -------------- Filas por función: usando datos reales por fecha y zona ------- */
  const syntheticFunctionsPerDate = useMemo(() => {
    const fechas = eventFechas ?? [];
    const zoneIds = zonas.map((z) => Number(z.id));

    if (fechas.length === 0) return [] as FunctionRow[];

    // Crear filas basadas en tickets reales por fecha y zona
    const funcs: FunctionRow[] = fechas.map((ef: any, idx: number) => {
      const fechaId = Number(ef?.id ?? ef?.fecha_id);
      
      // Obtener conteo real por zona para esta fecha
      const counts_by_zone: Record<number, number> = {};
      zoneIds.forEach((zid) => {
        const key = `${fechaId}-${zid}`;
        counts_by_zone[zid] = ticketsPorFechaYZona.get(key) || 0;
      });
      
      return {
        funcion_id: fechaId ?? (-1 - idx),
        fecha_iso: ef?.fecha_iso ?? extractFechaIso(ef),
        hora_label: ef?.hora_label,
        counts_by_zone,
      } as any;
    });
    
    return funcs;
  }, [eventFechas, zonas, ticketsPorFechaYZona]);

  const functionsSummary = useMemo(() => {
    if (!syntheticFunctionsPerDate || syntheticFunctionsPerDate.length === 0) return [];
    return syntheticFunctionsPerDate.map((f) => {
      const total = Object.values(f.counts_by_zone ?? {}).reduce<number>((s, v) => s + Number(v ?? 0), 0);
      return { fecha_iso: f.fecha_iso ?? null, total };
    });
  }, [syntheticFunctionsPerDate]);

  /* ----------------------------- Export CSV ------------------------------- */
  function exportCSV() {
    const header = ["Función", "Hora", ...zonas.map((z) => `${z.nombre} (${prettyMoney(effectiveZonePrice[Number(z.id)] ?? z.precio ?? 0)})`), "Total"];
    const rows: string[][] = [];

    const funcsToExport: FunctionRow[] = syntheticFunctionsPerDate;

    if (funcsToExport && funcsToExport.length > 0) {
      funcsToExport.forEach((f) => {
        const fechaIso = extractFechaIso(f);
        const fecha = fechaIso ? new Date(fechaIso) : null;
        const fechaLabel = fecha ? fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "-";
        const horaLabel = fecha ? (f.hora_label ?? fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : (f.hora_label ?? "-");
        const row: string[] = [fechaLabel, horaLabel];
        let totalRow = 0;
        zonas.forEach((z) => {
          const zid = Number(z.id);
          const c = Number((f as any).counts_by_zone?.[zid] ?? 0);
          row.push(String(c));
          totalRow += c;
        });
        row.push(String(totalRow));
        rows.push(row);
      });
    } else {
      const row: string[] = ["-", "-"];
      zonas.forEach(() => row.push("0"));
      row.push("0");
      rows.push(row);
    }

    const totalsRow = zonas.map((z) => String(totalsByZone[Number(z.id)] ?? 0));
    const footer: string[] = ["Total por Zona", "", ...totalsRow, String(totalTickets)];
    const csvLines = [header.join(","), ...rows.map((r) => r.join(",")), footer.join(",")];
    const csvText = csvLines.join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_por_funcion_zona_evento_${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ----------------------------- Render ----------------------------------- */
  if (loading) return <div className="p-6">Cargando reporte...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Tickets Vendidos por Función y Zona</h3>
                <p className="text-sm text-muted-foreground">Listado por función / horario y desglose por zona</p>
              </div>
              <div>
                <Button onClick={exportCSV} className="inline-flex items-center gap-2 bg-black text-white hover:bg-black/90 hover:text-white px-3 py-2 rounded-md text-sm">
                  <Download size={16} /> <span className="whitespace-nowrap">Exportar Reporte</span>
                </Button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 mb-3">Error: {error}</div>}

            {zonas.length === 0 && (
              <div className="mb-4 p-4 rounded border bg-yellow-50 text-sm">
                Este evento no tiene zonas configuradas. Configura zonas para ver el desglose.
              </div>
            )}

            <div className="overflow-auto border rounded-lg">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left w-40">Función</th>
                    <th className="p-3 text-left w-24">Hora</th>
                    {zonas.map((z) => {
                      const zid = Number(z.id);
                      return (
                        <th key={zid} className="p-3 text-center">
                          <div className="font-medium">{z.nombre}</div>
                        </th>
                      );
                    })}
                    <th className="p-3 text-center w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {syntheticFunctionsPerDate && syntheticFunctionsPerDate.length > 0 ? (
                    syntheticFunctionsPerDate.map((f: any, idx: number) => {
                      const fechaIso = extractFechaIso(f);
                      const fecha = fechaIso ? new Date(fechaIso) : null;
                      const fechaLabel = fecha
                        ? fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
                        : (f.fecha_iso ? new Date(f.fecha_iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "-");
                      const horaLabel = fecha ? (f.hora_label ?? fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : (f.hora_label ?? "-");
                      let totalRow = 0;
                      return (
                        <tr key={f.funcion_id ?? `sf-${idx}`} className="border-t">
                          <td className="p-3 align-top">
                            <div className="text-sm font-medium text-blue-700 bg-blue-50 inline-block px-2 py-1 rounded">{fechaLabel}</div>
                          </td>
                          <td className="p-3 align-top">{horaLabel}</td>
                          {zonas.map((z) => {
                            const zid = Number(z.id);
                            const c = Number(f.counts_by_zone?.[zid] ?? 0);
                            totalRow += c;
                            return (
                              <td key={zid} className="p-3 align-top text-center">
                                <span className="inline-block bg-gray-100 px-3 py-1 rounded-md">{c}</span>
                              </td>
                            );
                          })}
                          <td className="p-3 align-top text-center">
                            <span className="inline-block bg-blue-50 text-blue-800 px-3 py-1 rounded-md font-semibold">{totalRow}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t">
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      {zonas.map((z) => (
                        <td key={z.id} className="p-3 text-center">
                          <span className="inline-block bg-gray-100 px-3 py-1 rounded-md">0</span>
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <span className="inline-block bg-blue-800 text-white px-3 py-1 rounded-md font-semibold">0</span>
                      </td>
                    </tr>
                  )}

                  {/* Totales por zona */}
                  <tr className="border-t bg-gray-50">
                    <td className="p-3 font-semibold">Total por Zona</td>
                    <td />
                    {zonas.map((z) => (
                      <td key={Number(z.id)} className="p-3 text-center">
                        <span className="inline-block bg-blue-50 text-blue-800 px-3 py-1 rounded-md font-semibold">
                          {totalsByZone[Number(z.id)] ?? 0}
                        </span>
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <span className="inline-block bg-blue-800 text-white px-3 py-1 rounded-md font-semibold">{totalTickets}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: summary */}
      <div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h4 className="text-lg font-medium">Resumen de Ventas</h4>

            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-muted-foreground">Total Vendidos</div>
              <div className="text-xl font-semibold">
                {totalTickets} <span className="text-sm text-muted-foreground">tickets</span>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded">
              <div className="text-sm text-muted-foreground">Ingresos Estimados</div>
              <div className="text-xl font-semibold">{prettyMoney(estimatedRevenue)}</div>
            </div>

            <hr />

            <div>
              <div className="text-sm text-muted-foreground mb-2">Por Zona</div>
              <div className="space-y-2">
                {zonas.map((z) => {
                  const zid = Number(z.id);
                  const c = totalsByZone[zid] ?? 0;
                  const price = Number(effectiveZonePrice[zid] ?? z.precio ?? 0);
                  return (
                    <div key={zid} className="flex items-center justify-between">
                      <div className="text-sm">{z.nombre}</div>
                      <div className="text-sm text-right">
                        <div className="text-muted-foreground text-xs">{c} </div>
                        <div className="font-medium">{prettyMoney(c * price)}</div>
                      </div>
                    </div>
                  );
                })}
                {zonas.length === 0 && <div className="text-xs text-muted-foreground">No hay zonas configuradas.</div>}
              </div>
            </div>

            <hr />

            <div>
              <div className="text-sm text-muted-foreground mb-2">Por Función</div>
              <div className="space-y-2">
                {functionsSummary.length === 0 && <div className="text-xs text-muted-foreground">No hay fechas disponibles para este evento.</div>}
                {functionsSummary.map((fs, idx) => {
                  const fecha = fs.fecha_iso ? new Date(fs.fecha_iso) : null;
                  const fechaLabel = fecha ? fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "-";
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-sm">{fechaLabel}</div>
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-block bg-gray-100 px-2 py-1 rounded-md">{fs.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
