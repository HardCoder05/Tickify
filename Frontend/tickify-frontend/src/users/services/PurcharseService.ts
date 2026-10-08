import type { Compra, CompraPayload, TicketCompra, TicketDetail } from "@/events/types/event";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1`;

export async function fetchEventoCompleto(eventoId: number) {
  const res = await axios.get(`${API_URL}/eventos/${eventoId}/completo`);
  return res.data;
}

export async function createCompra(payload: CompraPayload) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error("No se encontró token de autenticación. Por favor, inicia sesión nuevamente.");
  }
  
  try {
    const res = await axios.post(`${API_URL}/compras/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
    }
    throw error;
  }
}

export async function getCompra(compraId: number): Promise<Compra> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/compras/${compraId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Error al obtener compra");
  return res.json();
}

export async function getCompraByCodigo(codigo: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/compras/codigo/${codigo}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error("Error al obtener detalles de la compra");
  }

  return await res.json();
}

export async function getTicketsByCompra(compraId: number): Promise<TicketCompra[]> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/tickets/compra/${compraId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Error al obtener tickets");
  return res.json();
}

export async function aplicarDescuento(eventoId: number, precio: number, codigo: string, cantidad: number) {
  const token = localStorage.getItem("token");

  const params = new URLSearchParams({
    precio: precio.toString(),
    codigo_descuento: codigo,
    cantidad: cantidad.toString(),
  });

  const res = await axios.put(
    `${API_URL}/descuentos/evento/${eventoId}?${params.toString()}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
}

export async function simularPago(compraId: number, metodoPago: string, monto: number, aprobado = true) {
  const res = await axios.post(`${API_URL}/pagos/simular`, {
    compra_id: compraId,
    metodo_pago: metodoPago,
    monto,
    aprobado,
  });
  return res.data;
}

export async function getTicketsByUser(usuarioId: number) {
  const token = localStorage.getItem("token");
  console.log("🔍 getTicketsByUser - Usuario ID:", usuarioId);
  console.log("🔍 getTicketsByUser - URL:", `${API_URL}/tickets/usuario/${usuarioId}`);
  
  const res = await fetch(`${API_URL}/tickets/usuario/${usuarioId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  
  console.log("🔍 getTicketsByUser - Status:", res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ getTicketsByUser - Error:", errorText);
    throw new Error("Error al obtener tickets de usuario");
  }
  
  const data = await res.json();
  console.log("✅ getTicketsByUser - Datos recibidos:", data);
  return data;
}

export const getTicketById = async (ticketId: number): Promise<TicketDetail> => {
  // Obtener el token del localStorage
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = user?.token || localStorage.getItem("token");

  if (!token) {
    throw new Error("No se encontró token de autenticación");
  }

  const response = await axios.get<TicketDetail>(
    `${API_URL}/tickets/${ticketId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
  
  return response.data;
};
