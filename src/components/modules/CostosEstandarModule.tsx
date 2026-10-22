/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo: Costos Estándar de la Actividad Bovina (Octubre 2026)
 * Matriz paramétrica de alimentación, sanidad y costos directos por subunidad
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../services/dbEngine';
import {
  P_CostosSupuestos,
  P_CostosDietas,
  P_CostosVacunas,
  P_CostosDetalleDesglose,
  R_CostosEstandarTotales,
} from '../../types/database';
import {
  Calculator,
  RefreshCw,
  Coins,
  Wheat,
  ShieldCheck,
  Sliders,
  Table as TableIcon,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  Edit2,
  Save,
  X,
  RotateCcw,
  Info,
  FileSpreadsheet,
  Code2,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { APPS_SCRIPT_COSTOS_ESTANDAR_ONLY_CODE } from '../../services/googleAppsScriptTemplate';
import { addCostosEstandarSheetsViaApi, getGoogleAccessToken } from '../../services/googleAuth';

type TabType = 'consolidados' | 'desglose' | 'dietas' | 'sanidad' | 'supuestos';

export const CostosEstandarModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('consolidados');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal de Integración / Creación en Google Sheets
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isCreatingInSheets, setIsCreatingInSheets] = useState(false);
  const [sheetsCreateResult, setSheetsCreateResult] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string[];
  } | null>(null);

  // Estados de datos reactivos desde dbEngine
  const [totales, setTotales] = useState<R_CostosEstandarTotales[]>([]);
  const [desglose, setDesglose] = useState<P_CostosDetalleDesglose[]>([]);
  const [dietas, setDietas] = useState<P_CostosDietas[]>([]);
  const [vacunas, setVacunas] = useState<P_CostosVacunas[]>([]);
  const [supuestos, setSupuestos] = useState<P_CostosSupuestos[]>([]);

  // Filtros interactivos
  const [filtroSubunidad, setFiltroSubunidad] = useState<string>('all');
  const [filtroGrupoSupuesto, setFiltroGrupoSupuesto] = useState<string>('all');

  // Modal / Edición de supuestos
  const [editingSupuesto, setEditingSupuesto] = useState<P_CostosSupuestos | null>(null);
  const [newValor, setNewValor] = useState<string>('');

  const loadData = () => {
    setTotales([...db.getCostosEstandarTotales()]);
    setDesglose([...db.getCostosDetalleDesglose()]);
    setDietas([...db.getCostosDietas()]);
    setVacunas([...db.getCostosVacunas()]);
    setSupuestos([...db.getCostosSupuestos()]);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleSyncWithSheets = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await db.syncCostosConSheets();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: res.message || 'Tablas de costos estándar sincronizadas correctamente con Google Sheets.',
        });
        loadData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'No se pudo contactar a Google Sheets. Se mantienen los datos de referencia en memoria.',
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: `Error al sincronizar con Google Sheets: ${e.message}`,
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleOpenEdit = (sup: P_CostosSupuestos) => {
    setEditingSupuesto(sup);
    setNewValor(String(sup.valor));
  };

  const handleSaveEdit = () => {
    if (!editingSupuesto) return;
    const num = parseFloat(newValor);
    if (!isNaN(num)) {
      db.updateCostosSupuesto(editingSupuesto.id_supuesto, num);
      loadData();
      setEditingSupuesto(null);
    }
  };

  const handleResetToBaseline = () => {
    if (window.confirm('¿Desea restablecer todos los supuestos y costos a los valores oficiales de referencia de Octubre 2026?')) {
      localStorage.removeItem('pozo_del_carril_db_v1');
      window.location.reload();
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_COSTOS_ESTANDAR_ONLY_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCreateInSheetsAuto = async () => {
    setIsCreatingInSheets(true);
    setSheetsCreateResult(null);

    const cfg = db.getSheetsConfig();

    // 1. Intentar primero por Google Sheets REST API si hay token OAuth
    try {
      const token = await getGoogleAccessToken();
      if (token && (cfg.spreadsheetUrl || cfg.spreadsheetId)) {
        const resApi = await addCostosEstandarSheetsViaApi(cfg.spreadsheetUrl || cfg.spreadsheetId);
        setSheetsCreateResult({
          type: 'success',
          message: resApi.message,
          details: [
            ...(resApi.sheetsCreated.length > 0 ? [`Tablas nuevas creadas: ${resApi.sheetsCreated.join(', ')}`] : []),
            ...(resApi.alreadyExisting.length > 0 ? [`Tablas preexistentes preservadas intactas: ${resApi.alreadyExisting.join(', ')}`] : []),
          ],
        });
        loadData();
        setIsCreatingInSheets(false);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Fallo intento vía REST API OAuth, probando webhook backend:', apiErr.message);
    }

    // 2. Intentar a través del backend webhook
    try {
      const response = await fetch('/api/sheets/costos-estandar/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cfg.webhookUrl }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSheetsCreateResult({
          type: 'success',
          message: data.message || 'Tablas de costos estándar creadas / verificadas de forma no destructiva.',
          details: data.gasResult?.result?.creadas?.length
            ? [`Creadas: ${data.gasResult.result.creadas.join(', ')}`, `Preservadas: ${data.gasResult.result.yaExistian.join(', ')}`]
            : ['Tablas sincronizadas con Google Sheets.'],
        });
        loadData();
      } else {
        setSheetsCreateResult({
          type: 'error',
          message: data.error || 'No se pudo conectar con el Webhook de Google Apps Script. Por favor copie el código provisto a continuación y ejecútelo directamente en su Google Sheets.',
        });
      }
    } catch (err: any) {
      setSheetsCreateResult({
        type: 'error',
        message: `Error de conexión: ${err.message}. Puede copiar el código provisto a continuación y ejecutarlo en Extensiones > Apps Script.`,
      });
    } finally {
      setIsCreatingInSheets(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatNumber = (val: number, decimals: number = 2) => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  // KPIs de resumen
  const faenaTotal = totales.find(t => t.subunidad.includes('Acumulado'));
  const recriaTotal = totales.find(t => t.subunidad === 'Recría');
  const adapTotal = totales.find(t => t.subunidad === 'Adaptación');
  const engordeTotal = totales.find(t => t.subunidad === 'Engorde Final');

  return (
    <div className="space-y-6">
      {/* Encabezado y Leyenda Oficial */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1B4D3E]/10 flex items-center justify-center text-[#1B4D3E]">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Costos Estándar por Subunidad
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  Matriz paramétrica de alimentación, sanidad y costos directos de la actividad bovina
                </p>
              </div>
            </div>
            {/* Leyenda o nota aclaratoria discreta */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Valores y cálculos de referencia actualizados a Octubre de 2026</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowSheetsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 active:scale-[0.98] transition-all shadow-xs"
              title="Crear o exportar estas 5 tablas al Google Sheets conectado"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Agregar a Google Sheets</span>
            </button>

            <button
              onClick={handleSyncWithSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-[#1B4D3E] hover:bg-[#143B2F] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Costos con Sheets'}</span>
            </button>

            <button
              onClick={handleResetToBaseline}
              title="Restablecer valores de referencia Octubre 2026"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
          </div>
        </div>

        {/* Feedback visual de sincronización */}
        {syncFeedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2.5 border ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {syncFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Costo $/kg Terminado</span>
            <Coins className="w-4 h-4 text-[#1B4D3E]" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {faenaTotal ? formatCurrency(faenaTotal.costo_por_kg_ganado) : '$ 1.438,53'}{' '}
            <span className="text-xs font-normal text-slate-500">/ kg ganado</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">310 kg ganados</span> en ciclo completo (140 a 450 kg)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Costo Total Recría a Faena</span>
            <Scale className="w-4 h-4 text-[#1B4D3E]" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {faenaTotal ? formatCurrency(faenaTotal.costo_total_cab) : '$ 445.945,65'}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            <span>Alimentación: </span>
            <span className="font-semibold text-slate-800">
              {faenaTotal ? formatCurrency(faenaTotal.costo_alimentacion) : '$ 431.995,65'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Sanidad y Vacunas Acum.</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {faenaTotal ? formatCurrency(faenaTotal.costo_vacunas) : '$ 13.950,00'}
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            <span>Recría ($9.850) + Adaptación ($4.100)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Días Totales de Proceso</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            290 <span className="text-xs font-normal text-slate-500">días</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Recría: 180d | Adaptación: 50d | Engorde: 60d
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-slate-200 bg-white px-3 rounded-t-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('consolidados')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'consolidados'
              ? 'border-[#1B4D3E] text-[#1B4D3E]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Totales Consolidados (R_CostosEstandarTotales)</span>
        </button>

        <button
          onClick={() => setActiveTab('desglose')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'desglose'
              ? 'border-[#1B4D3E] text-[#1B4D3E]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Desglose por Subunidad (P_CostosDetalleDesglose)</span>
        </button>

        <button
          onClick={() => setActiveTab('dietas')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'dietas'
              ? 'border-[#1B4D3E] text-[#1B4D3E]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>Dietas y Consumos (P_CostosDietas)</span>
        </button>

        <button
          onClick={() => setActiveTab('sanidad')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'sanidad'
              ? 'border-[#1B4D3E] text-[#1B4D3E]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Plan Sanitario (P_CostosVacunas)</span>
        </button>

        <button
          onClick={() => setActiveTab('supuestos')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'supuestos'
              ? 'border-[#1B4D3E] text-[#1B4D3E]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Precios Base y Supuestos (P_CostosSupuestos)</span>
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* 1. TOTALES CONSOLIDADOS */}
      {activeTab === 'consolidados' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Resumen Ejecutivo de Costos Estándar por Subunidad
                </h3>
                <p className="text-xs text-slate-500">
                  Consolidación de costos directos de alimentación, protocolo sanitario y determinación de costo por kg producido.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#1B4D3E]/10 text-[#1B4D3E] self-start sm:self-auto">
                Tabla R_CostosEstandarTotales
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#1B4D3E] text-white text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subunidad Productiva</th>
                    <th className="py-3 px-4 text-right">Costo Alimentación</th>
                    <th className="py-3 px-4 text-right">Costo Vacunas / Sanidad</th>
                    <th className="py-3 px-4 text-right">Costo Total por Cabeza</th>
                    <th className="py-3 px-4 text-right font-bold">Costo por Kg Ganado</th>
                    <th className="py-3 px-4 text-center">Incidencia Alim.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {totales.map((row, idx) => {
                    const isTotalRow = row.subunidad.includes('Acumulado');
                    const incidenciaAlim = row.costo_total_cab > 0
                      ? ((row.costo_alimentacion / row.costo_total_cab) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isTotalRow
                            ? 'bg-emerald-50 font-bold text-slate-900'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-2">
                            {isTotalRow && <TrendingUp className="w-4 h-4 text-emerald-700" />}
                            <span>{row.subunidad}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {formatCurrency(row.costo_alimentacion)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {formatCurrency(row.costo_vacunas)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.costo_total_cab)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-[#1B4D3E]">
                          {row.costo_por_kg_ganado > 0 ? (
                            <span>{formatCurrency(row.costo_por_kg_ganado)} / kg</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-xs">
                              (Costo destete: $ 710,33/kg)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {incidenciaAlim}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjetas explicativas de subunidades */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Recría Pastoril (180 días)</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                140 kg a 280 kg de PV (+140 kg ganados). Pastoreo de alfalfa (65%) con aporte de maíz propio (10%), soja concentrado (5%) y núcleo mineral con monensina (5%).
              </p>
              <div className="text-xs space-y-1 font-mono pt-2 border-t border-slate-100 text-slate-700">
                <div className="flex justify-between">
                  <span>Alimentación:</span>
                  <span className="font-semibold">$ 203.319,80</span>
                </div>
                <div className="flex justify-between">
                  <span>Vacunas:</span>
                  <span className="font-semibold">$ 9.850,00</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Costo $/kg ganado:</span>
                  <span>$ 1.522,64 / kg</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Adaptación Ruminal (50 días)</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                280 kg a 357,25 kg de PV (+77,25 kg ganados @ 1,545 kg/día). Introducción de silaje de maíz (25%) y grano de maíz (25%) para acostumbrar la flora bacteriana.
              </p>
              <div className="text-xs space-y-1 font-mono pt-2 border-t border-slate-100 text-slate-700">
                <div className="flex justify-between">
                  <span>Alimentación:</span>
                  <span className="font-semibold">$ 98.524,10</span>
                </div>
                <div className="flex justify-between">
                  <span>Vacunas:</span>
                  <span className="font-semibold">$ 4.100,00</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Costo $/kg ganado:</span>
                  <span>$ 1.328,47 / kg</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Engorde / Corral Final (60 días)</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                357,25 kg a 450 kg peso faena (+92,75 kg ganados @ 1,545 kg/día). Ración concentrada con maíz (25%), silaje (20%), alfalfa (50%) y núcleo mineral (5%). Libre de vacunas (resguardo faena).
              </p>
              <div className="text-xs space-y-1 font-mono pt-2 border-t border-slate-100 text-slate-700">
                <div className="flex justify-between">
                  <span>Alimentación:</span>
                  <span className="font-semibold">$ 130.151,75</span>
                </div>
                <div className="flex justify-between">
                  <span>Vacunas:</span>
                  <span className="font-semibold">$ 0,00</span>
                </div>
                <div className="flex justify-between text-rose-800 font-bold">
                  <span>Costo $/kg ganado:</span>
                  <span>$ 1.403,25 / kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DESGLOSE POR SUBUNIDAD */}
      {activeTab === 'desglose' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Desglose Renglón por Renglón de Alimentación y Forrajes
                </h3>
                <p className="text-xs text-slate-500">
                  Consumos en Materia Seca (kg MS), tal cual (kg verde/grano), precios unitarios devengados y costo total por animal.
                </p>
              </div>

              {/* Selector de subunidad */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Filtrar:</span>
                <select
                  value={filtroSubunidad}
                  onChange={e => setFiltroSubunidad(e.target.value)}
                  className="text-xs rounded-lg border-slate-300 shadow-sm focus:ring-[#1B4D3E] focus:border-[#1B4D3E] py-1.5 px-2.5 bg-white font-medium"
                >
                  <option value="all">Todas las Subunidades</option>
                  <option value="Cría">Cría</option>
                  <option value="Recría">Recría</option>
                  <option value="Adaptación">Adaptación</option>
                  <option value="Engorde Final">Engorde Final</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#1B4D3E] text-white text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subunidad</th>
                    <th className="py-3 px-4">Ingrediente / Concepto de Dieta</th>
                    <th className="py-3 px-4 text-right">Consumo MS (kg)</th>
                    <th className="py-3 px-4 text-right">Tal Cual (kg)</th>
                    <th className="py-3 px-4 text-right">Precio Unitario</th>
                    <th className="py-3 px-4 text-right font-bold">Costo Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {desglose
                    .filter(d => filtroSubunidad === 'all' || d.subunidad === filtroSubunidad)
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            item.subunidad === 'Cría' ? 'bg-sky-100 text-sky-800' :
                            item.subunidad === 'Recría' ? 'bg-emerald-100 text-emerald-800' :
                            item.subunidad === 'Adaptación' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.subunidad}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.ingrediente_concepto}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatNumber(item.kg_ms, 2)} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatNumber(item.kg_tal_cual, 2)} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {formatCurrency(item.precio_unitario)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.costo_total)}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-4" colSpan={2}>
                      Total Renglones Seleccionados:
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatNumber(
                        desglose
                          .filter(d => filtroSubunidad === 'all' || d.subunidad === filtroSubunidad)
                          .reduce((acc, curr) => acc + curr.kg_ms, 0),
                        2
                      )}{' '}
                      kg
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatNumber(
                        desglose
                          .filter(d => filtroSubunidad === 'all' || d.subunidad === filtroSubunidad)
                          .reduce((acc, curr) => acc + curr.kg_tal_cual, 0),
                        2
                      )}{' '}
                      kg
                    </td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right font-mono font-black text-[#1B4D3E]">
                      {formatCurrency(
                        desglose
                          .filter(d => filtroSubunidad === 'all' || d.subunidad === filtroSubunidad)
                          .reduce((acc, curr) => acc + curr.costo_total, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DIETAS Y CONSUMOS */}
      {activeTab === 'dietas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                Matriz Paramétrica de Dietas, Materia Seca y Conversión
              </h3>
              <p className="text-xs text-slate-500">
                Parámetros biológicos de consumo sobre peso vivo, duración de etapas, aumento diario (ADPV) y reparto porcentual de ingredientes.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#1B4D3E] text-white text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Concepto / Parámetro Físico</th>
                    <th className="py-3 px-4 text-right">Recría (140-280 kg)</th>
                    <th className="py-3 px-4 text-right">Adaptación (280-357 kg)</th>
                    <th className="py-3 px-4 text-right">Engorde Final (357-450 kg)</th>
                    <th className="py-3 px-4 text-right">Cría (Vaca/Año)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dietas.map((row, idx) => {
                    const isPercentageSection = row.concepto.includes('% MS');
                    const isTotalSection = row.concepto.includes('Total') || row.concepto.includes('Conversión');

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isTotalSection
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : isPercentageSection
                            ? 'hover:bg-emerald-50/40'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          {isPercentageSection && <Wheat className="w-3.5 h-3.5 text-amber-600" />}
                          <span>{row.concepto}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {typeof row.recria === 'number' ? formatNumber(row.recria, 2) : row.recria}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {typeof row.adaptacion === 'number' ? formatNumber(row.adaptacion, 2) : row.adaptacion}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {typeof row.engorde_final === 'number' ? formatNumber(row.engorde_final, 2) : row.engorde_final}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {typeof row.cria_vaca_ano === 'number' ? formatNumber(row.cria_vaca_ano, 2) : row.cria_vaca_ano}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAN SANITARIO */}
      {activeTab === 'sanidad' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Plan Sanitario Oficial y Precios de Dosis por Categoría
                </h3>
                <p className="text-xs text-slate-500">
                  Protocolo preventivo con esquemas oficiales SENASA (Aftosa, Carbunclo, Clostridiales, Queratoconjuntivitis y Antiparasitarios).
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#1B4D3E]/10 text-[#1B4D3E] self-start sm:self-auto">
                Tabla P_CostosVacunas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#1B4D3E] text-white text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subunidad / Categoría</th>
                    <th className="py-3 px-4">Vacuna / Fármaco / Protocolo</th>
                    <th className="py-3 px-4 text-center">Dosis Anuales</th>
                    <th className="py-3 px-4 text-right">Precio por Dosis</th>
                    <th className="py-3 px-4 text-right font-bold">Total Anual por Animal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {vacunas.map((vac, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          vac.categoria === 'Cría' ? 'bg-sky-100 text-sky-800' :
                          vac.categoria === 'Recría' ? 'bg-emerald-100 text-emerald-800' :
                          vac.categoria === 'Adaptación' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {vac.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{vac.vacuna_nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {vac.dosis_anual}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(vac.precio_dosis)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(vac.total_anual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-4" colSpan={4}>
                      Total General Protocolo Sanitario:
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-[#1B4D3E]">
                      {formatCurrency(vacunas.reduce((acc, curr) => acc + curr.total_anual, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. PRECIOS BASE Y SUPUESTOS */}
      {activeTab === 'supuestos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Precios Base, Parámetros Biológicos y Supuestos Económicos
                </h3>
                <p className="text-xs text-slate-500">
                  Haga clic en el ícono de edición para modificar cualquier valor. El motor recalcula en vivo el costo de las dietas y el costo por kg.
                </p>
              </div>

              {/* Filtro por grupo */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Grupo:</span>
                <select
                  value={filtroGrupoSupuesto}
                  onChange={e => setFiltroGrupoSupuesto(e.target.value)}
                  className="text-xs rounded-lg border-slate-300 shadow-sm focus:ring-[#1B4D3E] focus:border-[#1B4D3E] py-1.5 px-2.5 bg-white font-medium"
                >
                  <option value="all">Todos los Grupos</option>
                  <option value="Precios Base">Precios Base</option>
                  <option value="Pasturas">Pasturas y Forrajes</option>
                  <option value="Materia Seca (% MS)">Materia Seca (% MS)</option>
                  <option value="Proceso Productivo">Proceso Productivo</option>
                  <option value="Cría">Cría</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#1B4D3E] text-white text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Grupo</th>
                    <th className="py-3 px-4">Concepto del Parámetro</th>
                    <th className="py-3 px-4 text-right font-bold">Valor</th>
                    <th className="py-3 px-4 text-center">Unidad</th>
                    <th className="py-3 px-4">Fuente / Nota / Fórmula</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {supuestos
                    .filter(s => filtroGrupoSupuesto === 'all' || s.grupo === filtroGrupoSupuesto)
                    .map((sup, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {sup.grupo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {sup.concepto}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatNumber(sup.valor, sup.tipo === 'precio' || sup.tipo === 'costo_unitario' ? 2 : 2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-600">
                          {sup.unidad}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-sans">
                          {sup.fuente_nota}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenEdit(sup)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#1B4D3E] hover:bg-emerald-50 transition-colors"
                            title="Editar valor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Supuesto */}
      {editingSupuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#1B4D3E]">
                <Edit2 className="w-5 h-5" />
                <h3 className="font-bold text-slate-900">Modificar Supuesto</h3>
              </div>
              <button
                onClick={() => setEditingSupuesto(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Concepto</label>
                <div className="text-sm font-bold text-slate-900">{editingSupuesto.concepto}</div>
                <div className="text-xs text-slate-500">{editingSupuesto.grupo}</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nuevo Valor ({editingSupuesto.unidad})
                </label>
                <input
                  type="number"
                  step="any"
                  value={newValor}
                  onChange={e => setNewValor(e.target.value)}
                  className="mt-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-[#1B4D3E] focus:ring-[#1B4D3E] py-2 px-3 text-sm font-mono font-semibold"
                  autoFocus
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  Al guardar, el sistema recalcula en tiempo real los costos de las dietas, los totales por cabeza y el costo por kg ganado.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingSupuesto(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1B4D3E] hover:bg-[#143B2F] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar y Recalcular</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conexión y Creación de Tablas en Google Sheets */}
      {showSheetsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="bg-gradient-to-r from-[#1B4D3E] to-[#143B2F] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Agregar Tablas de Costos a Google Sheets</h3>
                  <p className="text-xs text-emerald-200">
                    5 Nuevas Hojas de Referencia Bovina (Octubre 2026)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Banner de Garantía No Destructiva */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-900 text-sm">
                    Garantía 100% No Destructiva para tu Google Sheets
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Este script <strong>NO borra, renombra ni modifica ninguna hoja existente</strong>. Revisa primero si cada una de las 5 tablas ya existe: si ya existe, la conserva intacta sin tocarla. Si falta, crea la nueva pestaña con encabezados en verde ganadero, congelamiento de fila 1 y los datos calculados a Octubre 2026.
                  </p>
                </div>
              </div>

              {/* Lista de las 5 tablas que se crearán */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-[#1B4D3E]" />
                  <span>Las 5 Nuevas Hojas Paramétricas:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-emerald-700">P_CostosSupuestos</span>
                    <p className="text-slate-500 mt-0.5">Dólar BNA, insumos tal cual, amortizaciones, días y pesos.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-emerald-700">P_CostosDietas</span>
                    <p className="text-slate-500 mt-0.5">Consumo % PV, MS total, reparto % e ingredientes por subunidad.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-emerald-700">P_CostosVacunas</span>
                    <p className="text-slate-500 mt-0.5">Plan sanitario completo por categoría, dosis y precios.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-emerald-700">P_CostosDetalleDesglose</span>
                    <p className="text-slate-500 mt-0.5">Renglón por renglón con kg MS, kg tal cual, precio y costo final.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                    <span className="font-mono font-bold text-emerald-700">R_CostosEstandarTotales</span>
                    <p className="text-slate-500 mt-0.5">Consolidado ejecutivo: Alimentación, Vacunas, Total Cabeza y $/kg ganado.</p>
                  </div>
                </div>
              </div>

              {/* Feedback de resultado si hubo acción */}
              {sheetsCreateResult && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                    sheetsCreateResult.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {sheetsCreateResult.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <span>{sheetsCreateResult.message}</span>
                  </div>
                  {sheetsCreateResult.details && sheetsCreateResult.details.length > 0 && (
                    <ul className="text-xs list-disc list-inside space-y-0.5 pl-2 mt-1">
                      {sheetsCreateResult.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Métodos de Aplicación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opción A: Automático */}
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors bg-white">
                  <div>
                    <div className="inline-block px-2 py-0.5 text-[11px] font-bold text-[#1B4D3E] bg-emerald-50 rounded mb-2">
                      OPCIÓN A &bull; AUTOMÁTICA
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Crear mediante Conexión Directa</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Envía la instrucción a la API de Google Sheets conectada al ERP para verificar y crear las 5 tablas automáticamente.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateInSheetsAuto}
                    disabled={isCreatingInSheets}
                    className="mt-4 w-full py-2.5 px-4 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {isCreatingInSheets ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando y creando tablas...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Crear en Google Sheets Ahora</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Opción B: Copiar código Apps Script */}
                <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors bg-white">
                  <div>
                    <div className="inline-block px-2 py-0.5 text-[11px] font-bold text-slate-700 bg-slate-100 rounded mb-2">
                      OPCIÓN B &bull; DESDE APPS SCRIPT
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Copiar Código de Creación (1 Clic)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Copia el script listo para pegar en el editor de Apps Script de tu planilla. No toca tus 20 hojas actuales.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyScript}
                    className={`mt-4 w-full py-2.5 px-4 font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors ${
                      copiedScript
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Código Copiado al Portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código Apps Script</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instrucciones paso a paso para Opción B */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-slate-600" />
                  <span>Pasos para ejecutar el código copiado en Google Sheets:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Abre tu planilla de Google Sheets del ERP.</li>
                  <li>Ve al menú superior: <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>
                    Haz clic en <strong>+ (Agregar archivo) &gt; Script</strong>, nómbralo <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">CostosEstandar.gs</code> y pega el código copiado (o agrégalo al final de <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Código.gs</code>).
                  </li>
                  <li>
                    En el selector de función arriba, selecciona <code className="bg-slate-200 px-1 py-0.5 rounded text-emerald-800 font-bold font-mono">crearTablasCostosEstandar</code> y haz clic en <strong>Ejecutar</strong>.
                  </li>
                  <li>
                    ¡Listo! Regresa a la planilla y verás las 5 nuevas pestañas creadas con los datos y formato verde institucional.
                  </li>
                </ol>
              </div>

              {/* Vista previa del código */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Vista previa del script seguro:</span>
                  <span>Solo agrega las 5 tablas sin alterar el resto</span>
                </div>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {APPS_SCRIPT_COSTOS_ESTANDAR_ONLY_CODE}
                </pre>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSheetsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nota discreta al pie */}
      <div className="text-center text-xs text-slate-400 py-2">
        Establecimiento Pozo del Carril &bull; Sistema ERP Ganadero &bull; Módulo de Costos Estándar &bull; Valores y cálculos de referencia actualizados a Octubre de 2026
      </div>
    </div>
  );
};
