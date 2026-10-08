import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1`;

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function buildHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractError(err: any, prefix = "") {
  const status = err?.response?.status ?? err?.status ?? null;
  const body = err?.response?.data ?? err?.body ?? null;
  const detail =
    (body && (body.detail || body.message || body.error)) ||
    err?.response?.statusText ||
    err?.message ||
    String(body) ||
    "Request failed";
  const e: any = new Error(prefix + detail);
  e.status = status;
  e.body = body;
  return e;
}

/**
 * CREATE
 */
export async function createDiscount(payload: any) {
  try {
    const res = await axios.post(`${API_URL}/descuentos/`, payload, {
      headers: buildHeaders(),
      withCredentials: false, // NO enviar cookies: evita bloqueo CORS en dev cuando backend responde "*"
    });
    return res.data;
  } catch (err: any) {
    throw extractError(err, "createDiscount: ");
  }
}

/**
 * LIST by EVENT
 * Use the backend route /descuentos/evento/{id}
 */
export async function fetchDiscountsByEvent(eventId: number) {
  try {
    const url = `${API_URL}/descuentos/evento/${eventId}`;
    console.log('🌐 fetchDiscountsByEvent: Llamando a', url);
    console.log('🔑 fetchDiscountsByEvent: Token presente:', !!getToken());
    
    const res = await axios.get(url, {
      headers: buildHeaders(),
      withCredentials: false,
      timeout: 15000, // Aumentado a 15 segundos para consultas con validación de permisos
    });
    
    console.log('✅ fetchDiscountsByEvent: Respuesta exitosa', res.status);
    console.log('📦 fetchDiscountsByEvent: Data recibida:', res.data);
    
    const result = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data;
    console.log('📊 fetchDiscountsByEvent: Resultado procesado:', result);
    
    return result;
  } catch (err: any) {
    console.error('❌ fetchDiscountsByEvent: Error completo:', err);
    console.error('❌ fetchDiscountsByEvent: Response status:', err?.response?.status);
    console.error('❌ fetchDiscountsByEvent: Response data:', err?.response?.data);
    throw extractError(err, "fetchDiscountsByEvent: ");
  }
}

/**
 * UPDATE (PUT) - si tu backend usa PATCH, cambia a patch
 */
export async function updateDiscount(id: number, patch: any) {
  try {
    const res = await axios.put(`${API_URL}/descuentos/${id}`, patch, {
      headers: buildHeaders(),
      withCredentials: false,
    });
    return res.data;
  } catch (err: any) {
    throw extractError(err, "updateDiscount: ");
  }
}

/**
 * DELETE
 */
export async function deleteDiscount(id: number) {
  try {
    const res = await axios.delete(`${API_URL}/descuentos/${id}`, {
      headers: buildHeaders(),
      withCredentials: false,
    });
    return res.data ?? { ok: true };
  } catch (err: any) {
    throw extractError(err, "deleteDiscount: ");
  }
}