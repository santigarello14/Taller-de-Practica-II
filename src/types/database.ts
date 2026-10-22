/**
 * @license
 * Establecimiento: Pozo del Carril
 * Proyecto: "Activos con cuatro patas: contabilidad aplicada a la actividad bovina"
 * Trabajo Práctico: Taller de Práctica II (Año 2026)
 *
 * ESPECIFICACIÓN DE TIPOS Y MODELO DE DATOS NORMALIZADO
 * Capas: D_ (Dimensionales), P_ (Paramétricas), F_ (Hechos), R_ (Resultados), S_ (Sistema)
 */

// ============================================================================
// 1. CAPA DIMENSIONAL / MAESTRAS (D_)
// ============================================================================

export interface D_UnidadNeg {
  id_unidad_neg: number; // PK
  nombre: string;        // Bovinos, Porcinos, Ovinos, Maíz, Soja
  descripcion?: string;
  activo: boolean;
}

export interface D_Subunidad {
  id_subunidad: number;  // PK
  id_unidad_neg: number; // FK -> D_UnidadNeg.id_unidad_neg
  nombre: string;        // Cría, Recría, Adaptación, Engorde
  descripcion?: string;
  rango_peso_referencia?: string; // Ej: 0 a 150 kg (descriptivo)
  activo: boolean;
}

export type ClasificacionContable = 'Activo Productor' | 'Bien de Cambio' | '';

export interface D_CategoriaHacienda {
  id_categoria: number; // PK
  id_unidad_neg: number; // FK -> D_UnidadNeg.id_unidad_neg (1: Bovinos, 2: Porcinos, 3: Ovinos)
  nombre: string;       // Vacas, Vacas Secas, Vacas Preñadas, Vaquillona 1, Vaquillona 2, Terneros, Terneras, Destete, Novillitos, Novillos, Toros, Toritos
  clasificacion_contable: ClasificacionContable; // RT 22 / RT 54 (Activo Productor o Bien de Cambio)
  sexo_esperado?: 'Macho' | 'Hembra' | 'Mixto';
  activo: boolean;
}

export interface D_UM {
  id_um: number; // PK
  codigo: string; // kg, cabezas, dosis, litros, fardos/rollos, pesos
  nombre: string;
}

export interface D_Cuenta {
  id_cuenta: string; // PK: Ej. 4.1.01, 5.1.01, etc.
  codigo: string;
  nombre: string;
  grupo: '1.3 Activo' | '1.5 Activo' | '4.1 Ingresos' | '5.1 Costos Directos' | '5.2 Gastos de Estructura' | '5.5 Costos Indirectos' | '5.7 Gastos Comerciales' | '6.7 Cuentas de Orden';
  activo: boolean;
}

export interface D_Insumo {
  id_insumo: number;       // PK
  codigo?: string;
  nombre: string;          // Maíz, Silaje, Vacuna aftosa, etc.
  tipo: 'Alimento' | 'Sanidad' | 'Genética' | 'Servicio' | 'Otro';
  id_um_consumo: number;   // FK -> D_UM.id_um
  id_cuenta_costo: string; // FK -> D_Cuenta.id_cuenta
  stock_minimo_alerta?: number;
  activo: boolean;
}

export interface D_Campana {
  id_campana: number; // PK
  nombre: string;     // Ej: Campaña 2025/2026
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  activa: boolean;
}

export interface D_HaciendaIndividual {
  id_hacienda: number;            // PK
  caravana_visual: string;        // UNIQUE
  caravana_rfid: string;          // UNIQUE
  sexo: 'Macho' | 'Hembra';
  fecha_nacimiento?: string;      // YYYY-MM-DD
  peso_al_nacer_kg?: number;
  id_padre?: number | null;       // FK -> D_HaciendaIndividual.id_hacienda (Toro)
  id_madre?: number | null;       // FK -> D_HaciendaIndividual.id_hacienda (Vaca)
  raza: string;                   // Ej: Angus Negro, Colorado
  id_categoria_actual: number;    // FK -> D_CategoriaHacienda.id_categoria
  id_subunidad_actual: number;    // FK -> D_Subunidad.id_subunidad
  estado_actual: 'Activo' | 'Inactivo' | 'Baja por Venta' | 'Baja por Muerte';
  observaciones?: string;
}

