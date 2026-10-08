import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${BASE_URL}/api/v1/notificaciones`;

export interface Notificacion {
  id: number;
  usuario_id: number;
  mensaje: string;
  leido: boolean;
  fecha_creacion: string; // O el nombre que tenga en tu BD
  tipo?: string; // Opcional: 'compra', 'sistema', etc.
}

// Obtener notificaciones no leídas
export async function getUnreadNotifications(userId: number): Promise<Notificacion[]> {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get<Notificacion[]>(`${API_URL}/${userId}/no-leidas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return [];
  }
}

// Marcar una notificación como leída
export async function markNotificationAsRead(notificacionId: number, userId: number): Promise<boolean> {
  const token = localStorage.getItem("token");
  try {
    await axios.patch(
      `${API_URL}/${notificacionId}/marcar-leida`, 
      null, // Body vacío
      {
        params: { usuario_id: userId }, // Query param según tu especificación
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return true;
  } catch (error) {
    console.error("Error marcando notificación:", error);
    return false;
  }
}