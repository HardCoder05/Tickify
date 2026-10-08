export interface Tarifa {
  id: number;
  zona_id: number;
  tipo_ticket_id?: number;
  etapa_id?: number;
  nombre: string;
  precio: number;
  cantidad?: number;
  estado?: string;
  descripcion?: string;
  vendidos?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface Zona {
  id: number;
  evento_id: number;
  nombre: string;
  descripcion: string;
  capacidad: number;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// Alias para compatibilidad con código existente
export type ZonaEvento = Zona;

export interface FechaEvento {
  id: number;
  evento_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  capacidad_maxima: number | null;
  aforo_disponible: number | null;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface TipoEvento {
  id?: number;
  nombre: string;
  descripcion?: string;
  estado?: string;
}

export interface Etapa {
  id: number;
  evento_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface TipoTicket {
  id: number;
  evento_id: number;
  nombre: string;
  descripcion: string;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Evento {
  id: number;
  organizador_id: number;
  categoria_publico_id: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  capacidad_maxima: number | null;
  banner_url: string;
  estado: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  ubicacion: string;
  ciudad: string;
  tickets_vendidos?: number;
  fechas?: FechaEvento[];
  zonas?: Zona[];
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface EventoCompleto {
  evento: Evento;
  fechas: FechaEvento[];
  zonas: Zona[];
  etapas: Etapa[];
  tipos_ticket: TipoTicket[];
  tarifas: Tarifa[];
}

export interface CompraPayloadItem {
  evento_fecha_id: number;
  zona_id: number;
  tarifa_id: number;
  precio_pagado: number;
  asiento_fecha_id?: number;
}

export interface CompraPayload {
  usuario_id: number;
  metodo_pago: string;
  tickets: CompraPayloadItem[];
  estado?: string;
  codigo_descuento?: string | null;
}

export interface Compra {
  id: number;
  usuario_id: number;
  fecha: string;
  monto_subtotal: number;
  monto_total: number;
  descuento_total_aplicado: number;
  metodo_pago: string;
  estado: string;
  codigo_confirmacion: string;
  tickets: TicketCompra[];
}

export interface TicketCompra {
  id: number;
  evento_fecha_id: number;
  numero: string;
  fecha_compra: string;
  estado: string;
  codigo_qr: string;
  precio_pagado: number;
  evento_nombre: string;
  evento_fecha_inicio: string;
  evento_fecha_fin: string;
  tarifa_nombre: string;
  zona_nombre: string;
  tipo_ticket_nombre: string;
  asiento_fila?: number;
  asiento_numero?: number;
}

export interface TicketDetail {
  id: number;
  numero: string;
  fecha_compra: string;
  estado: string;
  codigo_qr: string;
  precio_pagado: number;
  descuento_aplicado: number;
  comision_aplicada: number;
  evento_nombre: string;
  evento_fecha_inicio: string;
  evento_fecha_fin: string;
  tarifa_nombre: string;
  zona_nombre: string;
  compra_codigo_confirmacion: string;
  compra_estado: string;
  tipo_ticket_nombre: string;
  tipo_ticket_descripcion: string;
}

