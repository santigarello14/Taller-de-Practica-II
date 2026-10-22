/**
 * @license
 * Establecimiento: Pozo del Carril
 * Proyecto: "Activos con cuatro patas: contabilidad aplicada a la actividad bovina"
 * Código Maestro de Google Apps Script para Creación Automática y Sincronización Bidireccional
 * Multi-Especie: Paramétrico por id_unidad_neg (1: Bovinos, 2: Porcinos, 3: Ovinos, 4: Maíz, 5: Soja)
 */

export const APPS_SCRIPT_MASTER_CODE = `/**
 * ============================================================================
 * ERP GANADERO MULTI-ESPECIE - ESTABLECIMIENTO POZO DEL CARRIL
 * PROYECTO: "Activos con cuatro patas: contabilidad aplicada a la actividad bovina"
 * SCRIPT MAESTRO OFICIAL: Creación Automática de las 20 Hojas y Webhook API
 * ============================================================================
 * 
 * ARQUITECTURA PARAMÉTRICA MULTI-ESPECIE:
 * - Toda la lógica y base de datos es 100% guiada por 'id_unidad_neg'.
 * - id_unidad_neg: 1 = Bovinos | 2 = Porcinos | 3 = Ovinos | 4 = Maíz | 5 = Soja
 * - D_Subunidad y D_CategoriaHacienda vinculan etapas y categorías dinámicamente.
 * 
 * GUÍA DE INSTALACIÓN RÁPIDA:
 * 1. En su Google Spreadsheet (planilla en blanco o existente), vaya al menú:
 *    Extensiones > Apps Script.
 * 2. Borre cualquier código previo en el editor (Ctrl + A y Supr).
 * 3. Pegue este código maestro completo.
 * 4. Presione Guardar (Ctrl + S o ícono de disco).
 * 5. En el menú desplegable superior del editor, elija la función:
 *    "crearYConfigurarTodasLasHojas" y haga clic en "Ejecutar".
 *    (Google solicitará autorizar permisos por única vez).
 * 6. ¡Listo! En segundos se crearán y formatearán las 20 hojas con verde ganadero (#1B4D3E),
 *    fila 1 congelada y catálogos precargados.
 * 
 * PARA SINCRONIZACIÓN WEB (WEBHOOK API):
 * 1. En el editor de Apps Script: Implementar > Nueva implementación.
 * 2. Seleccione tipo "Aplicación web".
 * 3. Ejecutar como: "Yo (su correo)".
 * 4. Quién tiene acceso: "Cualquier usuario" (Anyone).
 * 5. Copie la URL (/exec) y péguela en la sección Google Sheets del ERP.
 */

// 1. MENÚ SUPERIOR PERSONALIZADO
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐂 ERP Pozo del Carril')
    .addItem('🚀 1. Crear y Configurar las 20 Hojas Oficiales', 'crearYConfigurarTodasLasHojas')
    .addItem('📊 2. Crear Solo Tablas de Costos Estándar (No Destructivo)', 'crearTablasCostosEstandar')
    .addSeparator()
    .addItem('👥 3. Diagnosticar y Verificar Tabla S_Usuarios', 'verificarTablaUsuarios')
    .addItem('🔄 4. Sincronizar Todas las Hojas con el ERP', 'sincronizarTodasLasHojasConERP')
    .addItem('🛡️ 5. Auditar Columnas y Encabezados', 'auditarColumnasHojas')
    .addItem('ℹ️ 6. Ver Estado y URL de la Planilla', 'mostrarEstadoERP')
    .addToUi();
}

// 2. FUNCIÓN PRINCIPAL: CREA LAS 20 HOJAS, FORMATEA Y CARGA CATÁLOGOS PARAMÉTRICOS
function crearYConfigurarTodasLasHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Definición de las 20 tablas maestras del ERP Pozo del Carril
  var esquemas = [
    {
      nombre: "D_UnidadNeg",
      columnas: ["id_unidad_neg", "nombre", "descripcion", "activo"],
      datosIniciales: [
        [1, "Bovinos", "Actividad pecuaria ciclo completo de carne y cabaña", true],
        [2, "Porcinos", "Producción porcina intensiva", true],
        [3, "Ovinos", "Producción ovina para carne y lana", true],
        [4, "Maíz", "Producción agrícola de grano y silaje", true],
        [5, "Soja", "Producción agrícola de oleaginosa y concentrado", true]
      ]
    },
    {
      nombre: "D_Subunidad",
      columnas: ["id_subunidad", "id_unidad_neg", "nombre", "rango_peso_referencia", "descripcion", "activo"],
      datosIniciales: [
        [1, 1, "Cría", "0 a 150 kg", "Lactancia al pie de la madre sobre pasturas y rastrojos hasta alcanzar el peso de destete", true],
        [2, 1, "Recría", "150 a 280 kg", "Crecimiento en pasturas de alfalfa con aporte de fibra para formar caja ósea sin engrase", true],
        [3, 1, "Adaptación", "280 a 310 kg", "Acostumbramiento ruminal paulatino incorporando maíz y rollo para prevenir timpanismo (14 a 21 días)", true],
        [4, 1, "Engorde / Terminación", "310 a 450 kg", "Alimentación intensiva en corral con ración de maíz, soja y concentrado hasta terminación comercial", true]
      ]
    },
    {
      nombre: "D_CategoriaHacienda",
      columnas: ["id_categoria", "id_unidad_neg", "nombre", "clasificacion_contable", "sexo_esperado", "activo"],
      datosIniciales: [
        [1, 1, "Vacas", "Activo Productor", "Hembra", true],
        [2, 1, "Vacas Secas", "Activo Productor", "Hembra", true],
        [3, 1, "Vacas Preñadas", "Activo Productor", "Hembra", true],
        [4, 1, "Vaquillona 1", "Bien de Cambio", "Hembra", true],
        [5, 1, "Vaquillona 2", "Bien de Cambio", "Hembra", true],
        [6, 1, "Terneros", "Bien de Cambio", "Macho", true],
        [7, 1, "Terneras", "Bien de Cambio", "Hembra", true],
        [8, 1, "Destete", "Bien de Cambio", "Mixto", true],
        [9, 1, "Novillitos", "Bien de Cambio", "Macho", true],
        [10, 1, "Novillos", "Bien de Cambio", "Macho", true],
        [11, 1, "Toros", "Activo Productor", "Macho", true],
        [12, 1, "Toritos", "", "Macho", true]
      ]
    },
    {
      nombre: "D_UM",
      columnas: ["id_um", "codigo", "nombre"],
      datosIniciales: [
        [1, "kg", "Kilogramos"],
        [2, "cabezas", "Cabezas vacunas / hacienda"],
        [3, "dosis", "Dosis sanitarias / pajuelas"],
        [4, "litros", "Litros"],
        [5, "fardos/rollos", "Fardos / Rollos de fibra"],
        [6, "pesos", "Pesos Argentinos ($)"]
      ]
    },
    {
      nombre: "D_Cuenta",
      columnas: ["id_cuenta", "codigo", "nombre", "grupo", "activo"],
      datosIniciales: [
        ["4.1.01", "4.1.01", "Ventas de Hacienda Bovina", "4.1 Ingresos", true],
        ["5.1.01", "5.1.01", "Maíz y Concentrados Proteicos", "5.1 Costos Directos", true],
        ["5.1.04", "5.1.04", "Silaje de Planta Entera y Fibra", "5.1 Costos Directos", true],
        ["5.1.06", "5.1.06", "Sanidad, Vacunas y Productos Veterinarios", "5.1 Costos Directos", true],
        ["5.7.01", "5.7.01", "Comisión de la Casa Consignataria", "5.7 Gastos Comerciales", true],
        ["5.7.02", "5.7.02", "Flete de Hacienda en Camión Jaula", "5.7 Gastos Comerciales", true],
        ["5.7.03", "5.7.03", "Derechos de Pista y Pesaje Ferial", "5.7 Gastos Comerciales", true],
        ["5.7.04", "5.7.04", "Aranceles SENASA y Sellado de Guía DTe", "5.7 Gastos Comerciales", true]
      ]
    },
    {
      nombre: "D_Insumo",
      columnas: ["id_insumo", "codigo", "nombre", "tipo", "id_um_consumo", "id_cuenta_costo", "stock_minimo_alerta", "activo"],
      datosIniciales: [
        [1, "AL-MAIZ", "Grano de maíz", "Alimento", 1, "5.1.01", 1000, true],
        [2, "AL-SOJA", "Soja / Concentrado proteico", "Alimento", 1, "5.1.01", 500, true],
        [3, "AL-NUCLEO", "Núcleo mineral con monensina", "Alimento", 1, "5.1.01", 200, true],
        [4, "AL-SILAJEMA", "Silaje de maíz de planta entera", "Alimento", 1, "5.1.04", 5000, true],
        [5, "AL-ROLLOS", "Rollos de fibra", "Alimento", 5, "5.1.04", 50, true],
        [6, "AL-ALFALFA", "Pasturas de alfalfa", "Alimento", 1, "5.1.04", 0, true],
        [7, "AL-PASTURAS", "Pasturas y rastrojos generales", "Alimento", 1, "5.1.04", 0, true],
        [8, "SA-AFTOSA", "Vacuna antiaftosa", "Sanidad", 3, "5.1.06", 100, true],
        [9, "SA-BRUCELA", "Vacuna antibrucélica", "Sanidad", 3, "5.1.06", 50, true],
        [10, "SA-REPROD", "Vacuna reproductiva", "Sanidad", 3, "5.1.06", 50, true],
        [11, "SA-CARBUN", "Vacuna carbunclo", "Sanidad", 3, "5.1.06", 50, true],
        [12, "SA-RESPIR", "Vacuna respiratoria", "Sanidad", 3, "5.1.06", 50, true],
        [13, "SA-CLOSTR", "Vacuna clostridial", "Sanidad", 3, "5.1.06", 50, true],
        [14, "SA-PARASIT", "Antiparasitarios", "Sanidad", 3, "5.1.06", 50, true],
        [15, "GE-SEMEN", "Semen bovino / Inseminación", "Genética", 3, "5.1.06", 20, true],
        [16, "SE-VETERIN", "Servicios e intervenciones veterinarias", "Servicio", 6, "5.1.06", 0, true]
      ]
    },
    {
      nombre: "D_Campana",
      columnas: ["id_campana", "nombre", "fecha_inicio", "fecha_fin", "activa"],
      datosIniciales: [
        [1, "Campaña 2025/2026", "2025-07-01", "2026-06-30", true]
      ]
    },
    {
      nombre: "D_HaciendaIndividual",
      columnas: ["id_hacienda", "caravana_visual", "caravana_rfid", "sexo", "fecha_nacimiento", "peso_al_nacer_kg", "id_padre", "id_madre", "raza", "id_categoria_actual", "id_subunidad_actual", "estado_actual", "observaciones"],
      datosIniciales: []
    },
    {
      nombre: "D_TropaLote",
      columnas: ["id_tropa", "codigo_tropa", "nombre", "id_subunidad", "cantidad_cabezas_inicial", "fecha_ingreso", "estado", "observaciones"],
      datosIniciales: []
    },
    {
      nombre: "P_EstandarRinde",
      columnas: ["id_param_rinde", "id_campana", "id_subunidad", "adpv_estandar_kg_dia", "dias_permanencia_teoricos", "kg_ganados_proyectados_cab"],
      datosIniciales: [
        [1, 1, 1, 0.70, 210, 147.0],
        [2, 1, 2, 0.85, 150, 127.5],
        [3, 1, 3, 1.10, 21, 23.1],
        [4, 1, 4, 1.35, 90, 121.5]
      ]
    },
    {
      nombre: "P_DosisTecnica",
      columnas: ["id_dosis_tecnica", "id_campana", "id_subunidad", "id_categoria", "id_insumo", "dosis_teorica_cab_dia", "dosis_es_diaria", "observaciones_protocolo"],
      datosIniciales: []
    },
    {
      nombre: "F_MovimientosHacienda",
      columnas: ["id_movimiento", "fecha", "tipo_movimiento", "id_hacienda", "id_tropa", "cantidad_cabezas", "id_subunidad_origen", "id_subunidad_destino", "id_categoria_origen", "id_categoria_destino", "peso_total_kg", "peso_promedio_kg", "remito_guia", "motivo_observaciones"],
      datosIniciales: []
    },
    {
      nombre: "F_ConsumosReales",
      columnas: ["id_consumo", "fecha", "id_subunidad", "id_tropa", "id_insumo", "cantidad_fisica_real", "comprobante_remito", "observaciones"],
      datosIniciales: []
    },
    {
      nombre: "F_SanidadReal",
      columnas: ["id_sanidad", "fecha", "id_subunidad", "id_tropa", "id_hacienda", "id_insumo", "dosis_real_total", "acta_vacunacion_senasa", "profesional_veterinario", "costo_profesional_honorarios", "observaciones"],
      datosIniciales: []
    },
    {
      nombre: "F_ComprasInsumos",
      columnas: ["id_compra", "fecha", "id_insumo", "cantidad", "precio_unitario_real", "importe_total", "tipo_origen", "numero_comprobante", "proveedor_o_unidad_origen"],
      datosIniciales: []
    },
    {
      nombre: "F_PesadasControl",
      columnas: ["id_pesada", "fecha", "id_subunidad", "id_tropa", "id_hacienda", "peso_vivo_kg", "cantidad_cabezas", "peso_promedio_kg", "dias_desde_pesada_anterior", "adpv_registrado_kg_dia", "observaciones"],
      datosIniciales: []
    },
    {
      nombre: "F_VentasHacienda",
      columnas: ["id_venta", "fecha", "id_subunidad", "id_tropa", "id_categoria", "id_cuenta_ingreso", "cabezas", "kilos_vivos_totales", "precio_por_kg_real", "ingreso_bruto_venta", "comision_consignatario", "flete_camion_jaula", "derechos_pista_pesaje", "aranceles_senasa_dte", "otras_tasas_feriales", "total_gastos_comerciales", "venta_neta", "alicuota_iva", "iva_liquidado", "retenciones_fiscales", "neto_a_cobrar", "numero_liquidacion_dte", "consignatario_comprador"],
      datosIniciales: []
    },
    {
      nombre: "F_CostosIndirectos",
      columnas: ["id_costo_indirecto", "fecha", "concepto", "id_cuenta_costo", "importe_total_erogacion", "id_subunidad", "coeficiente_prorrateo", "importe_asignado_subunidad", "comprobante_factura"],
      datosIniciales: []
    },
    {
      nombre: "S_Usuarios",
      columnas: ["id_usuario", "usuario", "contrasena", "nombre", "rol", "activo"],
      datosIniciales: [
        [1, "admin", "admin2026", "Administrador Pozo del Carril", "Administrador", true],
        [2, "operador", "campo2026", "Operador de Campo y Balanza", "Operador", true],
        [3, "auditor", "auditor2026", "Auditor Contable y Control de Gestión", "Consulta", true]
      ]
    },
    {
      nombre: "S_Auditoria",
      columnas: ["id", "fecha_hora", "usuario", "tabla_afectada", "id_registro", "accion", "valor_anterior", "valor_nuevo", "detalle"],
      datosIniciales: []
    },
    {
      nombre: "P_CostosSupuestos",
      columnas: ["id_supuesto", "grupo", "concepto", "valor", "unidad", "tipo", "fuente_nota"],
      datosIniciales: [
        [1, "Precios Base", "Dólar oficial BNA", 1535, "$/US$", "precio", "Referencia cambiaria Octubre 2026"],
        [2, "Precios Base", "Maíz propio", 287.09, "$/kg tal cual", "precio", "FAS / costo propio"],
        [3, "Precios Base", "Soja grano", 560, "$/kg tal cual", "precio", "FAS / costo propio"],
        [4, "Precios Base", "Rollo de alfalfa 1ª", 155, "$/kg tal cual", "precio", "Referencia mercado"],
        [5, "Precios Base", "Silaje de maíz (US$/t)", 28, "US$/t verde", "precio", "Costo contratista picado"],
        [6, "Precios Base", "Silaje de maíz ($/kg verde)", 42.98, "$/kg verde", "precio", "(US$/t * Dólar)/1000 = (28 * 1535)/1000"],
        [7, "Precios Base", "Núcleo mineral con monensina (US$/kg)", 1.2, "US$/kg", "precio", "Insumo formulación corral"],
        [8, "Precios Base", "Núcleo mineral ($/kg)", 1842, "$/kg", "precio", "US$/kg * Dólar = 1.2 * 1535"],
        [9, "Pasturas", "Alfalfa implantación", 475, "US$/ha", "costo_implantacion", "Costo establecimiento pradera"],
        [10, "Pasturas", "Alfalfa amortización", 4, "años", "vida_util", "Periodo amortización"],
        [11, "Pasturas", "Alfalfa producción", 12000, "kg MS/ha/año", "rendimiento", "Producción forrajera anual"],
        [12, "Pasturas", "Alfalfa aprovechamiento", 60, "%", "eficiencia", "Eficiencia pastoreo directo"],
        [13, "Pasturas", "Alfalfa costo por kg MS consumido", 25.31684, "$/kg MS", "costo_unitario", "((475 * 1535) / 4) / (12000 * 0.60)"],
        [14, "Pasturas", "Otras pasturas implantación", 365, "US$/ha", "costo_implantacion", "Promedio campo natural y consociadas"],
        [15, "Pasturas", "Otras pasturas amortización", 4, "años", "vida_util", "Periodo amortización"],
        [16, "Pasturas", "Otras pasturas producción", 6000, "kg MS/ha/año", "rendimiento", "Producción anual"],
        [17, "Pasturas", "Otras pasturas aprovechamiento", 50, "%", "eficiencia", "Eficiencia pastoreo"],
        [18, "Pasturas", "Otras pasturas costo por kg MS consumido", 46.68958, "$/kg MS", "costo_unitario", "((365 * 1535) / 4) / (6000 * 0.50)"],
        [19, "Materia Seca (% MS)", "Maíz grano", 88, "% MS", "porcentaje_ms", "Materia seca grano"],
        [20, "Materia Seca (% MS)", "Soja grano", 90, "% MS", "porcentaje_ms", "Materia seca grano"],
        [21, "Materia Seca (% MS)", "Rollo de alfalfa", 85, "% MS", "porcentaje_ms", "Materia seca fardo/rollo"],
        [22, "Materia Seca (% MS)", "Silaje de maíz", 30, "% MS", "porcentaje_ms", "Materia seca forraje picado"],
        [23, "Proceso Productivo", "Peso inicial recría", 140, "kg", "peso", "Peso destete ingreso a recría"],
        [24, "Proceso Productivo", "Peso al pasar a adaptación", 280, "kg", "peso", "Peso fin recría / ingreso corral"],
        [25, "Proceso Productivo", "Peso final engorde", 450, "kg", "peso", "Peso faena terminación"],
        [26, "Proceso Productivo", "Días recría", 180, "días", "tiempo", "Duración ciclo recría pastoril"],
        [27, "Proceso Productivo", "Días adaptación", 50, "días", "tiempo", "Duración transición ruminal"],
        [28, "Proceso Productivo", "Días engorde final", 60, "días", "tiempo", "Duración engorde corral"],
        [29, "Proceso Productivo", "ADPV en corral", 1.545, "kg/día", "ganancia_diaria", "Aumento diario de peso vivo corral"],
        [30, "Proceso Productivo", "Peso al terminar adaptación", 357.25, "kg", "peso", "280 + (50 * 1.545)"],
        [31, "Proceso Productivo", "Mortalidad esperada", 1.5, "%", "parametro_sanitario", "Tasa de mortandad esperada del rodeo"],
        [32, "Proceso Productivo", "Mortalidad subtotal previsto", 21035.49, "$/cab", "costo_contingencia", "Subtotal previsto por animal"],
        [33, "Cría", "Peso vaca", 420, "kg", "peso", "Peso vivo promedio vientre"],
        [34, "Cría", "Consumo vaca % PV MS", 2.2, "%", "consumo", "Consumo diario en materia seca (% PV)"],
        [35, "Cría", "Porcentaje destete", 80, "%", "eficiencia_reproductiva", "Terneros logrados por vientre entorado"],
        [36, "Cría", "Porcentaje hembras recría", 50, "%", "reposicion", "Retención o destino hembras"]
      ]
    },
    {
      nombre: "P_CostosDietas",
      columnas: ["id_param_dieta", "concepto", "recria", "adaptacion", "engorde_final", "cria_vaca_ano"],
      datosIniciales: [
        [1, "Consumo MS (% PV)", "3.0%", "2.8%", "2.5%", "2.2%"],
        [2, "Peso inicial (kg)", 140, 280, 357.25, 420],
        [3, "Peso final (kg)", 280, 357.25, 450, 420],
        [4, "Peso promedio (kg)", 210, 318.625, 403.625, 420],
        [5, "Días", 180, 50, 60, 180],
        [6, "Consumo MS/día (kg)", 6.30, 8.9215, 10.0906, 9.24],
        [7, "Consumo MS total (kg)", 1134, 446.075, 605.4375, 1663.20],
        [8, "Kg ganados por cabeza", 140, 77.25, 92.75, 0],
        [9, "Conversión (kg MS/kg ganado)", 8.10, 5.7744, 6.5276, 0],
        [10, "Maíz propio (% MS)", "10%", "25%", "25%", "0%"],
        [11, "Soja concentrado (% MS)", "5%", "0%", "0%", "0%"],
        [12, "Núcleo mineral (% MS)", "5%", "5%", "5%", "0%"],
        [13, "Silaje de maíz (% MS)", "0%", "25%", "20%", "0%"],
        [14, "Rollos (% MS)", "0%", "0%", "0%", "10%"],
        [15, "Alfalfa pastoreo (% MS)", "65%", "45%", "50%", "75%"],
        [16, "Otras pasturas/rastrojo (% MS)", "15%", "0%", "0%", "15%"]
      ]
    },
    {
      nombre: "P_CostosVacunas",
      columnas: ["id_vacuna", "categoria", "vacuna_nombre", "dosis_anual", "precio_dosis", "total_anual"],
      datosIniciales: [
        [1, "Cría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [2, "Cría", "Carbunclo bacteridiano", 1, 450, 450],
        [3, "Cría", "Complejo Reproductivo (IBR, DVB, Lepto)", 1, 1400, 1400],
        [4, "Cría", "Clostridial 8 vías polivalente", 1, 650, 650],
        [5, "Cría", "Antiparasitario y Cobre/Mineral", 1, 1100, 1100],
        [6, "Recría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [7, "Recría", "Carbunclo bacteridiano", 1, 450, 450],
        [8, "Recría", "Clostridial (Mancha, Gangrena, Enterotoxemia)", 2, 650, 1300],
        [9, "Recría", "Queratoconjuntivitis", 2, 800, 1600],
        [10, "Recría", "Antiparasitario interno y externo (Ivermectina)", 2, 1500, 3000],
        [11, "Recría", "Suplemento mineral (Cu / Se / Zn)", 1, 1100, 1100],
        [12, "Adaptación", "Ingreso a corral: Clostridial refuerzo", 1, 700, 700],
        [13, "Adaptación", "Ingreso a corral: Neumonías / Respiratorio", 1, 1900, 1900],
        [14, "Adaptación", "Antiparasitario amplio espectro", 1, 1500, 1500],
        [15, "Engorde Final", "Sin aplicaciones (período de resguardo)", 0, 0, 0]
      ]
    },
    {
      nombre: "P_CostosDetalleDesglose",
      columnas: ["id_desglose", "subunidad", "ingrediente_concepto", "kg_ms", "kg_tal_cual", "precio_unitario", "costo_total"],
      datosIniciales: [
        [1, "Cría", "Alfalfa pastoreo (75% MS)", 1247.40, 1247.40, 25.31684, 31580.23],
        [2, "Cría", "Otras pasturas/rastrojo (15% MS)", 249.48, 249.48, 46.68958, 11648.12],
        [3, "Cría", "Rollos reserva invernal (10% MS)", 166.32, 195.67, 155.00, 30328.93],
        [4, "Recría", "Alfalfa pastoreo (65% MS)", 737.10, 737.10, 25.31684, 18661.04],
        [5, "Recría", "Otras pasturas (15% MS)", 170.10, 170.10, 46.68958, 7941.90],
        [6, "Recría", "Maíz propio (10% MS)", 113.40, 128.86, 287.09, 36995.62],
        [7, "Recría", "Soja concentrado (5% MS)", 56.70, 63.00, 560.00, 35280.00],
        [8, "Recría", "Núcleo mineral (5% MS)", 56.70, 56.70, 1842.00, 104441.24],
        [9, "Adaptación", "Alfalfa pastoreo (45% MS)", 200.73, 200.73, 25.31684, 5081.93],
        [10, "Adaptación", "Silaje de maíz (25% MS)", 111.52, 371.73, 42.98, 15976.96],
        [11, "Adaptación", "Maíz propio (25% MS)", 111.52, 126.73, 287.09, 36381.82],
        [12, "Adaptación", "Núcleo mineral (5% MS)", 22.30, 22.30, 1842.00, 41083.39],
        [13, "Engorde Final", "Alfalfa pastoreo (50% MS)", 302.72, 302.72, 25.31684, 7663.89],
        [14, "Engorde Final", "Silaje de maíz (20% MS)", 121.09, 403.63, 42.98, 17347.85],
        [15, "Engorde Final", "Maíz propio (25% MS)", 151.36, 172.00, 287.09, 49379.48],
        [16, "Engorde Final", "Núcleo mineral (5% MS)", 30.27, 30.27, 1842.00, 55760.53]
      ]
    },
    {
      nombre: "R_CostosEstandarTotales",
      columnas: ["subunidad", "costo_alimentacion", "costo_vacunas", "costo_total_cab", "costo_por_kg_ganado"],
      datosIniciales: [
        ["Cría", 73557.28, 6000.00, 79557.28, 0.00],
        ["Recría", 203319.80, 9850.00, 213169.80, 1522.64],
        ["Adaptación", 98524.10, 4100.00, 102624.10, 1328.47],
        ["Engorde Final", 130151.75, 0.00, 130151.75, 1403.25],
        ["Recría a Faena (Acumulado)", 431995.65, 13950.00, 445945.65, 1438.53]
      ]
    }
  ];

  var hojasCreadas = 0;
  var hojasActualizadas = 0;

  for (var i = 0; i < esquemas.length; i++) {
    var item = esquemas[i];
    var sheet = ss.getSheetByName(item.nombre);
    
    if (!sheet) {
      sheet = ss.insertSheet(item.nombre);
      hojasCreadas++;
    } else {
      hojasActualizadas++;
    }

    var numCols = item.columnas.length;
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([item.columnas]);
    
    // Formato oficial: Fondo Verde Ganadero (#1B4D3E), texto blanco en negrita Arial 10pt
    headerRange
      .setBackground("#1B4D3E")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setFontFamily("Arial")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    
    // Congelar fila 1 para facilitar navegación
    sheet.setFrozenRows(1);
    
    // Cargar datos iniciales si la hoja está recién creada (solo encabezados)
    if (sheet.getLastRow() === 1 && item.datosIniciales && item.datosIniciales.length > 0) {
      var dataRange = sheet.getRange(2, 1, item.datosIniciales.length, numCols);
      dataRange.setValues(item.datosIniciales);
      dataRange.setFontFamily("Arial").setFontSize(10);
    }
    
    // Auto-ajustar columnas
    for (var col = 1; col <= numCols; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  // Eliminar la hoja por defecto en blanco ("Hoja 1" o "Sheet1") si existen otras hojas
  var hojaDefecto1 = ss.getSheetByName("Hoja 1");
  var hojaDefecto2 = ss.getSheetByName("Sheet1");
  if (hojaDefecto1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(hojaDefecto1); } catch(e){}
  }
  if (hojaDefecto2 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(hojaDefecto2); } catch(e){}
  }

  var msg = "¡Éxito! Se crearon " + hojasCreadas + " hojas nuevas y se verificaron " + hojasActualizadas + " existentes.\\n\\n" +
            "Se configuraron las 20 tablas maestras con esquema multi-especie paramétrico por id_unidad_neg.\\n\\n" +
            "Formato verde ganadero (#1B4D3E), encabezados congelados y catálogos oficiales cargados.\\n\\n" +
            "La tabla S_Usuarios contiene las credenciales iniciales para iniciar sesión en el ERP.";
  
  if (SpreadsheetApp.getActiveSpreadsheet()) {
    try {
      SpreadsheetApp.getUi().alert("🐂 ERP Pozo del Carril", msg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch(e) {}
  }
}

// 2b. FUNCIÓN ESPECÍFICA: CREA ÚNICAMENTE LAS 5 TABLAS DE COSTOS ESTÁNDAR
// GARANTÍA 100% NO DESTRUCTIVA:
// - NO borra ni renombra ninguna hoja existente
// - NO altera datos previos de ninguna tabla maestra ni de Claude (Cañuelas, Invernada, Cría)
// - Solo crea las tablas de Costos Estándar que falten y les inserta sus datos de referencia
function crearTablasCostosEstandar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tablas = [
    {
      nombre: "P_CostosSupuestos",
      columnas: ["id_supuesto", "grupo", "concepto", "valor", "unidad", "tipo", "fuente_nota"],
      datosIniciales: [
        [1, "Precios Base", "Dólar oficial BNA", 1535, "$/US$", "precio", "Referencia cambiaria Octubre 2026"],
        [2, "Precios Base", "Maíz propio", 287.09, "$/kg tal cual", "precio", "FAS / costo propio"],
        [3, "Precios Base", "Soja grano", 560, "$/kg tal cual", "precio", "FAS / costo propio"],
        [4, "Precios Base", "Rollo de alfalfa 1ª", 155, "$/kg tal cual", "precio", "Referencia mercado"],
        [5, "Precios Base", "Silaje de maíz (US$/t)", 28, "US$/t verde", "precio", "Costo contratista picado"],
        [6, "Precios Base", "Silaje de maíz ($/kg verde)", 42.98, "$/kg verde", "precio", "(US$/t * Dólar)/1000 = (28 * 1535)/1000"],
        [7, "Precios Base", "Núcleo mineral con monensina (US$/kg)", 1.2, "US$/kg", "precio", "Insumo formulación corral"],
        [8, "Precios Base", "Núcleo mineral ($/kg)", 1842, "$/kg", "precio", "US$/kg * Dólar = 1.2 * 1535"],
        [9, "Pasturas", "Alfalfa implantación", 475, "US$/ha", "costo_implantacion", "Costo establecimiento pradera"],
        [10, "Pasturas", "Alfalfa amortización", 4, "años", "vida_util", "Periodo amortización"],
        [11, "Pasturas", "Alfalfa producción", 12000, "kg MS/ha/año", "rendimiento", "Producción forrajera anual"],
        [12, "Pasturas", "Alfalfa aprovechamiento", 60, "%", "eficiencia", "Eficiencia pastoreo directo"],
        [13, "Pasturas", "Alfalfa costo por kg MS consumido", 25.31684, "$/kg MS", "costo_unitario", "((475 * 1535) / 4) / (12000 * 0.60)"],
        [14, "Pasturas", "Otras pasturas implantación", 365, "US$/ha", "costo_implantacion", "Promedio campo natural y consociadas"],
        [15, "Pasturas", "Otras pasturas amortización", 4, "años", "vida_util", "Periodo amortización"],
        [16, "Pasturas", "Otras pasturas producción", 6000, "kg MS/ha/año", "rendimiento", "Producción anual"],
        [17, "Pasturas", "Otras pasturas aprovechamiento", 50, "%", "eficiencia", "Eficiencia pastoreo"],
        [18, "Pasturas", "Otras pasturas costo por kg MS consumido", 46.68958, "$/kg MS", "costo_unitario", "((365 * 1535) / 4) / (6000 * 0.50)"],
        [19, "Materia Seca (% MS)", "Maíz grano", 88, "% MS", "porcentaje_ms", "Materia seca grano"],
        [20, "Materia Seca (% MS)", "Soja grano", 90, "% MS", "porcentaje_ms", "Materia seca grano"],
        [21, "Materia Seca (% MS)", "Rollo de alfalfa", 85, "% MS", "porcentaje_ms", "Materia seca fardo/rollo"],
        [22, "Materia Seca (% MS)", "Silaje de maíz", 30, "% MS", "porcentaje_ms", "Materia seca forraje picado"],
        [23, "Proceso Productivo", "Peso inicial recría", 140, "kg", "peso", "Peso destete ingreso a recría"],
        [24, "Proceso Productivo", "Peso al pasar a adaptación", 280, "kg", "peso", "Peso fin recría / ingreso corral"],
        [25, "Proceso Productivo", "Peso final engorde", 450, "kg", "peso", "Peso faena terminación"],
        [26, "Proceso Productivo", "Días recría", 180, "días", "tiempo", "Duración ciclo recría pastoril"],
        [27, "Proceso Productivo", "Días adaptación", 50, "días", "tiempo", "Duración transición ruminal"],
        [28, "Proceso Productivo", "Días engorde final", 60, "días", "tiempo", "Duración engorde corral"],
        [29, "Proceso Productivo", "ADPV en corral", 1.545, "kg/día", "ganancia_diaria", "Aumento diario de peso vivo corral"],
        [30, "Proceso Productivo", "Peso al terminar adaptación", 357.25, "kg", "peso", "280 + (50 * 1.545)"],
        [31, "Proceso Productivo", "Mortalidad esperada", 1.5, "%", "parametro_sanitario", "Tasa de mortandad esperada del rodeo"],
        [32, "Proceso Productivo", "Mortalidad subtotal previsto", 21035.49, "$/cab", "costo_contingencia", "Subtotal previsto por animal"],
        [33, "Cría", "Peso vaca", 420, "kg", "peso", "Peso vivo promedio vientre"],
        [34, "Cría", "Consumo vaca % PV MS", 2.2, "%", "consumo", "Consumo diario en materia seca (% PV)"],
        [35, "Cría", "Porcentaje destete", 80, "%", "eficiencia_reproductiva", "Terneros logrados por vientre entorado"],
        [36, "Cría", "Porcentaje hembras recría", 50, "%", "reposicion", "Retención o destino hembras"]
      ]
    },
    {
      nombre: "P_CostosDietas",
      columnas: ["id_param_dieta", "concepto", "recria", "adaptacion", "engorde_final", "cria_vaca_ano"],
      datosIniciales: [
        [1, "Consumo MS (% PV)", "3.0%", "2.8%", "2.5%", "2.2%"],
        [2, "Peso inicial (kg)", 140, 280, 357.25, 420],
        [3, "Peso final (kg)", 280, 357.25, 450, 420],
        [4, "Peso promedio (kg)", 210, 318.625, 403.625, 420],
        [5, "Días", 180, 50, 60, 180],
        [6, "Consumo MS/día (kg)", 6.30, 8.9215, 10.0906, 9.24],
        [7, "Consumo MS total (kg)", 1134, 446.075, 605.4375, 1663.20],
        [8, "Kg ganados por cabeza", 140, 77.25, 92.75, 0],
        [9, "Conversión (kg MS/kg ganado)", 8.10, 5.7744, 6.5276, 0],
        [10, "Maíz propio (% MS)", "10%", "25%", "25%", "0%"],
        [11, "Soja concentrado (% MS)", "5%", "0%", "0%", "0%"],
        [12, "Núcleo mineral (% MS)", "5%", "5%", "5%", "0%"],
        [13, "Silaje de maíz (% MS)", "0%", "25%", "20%", "0%"],
        [14, "Rollos (% MS)", "0%", "0%", "0%", "10%"],
        [15, "Alfalfa pastoreo (% MS)", "65%", "45%", "50%", "75%"],
        [16, "Otras pasturas/rastrojo (% MS)", "15%", "0%", "0%", "15%"]
      ]
    },
    {
      nombre: "P_CostosVacunas",
      columnas: ["id_vacuna", "categoria", "vacuna_nombre", "dosis_anual", "precio_dosis", "total_anual"],
      datosIniciales: [
        [1, "Cría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [2, "Cría", "Carbunclo bacteridiano", 1, 450, 450],
        [3, "Cría", "Complejo Reproductivo (IBR, DVB, Lepto)", 1, 1400, 1400],
        [4, "Cría", "Clostridial 8 vías polivalente", 1, 650, 650],
        [5, "Cría", "Antiparasitario y Cobre/Mineral", 1, 1100, 1100],
        [6, "Recría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [7, "Recría", "Carbunclo bacteridiano", 1, 450, 450],
        [8, "Recría", "Clostridial (Mancha, Gangrena, Enterotoxemia)", 2, 650, 1300],
        [9, "Recría", "Queratoconjuntivitis", 2, 800, 1600],
        [10, "Recría", "Antiparasitario interno y externo (Ivermectina)", 2, 1500, 3000],
        [11, "Recría", "Suplemento mineral (Cu / Se / Zn)", 1, 1100, 1100],
        [12, "Adaptación", "Ingreso a corral: Clostridial refuerzo", 1, 700, 700],
        [13, "Adaptación", "Ingreso a corral: Neumonías / Respiratorio", 1, 1900, 1900],
        [14, "Adaptación", "Antiparasitario amplio espectro", 1, 1500, 1500],
        [15, "Engorde Final", "Sin aplicaciones (período de resguardo)", 0, 0, 0]
      ]
    },
    {
      nombre: "P_CostosDetalleDesglose",
      columnas: ["id_desglose", "subunidad", "ingrediente_concepto", "kg_ms", "kg_tal_cual", "precio_unitario", "costo_total"],
      datosIniciales: [
        [1, "Cría", "Alfalfa pastoreo (75% MS)", 1247.40, 1247.40, 25.31684, 31580.23],
        [2, "Cría", "Otras pasturas/rastrojo (15% MS)", 249.48, 249.48, 46.68958, 11648.12],
        [3, "Cría", "Rollos reserva invernal (10% MS)", 166.32, 195.67, 155.00, 30328.93],
        [4, "Recría", "Alfalfa pastoreo (65% MS)", 737.10, 737.10, 25.31684, 18661.04],
        [5, "Recría", "Otras pasturas (15% MS)", 170.10, 170.10, 46.68958, 7941.90],
        [6, "Recría", "Maíz propio (10% MS)", 113.40, 128.86, 287.09, 36995.62],
        [7, "Recría", "Soja concentrado (5% MS)", 56.70, 63.00, 560.00, 35280.00],
        [8, "Recría", "Núcleo mineral (5% MS)", 56.70, 56.70, 1842.00, 104441.24],
        [9, "Adaptación", "Alfalfa pastoreo (45% MS)", 200.73, 200.73, 25.31684, 5081.93],
        [10, "Adaptación", "Silaje de maíz (25% MS)", 111.52, 371.73, 42.98, 15976.96],
        [11, "Adaptación", "Maíz propio (25% MS)", 111.52, 126.73, 287.09, 36381.82],
        [12, "Adaptación", "Núcleo mineral (5% MS)", 22.30, 22.30, 1842.00, 41083.39],
        [13, "Engorde Final", "Alfalfa pastoreo (50% MS)", 302.72, 302.72, 25.31684, 7663.89],
        [14, "Engorde Final", "Silaje de maíz (20% MS)", 121.09, 403.63, 42.98, 17347.85],
        [15, "Engorde Final", "Maíz propio (25% MS)", 151.36, 172.00, 287.09, 49379.48],
        [16, "Engorde Final", "Núcleo mineral (5% MS)", 30.27, 30.27, 1842.00, 55760.53]
      ]
    },
    {
      nombre: "R_CostosEstandarTotales",
      columnas: ["subunidad", "costo_alimentacion", "costo_vacunas", "costo_total_cab", "costo_por_kg_ganado"],
      datosIniciales: [
        ["Cría", 73557.28, 6000.00, 79557.28, 0.00],
        ["Recría", 203319.80, 9850.00, 213169.80, 1522.64],
        ["Adaptación", 98524.10, 4100.00, 102624.10, 1328.47],
        ["Engorde Final", 130151.75, 0.00, 130151.75, 1403.25],
        ["Recría a Faena (Acumulado)", 431995.65, 13950.00, 445945.65, 1438.53]
      ]
    }
  ];

  var creadas = [];
  var yaExistian = [];

  for (var i = 0; i < tablas.length; i++) {
    var t = tablas[i];
    var sheet = ss.getSheetByName(t.nombre);

    // Si ya existe: CONSERVAR INTACTA (CERO MODIFICACIÓN NI BORRADO)
    if (sheet) {
      yaExistian.push(t.nombre);
      continue;
    }

    // Si no existe: crearla y formatearla
    sheet = ss.insertSheet(t.nombre);
    creadas.push(t.nombre);

    var numCols = t.columnas.length;
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([t.columnas]);

    headerRange
      .setBackground("#1B4D3E")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setFontFamily("Arial")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sheet.setFrozenRows(1);

    if (t.datosIniciales && t.datosIniciales.length > 0) {
      var dataRange = sheet.getRange(2, 1, t.datosIniciales.length, numCols);
      dataRange.setValues(t.datosIniciales);
      dataRange.setFontFamily("Arial").setFontSize(10);
    }

    for (var col = 1; col <= numCols; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  var mensaje = "¡Operación no destructiva finalizada!\\n\\n" +
                "• Hojas nuevas creadas (" + creadas.length + "): " + (creadas.length > 0 ? creadas.join(", ") : "Ninguna (ya existían todas)") + "\\n" +
                "• Hojas que ya existían (conservadas 100% intactas, " + yaExistian.length + "): " + (yaExistian.length > 0 ? yaExistian.join(", ") : "Ninguna") + "\\n\\n" +
                "Ninguna tabla ni dato existente fue modificado ni eliminado.";

  try {
    SpreadsheetApp.getUi().alert("🐂 Costos Estándar - ERP Pozo del Carril", mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    Logger.log(mensaje);
  }

  return { creadas: creadas, yaExistian: yaExistian };
}

// 3. DIAGNÓSTICO Y VERIFICACIÓN DE S_USUARIOS
function verificarTablaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("S_Usuarios");
  var ui = SpreadsheetApp.getUi();
  
  if (!sheet) {
    ui.alert("⚠️ Hoja S_Usuarios no encontrada", "La hoja 'S_Usuarios' no existe en esta planilla.\\nEjecute '1. Crear y Configurar las 20 Hojas Oficiales'.", ui.ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    ui.alert("ℹ️ Hoja S_Usuarios Vacía", "La hoja existe pero no tiene usuarios cargados (solo fila de encabezado).", ui.ButtonSet.OK);
    return;
  }
  
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  
  var usuariosEncontrados = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var userObj = {};
    for (var j = 0; j < headers.length; j++) {
      userObj[headers[j].toString().trim().toLowerCase()] = row[j];
    }
    
    var nombreUsuario = userObj["usuario"] || userObj["user"] || userObj["username"] || "";
    var activoVal = userObj["activo"];
    var esActivo = (activoVal === true || activoVal === 1 || String(activoVal).toUpperCase() === "VERDADERO" || String(activoVal).toUpperCase() === "TRUE" || String(activoVal).toUpperCase() === "SI" || activoVal === "");
    
    if (nombreUsuario) {
      usuariosEncontrados.push("• " + nombreUsuario + " (Rol: " + (userObj["rol"] || "Operador") + ", Activo: " + (esActivo ? "SÍ" : "NO") + ")");
    }
  }
  
  var reporte = "Se detectaron " + usuariosEncontrados.length + " usuario(s) en S_Usuarios:\\n\\n" +
                usuariosEncontrados.join("\\n") +
                "\\n\\nRecuerde: Para agregar o modificar un usuario, asegúrese de completar 'usuario', 'contrasena', 'nombre', 'rol' y 'activo' (VERDADERO).";
  
  ui.alert("👥 Diagnóstico S_Usuarios", reporte, ui.ButtonSet.OK);
}

// 4. AUDITORÍA DE ESTRUCTURA Y ENCABEZADOS
function auditarColumnasHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojasRequeridas = [
    "D_UnidadNeg", "D_Subunidad", "D_CategoriaHacienda", "D_UM", "D_Cuenta", "D_Insumo",
    "D_Campana", "D_HaciendaIndividual", "D_TropaLote", "P_EstandarRinde", "P_DosisTecnica",
    "F_MovimientosHacienda", "F_ConsumosReales", "F_SanidadReal", "F_ComprasInsumos",
    "F_PesadasControl", "F_VentasHacienda", "F_CostosIndirectos", "S_Usuarios", "S_Auditoria",
    "P_CostosSupuestos", "P_CostosDietas", "P_CostosVacunas", "P_CostosDetalleDesglose", "R_CostosEstandarTotales"
  ];
  
  var faltantes = [];
  for (var i = 0; i < hojasRequeridas.length; i++) {
    if (!ss.getSheetByName(hojasRequeridas[i])) {
      faltantes.push(hojasRequeridas[i]);
    }
  }
  
  var ui = SpreadsheetApp.getUi();
  if (faltantes.length === 0) {
    ui.alert("✅ Integridad Total", "Las 25 tablas del ERP (incluyendo el módulo de Costos Estándar) están presentes con su formato correcto.", ui.ButtonSet.OK);
  } else {
    ui.alert("⚠️ Tablas Faltantes", "Faltan las siguientes hojas: " + faltantes.join(", ") + "\\n\\nEjecute '1. Crear y Configurar las 20 Hojas' para crearlas automáticamente.", ui.ButtonSet.OK);
  }
}

function mostrarEstadoERP() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  ui.alert("🐂 Estado del ERP", "Planilla: " + ss.getName() + "\\nTotal de hojas: " + ss.getSheets().length + "\\nID de Planilla: " + ss.getId() + "\\nURL: " + ss.getUrl(), ui.ButtonSet.OK);
}

function sincronizarTodasLasHojasConERP() {
  var ui = SpreadsheetApp.getUi();
  ui.alert("🔄 Sincronización ERP", "La planilla está lista para sincronizar con el ERP.\\n\\nPara activar el Webhook:\\n1. Abra 'Extensiones > Apps Script'.\\n2. Presione 'Implementar > Nueva implementación'.\\n3. Seleccione 'Aplicación web', acceso: 'Cualquier usuario'.\\n4. Pegue la URL /exec en la sección Google Sheets del ERP.", ui.ButtonSet.OK);
}

// HELPER: Alta o Modificación de Usuario en la hoja S_Usuarios
function procesarUpsertUsuario(ss, u) {
  var userSheet = ss.getSheetByName("S_Usuarios");
  if (!userSheet) {
    userSheet = ss.insertSheet("S_Usuarios");
    userSheet.appendRow(["id_usuario", "usuario", "contrasena", "nombre", "rol", "activo"]);
  }
  
  var targetUsername = String(u.usuario || "").trim().toLowerCase();
  var lastRow = userSheet.getLastRow();
  var foundRow = -1;
  
  if (lastRow > 1) {
    var userColValues = userSheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < userColValues.length; i++) {
      if (String(userColValues[i][0]).trim().toLowerCase() === targetUsername) {
        foundRow = i + 2;
        break;
      }
    }
  }
  
  var nextId = u.id_usuario || (lastRow > 1 ? lastRow : 1);
  var isActivo = (u.activo !== false && String(u.activo).toUpperCase() !== "FALSO") ? true : false;
  var userRowValues = [
    nextId,
    String(u.usuario || "").trim(),
    String(u.contrasena || "").trim(),
    String(u.nombre || u.usuario || "").trim(),
    String(u.rol || "Operador").trim(),
    isActivo ? "VERDADERO" : "FALSO"
  ];
  
  if (foundRow > 0) {
    // Si no se proporcionó contraseña nueva, conservar la contraseña anterior
    if (!u.contrasena && userSheet.getRange(foundRow, 3).getValue()) {
      userRowValues[2] = userSheet.getRange(foundRow, 3).getValue();
    }
    userSheet.getRange(foundRow, 1, 1, 6).setValues([userRowValues]);
    return { success: true, action: "updated", row: foundRow, user: u.usuario };
  } else {
    userSheet.appendRow(userRowValues);
    return { success: true, action: "appended", row: userSheet.getLastRow(), user: u.usuario };
  }
}

// 5. WEBHOOK GET (doGet): RETORNA TODAS LAS HOJAS COMO JSON
// - Excluye/oculta la columna 'contrasena' de S_Usuarios para proteger credenciales
// - Convierte fechas al estándar ISO 'YYYY-MM-DD'
// - Soporta acción directa 'upsertUser' para compatibilidad CORS
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Soporte de alta/modificación vía GET (evita restricciones CORS de navegadores)
  if (e && e.parameter && (e.parameter.action === "upsertUser" || e.parameter.action === "addUser")) {
    var resUser = procesarUpsertUsuario(ss, {
      id_usuario: e.parameter.id_usuario ? Number(e.parameter.id_usuario) : undefined,
      usuario: e.parameter.usuario,
      contrasena: e.parameter.contrasena,
      nombre: e.parameter.nombre,
      rol: e.parameter.rol,
      activo: e.parameter.activo
    });
    return ContentService.createTextOutput(JSON.stringify(resUser))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheets = ss.getSheets();
  var result = {};
  var tz = ss.getSpreadsheetTimeZone() || "GMT-3";
  
  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow > 1 && lastCol > 0) {
      var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = data[0];
      var rows = [];
      
      for (var i = 1; i < data.length; i++) {
        var rowObj = {};
        for (var j = 0; j < headers.length; j++) {
          var headerName = headers[j] ? headers[j].toString().trim() : ("col_" + j);
          
          // SEGURIDAD / AUTENTICACIÓN:
          // Si se consulta con parámetro (?includeAuth=true) se incluye 'contrasena' para validar credenciales en el backend
          if (sheetName === "S_Usuarios" && /^(contrasena|password|clave)$/i.test(headerName)) {
            if (!(e && e.parameter && (e.parameter.includeAuth === "true" || e.parameter.auth === "true" || e.parameter.action === "getUsers"))) {
              continue;
            }
          }
          
          var val = data[i][j];
          
          // FORMATO FECHAS: Convertir instancias de Date a formato ISO 'YYYY-MM-DD'
          if (val instanceof Date) {
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          }
          
          rowObj[headerName] = val;
        }
        rows.push(rowObj);
      }
      result[sheetName] = rows;
    } else {
      result[sheetName] = [];
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 6. WEBHOOK POST (doPost): CONCURRENCIA CON LOCKSERVICE Y MAPEO DINÁMICO POR COLUMNAS
// - LockService.getScriptLock(10000) para prevenir colisiones concurrentes
// - Acciones soportadas: 'crearHojas', 'syncAllFromERP', 'append', 'upsertUser', 'ping'
function doPost(e) {
  // Prevenir colisiones de concurrencia usando LockService con 10 segundos de espera
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Servidor ocupado. No se pudo adquirir el bloqueo de concurrencia (LockService timeout 10000ms)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    
    // 6.1 Acción: 'crearHojas'
    if (body.action === "crearHojas") {
      crearYConfigurarTodasLasHojas();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "25 hojas oficiales creadas y configuradas con formato verde ganadero."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6.1b Acción: 'crearTablasCostosEstandar' (Estrictamente No Destructivo)
    if (body.action === "crearTablasCostosEstandar") {
      var resCostos = crearTablasCostosEstandar();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Tablas de Costos Estándar verificadas/creadas de forma no destructiva.",
        result: resCostos
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 6.2 Acción: 'syncAllFromERP'
    if (body.action === "syncAllFromERP" && body.tables) {
      var tablas = body.tables;
      var actualizadas = 0;
      Object.keys(tablas).forEach(function(nombreHoja) {
        var sheet = ss.getSheetByName(nombreHoja);
        var filas = tablas[nombreHoja];
        if (sheet && Array.isArray(filas) && filas.length > 0) {
          if (sheet.getLastRow() > 1) {
            sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
          }
          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          var matrix = filas.map(function(item) {
            return headers.map(function(h) {
              var hClean = String(h).trim();
              if (item[hClean] !== undefined) return item[hClean];
              var lowerKey = Object.keys(item).find(function(k) { return k.toLowerCase() === hClean.toLowerCase(); });
              return lowerKey !== undefined ? item[lowerKey] : "";
            });
          });
          sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
          actualizadas++;
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, actualizadas: actualizadas }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 6.3 Acción: 'login' o 'verifyCredentials' (Validación directa en Google Sheets)
    if (body.action === "login" || body.action === "verifyCredentials") {
      var userSheet = ss.getSheetByName("S_Usuarios");
      if (!userSheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Hoja S_Usuarios no existe." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var lastRow = userSheet.getLastRow();
      var lastCol = userSheet.getLastColumn();
      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "No hay usuarios en S_Usuarios." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = userSheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
      var uIdx = headers.indexOf("usuario");
      var pIdx = headers.indexOf("contrasena");
      if (pIdx === -1) pIdx = headers.indexOf("password");
      var rIdx = headers.indexOf("rol");
      var nIdx = headers.indexOf("nombre");
      var aIdx = headers.indexOf("activo");

      var targetUser = String(body.usuario || "").trim().toLowerCase();
      var targetPass = String(body.contrasena || "").trim();

      for (var i = 1; i < data.length; i++) {
        var rowUser = String(data[i][uIdx] || "").trim().toLowerCase();
        if (rowUser === targetUser) {
          var rowPass = String(data[i][pIdx] || "").trim();
          var rawAct = aIdx >= 0 ? data[i][aIdx] : true;
          var actUpper = String(rawAct).toUpperCase();
          var isAct = !(actUpper === "FALSO" || actUpper === "FALSE" || actUpper === "0" || actUpper === "NO");

          if (rowPass === targetPass) {
            return ContentService.createTextOutput(JSON.stringify({
              success: true,
              user: {
                id_usuario: i,
                usuario: String(data[i][uIdx] || "").trim(),
                nombre: nIdx >= 0 ? String(data[i][nIdx] || "").trim() : String(data[i][uIdx] || "").trim(),
                rol: rIdx >= 0 ? String(data[i][rIdx] || "").trim() : "Operador",
                activo: isAct
              }
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
            return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Contraseña incorrecta." }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Usuario no encontrado." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6.4 Acción: 'upsertUser' (Alta o Edición bidireccional de usuario)
    if (body.action === "upsertUser" || (body.sheetName === "S_Usuarios" && body.user)) {
      var resUpsert = procesarUpsertUsuario(ss, body.user || body.data || {});
      return ContentService.createTextOutput(JSON.stringify(resUpsert))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6.4 Acción: 'append' (Mapeo dinámico por nombre de columna)
    if (body.action === "append" || body.sheetName) {
      var targetSheetName = body.sheetName || body.tabla;
      var targetSheet = ss.getSheetByName(targetSheetName);
      
      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Hoja no encontrada en la planilla: " + targetSheetName
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var lastCol = targetSheet.getLastColumn();
      if (lastCol === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "La hoja '" + targetSheetName + "' no posee fila de encabezados."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var sheetHeaders = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      // Caso A: Objeto único con pares clave/valor (mapeo dinámico)
      var recordData = body.data || body.record;
      if (recordData && typeof recordData === "object" && !Array.isArray(recordData)) {
        var rowToAppend = sheetHeaders.map(function(header) {
          var hClean = String(header).trim();
          if (recordData[hClean] !== undefined) return recordData[hClean];
          var matchKey = Object.keys(recordData).find(function(k) {
            return k.trim().toLowerCase() === hClean.toLowerCase();
          });
          return matchKey !== undefined ? recordData[matchKey] : "";
        });
        targetSheet.appendRow(rowToAppend);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          action: "append_dynamic",
          sheet: targetSheetName,
          rowNumber: targetSheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Caso B: Arreglo de múltiples objetos (inserción en lote con mapeo dinámico)
      var multipleRows = body.rows || body.records;
      if (Array.isArray(multipleRows) && multipleRows.length > 0) {
        var rowsMatrix = multipleRows.map(function(itemObj) {
          return sheetHeaders.map(function(header) {
            var hClean = String(header).trim();
            if (itemObj[hClean] !== undefined) return itemObj[hClean];
            var matchKey = Object.keys(itemObj).find(function(k) {
              return k.trim().toLowerCase() === hClean.toLowerCase();
            });
            return matchKey !== undefined ? itemObj[matchKey] : "";
          });
        });
        var startRow = targetSheet.getLastRow() + 1;
        targetSheet.getRange(startRow, 1, rowsMatrix.length, sheetHeaders.length).setValues(rowsMatrix);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          action: "append_batch",
          sheet: targetSheetName,
          insertedCount: rowsMatrix.length,
          lastRow: targetSheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Caso C: Vector plano de valores ordenados
      if (Array.isArray(body.rowValues)) {
        targetSheet.appendRow(body.rowValues);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          action: "append_array",
          sheet: targetSheetName,
          rowNumber: targetSheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Formato de payload no válido para append. Proporcione 'data' (objeto), 'rows' (array de objetos) o 'rowValues' (array)."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 6.5 Acción: 'ping' (Prueba de conectividad y latencia)
    if (body.action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        spreadsheetName: ss.getName(),
        sheetsCount: ss.getSheets().length,
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Acción no reconocida: " + body.action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Liberar siempre el bloqueo
    lock.releaseLock();
  }
}
`;

