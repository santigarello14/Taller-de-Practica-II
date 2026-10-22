/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 1: Tablero de Control / Dashboard Ejecutivo
 * Matriz Ejecutiva de 11 Indicadores Clave de Gestión (KPIs) de la Actividad Bovina
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  Scale,
  Calendar,
  Wheat,
  ShieldCheck,
  Truck,
  Clock,
  Edit2,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  RefreshCw,
  BarChart3,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { ActiveModule } from '../Sidebar';
import { KPIService, KPIResult, TrafficLightColor } from '../../services/kpiEngine';

interface DashboardModuleProps {
  selectedSubunidadId: number | 'all';
  selectedCampanaId: number | 'all';
  onNavigate: (module: ActiveModule) => void;
  selectedUnidadNegId?: number;
  onSelectUnidadNeg?: (id: number) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  selectedSubunidadId,
  selectedCampanaId,
  onNavigate,
  selectedUnidadNegId = 1,
  onSelectUnidadNeg,
}) => {
  const [currentSubunidad, setCurrentSubunidad] = useState<number | 'all'>(selectedSubunidadId);
  const [editingKPI, setEditingKPI] = useState<KPIResult | null>(null);
  const [tempTargetValue, setTempTargetValue] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [kpis, setKpis] = useState<KPIResult[]>([]);

  // Sincronizar filtro si cambia desde las props
  useEffect(() => {
    setCurrentSubunidad(selectedSubunidadId);
  }, [selectedSubunidadId]);

  // Recalcular KPIs cuando cambia estado de dbEngine o filtro de subunidad
  const recalculateKPIs = () => {
    const results = KPIService.calculateAllKPIs(currentSubunidad);
    setKpis(results);
  };

  useEffect(() => {
    recalculateKPIs();
    const unsubscribe = db.subscribe(recalculateKPIs);
    return () => unsubscribe();
  }, [currentSubunidad]);

  // Datos de cabecera y estado
  const state = db.getState();
  const subunidades = state.D_Subunidad.filter(
    s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId) && s.activo !== false
  );

  // Contadores de semáforos
  const countGreen = kpis.filter(k => k.trafficLight === 'green').length;
  const countYellow = kpis.filter(k => k.trafficLight === 'yellow').length;
  const countRed = kpis.filter(k => k.trafficLight === 'red').length;

  // Manejadores de metas
  const handleOpenEdit = (kpi: KPIResult) => {
    setEditingKPI(kpi);
    setTempTargetValue(String(kpi.targetValue));
  };

  const handleSaveTarget = () => {
    if (!editingKPI) return;
    const val = parseFloat(tempTargetValue);
    if (!isNaN(val)) {
      KPIService.saveTarget(editingKPI.code, val);
      recalculateKPIs();
      setEditingKPI(null);
    }
  };

  const handleResetTargetToDefault = () => {
    if (!editingKPI) return;
    KPIService.saveTarget(editingKPI.code, editingKPI.defaultTarget);
    setTempTargetValue(String(editingKPI.defaultTarget));
    recalculateKPIs();
  };

  const handleResetAllTargets = () => {
    if (window.confirm('¿Desea restablecer las metas de todos los 11 indicadores a sus valores predeterminados?')) {
      KPIService.resetTargetsToDefault();
      recalculateKPIs();
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await db.fetchAndSyncAllTables();
      recalculateKPIs();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Agrupamiento por perspectivas
  const kpisFinanciera = kpis.filter(k => k.perspectiva === 'Financiera');
  const kpisProcesos = kpis.filter(k => k.perspectiva === 'Procesos Internos');
  const kpisClientes = kpis.filter(k => k.perspectiva === 'Clientes / Logística');
  const kpisCostos = kpis.filter(k => k.perspectiva === 'Costos y Eficiencia');

  // Helper para renderizar badge de semáforo
  const renderTrafficLightBadge = (color: TrafficLightColor, label: string) => {
    switch (color) {
      case 'green':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{label}</span>
          </div>
        );
      case 'yellow':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{label}</span>
          </div>
        );
      case 'red':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>{label}</span>
          </div>
        );
    }
  };

  // Iconos temáticos según código de KPI
  const getKPIIcon = (code: string) => {
    switch (code) {
      case 'MARGEN_BRUTO_PCT':
        return <TrendingUp className="w-4 h-4 text-emerald-700" />;
      case 'PRECIO_VENTA_RELATIVO':
        return <DollarSign className="w-4 h-4 text-emerald-700" />;
      case 'KG_CARNE_POR_HA':
        return <Scale className="w-4 h-4 text-blue-700" />;
      case 'PROD_PROM_POR_CAB':
        return <Layers className="w-4 h-4 text-blue-700" />;
      case 'CUMPLIMIENTO_SANIDAD':
        return <ShieldCheck className="w-4 h-4 text-blue-700" />;
      case 'DESVIO_PLAZO_COBRANZA':
        return <Calendar className="w-4 h-4 text-purple-700" />;
      case 'CUMPLIMIENTO_PESO_TERMINACION':
        return <Scale className="w-4 h-4 text-purple-700" />;
      case 'MERMA_TRASLADO_FERIA':
        return <Truck className="w-4 h-4 text-purple-700" />;
      case 'COSTO_POR_KG_PRODUCIDO':
        return <DollarSign className="w-4 h-4 text-amber-700" />;
      case 'PARTICIPACION_ALIMENTACION':
        return <Wheat className="w-4 h-4 text-amber-700" />;
      case 'DURACION_CICLO_DIAS':
        return <Clock className="w-4 h-4 text-amber-700" />;
      default:
        return <BarChart3 className="w-4 h-4 text-slate-700" />;
    }
  };

  // Renderizador de cada tarjeta de KPI
  const renderKPICard = (kpi: KPIResult) => {
    const isEditingThis = editingKPI?.code === kpi.code;

    // Barra de progreso relativa al cumplimiento
    let progressPct = Math.min(100, Math.max(5, kpi.compliancePercent));
    if (kpi.code === 'DESVIO_PLAZO_COBRANZA') {
      progressPct = kpi.realValue <= 0 ? 100 : Math.max(10, 100 - (kpi.realValue / 15) * 50);
    } else if (kpi.code === 'MERMA_TRASLADO_FERIA') {
      progressPct = kpi.realValue <= 2.0 ? 100 : Math.max(15, 100 - (kpi.realValue - 2.0) * 25);
    } else if (kpi.code === 'CUMPLIMIENTO_PESO_TERMINACION') {
      progressPct = Math.max(15, 100 - Math.abs(kpi.realValue) * 8);
    }

    const barColor =
      kpi.trafficLight === 'green'
        ? 'bg-emerald-500'
        : kpi.trafficLight === 'yellow'
        ? 'bg-amber-500'
        : 'bg-rose-500';

    return (
      <div
        key={kpi.code}
        onClick={() => handleOpenEdit(kpi)}
        className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-500/80 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
      >
        {/* Borde superior de acento según semáforo */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            kpi.trafficLight === 'green'
              ? 'bg-emerald-500'
              : kpi.trafficLight === 'yellow'
              ? 'bg-amber-400'
              : 'bg-rose-500'
          }`}
        />

        <div>
          {/* Header de la tarjeta */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
                {getKPIIcon(kpi.code)}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  KPI {String(kpi.id).padStart(2, '0')}
                </span>
                <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-[#1B4D3E] transition-colors">
                  {kpi.name}
                </h4>
              </div>
            </div>
            {renderTrafficLightBadge(kpi.trafficLight, kpi.statusLabel)}
          </div>

          {/* Valor Real Grande y Unidad */}
          <div className="mt-3 mb-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpi.unit === '$/kg' ? `$${kpi.realValue.toLocaleString('es-AR', { minimumFractionDigits: kpi.decimals })}` : kpi.realValue.toLocaleString('es-AR', { minimumFractionDigits: kpi.decimals })}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {kpi.unit !== '$/kg' && kpi.unit}
            </span>
          </div>

          {/* Barra de Progreso y Comparación */}
          <div className="space-y-1.5 my-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{kpi.statusDetail}</span>
            </div>
          </div>
        </div>

        {/* Pie de la tarjeta: Meta editable y fórmula */}
        <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Meta:</span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {kpi.unit === '$/kg' ? `$${kpi.targetValue}` : `${kpi.targetValue} ${kpi.unit}`}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(kpi);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B4D3E] hover:text-[#13382c] p-1 rounded hover:bg-emerald-50 transition-colors"
              title="Modificar meta / estándar"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar meta</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 truncate" title={kpi.formula}>
            <span className="font-semibold text-slate-500">Fórmula:</span> {kpi.formula}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal Ejecutiva */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1B4D3E] via-[#143B2F] to-slate-900 text-white p-6 shadow-md border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-emerald-200 text-xs px-3 py-1 rounded-full mb-3 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tablero de Control Gerencial &bull; Establecimiento Pozo del Carril</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Tablero de Control - Indicadores Clave de Gestión (KPIs)
            </h1>
            <p className="text-xs text-emerald-100/90 mt-2 leading-relaxed">
              Matriz balanceada de 11 indicadores de rendimiento con metas editables y semaforización dinámica (🟢 Verde, 🟡 Amarillo, 🔴 Rojo) calculada a partir de los registros reales sincronizados con Google Sheets.
            </p>
          </div>

          {/* Ribbon de Resumen de Semáforos */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex items-center gap-4 shrink-0">
            <div className="text-center px-2">
              <div className="text-2xl font-black text-emerald-300">{countGreen}</div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-100 font-semibold">Óptimos</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <div className="text-2xl font-black text-amber-300">{countYellow}</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-100 font-semibold">Alertas</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <div className="text-2xl font-black text-rose-300">{countRed}</div>
              <div className="text-[10px] uppercase tracking-wider text-rose-100 font-semibold">Críticos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Acciones Globales */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Selector de Subunidad */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Layers className="w-4 h-4 text-[#1B4D3E]" />
            <span>Subunidad:</span>
          </span>
          <button
            onClick={() => setCurrentSubunidad('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentSubunidad === 'all'
                ? 'bg-[#1B4D3E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Consolidado General (Todas)
          </button>
          {subunidades.map((sub) => (
            <button
              key={sub.id_subunidad}
              onClick={() => setCurrentSubunidad(sub.id_subunidad)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                currentSubunidad === sub.id_subunidad
                  ? 'bg-[#1B4D3E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub.nombre}
            </button>
          ))}
        </div>

        {/* Acciones: Restablecer Metas y Sincronizar Sheets */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleResetAllTargets}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Restablecer los 11 estándares iniciales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Metas</span>
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4D3E] hover:bg-[#143B2F] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Sheets</span>
          </button>
        </div>
      </div>

      {/* 1. PERSPECTIVA FINANCIERA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            1. Perspectiva Financiera
          </h3>
          <span className="text-xs text-slate-400 font-medium ml-1">
            (Rentabilidad por etapa con PTI y cotizaciones relativas de mercado)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpisFinanciera.map(renderKPICard)}
        </div>
      </div>

      {/* 2. PERSPECTIVA DE PROCESO INTERNO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <h3 className="text-base font-bold text-slate-900">
            2. Perspectiva de Proceso Interno
          </h3>
          <span className="text-xs text-slate-400 font-medium ml-1">
            (Productividad de campo en kg/ha, ganancia individual y sanidad preventiva)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpisProcesos.map(renderKPICard)}
        </div>
      </div>

      {/* 3. PERSPECTIVA DE CLIENTES / COMERCIAL Y LOGÍSTICA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="w-3 h-3 rounded-full bg-purple-600" />
          <h3 className="text-base font-bold text-slate-900">
            3. Perspectiva de Clientes / Comercial y Logística
          </h3>
          <span className="text-xs text-slate-400 font-medium ml-1">
            (Cumplimiento de plazos de cobro ferial, peso de faena y merma en flete)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpisClientes.map(renderKPICard)}
        </div>
      </div>

      {/* 4. COSTOS, TIEMPO Y EFICIENCIA PRODUCTIVA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="w-3 h-3 rounded-full bg-amber-600" />
          <h3 className="text-base font-bold text-slate-900">
            4. Costos, Tiempo y Eficiencia Productiva
          </h3>
          <span className="text-xs text-slate-400 font-medium ml-1">
            (Costo unitario por kilo de carne, peso de la ración y días de permanencia)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpisCostos.map(renderKPICard)}
        </div>
      </div>

      {/* Cuadro Resumen de Etapas Productivas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Desglose Físico y Económico por Subunidad Productiva
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Valores calculados de existencias, costos de ración y ganancia de peso según Octubre de 2026.
            </p>
          </div>
          <button
            onClick={() => onNavigate('costos_estandar')}
            className="text-xs font-semibold text-[#1B4D3E] hover:underline flex items-center gap-1"
          >
            <span>Ver matriz de costos estándar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold">Subunidad</th>
                <th className="py-2.5 px-3 font-semibold">Stock Actual</th>
                <th className="py-2.5 px-3 font-semibold">Rango Peso</th>
                <th className="py-2.5 px-3 font-semibold">Días Permanencia</th>
                <th className="py-2.5 px-3 font-semibold text-right">Costo Ración / Cab</th>
                <th className="py-2.5 px-3 font-semibold text-right">Costo Total / Cab</th>
                <th className="py-2.5 px-3 font-semibold text-right">Costo / Kg Ganado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-800">Cría</td>
                <td className="py-2.5 px-3 font-medium text-slate-600">{db.getStockHacienda(1)} cab</td>
                <td className="py-2.5 px-3 text-slate-600">0 a 140 kg (destete)</td>
                <td className="py-2.5 px-3 text-slate-600">180 días</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$73.557,28</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$79.557,28</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-bold">$710,33</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-800">Recría Pastoril</td>
                <td className="py-2.5 px-3 font-medium text-slate-600">{db.getStockHacienda(2)} cab</td>
                <td className="py-2.5 px-3 text-slate-600">140 a 280 kg</td>
                <td className="py-2.5 px-3 text-slate-600">180 días</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$203.319,80</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$213.169,80</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-bold">$1.522,64</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-800">Adaptación Ruminal</td>
                <td className="py-2.5 px-3 font-medium text-slate-600">{db.getStockHacienda(3)} cab</td>
                <td className="py-2.5 px-3 text-slate-600">280 a 357.25 kg</td>
                <td className="py-2.5 px-3 text-slate-600">50 días</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$98.524,10</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$102.624,10</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-bold">$1.328,47</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-800">Engorde / Terminación</td>
                <td className="py-2.5 px-3 font-medium text-slate-600">{db.getStockHacienda(4)} cab</td>
                <td className="py-2.5 px-3 text-slate-600">357.25 a 450 kg</td>
                <td className="py-2.5 px-3 text-slate-600">60 días</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$130.151,75</td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono">$130.151,75</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-bold">$1.403,25</td>
              </tr>
              <tr className="bg-emerald-50/70 font-bold border-t border-emerald-200">
                <td className="py-2.5 px-3 text-[#1B4D3E]">Consolidado Recría a Faena</td>
                <td className="py-2.5 px-3 text-slate-800">{subunidades.reduce((acc, s) => acc + db.getStockHacienda(s.id_subunidad), 0)} cab</td>
                <td className="py-2.5 px-3 text-slate-800">140 a 450 kg</td>
                <td className="py-2.5 px-3 text-slate-800">290 días</td>
                <td className="py-2.5 px-3 text-right text-[#1B4D3E] font-mono">$431.995,65</td>
                <td className="py-2.5 px-3 text-right text-[#1B4D3E] font-mono">$445.945,65</td>
                <td className="py-2.5 px-3 text-right text-[#1B4D3E] font-mono text-sm">$1.438,53</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Accesos Rápidos Operativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('movimientos')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800">Registrar Movimiento</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <p className="text-[11px] text-slate-500">
            Nacimientos, destetes, traslados entre subunidades y ventas.
          </p>
        </button>

        <button
          onClick={() => onNavigate('pesadas')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800">Control de Pesadas</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <p className="text-[11px] text-slate-500">
            Pesaje en balanza con chip RFID o lote para cálculo de ADPV real.
          </p>
        </button>

        <button
          onClick={() => onNavigate('ventas')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800">Liquidación de Ventas</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <p className="text-[11px] text-slate-500">
            Determinación de Venta Neta y deducciones comerciales según RT 22/54.
          </p>
        </button>

        <button
          onClick={() => onNavigate('cotizaciones')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800">Cotizaciones Cañuelas</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <p className="text-[11px] text-slate-500">
            Precios vigentes del MAG Cañuelas actualizados por IA Claude.
          </p>
        </button>
      </div>

      {/* Modal de Modificación de Meta / Estándar */}
      {editingKPI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header del modal */}
            <div className="bg-[#1B4D3E] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Modificar Meta del Indicador</h3>
                  <p className="text-[11px] text-emerald-200">
                    KPI {String(editingKPI.id).padStart(2, '0')} &bull; {editingKPI.perspectiva}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingKPI(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-800 text-sm">{editingKPI.name}</span>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {editingKPI.explanation}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Valor Real Actual:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {editingKPI.realValue} {editingKPI.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Meta Predeterminada de Fábrica:</span>
                  <span className="font-mono text-slate-700">
                    {editingKPI.defaultTarget} {editingKPI.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-500">Semáforo Actual:</span>
                  {renderTrafficLightBadge(editingKPI.trafficLight, editingKPI.statusLabel)}
                </div>
              </div>

              {/* Input de nueva meta */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Nuevo Valor de la Meta ({editingKPI.unit}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={tempTargetValue}
                    onChange={(e) => setTempTargetValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/40 focus:border-[#1B4D3E]"
                    placeholder={`Ej: ${editingKPI.defaultTarget}`}
                    autoFocus
                  />
                  <span className="text-sm font-semibold text-slate-500">{editingKPI.unit}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {editingKPI.targetDescription}
                </p>
              </div>

              {/* Nota sobre el semáforo */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Al guardar, el semáforo del indicador se recalculará instantáneamente comparando el valor real contra esta nueva meta.
                </span>
              </div>
            </div>

            {/* Acciones del modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetTargetToDefault}
                className="text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Valor Predeterminado</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingKPI(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1B4D3E] hover:bg-[#143B2F] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar y Recalcular</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pie de página discreto */}
      <div className="text-center text-xs text-slate-400 py-3">
        Establecimiento Pozo del Carril &bull; ERP Ganadero &bull; Tablero de Control de Gestión &bull; 11 Indicadores Clave de Gestión (KPIs)
      </div>
    </div>
  );
};
