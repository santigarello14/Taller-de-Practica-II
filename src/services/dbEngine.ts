/**
 * @license
 * Establecimiento: Pozo del Carril
 * Proyecto: "Activos con cuatro patas: contabilidad aplicada a la actividad bovina"
 * Motor de Base de Datos, Reglas de Negocio, Validaciones e Integridad Referencial
 */

import {
  D_UnidadNeg,
  D_Subunidad,
  D_CategoriaHacienda,
  D_UM,
  D_Cuenta,
  D_Insumo,
  D_Campana,
  D_HaciendaIndividual,
  D_TropaLote,
  P_EstandarRinde,
  P_DosisTecnica,
  F_MovimientosHacienda,
  F_ConsumosReales,
  F_SanidadReal,
  F_ComprasInsumos,
  F_PesadasControl,
  F_VentasHacienda,
  F_CostosIndirectos,
  S_Usuarios,
  S_Auditoria,
  RolUsuario,
  R_MargenSubunidad,
  R_DesvioRendimiento,
  R_DesvioConsumo,
  R_ResultadoConsolidado,
  ErrorIntegridad,
  P_CostosSupuestos,
  P_CostosDietas,
  P_CostosVacunas,
  P_CostosDetalleDesglose,
  R_CostosEstandarTotales,
} from '../types/database';
import { cotizacionesService, CotizacionesService } from './cotizacionesService';
import {
  CotizacionVigente,
  ValuacionSubunidad,
  DesgloseStockValuacion,
  AuditoriaPrecioUsado,
} from '../types/cotizaciones';

// ============================================================================
// CATÁLOGOS OFICIALES PRECARGADOS (ESTRICTAMENTE SEGÚN ESPECIFICACIÓN)
// ============================================================================

export const INITIAL_UNIDADES_NEG: D_UnidadNeg[] = [
  { id_unidad_neg: 1, nombre: 'Bovinos', descripcion: 'Actividad pecuaria ciclo completo de carne y cabaña', activo: true },
  { id_unidad_neg: 2, nombre: 'Porcinos', descripcion: 'Producción porcina intensiva', activo: true },
  { id_unidad_neg: 3, nombre: 'Ovinos', descripcion: 'Producción ovina para carne y lana', activo: true },
  { id_unidad_neg: 4, nombre: 'Maíz', descripcion: 'Producción agrícola de grano y silaje', activo: true },
  { id_unidad_neg: 5, nombre: 'Soja', descripcion: 'Producción agrícola de oleaginosa y concentrado', activo: true },
];

export const INITIAL_SUBUNIDADES: D_Subunidad[] = [
  {
    id_subunidad: 1,
    id_unidad_neg: 1,
    nombre: 'Cría',
    rango_peso_referencia: '0 a 150 kg',
    descripcion: 'Lactancia al pie de la madre sobre pasturas y rastrojos hasta alcanzar el peso de destete',
    activo: true,
  },
  {
    id_subunidad: 2,
    id_unidad_neg: 1,
    nombre: 'Recría',
    rango_peso_referencia: '150 a 280 kg',
    descripcion: 'Crecimiento en pasturas de alfalfa con aporte de fibra para formar caja ósea sin engrase',
    activo: true,
  },
  {
    id_subunidad: 3,
    id_unidad_neg: 1,
    nombre: 'Adaptación',
    rango_peso_referencia: '280 a 310 kg',
    descripcion: 'Acostumbramiento ruminal paulatino incorporando maíz y rollo para prevenir timpanismo (14 a 21 días)',
    activo: true,
  },
  {
    id_subunidad: 4,
    id_unidad_neg: 1,
    nombre: 'Engorde / Terminación',
    rango_peso_referencia: '310 a 450 kg',
    descripcion: 'Alimentación intensiva en corral con ración de maíz, soja y concentrado hasta terminación comercial',
    activo: true,
  },
];