export interface D_TropaLote {
  id_tropa: number;         // PK
  codigo_tropa: string;     // UNIQUE: Ej: TR-REC-2026-01
  nombre: string;
  id_subunidad: number;     // FK -> D_Subunidad.id_subunidad
  cantidad_cabezas_inicial: number;
  fecha_ingreso: string;    // YYYY-MM-DD
  estado: 'En Curso' | 'Transferido' | 'Finalizado' | 'Cerrado';
  observaciones?: string;
}

// ============================================================================
// 2. CAPA PARAMÉTRICA / ESTÁNDARES TÉCNICOS (P_)
// ============================================================================

export interface P_EstandarRinde {
  id_param_rinde: number;   // PK
  id_campana: number;       // FK -> D_Campana.id_campana
  id_subunidad: number;     // FK -> D_Subunidad.id_subunidad
  adpv_estandar_kg_dia: number;     // ADPV meta en kg/día
  dias_permanencia_teoricos: number; // Días esperados en la etapa
  kg_ganados_proyectados_cab: number; // Kilos agregados por cabeza en la etapa
  // CONSTRAINT uq_rinde_campana_subunidad UNIQUE (id_campana, id_subunidad)
}

export interface P_DosisTecnica {
  id_dosis_tecnica: number; // PK
  id_campana: number;       // FK -> D_Campana.id_campana
  id_subunidad: number;     // FK -> D_Subunidad.id_subunidad
  id_categoria: number;     // FK -> D_CategoriaHacienda.id_categoria
  id_insumo: number;        // FK -> D_Insumo.id_insumo
  dosis_teorica_cab_dia: number; // kg ración / cab / día (para alimentos) o dosis anual por cabeza (vacunas)
  dosis_es_diaria: boolean; // true = multiplicar por días permanencia; false = solo por cabezas
  observaciones_protocolo?: string;
  // CONSTRAINT uq_dosis_tecnica UNIQUE (id_campana, id_subunidad, id_categoria, id_insumo)
}

// ============================================================================
// 3. CAPA TRANSACCIONAL / HECHOS REALES (F_)
// ============================================================================

export type TipoMovimientoHacienda = 
  | 'Nacimiento' 
  | 'Destete' 
  | 'Traslado Inter-Subunidad' 
  | 'Cambio de Categoría' 
  | 'Cambio de Tropa' 
  | 'Compra Externa' 
  | 'Venta' 
  | 'Muerte';

export interface F_MovimientosHacienda {
  id_movimiento: number;            // PK
  fecha: string;                    // YYYY-MM-DD
  tipo_movimiento: TipoMovimientoHacienda;
  id_hacienda?: number | null;      // FK -> D_HaciendaIndividual.id_hacienda (si es individual)
  id_tropa?: number | null;         // FK -> D_TropaLote.id_tropa (si es por tropa)
  cantidad_cabezas: number;         // 1 para individual, N para tropa
  id_subunidad_origen?: number | null; // FK -> D_Subunidad.id_subunidad (NULL en nacimientos/compras)
  id_subunidad_destino?: number | null;// FK -> D_Subunidad.id_subunidad (NULL en muertes/ventas)
  id_categoria_origen: number;      // FK -> D_CategoriaHacienda.id_categoria
  id_categoria_destino: number;     // FK -> D_CategoriaHacienda.id_categoria
  peso_total_kg: number;
  peso_promedio_kg: number;
  remito_guia?: string;
  motivo_observaciones?: string;
}

export interface F_ConsumosReales {
  id_consumo: number;           // PK
  fecha: string;                // YYYY-MM-DD
  id_subunidad: number;         // FK -> D_Subunidad.id_subunidad
  id_tropa?: number | null;     // FK -> D_TropaLote.id_tropa (opcional, para ICA por lote)
  id_insumo: number;            // FK -> D_Insumo.id_insumo
  cantidad_fisica_real: number; // en unidad de medida de D_Insumo
  comprobante_remito: string;   // Número de vale / remito de extracción de silo
  observaciones?: string;
}

export interface F_SanidadReal {
  id_sanidad: number;           // PK
  fecha: string;                // YYYY-MM-DD
  id_subunidad: number;         // FK -> D_Subunidad.id_subunidad
  id_tropa?: number | null;     // FK -> D_TropaLote.id_tropa
  id_hacienda?: number | null;  // FK -> D_HaciendaIndividual.id_hacienda
  id_insumo: number;            // FK -> D_Insumo.id_insumo
  dosis_real_total: number;     // Cantidad de dosis / unidades suministradas
  acta_vacunacion_senasa?: string; // Número oficial de acta SENASA
  profesional_veterinario?: string; // Nombre / Matrícula
  costo_profesional_honorarios: number; // Costo de aplicación profesional
  observaciones?: string;
}

