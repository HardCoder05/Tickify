import axios from "axios";
import type { Evento, Tarifa, EventoCompleto } from "../types/event";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1/eventos`;

// Obtener todos los eventos
export async function getEventos(): Promise<Evento[]> {
  const res = await fetch(`${API_URL}/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Error al obtener eventos");
  
  const eventos: Evento[] = await res.json();
  return eventos;
}

// Obtener eventos con filtros (backend-driven)
export async function getEventosWithFilters(filters?: {
  nombre?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  organizador_id?: number;
}): Promise<Evento[]> {
  const params = new URLSearchParams();
  
  if (filters?.nombre) params.append("nombre", filters.nombre);
  if (filters?.estado) params.append("estado", filters.estado);
  if (filters?.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
  if (filters?.fecha_fin) params.append("fecha_fin", filters.fecha_fin);
  if (filters?.organizador_id) params.append("organizador_id", String(filters.organizador_id));

  const queryString = params.toString();
  const url = queryString ? `${API_URL}/?${queryString}` : `${API_URL}/`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Error al obtener eventos con filtros");
  return res.json();
}

// Obtener eventos por organizador
export async function getEventosByOrganizador(organizadorId: number): Promise<Evento[]> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/?organizador_id=${encodeURIComponent(String(organizadorId))}`, {
    headers,
  });
  if (!res.ok) throw new Error("Error al obtener eventos por organizador");
  return res.json();
}

// Obtener evento por ID
export async function getEventById(id: number): Promise<Evento> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/${id}`, {
    headers,
  });
  if (!res.ok) throw new Error("Error al obtener evento por ID");
  return res.json();
}


// Obtener evento completo por ID 
export async function getFullEventById(id: number): Promise<EventoCompleto> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/${id}/completo`, {
    headers,
  });
  if (!res.ok) throw new Error("Error al obtener evento por ID");
  return res.json();
}

// Buscar eventos por nombre (coincidencia parcial)
export async function searchEventosByName(nombre: string): Promise<Evento[]> {
  const res = await fetch(`${API_URL}/buscar?nombre=${encodeURIComponent(nombre)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Error al buscar eventos por nombre");
  return res.json();
}

