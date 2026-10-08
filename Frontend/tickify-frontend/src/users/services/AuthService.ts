import axios from "axios";
import { jwtDecode } from "jwt-decode";
import type { LoginRequest, LoginResponse, User } from "../types/user";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface TokenPayload {
  sub: string; // correo
  role: string;
  exp: number;
  user_id?: number;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(`${API_URL}/login`, data);
  return response.data;
}

export async function login_google(): Promise<void> {
  window.location.href = `${API_URL}/login_google`;
}

export async function register(data: Omit<User, "id" | "id_user"> & { password: string }) {
  const response = await axios.post(`${API_URL}/register`, data);
  return response.data;
}

export function getUserFromToken(token: string): Partial<User> {
  const decoded = jwtDecode<TokenPayload>(token);
  return {
    correo: decoded.sub,
    rol: decoded.role || "CLIENTE",
  };
}

// Obtiene el usuario completo desde el backend por correo
export async function getUserByEmail(email: string): Promise<User> {
  const response = await axios.get<User>(`${API_URL}/api/v1/usuarios/email/${email}`);
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No hay token guardado");

  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // El endpoint /me devuelve { usuario: { ... } }
    const payload = response.data?.usuario ?? response.data;

    // Si el backend devuelve solo un string o forma inesperada, devuelve un objeto mínimo
    if (typeof payload === "string" || !payload) {
      return {
        nombres: typeof payload === "string" ? payload : "Dev User",
        correo: "correo@desconocido.com",
        id: 2,
      } as any;
    }

    // Devolver el objeto tal cual lo devuelve el backend
    return payload;
  } catch (err) {
    // Si la llamada a /me falla (p.ej. 401) y estamos en desarrollo, retornar user mock
    const isLocal = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
    if (isLocal) {
      return { nombres: "Dev User", correo: "dev@local", id: undefined } as any;
    }
    throw err;
  }
}

export async function getUserById(id: number) {
  const token = localStorage.getItem("token");
  // Backend exposes users under /api/v1/usuarios
  const response = await axios.get(`${API_URL}/api/v1/usuarios/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function updateUser(id: number, data: any) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/v1/usuarios/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error("Error al actualizar el usuario");
  }

  return res.json();
}


export async function updateUserPassword(usuarioId: number, password: string) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No hay token de autenticación");

  const response = await axios.patch(
    `${API_URL}/api/v1/usuarios/${usuarioId}/password`,
    null, // No body, porque el parámetro se pasa como query
    {
      params: { password },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getOrganizerByUserId(organizadorId: number) {
  const token = localStorage.getItem("token");
  // buscar_por_organizador_id = false porque le estamos pasando el ID del USUARIO 
  const response = await axios.get(`${API_URL}/api/v1/usuarios/organizadores/${organizadorId}?buscar_por_organizador_id=true`,
    { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  //reutilizar el endpoint de login para verificar la contraseña 
  try {
    await login({ username: email, password });
    return true;
  } catch {
    return false;
  }
}