export interface F_ComprasInsumos {
  id_compra: number;            // PK
  fecha: string;                // YYYY-MM-DD
  id_insumo: number;            // FK -> D_Insumo.id_insumo
  cantidad: number;             // Cantidad física ingresada
  precio_unitario_real: number; // Precio real devengado o costo oportunidad FAS pizarra de transferencia propia
  importe_total: number;        // cantidad * precio_unitario_real (calculado)
  tipo_origen: 'Compra Externa a Proveedor' | 'Transferencia Agrícola Interna (Maíz/Soja)';
  numero_comprobante: string;   // Factura / Liquidación primaria / Remito interno
  proveedor_o_unidad_origen?: string;
}

export interface F_PesadasControl {
  id_pesada: number;            // PK
  fecha: string;                // YYYY-MM-DD
  id_subunidad: number;         // FK -> D_Subunidad.id_subunidad
  id_tropa?: number | null;     // FK -> D_TropaLote.id_tropa
  id_hacienda?: number | null;  // FK -> D_HaciendaIndividual.id_hacienda
  peso_vivo_kg: number;         // Peso individual o peso total del lote
  cantidad_cabezas: number;     // 1 para individual, N para lote
  peso_promedio_kg: number;     // peso_vivo_kg / cantidad_cabezas
  dias_desde_pesada_anterior?: number;
  adpv_registrado_kg_dia?: number;
  observaciones?: string;
}

export interface F_VentasHacienda {
  id_venta: number;             // PK
  fecha: string;                // YYYY-MM-DD
  id_subunidad: number;         // FK -> D_Subunidad.id_subunidad
  id_tropa?: number | null;     // FK -> D_TropaLote.id_tropa
  id_categoria: number;         // FK -> D_CategoriaHacienda.id_categoria
  id_cuenta_ingreso: string;    // FK -> D_Cuenta.id_cuenta (4.1.01)
  cabezas: number;
  kilos_vivos_totales: number;
  precio_por_kg_real: number;   // Precio real mercado de Cañuelas / feria
  ingreso_bruto_venta: number;  // kilos_vivos_totales * precio_por_kg_real

  // Deducciones comerciales (RT 22 / RT 54)
  comision_consignatario: number; // Cuenta 5.7.01
  flete_camion_jaula: number;     // Cuenta 5.7.02
  derechos_pista_pesaje: number;  // Cuenta 5.7.03
  aranceles_senasa_dte: number;   // Cuenta 5.7.04
  otras_tasas_feriales: number;
  total_gastos_comerciales: number; // Suma de deducciones comerciales

  // Venta Neta (Ingreso Bruto - Gastos Comerciales)
  venta_neta: number;

  // Impositivo y Cobro
  alicuota_iva: number;         // Por defecto 10.5% (0.105)
  iva_liquidado: number;
  retenciones_fiscales: number;
  neto_a_cobrar: number;

  numero_liquidacion_dte: string;
  consignatario_comprador?: string;

  // Metadatos de auditoría de cotización dinámica (Claude / MAG Cañuelas / ROSGAN)
  fuente_precio?: string;
  categoria_mercado?: string;
  fecha_rueda_remate?: string;
  estado_rueda?: string;
  fecha_hora_consulta?: string;
  es_ajuste_manual?: boolean;
}

export interface F_CostosIndirectos {
  id_costo_indirecto: number;   // PK
  fecha: string;                // YYYY-MM-DD
  concepto: string;             // Combustible, mantenimiento mangas, etc.
  id_cuenta_costo: string;      // FK -> D_Cuenta.id_cuenta (5.5 o 5.2)
  importe_total_erogacion: number;
  id_subunidad: number;         // FK -> D_Subunidad.id_subunidad receptora
  coeficiente_prorrateo: number;// Base de prorrateo (0 a 1)
  importe_asignado_subunidad: number; // importe_total * coeficiente
  comprobante_factura?: string;
}

// ============================================================================
// 4. CAPA DE SISTEMA Y AUDITORÍA (S_)
// ============================================================================