export const INITIAL_CATEGORIAS: D_CategoriaHacienda[] = [
  { id_categoria: 1, id_unidad_neg: 1, nombre: 'Vacas', clasificacion_contable: 'Activo Productor', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 2, id_unidad_neg: 1, nombre: 'Vacas Secas', clasificacion_contable: 'Activo Productor', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 3, id_unidad_neg: 1, nombre: 'Vacas Preñadas', clasificacion_contable: 'Activo Productor', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 4, id_unidad_neg: 1, nombre: 'Vaquillona 1', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 5, id_unidad_neg: 1, nombre: 'Vaquillona 2', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 6, id_unidad_neg: 1, nombre: 'Terneros', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Macho', activo: true },
  { id_categoria: 7, id_unidad_neg: 1, nombre: 'Terneras', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Hembra', activo: true },
  { id_categoria: 8, id_unidad_neg: 1, nombre: 'Destete', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Mixto', activo: true },
  { id_categoria: 9, id_unidad_neg: 1, nombre: 'Novillitos', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Macho', activo: true },
  { id_categoria: 10, id_unidad_neg: 1, nombre: 'Novillos', clasificacion_contable: 'Bien de Cambio', sexo_esperado: 'Macho', activo: true },
  { id_categoria: 11, id_unidad_neg: 1, nombre: 'Toros', clasificacion_contable: 'Activo Productor', sexo_esperado: 'Macho', activo: true },
  { id_categoria: 12, id_unidad_neg: 1, nombre: 'Toritos', clasificacion_contable: '', sexo_esperado: 'Macho', activo: true }, // Vacío según regla 5 (a definir según destino reproductor o venta)
];

export const INITIAL_UM: D_UM[] = [
  { id_um: 1, codigo: 'kg', nombre: 'Kilogramos' },
  { id_um: 2, codigo: 'cabezas', nombre: 'Cabezas vacunas' },
  { id_um: 3, codigo: 'dosis', nombre: 'Dosis sanitarias / pajuelas' },
  { id_um: 4, codigo: 'litros', nombre: 'Litros' },
  { id_um: 5, codigo: 'fardos/rollos', nombre: 'Fardos / Rollos de fibra' },
  { id_um: 6, codigo: 'pesos', nombre: 'Pesos Argentinos ($)' },
];

export const INITIAL_CUENTAS: D_Cuenta[] = [
  { id_cuenta: '4.1.01', codigo: '4.1.01', nombre: 'Ventas de Hacienda Bovina', grupo: '4.1 Ingresos', activo: true },
  { id_cuenta: '5.1.01', codigo: '5.1.01', nombre: 'Maíz y Concentrados Proteicos', grupo: '5.1 Costos Directos', activo: true },
  { id_cuenta: '5.1.04', codigo: '5.1.04', nombre: 'Silaje de Planta Entera y Fibra', grupo: '5.1 Costos Directos', activo: true },
  { id_cuenta: '5.1.06', codigo: '5.1.06', nombre: 'Sanidad, Vacunas y Productos Veterinarios', grupo: '5.1 Costos Directos', activo: true },
  { id_cuenta: '5.7.01', codigo: '5.7.01', nombre: 'Comisión de la Casa Consignataria', grupo: '5.7 Gastos Comerciales', activo: true },
  { id_cuenta: '5.7.02', codigo: '5.7.02', nombre: 'Flete de Hacienda en Camión Jaula', grupo: '5.7 Gastos Comerciales', activo: true },
  { id_cuenta: '5.7.03', codigo: '5.7.03', nombre: 'Derechos de Pista y Pesaje Ferial', grupo: '5.7 Gastos Comerciales', activo: true },
  { id_cuenta: '5.7.04', codigo: '5.7.04', nombre: 'Aranceles SENASA y Sellado de Guía DTe', grupo: '5.7 Gastos Comerciales', activo: true },
];

export const INITIAL_INSUMOS: D_Insumo[] = [
  { id_insumo: 1, codigo: 'AL-MAIZ', nombre: 'Grano de maíz', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.01', activo: true },
  { id_insumo: 2, codigo: 'AL-SOJA', nombre: 'Soja / Concentrado proteico', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.01', activo: true },
  { id_insumo: 3, codigo: 'AL-NUCLEO', nombre: 'Núcleo mineral con monensina', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.01', activo: true },
  { id_insumo: 4, codigo: 'AL-SILAJEMA', nombre: 'Silaje de maíz de planta entera', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.04', activo: true },
  { id_insumo: 5, codigo: 'AL-ROLLOS', nombre: 'Rollos de fibra', tipo: 'Alimento', id_um_consumo: 5, id_cuenta_costo: '5.1.04', activo: true },
  { id_insumo: 6, codigo: 'AL-ALFALFA', nombre: 'Pasturas de alfalfa', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.04', activo: true },
  { id_insumo: 7, codigo: 'AL-PASTURAS', nombre: 'Pasturas y rastrojos generales', tipo: 'Alimento', id_um_consumo: 1, id_cuenta_costo: '5.1.04', activo: true },
  { id_insumo: 8, codigo: 'SA-AFTOSA', nombre: 'Vacuna antiaftosa', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 9, codigo: 'SA-BRUCELA', nombre: 'Vacuna antibrucélica', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 10, codigo: 'SA-REPROD', nombre: 'Vacuna reproductiva', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 11, codigo: 'SA-CARBUN', nombre: 'Vacuna carbunclo', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 12, codigo: 'SA-RESPIR', nombre: 'Vacuna respiratoria', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 13, codigo: 'SA-CLOSTR', nombre: 'Vacuna clostridial', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 14, codigo: 'SA-PARASIT', nombre: 'Antiparasitarios', tipo: 'Sanidad', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 15, codigo: 'GE-SEMEN', nombre: 'Semen bovino / Inseminación', tipo: 'Genética', id_um_consumo: 3, id_cuenta_costo: '5.1.06', activo: true },
  { id_insumo: 16, codigo: 'SE-VETERIN', nombre: 'Servicios e intervenciones veterinarias', tipo: 'Servicio', id_um_consumo: 6, id_cuenta_costo: '5.1.06', activo: true },
];

export const INITIAL_USUARIOS: S_Usuarios[] = [
  { id_usuario: 1, usuario: 'admin', contrasena: 'admin2026', nombre: 'Administrador Pozo del Carril', rol: 'Administrador', activo: true },
  { id_usuario: 2, usuario: 'operador', contrasena: 'campo2026', nombre: 'Operador de Campo y Balanza', rol: 'Operador', activo: true },
  { id_usuario: 3, usuario: 'auditor', contrasena: 'auditor2026', nombre: 'Auditor Contable y Control de Gestión', rol: 'Consulta', activo: true },
];

// Existencias reales según planilla de hacienda del Establecimiento Pozo del Carril (837 cabezas)
export const INITIAL_MOVIMIENTOS_EXISTENCIAS: F_MovimientosHacienda[] = [
  { id_movimiento: 1, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 57, id_subunidad_origen: null, id_subunidad_destino: 1, id_categoria_origen: 1, id_categoria_destino: 1, peso_total_kg: 23940, peso_promedio_kg: 420, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Vacas cría' },
  { id_movimiento: 2, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 345, id_subunidad_origen: null, id_subunidad_destino: 1, id_categoria_origen: 4, id_categoria_destino: 4, peso_total_kg: 96600, peso_promedio_kg: 280, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Vaquillona 1' },
  { id_movimiento: 3, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 140, id_subunidad_origen: null, id_subunidad_destino: 1, id_categoria_origen: 6, id_categoria_destino: 6, peso_total_kg: 19600, peso_promedio_kg: 140, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Terneros' },
  { id_movimiento: 4, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 16, id_subunidad_origen: null, id_subunidad_destino: 1, id_categoria_origen: 7, id_categoria_destino: 7, peso_total_kg: 2160, peso_promedio_kg: 135, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Terneras' },
  { id_movimiento: 5, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 4, id_subunidad_origen: null, id_subunidad_destino: 1, id_categoria_origen: 11, id_categoria_destino: 11, peso_total_kg: 2720, peso_promedio_kg: 680, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Toros' },
  { id_movimiento: 6, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 302, id_subunidad_origen: null, id_subunidad_destino: 2, id_categoria_origen: 9, id_categoria_destino: 9, peso_total_kg: 69460, peso_promedio_kg: 230, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Novillitos recría' },
  { id_movimiento: 7, fecha: '2026-06-22', tipo_movimiento: 'Compra Externa', id_hacienda: null, id_tropa: null, cantidad_cabezas: 50, id_subunidad_origen: null, id_subunidad_destino: 2, id_categoria_origen: 5, id_categoria_destino: 5, peso_total_kg: 12500, peso_promedio_kg: 250, remito_guia: 'INVENTARIO-INICIAL-2026', motivo_observaciones: 'Stock inicial Planilla Existencias 2026 - Vaquillona 2 recría' },
];

export const INITIAL_VENTAS_HACIENDA: F_VentasHacienda[] = [
  {
    id_venta: 1,
    fecha: '2026-09-28',
    id_subunidad: 4, // Engorde
    id_tropa: 1,
    id_categoria: 10, // Novillos
    id_cuenta_ingreso: '4.1.01',
    cabezas: 45,
    kilos_vivos_totales: 20160,
    precio_por_kg_real: 2420,
    ingreso_bruto_venta: 48787200,
    comision_consignatario: 1463616,
    flete_camion_jaula: 1800000,
    derechos_pista_pesaje: 243936,
    aranceles_senasa_dte: 195148.8,
    otras_tasas_feriales: 200275.2,
    total_gastos_comerciales: 3902976,
    venta_neta: 44884224,
    alicuota_iva: 0.105,
    iva_liquidado: 5122656,
    retenciones_fiscales: 487872,
    neto_a_cobrar: 49519008,
    numero_liquidacion_dte: 'LIQ-CAÑUELAS-2026-0045',
    consignatario_comprador: 'Consignataria Madelan S.A. - MAG Cañuelas',
    fuente_precio: 'MAG Cañuelas Rueda 2026-09-28',
    categoria_mercado: 'Novillos 430-460 kg',
    fecha_rueda_remate: '2026-09-28',
    estado_rueda: 'Cerrada',
  },
  {
    id_venta: 2,
    fecha: '2026-08-15',
    id_subunidad: 4, // Engorde
    id_tropa: 1,
    id_categoria: 9, // Novillitos
    id_cuenta_ingreso: '4.1.01',
    cabezas: 35,
    kilos_vivos_totales: 15680,
    precio_por_kg_real: 2450,
    ingreso_bruto_venta: 38416000,
    comision_consignatario: 1152480,
    flete_camion_jaula: 1400000,
    derechos_pista_pesaje: 192080,
    aranceles_senasa_dte: 153664,
    otras_tasas_feriales: 175056,
    total_gastos_comerciales: 3073280,
    venta_neta: 35342720,
    alicuota_iva: 0.105,
    iva_liquidado: 4033680,
    retenciones_fiscales: 384160,
    neto_a_cobrar: 38992240,
    numero_liquidacion_dte: 'LIQ-CAÑUELAS-2026-0035',
    consignatario_comprador: 'Alzaga Unzué y Cía. - MAG Cañuelas',
    fuente_precio: 'MAG Cañuelas Rueda 2026-08-15',
    categoria_mercado: 'Novillitos 390-430 kg',
    fecha_rueda_remate: '2026-08-15',
    estado_rueda: 'Cerrada',
  },
];

export const INITIAL_PESADAS_CONTROL: F_PesadasControl[] = [
  {
    id_pesada: 1,
    fecha: '2026-09-26',
    id_subunidad: 4, // Engorde
    id_tropa: 1,
    cantidad_cabezas: 45,
    peso_vivo_kg: 20565, // En campo: 457 kg promedio
    peso_promedio_kg: 457,
    dias_desde_pesada_anterior: 60,
    adpv_registrado_kg_dia: 1.545,
    observaciones: 'Pesada previa a carga de jaula con destino a feria MAG Cañuelas (peso feria 448 kg, merma 1.97%)',
  },
  {
    id_pesada: 2,
    fecha: '2026-07-28',
    id_subunidad: 3, // Adaptación
    id_tropa: 1,
    cantidad_cabezas: 45,
    peso_vivo_kg: 16076.25,
    peso_promedio_kg: 357.25,
    dias_desde_pesada_anterior: 50,
    adpv_registrado_kg_dia: 1.545,
    observaciones: 'Egreso de adaptación ruminal e ingreso a engorde final',
  },
  {
    id_pesada: 3,
    fecha: '2026-06-08',
    id_subunidad: 2, // Recría
    id_tropa: 1,
    cantidad_cabezas: 45,
    peso_vivo_kg: 12600,
    peso_promedio_kg: 280,
    dias_desde_pesada_anterior: 180,
    adpv_registrado_kg_dia: 0.778,
    observaciones: 'Egreso de recría pastoril en alfalfar e ingreso a transición en corral',
  },
  {
    id_pesada: 4,
    fecha: '2025-12-10',
    id_subunidad: 1, // Cría
    id_tropa: 1,
    cantidad_cabezas: 45,
    peso_vivo_kg: 6300,
    peso_promedio_kg: 140,
    dias_desde_pesada_anterior: 180,
    adpv_registrado_kg_dia: 0.778,
    observaciones: 'Pesada al destete de terneros de 140 kg promedio',
  },
];

export const INITIAL_SANIDAD_REAL: F_SanidadReal[] = [
  { id_sanidad: 1, fecha: '2026-04-10', id_subunidad: 1, id_insumo: 8, dosis_real_total: 57, costo_profesional_honorarios: 50000, acta_vacunacion_senasa: 'ACTA-SENASA-001', profesional_veterinario: 'Dr. Rossi', observaciones: 'Campaña obligatoria de vacunación antiaftosa vientres' },
  { id_sanidad: 2, fecha: '2026-04-12', id_subunidad: 1, id_insumo: 11, dosis_real_total: 57, costo_profesional_honorarios: 25000, acta_vacunacion_senasa: 'ACTA-SENASA-002', profesional_veterinario: 'Dr. Rossi', observaciones: 'Carbunclo bacteridiano anual en vacas' },
  { id_sanidad: 3, fecha: '2026-05-05', id_subunidad: 1, id_insumo: 10, dosis_real_total: 114, costo_profesional_honorarios: 60000, acta_vacunacion_senasa: 'ACTA-SENASA-003', profesional_veterinario: 'Dr. Rossi', observaciones: 'Vacuna reproductiva 2 dosis' },
  { id_sanidad: 4, fecha: '2026-05-15', id_subunidad: 2, id_insumo: 8, dosis_real_total: 352, costo_profesional_honorarios: 80000, acta_vacunacion_senasa: 'ACTA-SENASA-004', profesional_veterinario: 'Dr. Rossi', observaciones: 'Aftosa recría novillitos y vaquillonas' },
  { id_sanidad: 5, fecha: '2026-06-01', id_subunidad: 2, id_insumo: 13, dosis_real_total: 352, costo_profesional_honorarios: 45000, acta_vacunacion_senasa: 'ACTA-SENASA-005', profesional_veterinario: 'Dr. Rossi', observaciones: 'Clostridial polivalente en recría' },
  { id_sanidad: 6, fecha: '2026-06-20', id_subunidad: 2, id_insumo: 12, dosis_real_total: 352, costo_profesional_honorarios: 50000, acta_vacunacion_senasa: 'ACTA-SENASA-006', profesional_veterinario: 'Dr. Rossi', observaciones: 'Complejo respiratorio preventivo' },
  { id_sanidad: 7, fecha: '2026-07-05', id_subunidad: 3, id_insumo: 12, dosis_real_total: 50, costo_profesional_honorarios: 20000, acta_vacunacion_senasa: 'ACTA-SENASA-007', profesional_veterinario: 'Dr. Rossi', observaciones: 'Refuerzo respiratorio al ingreso a corral' },
  { id_sanidad: 8, fecha: '2026-07-06', id_subunidad: 3, id_insumo: 13, dosis_real_total: 50, costo_profesional_honorarios: 15000, acta_vacunacion_senasa: 'ACTA-SENASA-008', profesional_veterinario: 'Dr. Rossi', observaciones: 'Refuerzo clostridial en adaptación' },
  { id_sanidad: 9, fecha: '2026-07-07', id_subunidad: 3, id_insumo: 14, dosis_real_total: 50, costo_profesional_honorarios: 15000, acta_vacunacion_senasa: 'ACTA-SENASA-009', profesional_veterinario: 'Dr. Rossi', observaciones: 'Antiparasitario amplio espectro en corral' },
];

export const INITIAL_CONSUMOS_REALES: F_ConsumosReales[] = [
  { id_consumo: 1, fecha: '2026-09-01', id_subunidad: 4, id_insumo: 1, cantidad_fisica_real: 6811.2, comprobante_remito: 'REM-MIXER-0901', observaciones: 'Maíz propio molido engorde corral' },
  { id_consumo: 2, fecha: '2026-09-01', id_subunidad: 4, id_insumo: 4, cantidad_fisica_real: 18163.35, comprobante_remito: 'REM-MIXER-0902', observaciones: 'Silaje de maíz planta entera verde' },
  { id_consumo: 3, fecha: '2026-09-01', id_subunidad: 4, id_insumo: 3, cantidad_fisica_real: 1362.24, comprobante_remito: 'REM-MIXER-0903', observaciones: 'Núcleo mineral con monensina engorde' },
  { id_consumo: 4, fecha: '2026-08-01', id_subunidad: 3, id_insumo: 1, cantidad_fisica_real: 5702.85, comprobante_remito: 'REM-MIXER-0801', observaciones: 'Maíz propio ración adaptación ruminal' },
  { id_consumo: 5, fecha: '2026-08-01', id_subunidad: 3, id_insumo: 4, cantidad_fisica_real: 16727.85, comprobante_remito: 'REM-MIXER-0802', observaciones: 'Silaje de maíz verde adaptación' },
  { id_consumo: 6, fecha: '2026-08-01', id_subunidad: 3, id_insumo: 3, cantidad_fisica_real: 1003.5, comprobante_remito: 'REM-MIXER-0803', observaciones: 'Núcleo mineral con monensina adaptación' },
  { id_consumo: 7, fecha: '2026-07-01', id_subunidad: 2, id_insumo: 1, cantidad_fisica_real: 12886, comprobante_remito: 'REM-MIXER-0701', observaciones: 'Maíz suplementación recría pastoril' },
  { id_consumo: 8, fecha: '2026-07-01', id_subunidad: 2, id_insumo: 2, cantidad_fisica_real: 6300, comprobante_remito: 'REM-MIXER-0702', observaciones: 'Soja concentrado proteico recría' },
  { id_consumo: 9, fecha: '2026-07-01', id_subunidad: 2, id_insumo: 3, cantidad_fisica_real: 5670, comprobante_remito: 'REM-MIXER-0703', observaciones: 'Núcleo mineral recría' },
  { id_consumo: 10, fecha: '2026-06-01', id_subunidad: 1, id_insumo: 5, cantidad_fisica_real: 11153.2, comprobante_remito: 'REM-MIXER-0601', observaciones: 'Rollos de alfalfa reserva invernal cría' },
];

export const INITIAL_COMPRAS_INSUMOS: F_ComprasInsumos[] = [
  { id_compra: 1, fecha: '2026-05-10', id_insumo: 1, cantidad: 50000, precio_unitario_real: 287.09, importe_total: 14354500, tipo_origen: 'Transferencia Agrícola Interna (Maíz/Soja)', numero_comprobante: 'TRA-MAIZ-2026-01', proveedor_o_unidad_origen: 'Unidad Maíz - Campo Propio' },
  { id_compra: 2, fecha: '2026-05-15', id_insumo: 2, cantidad: 20000, precio_unitario_real: 560.00, importe_total: 11200000, tipo_origen: 'Transferencia Agrícola Interna (Maíz/Soja)', numero_comprobante: 'TRA-SOJA-2026-01', proveedor_o_unidad_origen: 'Unidad Soja - Campo Propio' },
  { id_compra: 3, fecha: '2026-05-20', id_insumo: 3, cantidad: 10000, precio_unitario_real: 1842.00, importe_total: 18420000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0001-00045892', proveedor_o_unidad_origen: 'Nutrición Animal del Centro S.A.' },
  { id_compra: 4, fecha: '2026-05-25', id_insumo: 4, cantidad: 80000, precio_unitario_real: 42.98, importe_total: 3438400, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0002-00012450', proveedor_o_unidad_origen: 'Servicios de Picado Forrajero SRL' },
  { id_compra: 5, fecha: '2026-05-30', id_insumo: 5, cantidad: 30000, precio_unitario_real: 155.00, importe_total: 4650000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-B-0005-00003412', proveedor_o_unidad_origen: 'Heno y Fardos de la Pampa' },
  { id_compra: 6, fecha: '2026-04-01', id_insumo: 8, cantidad: 1000, precio_unitario_real: 2400.00, importe_total: 2400000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0003-00089123', proveedor_o_unidad_origen: 'Veterinaria Central Ganadera' },
  { id_compra: 7, fecha: '2026-04-01', id_insumo: 11, cantidad: 500, precio_unitario_real: 100.00, importe_total: 50000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0003-00089124', proveedor_o_unidad_origen: 'Veterinaria Central Ganadera' },
  { id_compra: 8, fecha: '2026-04-01', id_insumo: 12, cantidad: 1000, precio_unitario_real: 1100.00, importe_total: 1100000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0003-00089125', proveedor_o_unidad_origen: 'Laboratorios Biológicos del Sur' },
  { id_compra: 9, fecha: '2026-04-01', id_insumo: 13, cantidad: 1000, precio_unitario_real: 600.00, importe_total: 600000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0003-00089126', proveedor_o_unidad_origen: 'Laboratorios Biológicos del Sur' },
  { id_compra: 10, fecha: '2026-04-01', id_insumo: 14, cantidad: 500, precio_unitario_real: 1500.00, importe_total: 750000, tipo_origen: 'Compra Externa a Proveedor', numero_comprobante: 'FC-A-0003-00089127', proveedor_o_unidad_origen: 'Veterinaria Central Ganadera' },
];

// ============================================================================
// COSTOS ESTÁNDAR ACTIVIDAD BOVINA (OCTUBRE 2026) - CONSTANTES INICIALES
// ============================================================================

export const INITIAL_COSTOS_SUPUESTOS: P_CostosSupuestos[] = [
  { id_supuesto: 1, grupo: 'Precios Base', concepto: 'Dólar oficial BNA', valor: 1535, unidad: '$/US$', tipo: 'precio', fuente_nota: 'Referencia cambiaria Octubre 2026' },
  { id_supuesto: 2, grupo: 'Precios Base', concepto: 'Maíz propio', valor: 287.09, unidad: '$/kg tal cual', tipo: 'precio', fuente_nota: 'FAS / costo propio' },
  { id_supuesto: 3, grupo: 'Precios Base', concepto: 'Soja grano', valor: 560, unidad: '$/kg tal cual', tipo: 'precio', fuente_nota: 'FAS / costo propio' },
  { id_supuesto: 4, grupo: 'Precios Base', concepto: 'Rollo de alfalfa 1ª', valor: 155, unidad: '$/kg tal cual', tipo: 'precio', fuente_nota: 'Referencia mercado' },
  { id_supuesto: 5, grupo: 'Precios Base', concepto: 'Silaje de maíz (US$/t)', valor: 28, unidad: 'US$/t verde', tipo: 'precio', fuente_nota: 'Costo contratista picado' },
  { id_supuesto: 6, grupo: 'Precios Base', concepto: 'Silaje de maíz ($/kg verde)', valor: 42.98, unidad: '$/kg verde', tipo: 'precio', fuente_nota: '(US$/t * Dólar)/1000 = (28 * 1535)/1000' },
  { id_supuesto: 7, grupo: 'Precios Base', concepto: 'Núcleo mineral con monensina (US$/kg)', valor: 1.2, unidad: 'US$/kg', tipo: 'precio', fuente_nota: 'Insumo formulación corral' },
  { id_supuesto: 8, grupo: 'Precios Base', concepto: 'Núcleo mineral ($/kg)', valor: 1842, unidad: '$/kg', tipo: 'precio', fuente_nota: 'US$/kg * Dólar = 1.2 * 1535' },
  { id_supuesto: 9, grupo: 'Pasturas', concepto: 'Alfalfa implantación', valor: 475, unidad: 'US$/ha', tipo: 'costo_implantacion', fuente_nota: 'Costo establecimiento pradera' },
  { id_supuesto: 10, grupo: 'Pasturas', concepto: 'Alfalfa amortización', valor: 4, unidad: 'años', tipo: 'vida_util', fuente_nota: 'Periodo amortización' },
  { id_supuesto: 11, grupo: 'Pasturas', concepto: 'Alfalfa producción', valor: 12000, unidad: 'kg MS/ha/año', tipo: 'rendimiento', fuente_nota: 'Producción forrajera anual' },
  { id_supuesto: 12, grupo: 'Pasturas', concepto: 'Alfalfa aprovechamiento', valor: 60, unidad: '%', tipo: 'eficiencia', fuente_nota: 'Eficiencia pastoreo directo' },
  { id_supuesto: 13, grupo: 'Pasturas', concepto: 'Alfalfa costo por kg MS consumido', valor: 25.31684, unidad: '$/kg MS', tipo: 'costo_unitario', fuente_nota: '((475 * 1535) / 4) / (12000 * 0.60)' },
  { id_supuesto: 14, grupo: 'Pasturas', concepto: 'Otras pasturas implantación', valor: 365, unidad: 'US$/ha', tipo: 'costo_implantacion', fuente_nota: 'Promedio campo natural y consociadas' },
  { id_supuesto: 15, grupo: 'Pasturas', concepto: 'Otras pasturas amortización', valor: 4, unidad: 'años', tipo: 'vida_util', fuente_nota: 'Periodo amortización' },
  { id_supuesto: 16, grupo: 'Pasturas', concepto: 'Otras pasturas producción', valor: 6000, unidad: 'kg MS/ha/año', tipo: 'rendimiento', fuente_nota: 'Producción anual' },
  { id_supuesto: 17, grupo: 'Pasturas', concepto: 'Otras pasturas aprovechamiento', valor: 50, unidad: '%', tipo: 'eficiencia', fuente_nota: 'Eficiencia pastoreo' },
  { id_supuesto: 18, grupo: 'Pasturas', concepto: 'Otras pasturas costo por kg MS consumido', valor: 46.68958, unidad: '$/kg MS', tipo: 'costo_unitario', fuente_nota: '((365 * 1535) / 4) / (6000 * 0.50)' },
  { id_supuesto: 19, grupo: 'Materia Seca (% MS)', concepto: 'Maíz grano', valor: 88, unidad: '% MS', tipo: 'porcentaje_ms', fuente_nota: 'Materia seca grano' },
  { id_supuesto: 20, grupo: 'Materia Seca (% MS)', concepto: 'Soja grano', valor: 90, unidad: '% MS', tipo: 'porcentaje_ms', fuente_nota: 'Materia seca grano' },
  { id_supuesto: 21, grupo: 'Materia Seca (% MS)', concepto: 'Rollo de alfalfa', valor: 85, unidad: '% MS', tipo: 'porcentaje_ms', fuente_nota: 'Materia seca fardo/rollo' },
  { id_supuesto: 22, grupo: 'Materia Seca (% MS)', concepto: 'Silaje de maíz', valor: 30, unidad: '% MS', tipo: 'porcentaje_ms', fuente_nota: 'Materia seca forraje picado' },
  { id_supuesto: 23, grupo: 'Proceso Productivo', concepto: 'Peso inicial recría', valor: 140, unidad: 'kg', tipo: 'peso', fuente_nota: 'Peso destete ingreso a recría' },
  { id_supuesto: 24, grupo: 'Proceso Productivo', concepto: 'Peso al pasar a adaptación', valor: 280, unidad: 'kg', tipo: 'peso', fuente_nota: 'Peso fin recría / ingreso corral' },
  { id_supuesto: 25, grupo: 'Proceso Productivo', concepto: 'Peso final engorde', valor: 450, unidad: 'kg', tipo: 'peso', fuente_nota: 'Peso faena terminación' },
  { id_supuesto: 26, grupo: 'Proceso Productivo', concepto: 'Días recría', valor: 180, unidad: 'días', tipo: 'tiempo', fuente_nota: 'Duración ciclo recría pastoril' },
  { id_supuesto: 27, grupo: 'Proceso Productivo', concepto: 'Días adaptación', valor: 50, unidad: 'días', tipo: 'tiempo', fuente_nota: 'Duración transición ruminal' },
  { id_supuesto: 28, grupo: 'Proceso Productivo', concepto: 'Días engorde final', valor: 60, unidad: 'días', tipo: 'tiempo', fuente_nota: 'Duración engorde corral' },
  { id_supuesto: 29, grupo: 'Proceso Productivo', concepto: 'ADPV en corral', valor: 1.545, unidad: 'kg/día', tipo: 'ganancia_diaria', fuente_nota: 'Aumento diario de peso vivo corral' },
  { id_supuesto: 30, grupo: 'Proceso Productivo', concepto: 'Peso al terminar adaptación', valor: 357.25, unidad: 'kg', tipo: 'peso', fuente_nota: '280 + (50 * 1.545)' },
  { id_supuesto: 31, grupo: 'Proceso Productivo', concepto: 'Mortalidad esperada', valor: 1.5, unidad: '%', tipo: 'parametro_sanitario', fuente_nota: 'Tasa de mortandad esperada del rodeo' },
  { id_supuesto: 32, grupo: 'Proceso Productivo', concepto: 'Mortalidad subtotal previsto', valor: 21035.49, unidad: '$/cab', tipo: 'costo_contingencia', fuente_nota: 'Subtotal previsto por animal' },
  { id_supuesto: 33, grupo: 'Cría', concepto: 'Peso vaca', valor: 420, unidad: 'kg', tipo: 'peso', fuente_nota: 'Peso vivo promedio vientre' },
  { id_supuesto: 34, grupo: 'Cría', concepto: 'Consumo vaca % PV MS', valor: 2.2, unidad: '%', tipo: 'consumo', fuente_nota: 'Consumo diario en materia seca (% PV)' },
  { id_supuesto: 35, grupo: 'Cría', concepto: 'Porcentaje destete', valor: 80, unidad: '%', tipo: 'eficiencia_reproductiva', fuente_nota: 'Terneros logrados por vientre entorado' },
  { id_supuesto: 36, grupo: 'Cría', concepto: 'Porcentaje hembras recría', valor: 50, unidad: '%', tipo: 'reposicion', fuente_nota: 'Retención o destino hembras' },
];

export const INITIAL_COSTOS_DIETAS: P_CostosDietas[] = [
  { id_param_dieta: 1, concepto: 'Consumo MS (% PV)', recria: '3.0%', adaptacion: '2.8%', engorde_final: '2.5%', cria_vaca_ano: '2.2%' },
  { id_param_dieta: 2, concepto: 'Peso inicial (kg)', recria: 140, adaptacion: 280, engorde_final: 357.25, cria_vaca_ano: 420 },
  { id_param_dieta: 3, concepto: 'Peso final (kg)', recria: 280, adaptacion: 357.25, engorde_final: 450, cria_vaca_ano: 420 },
  { id_param_dieta: 4, concepto: 'Peso promedio (kg)', recria: 210, adaptacion: 318.625, engorde_final: 403.625, cria_vaca_ano: 420 },
  { id_param_dieta: 5, concepto: 'Días', recria: 180, adaptacion: 50, engorde_final: 60, cria_vaca_ano: 180 },
  { id_param_dieta: 6, concepto: 'Consumo MS/día (kg)', recria: 6.30, adaptacion: 8.9215, engorde_final: 10.0906, cria_vaca_ano: 9.24 },
  { id_param_dieta: 7, concepto: 'Consumo MS total (kg)', recria: 1134, adaptacion: 446.075, engorde_final: 605.4375, cria_vaca_ano: 1663.20 },
  { id_param_dieta: 8, concepto: 'Kg ganados por cabeza', recria: 140, adaptacion: 77.25, engorde_final: 92.75, cria_vaca_ano: 0 },
  { id_param_dieta: 9, concepto: 'Conversión (kg MS/kg ganado)', recria: 8.10, adaptacion: 5.7744, engorde_final: 6.5276, cria_vaca_ano: 0 },
  { id_param_dieta: 10, concepto: 'Maíz propio (% MS)', recria: '10%', adaptacion: '25%', engorde_final: '25%', cria_vaca_ano: '0%' },
  { id_param_dieta: 11, concepto: 'Soja concentrado (% MS)', recria: '5%', adaptacion: '0%', engorde_final: '0%', cria_vaca_ano: '0%' },
  { id_param_dieta: 12, concepto: 'Núcleo mineral (% MS)', recria: '5%', adaptacion: '5%', engorde_final: '5%', cria_vaca_ano: '0%' },
  { id_param_dieta: 13, concepto: 'Silaje de maíz (% MS)', recria: '0%', adaptacion: '25%', engorde_final: '20%', cria_vaca_ano: '0%' },
  { id_param_dieta: 14, concepto: 'Rollos (% MS)', recria: '0%', adaptacion: '0%', engorde_final: '0%', cria_vaca_ano: '10%' },
  { id_param_dieta: 15, concepto: 'Alfalfa pastoreo (% MS)', recria: '65%', adaptacion: '45%', engorde_final: '50%', cria_vaca_ano: '75%' },
  { id_param_dieta: 16, concepto: 'Otras pasturas/rastrojo (% MS)', recria: '15%', adaptacion: '0%', engorde_final: '0%', cria_vaca_ano: '15%' },
];

export const INITIAL_COSTOS_VACUNAS: P_CostosVacunas[] = [
  { id_vacuna: 1, categoria: 'Cría', vacuna_nombre: 'Aftosa (2 aplicaciones)', dosis_anual: 2, precio_dosis: 1200, total_anual: 2400 },
  { id_vacuna: 2, categoria: 'Cría', vacuna_nombre: 'Carbunclo bacteridiano', dosis_anual: 1, precio_dosis: 450, total_anual: 450 },
  { id_vacuna: 3, categoria: 'Cría', vacuna_nombre: 'Complejo Reproductivo (IBR, DVB, Lepto)', dosis_anual: 1, precio_dosis: 1400, total_anual: 1400 },
  { id_vacuna: 4, categoria: 'Cría', vacuna_nombre: 'Clostridial 8 vías polivalente', dosis_anual: 1, precio_dosis: 650, total_anual: 650 },
  { id_vacuna: 5, categoria: 'Cría', vacuna_nombre: 'Antiparasitario y Cobre/Mineral', dosis_anual: 1, precio_dosis: 1100, total_anual: 1100 },
  { id_vacuna: 6, categoria: 'Recría', vacuna_nombre: 'Aftosa (2 aplicaciones)', dosis_anual: 2, precio_dosis: 1200, total_anual: 2400 },
  { id_vacuna: 7, categoria: 'Recría', vacuna_nombre: 'Carbunclo bacteridiano', dosis_anual: 1, precio_dosis: 450, total_anual: 450 },
  { id_vacuna: 8, categoria: 'Recría', vacuna_nombre: 'Clostridial (Mancha, Gangrena, Enterotoxemia)', dosis_anual: 2, precio_dosis: 650, total_anual: 1300 },
  { id_vacuna: 9, categoria: 'Recría', vacuna_nombre: 'Queratoconjuntivitis', dosis_anual: 2, precio_dosis: 800, total_anual: 1600 },
  { id_vacuna: 10, categoria: 'Recría', vacuna_nombre: 'Antiparasitario interno y externo (Ivermectina)', dosis_anual: 2, precio_dosis: 1500, total_anual: 3000 },
  { id_vacuna: 11, categoria: 'Recría', vacuna_nombre: 'Suplemento mineral (Cu / Se / Zn)', dosis_anual: 1, precio_dosis: 1100, total_anual: 1100 },
  { id_vacuna: 12, categoria: 'Adaptación', vacuna_nombre: 'Ingreso a corral: Clostridial refuerzo', dosis_anual: 1, precio_dosis: 700, total_anual: 700 },
  { id_vacuna: 13, categoria: 'Adaptación', vacuna_nombre: 'Ingreso a corral: Neumonías / Respiratorio', dosis_anual: 1, precio_dosis: 1900, total_anual: 1900 },
  { id_vacuna: 14, categoria: 'Adaptación', vacuna_nombre: 'Antiparasitario amplio espectro', dosis_anual: 1, precio_dosis: 1500, total_anual: 1500 },
  { id_vacuna: 15, categoria: 'Engorde Final', vacuna_nombre: 'Sin aplicaciones (período de resguardo)', dosis_anual: 0, precio_dosis: 0, total_anual: 0 },
];

export const INITIAL_COSTOS_DESGLOSE: P_CostosDetalleDesglose[] = [
  { id_desglose: 1, subunidad: 'Cría', ingrediente_concepto: 'Alfalfa pastoreo (75% MS)', kg_ms: 1247.40, kg_tal_cual: 1247.40, precio_unitario: 25.31684, costo_total: 31580.23 },
  { id_desglose: 2, subunidad: 'Cría', ingrediente_concepto: 'Otras pasturas/rastrojo (15% MS)', kg_ms: 249.48, kg_tal_cual: 249.48, precio_unitario: 46.68958, costo_total: 11648.12 },
  { id_desglose: 3, subunidad: 'Cría', ingrediente_concepto: 'Rollos reserva invernal (10% MS)', kg_ms: 166.32, kg_tal_cual: 195.67, precio_unitario: 155.00, costo_total: 30328.93 },
  { id_desglose: 4, subunidad: 'Recría', ingrediente_concepto: 'Alfalfa pastoreo (65% MS)', kg_ms: 737.10, kg_tal_cual: 737.10, precio_unitario: 25.31684, costo_total: 18661.04 },
  { id_desglose: 5, subunidad: 'Recría', ingrediente_concepto: 'Otras pasturas (15% MS)', kg_ms: 170.10, kg_tal_cual: 170.10, precio_unitario: 46.68958, costo_total: 7941.90 },
  { id_desglose: 6, subunidad: 'Recría', ingrediente_concepto: 'Maíz propio (10% MS)', kg_ms: 113.40, kg_tal_cual: 128.86, precio_unitario: 287.09, costo_total: 36995.62 },
  { id_desglose: 7, subunidad: 'Recría', ingrediente_concepto: 'Soja concentrado (5% MS)', kg_ms: 56.70, kg_tal_cual: 63.00, precio_unitario: 560.00, costo_total: 35280.00 },
  { id_desglose: 8, subunidad: 'Recría', ingrediente_concepto: 'Núcleo mineral (5% MS)', kg_ms: 56.70, kg_tal_cual: 56.70, precio_unitario: 1842.00, costo_total: 104441.24 },
  { id_desglose: 9, subunidad: 'Adaptación', ingrediente_concepto: 'Alfalfa pastoreo (45% MS)', kg_ms: 200.73, kg_tal_cual: 200.73, precio_unitario: 25.31684, costo_total: 5081.93 },
  { id_desglose: 10, subunidad: 'Adaptación', ingrediente_concepto: 'Silaje de maíz (25% MS)', kg_ms: 111.52, kg_tal_cual: 371.73, precio_unitario: 42.98, costo_total: 15976.96 },
  { id_desglose: 11, subunidad: 'Adaptación', ingrediente_concepto: 'Maíz propio (25% MS)', kg_ms: 111.52, kg_tal_cual: 126.73, precio_unitario: 287.09, costo_total: 36381.82 },
  { id_desglose: 12, subunidad: 'Adaptación', ingrediente_concepto: 'Núcleo mineral (5% MS)', kg_ms: 22.30, kg_tal_cual: 22.30, precio_unitario: 1842.00, costo_total: 41083.39 },
  { id_desglose: 13, subunidad: 'Engorde Final', ingrediente_concepto: 'Alfalfa pastoreo (50% MS)', kg_ms: 302.72, kg_tal_cual: 302.72, precio_unitario: 25.31684, costo_total: 7663.89 },
  { id_desglose: 14, subunidad: 'Engorde Final', ingrediente_concepto: 'Silaje de maíz (20% MS)', kg_ms: 121.09, kg_tal_cual: 403.63, precio_unitario: 42.98, costo_total: 17347.85 },
  { id_desglose: 15, subunidad: 'Engorde Final', ingrediente_concepto: 'Maíz propio (25% MS)', kg_ms: 151.36, kg_tal_cual: 172.00, precio_unitario: 287.09, costo_total: 49379.48 },
  { id_desglose: 16, subunidad: 'Engorde Final', ingrediente_concepto: 'Núcleo mineral (5% MS)', kg_ms: 30.27, kg_tal_cual: 30.27, precio_unitario: 1842.00, costo_total: 55760.53 },
];

export const INITIAL_COSTOS_TOTALES: R_CostosEstandarTotales[] = [
  { subunidad: 'Cría', costo_alimentacion: 73557.28, costo_vacunas: 6000.00, costo_total_cab: 79557.28, costo_por_kg_ganado: 0.00 },
  { subunidad: 'Recría', costo_alimentacion: 203319.80, costo_vacunas: 9850.00, costo_total_cab: 213169.80, costo_por_kg_ganado: 1522.64 },
  { subunidad: 'Adaptación', costo_alimentacion: 98524.10, costo_vacunas: 4100.00, costo_total_cab: 102624.10, costo_por_kg_ganado: 1328.47 },
  { subunidad: 'Engorde Final', costo_alimentacion: 130151.75, costo_vacunas: 0.00, costo_total_cab: 130151.75, costo_por_kg_ganado: 1403.25 },
  { subunidad: 'Recría a Faena (Acumulado)', costo_alimentacion: 431995.65, costo_vacunas: 13950.00, costo_total_cab: 445945.65, costo_por_kg_ganado: 1438.53 },
];

// Estructura completa de la base de datos en memoria / Google Sheets
export interface DatabaseState {
  D_UnidadNeg: D_UnidadNeg[];
  D_Subunidad: D_Subunidad[];
  D_CategoriaHacienda: D_CategoriaHacienda[];
  D_UM: D_UM[];
  D_Cuenta: D_Cuenta[];
  D_Insumo: D_Insumo[];
  D_Campana: D_Campana[];
  D_HaciendaIndividual: D_HaciendaIndividual[];
  D_TropaLote: D_TropaLote[];
  P_EstandarRinde: P_EstandarRinde[];
  P_DosisTecnica: P_DosisTecnica[];
  F_MovimientosHacienda: F_MovimientosHacienda[];
  F_ConsumosReales: F_ConsumosReales[];
  F_SanidadReal: F_SanidadReal[];
  F_ComprasInsumos: F_ComprasInsumos[];
  F_PesadasControl: F_PesadasControl[];
  F_VentasHacienda: F_VentasHacienda[];
  F_CostosIndirectos: F_CostosIndirectos[];
  S_Usuarios: S_Usuarios[];
  S_Auditoria: S_Auditoria[];
  P_CostosSupuestos: P_CostosSupuestos[];
  P_CostosDietas: P_CostosDietas[];
  P_CostosVacunas: P_CostosVacunas[];
  P_CostosDetalleDesglose: P_CostosDetalleDesglose[];
  R_CostosEstandarTotales: R_CostosEstandarTotales[];
}

const STORAGE_KEY = 'pozo_del_carril_db_v1';

class DatabaseEngine {
  private state: DatabaseState;
  private currentUser: S_Usuarios | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          D_UnidadNeg: parsed.D_UnidadNeg || INITIAL_UNIDADES_NEG,
          D_Subunidad: parsed.D_Subunidad || INITIAL_SUBUNIDADES,
          D_CategoriaHacienda: parsed.D_CategoriaHacienda || INITIAL_CATEGORIAS,
          D_UM: parsed.D_UM || INITIAL_UM,
          D_Cuenta: parsed.D_Cuenta || INITIAL_CUENTAS,
          D_Insumo: parsed.D_Insumo || INITIAL_INSUMOS,
          D_Campana: parsed.D_Campana || [],
          D_HaciendaIndividual: parsed.D_HaciendaIndividual || [],
          D_TropaLote: parsed.D_TropaLote || [],
          P_EstandarRinde: parsed.P_EstandarRinde || [],
          P_DosisTecnica: parsed.P_DosisTecnica || [],
          F_MovimientosHacienda: (parsed.F_MovimientosHacienda && parsed.F_MovimientosHacienda.length > 0)
            ? parsed.F_MovimientosHacienda
            : [...INITIAL_MOVIMIENTOS_EXISTENCIAS],
          F_ConsumosReales: (parsed.F_ConsumosReales && parsed.F_ConsumosReales.length > 0)
            ? parsed.F_ConsumosReales
            : [...INITIAL_CONSUMOS_REALES],
          F_SanidadReal: (parsed.F_SanidadReal && parsed.F_SanidadReal.length > 0)
            ? parsed.F_SanidadReal
            : [...INITIAL_SANIDAD_REAL],
          F_ComprasInsumos: (parsed.F_ComprasInsumos && parsed.F_ComprasInsumos.length > 0)
            ? parsed.F_ComprasInsumos
            : [...INITIAL_COMPRAS_INSUMOS],
          F_PesadasControl: (parsed.F_PesadasControl && parsed.F_PesadasControl.length > 0)
            ? parsed.F_PesadasControl
            : [...INITIAL_PESADAS_CONTROL],
          F_VentasHacienda: (parsed.F_VentasHacienda && parsed.F_VentasHacienda.length > 0)
            ? parsed.F_VentasHacienda
            : [...INITIAL_VENTAS_HACIENDA],
          F_CostosIndirectos: parsed.F_CostosIndirectos || [],
          S_Usuarios: parsed.S_Usuarios || INITIAL_USUARIOS,
          S_Auditoria: parsed.S_Auditoria || [],
          P_CostosSupuestos: (parsed.P_CostosSupuestos && parsed.P_CostosSupuestos.length > 0)
            ? parsed.P_CostosSupuestos
            : [...INITIAL_COSTOS_SUPUESTOS],
          P_CostosDietas: (parsed.P_CostosDietas && parsed.P_CostosDietas.length > 0)
            ? parsed.P_CostosDietas
            : [...INITIAL_COSTOS_DIETAS],
          P_CostosVacunas: (parsed.P_CostosVacunas && parsed.P_CostosVacunas.length > 0)
            ? parsed.P_CostosVacunas
            : [...INITIAL_COSTOS_VACUNAS],
          P_CostosDetalleDesglose: (parsed.P_CostosDetalleDesglose && parsed.P_CostosDetalleDesglose.length > 0)
            ? parsed.P_CostosDetalleDesglose
            : [...INITIAL_COSTOS_DESGLOSE],
          R_CostosEstandarTotales: (parsed.R_CostosEstandarTotales && parsed.R_CostosEstandarTotales.length > 0)
            ? parsed.R_CostosEstandarTotales
            : [...INITIAL_COSTOS_TOTALES],
        };
      }
    } catch (e) {
      console.warn('Error reading stored state:', e);
    }

    return {
      D_UnidadNeg: [...INITIAL_UNIDADES_NEG],
      D_Subunidad: [...INITIAL_SUBUNIDADES],
      D_CategoriaHacienda: [...INITIAL_CATEGORIAS],
      D_UM: [...INITIAL_UM],
      D_Cuenta: [...INITIAL_CUENTAS],
      D_Insumo: [...INITIAL_INSUMOS],
      D_Campana: [],
      D_HaciendaIndividual: [],
      D_TropaLote: [],
      P_EstandarRinde: [],
      P_DosisTecnica: [],
      F_MovimientosHacienda: [...INITIAL_MOVIMIENTOS_EXISTENCIAS],
      F_ConsumosReales: [...INITIAL_CONSUMOS_REALES],
      F_SanidadReal: [...INITIAL_SANIDAD_REAL],
      F_ComprasInsumos: [...INITIAL_COMPRAS_INSUMOS],
      F_PesadasControl: [...INITIAL_PESADAS_CONTROL],
      F_VentasHacienda: [...INITIAL_VENTAS_HACIENDA],
      F_CostosIndirectos: [],
      S_Usuarios: [...INITIAL_USUARIOS],
      S_Auditoria: [],
      P_CostosSupuestos: [...INITIAL_COSTOS_SUPUESTOS],
      P_CostosDietas: [...INITIAL_COSTOS_DIETAS],
      P_CostosVacunas: [...INITIAL_COSTOS_VACUNAS],
      P_CostosDetalleDesglose: [...INITIAL_COSTOS_DESGLOSE],
      R_CostosEstandarTotales: [...INITIAL_COSTOS_TOTALES],
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error persisting state:', e);
    }
    this.notify();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // ==========================================================================
  // CONFIGURACIÓN Y ENLACE GOOGLE SHEETS
  // ==========================================================================

  public getSheetsConfig(): { webhookUrl: string; spreadsheetUrl: string; spreadsheetId: string; lastSync?: string } {
    try {
      const stored = localStorage.getItem('pozo_del_carril_sheets_cfg');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { webhookUrl: '', spreadsheetUrl: '', spreadsheetId: '' };
  }

  public saveSheetsConfig(cfg: { webhookUrl: string; spreadsheetUrl: string; spreadsheetId: string; lastSync?: string }) {
    try {
      localStorage.setItem('pozo_del_carril_sheets_cfg', JSON.stringify(cfg));
      // Notify backend if available
      fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      }).catch(() => {});
    } catch (e) {}
    this.notify();
  }

  public syncUsersFromGoogleSheets(newUsers: S_Usuarios[]) {
    if (!Array.isArray(newUsers) || newUsers.length === 0) return;
    
    // Normalizar usuarios asegurando tipos correctos, estado activo y preservación de contraseñas
    const normalizedUsers: S_Usuarios[] = newUsers.map((u, idx) => {
      const existing = this.state.S_Usuarios.find(
        x => x.usuario.toLowerCase() === String(u.usuario || '').trim().toLowerCase()
      );
      const incomingPass = String(u.contrasena ?? '').trim();
      const finalPass = incomingPass || (existing ? existing.contrasena : '');

      let isActivo = true;
      if (u.activo !== undefined && u.activo !== null && String(u.activo).trim() !== '') {
        const s = String(u.activo).trim().toUpperCase();
        if (s === 'FALSO' || s === 'FALSE' || s === '0' || s === 'NO' || s === 'INACTIVO' || s === 'BAJA') {
          isActivo = false;
        } else {
          isActivo = true;
        }
      }

      return {
        id_usuario: Number(u.id_usuario) || (idx + 1),
        usuario: String(u.usuario || '').trim(),
        contrasena: finalPass,
        nombre: String(u.nombre || u.usuario || '').trim(),
        rol: (u.rol || (existing ? existing.rol : 'Operador')) as RolUsuario,
        activo: isActivo,
      };
    }).filter(u => u.usuario);

    // Combinar con los existentes sin pisar contraseñas
    const map = new Map<string, S_Usuarios>();
    this.state.S_Usuarios.forEach(u => map.set(u.usuario.toLowerCase(), { ...u }));
    normalizedUsers.forEach(u => {
      const prev = map.get(u.usuario.toLowerCase());
      map.set(u.usuario.toLowerCase(), {
        ...prev,
        ...u,
        contrasena: u.contrasena || (prev ? prev.contrasena : ''),
      });
    });

    this.state.S_Usuarios = Array.from(map.values());
    this.persist();
    this.logAuditoria('S_Usuarios', 'SYNC', 'MODIFICACION', `Sincronización de ${normalizedUsers.length} usuarios desde Google Sheets.`);
  }

  // ==========================================================================
  // FILTRADO PARAMÉTRICO POR UNIDAD DE NEGOCIO (id_unidad_neg)
  // Multi-Especie: 1 = Bovinos, 2 = Porcinos, 3 = Ovinos, etc.
  // ==========================================================================

  public getUnidadesNeg(): D_UnidadNeg[] {
    return this.state.D_UnidadNeg.filter(u => u.activo !== false);
  }

  public getSubunidadesByUnidadNeg(id_unidad_neg: number): D_Subunidad[] {
    return this.state.D_Subunidad.filter(
      s => Number(s.id_unidad_neg) === Number(id_unidad_neg) && s.activo !== false
    );
  }

  public getCategoriasByUnidadNeg(id_unidad_neg: number): D_CategoriaHacienda[] {
    return this.state.D_CategoriaHacienda.filter(
      c => Number(c.id_unidad_neg) === Number(id_unidad_neg) && c.activo !== false
    );
  }

  // ==========================================================================
  // CONSUMO API: doGet de las 20 tablas completas desde Google Apps Script
  // ==========================================================================

  public async fetchAndSyncAllTables(customWebhookUrl?: string): Promise<{
    success: boolean;
    message: string;
    tablesCount?: number;
    rowCounts?: Record<string, number>;
    source?: string;
    error?: string;
  }> {
    const cfg = this.getSheetsConfig();
    const effectiveWebhook = (customWebhookUrl || cfg.webhookUrl || '').trim();

    try {
      let rawTables: Record<string, any[]> | null = null;
      let source = 'Backend Proxy /api/sheets/fetch-all';

      // 1. Intentar primero a través del backend Express
      try {
        const beRes = await fetch('/api/sheets/fetch-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl: effectiveWebhook }),
        });
        if (beRes.ok) {
          const json = await beRes.json();
          if (json.success && json.tables) {
            rawTables = json.tables;
            source = json.source || source;
          }
        }
      } catch (beErr) {
        console.warn('[DB] Falló consulta backend proxy, intentando fetch directo:', beErr);
      }

      // 2. Si falló backend pero hay webhook directo, intentar fetch directo
      if (!rawTables && effectiveWebhook) {
        try {
          const directRes = await fetch(effectiveWebhook, {
            method: 'GET',
            redirect: 'follow',
            headers: { Accept: 'application/json' },
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson && typeof directJson === 'object' && !Array.isArray(directJson)) {
              rawTables = directJson;
              source = 'Direct Apps Script Webhook (doGet)';
            }
          }
        } catch (dirErr) {
          console.warn('[DB] Falló fetch directo:', dirErr);
        }
      }

      if (!rawTables) {
        return {
          success: false,
          message: '',
          error: 'No se pudieron descargar las tablas desde Google Sheets. Verifique la URL de la Web App de Apps Script.',
        };
      }

      // Normalizar e impactar en this.state cada una de las 20 tablas
      const rowCounts: Record<string, number> = {};

      const parseBool = (val: any, defaultVal = true): boolean => {
        if (val === undefined || val === null || val === '') return defaultVal;
        const s = String(val).trim().toUpperCase();
        return !(s === 'FALSO' || s === 'FALSE' || s === '0' || s === 'NO' || s === 'INACTIVO' || s === 'BAJA');
      };

      // D_UnidadNeg
      if (Array.isArray(rawTables.D_UnidadNeg) && rawTables.D_UnidadNeg.length > 0) {
        this.state.D_UnidadNeg = rawTables.D_UnidadNeg.map((r, i) => ({
          id_unidad_neg: Number(r.id_unidad_neg) || (i + 1),
          nombre: String(r.nombre || '').trim(),
          descripcion: String(r.descripcion || '').trim(),
          activo: parseBool(r.activo),
        })).filter(u => u.nombre);
        rowCounts.D_UnidadNeg = this.state.D_UnidadNeg.length;
      }

      // D_Subunidad
      if (Array.isArray(rawTables.D_Subunidad) && rawTables.D_Subunidad.length > 0) {
        this.state.D_Subunidad = rawTables.D_Subunidad.map((r, i) => ({
          id_subunidad: Number(r.id_subunidad) || (i + 1),
          id_unidad_neg: Number(r.id_unidad_neg) || 1,
          nombre: String(r.nombre || '').trim(),
          rango_peso_referencia: String(r.rango_peso_referencia || '').trim(),
          descripcion: String(r.descripcion || '').trim(),
          activo: parseBool(r.activo),
        })).filter(s => s.nombre);
        rowCounts.D_Subunidad = this.state.D_Subunidad.length;
      }

      // D_CategoriaHacienda
      if (Array.isArray(rawTables.D_CategoriaHacienda) && rawTables.D_CategoriaHacienda.length > 0) {
        this.state.D_CategoriaHacienda = rawTables.D_CategoriaHacienda.map((r, i) => ({
          id_categoria: Number(r.id_categoria) || (i + 1),
          id_unidad_neg: Number(r.id_unidad_neg) || 1,
          nombre: String(r.nombre || '').trim(),
          clasificacion_contable: (String(r.clasificacion_contable || 'Bienes de Cambio').trim()) as any,
          sexo_esperado: (r.sexo_esperado || 'Mixto') as any,
          activo: parseBool(r.activo),
        })).filter(c => c.nombre);
        rowCounts.D_CategoriaHacienda = this.state.D_CategoriaHacienda.length;
      }

      // D_UM
      if (Array.isArray(rawTables.D_UM) && rawTables.D_UM.length > 0) {
        this.state.D_UM = rawTables.D_UM.map((r, i) => ({
          id_um: Number(r.id_um) || (i + 1),
          codigo: String(r.codigo || '').trim(),
          nombre: String(r.nombre || '').trim(),
        })).filter(u => u.codigo);
        rowCounts.D_UM = this.state.D_UM.length;
      }

      // D_Cuenta
      if (Array.isArray(rawTables.D_Cuenta) && rawTables.D_Cuenta.length > 0) {
        this.state.D_Cuenta = rawTables.D_Cuenta.map(r => ({
          id_cuenta: String(r.id_cuenta || r.codigo || '').trim(),
          codigo: String(r.codigo || r.id_cuenta || '').trim(),
          nombre: String(r.nombre || '').trim(),
          grupo: (String(r.grupo || '5.1 Costos Directos').trim()) as any,
          activo: parseBool(r.activo),
        })).filter(c => c.id_cuenta);
        rowCounts.D_Cuenta = this.state.D_Cuenta.length;
      }

      // D_Insumo
      if (Array.isArray(rawTables.D_Insumo) && rawTables.D_Insumo.length > 0) {
        this.state.D_Insumo = rawTables.D_Insumo.map((r, i) => ({
          id_insumo: Number(r.id_insumo) || (i + 1),
          codigo: String(r.codigo || '').trim(),
          nombre: String(r.nombre || '').trim(),
          tipo: (r.tipo || 'Alimento') as any,
          id_um_consumo: Number(r.id_um_consumo) || 1,
          id_cuenta_costo: String(r.id_cuenta_costo || '5.1.01').trim(),
          stock_minimo_alerta: Number(r.stock_minimo_alerta) || 0,
          activo: parseBool(r.activo),
        })).filter(ins => ins.nombre);
        rowCounts.D_Insumo = this.state.D_Insumo.length;
      }

      // D_Campana
      if (Array.isArray(rawTables.D_Campana) && rawTables.D_Campana.length > 0) {
        this.state.D_Campana = rawTables.D_Campana.map((r, i) => ({
          id_campana: Number(r.id_campana) || (i + 1),
          nombre: String(r.nombre || '').trim(),
          fecha_inicio: String(r.fecha_inicio || '').trim(),
          fecha_fin: String(r.fecha_fin || '').trim(),
          activa: parseBool(r.activa),
        })).filter(cp => cp.nombre);
        rowCounts.D_Campana = this.state.D_Campana.length;
      }

      // D_HaciendaIndividual
      if (Array.isArray(rawTables.D_HaciendaIndividual) && rawTables.D_HaciendaIndividual.length > 0) {
        this.state.D_HaciendaIndividual = rawTables.D_HaciendaIndividual.map((r, i) => ({
          id_hacienda: Number(r.id_hacienda) || (i + 1),
          caravana_visual: String(r.caravana_visual || '').trim(),
          caravana_rfid: String(r.caravana_rfid || '').trim(),
          sexo: (r.sexo || 'Macho') as any,
          fecha_nacimiento: String(r.fecha_nacimiento || '').trim(),
          peso_al_nacer_kg: Number(r.peso_al_nacer_kg) || 0,
          id_padre: r.id_padre ? Number(r.id_padre) : null,
          id_madre: r.id_madre ? Number(r.id_madre) : null,
          raza: String(r.raza || 'Angus').trim(),
          id_categoria_actual: Number(r.id_categoria_actual) || 1,
          id_subunidad_actual: Number(r.id_subunidad_actual) || 1,
          estado_actual: (r.estado_actual || 'Activo') as any,
          observaciones: String(r.observaciones || '').trim(),
        })).filter(h => h.caravana_visual);
        rowCounts.D_HaciendaIndividual = this.state.D_HaciendaIndividual.length;
      }

      // D_TropaLote
      if (Array.isArray(rawTables.D_TropaLote) && rawTables.D_TropaLote.length > 0) {
        this.state.D_TropaLote = rawTables.D_TropaLote.map((r, i) => ({
          id_tropa: Number(r.id_tropa) || (i + 1),
          codigo_tropa: String(r.codigo_tropa || '').trim(),
          nombre: String(r.nombre || '').trim(),
          id_subunidad: Number(r.id_subunidad) || 1,
          cantidad_cabezas_inicial: Number(r.cantidad_cabezas_inicial) || 0,
          fecha_ingreso: String(r.fecha_ingreso || '').trim(),
          estado: (r.estado || 'En Curso') as any,
          observaciones: String(r.observaciones || '').trim(),
        })).filter(t => t.codigo_tropa);
        rowCounts.D_TropaLote = this.state.D_TropaLote.length;
      }

      // P_EstandarRinde
      if (Array.isArray(rawTables.P_EstandarRinde) && rawTables.P_EstandarRinde.length > 0) {
        this.state.P_EstandarRinde = rawTables.P_EstandarRinde.map((r, i) => ({
          id_param_rinde: Number(r.id_param_rinde) || (i + 1),
          id_campana: Number(r.id_campana) || 1,
          id_subunidad: Number(r.id_subunidad) || 1,
          adpv_estandar_kg_dia: Number(r.adpv_estandar_kg_dia) || 0,
          dias_permanencia_teoricos: Number(r.dias_permanencia_teoricos) || 0,
          kg_ganados_proyectados_cab: Number(r.kg_ganados_proyectados_cab) || 0,
        }));
        rowCounts.P_EstandarRinde = this.state.P_EstandarRinde.length;
      }

      // P_DosisTecnica
      if (Array.isArray(rawTables.P_DosisTecnica) && rawTables.P_DosisTecnica.length > 0) {
        this.state.P_DosisTecnica = rawTables.P_DosisTecnica.map((r, i) => ({
          id_dosis_tecnica: Number(r.id_dosis_tecnica) || (i + 1),
          id_campana: Number(r.id_campana) || 1,
          id_subunidad: Number(r.id_subunidad) || 1,
          id_categoria: Number(r.id_categoria) || 1,
          id_insumo: Number(r.id_insumo) || 1,
          dosis_teorica_cab_dia: Number(r.dosis_teorica_cab_dia) || 0,
          dosis_es_diaria: parseBool(r.dosis_es_diaria),
          observaciones_protocolo: String(r.observaciones_protocolo || '').trim(),
        }));
        rowCounts.P_DosisTecnica = this.state.P_DosisTecnica.length;
      }

      // F_MovimientosHacienda
      if (Array.isArray(rawTables.F_MovimientosHacienda) && rawTables.F_MovimientosHacienda.length > 0) {
        this.state.F_MovimientosHacienda = rawTables.F_MovimientosHacienda.map((r, i) => ({
          id_movimiento: Number(r.id_movimiento) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          tipo_movimiento: (r.tipo_movimiento || 'Movimiento Interno') as any,
          id_hacienda: r.id_hacienda ? Number(r.id_hacienda) : null,
          id_tropa: r.id_tropa ? Number(r.id_tropa) : null,
          cantidad_cabezas: Number(r.cantidad_cabezas) || 1,
          id_subunidad_origen: r.id_subunidad_origen ? Number(r.id_subunidad_origen) : null,
          id_subunidad_destino: r.id_subunidad_destino ? Number(r.id_subunidad_destino) : null,
          id_categoria_origen: Number(r.id_categoria_origen) || 1,
          id_categoria_destino: Number(r.id_categoria_destino) || 1,
          peso_total_kg: Number(r.peso_total_kg) || 0,
          peso_promedio_kg: Number(r.peso_promedio_kg) || 0,
          remito_guia: String(r.remito_guia || '').trim(),
          motivo_observaciones: String(r.motivo_observaciones || '').trim(),
        })).filter(m => m.fecha);
        rowCounts.F_MovimientosHacienda = this.state.F_MovimientosHacienda.length;
      }

      // F_ConsumosReales
      if (Array.isArray(rawTables.F_ConsumosReales) && rawTables.F_ConsumosReales.length > 0) {
        this.state.F_ConsumosReales = rawTables.F_ConsumosReales.map((r, i) => ({
          id_consumo: Number(r.id_consumo) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          id_subunidad: Number(r.id_subunidad) || 1,
          id_tropa: r.id_tropa ? Number(r.id_tropa) : null,
          id_insumo: Number(r.id_insumo) || 1,
          cantidad_fisica_real: Number(r.cantidad_fisica_real) || 0,
          comprobante_remito: String(r.comprobante_remito || '').trim(),
          observaciones: String(r.observaciones || '').trim(),
        })).filter(c => c.fecha);
        rowCounts.F_ConsumosReales = this.state.F_ConsumosReales.length;
      }

      // F_SanidadReal
      if (Array.isArray(rawTables.F_SanidadReal) && rawTables.F_SanidadReal.length > 0) {
        this.state.F_SanidadReal = rawTables.F_SanidadReal.map((r, i) => ({
          id_sanidad: Number(r.id_sanidad) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          id_subunidad: Number(r.id_subunidad) || 1,
          id_tropa: r.id_tropa ? Number(r.id_tropa) : null,
          id_hacienda: r.id_hacienda ? Number(r.id_hacienda) : null,
          id_insumo: Number(r.id_insumo) || 1,
          dosis_real_total: Number(r.dosis_real_total) || 0,
          acta_vacunacion_senasa: String(r.acta_vacunacion_senasa || '').trim(),
          profesional_veterinario: String(r.profesional_veterinario || '').trim(),
          costo_profesional_honorarios: Number(r.costo_profesional_honorarios) || 0,
          observaciones: String(r.observaciones || '').trim(),
        })).filter(s => s.fecha);
        rowCounts.F_SanidadReal = this.state.F_SanidadReal.length;
      }

      // F_ComprasInsumos
      if (Array.isArray(rawTables.F_ComprasInsumos) && rawTables.F_ComprasInsumos.length > 0) {
        this.state.F_ComprasInsumos = rawTables.F_ComprasInsumos.map((r, i) => ({
          id_compra: Number(r.id_compra) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          id_insumo: Number(r.id_insumo) || 1,
          cantidad: Number(r.cantidad) || 0,
          precio_unitario_real: Number(r.precio_unitario_real) || 0,
          importe_total: Number(r.importe_total) || 0,
          tipo_origen: (r.tipo_origen || 'Compra Externa a Proveedor') as any,
          numero_comprobante: String(r.numero_comprobante || '').trim(),
          proveedor_o_unidad_origen: String(r.proveedor_o_unidad_origen || '').trim(),
        })).filter(cp => cp.fecha);
        rowCounts.F_ComprasInsumos = this.state.F_ComprasInsumos.length;
      }

      // F_PesadasControl
      if (Array.isArray(rawTables.F_PesadasControl) && rawTables.F_PesadasControl.length > 0) {
        this.state.F_PesadasControl = rawTables.F_PesadasControl.map((r, i) => ({
          id_pesada: Number(r.id_pesada) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          id_subunidad: Number(r.id_subunidad) || 1,
          id_tropa: r.id_tropa ? Number(r.id_tropa) : null,
          id_hacienda: r.id_hacienda ? Number(r.id_hacienda) : null,
          peso_vivo_kg: Number(r.peso_vivo_kg) || 0,
          cantidad_cabezas: Number(r.cantidad_cabezas) || 1,
          peso_promedio_kg: Number(r.peso_promedio_kg) || 0,
          dias_desde_pesada_anterior: Number(r.dias_desde_pesada_anterior) || 0,
          adpv_registrado_kg_dia: Number(r.adpv_registrado_kg_dia) || 0,
          observaciones: String(r.observaciones || '').trim(),
        })).filter(p => p.fecha);
        rowCounts.F_PesadasControl = this.state.F_PesadasControl.length;
      }

      // F_VentasHacienda
      if (Array.isArray(rawTables.F_VentasHacienda) && rawTables.F_VentasHacienda.length > 0) {
        this.state.F_VentasHacienda = rawTables.F_VentasHacienda.map((r, i) => ({
          id_venta: Number(r.id_venta) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          id_subunidad: Number(r.id_subunidad) || 1,
          id_tropa: r.id_tropa ? Number(r.id_tropa) : null,
          id_categoria: Number(r.id_categoria) || 1,
          id_cuenta_ingreso: String(r.id_cuenta_ingreso || '4.1.01').trim(),
          cabezas: Number(r.cabezas) || 1,
          kilos_vivos_totales: Number(r.kilos_vivos_totales) || 0,
          precio_por_kg_real: Number(r.precio_por_kg_real) || 0,
          ingreso_bruto_venta: Number(r.ingreso_bruto_venta) || 0,
          comision_consignatario: Number(r.comision_consignatario) || 0,
          flete_camion_jaula: Number(r.flete_camion_jaula) || 0,
          derechos_pista_pesaje: Number(r.derechos_pista_pesaje) || 0,
          aranceles_senasa_dte: Number(r.aranceles_senasa_dte) || 0,
          otras_tasas_feriales: Number(r.otras_tasas_feriales) || 0,
          total_gastos_comerciales: Number(r.total_gastos_comerciales) || 0,
          venta_neta: Number(r.venta_neta) || 0,
          alicuota_iva: Number(r.alicuota_iva) || 0.105,
          iva_liquidado: Number(r.iva_liquidado) || 0,
          retenciones_fiscales: Number(r.retenciones_fiscales) || 0,
          neto_a_cobrar: Number(r.neto_a_cobrar) || 0,
          numero_liquidacion_dte: String(r.numero_liquidacion_dte || '').trim(),
          consignatario_comprador: String(r.consignatario_comprador || '').trim(),
        })).filter(v => v.fecha);
        rowCounts.F_VentasHacienda = this.state.F_VentasHacienda.length;
      }

      // F_CostosIndirectos
      if (Array.isArray(rawTables.F_CostosIndirectos) && rawTables.F_CostosIndirectos.length > 0) {
        this.state.F_CostosIndirectos = rawTables.F_CostosIndirectos.map((r, i) => ({
          id_costo_indirecto: Number(r.id_costo_indirecto) || (i + 1),
          fecha: String(r.fecha || '').trim(),
          concepto: String(r.concepto || '').trim(),
          id_cuenta_costo: String(r.id_cuenta_costo || '5.5').trim(),
          importe_total_erogacion: Number(r.importe_total_erogacion) || 0,
          id_subunidad: Number(r.id_subunidad) || 1,
          coeficiente_prorrateo: Number(r.coeficiente_prorrateo) || 1,
          importe_asignado_subunidad: Number(r.importe_asignado_subunidad) || 0,
          comprobante_factura: String(r.comprobante_factura || '').trim(),
        })).filter(ci => ci.fecha);
        rowCounts.F_CostosIndirectos = this.state.F_CostosIndirectos.length;
      }

      // S_Usuarios
      if (Array.isArray(rawTables.S_Usuarios) && rawTables.S_Usuarios.length > 0) {
        this.syncUsersFromGoogleSheets(rawTables.S_Usuarios);
        rowCounts.S_Usuarios = this.state.S_Usuarios.length;
      }

      // Cotizaciones dinámicas de mercado: Cañuelas_Claude, Invernada_Claude, Cría_Claude
      const canuelasData = rawTables['Cañuelas_Claude'] || rawTables['Canuelas_Claude'];
      const invernadaData = rawTables['Invernada_Claude'];
      const criaData = rawTables['Cría_Claude'] || rawTables['Cria_Claude'];

      if (canuelasData || invernadaData || criaData) {
        cotizacionesService.updateFromSheets({
          canuelas: canuelasData,
          invernada: invernadaData,
          cria: criaData,
          source,
        });
        if (canuelasData) rowCounts['Cañuelas_Claude'] = canuelasData.length;
        if (invernadaData) rowCounts['Invernada_Claude'] = invernadaData.length;
        if (criaData) rowCounts['Cría_Claude'] = criaData.length;
      }

      // Costos Estándar Bovinos: P_CostosSupuestos
      if (Array.isArray(rawTables.P_CostosSupuestos) && rawTables.P_CostosSupuestos.length > 0) {
        this.state.P_CostosSupuestos = rawTables.P_CostosSupuestos.map((r, i) => ({
          id_supuesto: Number(r.id_supuesto) || (i + 1),
          grupo: String(r.grupo || '').trim(),
          concepto: String(r.concepto || '').trim(),
          valor: Number(r.valor) || 0,
          unidad: String(r.unidad || '').trim(),
          tipo: String(r.tipo || '').trim(),
          fuente_nota: String(r.fuente_nota || '').trim(),
        })).filter(s => s.concepto);
        rowCounts.P_CostosSupuestos = this.state.P_CostosSupuestos.length;
      }

      // P_CostosDietas
      if (Array.isArray(rawTables.P_CostosDietas) && rawTables.P_CostosDietas.length > 0) {
        this.state.P_CostosDietas = rawTables.P_CostosDietas.map((r, i) => ({
          id_param_dieta: Number(r.id_param_dieta) || (i + 1),
          concepto: String(r.concepto || '').trim(),
          recria: r.recria !== undefined ? r.recria : '',
          adaptacion: r.adaptacion !== undefined ? r.adaptacion : '',
          engorde_final: r.engorde_final !== undefined ? r.engorde_final : '',
          cria_vaca_ano: r.cria_vaca_ano !== undefined ? r.cria_vaca_ano : '',
        })).filter(d => d.concepto);
        rowCounts.P_CostosDietas = this.state.P_CostosDietas.length;
      }

      // P_CostosVacunas
      if (Array.isArray(rawTables.P_CostosVacunas) && rawTables.P_CostosVacunas.length > 0) {
        this.state.P_CostosVacunas = rawTables.P_CostosVacunas.map((r, i) => ({
          id_vacuna: Number(r.id_vacuna) || (i + 1),
          categoria: String(r.categoria || '').trim(),
          vacuna_nombre: String(r.vacuna_nombre || '').trim(),
          dosis_anual: Number(r.dosis_anual) || 0,
          precio_dosis: Number(r.precio_dosis) || 0,
          total_anual: Number(r.total_anual) || 0,
        })).filter(v => v.vacuna_nombre);
        rowCounts.P_CostosVacunas = this.state.P_CostosVacunas.length;
      }

      // P_CostosDetalleDesglose
      if (Array.isArray(rawTables.P_CostosDetalleDesglose) && rawTables.P_CostosDetalleDesglose.length > 0) {
        this.state.P_CostosDetalleDesglose = rawTables.P_CostosDetalleDesglose.map((r, i) => ({
          id_desglose: Number(r.id_desglose) || (i + 1),
          subunidad: String(r.subunidad || '').trim(),
          ingrediente_concepto: String(r.ingrediente_concepto || '').trim(),
          kg_ms: Number(r.kg_ms) || 0,
          kg_tal_cual: Number(r.kg_tal_cual) || 0,
          precio_unitario: Number(r.precio_unitario) || 0,
          costo_total: Number(r.costo_total) || 0,
        })).filter(d => d.ingrediente_concepto);
        rowCounts.P_CostosDetalleDesglose = this.state.P_CostosDetalleDesglose.length;
      }

      // R_CostosEstandarTotales
      if (Array.isArray(rawTables.R_CostosEstandarTotales) && rawTables.R_CostosEstandarTotales.length > 0) {
        this.state.R_CostosEstandarTotales = rawTables.R_CostosEstandarTotales.map((r) => ({
          subunidad: String(r.subunidad || '').trim(),
          costo_alimentacion: Number(r.costo_alimentacion) || 0,
          costo_vacunas: Number(r.costo_vacunas) || 0,
          costo_total_cab: Number(r.costo_total_cab) || 0,
          costo_por_kg_ganado: Number(r.costo_por_kg_ganado) || 0,
        })).filter(t => t.subunidad);
        rowCounts.R_CostosEstandarTotales = this.state.R_CostosEstandarTotales.length;
      }

      this.persist();

      if (effectiveWebhook) {
        this.saveSheetsConfig({
          ...cfg,
          webhookUrl: effectiveWebhook,
          lastSync: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Se sincronizaron exitosamente ${Object.keys(rowCounts).length} tablas desde Google Sheets (${source}).`,
        tablesCount: Object.keys(rowCounts).length,
        rowCounts,
        source,
      };
    } catch (err: any) {
      console.error('[DB] Error en fetchAndSyncAllTables:', err);
      return {
        success: false,
        message: '',
        error: `Error al procesar tablas de Google Sheets: ${err.message}`,
      };
    }
  }



  // ==========================================================================
  // FORMULARIOS DE REGISTRO: POST / APPEND MAPEO DINÁMICO
  // ==========================================================================

  public async postAppendToSheets(
    sheetName: string,
    recordData: Record<string, any>
  ): Promise<{ success: boolean; googleSheetsAppended?: boolean; error?: string; message?: string }> {
    const cfg = this.getSheetsConfig();
    const webhookUrl = (cfg.webhookUrl || '').trim();

    try {
      // 1. Intentar a través del backend Express
      const res = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName,
          data: recordData,
          webhookUrl,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json;
      }

      // 2. Si no hay backend pero hay webhook directo, intentar directo
      if (webhookUrl) {
        const directRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append',
            sheetName,
            data: recordData,
          }),
        });
        if (directRes.ok) {
          return { success: true, googleSheetsAppended: true, message: `Impactado en Google Sheets (${sheetName})` };
        }
      }

      return { success: true, googleSheetsAppended: false, message: 'Guardado localmente en ERP.' };
    } catch (err: any) {
      console.warn(`[DB] Falló envío append a Google Sheets para ${sheetName}:`, err);
      return { success: true, googleSheetsAppended: false, error: err.message };
    }
  }

  // ==========================================================================
  // AUTENTICACIÓN Y SEGURIDAD (Backend Auth Simulation & Live API)
  // ==========================================================================

  public async loginAsync(usuario: string, contrasena: string): Promise<{ success: boolean; error?: string; user?: Omit<S_Usuarios, 'contrasena'> }> {
    const cleanUser = String(usuario || '').trim();
    const cleanPass = String(contrasena || '').trim();
    const cfg = this.getSheetsConfig();

    // 1. Intentar validar mediante backend Express que se conecta directo a Google Sheets
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: cleanUser,
          contrasena: cleanPass,
          webhookUrl: cfg.webhookUrl,
          spreadsheetUrl: cfg.spreadsheetUrl,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.user) {
        // Autenticación exitosa en el backend
        this.currentUser = { ...data.user, contrasena: '' };
        // Si el backend sincronizó usuarios, actualizar el estado local
        const userExists = this.state.S_Usuarios.find(u => u.usuario.toLowerCase() === cleanUser.toLowerCase());
        if (!userExists) {
          this.state.S_Usuarios.push({
            id_usuario: data.user.id_usuario || this.state.S_Usuarios.length + 1,
            usuario: data.user.usuario,
            contrasena: cleanPass,
            nombre: data.user.nombre,
            rol: data.user.rol,
            activo: data.user.activo,
          });
          this.persist();
        }
        this.logAuditoria('S_Usuarios', data.user.id_usuario, 'MODIFICACION', `Acceso autenticado en backend desde Google Sheets (${cleanUser})`);
        return { success: true, user: data.user };
      } else if (response.status === 401 || response.status === 403) {
        // Error explícito de contraseña o inactividad proveniente del backend
        return { success: false, error: data.error };
      }
    } catch (netErr) {
      console.warn('[AUTH] Backend fetch failed, falling back to local database engine:', netErr);
    }

    // 2. Fallback local en memoria
    return this.login(cleanUser, cleanPass);
  }

  public login(usuario: string, contrasena: string): { success: boolean; error?: string; user?: Omit<S_Usuarios, 'contrasena'> } {
    const cleanInputUser = String(usuario || '').trim().toLowerCase();
    const cleanInputPass = String(contrasena || '').trim();

    const user = this.state.S_Usuarios.find(
      u => String(u.usuario || '').trim().toLowerCase() === cleanInputUser
    );

    if (!user) {
      return {
        success: false,
        error: `El usuario '${usuario}' no existe en la tabla S_Usuarios de Google Sheets. Asegúrese de haber sincronizado la planilla o revise el nombre de usuario.`,
      };
    }

    const storedPass = String(user.contrasena ?? '').trim();
    if (storedPass !== cleanInputPass) {
      return { success: false, error: 'Contraseña incorrecta.' };
    }

    const rawActive = (user as any).activo;
    let isActivo = true;
    if (rawActive !== undefined && rawActive !== null && String(rawActive).trim() !== '') {
      const valUpper = String(rawActive).trim().toUpperCase();
      if (
        valUpper === 'FALSO' ||
        valUpper === 'FALSE' ||
        valUpper === '0' ||
        valUpper === 'NO' ||
        valUpper === 'INACTIVO' ||
        valUpper === 'INACTIVA' ||
        valUpper === 'DESACTIVADO' ||
        valUpper === 'BAJA'
      ) {
        isActivo = false;
      } else {
        isActivo = true;
      }
    }

    if (!isActivo) {
      return {
        success: false,
        error: `La cuenta de '${user.usuario}' se encuentra inactiva en Google Sheets (columna activo = FALSO/NO). Contacte al Administrador.`,
      };
    }

    this.currentUser = { ...user, contrasena: '' };
    const { contrasena: _, ...safeUser } = user;
    this.logAuditoria('S_Usuarios', user.id_usuario, 'MODIFICACION', 'Acceso al sistema (Login)');
    return { success: true, user: safeUser };
  }

  public logout() {
    if (this.currentUser) {
      this.logAuditoria('S_Usuarios', this.currentUser.id_usuario, 'MODIFICACION', 'Cierre de sesión (Logout)');
    }
    this.currentUser = null;
  }

  public getCurrentUser(): Omit<S_Usuarios, 'contrasena'> | null {
    if (!this.currentUser) return null;
    const { contrasena: _, ...safeUser } = this.currentUser;
    return safeUser;
  }

  public getState(): Readonly<DatabaseState> {
    return this.state;
  }

  // ==========================================================================
  // COSTOS ESTÁNDAR (P_CostosSupuestos, Dietas, Vacunas, Desglose, Totales)
  // ==========================================================================

  public getCostosSupuestos(): P_CostosSupuestos[] {
    return this.state.P_CostosSupuestos;
  }

  public getCostosDietas(): P_CostosDietas[] {
    return this.state.P_CostosDietas;
  }

  public getCostosVacunas(): P_CostosVacunas[] {
    return this.state.P_CostosVacunas;
  }

  public getCostosDetalleDesglose(): P_CostosDetalleDesglose[] {
    return this.state.P_CostosDetalleDesglose;
  }

  public getCostosEstandarTotales(): R_CostosEstandarTotales[] {
    return this.state.R_CostosEstandarTotales;
  }

  public updateCostosSupuesto(id: number, nuevoValor: number): void {
    const item = this.state.P_CostosSupuestos.find(s => s.id_supuesto === id);
    if (!item) return;
    const oldVal = item.valor;
    item.valor = nuevoValor;
    this.logAuditoria('P_CostosSupuestos', id, 'MODIFICACION', `Actualización supuesto '${item.concepto}': ${oldVal} -> ${nuevoValor}`);
    this.recalcularCostosEstandar();
    this.persist();
  }

  public recalcularCostosEstandar(): void {
    const getVal = (conc: string, fallback: number) => {
      const found = this.state.P_CostosSupuestos.find(s => s.concepto.toLowerCase().includes(conc.toLowerCase()));
      return found ? found.valor : fallback;
    };

    const dolarBNA = getVal('dólar', 1535);
    const maizTalCual = getVal('maíz propio', 287.09);
    const sojaTalCual = getVal('soja grano', 560);
    const rolloTalCual = getVal('rollo', 155);
    const silajeUS = getVal('silaje de maíz (us$', 28);
    const silajeVerdeKg = (silajeUS * dolarBNA) / 1000;
    
    const silajeKgItem = this.state.P_CostosSupuestos.find(s => s.concepto.includes('$/kg verde'));
    if (silajeKgItem) silajeKgItem.valor = Number(silajeVerdeKg.toFixed(2));

    const nucleoUS = getVal('núcleo mineral con monensina (us$', 1.2);
    const nucleoKg = nucleoUS * dolarBNA;
    const nucleoKgItem = this.state.P_CostosSupuestos.find(s => s.concepto === 'Núcleo mineral ($/kg)');
    if (nucleoKgItem) nucleoKgItem.valor = Number(nucleoKg.toFixed(2));

    const alfImp = getVal('alfalfa implantación', 475);
    const alfAmort = getVal('alfalfa amortización', 4);
    const alfProd = getVal('alfalfa producción', 12000);
    const alfAprov = getVal('alfalfa aprovechamiento', 60) / 100;
    const alfalfaCostoKgMS = ((alfImp * dolarBNA) / (alfAmort || 1)) / (alfProd * (alfAprov || 1));
    const alfCostoItem = this.state.P_CostosSupuestos.find(s => s.concepto.includes('Alfalfa costo por kg MS'));
    if (alfCostoItem) alfCostoItem.valor = Number(alfalfaCostoKgMS.toFixed(5));

    const otrasImp = getVal('otras pasturas implantación', 365);
    const otrasAmort = getVal('otras pasturas amortización', 4);
    const otrasProd = getVal('otras pasturas producción', 6000);
    const otrasAprov = getVal('otras pasturas aprovechamiento', 50) / 100;
    const otrasCostoKgMS = ((otrasImp * dolarBNA) / (otrasAmort || 1)) / (otrasProd * (otrasAprov || 1));
    const otrasCostoItem = this.state.P_CostosSupuestos.find(s => s.concepto.includes('Otras pasturas costo por kg MS'));
    if (otrasCostoItem) otrasCostoItem.valor = Number(otrasCostoKgMS.toFixed(5));

    this.state.P_CostosDetalleDesglose.forEach(d => {
      if (d.ingrediente_concepto.includes('Alfalfa pastoreo')) {
        d.precio_unitario = alfalfaCostoKgMS;
        d.costo_total = Number((d.kg_ms * alfalfaCostoKgMS).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Otras pasturas')) {
        d.precio_unitario = otrasCostoKgMS;
        d.costo_total = Number((d.kg_ms * otrasCostoKgMS).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Rollos')) {
        d.precio_unitario = rolloTalCual;
        d.costo_total = Number((d.kg_tal_cual * rolloTalCual).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Maíz propio')) {
        d.precio_unitario = maizTalCual;
        d.costo_total = Number((d.kg_tal_cual * maizTalCual).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Soja concentrado')) {
        d.precio_unitario = sojaTalCual;
        d.costo_total = Number((d.kg_tal_cual * sojaTalCual).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Silaje de maíz')) {
        d.precio_unitario = silajeVerdeKg;
        d.costo_total = Number((d.kg_tal_cual * silajeVerdeKg).toFixed(2));
      } else if (d.ingrediente_concepto.includes('Núcleo mineral')) {
        d.precio_unitario = nucleoKg;
        d.costo_total = Number((d.kg_tal_cual * nucleoKg).toFixed(2));
      }
    });

    const sumSub = (sub: string) => this.state.P_CostosDetalleDesglose
      .filter(d => d.subunidad.toLowerCase() === sub.toLowerCase())
      .reduce((acc, curr) => acc + curr.costo_total, 0);

    const sumVac = (sub: string) => this.state.P_CostosVacunas
      .filter(v => v.categoria.toLowerCase() === sub.toLowerCase())
      .reduce((acc, curr) => acc + curr.total_anual, 0);

    const criaAlim = sumSub('Cría');
    const criaVac = sumVac('Cría');
    const recriaAlim = sumSub('Recría');
    const recriaVac = sumVac('Recría');
    const adapAlim = sumSub('Adaptación');
    const adapVac = sumVac('Adaptación');
    const engAlim = sumSub('Engorde Final');
    const engVac = sumVac('Engorde Final');

    const totCria = this.state.R_CostosEstandarTotales.find(t => t.subunidad === 'Cría');
    if (totCria) {
      totCria.costo_alimentacion = Number(criaAlim.toFixed(2));
      totCria.costo_vacunas = Number(criaVac.toFixed(2));
      totCria.costo_total_cab = Number((criaAlim + criaVac).toFixed(2));
    }

    const totRec = this.state.R_CostosEstandarTotales.find(t => t.subunidad === 'Recría');
    if (totRec) {
      totRec.costo_alimentacion = Number(recriaAlim.toFixed(2));
      totRec.costo_vacunas = Number(recriaVac.toFixed(2));
      totRec.costo_total_cab = Number((recriaAlim + recriaVac).toFixed(2));
      totRec.costo_por_kg_ganado = Number((totRec.costo_total_cab / 140).toFixed(2));
    }

    const totAdap = this.state.R_CostosEstandarTotales.find(t => t.subunidad === 'Adaptación');
    if (totAdap) {
      totAdap.costo_alimentacion = Number(adapAlim.toFixed(2));
      totAdap.costo_vacunas = Number(adapVac.toFixed(2));
      totAdap.costo_total_cab = Number((adapAlim + adapVac).toFixed(2));
      totAdap.costo_por_kg_ganado = Number((totAdap.costo_total_cab / 77.25).toFixed(2));
    }

    const totEng = this.state.R_CostosEstandarTotales.find(t => t.subunidad === 'Engorde Final');
    if (totEng) {
      totEng.costo_alimentacion = Number(engAlim.toFixed(2));
      totEng.costo_vacunas = Number(engVac.toFixed(2));
      totEng.costo_total_cab = Number((engAlim + engVac).toFixed(2));
      totEng.costo_por_kg_ganado = Number((totEng.costo_total_cab / 92.75).toFixed(2));
    }

    const totFaena = this.state.R_CostosEstandarTotales.find(t => t.subunidad.includes('Acumulado'));
    if (totFaena) {
      const alimAcum = recriaAlim + adapAlim + engAlim;
      const vacAcum = recriaVac + adapVac + engVac;
      totFaena.costo_alimentacion = Number(alimAcum.toFixed(2));
      totFaena.costo_vacunas = Number(vacAcum.toFixed(2));
      totFaena.costo_total_cab = Number((alimAcum + vacAcum).toFixed(2));
      totFaena.costo_por_kg_ganado = Number((totFaena.costo_total_cab / 310).toFixed(2));
    }
  }

  public async syncCostosConSheets(): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchAndSyncAllTables();
    return {
      success: res.success,
      message: res.message || 'Costos estándar sincronizados exitosamente con Google Sheets.',
    };
  }

  // ==========================================================================
  // AUDITORÍA (S_Auditoria)
  // ==========================================================================

  private logAuditoria(
    tabla: string,
    id_registro: string | number,
    accion: 'ALTA' | 'MODIFICACION' | 'BAJA',
    detalle?: string,
    valor_anterior?: string,
    valor_nuevo?: string
  ) {
    const newId = this.state.S_Auditoria.length > 0
      ? Math.max(...this.state.S_Auditoria.map(a => a.id)) + 1
      : 1;

    const auditEntry: S_Auditoria = {
      id: newId,
      fecha_hora: new Date().toISOString(),
      usuario: this.currentUser ? this.currentUser.usuario : 'sistema',
      tabla_afectada: tabla,
      id_registro,
      accion,
      detalle,
      valor_anterior,
      valor_nuevo,
    };

    this.state.S_Auditoria.unshift(auditEntry);
  }

  // ==========================================================================
  // REGLAS DE NEGOCIO Y CONTROLES DEL MOTOR (SECCIÓN 7)
  // ==========================================================================

  // Regla 1: Protección de datos históricos (ON DELETE RESTRICT)
  public checkDeleteRestrict(tabla: string, id: number | string): { allowed: boolean; reason?: string } {
    switch (tabla) {
      case 'D_UnidadNeg': {
        const subunidades = this.state.D_Subunidad.filter(s => s.id_unidad_neg === Number(id));
        if (subunidades.length > 0) {
          return { allowed: false, reason: `No se puede eliminar la Unidad de Negocio porque tiene ${subunidades.length} subunidades asociadas.` };
        }
        break;
      }
      case 'D_Subunidad': {
        const tropa = this.state.D_TropaLote.some(t => t.id_subunidad === Number(id));
        const ind = this.state.D_HaciendaIndividual.some(h => h.id_subunidad_actual === Number(id));
        const mov = this.state.F_MovimientosHacienda.some(m => m.id_subunidad_origen === Number(id) || m.id_subunidad_destino === Number(id));
        const con = this.state.F_ConsumosReales.some(c => c.id_subunidad === Number(id));
        const ven = this.state.F_VentasHacienda.some(v => v.id_subunidad === Number(id));
        if (tropa || ind || mov || con || ven) {
          return { allowed: false, reason: 'No se puede eliminar la Subunidad porque posee tropas, animales, movimientos o consumos históricos asociados.' };
        }
        break;
      }
      case 'D_CategoriaHacienda': {
        const ind = this.state.D_HaciendaIndividual.some(h => h.id_categoria_actual === Number(id));
        const mov = this.state.F_MovimientosHacienda.some(m => m.id_categoria_origen === Number(id) || m.id_categoria_destino === Number(id));
        const ven = this.state.F_VentasHacienda.some(v => v.id_categoria === Number(id));
        if (ind || mov || ven) {
          return { allowed: false, reason: 'No se puede eliminar la Categoría porque posee animales o movimientos históricos asociados.' };
        }
        break;
      }
      case 'D_Insumo': {
        const compras = this.state.F_ComprasInsumos.some(c => c.id_insumo === Number(id));
        const consumos = this.state.F_ConsumosReales.some(c => c.id_insumo === Number(id));
        const sanidad = this.state.F_SanidadReal.some(s => s.id_insumo === Number(id));
        const dosis = this.state.P_DosisTecnica.some(d => d.id_insumo === Number(id));
        if (compras || consumos || sanidad || dosis) {
          return { allowed: false, reason: 'No se puede eliminar el Insumo porque posee compras, consumos, dosis o aplicaciones registradas.' };
        }
        break;
      }
      case 'D_Cuenta': {
        const insumo = this.state.D_Insumo.some(i => i.id_cuenta_costo === String(id));
        const ventas = this.state.F_VentasHacienda.some(v => v.id_cuenta_ingreso === String(id));
        const costos = this.state.F_CostosIndirectos.some(c => c.id_cuenta_costo === String(id));
        if (insumo || ventas || costos) {
          return { allowed: false, reason: 'No se puede eliminar la Cuenta Contable porque está imputada en insumos, ventas o costos indirectos.' };
        }
        break;
      }
      case 'D_Campana': {
        const rindes = this.state.P_EstandarRinde.some(r => r.id_campana === Number(id));
        const dosis = this.state.P_DosisTecnica.some(d => d.id_campana === Number(id));
        if (rindes || dosis) {
          return { allowed: false, reason: 'No se puede eliminar la Campaña porque posee parámetros técnicos vinculados.' };
        }
        break;
      }
    }
    return { allowed: true };
  }

  // Regla 6: Control de existencias e imposibilidad de stocks negativos en insumos
  public getStockInsumo(id_insumo: number): { entradas: number; salidas: number; disponible: number; precioPromedio: number } {
    const compras = this.state.F_ComprasInsumos.filter(c => c.id_insumo === id_insumo);
    const consumos = this.state.F_ConsumosReales.filter(c => c.id_insumo === id_insumo);
    const sanidad = this.state.F_SanidadReal.filter(s => s.id_insumo === id_insumo);

    const entradas = compras.reduce((acc, c) => acc + (Number(c.cantidad) || 0), 0);
    const salidasConsumo = consumos.reduce((acc, c) => acc + (Number(c.cantidad_fisica_real) || 0), 0);
    const salidasSanidad = sanidad.reduce((acc, s) => acc + (Number(s.dosis_real_total) || 0), 0);
    const salidas = salidasConsumo + salidasSanidad;
    const disponible = entradas - salidas;

    const totalGastado = compras.reduce((acc, c) => acc + (Number(c.importe_total) || 0), 0);
    const precioPromedio = entradas > 0 ? totalGastado / entradas : 0;

    return { entradas, salidas, disponible, precioPromedio };
  }

  // Stock de hacienda por subunidad y categoría
  public getStockHacienda(id_subunidad?: number, id_categoria?: number): number {
    let stock = 0;
    for (const mov of this.state.F_MovimientosHacienda) {
      const cabezas = Number(mov.cantidad_cabezas) || 1;
      
      // Entradas a la subunidad / categoría
      if (
        (!id_subunidad || mov.id_subunidad_destino === id_subunidad) &&
        (!id_categoria || mov.id_categoria_destino === id_categoria)
      ) {
        if (mov.id_subunidad_destino !== null && mov.id_subunidad_destino !== undefined) {
          stock += cabezas;
        }
      }

      // Salidas de la subunidad / categoría
      if (
        (!id_subunidad || mov.id_subunidad_origen === id_subunidad) &&
        (!id_categoria || mov.id_categoria_origen === id_categoria)
      ) {
        if (mov.id_subunidad_origen !== null && mov.id_subunidad_origen !== undefined) {
          stock -= cabezas;
        }
      }
    }
    return Math.max(0, stock);
  }

  // ==========================================================================
  // OPERACIONES TRANSACCIONALES CON VALIDACIÓN ACTIVA
  // ==========================================================================

  // ALTA / MODIFICACIÓN DE INSUMO
  public saveInsumo(item: D_Insumo): { success: boolean; error?: string } {
    if (!item.nombre?.trim()) return { success: false, error: 'El nombre del insumo es obligatorio.' };
    if (!item.id_um_consumo) return { success: false, error: 'Debe seleccionar una unidad de medida válida.' };
    if (!item.id_cuenta_costo) return { success: false, error: 'Debe asociar una cuenta contable de costo directo.' };

    const exists = this.state.D_Insumo.find(i => i.id_insumo === item.id_insumo);
    if (exists) {
      this.state.D_Insumo = this.state.D_Insumo.map(i => i.id_insumo === item.id_insumo ? item : i);
      this.logAuditoria('D_Insumo', item.id_insumo, 'MODIFICACION', `Actualización de insumo ${item.nombre}`);
    } else {
      const newId = this.state.D_Insumo.length > 0 ? Math.max(...this.state.D_Insumo.map(i => i.id_insumo)) + 1 : 1;
      const newItem = { ...item, id_insumo: newId };
      this.state.D_Insumo.push(newItem);
      this.logAuditoria('D_Insumo', newId, 'ALTA', `Alta de insumo ${newItem.nombre}`);
    }
    this.persist();
    return { success: true };
  }

  public deleteInsumo(id: number): { success: boolean; error?: string } {
    const check = this.checkDeleteRestrict('D_Insumo', id);
    if (!check.allowed) return { success: false, error: check.reason };

    this.state.D_Insumo = this.state.D_Insumo.filter(i => i.id_insumo !== id);
    this.logAuditoria('D_Insumo', id, 'BAJA', `Baja de insumo ID ${id}`);
    this.persist();
    return { success: true };
  }

  // REGISTRO DE CONSUMOS REALES (F_ConsumosReales)
  public addConsumoReal(consumo: Omit<F_ConsumosReales, 'id_consumo'>): { success: boolean; error?: string } {
    if (!consumo.id_insumo) return { success: false, error: 'Debe seleccionar un insumo homologado.' };
    if (!consumo.id_subunidad) return { success: false, error: 'Debe seleccionar la subunidad de destino.' };
    if (!consumo.cantidad_fisica_real || consumo.cantidad_fisica_real <= 0) {
      return { success: false, error: 'La cantidad real debe ser un valor mayor a cero.' };
    }

    // Regla 6: Control de stocks negativos
    const stock = this.getStockInsumo(consumo.id_insumo);
    if (stock.disponible < consumo.cantidad_fisica_real) {
      return {
        success: false,
        error: `Integridad Física Violada: Stock insuficiente del insumo. Disponible en almacén: ${stock.disponible.toFixed(2)}, Requerido: ${consumo.cantidad_fisica_real.toFixed(2)}.`,
      };
    }

    const newId = this.state.F_ConsumosReales.length > 0
      ? Math.max(...this.state.F_ConsumosReales.map(c => c.id_consumo)) + 1
      : 1;

    const record: F_ConsumosReales = { ...consumo, id_consumo: newId };
    this.state.F_ConsumosReales.push(record);
    this.logAuditoria('F_ConsumosReales', newId, 'ALTA', `Consumo real de ${record.cantidad_fisica_real} unidades en Subunidad ${record.id_subunidad}`);
    this.persist();
    return { success: true };
  }

  public async addConsumoRealAsync(
    consumo: Omit<F_ConsumosReales, 'id_consumo'>
  ): Promise<{ success: boolean; error?: string; googleSheetsAppended?: boolean; record?: F_ConsumosReales; message?: string }> {
    const res = this.addConsumoReal(consumo);
    if (!res.success) return res;

    const record = this.state.F_ConsumosReales[this.state.F_ConsumosReales.length - 1];
    const postRes = await this.postAppendToSheets('F_ConsumosReales', record);
    return {
      success: true,
      googleSheetsAppended: postRes.googleSheetsAppended,
      record,
      message: postRes.googleSheetsAppended
        ? 'Consumo guardado e impactado en Google Sheets (F_ConsumosReales).'
        : 'Consumo guardado en la base de datos local.',
    };
  }

  // REGISTRO DE APLICACIÓN SANITARIA (F_SanidadReal)
  public addSanidadReal(sanidad: Omit<F_SanidadReal, 'id_sanidad'>): { success: boolean; error?: string } {
    if (!sanidad.id_insumo) return { success: false, error: 'Debe seleccionar el producto veterinario.' };
    if (!sanidad.id_subunidad) return { success: false, error: 'Debe seleccionar la subunidad de aplicación.' };
    if (!sanidad.dosis_real_total || sanidad.dosis_real_total <= 0) {
      return { success: false, error: 'La dosis total aplicada debe ser mayor a cero.' };
    }

    // El producto sanitario también se descuenta del inventario
    const stock = this.getStockInsumo(sanidad.id_insumo);
    if (stock.disponible < sanidad.dosis_real_total) {
      return {
        success: false,
        error: `Stock Sanitario Insuficiente: Disponible: ${stock.disponible.toFixed(2)}, Aplicado: ${sanidad.dosis_real_total.toFixed(2)}.`,
      };
    }

    const newId = this.state.F_SanidadReal.length > 0
      ? Math.max(...this.state.F_SanidadReal.map(s => s.id_sanidad)) + 1
      : 1;

    const record: F_SanidadReal = { ...sanidad, id_sanidad: newId };
    this.state.F_SanidadReal.push(record);
    this.logAuditoria('F_SanidadReal', newId, 'ALTA', `Sanidad real: Insumo ${record.id_insumo}, Dosis ${record.dosis_real_total}`);
    this.persist();
    return { success: true };
  }

  public async addSanidadRealAsync(
    sanidad: Omit<F_SanidadReal, 'id_sanidad'>
  ): Promise<{ success: boolean; error?: string; googleSheetsAppended?: boolean; record?: F_SanidadReal; message?: string }> {
    const res = this.addSanidadReal(sanidad);
    if (!res.success) return res;

    const record = this.state.F_SanidadReal[this.state.F_SanidadReal.length - 1];
    const postRes = await this.postAppendToSheets('F_SanidadReal', record);
    return {
      success: true,
      googleSheetsAppended: postRes.googleSheetsAppended,
      record,
      message: postRes.googleSheetsAppended
        ? 'Acta y protocolo veterinario guardado e impactado en Google Sheets (F_SanidadReal).'
        : 'Protocolo veterinario guardado en la base de datos local.',
    };
  }

  // REGISTRO DE COMPRAS DE INSUMOS (F_ComprasInsumos)
  public addCompraInsumo(compra: Omit<F_ComprasInsumos, 'id_compra' | 'importe_total'>): { success: boolean; error?: string } {
    if (!compra.id_insumo) return { success: false, error: 'Seleccione un insumo del catálogo.' };
    if (!compra.cantidad || compra.cantidad <= 0) return { success: false, error: 'La cantidad ingresada debe ser positiva.' };
    if (!compra.precio_unitario_real || compra.precio_unitario_real <= 0) {
      return { success: false, error: 'El precio unitario real debe ser un importe devengado mayor a cero.' };
    }

    const newId = this.state.F_ComprasInsumos.length > 0
      ? Math.max(...this.state.F_ComprasInsumos.map(c => c.id_compra)) + 1
      : 1;

    const importe_total = Number((compra.cantidad * compra.precio_unitario_real).toFixed(2));
    const record: F_ComprasInsumos = { ...compra, id_compra: newId, importe_total };
    this.state.F_ComprasInsumos.push(record);
    this.logAuditoria('F_ComprasInsumos', newId, 'ALTA', `Ingreso de insumo ${record.id_insumo}: ${record.cantidad} unidades a $${record.precio_unitario_real}/u`);
    this.persist();
    return { success: true };
  }

  // ALTA / REGISTRO DE HACIENDA INDIVIDUAL (D_HaciendaIndividual)
  public saveHaciendaIndividual(animal: D_HaciendaIndividual): { success: boolean; error?: string } {
    if (!animal.caravana_visual?.trim()) return { success: false, error: 'La Caravana Visual es obligatoria.' };
    if (!animal.caravana_rfid?.trim()) return { success: false, error: 'La Caravana Electrónica (RFID) es obligatoria.' };

    // Regla 4: Integridad de trazabilidad animal (UNIQUE independiente)
    const existsVisual = this.state.D_HaciendaIndividual.find(
      h => h.id_hacienda !== animal.id_hacienda && h.caravana_visual.trim().toUpperCase() === animal.caravana_visual.trim().toUpperCase()
    );
    if (existsVisual) return { success: false, error: `La caravana visual '${animal.caravana_visual}' ya existe en el sistema.` };

    const existsRfid = this.state.D_HaciendaIndividual.find(
      h => h.id_hacienda !== animal.id_hacienda && h.caravana_rfid.trim().toUpperCase() === animal.caravana_rfid.trim().toUpperCase()
    );
    if (existsRfid) return { success: false, error: `La caravana electrónica RFID '${animal.caravana_rfid}' ya existe en el sistema.` };

    // Relaciones genealógicas padre / madre
    if (animal.id_padre && animal.id_padre === animal.id_hacienda) {
      return { success: false, error: 'Un animal no puede ser su propio padre.' };
    }
    if (animal.id_madre && animal.id_madre === animal.id_hacienda) {
      return { success: false, error: 'Un animal no puede ser su propia madre.' };
    }

    const exists = this.state.D_HaciendaIndividual.find(h => h.id_hacienda === animal.id_hacienda);
    if (exists) {
      this.state.D_HaciendaIndividual = this.state.D_HaciendaIndividual.map(h => h.id_hacienda === animal.id_hacienda ? animal : h);
      this.logAuditoria('D_HaciendaIndividual', animal.id_hacienda, 'MODIFICACION', `Actualización de caravana ${animal.caravana_visual}`);
    } else {
      const newId = this.state.D_HaciendaIndividual.length > 0
        ? Math.max(...this.state.D_HaciendaIndividual.map(h => h.id_hacienda)) + 1
        : 1;
      const newItem = { ...animal, id_hacienda: newId };
      this.state.D_HaciendaIndividual.push(newItem);
      this.logAuditoria('D_HaciendaIndividual', newId, 'ALTA', `Alta de reproductor caravana ${newItem.caravana_visual} (${newItem.caravana_rfid})`);
    }
    this.persist();
    return { success: true };
  }

  // REGISTRO DE MOVIMIENTOS DE HACIENDA (F_MovimientosHacienda)
  public addMovimientoHacienda(mov: Omit<F_MovimientosHacienda, 'id_movimiento'>): { success: boolean; error?: string } {
    if (!mov.fecha) return { success: false, error: 'Fecha requerida.' };
    if (!mov.cantidad_cabezas || mov.cantidad_cabezas <= 0) return { success: false, error: 'La cantidad de cabezas debe ser mayor a cero.' };

    // Validación de stock de salida si no es nacimiento o compra
    if (mov.id_subunidad_origen && mov.tipo_movimiento !== 'Nacimiento' && mov.tipo_movimiento !== 'Compra Externa') {
      const stockActual = this.getStockHacienda(mov.id_subunidad_origen, mov.id_categoria_origen);
      if (stockActual < mov.cantidad_cabezas) {
        return {
          success: false,
          error: `Integridad Física Violada: Stock de hacienda insuficiente en la subunidad de origen. Existencia: ${stockActual} cab., Solicitado mover: ${mov.cantidad_cabezas} cab.`,
        };
      }
    }

    const newId = this.state.F_MovimientosHacienda.length > 0
      ? Math.max(...this.state.F_MovimientosHacienda.map(m => m.id_movimiento)) + 1
      : 1;

    const record: F_MovimientosHacienda = { ...mov, id_movimiento: newId };
    this.state.F_MovimientosHacienda.push(record);

    // Regla 5: Baja automática del animal individual si es Venta o Muerte
    if (mov.id_hacienda) {
      const animal = this.state.D_HaciendaIndividual.find(h => h.id_hacienda === mov.id_hacienda);
      if (animal) {
        if (mov.tipo_movimiento === 'Venta') {
          animal.estado_actual = 'Baja por Venta';
          this.logAuditoria('D_HaciendaIndividual', animal.id_hacienda, 'MODIFICACION', 'Baja automática por Venta');
        } else if (mov.tipo_movimiento === 'Muerte') {
          animal.estado_actual = 'Baja por Muerte';
          this.logAuditoria('D_HaciendaIndividual', animal.id_hacienda, 'MODIFICACION', 'Baja automática por Muerte');
        } else if (mov.id_subunidad_destino) {
          animal.id_subunidad_actual = mov.id_subunidad_destino;
          animal.id_categoria_actual = mov.id_categoria_destino;
        }
      }
    }

    this.logAuditoria('F_MovimientosHacienda', newId, 'ALTA', `Movimiento: ${record.tipo_movimiento} (${record.cantidad_cabezas} cabezas)`);
    this.persist();
    return { success: true };
  }

  public async addMovimientoHaciendaAsync(
    mov: Omit<F_MovimientosHacienda, 'id_movimiento'>
  ): Promise<{ success: boolean; error?: string; googleSheetsAppended?: boolean; record?: F_MovimientosHacienda; message?: string }> {
    const res = this.addMovimientoHacienda(mov);
    if (!res.success) return res;

    const record = this.state.F_MovimientosHacienda[this.state.F_MovimientosHacienda.length - 1];
    const postRes = await this.postAppendToSheets('F_MovimientosHacienda', record);
    return {
      success: true,
      googleSheetsAppended: postRes.googleSheetsAppended,
      record,
      message: postRes.googleSheetsAppended
        ? 'Movimiento guardado e impactado en Google Sheets (F_MovimientosHacienda).'
        : 'Movimiento guardado en la base de datos local.',
    };
  }

  // REGISTRO DE VENTAS DE HACIENDA (F_VentasHacienda)
  public addVentaHacienda(venta: Omit<F_VentasHacienda, 'id_venta' | 'ingreso_bruto_venta' | 'total_gastos_comerciales' | 'venta_neta' | 'iva_liquidado' | 'neto_a_cobrar'>): { success: boolean; error?: string } {
    if (!venta.cabezas || venta.cabezas <= 0) return { success: false, error: 'Indique cabezas vendidas.' };
    if (!venta.kilos_vivos_totales || venta.kilos_vivos_totales <= 0) return { success: false, error: 'Indique kilos vivos totales.' };
    if (!venta.precio_por_kg_real || venta.precio_por_kg_real <= 0) return { success: false, error: 'Indique precio real por kg.' };

    const ingreso_bruto = Number((venta.kilos_vivos_totales * venta.precio_por_kg_real).toFixed(2));
    const total_gastos_comerciales = Number((
      (venta.comision_consignatario || 0) +
      (venta.flete_camion_jaula || 0) +
      (venta.derechos_pista_pesaje || 0) +
      (venta.aranceles_senasa_dte || 0) +
      (venta.otras_tasas_feriales || 0)
    ).toFixed(2));

    // RT 22 / RT 54: Venta Neta = Ingreso Bruto - Gastos Comerciales
    const venta_neta = Number((ingreso_bruto - total_gastos_comerciales).toFixed(2));
    const alicuota_iva = venta.alicuota_iva ?? 0.105;
    const iva_liquidado = Number((ingreso_bruto * alicuota_iva).toFixed(2));
    const retenciones = venta.retenciones_fiscales || 0;
    const neto_a_cobrar = Number((ingreso_bruto + iva_liquidado - total_gastos_comerciales - retenciones).toFixed(2));

    const newId = this.state.F_VentasHacienda.length > 0
      ? Math.max(...this.state.F_VentasHacienda.map(v => v.id_venta)) + 1
      : 1;

    const record: F_VentasHacienda = {
      ...venta,
      id_venta: newId,
      ingreso_bruto_venta: ingreso_bruto,
      total_gastos_comerciales,
      venta_neta,
      alicuota_iva,
      iva_liquidado,
      neto_a_cobrar,
    };

    this.state.F_VentasHacienda.push(record);
    this.logAuditoria('F_VentasHacienda', newId, 'ALTA', `Liquidación de venta N° ${record.numero_liquidacion_dte}: Bruto $${ingreso_bruto}, Venta Neta $${venta_neta}`);
    this.persist();
    return { success: true };
  }

  public async addVentaHaciendaAsync(
    venta: Omit<F_VentasHacienda, 'id_venta' | 'ingreso_bruto_venta' | 'total_gastos_comerciales' | 'venta_neta' | 'iva_liquidado' | 'neto_a_cobrar'>
  ): Promise<{ success: boolean; error?: string; googleSheetsAppended?: boolean; record?: F_VentasHacienda; message?: string }> {
    const res = this.addVentaHacienda(venta);
    if (!res.success) return res;

    const record = this.state.F_VentasHacienda[this.state.F_VentasHacienda.length - 1];
    const postRes = await this.postAppendToSheets('F_VentasHacienda', record);
    return {
      success: true,
      googleSheetsAppended: postRes.googleSheetsAppended,
      record,
      message: postRes.googleSheetsAppended
        ? 'Liquidación de venta guardada e impactada en Google Sheets (F_VentasHacienda).'
        : 'Liquidación de venta guardada en la base de datos local.',
    };
  }

  // REGISTRO DE PESADAS DE CONTROL (F_PesadasControl)
  public addPesadaControl(pesada: Omit<F_PesadasControl, 'id_pesada' | 'peso_promedio_kg'>): { success: boolean; error?: string } {
    if (!pesada.peso_vivo_kg || pesada.peso_vivo_kg <= 0) return { success: false, error: 'Indique peso vivo válido.' };
    const cab = pesada.cantidad_cabezas > 0 ? pesada.cantidad_cabezas : 1;
    const peso_promedio_kg = Number((pesada.peso_vivo_kg / cab).toFixed(2));

    const newId = this.state.F_PesadasControl.length > 0
      ? Math.max(...this.state.F_PesadasControl.map(p => p.id_pesada)) + 1
      : 1;

    const record: F_PesadasControl = {
      ...pesada,
      id_pesada: newId,
      peso_promedio_kg,
    };
    this.state.F_PesadasControl.push(record);
    this.logAuditoria('F_PesadasControl', newId, 'ALTA', `Pesada en Subunidad ${record.id_subunidad}: ${record.peso_vivo_kg} kg (${cab} cabezas)`);
    this.persist();
    return { success: true };
  }

  public async addPesadaControlAsync(
    pesada: Omit<F_PesadasControl, 'id_pesada' | 'peso_promedio_kg'>
  ): Promise<{ success: boolean; error?: string; googleSheetsAppended?: boolean; record?: F_PesadasControl; message?: string }> {
    const res = this.addPesadaControl(pesada);
    if (!res.success) return res;

    const record = this.state.F_PesadasControl[this.state.F_PesadasControl.length - 1];
    const postRes = await this.postAppendToSheets('F_PesadasControl', record);
    return {
      success: true,
      googleSheetsAppended: postRes.googleSheetsAppended,
      record,
      message: postRes.googleSheetsAppended
        ? 'Pesada guardada e impactada en Google Sheets (F_PesadasControl).'
        : 'Pesada guardada en la base de datos local.',
    };
  }

  // PARÁMETROS TÉCNICOS: P_EstandarRinde
  public saveEstandarRinde(param: P_EstandarRinde): { success: boolean; error?: string } {
    // Unicidad: uq_rinde_campana_subunidad
    const exists = this.state.P_EstandarRinde.find(
      p => p.id_param_rinde !== param.id_param_rinde && p.id_campana === param.id_campana && p.id_subunidad === param.id_subunidad
    );
    if (exists) {
      return { success: false, error: 'Ya existe un estándar técnico de rendimiento para esta combinación de Campaña y Subunidad (Regla uq_rinde_campana_subunidad).' };
    }

    if (param.id_param_rinde && this.state.P_EstandarRinde.some(p => p.id_param_rinde === param.id_param_rinde)) {
      this.state.P_EstandarRinde = this.state.P_EstandarRinde.map(p => p.id_param_rinde === param.id_param_rinde ? param : p);
      this.logAuditoria('P_EstandarRinde', param.id_param_rinde, 'MODIFICACION', 'Actualización de estándar de rinde');
    } else {
      const newId = this.state.P_EstandarRinde.length > 0 ? Math.max(...this.state.P_EstandarRinde.map(p => p.id_param_rinde)) + 1 : 1;
      const newItem = { ...param, id_param_rinde: newId };
      this.state.P_EstandarRinde.push(newItem);
      this.logAuditoria('P_EstandarRinde', newId, 'ALTA', `Alta de meta rinde Subunidad ${newItem.id_subunidad}`);
    }
    this.persist();
    return { success: true };
  }

  // PARÁMETROS TÉCNICOS: P_DosisTecnica
  public saveDosisTecnica(param: P_DosisTecnica): { success: boolean; error?: string } {
    // Unicidad: uq_dosis_tecnica (id_campana, id_subunidad, id_categoria, id_insumo)
    const exists = this.state.P_DosisTecnica.find(
      p => p.id_dosis_tecnica !== param.id_dosis_tecnica &&
           p.id_campana === param.id_campana &&
           p.id_subunidad === param.id_subunidad &&
           p.id_categoria === param.id_categoria &&
           p.id_insumo === param.id_insumo
    );
    if (exists) {
      return { success: false, error: 'Ya existe una dosis técnica registrada para la misma Campaña, Subunidad, Categoría e Insumo (Regla uq_dosis_tecnica).' };
    }

    if (param.id_dosis_tecnica && this.state.P_DosisTecnica.some(p => p.id_dosis_tecnica === param.id_dosis_tecnica)) {
      this.state.P_DosisTecnica = this.state.P_DosisTecnica.map(p => p.id_dosis_tecnica === param.id_dosis_tecnica ? param : p);
      this.logAuditoria('P_DosisTecnica', param.id_dosis_tecnica, 'MODIFICACION', 'Actualización de dosis técnica');
    } else {
      const newId = this.state.P_DosisTecnica.length > 0 ? Math.max(...this.state.P_DosisTecnica.map(p => p.id_dosis_tecnica)) + 1 : 1;
      const newItem = { ...param, id_dosis_tecnica: newId };
      this.state.P_DosisTecnica.push(newItem);
      this.logAuditoria('P_DosisTecnica', newId, 'ALTA', `Alta dosis técnica insumo ${newItem.id_insumo}`);
    }
    this.persist();
    return { success: true };
  }

  // COSTOS INDIRECTOS (F_CostosIndirectos)
  public addCostoIndirecto(costo: Omit<F_CostosIndirectos, 'id_costo_indirecto' | 'importe_asignado_subunidad'>): { success: boolean; error?: string } {
    const asignado = Number((costo.importe_total_erogacion * costo.coeficiente_prorrateo).toFixed(2));
    const newId = this.state.F_CostosIndirectos.length > 0
      ? Math.max(...this.state.F_CostosIndirectos.map(c => c.id_costo_indirecto)) + 1
      : 1;

    const record: F_CostosIndirectos = {
      ...costo,
      id_costo_indirecto: newId,
      importe_asignado_subunidad: asignado,
    };
    this.state.F_CostosIndirectos.push(record);
    this.logAuditoria('F_CostosIndirectos', newId, 'ALTA', `Costo indirecto ${costo.concepto}: $${asignado} asignado a Subunidad ${costo.id_subunidad}`);
    this.persist();
    return { success: true };
  }

  // CAMPAÑA (D_Campana)
  public saveCampana(camp: D_Campana): { success: boolean; error?: string } {
    if (!camp.nombre?.trim()) return { success: false, error: 'Nombre de campaña requerido.' };
    const exists = this.state.D_Campana.find(c => c.id_campana === camp.id_campana);
    if (exists) {
      this.state.D_Campana = this.state.D_Campana.map(c => c.id_campana === camp.id_campana ? camp : c);
      this.logAuditoria('D_Campana', camp.id_campana, 'MODIFICACION', `Actualización de campaña ${camp.nombre}`);
    } else {
      const newId = this.state.D_Campana.length > 0 ? Math.max(...this.state.D_Campana.map(c => c.id_campana)) + 1 : 1;
      const newItem = { ...camp, id_campana: newId };
      this.state.D_Campana.push(newItem);
      this.logAuditoria('D_Campana', newId, 'ALTA', `Alta de campaña ${newItem.nombre}`);
    }
    this.persist();
    return { success: true };
  }

  // TROPA / LOTE (D_TropaLote)
  public saveTropaLote(tropa: D_TropaLote): { success: boolean; error?: string } {
    if (!tropa.codigo_tropa?.trim()) return { success: false, error: 'Código de tropa obligatorio.' };
    const dup = this.state.D_TropaLote.find(
      t => t.id_tropa !== tropa.id_tropa && t.codigo_tropa.trim().toUpperCase() === tropa.codigo_tropa.trim().toUpperCase()
    );
    if (dup) return { success: false, error: 'Ya existe una tropa con el mismo código identificador.' };

    const exists = this.state.D_TropaLote.find(t => t.id_tropa === tropa.id_tropa);
    if (exists) {
      this.state.D_TropaLote = this.state.D_TropaLote.map(t => t.id_tropa === tropa.id_tropa ? tropa : t);
      this.logAuditoria('D_TropaLote', tropa.id_tropa, 'MODIFICACION', `Actualización tropa ${tropa.codigo_tropa}`);
    } else {
      const newId = this.state.D_TropaLote.length > 0 ? Math.max(...this.state.D_TropaLote.map(t => t.id_tropa)) + 1 : 1;
      const newItem = { ...tropa, id_tropa: newId };
      this.state.D_TropaLote.push(newItem);
      this.logAuditoria('D_TropaLote', newId, 'ALTA', `Alta tropa ${newItem.codigo_tropa}`);
    }
    this.persist();
    return { success: true };
  }

  // USUARIOS (S_Usuarios)
  public saveUsuario(user: S_Usuarios): { success: boolean; error?: string } {
    if (!user.usuario?.trim()) return { success: false, error: 'El nombre de usuario es obligatorio.' };
    const dup = this.state.S_Usuarios.find(
      u => u.id_usuario !== user.id_usuario && u.usuario.trim().toLowerCase() === user.usuario.trim().toLowerCase()
    );
    if (dup) return { success: false, error: 'Ya existe un usuario con ese nombre de acceso.' };

    const exists = this.state.S_Usuarios.find(u => u.id_usuario === user.id_usuario);
    if (exists) {
      this.state.S_Usuarios = this.state.S_Usuarios.map(u => u.id_usuario === user.id_usuario ? user : u);
      this.logAuditoria('S_Usuarios', user.id_usuario, 'MODIFICACION', `Actualización de usuario ${user.usuario}`);
    } else {
      const newId = this.state.S_Usuarios.length > 0 ? Math.max(...this.state.S_Usuarios.map(u => u.id_usuario)) + 1 : 1;
      const newItem = { ...user, id_usuario: newId };
      this.state.S_Usuarios.push(newItem);
      this.logAuditoria('S_Usuarios', newId, 'ALTA', `Alta de usuario ${newItem.usuario}`);
    }
    this.persist();

    // Sincronizar inmediatamente con el backend Express
    const userToSync = exists ? user : { ...user, id_usuario: this.state.S_Usuarios[this.state.S_Usuarios.length - 1].id_usuario };
    fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userToSync),
    }).catch(err => console.warn('[USER SYNC] Backend sync failed:', err));

    return { success: true };
  }

  // ==========================================================================
  // CÁLCULOS ANALÍTICOS Y VISTAS DE RESULTADOS (R_)
  // ==========================================================================

  // R_MargenSubunidad
  public getMargenSubunidad(id_subunidad: number, id_campana?: number): R_MargenSubunidad {
    const sub = this.state.D_Subunidad.find(s => s.id_subunidad === id_subunidad);
    const nombre_subunidad = sub ? sub.nombre : `Subunidad ${id_subunidad}`;

    // Ventas externas de la subunidad
    const ventas = this.state.F_VentasHacienda.filter(v => v.id_subunidad === id_subunidad);
    const ingresos_brutos = ventas.reduce((acc, v) => acc + (Number(v.ingreso_bruto_venta) || 0), 0);
    const gastos_comerciales = ventas.reduce((acc, v) => acc + (Number(v.total_gastos_comerciales) || 0), 0);
    const ventas_netas = ventas.reduce((acc, v) => acc + (Number(v.venta_neta) || 0), 0);

    // Costos directos de alimentación
    const consumos = this.state.F_ConsumosReales.filter(c => c.id_subunidad === id_subunidad);
    const costoAlimentos = consumos.reduce((acc, c) => {
      const stock = this.getStockInsumo(c.id_insumo);
      return acc + (c.cantidad_fisica_real * stock.precioPromedio);
    }, 0);

    // Costos directos de sanidad y veterinaria
    const sanidad = this.state.F_SanidadReal.filter(s => s.id_subunidad === id_subunidad);
    const costoSanidad = sanidad.reduce((acc, s) => {
      const stock = this.getStockInsumo(s.id_insumo);
      const costoInsumo = s.dosis_real_total * stock.precioPromedio;
      const honorarios = Number(s.costo_profesional_honorarios) || 0;
      return acc + costoInsumo + honorarios;
    }, 0);

    const costos_directos_reales = Number((costoAlimentos + costoSanidad).toFixed(2));
    const margen_bruto = Number((ventas_netas - costos_directos_reales).toFixed(2));
    const porcentaje_sobre_costos = costos_directos_reales > 0
      ? Number(((margen_bruto / costos_directos_reales) * 100).toFixed(2))
      : 0;

    return {
      id_campana: id_campana || 1,
      id_subunidad,
      nombre_subunidad,
      periodo: 'Campaña en curso',
      ingresos_brutos,
      gastos_comerciales,
      ventas_netas,
      costos_directos_reales,
      margen_bruto,
      porcentaje_sobre_costos,
    };
  }

  // R_DesvioRendimiento
  public getDesviosRendimiento(id_subunidad: number, id_campana?: number): R_DesvioRendimiento[] {
    const sub = this.state.D_Subunidad.find(s => s.id_subunidad === id_subunidad);
    const nombre_subunidad = sub ? sub.nombre : '';

    const paramRinde = this.state.P_EstandarRinde.find(
      p => p.id_subunidad === id_subunidad && (!id_campana || p.id_campana === id_campana)
    );

    // Buscar pesadas de la subunidad
    const pesadas = this.state.F_PesadasControl.filter(p => p.id_subunidad === id_subunidad);
    if (pesadas.length === 0) return [];

    // Último precio real de venta para la categoría de referencia
    const ultVenta = this.state.F_VentasHacienda.filter(v => v.id_subunidad === id_subunidad).pop();
    const precioRealRef = ultVenta ? ultVenta.precio_por_kg_real : 0;

    const cabezas_evaluadas = pesadas.reduce((acc, p) => acc + (p.cantidad_cabezas || 1), 0);
    const kilos_pesados_total = pesadas.reduce((acc, p) => acc + (p.peso_vivo_kg || 0), 0);

    const dias_permanencia = paramRinde ? paramRinde.dias_permanencia_teoricos : 90;
    const adpv_estandar = paramRinde ? paramRinde.adpv_estandar_kg_dia : 0;
    const rendimiento_estandar_kg = Number((adpv_estandar * dias_permanencia * cabezas_evaluadas).toFixed(2));
    const rendimiento_real_kg = Number(kilos_pesados_total.toFixed(2));

    const desvio_rendimiento_kg = Number((rendimiento_real_kg - rendimiento_estandar_kg).toFixed(2));
    const desvio_porcentual_rendimiento = rendimiento_estandar_kg > 0
      ? Number(((desvio_rendimiento_kg / rendimiento_estandar_kg) * 100).toFixed(2))
      : 0;
    const desvio_economico_rendimiento = Number((desvio_rendimiento_kg * precioRealRef).toFixed(2));

    return [{
      id_campana: id_campana || 1,
      id_subunidad,
      nombre_subunidad,
      cabezas_evaluadas,
      dias_permanencia,
      rendimiento_estandar_kg,
      rendimiento_real_kg,
      desvio_rendimiento_kg,
      desvio_porcentual_rendimiento,
      precio_real_referencia: precioRealRef,
      desvio_economico_rendimiento,
    }];
  }

  // R_DesvioConsumo
  public getDesviosConsumo(id_subunidad: number, id_campana?: number): R_DesvioConsumo[] {
    const sub = this.state.D_Subunidad.find(s => s.id_subunidad === id_subunidad);
    const nombre_subunidad = sub ? sub.nombre : '';

    const results: R_DesvioConsumo[] = [];
    const consumos = this.state.F_ConsumosReales.filter(c => c.id_subunidad === id_subunidad);

    // Agrupar consumos reales por insumo
    const insumoIds = Array.from(new Set(consumos.map(c => c.id_insumo)));

    for (const insId of insumoIds) {
      const insumo = this.state.D_Insumo.find(i => i.id_insumo === insId);
      if (!insumo) continue;
      const um = this.state.D_UM.find(u => u.id_um === insumo.id_um_consumo);
      const codigo_um = um ? um.codigo : 'u';

      const consumo_real_fisico = consumos
        .filter(c => c.id_insumo === insId)
        .reduce((acc, c) => acc + (Number(c.cantidad_fisica_real) || 0), 0);

      // Estándar de dosis técnica
      const dosis = this.state.P_DosisTecnica.find(
        d => d.id_subunidad === id_subunidad && d.id_insumo === insId && (!id_campana || d.id_campana === id_campana)
      );

      // Cabezas en la subunidad
      const cabezas = this.getStockHacienda(id_subunidad) || 1;
      const dias = 90; // días promedio
      const dosisValor = dosis ? dosis.dosis_teorica_cab_dia : 0;
      const consumo_estandar_fisico = dosis
        ? (dosis.dosis_es_diaria ? dosisValor * cabezas * dias : dosisValor * cabezas)
        : 0;

      const desvio_consumo_fisico = Number((consumo_real_fisico - consumo_estandar_fisico).toFixed(2));
      const desvio_porcentual_consumo = consumo_estandar_fisico > 0
        ? Number(((desvio_consumo_fisico / consumo_estandar_fisico) * 100).toFixed(2))
        : 0;

      const stock = this.getStockInsumo(insId);
      const precio_real_unitario = stock.precioPromedio;
      const desvio_economico_consumo = Number((desvio_consumo_fisico * precio_real_unitario).toFixed(2));

      results.push({
        id_campana: id_campana || 1,
        id_subunidad,
        nombre_subunidad,
        id_insumo: insId,
        nombre_insumo: insumo.nombre,
        id_um: insumo.id_um_consumo,
        codigo_um,
        consumo_estandar_fisico: Number(consumo_estandar_fisico.toFixed(2)),
        consumo_real_fisico: Number(consumo_real_fisico.toFixed(2)),
        desvio_consumo_fisico,
        desvio_porcentual_consumo,
        precio_real_unitario: Number(precio_real_unitario.toFixed(2)),
        desvio_economico_consumo,
      });
    }

    return results;
  }

  // R_ResultadoConsolidado (Eliminación de duplicaciones por transferencias internas)
  public getResultadoConsolidado(id_campana?: number): R_ResultadoConsolidado {
    const campana = this.state.D_Campana.find(c => !id_campana || c.id_campana === id_campana);
    const nombre_campana = campana ? campana.nombre : 'Campaña General';

    // Regla 5 de Consolidación: Neutralizar transferencias internas
    // Reconocer ÚNICAMENTE ventas externas a terceros en F_VentasHacienda
    const ingresos_netos_totales = this.state.F_VentasHacienda.reduce(
      (acc, v) => acc + (Number(v.venta_neta) || 0),
      0
    );

    // Suma de insumos y servicios reales externos acumulados
    let costos_directos_totales = 0;
    for (const sub of this.state.D_Subunidad) {
      const margen = this.getMargenSubunidad(sub.id_subunidad, id_campana);
      costos_directos_totales += margen.costos_directos_reales;
    }

    const margen_bruto_consolidado = Number((ingresos_netos_totales - costos_directos_totales).toFixed(2));
    const porcentaje_sobre_costos_consolidado = costos_directos_totales > 0
      ? Number(((margen_bruto_consolidado / costos_directos_totales) * 100).toFixed(2))
      : 0;

    // Transferencias internas neutralizadas (movimientos inter-subunidad)
    const transferenciasInternas = this.state.F_MovimientosHacienda.filter(
      m => m.tipo_movimiento === 'Traslado Inter-Subunidad' && m.id_subunidad_origen && m.id_subunidad_destino
    ).length;

    return {
      id_campana: id_campana || 1,
      nombre_campana,
      ingresos_netos_totales: Number(ingresos_netos_totales.toFixed(2)),
      costos_directos_totales: Number(costos_directos_totales.toFixed(2)),
      margen_bruto_consolidado,
      porcentaje_sobre_costos_consolidado,
      desvio_rendimiento_consolidado_kg: 0,
      desvio_consumo_consolidado_economico: 0,
      transferencias_internas_neutralizadas: transferenciasInternas,
    };
  }

  // ==========================================================================
  // PANTALLA DE CONTROL DE INTEGRIDAD (SECCIÓN 4.1)
  // Audita la coherencia sin alterar datos directamente
  // ==========================================================================

  public runIntegrityAudit(): ErrorIntegridad[] {
    const errors: ErrorIntegridad[] = [];

    // 1. Validar FKs de D_Subunidad -> D_UnidadNeg
    for (const sub of this.state.D_Subunidad) {
      if (!this.state.D_UnidadNeg.some(u => u.id_unidad_neg === sub.id_unidad_neg)) {
        errors.push({
          id: `FK-SUB-${sub.id_subunidad}`,
          regla: 'Relación 1: D_UnidadNeg -> D_Subunidad',
          tabla: 'D_Subunidad',
          id_registro: sub.id_subunidad,
          descripcion: `La subunidad '${sub.nombre}' referencia una unidad de negocio inexistente (ID ${sub.id_unidad_neg}).`,
          severidad: 'CRITICO',
        });
      }
    }

    // 2. Validar FKs de D_Insumo -> D_UM y D_Cuenta
    for (const ins of this.state.D_Insumo) {
      if (!this.state.D_UM.some(u => u.id_um === ins.id_um_consumo)) {
        errors.push({
          id: `FK-INS-UM-${ins.id_insumo}`,
          regla: 'Relación 7: D_UM -> D_Insumo',
          tabla: 'D_Insumo',
          id_registro: ins.id_insumo,
          descripcion: `El insumo '${ins.nombre}' referencia una unidad de medida inexistente (ID ${ins.id_um_consumo}).`,
          severidad: 'CRITICO',
        });
      }
      if (!this.state.D_Cuenta.some(c => c.id_cuenta === ins.id_cuenta_costo)) {
        errors.push({
          id: `FK-INS-CTA-${ins.id_insumo}`,
          regla: 'Relación 8: D_Cuenta -> D_Insumo',
          tabla: 'D_Insumo',
          id_registro: ins.id_insumo,
          descripcion: `El insumo '${ins.nombre}' referencia una cuenta contable inexistente ('${ins.id_cuenta_costo}').`,
          severidad: 'CRITICO',
        });
      }
    }

    // 3. Validar caravanas duplicadas en D_HaciendaIndividual
    const visuales = new Map<string, number>();
    const rfids = new Map<string, number>();
    for (const ind of this.state.D_HaciendaIndividual) {
      const v = ind.caravana_visual?.trim().toUpperCase();
      if (v) {
        if (visuales.has(v)) {
          errors.push({
            id: `DUP-VIS-${ind.id_hacienda}`,
            regla: 'Unicidad de Caravana Visual',
            tabla: 'D_HaciendaIndividual',
            id_registro: ind.id_hacienda,
            descripcion: `Caravana visual '${v}' duplicada en los IDs ${visuales.get(v)} y ${ind.id_hacienda}.`,
            severidad: 'CRITICO',
          });
        } else {
          visuales.set(v, ind.id_hacienda);
        }
      }

      const r = ind.caravana_rfid?.trim().toUpperCase();
      if (r) {
        if (rfids.has(r)) {
          errors.push({
            id: `DUP-RFID-${ind.id_hacienda}`,
            regla: 'Unicidad de Caravana RFID',
            tabla: 'D_HaciendaIndividual',
            id_registro: ind.id_hacienda,
            descripcion: `Caravana RFID '${r}' duplicada en los IDs ${rfids.get(r)} y ${ind.id_hacienda}.`,
            severidad: 'CRITICO',
          });
        } else {
          rfids.set(r, ind.id_hacienda);
        }
      }
    }

    // 4. Validar stocks negativos de insumos
    for (const ins of this.state.D_Insumo) {
      const stock = this.getStockInsumo(ins.id_insumo);
      if (stock.disponible < 0) {
        errors.push({
          id: `STK-NEG-${ins.id_insumo}`,
          regla: 'Imposibilidad de Stocks Negativos',
          tabla: 'F_ConsumosReales / F_ComprasInsumos',
          id_registro: ins.id_insumo,
          descripcion: `El insumo '${ins.nombre}' presenta saldo negativo en almacén (${stock.disponible.toFixed(2)}). Total entradas: ${stock.entradas}, Total salidas: ${stock.salidas}.`,
          severidad: 'CRITICO',
        });
      }
    }

    // 5. Validar uq_rinde_campana_subunidad
    const rindeKey = new Set<string>();
    for (const r of this.state.P_EstandarRinde) {
      const key = `${r.id_campana}-${r.id_subunidad}`;
      if (rindeKey.has(key)) {
        errors.push({
          id: `UQ-RINDE-${r.id_param_rinde}`,
          regla: 'CONSTRAINT uq_rinde_campana_subunidad',
          tabla: 'P_EstandarRinde',
          id_registro: r.id_param_rinde,
          descripcion: `Múltiples metas de rendimiento para Campaña ${r.id_campana} y Subunidad ${r.id_subunidad}.`,
          severidad: 'CRITICO',
        });
      } else {
        rindeKey.add(key);
      }
    }

    // 6. Validar uq_dosis_tecnica
    const dosisKey = new Set<string>();
    for (const d of this.state.P_DosisTecnica) {
      const key = `${d.id_campana}-${d.id_subunidad}-${d.id_categoria}-${d.id_insumo}`;
      if (dosisKey.has(key)) {
        errors.push({
          id: `UQ-DOSIS-${d.id_dosis_tecnica}`,
          regla: 'CONSTRAINT uq_dosis_tecnica',
          tabla: 'P_DosisTecnica',
          id_registro: d.id_dosis_tecnica,
          descripcion: `Dosis técnica duplicada para Campaña ${d.id_campana}, Subunidad ${d.id_subunidad}, Categoría ${d.id_categoria}, Insumo ${d.id_insumo}.`,
          severidad: 'CRITICO',
        });
      } else {
        dosisKey.add(key);
      }
    }

    return errors;
  }

  // ==========================================================================
  // SINCRONIZACIÓN Y EXPORTACIÓN GOOGLE SHEETS
  // ==========================================================================

  public generateGoogleSheetsSchemaGuide(): { sheetName: string; columns: string[]; sampleRow: string[] }[] {
    return [
      { sheetName: 'D_UnidadNeg', columns: ['id_unidad_neg', 'nombre', 'descripcion', 'activo'], sampleRow: ['1', 'Bovinos', 'Actividad pecuaria ciclo completo', 'VERDADERO'] },
      { sheetName: 'D_Subunidad', columns: ['id_subunidad', 'id_unidad_neg', 'nombre', 'rango_peso_referencia', 'descripcion', 'activo'], sampleRow: ['1', '1', 'Cría', '0 a 150 kg', 'Lactancia al pie de la madre', 'VERDADERO'] },
      { sheetName: 'D_CategoriaHacienda', columns: ['id_categoria', 'id_unidad_neg', 'nombre', 'clasificacion_contable', 'sexo_esperado', 'activo'], sampleRow: ['1', '1', 'Vacas', 'Activo Productor', 'Hembra', 'VERDADERO'] },
      { sheetName: 'D_UM', columns: ['id_um', 'codigo', 'nombre'], sampleRow: ['1', 'kg', 'Kilogramos'] },
      { sheetName: 'D_Cuenta', columns: ['id_cuenta', 'codigo', 'nombre', 'grupo', 'activo'], sampleRow: ['4.1.01', '4.1.01', 'Ventas de Hacienda Bovina', '4.1 Ingresos', 'VERDADERO'] },
      { sheetName: 'D_Insumo', columns: ['id_insumo', 'codigo', 'nombre', 'tipo', 'id_um_consumo', 'id_cuenta_costo', 'stock_minimo_alerta', 'activo'], sampleRow: ['1', 'AL-MAIZ', 'Grano de maíz', 'Alimento', '1', '5.1.01', '1000', 'VERDADERO'] },
      { sheetName: 'D_Campana', columns: ['id_campana', 'nombre', 'fecha_inicio', 'fecha_fin', 'activa'], sampleRow: ['1', 'Campaña 2025/2026', '2025-07-01', '2026-06-30', 'VERDADERO'] },
      { sheetName: 'D_HaciendaIndividual', columns: ['id_hacienda', 'caravana_visual', 'caravana_rfid', 'sexo', 'fecha_nacimiento', 'peso_al_nacer_kg', 'id_padre', 'id_madre', 'raza', 'id_categoria_actual', 'id_subunidad_actual', 'estado_actual', 'observaciones'], sampleRow: ['1', 'AR-101', '982000412345678', 'Macho', '2024-09-15', '38.5', '', '', 'Angus Negro', '11', '1', 'Activo', 'Toro cabaña'] },
      { sheetName: 'D_TropaLote', columns: ['id_tropa', 'codigo_tropa', 'nombre', 'id_subunidad', 'cantidad_cabezas_inicial', 'fecha_ingreso', 'estado', 'observaciones'], sampleRow: ['1', 'TR-REC-26-01', 'Tropa Recría Otoño', '2', '50', '2026-03-01', 'En Curso', 'Alfalfa lote 4'] },
      { sheetName: 'P_EstandarRinde', columns: ['id_param_rinde', 'id_campana', 'id_subunidad', 'adpv_estandar_kg_dia', 'dias_permanencia_teoricos', 'kg_ganados_proyectados_cab'], sampleRow: ['1', '1', '4', '1.35', '90', '121.5'] },
      { sheetName: 'P_DosisTecnica', columns: ['id_dosis_tecnica', 'id_campana', 'id_subunidad', 'id_categoria', 'id_insumo', 'dosis_teorica_cab_dia', 'dosis_es_diaria', 'observaciones_protocolo'], sampleRow: ['1', '1', '4', '10', '1', '7.5', 'VERDADERO', 'Maíz entero racionamiento'] },
      { sheetName: 'F_MovimientosHacienda', columns: ['id_movimiento', 'fecha', 'tipo_movimiento', 'id_hacienda', 'id_tropa', 'cantidad_cabezas', 'id_subunidad_origen', 'id_subunidad_destino', 'id_categoria_origen', 'id_categoria_destino', 'peso_total_kg', 'peso_promedio_kg', 'remito_guia', 'motivo_observaciones'], sampleRow: ['1', '2026-03-10', 'Destete', '1', '', '1', '1', '2', '6', '8', '160', '160', 'REM-001', 'Pesada de destete'] },
      { sheetName: 'F_ConsumosReales', columns: ['id_consumo', 'fecha', 'id_subunidad', 'id_tropa', 'id_insumo', 'cantidad_fisica_real', 'comprobante_remito', 'observaciones'], sampleRow: ['1', '2026-03-12', '4', '1', '1', '375', 'VALE-101', 'Suministro mixer corral'] },
      { sheetName: 'F_SanidadReal', columns: ['id_sanidad', 'fecha', 'id_subunidad', 'id_tropa', 'id_hacienda', 'id_insumo', 'dosis_real_total', 'acta_vacunacion_senasa', 'profesional_veterinario', 'costo_profesional_honorarios', 'observaciones'], sampleRow: ['1', '2026-03-15', '4', '1', '', '8', '50', 'ACTA-SENASA-2026-99', 'Dr. Pérez MP 4521', '45000', 'Campaña antiaftosa obligatoria'] },
      { sheetName: 'F_ComprasInsumos', columns: ['id_compra', 'fecha', 'id_insumo', 'cantidad', 'precio_unitario_real', 'importe_total', 'tipo_origen', 'numero_comprobante', 'proveedor_o_unidad_origen'], sampleRow: ['1', '2026-03-01', '1', '15000', '180.50', '2707500', 'Compra Externa a Proveedor', 'FAC-A-0001-000452', 'Cooperativa Agropecuaria'] },
      { sheetName: 'F_PesadasControl', columns: ['id_pesada', 'fecha', 'id_subunidad', 'id_tropa', 'id_hacienda', 'peso_vivo_kg', 'cantidad_cabezas', 'peso_promedio_kg', 'dias_desde_pesada_anterior', 'adpv_registrado_kg_dia', 'observaciones'], sampleRow: ['1', '2026-03-25', '4', '1', '', '18500', '50', '370', '30', '1.25', 'Balanza de corral'] },
      { sheetName: 'F_VentasHacienda', columns: ['id_venta', 'fecha', 'id_subunidad', 'id_tropa', 'id_categoria', 'id_cuenta_ingreso', 'cabezas', 'kilos_vivos_totales', 'precio_por_kg_real', 'ingreso_bruto_venta', 'comision_consignatario', 'flete_camion_jaula', 'derechos_pista_pesaje', 'aranceles_senasa_dte', 'otras_tasas_feriales', 'total_gastos_comerciales', 'venta_neta', 'alicuota_iva', 'iva_liquidado', 'retenciones_fiscales', 'neto_a_cobrar', 'numero_liquidacion_dte', 'consignatario_comprador'], sampleRow: ['1', '2026-04-10', '4', '1', '10', '4.1.01', '45', '18900', '2150.00', '40635000', '1219050', '850000', '250000', '120000', '65000', '2504050', '38130950', '0.105', '4266675', '609525', '41788100', 'LIQ-CONSIG-8812', 'Consignataria del Sur S.A.'] },
      { sheetName: 'F_CostosIndirectos', columns: ['id_costo_indirecto', 'fecha', 'concepto', 'id_cuenta_costo', 'importe_total_erogacion', 'id_subunidad', 'coeficiente_prorrateo', 'importe_asignado_subunidad', 'comprobante_factura'], sampleRow: ['1', '2026-03-31', 'Gasoil tractor mixer', '5.5', '450000', '4', '0.60', '270000', 'FAC-B-1122'] },
      { sheetName: 'S_Usuarios', columns: ['id_usuario', 'usuario', 'contrasena', 'nombre', 'rol', 'activo'], sampleRow: ['1', 'admin', 'admin2026', 'Administrador Pozo del Carril', 'Administrador', 'VERDADERO'] },
      { sheetName: 'S_Auditoria', columns: ['id', 'fecha_hora', 'usuario', 'tabla_afectada', 'id_registro', 'accion', 'valor_anterior', 'valor_nuevo', 'detalle'], sampleRow: ['1', '2026-03-01T10:00:00.000Z', 'admin', 'D_Insumo', '1', 'ALTA', '', '', 'Alta de insumo inicial'] },
    ];
  }

  // Exportar tabla a CSV
  public exportTableToCSV(tableName: keyof DatabaseState): string {
    const data = this.state[tableName] as any[];
    if (!data || data.length === 0) {
      const guide = this.generateGoogleSheetsSchemaGuide().find(g => g.sheetName === tableName);
      return guide ? guide.columns.join(',') : '';
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  // Carga manual / sincronización desde JSON de Google Sheets
  public syncFromSheets(payload: Partial<DatabaseState>): { success: boolean; message: string } {
    let count = 0;
    (Object.keys(payload) as (keyof DatabaseState)[]).forEach(k => {
      if (Array.isArray(payload[k])) {
        // @ts-ignore
        this.state[k] = payload[k];
        count++;
      }
    });
    this.persist();
    this.logAuditoria('GoogleSheets', 'ALL', 'MODIFICACION', `Sincronización manual de ${count} tablas desde Google Sheets.`);
    return { success: true, message: `Sincronización completada con éxito. Se actualizaron ${count} tablas.` };
  }

  // ==========================================================================
  // MÓDULO COTIZACIONES DINÁMICAS DE MERCADO (CLAUDE GAS)
  // ==========================================================================

  public getCotizacionVigente(id_categoria: number, id_subunidad: number): CotizacionVigente | null {
    const cat = this.state.D_CategoriaHacienda.find(c => c.id_categoria === id_categoria);
    const sub = this.state.D_Subunidad.find(s => s.id_subunidad === id_subunidad);
    if (!cat || !sub) return null;
    return cotizacionesService.getCotizacionParaCategoria(
      id_categoria,
      cat.nombre,
      id_subunidad,
      sub.nombre
    );
  }

  public getAllCotizacionesVigentes(): CotizacionVigente[] {
    const list: CotizacionVigente[] = [];
    for (const sub of this.state.D_Subunidad) {
      if (!sub.activo) continue;
      for (const cat of this.state.D_CategoriaHacienda) {
        if (!cat.activo || cat.id_unidad_neg !== sub.id_unidad_neg) continue;
        const cot = cotizacionesService.getCotizacionParaCategoria(
          cat.id_categoria,
          cat.nombre,
          sub.id_subunidad,
          sub.nombre
        );
        if (cot) list.push(cot);
      }
    }
    return list;
  }

  public getValuacionStockSubunidad(id_subunidad: number): ValuacionSubunidad {
    const sub = this.state.D_Subunidad.find(s => s.id_subunidad === id_subunidad);
    const nombre_subunidad = sub ? sub.nombre : `Subunidad ${id_subunidad}`;
    const desglose: DesgloseStockValuacion[] = [];
    const advertencias: string[] = [];
    let total_cabezas = 0;
    let total_kilos = 0;
    let valuacion_total = 0;

    // Calcular existencia por categoría en esta subunidad
    for (const cat of this.state.D_CategoriaHacienda) {
      if (sub && cat.id_unidad_neg !== sub.id_unidad_neg) continue;

      // Existencias físicas calculadas a partir de F_MovimientosHacienda
      let cabezasCat = 0;
      let kilosCat = 0;

      for (const m of this.state.F_MovimientosHacienda) {
        if (m.id_subunidad_destino === id_subunidad && m.id_categoria_destino === cat.id_categoria) {
          cabezasCat += Number(m.cantidad_cabezas) || 0;
          kilosCat += Number(m.peso_total_kg) || 0;
        }
        if (m.id_subunidad_origen === id_subunidad && m.id_categoria_origen === cat.id_categoria) {
          cabezasCat -= Number(m.cantidad_cabezas) || 0;
          kilosCat -= Number(m.peso_total_kg) || 0;
        }
      }

      if (cabezasCat <= 0) continue;

      const cot = cotizacionesService.getCotizacionParaCategoria(
        cat.id_categoria,
        cat.nombre,
        id_subunidad,
        nombre_subunidad
      );

      if (!cot || cot.precio_vigente <= 0) {
        advertencias.push(
          `Sin cotización de mercado disponible para categoría '${cat.nombre}' en '${nombre_subunidad}'. No se valúa con supuestos.`
        );
        continue;
      }

      const pesoProm = kilosCat > 0 && cabezasCat > 0 ? Number((kilosCat / cabezasCat).toFixed(1)) : 0;
      let val = 0;

      if (cot.unidad_medida === '$/animal') {
        val = cabezasCat * cot.precio_vigente;
      } else {
        // $/kg
        const kgParaValuar = kilosCat > 0 ? kilosCat : cabezasCat * (pesoProm || 350);
        val = kgParaValuar * cot.precio_vigente;
      }

      total_cabezas += cabezasCat;
      total_kilos += kilosCat;
      valuacion_total += val;

      desglose.push({
        id_categoria: cat.id_categoria,
        categoria_nombre: cat.nombre,
        cabezas: cabezasCat,
        peso_promedio_kg: pesoProm,
        kilos_totales: kilosCat,
        precio_unitario: cot.precio_vigente,
        unidad_medida: cot.unidad_medida,
        valuacion_total: Number(val.toFixed(2)),
        cotizacion: cot,
      });
    }

    return {
      id_subunidad,
      nombre_subunidad,
      total_cabezas,
      total_kilos,
      valuacion_total: Number(valuacion_total.toFixed(2)),
      desglose,
      advertencias,
    };
  }

  public getValuacionStockConsolidado(): {
    valuacion_total: number;
    total_cabezas: number;
    subunidades: ValuacionSubunidad[];
    advertencias: string[];
  } {
    const subunidades: ValuacionSubunidad[] = [];
    let valuacion_total = 0;
    let total_cabezas = 0;
    const advertencias: string[] = [];

    for (const sub of this.state.D_Subunidad) {
      if (Number(sub.id_unidad_neg) !== 1) continue; // Bovinos
      const val = this.getValuacionStockSubunidad(sub.id_subunidad);
      subunidades.push(val);
      valuacion_total += val.valuacion_total;
      total_cabezas += val.total_cabezas;
      if (val.advertencias.length > 0) {
        advertencias.push(...val.advertencias);
      }
    }

    return {
      valuacion_total: Number(valuacion_total.toFixed(2)),
      total_cabezas,
      subunidades,
      advertencias,
    };
  }

  public setAjusteManualPrecio(id_cat: number, id_sub: number, precio: number, motivo: string, usuario = 'admin') {
    cotizacionesService.setAjusteManual(id_cat, id_sub, precio, motivo, usuario);
    this.logAuditoria(
      'Cotizaciones',
      id_cat,
      'MODIFICACION',
      `Ajuste manual de precio cat ${id_cat} sub ${id_sub}: $${precio}. Motivo: ${motivo}`
    );
    this.notify();
  }

  public revertirAjusteManualPrecio(id_cat: number, id_sub: number) {
    cotizacionesService.revertirAjusteManual(id_cat, id_sub);
    this.logAuditoria('Cotizaciones', id_cat, 'MODIFICACION', `Reversión a precio dinámico de mercado cat ${id_cat} sub ${id_sub}`);
    this.notify();
  }

  public async fetchAndSyncCotizaciones(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/sheets/cotizaciones');
      const data = await res.json();
      if (data.success) {
        cotizacionesService.updateFromSheets({
          canuelas: data.data?.canuelas || data.canuelas,
          invernada: data.data?.invernada || data.invernada,
          cria: data.data?.cria || data.cria,
          source: data.source || 'Google Sheets Webhook (Claude)',
        });
        this.notify();
        return { success: true, message: 'Cotizaciones de mercado actualizadas desde Google Sheets.' };
      }
      return { success: false, error: data.error || 'No se pudieron leer las cotizaciones.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de conexión.' };
    }
  }

  public getIndicadoresMercado() {
    return cotizacionesService.getIndicadoresMercado();
  }

  public getRawCotizaciones() {
    return {
      canuelas: cotizacionesService.getRawCanuelas(),
      invernada: cotizacionesService.getRawInvernada(),
      cria: cotizacionesService.getRawCria(),
      lastSync: cotizacionesService.getLastSync(),
    };
  }
}

export const db = new DatabaseEngine();
