/**
 * @license
 * Establecimiento: Pozo del Carril
 * Tipos para Cotizaciones Dinámicas de Mercado Ganadero
 * Fuentes: Cañuelas_Claude (MAG S.A. - HTML), Invernada_Claude y Cría_Claude (ROSGAN - JSON)
 */

export interface CotizacionCanuelasRow {
  Categoría: string;
  Grupo: string;
  Cabezas: string | number;
  'Precio Mín.': string | number;
  'Precio Máx.': string | number;
  'Precio Prom.': string | number;
  Mediana: string | number;
  Importe: string | number;
  Kilos: string | number;
  'Prom. kg': string | number;
  'Fecha rueda': string;
  Estado: 'DEFINITIVOS' | 'PROVISORIOS' | string;
  'INMAG rueda': string | number;
  Consulta: string;
}

export interface CotizacionInvernadaRow {
  Categoría: string;
  'Precio $/kg': string | number;
  'Var. mensual': string | number;
  'Fecha remate': string;
  PIRI: string | number;
  'Índice ternero': string | number;
  Consulta: string;
}

export interface CotizacionCriaRow {
  Categoría: string;
  'Precio $/animal': string | number;
  'Var. mensual': string | number;
  'Fecha remate': string;
  PIRC: string | number;
  Consulta: string;
}

export type FuenteMercado =
  | 'Cañuelas_Claude'
  | 'Invernada_Claude'
  | 'Cría_Claude'
  | 'Ajuste Manual';

export interface CotizacionVigente {
  categoria_erp: string;
  id_categoria: number;
  subunidad_nombre: string;
  id_subunidad: number;
  fuente: FuenteMercado;
  categoria_fuente: string;
  unidad_medida: '$/kg' | '$/animal';
  precio_vigente: number;
  precio_minimo?: number;
  precio_maximo?: number;
  precio_promedio?: number;
  mediana?: number;
  fecha_rueda_remate: string;
  estado: 'DEFINITIVOS' | 'PROVISORIOS';
  consulta: string;
  es_ajuste_manual: boolean;
  motivo_ajuste?: string;
  usuario_ajuste?: string;
  desactualizado: boolean;
  alerta_desactualizado?: string;
}

export interface AuditoriaPrecioUsado {
  precio_usado: number;
  unidad_medida: '$/kg' | '$/animal';
  fuente: FuenteMercado;
  categoria_mercado: string;
  fecha_rueda_remate: string;
  estado: 'DEFINITIVOS' | 'PROVISORIOS' | string;
  fecha_hora_consulta: string;
  es_ajuste_manual: boolean;
  motivo_ajuste?: string;
  timestamp_calculo: string;
}

export interface DesgloseStockValuacion {
  id_categoria: number;
  categoria_nombre: string;
  cabezas: number;
  peso_promedio_kg: number;
  kilos_totales: number;
  precio_unitario: number;
  unidad_medida: '$/kg' | '$/animal';
  valuacion_total: number;
  cotizacion: CotizacionVigente;
}

export interface ValuacionSubunidad {
  id_subunidad: number;
  nombre_subunidad: string;
  total_cabezas: number;
  total_kilos: number;
  valuacion_total: number;
  desglose: DesgloseStockValuacion[];
  advertencias: string[];
}

export interface AjustePrecioManual {
  id_categoria: number;
  id_subunidad: number;
  precio_nuevo: number;
  motivo: string;
  usuario: string;
  fecha: string;
}
