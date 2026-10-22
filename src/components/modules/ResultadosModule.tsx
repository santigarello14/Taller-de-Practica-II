/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 11: Resultados, Márgenes Brutos y Control de Gestión (Capa R_)
 * Vistas R_MargenSubunidad, R_DesvioRendimiento, R_DesvioConsumo, R_ResultadoConsolidado
 * Eliminación automática de transferencias recíprocas internas en la consolidación
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Scale,
  Wheat,
  ShieldAlert,
} from 'lucide-react';
import { db } from '../../services/dbEngine';

export const ResultadosModule: React.FC<{
  selectedSubunidadId: number | 'all';
  selectedCampanaId: number | 'all';
}> = ({ selectedSubunidadId, selectedCampanaId }) => {
  const state = db.getState();
  const [activeTab, setActiveTab] = useState<'margenes' | 'desvio_rinde' | 'desvio_consumo' | 'consolidado'>('margenes');

  const campId = selectedCampanaId === 'all' ? undefined : selectedCampanaId;
  const isConsolidado = selectedSubunidadId === 'all';

  // Obtener datos para las tablas R_
  const subunidades = state.D_Subunidad;

  const margenes = isConsolidado
    ? subunidades.map(s => db.getMargenSubunidad(s.id_subunidad, campId))
    : [db.getMargenSubunidad(selectedSubunidadId, campId)];

  const desviosRinde = isConsolidado
    ? subunidades.flatMap(s => db.getDesviosRendimiento(s.id_subunidad, campId))
    : db.getDesviosRendimiento(selectedSubunidadId, campId);

  const desviosConsumo = isConsolidado
    ? subunidades.flatMap(s => db.getDesviosConsumo(s.id_subunidad, campId))
    : db.getDesviosConsumo(selectedSubunidadId, campId);

  const consolidado = db.getResultadoConsolidado(campId);

  const handleExportCSV = (tipo: string) => {
    let csv = '';
    if (tipo === 'margenes') {
      const headers = ['id_campana', 'id_subunidad', 'nombre_subunidad', 'periodo', 'ingresos_brutos', 'gastos_comerciales', 'ventas_netas', 'costos_directos_reales', 'margen_bruto', 'porcentaje_sobre_costos'];
      const rows = margenes.map(m => [m.id_campana, m.id_subunidad, `"${m.nombre_subunidad}"`, `"${m.periodo}"`, m.ingresos_brutos, m.gastos_comerciales, m.ventas_netas, m.costos_directos_reales, m.margen_bruto, m.porcentaje_sobre_costos].join(','));
      csv = [headers.join(','), ...rows].join('\n');
    } else if (tipo === 'desvio_rinde') {
      const headers = ['id_campana', 'id_subunidad', 'nombre_subunidad', 'cabezas_evaluadas', 'dias_permanencia', 'rendimiento_estandar_kg', 'rendimiento_real_kg', 'desvio_rendimiento_kg', 'desvio_porcentual_rendimiento', 'precio_real_referencia', 'desvio_economico_rendimiento'];
      const rows = desviosRinde.map(d => [d.id_campana, d.id_subunidad, `"${d.nombre_subunidad}"`, d.cabezas_evaluadas, d.dias_permanencia, d.rendimiento_estandar_kg, d.rendimiento_real_kg, d.desvio_rendimiento_kg, d.desvio_porcentual_rendimiento, d.precio_real_referencia, d.desvio_economico_rendimiento].join(','));
      csv = [headers.join(','), ...rows].join('\n');
    } else if (tipo === 'desvio_consumo') {
      const headers = ['id_campana', 'id_subunidad', 'nombre_subunidad', 'id_insumo', 'nombre_insumo', 'codigo_um', 'consumo_estandar_fisico', 'consumo_real_fisico', 'desvio_consumo_fisico', 'desvio_porcentual_consumo', 'precio_real_unitario', 'desvio_economico_consumo'];
      const rows = desviosConsumo.map(d => [d.id_campana, d.id_subunidad, `"${d.nombre_subunidad}"`, d.id_insumo, `"${d.nombre_insumo}"`, `"${d.codigo_um}"`, d.consumo_estandar_fisico, d.consumo_real_fisico, d.desvio_consumo_fisico, d.desvio_porcentual_consumo, d.precio_real_unitario, d.desvio_economico_consumo].join(','));
      csv = [headers.join(','), ...rows].join('\n');
    } else if (tipo === 'consolidado') {
      const headers = ['id_campana', 'nombre_campana', 'ingresos_netos_totales', 'costos_directos_totales', 'margen_bruto_consolidado', 'porcentaje_sobre_costos_consolidado', 'transferencias_internas_neutralizadas'];
      const rows = [[consolidado.id_campana, `"${consolidado.nombre_campana}"`, consolidado.ingresos_netos_totales, consolidado.costos_directos_totales, consolidado.margen_bruto_consolidado, consolidado.porcentaje_sobre_costos_consolidado, consolidado.transferencias_internas_neutralizadas].join(',')];
      csv = [headers.join(','), ...rows].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `R_${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Vistas de Resultados y Control de Gestión (Capa R_)
            </h3>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {isConsolidado ? 'Consolidado Bovinos' : `Subunidad ID ${selectedSubunidadId}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calculado exclusivamente sobre hechos reales (F_) devengados. Desvíos estrictamente físicos monetizados a precio real (Reglas 3 y 6).
          </p>
        </div>

        <button
          onClick={() => handleExportCSV(activeTab)}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Vista R_{activeTab}.csv</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('margenes')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'margenes'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Márgenes Brutos por Subunidad (R_MargenSubunidad)</span>
        </button>
        <button
          onClick={() => setActiveTab('desvio_rinde')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'desvio_rinde'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Desvíos de Rendimiento (R_DesvioRendimiento)</span>
        </button>
        <button
          onClick={() => setActiveTab('desvio_consumo')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'desvio_consumo'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>Desvíos de Consumo Físico (R_DesvioConsumo)</span>
        </button>
        <button
          onClick={() => setActiveTab('consolidado')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'consolidado'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Consolidado Global (R_ResultadoConsolidado)</span>
        </button>
      </div>

      {/* TAB 1: R_MargenSubunidad */}
      {activeTab === 'margenes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>
              Fórmula obligatoria: <strong>MARGEN BRUTO = INGRESO NETO − COSTOS DIRECTOS</strong> | <strong>% SOBRE COSTOS = (MB / CD) × 100</strong>
            </span>
            <span>{margenes.length} etapas analizadas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Subunidad</th>
                  <th className="py-2.5 px-4">Período</th>
                  <th className="py-2.5 px-4">Ingreso Bruto</th>
                  <th className="py-2.5 px-4">Gastos Comerciales</th>
                  <th className="py-2.5 px-4">Venta Neta</th>
                  <th className="py-2.5 px-4">Costos Directos Reales</th>
                  <th className="py-2.5 px-4">Margen Bruto Real</th>
                  <th className="py-2.5 px-4">% Sobre Costos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {margenes.map(m => (
                  <tr key={m.id_subunidad} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-bold text-emerald-800">{m.nombre_subunidad}</td>
                    <td className="py-2.5 px-4 text-slate-500">{m.periodo}</td>
                    <td className="py-2.5 px-4 font-mono">${m.ingresos_brutos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 font-mono text-rose-700">-${m.gastos_comerciales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">${m.ventas_netas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-800">${m.costos_directos_reales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">${m.margen_bruto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        m.porcentaje_sobre_costos >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.porcentaje_sobre_costos.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: R_DesvioRendimiento */}
      {activeTab === 'desvio_rinde' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>
              Contraste de ganancia de peso (ADPV meta vs. pesadas reales en balanza)
            </span>
            <span className="font-semibold text-slate-700">
              Desvío Económico = (Real − Estándar) × Precio Real Cañuelas
            </span>
          </div>

          <div className="overflow-x-auto">
            {desviosRinde.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Scale className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay datos de pesadas para calcular desvíos de rendimiento.</p>
                <p className="mt-1">
                  Ingrese parámetros en P_EstandarRinde y pesadas de balanza en F_PesadasControl.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Subunidad</th>
                    <th className="py-2.5 px-4">Cabezas Evaluadas</th>
                    <th className="py-2.5 px-4">Días Permanencia</th>
                    <th className="py-2.5 px-4">Rendimiento Estándar</th>
                    <th className="py-2.5 px-4">Rendimiento Real</th>
                    <th className="py-2.5 px-4">Desvío Físico (kg)</th>
                    <th className="py-2.5 px-4">Desvío %</th>
                    <th className="py-2.5 px-4">Precio Real $/kg</th>
                    <th className="py-2.5 px-4">Desvío Económico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {desviosRinde.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-emerald-800">{d.nombre_subunidad}</td>
                      <td className="py-2.5 px-4">{d.cabezas_evaluadas} cab.</td>
                      <td className="py-2.5 px-4">{d.dias_permanencia} días</td>
                      <td className="py-2.5 px-4 font-mono">{d.rendimiento_estandar_kg} kg</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{d.rendimiento_real_kg} kg</td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={`flex items-center gap-1 ${
                          d.desvio_rendimiento_kg >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {d.desvio_rendimiento_kg >= 0 ? '+' : ''}{d.desvio_rendimiento_kg} kg
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold">
                        {d.desvio_porcentual_rendimiento > 0 ? '+' : ''}{d.desvio_porcentual_rendimiento.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-mono">${d.precio_real_referencia.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        ${d.desvio_economico_rendimiento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: R_DesvioConsumo */}
      {activeTab === 'desvio_consumo' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>
              Contraste entre Dosis Teórica (P_DosisTecnica) y Suministro Real (F_ConsumosReales)
            </span>
            <span className="font-semibold text-slate-700">
              Desvío Económico = (Real − Estándar) × Precio Promedio Ponderado
            </span>
          </div>

          <div className="overflow-x-auto">
            {desviosConsumo.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Wheat className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay datos de consumo para calcular desvíos.</p>
                <p className="mt-1">
                  Ingrese suministros reales en F_ConsumosReales y dosis teóricas en P_DosisTecnica.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Subunidad</th>
                    <th className="py-2.5 px-4">Insumo</th>
                    <th className="py-2.5 px-4">Consumo Estándar Físico</th>
                    <th className="py-2.5 px-4">Consumo Real Físico</th>
                    <th className="py-2.5 px-4">Desvío Físico</th>
                    <th className="py-2.5 px-4">Desvío %</th>
                    <th className="py-2.5 px-4">Precio Real $/u</th>
                    <th className="py-2.5 px-4">Desvío Económico Monetizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {desviosConsumo.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-emerald-800">{d.nombre_subunidad}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{d.nombre_insumo}</td>
                      <td className="py-2.5 px-4 font-mono">{d.consumo_estandar_fisico} {d.codigo_um}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{d.consumo_real_fisico} {d.codigo_um}</td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={d.desvio_consumo_fisico > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                          {d.desvio_consumo_fisico > 0 ? '+' : ''}{d.desvio_consumo_fisico} {d.codigo_um}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold">
                        {d.desvio_porcentual_consumo > 0 ? '+' : ''}{d.desvio_porcentual_consumo.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-mono">${d.precio_real_unitario.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        ${d.desvio_economico_consumo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: R_ResultadoConsolidado (CONSOLIDACIÓN GLOBAL Y ELIMINACIÓN DE DUPLICACIONES) */}
      {activeTab === 'consolidado' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Regla de Negocio 6.5: Eliminación de Transferencias Internas
              </span>
              <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                Campaña: {consolidado.nombre_campana}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              En la consolidación general del negocio, las ventas internas y transferencias de hacienda entre
              <strong> Cría → Recría → Adaptación → Engorde</strong> actúan como partidas recíprocas. El sistema neutraliza
              automáticamente estas transferencias ({consolidado.transferencias_internas_neutralizadas} eventos neutralizados),
              reconociendo únicamente como Ingreso Consolidado las ventas netas externas a terceros y como Costos Directos
              los insumos reales consumidos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ingresos Netos Totales</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ${consolidado.ingresos_netos_totales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Exclusivamente ventas netas externas a terceros.</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Costos Directos Totales</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ${consolidado.costos_directos_totales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Insumos y servicios reales externos acumulados.</p>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Margen Bruto Consolidado</div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">
                ${consolidado.margen_bruto_consolidado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 font-bold text-xs text-emerald-700">
                {consolidado.porcentaje_sobre_costos_consolidado.toFixed(1)}% sobre costos directos
              </div>
            </div>
          </div>

          {/* Valuación Dinámica de Existencias (RT 22 / RT 54) */}
          {(() => {
            const val = db.getValuacionStockConsolidado();
            return (
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Valuación de Existencias a Valor Razonable / Mercado (RT 22 & RT 54)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Valuación al cierre de los activos biológicos según cotizaciones dinámicas vigentes (Claude GAS)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Existencias Biológicas</span>
                    <div className="text-xl font-black text-emerald-800">
                      ${val.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {val.subunidades.map(sub => (
                    <div key={sub.id_subunidad} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{sub.nombre_subunidad}</span>
                        <span>{sub.total_cabezas} cab.</span>
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1">
                        ${sub.valuacion_total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