export type RolUsuario = 'Administrador' | 'Operador' | 'Consulta';

export interface S_Usuarios {
  id_usuario: number; // PK
  usuario: string;    // UNIQUE
  contrasena: string; // Hash o string validado exclusivamente en backend
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface S_Auditoria {
  id: number;
  fecha_hora: string;
  usuario: string;
  tabla_afectada: string;
  id_registro: string | number;
  accion: 'ALTA' | 'MODIFICACION' | 'BAJA';
  valor_anterior?: string;
  valor_nuevo?: string;
  detalle?: string;
}

// ============================================================================
// 5. CAPA DE RESULTADOS Y REPORTES ANALÍTICOS (Vistas R_)
// ============================================================================

export interface R_MargenSubunidad {
  id_campana: number;
  id_subunidad: number;
  nombre_subunidad: string;
  periodo: string;
  ingresos_brutos: number;
  gastos_comerciales: number;
  ventas_netas: number;
  costos_directos_reales: number;
  margen_bruto: number;
  porcentaje_sobre_costos: number; // (Margen Bruto / Costos Directos) * 100
}

export interface R_DesvioRendimiento {
  id_campana: number;
  id_subunidad: number;
  nombre_subunidad: string;
  id_tropa?: number | null;
  codigo_tropa?: string;
  id_categoria?: number;
  nombre_categoria?: string;
  cabezas_evaluadas: number;
  dias_permanencia: number;
  rendimiento_estandar_kg: number;
  rendimiento_real_kg: number;
  desvio_rendimiento_kg: number;       // Real - Estándar
  desvio_porcentual_rendimiento: number;// ((Real - Estándar) / Estándar) * 100
  precio_real_referencia: number;
  desvio_economico_rendimiento: number;// (Real - Estándar) * Precio Real
}

export interface R_DesvioConsumo {
  id_campana: number;
  id_subunidad: number;
  nombre_subunidad: string;
  id_tropa?: number | null;
  codigo_tropa?: string;
  id_insumo: number;
  nombre_insumo: string;
  id_um: number;
  codigo_um: string;
  consumo_estandar_fisico: number;
  consumo_real_fisico: number;
  desvio_consumo_fisico: number;        // Real - Estándar
  desvio_porcentual_consumo: number;    // ((Real - Estándar) / Estándar) * 100
  precio_real_unitario: number;
  desvio_economico_consumo: number;     // (Real - Estándar) * Precio Real Unitario
}

export interface R_ResultadoConsolidado {
  id_campana: number;
  nombre_campana: string;
  ingresos_netos_totales: number;        // Solo ventas externas
  costos_directos_totales: number;       // Insumos y servicios reales externos
  margen_bruto_consolidado: number;      // Ingresos Netos - Costos Directos
  porcentaje_sobre_costos_consolidado: number;
  desvio_rendimiento_consolidado_kg: number;
  desvio_consumo_consolidado_economico: number;
  transferencias_internas_neutralizadas: number;
}

// Integridad y Validación
export interface ErrorIntegridad {
  id: string;
  regla: string;
  tabla: string;
  id_registro: string | number;
  descripcion: string;
  severidad: 'CRITICO' | 'ADVERTENCIA';
}

// ============================================================================
// 6. MÓDULO COSTOS ESTÁNDAR BOVINOS (OCTUBRE 2026)
// ============================================================================

export interface P_CostosSupuestos {
  id_supuesto: number;
  grupo: string;
  concepto: string;
  valor: number;
  unidad: string;
  tipo: string;
  fuente_nota: string;
}

export interface P_CostosDietas {
  id_param_dieta: number;
  concepto: string;
  recria: string | number;
  adaptacion: string | number;
  engorde_final: string | number;
  cria_vaca_ano: string | number;
}

export interface P_CostosVacunas {
  id_vacuna: number;
  categoria: string;
  vacuna_nombre: string;
  dosis_anual: number;
  precio_dosis: number;
  total_anual: number;
}

export interface P_CostosDetalleDesglose {
  id_desglose: number;
  subunidad: string;
  ingrediente_concepto: string;
  kg_ms: number;
  kg_tal_cual: number;
  precio_unitario: number;
  costo_total: number;
}

export interface R_CostosEstandarTotales {
  subunidad: string;
  costo_alimentacion: number;
  costo_vacunas: number;
  costo_total_cab: number;
  costo_por_kg_ganado: number;
}

