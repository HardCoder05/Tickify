export type DiscountType = "efectivo" | "porcentaje";

export interface DiscountCreate {
  codigo: string;
  evento_id: number;
  valor: number; // porcentaje (0-100) o monto fijo según tipo_descuento
  fecha_inicio: string; // ISO
  fecha_fin: string;    // ISO
  estado: string;       // "activo" | "inactivo" | "pendiente"
  descripcion: string;
  usos_maximos: number;
  usos_actuales?: number; // default 0
  tipo_descuento: DiscountType;
}

export interface DiscountRead extends DiscountCreate {
  id: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}