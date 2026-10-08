export interface Category {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CategoryCreate {
  nombre: string;
  descripcion: string;
}

export interface CategoryUpdate {
  nombre?: string;
  descripcion?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1/categorias`;

// Obtener todas las categorías
export const getCategorias = async (skip: number = 0, limit: number = 100) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}?skip=${skip}&limit=${limit}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Error al obtener categorías");
  }

  return res.json() as Promise<Category[]>;
};

// Obtener una categoría por ID
export const getCategoriaById = async (categoriaId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${categoriaId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al obtener la categoría");
  }

  return res.json() as Promise<Category>;
};

// Crear una nueva categoría
export const createCategoria = async (data: CategoryCreate) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al crear la categoría");
  }

  return res.json() as Promise<Category>;
};

// Actualizar una categoría
export const updateCategoria = async (categoriaId: number, data: CategoryUpdate) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${categoriaId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al actualizar la categoría");
  }

  return res.json() as Promise<Category>;
};

// Eliminar (desactivar) una categoría
export const deleteCategoria = async (categoriaId: number) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No se encontró token. Inicia sesión nuevamente.");

  const res = await fetch(`${API_URL}/${categoriaId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al eliminar la categoría");
  }

  return res.json() as Promise<Category>;
};