// Filtrar eventos por rango de fechas
export async function filterEventosByFecha(
  fechaInicio: string,
  fechaFin: string
): Promise<Evento[]> {
  const res = await fetch(
    `${API_URL}/filtrar-fecha?fecha_inicio=${encodeURIComponent(
      fechaInicio
    )}&fecha_fin=${encodeURIComponent(fechaFin)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("Error al filtrar eventos por fecha");
  return res.json();
}

// Filtrar eventos por estado ("activo" o "suspendido")
export async function filterEventosByEstado(estado: string): Promise<Evento[]> {
  const res = await fetch(`${API_URL}/filtrar-estado?estado=${encodeURIComponent(estado)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Error al filtrar eventos por estado");
  return res.json();
}

export async function updateEventoEstado(id: number, nuevoEstado: string): Promise<Evento> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  const headers: any = { 
    Accept: "application/json", 
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  console.log("🔁 updateEventoEstado - PUT id:", id, "nuevoEstado:", nuevoEstado);
  
  try {
    // Cancelar evento
    if (nuevoEstado === "cancelado") {
      const res = await axios.put(`${API_URL}/${id}/cancelar`, {}, { headers });
      return res.data;
    }
    
    // Para otros estados (borrador a activo, activo a suspendido, etc.)
    const res = await axios.put(`${API_URL}/${id}`, { estado: nuevoEstado }, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar estado:", error.response?.data || error.message);
    throw error;
  }
}

//crear nuevos eventos
export async function createEvent(eventData: Evento): Promise<Event> {
  console.log("📦 Enviando evento al backend:");
  console.log(JSON.stringify(eventData, null, 2)); // Esto mostrará el JSON exacto

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      // throw a structured error so callers can detect missing token and redirect to login
      const err: any = new Error("No authentication token found in localStorage");
      err.code = "NO_TOKEN";
      throw err;
    }

    const response = await axios.post(`${API_URL}/`, eventData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("❌ Error al crear evento:", error.response?.data || error.message, error.response?.status);
    // Re-throw para que la UI pueda manejar 401/NO_TOKEN específicamente
    throw error;
  }
}

// Eliminar evento
export async function deleteEvent(eventId: number): Promise<void> {
  const token = localStorage.getItem("token");
  const headers: any = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    await axios.delete(`${API_URL}/${eventId}`, { headers });
  } catch (error: any) {
    // Mejor logging para diagnosticar Network / CORS / URL issues
    console.error("❌ Error al eliminar evento:", {
      message: error.message,
      code: error.code,
      url: (error.config && error.config.url) || `${API_URL}/${eventId}`,
      method: (error.config && error.config.method) || 'delete',
      status: error.response?.status,
      responseData: error.response?.data,
      request: error.request,
      config: error.config,
    });

    // Rethrow a normalized Error so UI can show something useful
    const userMsg = error.response?.data?.detail || error.response?.data || error.message || 'Error de red al intentar eliminar el evento';
    throw new Error(userMsg);
  }
}

// Eliminar evento admin
export async function deleteEventAdmin(eventId: number): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }
  try {
    await axios.delete(`${API_URL}/${eventId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error: any) {
    const msg = error.response?.data?.detail || "Error al eliminar evento";
    throw new Error(msg);
  }
}

// Actualizar evento (PUT)
export async function updateEvent(id: number, eventData: Partial<Evento>): Promise<Evento> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.put(`${API_URL}/${id}`, eventData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar evento:", error.response?.data || error.message);
    throw error;
  }
}

// Subir banner (imagen) para un evento
export async function uploadEventBanner(eventoId: number, file: File): Promise<Evento> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const form = new FormData();
    form.append("file", file);

    const res = await axios.post(`${API_URL}/${eventoId}/banner`, form, {
      headers,
    });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al subir banner:", error.response?.data || error.message);
    throw error;
  }
}

// Obtener usuarios/asistentes por evento
export async function getUsuariosByEvento(eventoId: number): Promise<any[]> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${BASE_URL}/api/v1/usuarios/eventos/${eventoId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al obtener usuarios por evento:", error.response?.data || error.message);
    throw error;
  }
}

// Obtener detalles completos de un usuario con sus tickets
export async function getUsuarioTicketsDetalle(eventoId: number, usuarioId: number, eventoFechaId: number): Promise<any> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(
      `${BASE_URL}/api/v1/usuarios/eventos/${eventoId}/usuarios/${usuarioId}/detalles?evento_fecha_id=${eventoFechaId}`,
      { headers }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al obtener detalles del usuario:", error.response?.data || error.message);
    throw error;
  }
}

// Obtener tickets que un usuario compró para un evento específico (para uso por organizadores)
export async function getTicketsByUserAndEvent(eventoId: number, usuarioId: number) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${BASE_URL}/api/v1/tickets/evento/${eventoId}/usuario/${usuarioId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ getTicketsByUserAndEvent - Error:", error.response?.data || error.message);
    throw error;
  }
}

// Obtener tarifas de un evento (wrapper por compatibilidad)
export async function getTarifasByEvento(id: number): Promise<Tarifa[]> {
  try {
    const res = await axios.get(`${API_URL}/${id}/tarifas`);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error en getTarifasByEvento:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Obtener comisión global actual
export async function getComision(): Promise<number> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.get(
      `${API_URL}/comision/`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    // La respuesta viene como { comision: 3.0 } o similar
    return res.data.comision || res.data;
  } catch (error: any) {
    const msg = error.response?.data?.detail || "Error al obtener comisión";
    throw new Error(msg);
  }
}

// Actualizar comisión global
export async function updateComision(comision: number): Promise<any> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.put(
      `${API_URL}/comision/${comision}`,
      {},
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    const msg = error.response?.data?.detail || "Error al actualizar comisión";
    throw new Error(msg);
  }
}

// Obtener información del organizador de un evento
export async function getOrganizerInfo(idBusqueda: number, buscarPorOrganizadorId: boolean = false): Promise<any> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const queryParam = buscarPorOrganizadorId ? "?buscar_por_organizador_id=true" : "";
    const res = await axios.get(
      `${BASE_URL}/api/v1/usuarios/organizadores/${idBusqueda}${queryParam}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.warn("⚠️ No se pudo obtener info del organizador:", error.message);
    // Retornar objeto vacío si no está disponible
    return { nombres: "Sin información", apellidos: "" };
  }
}

// Actualizar una fecha de evento
export async function updateEventoFecha(fechaId: number, fechaData: { fecha_inicio: string; fecha_fin: string }): Promise<any> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.put(
      `${API_URL}/fechas/${fechaId}`,
      fechaData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar fecha:", error.response?.data || error.message);
    throw error;
  }
}

// Crear una nueva fecha para un evento
export async function createEventoFecha(eventoId: number, fechaData: { fecha_inicio: string; fecha_fin: string }): Promise<any> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.post(
      `${API_URL}/${eventoId}/fechas`,
      fechaData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear fecha:", error.response?.data || error.message);
    throw error;
  }
}

// Eliminar una fecha de evento
export async function deleteEventoFecha(fechaId: number): Promise<any> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.delete(
      `${API_URL}/fechas/${fechaId}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar fecha:", error.response?.data || error.message);
    throw error;
  }
}

// Cancelar evento (cambiar estado a cancelado)
export async function cancelarEvento(eventoId: number): Promise<Evento> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.put(
      `${API_URL}/${eventoId}/cancelar`,
      {},
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al cancelar evento:", error.response?.data || error.message);
    throw error;
  }
}

// Publicar evento (cambiar estado de borrador a activo)
export async function publicarEvento(eventoId: number): Promise<Evento> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No se encontró token. Inicia sesión nuevamente.");
  }

  try {
    const res = await axios.patch(
      `${API_URL}/${eventoId}`,
      {},
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al publicar evento:", error.response?.data || error.message);
    throw error;
  }
}