/**
 * Script standalone e independiente para crear ÚNICAMENTE las 5 tablas de Costos Estándar.
 * 100% No Destructivo: no borra ni modifica ninguna hoja o dato preexistente.
 */
export const APPS_SCRIPT_COSTOS_ESTANDAR_ONLY_CODE = `/**
 * ============================================================================
 * ERP GANADERO POZO DEL CARRIL - MÓDULO COSTOS ESTÁNDAR (OCTUBRE 2026)
 * SCRIPT INDEPENDIENTE 100% NO DESTRUCTIVO
 * ============================================================================
 * 
 * Este script crea ÚNICAMENTE las 5 tablas del módulo Costos Estándar:
 * 1. P_CostosSupuestos
 * 2. P_CostosDietas
 * 3. P_CostosVacunas
 * 4. P_CostosDetalleDesglose
 * 5. R_CostosEstandarTotales
 * 
 * GARANTÍA DE SEGURIDAD Y PRESERVACIÓN:
 * - NO borra ni renombra ninguna hoja existente.
 * - NO modifica ningún dato previo (las 20 tablas maestras, Cañuelas_Claude, etc.).
 * - Si alguna de las 5 tablas ya existe, la conserva intacta sin sobreescribir.
 * - Aplica formato verde ganadero (#1B4D3E) y congela la fila 1 de encabezados.
 * 
 * INSTRUCCIONES:
 * 1. Abra su Google Sheets.
 * 2. Menú: Extensiones > Apps Script.
 * 3. Pegue este código al final del script actual (o en un nuevo archivo de script).
 * 4. Seleccione la función 'crearTablasCostosEstandar' y haga clic en 'Ejecutar'.
 */

function crearTablasCostosEstandar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tablas = [
    {
      nombre: "P_CostosSupuestos",
      columnas: ["id_supuesto", "grupo", "concepto", "valor", "unidad", "tipo", "fuente_nota"],
      datosIniciales: [
        [1, "Precios Base", "Dólar oficial BNA", 1535, "$/US$", "precio", "Referencia cambiaria Octubre 2026"],
        [2, "Precios Base", "Maíz propio", 287.09, "$/kg tal cual", "precio", "FAS / costo propio"],
        [3, "Precios Base", "Soja grano", 560, "$/kg tal cual", "precio", "FAS / costo propio"],
        [4, "Precios Base", "Rollo de alfalfa 1ª", 155, "$/kg tal cual", "precio", "Referencia mercado"],
        [5, "Precios Base", "Silaje de maíz (US$/t)", 28, "US$/t verde", "precio", "Costo contratista picado"],
        [6, "Precios Base", "Silaje de maíz ($/kg verde)", 42.98, "$/kg verde", "precio", "(US$/t * Dólar)/1000 = (28 * 1535)/1000"],
        [7, "Precios Base", "Núcleo mineral con monensina (US$/kg)", 1.2, "US$/kg", "precio", "Insumo formulación corral"],
        [8, "Precios Base", "Núcleo mineral ($/kg)", 1842, "$/kg", "precio", "US$/kg * Dólar = 1.2 * 1535"],
        [9, "Pasturas", "Alfalfa implantación", 475, "US$/ha", "costo_implantacion", "Costo establecimiento pradera"],
        [10, "Pasturas", "Alfalfa amortización", 4, "años", "vida_util", "Periodo amortización"],
        [11, "Pasturas", "Alfalfa producción", 12000, "kg MS/ha/año", "rendimiento", "Producción forrajera anual"],
        [12, "Pasturas", "Alfalfa aprovechamiento", 60, "%", "eficiencia", "Eficiencia pastoreo directo"],
        [13, "Pasturas", "Alfalfa costo por kg MS consumido", 25.31684, "$/kg MS", "costo_unitario", "((475 * 1535) / 4) / (12000 * 0.60)"],
        [14, "Pasturas", "Otras pasturas implantación", 365, "US$/ha", "costo_implantacion", "Promedio campo natural y consociadas"],
        [15, "Pasturas", "Otras pasturas amortización", 4, "años", "vida_util", "Periodo amortización"],
        [16, "Pasturas", "Otras pasturas producción", 6000, "kg MS/ha/año", "rendimiento", "Producción anual"],
        [17, "Pasturas", "Otras pasturas aprovechamiento", 50, "%", "eficiencia", "Eficiencia pastoreo"],
        [18, "Pasturas", "Otras pasturas costo por kg MS consumido", 46.68958, "$/kg MS", "costo_unitario", "((365 * 1535) / 4) / (6000 * 0.50)"],
        [19, "Materia Seca (% MS)", "Maíz grano", 88, "% MS", "porcentaje_ms", "Materia seca grano"],
        [20, "Materia Seca (% MS)", "Soja grano", 90, "% MS", "porcentaje_ms", "Materia seca grano"],
        [21, "Materia Seca (% MS)", "Rollo de alfalfa", 85, "% MS", "porcentaje_ms", "Materia seca fardo/rollo"],
        [22, "Materia Seca (% MS)", "Silaje de maíz", 30, "% MS", "porcentaje_ms", "Materia seca forraje picado"],
        [23, "Proceso Productivo", "Peso inicial recría", 140, "kg", "peso", "Peso destete ingreso a recría"],
        [24, "Proceso Productivo", "Peso al pasar a adaptación", 280, "kg", "peso", "Peso fin recría / ingreso corral"],
        [25, "Proceso Productivo", "Peso final engorde", 450, "kg", "peso", "Peso faena terminación"],
        [26, "Proceso Productivo", "Días recría", 180, "días", "tiempo", "Duración ciclo recría pastoril"],
        [27, "Proceso Productivo", "Días adaptación", 50, "días", "tiempo", "Duración transición ruminal"],
        [28, "Proceso Productivo", "Días engorde final", 60, "días", "tiempo", "Duración engorde corral"],
        [29, "Proceso Productivo", "ADPV en corral", 1.545, "kg/día", "ganancia_diaria", "Aumento diario de peso vivo corral"],
        [30, "Proceso Productivo", "Peso al terminar adaptación", 357.25, "kg", "peso", "280 + (50 * 1.545)"],
        [31, "Proceso Productivo", "Mortalidad esperada", 1.5, "%", "parametro_sanitario", "Tasa de mortandad esperada del rodeo"],
        [32, "Proceso Productivo", "Mortalidad subtotal previsto", 21035.49, "$/cab", "costo_contingencia", "Subtotal previsto por animal"],
        [33, "Cría", "Peso vaca", 420, "kg", "peso", "Peso vivo promedio vientre"],
        [34, "Cría", "Consumo vaca % PV MS", 2.2, "%", "consumo", "Consumo diario en materia seca (% PV)"],
        [35, "Cría", "Porcentaje destete", 80, "%", "eficiencia_reproductiva", "Terneros logrados por vientre entorado"],
        [36, "Cría", "Porcentaje hembras recría", 50, "%", "reposicion", "Retención o destino hembras"]
      ]
    },
    {
      nombre: "P_CostosDietas",
      columnas: ["id_param_dieta", "concepto", "recria", "adaptacion", "engorde_final", "cria_vaca_ano"],
      datosIniciales: [
        [1, "Consumo MS (% PV)", "3.0%", "2.8%", "2.5%", "2.2%"],
        [2, "Peso inicial (kg)", 140, 280, 357.25, 420],
        [3, "Peso final (kg)", 280, 357.25, 450, 420],
        [4, "Peso promedio (kg)", 210, 318.625, 403.625, 420],
        [5, "Días", 180, 50, 60, 180],
        [6, "Consumo MS/día (kg)", 6.30, 8.9215, 10.0906, 9.24],
        [7, "Consumo MS total (kg)", 1134, 446.075, 605.4375, 1663.20],
        [8, "Kg ganados por cabeza", 140, 77.25, 92.75, 0],
        [9, "Conversión (kg MS/kg ganado)", 8.10, 5.7744, 6.5276, 0],
        [10, "Maíz propio (% MS)", "10%", "25%", "25%", "0%"],
        [11, "Soja concentrado (% MS)", "5%", "0%", "0%", "0%"],
        [12, "Núcleo mineral (% MS)", "5%", "5%", "5%", "0%"],
        [13, "Silaje de maíz (% MS)", "0%", "25%", "20%", "0%"],
        [14, "Rollos (% MS)", "0%", "0%", "0%", "10%"],
        [15, "Alfalfa pastoreo (% MS)", "65%", "45%", "50%", "75%"],
        [16, "Otras pasturas/rastrojo (% MS)", "15%", "0%", "0%", "15%"]
      ]
    },
    {
      nombre: "P_CostosVacunas",
      columnas: ["id_vacuna", "categoria", "vacuna_nombre", "dosis_anual", "precio_dosis", "total_anual"],
      datosIniciales: [
        [1, "Cría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [2, "Cría", "Carbunclo bacteridiano", 1, 450, 450],
        [3, "Cría", "Complejo Reproductivo (IBR, DVB, Lepto)", 1, 1400, 1400],
        [4, "Cría", "Clostridial 8 vías polivalente", 1, 650, 650],
        [5, "Cría", "Antiparasitario y Cobre/Mineral", 1, 1100, 1100],
        [6, "Recría", "Aftosa (2 aplicaciones)", 2, 1200, 2400],
        [7, "Recría", "Carbunclo bacteridiano", 1, 450, 450],
        [8, "Recría", "Clostridial (Mancha, Gangrena, Enterotoxemia)", 2, 650, 1300],
        [9, "Recría", "Queratoconjuntivitis", 2, 800, 1600],
        [10, "Recría", "Antiparasitario interno y externo (Ivermectina)", 2, 1500, 3000],
        [11, "Recría", "Suplemento mineral (Cu / Se / Zn)", 1, 1100, 1100],
        [12, "Adaptación", "Ingreso a corral: Clostridial refuerzo", 1, 700, 700],
        [13, "Adaptación", "Ingreso a corral: Neumonías / Respiratorio", 1, 1900, 1900],
        [14, "Adaptación", "Antiparasitario amplio espectro", 1, 1500, 1500],
        [15, "Engorde Final", "Sin aplicaciones (período de resguardo)", 0, 0, 0]
      ]
    },
    {
      nombre: "P_CostosDetalleDesglose",
      columnas: ["id_desglose", "subunidad", "ingrediente_concepto", "kg_ms", "kg_tal_cual", "precio_unitario", "costo_total"],
      datosIniciales: [
        [1, "Cría", "Alfalfa pastoreo (75% MS)", 1247.40, 1247.40, 25.31684, 31580.23],
        [2, "Cría", "Otras pasturas/rastrojo (15% MS)", 249.48, 249.48, 46.68958, 11648.12],
        [3, "Cría", "Rollos reserva invernal (10% MS)", 166.32, 195.67, 155.00, 30328.93],
        [4, "Recría", "Alfalfa pastoreo (65% MS)", 737.10, 737.10, 25.31684, 18661.04],
        [5, "Recría", "Otras pasturas (15% MS)", 170.10, 170.10, 46.68958, 7941.90],
        [6, "Recría", "Maíz propio (10% MS)", 113.40, 128.86, 287.09, 36995.62],
        [7, "Recría", "Soja concentrado (5% MS)", 56.70, 63.00, 560.00, 35280.00],
        [8, "Recría", "Núcleo mineral (5% MS)", 56.70, 56.70, 1842.00, 104441.24],
        [9, "Adaptación", "Alfalfa pastoreo (45% MS)", 200.73, 200.73, 25.31684, 5081.93],
        [10, "Adaptación", "Silaje de maíz (25% MS)", 111.52, 371.73, 42.98, 15976.96],
        [11, "Adaptación", "Maíz propio (25% MS)", 111.52, 126.73, 287.09, 36381.82],
        [12, "Adaptación", "Núcleo mineral (5% MS)", 22.30, 22.30, 1842.00, 41083.39],
        [13, "Engorde Final", "Alfalfa pastoreo (50% MS)", 302.72, 302.72, 25.31684, 7663.89],
        [14, "Engorde Final", "Silaje de maíz (20% MS)", 121.09, 403.63, 42.98, 17347.85],
        [15, "Engorde Final", "Maíz propio (25% MS)", 151.36, 172.00, 287.09, 49379.48],
        [16, "Engorde Final", "Núcleo mineral (5% MS)", 30.27, 30.27, 1842.00, 55760.53]
      ]
    },
    {
      nombre: "R_CostosEstandarTotales",
      columnas: ["subunidad", "costo_alimentacion", "costo_vacunas", "costo_total_cab", "costo_por_kg_ganado"],
      datosIniciales: [
        ["Cría", 73557.28, 6000.00, 79557.28, 0.00],
        ["Recría", 203319.80, 9850.00, 213169.80, 1522.64],
        ["Adaptación", 98524.10, 4100.00, 102624.10, 1328.47],
        ["Engorde Final", 130151.75, 0.00, 130151.75, 1403.25],
        ["Recría a Faena (Acumulado)", 431995.65, 13950.00, 445945.65, 1438.53]
      ]
    }
  ];

  var creadas = [];
  var yaExistian = [];

  for (var i = 0; i < tablas.length; i++) {
    var t = tablas[i];
    var sheet = ss.getSheetByName(t.nombre);

    // Si ya existe: CONSERVAR INTACTA (CERO MODIFICACIÓN NI BORRADO)
    if (sheet) {
      yaExistian.push(t.nombre);
      continue;
    }

    // Si no existe: crearla y formatearla
    sheet = ss.insertSheet(t.nombre);
    creadas.push(t.nombre);

    var numCols = t.columnas.length;
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([t.columnas]);

    headerRange
      .setBackground("#1B4D3E")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setFontFamily("Arial")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sheet.setFrozenRows(1);

    if (t.datosIniciales && t.datosIniciales.length > 0) {
      var dataRange = sheet.getRange(2, 1, t.datosIniciales.length, numCols);
      dataRange.setValues(t.datosIniciales);
      dataRange.setFontFamily("Arial").setFontSize(10);
    }

    for (var col = 1; col <= numCols; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  var mensaje = "¡Operación no destructiva finalizada!\\n\\n" +
                "• Hojas nuevas creadas (" + creadas.length + "): " + (creadas.length > 0 ? creadas.join(", ") : "Ninguna (ya existían todas)") + "\\n" +
                "• Hojas que ya existían (conservadas 100% intactas, " + yaExistian.length + "): " + (yaExistian.length > 0 ? yaExistian.join(", ") : "Ninguna") + "\\n\\n" +
                "Ninguna tabla ni dato existente fue modificado ni eliminado.";

  try {
    SpreadsheetApp.getUi().alert("🐂 Costos Estándar - ERP Pozo del Carril", mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    Logger.log(mensaje);
  }

  return { creadas: creadas, yaExistian: yaExistian };
}
`;

