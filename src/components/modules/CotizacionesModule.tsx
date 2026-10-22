/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo: Cotización de Animales con Precios Dinámicos
 * 
 * Cumple estrictamente con las reglas:
 * 1. Lee las 3 hojas históricas acumuladas generadas por el script de Claude:
 *    - Cañuelas_Claude (MAG S.A. - $/kg vivo)
 *    - Invernada_Claude (ROSGAN - $/kg)
 *    - Cría_Claude (ROSGAN - $/animal)
 * 2. Determina el precio VIGENTE tomando la consulta más reciente y priorizando DEFINITIVOS sobre PROVISORIOS.
 * 3. Valuación por subunidad según fuentes asignadas:
 *    - Cría: Cría_Claude ($/animal) y/o Invernada_Claude para ternero ($/kg)
 *    - Recría y Adaptación: Invernada_Claude ($/kg)
 *    - Venta terminada / Engorde: Cañuelas_Claude ($/kg vivo)
 * 4. Valuación de existencias biológicas (RT 22 / RT 54).
 * 5. Botón 'Actualizar cotizaciones' con alerta si está desactualizado.
 * 6. Ajuste manual auditable con motivo y opción de reversión a mercado.
 * 7. Ningún precio inventado ni supuesto.
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../services/dbEngine';
import { CotizacionVigente, ValuacionSubunidad } from '../../types/cotizaciones';
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldAlert,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Clock,
  CircleDot,
  FileSpreadsheet
} from 'lucide-react';

