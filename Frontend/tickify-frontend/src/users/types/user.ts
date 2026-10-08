export interface User {
  id: number; // antes id_user
  id_user?: number; // alias for backwards compatibility
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  fecha_registro?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  rol: string;
  avatar?: string; // URL del avatar del usuario (opcional)
  ruc?: string;
  razon_social?: string;
  dni?: string;
  direccion?: string;
  correo_organizacional?: string;
  motivacion?: string;
  sector?: string;
}

export interface LoginRequest {
  username: string; // se envía como correo
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  // Nuevo: el backend ahora devuelve rol y user_id en el login
  role?: string;
  user_id?: number;
  // Si el usuario es organizador, el backend puede devolver el id del organizador
  organizador_id?: number;
}

