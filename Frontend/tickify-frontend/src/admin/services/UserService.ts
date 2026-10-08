import type { User } from "@/users/types/user";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1/usuarios`;

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const esc = encodeURIComponent;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${esc(k)}=${esc(String(v))}`)
    .join("&");
  return query ? `?${query}` : "";
}

export const getUsuarios = async (options?: {
  nombre?: string;
  rol?: string;
  skip?: number;
  limit?: number;
  inactivos?: boolean;
}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ nombre: options?.nombre, rol: options?.rol, skip: options?.skip, limit: options?.limit, inactivos: options?.inactivos });
  const res = await fetch(`${API_URL}${qs}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener usuarios");
    } catch (parseError) {
      throw new Error("Error al obtener usuarios");
    }
  }

  return res.json() as Promise<User[]>;
};

export const deleteUsuario = async (usuarioId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${usuarioId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al eliminar usuario");
    } catch (parseError) {
      throw new Error("Error al eliminar usuario");
    }
  }

  return res.json(); // devuelve { detail: "Usuario eliminado" }
};

// Buscar por nombre usando el endpoint /api/v1/usuarios?nombre=...
export const searchUsuariosByName = async (nombre: string) => {
  return getUsuarios({ nombre });
};

// Filtrar por rol usando el endpoint /api/v1/usuarios?rol=...
export const filterUsuariosByRol = async (rol: string) => {
  return getUsuarios({ rol });
};

export const updateUsuarioRol = async (usuarioId: number, rol: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${usuarioId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rol }),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al actualizar rol del usuario");
    } catch (parseError) {
      throw new Error("Error al actualizar rol del usuario");
    }
  }

  return res.json();
};

// Obtener lista de organizadores
export const getOrganizadores = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/organizadores`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener organizadores");
    } catch (parseError) {
      throw new Error("Error al obtener organizadores");
    }
  }

  return res.json() as Promise<User[]>;
};

// Obtener solicitudes pendientes de organizadores
export const getSolicitudes = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/solicitudes`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener solicitudes");
    } catch (parseError) {
      throw new Error("Error al obtener solicitudes");
    }
  }

  return res.json();
};

// Obtener detalles de una solicitud específica
export const getSolicitudDetalles = async (usuarioId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/solicitudes/${usuarioId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("El organizador fue creado sin solicitud");
    }
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener detalles de la solicitud");
    } catch (parseError) {
      throw new Error("Error al obtener detalles de la solicitud");
    }
  }

  return res.json();
};

// Obtener información del organizador por ID (compatible con usuario_id u organizador_id)
export const getOrganizerInfo = async (idBusqueda: number, buscarPorOrganizadorId: boolean = false) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ buscar_por_organizador_id: buscarPorOrganizadorId ? "true" : "false" });
  const res = await fetch(`${API_URL}/organizadores/${idBusqueda}${qs}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al obtener información del organizador");
    } catch (parseError) {
      throw new Error("Error al obtener información del organizador");
    }
  }

  return res.json();
};

// Responder a una solicitud de organizador (aceptar o rechazar)
export const responderSolicitud = async (usuarioId: number, respuesta: "activo" | "eliminado") => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const qs = buildQuery({ respuesta });
  const res = await fetch(`${API_URL}/solicitudes/${usuarioId}${qs}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al responder la solicitud");
    } catch (parseError) {
      throw new Error("Error al responder la solicitud");
    }
  }

  return res.json();
};

// Actualizar datos de un usuario
export const updateUsuario = async (
  usuarioId: number,
  data: { nombres?: string; apellidos?: string; correo?: string; telefono?: string }
) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${usuarioId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al actualizar usuario");
    } catch (parseError) {
      throw new Error("Error al actualizar usuario");
    }
  }

  return res.json();
};

// Cambiar contraseña de un usuario
export const changePassword = async (usuarioId: number, password: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${usuarioId}/password`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al cambiar contraseña");
    } catch (parseError) {
      throw new Error("Error al cambiar contraseña");
    }
  }

  return res.json();
};

// Crear un nuevo usuario
export const createUsuario = async (data: {
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  password: string;
  rol: string;
  ruc?: string;
  razon_social?: string;
  dni?: string;
  direccion?: string;
  correo_organizacional?: string;
  motivacion?: string;
  sector?: string;
}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  // Mapear 'password' a 'password_hash' como espera el backend
  const payload = {
    ...data,
    password_hash: data.password,
  };
  delete (payload as any).password;

  const res = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al crear usuario");
  }

  return res.json();
};

// Reactivar un usuario eliminado
export const reactivarUsuario = async (usuarioId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${usuarioId}/reactivar`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al reactivar usuario");
    } catch (parseError) {
      throw new Error("Error al reactivar usuario");
    }
  }

  return res.json();
};