export const CotizacionesModule: React.FC = () => {
  const [indicadores, setIndicadores] = useState(db.getIndicadoresMercado());
  const [cotizacionesVigentes, setCotizacionesVigentes] = useState<CotizacionVigente[]>([]);
  const [valuacionConsolidada, setValuacionConsolidada] = useState<{
    valuacion_total: number;
    total_cabezas: number;
    subunidades: ValuacionSubunidad[];
    advertencias: string[];
  }>({ valuacion_total: 0, total_cabezas: 0, subunidades: [], advertencias: [] });

  const [activeTab, setActiveTab] = useState<'vigentes' | 'valuacion' | 'canuelas' | 'invernada' | 'cria'>('vigentes');
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Raw data state
  const [rawData, setRawData] = useState(db.getRawCotizaciones());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubunidadFilter, setSelectedSubunidadFilter] = useState<string>('all');

  // Modal de Ajuste Manual
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [ajusteTarget, setAjusteTarget] = useState<CotizacionVigente | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('');
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');

  const reloadData = () => {
    setIndicadores(db.getIndicadoresMercado());
    setCotizacionesVigentes(db.getAllCotizacionesVigentes());
    setValuacionConsolidada(db.getValuacionStockConsolidado());
    setRawData(db.getRawCotizaciones());
  };

  useEffect(() => {
    reloadData();
    const unsub = db.subscribe(() => {
      reloadData();
    });
    return () => unsub();
  }, []);

  const handleActualizarCotizaciones = async () => {
    setIsUpdating(true);
    try {
      const res = await db.fetchAndSyncCotizaciones();
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Cotizaciones actualizadas correctamente.' });
      } else {
        setNotification({
          type: 'warning',
          message: res.error || 'No se pudo contactar a Google Sheets. Mostrando último histórico disponible.',
        });
      }
    } catch (e: any) {
      setNotification({
        type: 'warning',
        message: 'Error al consultar Google Sheets. Se mantiene el último historial registrado.',
      });
    } finally {
      setIsUpdating(false);
      reloadData();
      setTimeout(() => setNotification(null), 4500);
    }
  };

  const handleOpenAjuste = (cot: CotizacionVigente) => {
    setAjusteTarget(cot);
    setNuevoPrecio(cot.precio_vigente.toString());
    setMotivoAjuste(cot.motivo_ajuste || '');
    setModalAjusteOpen(true);
  };

  const handleSaveAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteTarget) return;

    const val = parseFloat(nuevoPrecio);
    if (isNaN(val) || val <= 0) {
      alert('Por favor ingrese un precio numérico válido mayor a cero.');
      return;
    }
    if (!motivoAjuste.trim()) {
      alert('Debe especificar un motivo u observación para justificar el ajuste manual.');
      return;
    }

    db.setAjusteManualPrecio(
      ajusteTarget.id_categoria,
      ajusteTarget.id_subunidad,
      val,
      motivoAjuste.trim(),
      'Usuario Activo'
    );

    setModalAjusteOpen(false);
    setAjusteTarget(null);
    setNotification({
      type: 'success',
      message: `Ajuste manual aplicado a ${ajusteTarget.categoria_erp} ($${val.toLocaleString('es-AR')}). Registrado en bitácora.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRevertirAjuste = (id_cat: number, id_sub: number, catNombre: string) => {
    db.revertirAjusteManualPrecio(id_cat, id_sub);
    setNotification({
      type: 'success',
      message: `Se restableció la cotización de mercado oficial para ${catNombre}.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtrado de la matriz vigente
  const cotizacionesFiltradas = cotizacionesVigentes.filter(c => {
    const matchesTerm =
      c.categoria_erp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoria_fuente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fuente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSub =
      selectedSubunidadFilter === 'all' || c.subunidad_nombre.toLowerCase() === selectedSubunidadFilter.toLowerCase();
    return matchesTerm && matchesSub;
  });

  return (
    <div className="space-y-6">
      {/* Banner de Notificación */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Alerta de Desactualización del Script de Claude */}
      {indicadores.desactualizado && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                ⚠️ Cotizaciones no actualizadas en la fecha de hoy
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {indicadores.ultimaConsulta ? (
                  <span>
                    Última consulta registrada en la planilla: <strong>{indicadores.ultimaConsulta}</strong>.
                  </span>
                ) : (
                  <span>No se registran consultas recientes del script.</span>
                )}{' '}
                El script de Google Apps Script se ejecuta diariamente a las 8 hs o manualmente desde el menú "🐄 Agrofy" de la planilla. Se están utilizando las últimas cotizaciones históricas válidas.
              </p>
            </div>
          </div>
          <button
            onClick={handleActualizarCotizaciones}
            disabled={isUpdating}
            className="shrink-0 ml-4 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>Consultar ahora</span>
          </button>
        </div>
      )}

      {/* Header Ejecutivo */}
      <div className="bg-[#1B4D3E] text-white p-6 rounded-2xl shadow-md border border-emerald-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Mercado Agroganadero & ROSGAN
              </span>
              <span className="text-xs text-emerald-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Consulta: {indicadores.ultimaConsulta || 'Sin datos'}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Cotizaciones Dinámicas de Ganado
            </h2>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-3xl">
              Precios vivos de mercado sin intervención manual fija: lectura acumulativa de las hojas{' '}
              <code className="bg-emerald-900/60 px-1 py-0.5 rounded text-xs text-emerald-200">Cañuelas_Claude</code>,{' '}
              <code className="bg-emerald-900/60 px-1 py-0.5 rounded text-xs text-emerald-200">Invernada_Claude</code> y{' '}
              <code className="bg-emerald-900/60 px-1 py-0.5 rounded text-xs text-emerald-200">Cría_Claude</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleActualizarCotizaciones}
              disabled={isUpdating}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Consultando planillas...' : 'Actualizar cotizaciones'}</span>
            </button>
          </div>
        </div>

        {/* 4 Indicadores Clave de Mercado */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/60">
          {/* INMAG Cañuelas */}
          <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>INMAG Cañuelas</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-800/80 text-emerald-200 uppercase font-bold">
                {indicadores.estadoCanuelas || 'Definitivo'}
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ${indicadores.inmagCanuelas > 0 ? indicadores.inmagCanuelas.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              <span className="text-xs font-normal text-emerald-300 ml-1">/kg</span>
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1">
              Índice Novillo MAG (Resol. 32/2018)
            </div>
          </div>

          {/* Índice Ternero ROSGAN */}
          <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>Índice Ternero</span>
              <span className="text-[10px] text-emerald-300">ROSGAN Invernada</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ${indicadores.indiceTerneroRosgan > 0 ? indicadores.indiceTerneroRosgan.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              <span className="text-xs font-normal text-emerald-300 ml-1">/kg</span>
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1">
              PIRI Invernada: ${indicadores.piriRosgan ? indicadores.piriRosgan.toFixed(2) : '—'}
            </div>
          </div>

          {/* Novillo Gordo Cañuelas */}
          <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>Novillo Gordo</span>
              <span className="text-[10px] text-emerald-300">MAG Cañuelas</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ${indicadores.novilloGordoCanuelas > 0 ? indicadores.novilloGordoCanuelas.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              <span className="text-xs font-normal text-emerald-300 ml-1">/kg vivo</span>
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1">
              Esp. Joven +430 kg terminados
            </div>
          </div>

          {/* Vientres Preñados ROSGAN Cría */}
          <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>Vientres Preñados</span>
              <span className="text-[10px] text-emerald-300">ROSGAN Cría</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ${indicadores.vientresPrendadosCria > 0 ? indicadores.vientresPrendadosCria.toLocaleString('es-AR') : '—'}
              <span className="text-xs font-normal text-emerald-300 ml-1">/animal</span>
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1">
              PIRC Cría: ${indicadores.pircRosgan ? indicadores.pircRosgan.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Resumen: Valuación Total Activos Biológicos (RT 22 / RT 54) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                Norma Contable RT 22 / RT 54
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Valuación de Existencias Biológicas a Valor de Mercado
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Stock de hacienda en pie valiado estrictamente con las cotizaciones dinámicas vigentes de Claude sin números supuestos.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Cabezas en Campo</div>
              <div className="text-xl font-black text-slate-900">{valuacionConsolidada.total_cabezas.toLocaleString('es-AR')} cab.</div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <div className="text-[11px] font-semibold text-emerald-700 uppercase">Valuación Total Existencias</div>
              <div className="text-2xl font-black text-emerald-700">
                ${valuacionConsolidada.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Subunidades Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          {valuacionConsolidada.subunidades.map(sub => (
            <div key={sub.id_subunidad} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{sub.nombre_subunidad}</span>
                <span className="text-xs font-semibold text-slate-500">{sub.total_cabezas} cab.</span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                ${sub.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {sub.id_subunidad === 1
                  ? 'Cría_Claude ($/animal) e Invernada ($/kg)'
                  : sub.id_subunidad === 2 || sub.id_subunidad === 3
                  ? 'Invernada_Claude ($/kg)'
                  : 'Cañuelas_Claude ($/kg vivo)'}
              </div>
            </div>
          ))}
        </div>

        {/* Advertencias de categorías sin cotización */}
        {valuacionConsolidada.advertencias.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Advertencia de Valuación (Regla: No inventar valores)</span>
            </div>
            {valuacionConsolidada.advertencias.map((adv, i) => (
              <p key={i} className="pl-5 text-amber-800">• {adv}</p>
            ))}
          </div>
        )}
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('vigentes')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'vigentes'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Matriz de Precios Vigentes ({cotizacionesFiltradas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('valuacion')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'valuacion'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Detalle de Valuación de Existencias</span>
        </button>

        <button
          onClick={() => setActiveTab('canuelas')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'canuelas'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Histórico Cañuelas_Claude ({rawData.canuelas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invernada')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'invernada'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Histórico Invernada_Claude ({rawData.invernada.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cria')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'cria'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Histórico Cría_Claude ({rawData.cria.length})</span>
        </button>
      </div>

      {/* Contenido Pestaña 1: Matriz de Precios Vigentes */}
      {activeTab === 'vigentes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar categoría, fuente o especie..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <select
                value={selectedSubunidadFilter}
                onChange={e => setSelectedSubunidadFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas las subunidades</option>
                <option value="Cría">Cría</option>
                <option value="Recría">Recría</option>
                <option value="Adaptación">Adaptación</option>
                <option value="Engorde a Corral">Engorde a Corral</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Mostrando <strong className="text-slate-800">{cotizacionesFiltradas.length}</strong> cotizaciones vigentes
            </div>
          </div>

          {/* Tabla de Matriz */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subunidad</th>
                  <th className="py-3 px-4">Categoría ERP</th>
                  <th className="py-3 px-4">Fuente Primaria</th>
                  <th className="py-3 px-4">Categoría en Fuente</th>
                  <th className="py-3 px-4 text-right">Cotización Vigente</th>
                  <th className="py-3 px-4">Rueda / Remate</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Última Consulta</th>
                  <th className="py-3 px-4 text-center">Tipo Precio</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {cotizacionesFiltradas.map((cot, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cot.subunidad_nombre}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {cot.categoria_erp}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          cot.fuente === 'Cañuelas_Claude'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : cot.fuente === 'Invernada_Claude'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : cot.fuente === 'Cría_Claude'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 font-black'
                        }`}
                      >
                        {cot.fuente}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cot.categoria_fuente || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-sm text-slate-900">
                        ${cot.precio_vigente > 0 ? cot.precio_vigente.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{cot.unidad_medida}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {cot.fecha_rueda_remate || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cot.estado === 'DEFINITIVOS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cot.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {cot.consulta || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cot.es_ajuste_manual ? (
                        <div className="flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Ajuste Manual
                          </span>
                          {cot.motivo_ajuste && (
                            <span className="text-[9px] text-amber-700 max-w-[120px] truncate mt-0.5" title={cot.motivo_ajuste}>
                              {cot.motivo_ajuste}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Automático Mercado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAjuste(cot)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
                          title="Reemplazar precio manualmente dejando registro auditable"
                        >
                          Ajustar
                        </button>
                        {cot.es_ajuste_manual && (
                          <button
                            onClick={() => handleRevertirAjuste(cot.id_categoria, cot.id_subunidad, cot.categoria_erp)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Revertir a cotización de mercado oficial"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenido Pestaña 2: Detalle de Valuación de Existencias (RT 22 / RT 54) */}
      {activeTab === 'valuacion' && (
        <div className="space-y-6">
          {valuacionConsolidada.subunidades.map(sub => (
            <div key={sub.id_subunidad} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Subunidad: {sub.nombre_subunidad}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total: {sub.total_cabezas} cabezas • {sub.total_kilos.toLocaleString('es-AR')} kg estimados
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Valuación Subunidad</div>
                  <div className="text-lg font-black text-emerald-700">
                    ${sub.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Categoría</th>
                      <th className="py-2.5 px-4 text-right">Cabezas</th>
                      <th className="py-2.5 px-4 text-right">Peso Prom.</th>
                      <th className="py-2.5 px-4 text-right">Kilos Totales</th>
                      <th className="py-2.5 px-4">Fuente Usada</th>
                      <th className="py-2.5 px-4 text-right">Precio Unitario</th>
                      <th className="py-2.5 px-4 text-right">Valuación ($ ARS)</th>
                      <th className="py-2.5 px-4">Auditoría Consulta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sub.desglose.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.categoria_nombre}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{item.cabezas} cab.</td>
                        <td className="py-2.5 px-4 text-right">{item.peso_promedio_kg} kg</td>
                        <td className="py-2.5 px-4 text-right">{item.kilos_totales.toLocaleString('es-AR')} kg</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.cotizacion.fuente}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black">
                          ${item.precio_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unidad_medida}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                          ${item.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-[10px] text-slate-400">
                          {item.cotizacion.consulta} ({item.cotizacion.estado})
                        </td>
                      </tr>
                    ))}
                    {sub.desglose.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 px-4 text-center text-slate-400">
                          No se registran existencias físicas activas en esta subunidad.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenido Pestaña 3: Histórico Cañuelas_Claude */}
      {activeTab === 'canuelas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Hoja Cañuelas_Claude (Mercado Agroganadero S.A.)</h4>
              <p className="text-xs text-slate-500">
                Precios oficiales en $ por kg vivo por categoría. Total acumulado: {rawData.canuelas.length} registros.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Grupo</th>
                  <th className="py-2.5 px-3 text-right">Cabezas</th>
                  <th className="py-2.5 px-3 text-right">Mínimo</th>
                  <th className="py-2.5 px-3 text-right">Máximo</th>
                  <th className="py-2.5 px-3 text-right">Promedio ($/kg)</th>
                  <th className="py-2.5 px-3 text-right">Mediana</th>
                  <th className="py-2.5 px-3">Fecha Rueda</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Consulta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rawData.canuelas.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.Categoría}</td>
                    <td className="py-2 px-3 text-slate-500">{r.Grupo}</td>
                    <td className="py-2 px-3 text-right">{r.Cabezas}</td>
                    <td className="py-2 px-3 text-right">${r['Precio Mín.']}</td>
                    <td className="py-2 px-3 text-right">${r['Precio Máx.']}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">${r['Precio Prom.']}</td>
                    <td className="py-2 px-3 text-right">${r.Mediana}</td>
                    <td className="py-2 px-3">{r['Fecha rueda']}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.Estado === 'DEFINITIVOS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.Estado}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[10px]">{r.Consulta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-xs text-slate-500">
            Mostrando las 50 filas más recientes de {rawData.canuelas.length} filas acumuladas en Google Sheets.
          </div>
        </div>
      )}

      {/* Contenido Pestaña 4: Histórico Invernada_Claude */}
      {activeTab === 'invernada' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Hoja Invernada_Claude (ROSGAN / BCR)</h4>
              <p className="text-xs text-slate-500">
                Precios de remates de invernada en $ por kg. Total acumulado: {rawData.invernada.length} registros.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Precio $/kg</th>
                  <th className="py-2.5 px-3 text-right">Var. Mensual</th>
                  <th className="py-2.5 px-3">Fecha Remate</th>
                  <th className="py-2.5 px-3 text-right">PIRI</th>
                  <th className="py-2.5 px-3 text-right">Índice Ternero</th>
                  <th className="py-2.5 px-3">Consulta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rawData.invernada.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.Categoría}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">${r['Precio $/kg']}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{r['Var. mensual']}%</td>
                    <td className="py-2 px-3">{r['Fecha remate']}</td>
                    <td className="py-2 px-3 text-right">{r.PIRI}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800">{r['Índice ternero']}</td>
                    <td className="py-2 px-3 text-slate-400 text-[10px]">{r.Consulta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-xs text-slate-500">
            Mostrando las 50 filas más recientes de {rawData.invernada.length} filas acumuladas en Google Sheets.
          </div>
        </div>
      )}

      {/* Contenido Pestaña 5: Histórico Cría_Claude */}
      {activeTab === 'cria' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Hoja Cría_Claude (ROSGAN / BCR)</h4>
              <p className="text-xs text-slate-500">
                Precios de vientres y reproductores en $ por animal. Total acumulado: {rawData.cria.length} registros.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Precio $/animal</th>
                  <th className="py-2.5 px-3 text-right">Var. Mensual</th>
                  <th className="py-2.5 px-3">Fecha Remate</th>
                  <th className="py-2.5 px-3 text-right">PIRC</th>
                  <th className="py-2.5 px-3">Consulta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rawData.cria.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.Categoría}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">
                      ${typeof r['Precio $/animal'] === 'number' ? r['Precio $/animal'].toLocaleString('es-AR') : r['Precio $/animal']}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{r['Var. mensual']}%</td>
                    <td className="py-2 px-3">{r['Fecha remate']}</td>
                    <td className="py-2 px-3 text-right">{r.PIRC}</td>
                    <td className="py-2 px-3 text-slate-400 text-[10px]">{r.Consulta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-xs text-slate-500">
            Mostrando las 50 filas más recientes de {rawData.cria.length} filas acumuladas en Google Sheets.
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual de Cotización */}
      {modalAjusteOpen && ajusteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ajuste Manual de Cotización</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ajusteTarget.subunidad_nombre} • {ajusteTarget.categoria_erp}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                {ajusteTarget.unidad_medida}
              </span>
            </div>

            <form onSubmit={handleSaveAjuste} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Precio Mercado Oficial:</span>
                  <strong className="text-slate-900">
                    ${ajusteTarget.precio_vigente.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {ajusteTarget.unidad_medida}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Fuente:</span>
                  <span className="text-slate-800">{ajusteTarget.fuente}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última Rueda / Remate:</span>
                  <span className="text-slate-800">{ajusteTarget.fecha_rueda_remate} ({ajusteTarget.estado})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nuevo Precio Ajustado ({ajusteTarget.unidad_medida}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={nuevoPrecio}
                  onChange={e => setNuevoPrecio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej: 2450.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo u Observación del Ajuste *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoAjuste}
                  onChange={e => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Indique la causa del reemplazo (ej: cotización diferencial por calidad Angus Cabaña, flete local bonificado, etc.)"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Este ajuste quedará expresamente registrado como "Ajuste Manual" en todas las auditorías y valuaciones.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAjusteOpen(false)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow transition cursor-pointer"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
