// Tipos de reporte de venta de boletos por zona y función
export type ZoneSummary = {
  id: number;
  nombre: string;
  precio: number; // precio por boleto en esta zona
  capacidad?: number;
};

export type FunctionRow = {
  start: string;
  date: string;
  fecha: string;
  funcion_id: number;
  fecha_iso: string;       // ISO fecha de la función
  hora_label?: string;     // Opcional etiqueta de hora (ej. "20:00")
  counts_by_zone: Record<number, number>; // id de zona -> cantidad de boletos vendidos
};

export type TicketsReport = {
  evento_id: number;
  zonas: ZoneSummary[];       // lista de zonas (el orden define las columnas)
  funciones: FunctionRow[];   // filas (una por función)
  totals_by_zone?: Record<number, number>; // totales precomputados (opcional)
  total_tickets?: number;
};