import axios from "axios";
import type { Etapa, Tarifa, TipoEvento, Zona } from "../types/event";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1/eventos`;

export async function getTarifasByEvento(id: number): Promise<Tarifa[]> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${API_URL}/${id}/tarifas`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error en getTarifasByEvento:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    throw error;
  }
}

// Obtener una tarifa por id (dentro de un evento)
export async function getTarifaById(eventoId: number, tarifaId: number): Promise<Tarifa> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${API_URL}/${eventoId}/tarifas/${tarifaId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error en getTarifaById:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    throw error;
  }
}

export async function getZonasByEvento(id: number): Promise<Zona[]> {
  const token = localStorage.getItem("token");
  const headers: any = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await axios.get(`${API_URL}/${id}/zonas`, { headers });
  return res.data;
}

export async function getEtapasByEvento(id: number): Promise<Etapa[]> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${API_URL}/${id}/etapas`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error en getEtapasByEvento:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    throw error;
  }
}

export async function getTiposByEvento(id: number): Promise<TipoEvento[]> {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(`${API_URL}/${id}/tipo_ticket`, { headers });
    // helpful debug when developing
    console.log("✅ getTiposByEvento - response:", res.status, res.data);
    return res.data;
  } catch (error: any) {
    console.error("❌ Error en getTiposByEvento:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    throw error;
  }
}

// Crear nuevo tipo de ticket para un evento
export async function createTipoTicket(eventoId: number, tipoData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(`${API_URL}/${eventoId}/tipo_ticket`, tipoData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear tipo_ticket:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Crear nueva zona para un evento
export async function createZona(eventoId: number, zonaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(`${API_URL}/${eventoId}/zonas`, zonaData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear zona:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Actualizar una zona existente
export async function updateZona(zonaId: number, zonaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.put(`${API_URL}/zonas/${zonaId}`, zonaData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar zona:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Eliminar una zona (eliminación lógica)
export async function deleteZona(zonaId: number) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.delete(`${API_URL}/zonas/${zonaId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar zona:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Crear una nueva etapa para un evento
export async function createEtapa(eventoId: number, etapaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(`${API_URL}/${eventoId}/etapas`, etapaData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al crear etapa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Actualizar una etapa existente
export async function updateEtapa(etapaId: number, etapaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.put(`${API_URL}/etapas/${etapaId}`, etapaData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar etapa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Eliminar una etapa (eliminación lógica)
export async function deleteEtapa(etapaId: number) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.delete(`${API_URL}/etapas/${etapaId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar etapa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Crear una nueva tarifa para un evento
export async function createTarifa(eventoId: number, tarifaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(`${API_URL}/${eventoId}/tarifas`, tarifaData, { headers });
    return res.data;
  } catch (error: any) {
    // Mejor logging para diagnosticar 405/errores CORS
    console.error("❌ Error al crear tarifa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    // Re-throw para que la UI lo maneje
    throw error;
  }
}

// Actualizar una tarifa existente
export async function updateTarifa(eventoId: number, tarifaId: number, tarifaData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.put(`${API_URL}/${eventoId}/tarifas/${tarifaId}`, tarifaData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar tarifa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });
    throw error;
  }
}

// Eliminar una tarifa de un evento
export async function deleteTarifa(eventoId: number, tarifaId: number) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.delete(`${API_URL}/${eventoId}/tarifas/${tarifaId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar tarifa:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Actualizar un tipo de ticket (tipo_ticket) de un evento
// Note: Backend endpoint is /tipo_ticket/{tipoId} without evento_id in path
export async function updateTipoTicket(eventoId: number, tipoId: number, tipoData: Partial<any>) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.put(`${API_URL}/tipo_ticket/${tipoId}`, tipoData, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al actualizar tipo_ticket:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// Eliminar un tipo de ticket (eliminación lógica)
export async function deleteTipoTicket(tipoId: number) {
  try {
    const token = localStorage.getItem("token");
    const headers: any = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.delete(`${API_URL}/tipo_ticket/${tipoId}`, { headers });
    return res.data;
  } catch (error: any) {
    console.error("❌ Error al eliminar tipo_ticket:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}