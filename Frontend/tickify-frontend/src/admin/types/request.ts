export interface Request {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  fecha_registro?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  rol: string;
}
