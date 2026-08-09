export type UserRole = "admin" | "mod" | "miembro";
export type TipoAsistencia = "semana_completa" | "dias_sueltos";
export type TipoBebida = "cerveza" | "tinto" | "refresco" | "agua" | "nada" | "cubatas";
export type TipoGasto = "bote_comun" | "adelanto_personal";
export type TipoMensaje = "chat" | "sistema";
export type TipoComida = "comida" | "cena";

export interface Pena {
  id: string;
  nombre: string;
  slug: string;
  escudo_url: string | null;
  color_primary: string;
  color_secondary: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserPena {
  id: string;
  user_id: string;
  pena_id: string;
  nombre_completo: string;
  apodo: string | null;
  rol: UserRole;
  cuota_pagada: boolean;
  created_at: string;
}

export interface Fiesta {
  id: string;
  pena_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
  max_dias_sueltos: number | null;
  locked: boolean;
  created_at: string;
}

export interface DiaFiesta {
  id: string;
  fiesta_id: string;
  fecha: string;
  nombre: string | null;
}

export interface Asistencia {
  id: string;
  user_pena_id: string;
  fiesta_id: string;
  tipo: TipoAsistencia;
  bebida: TipoBebida;
  tipo_alcohol: string | null;
  marca_alcohol: string | null;
  mezcla: string | null;
  created_at: string;
  updated_at: string;
  dias?: DiaFiesta[];
}

export interface Gasto {
  id: string;
  pena_id: string;
  fiesta_id: string | null;
  creado_por: string;
  tipo: TipoGasto;
  concepto: string;
  importe: number;
  fecha: string;
  beneficiario_id: string | null;
  saldado: boolean;
  created_at: string;
}

export interface PropuestaMenu {
  id: string;
  pena_id: string;
  fiesta_id: string;
  dia_fiesta_id: string;
  propuesto_por: string;
  menu: string;
  tipo_comida: TipoComida;
  hora: string | null;
  se_encarga: boolean;
  aprobado: boolean;
  aprobado_por: string | null;
  created_at: string;
}

export interface PropuestaCocinero {
  id: string;
  propuesta_id: string;
  user_pena_id: string;
  created_at: string;
}

export interface ProductoCatalogo {
  id: string;
  pena_id: string;
  nombre: string;
  categoria: string;
  precio_estimado: number;
  precio_referencia: number | null;
  precio_manual: number | null;
  litros_por_unidad: number;
  fuente_precio: string;
  unidad: string;
  created_at: string;
}

export interface ChatMensaje {
  id: number;
  pena_id: string;
  user_pena_id: string | null;
  mensaje: string;
  tipo: TipoMensaje;
  created_at: string;
}

export interface DashboardAsistencia {
  dia: string;
  total_personas: number;
  cervezas: number;
  tintos: number;
  refrescos: number;
  aguas: number;
}

export interface BalanceFinanciero {
  total_bote: number;
  total_gastos: number;
  total_adelantos: number;
  adelantos_pendientes: number;
  saldo_disponible: number;
}
