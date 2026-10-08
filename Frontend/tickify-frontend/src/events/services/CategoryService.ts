import axios from "axios";
import type { Categoria } from "../types/event";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getCategorias(): Promise<Categoria[]> {
  try {
    const res = await axios.get(`${BASE_URL}/api/v1/categorias`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    return res.data;
  } catch (err) {
    console.warn("No se pudo obtener categorías desde el servidor, usando predefinidas:", err);
    return [];
  }
}

export async function getCategoriaById(id: number): Promise<Categoria> {
  const categorias = await getCategorias();
  return categorias.find((c) => c.id === id) || { id, nombre: "Desconocida", descripcion: "", estado: false, fecha_creacion: "", fecha_actualizacion: "" };
}

