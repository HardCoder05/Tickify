const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/reports`;

function buildQuery(params: Record<string, string | number | undefined>) {
  const esc = encodeURIComponent;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${esc(k)}=${esc(String(v))}`)
    .join("&");
  return query ? `?${query}` : "";
}

// Obtener reporte general por días
export const getReporteGeneral = async (dias: number = 30) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ dias });
  const res = await fetch(`${API_URL}/general${qs}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Error al obtener reporte general");
  }

  return res.json();
};

// Obtener reporte de ingresos general con rango de fechas
export const getReporteIngresosGeneral = async (
  fechaInicio: string, 
  fechaFin: string, 
  organizadorId?: number
) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ 
    fecha_inicio: fechaInicio, 
    fecha_fin: fechaFin,
    organizador_id: organizadorId 
  });
  const res = await fetch(`${API_URL}/ingresos_general${qs}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener reporte de ingresos general");
    } catch (parseError) {
      throw new Error("Error al obtener reporte de ingresos general");
    }
  }

  return res.json();
};

// Obtener ventas por evento
export const getVentasPorEvento = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/ventas/evento`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Error al obtener ventas por evento");
  }

  return res.json();
};

// Obtener reporte de organizadores
export const getReporteOrganizadores = async (dias: number = 30) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ dias });
  const res = await fetch(`${API_URL}/organizadores${qs}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Error al obtener reporte de organizadores");
  }

  return res.json();
};

// Obtener reporte de ingresos por evento específico
export const getReporteIngresosPorEvento = async (eventoId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/ingresos/${eventoId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al obtener reporte de ingresos del evento");
  }

  return res.json();
};
