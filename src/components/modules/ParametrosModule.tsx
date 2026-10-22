/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 4: Parámetros Técnicos, Estándares de Rinde y Proyección Económica
 * Reglas 1 y 2: Metas únicas por campaña y desacoplamiento de consumos reales
 */

import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Wheat,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { P_EstandarRinde, P_DosisTecnica } from '../../types/database';

export const ParametrosModule: React.FC = () => {
  const state = db.getState();
  const [activeTab, setActiveTab] = useState<'rindes' | 'dosis' | 'proyeccion'>('rindes');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modales
  const [isRindeModalOpen, setIsRindeModalOpen] = useState(false);
  const [isDosisModalOpen, setIsDosisModalOpen] = useState(false);

  // Proyección de terminación / planificación
  const [proySubunidad, setProySubunidad] = useState<number>(4); // Engorde por defecto
  const [proyCabezas, setProyCabezas] = useState<number>(100);
  const [proyDias, setProyDias] = useState<number>(90);
  const [proyPrecioVentaKilo, setProyPrecioVentaKilo] = useState<number>(2200);

  // Calcular proyección basada en los parámetros estándar
  const estandarRindeSel = state.P_EstandarRinde.find(r => r.id_subunidad === proySubunidad);
  const dosisAplicables = state.P_DosisTecnica.filter(d => d.id_subunidad === proySubunidad);

  const adpvProy = estandarRindeSel ? estandarRindeSel.adpv_estandar_kg_dia : 1.30;
  const kgTotalesGanados = adpvProy * proyDias * proyCabezas;
  const ingresoBrutoProy = kgTotalesGanados * proyPrecioVentaKilo;

  const costoAlimentoProy = dosisAplicables.reduce((acc, d) => {
    const insumo = state.D_Insumo.find(i => i.id_insumo === d.id_insumo);
    const stock = db.getStockInsumo(d.id_insumo);
    const precio = stock.precioPromedio > 0 ? stock.precioPromedio : 180;
    const kgConsumo = d.dosis_es_diaria
      ? d.dosis_teorica_cab_dia * proyCabezas * proyDias
      : d.dosis_teorica_cab_dia * proyCabezas;
    return acc + (kgConsumo * precio);
  }, 0);

  const margenBrutoProy = ingresoBrutoProy - costoAlimentoProy;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Parámetros Técnicos y Proyección de Rinde / Consumo
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Estándares teóricos y nutricionales independientes (Regla 2: jamás sobreescritos por consumos reales).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rindes' && (
            <button
              onClick={() => {
                setIsRindeModalOpen(true);
                setFeedback(null);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Meta de Rendimiento</span>
            </button>
          )}
          {activeTab === 'dosis' && (
            <button
              onClick={() => {
                setIsDosisModalOpen(true);
                setFeedback(null);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Dosis Técnica</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rindes')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'rindes'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Metas de Rendimiento (P_EstandarRinde)</span>
        </button>
        <button
          onClick={() => setActiveTab('dosis')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'dosis'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>Dosis Técnicas y Ración (P_DosisTecnica)</span>
        </button>
        <button
          onClick={() => setActiveTab('proyeccion')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'proyeccion'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Simulador & Planificación Económica</span>
        </button>
      </div>

      {/* TAB 1: RINDES */}
      {activeTab === 'rindes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Restricción estricta: <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold">CONSTRAINT uq_rinde_campana_subunidad UNIQUE (id_campana, id_subunidad)</code>
            </span>
            <span>{state.P_EstandarRinde.length} estándares registrados</span>
          </div>

          {state.P_EstandarRinde.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Scale className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay estándares de rinde cargados aún.</p>
              <p className="mt-1">
                Conforme a la regla de no inventar datos, agregue las metas de ADPV por subunidad mediante el botón superior.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Campaña (FK)</th>
                  <th className="py-2.5 px-4">Subunidad (FK)</th>
                  <th className="py-2.5 px-4">ADPV Meta (kg/día)</th>
                  <th className="py-2.5 px-4">Días Teóricos</th>
                  <th className="py-2.5 px-4">Kg Ganados Proyectados/Cab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.P_EstandarRinde.map(r => {
                  const camp = state.D_Campana.find(c => c.id_campana === r.id_campana);
                  const sub = state.D_Subunidad.find(s => s.id_subunidad === r.id_subunidad);
                  return (
                    <tr key={r.id_param_rinde} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold">{r.id_param_rinde}</td>
                      <td className="py-2.5 px-4">{camp?.nombre || `Campaña ${r.id_campana}`}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-800">{sub?.nombre}</td>
                      <td className="py-2.5 px-4 font-bold">{r.adpv_estandar_kg_dia} kg/d</td>
                      <td className="py-2.5 px-4">{r.dias_permanencia_teoricos} días</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{r.kg_ganados_proyectados_cab} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: DOSIS TÉCNICA */}
      {activeTab === 'dosis' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Restricción estricta: <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold">CONSTRAINT uq_dosis_tecnica UNIQUE (id_campana, id_subunidad, id_categoria, id_insumo)</code>
            </span>
            <span>{state.P_DosisTecnica.length} dosis registradas</span>
          </div>

          {state.P_DosisTecnica.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Wheat className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay dosis técnicas cargadas en P_DosisTecnica.</p>
              <p className="mt-1">
                Defina las formulaciones nutricionales (kg maíz/cab/día) o esquemas sanitarios requeridos.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Subunidad</th>
                  <th className="py-2.5 px-4">Categoría Animal</th>
                  <th className="py-2.5 px-4">Insumo</th>
                  <th className="py-2.5 px-4">Dosis Técnica Teórica</th>
                  <th className="py-2.5 px-4">Frecuencia</th>
                  <th className="py-2.5 px-4">Observaciones Protocolo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.P_DosisTecnica.map(d => {
                  const sub = state.D_Subunidad.find(s => s.id_subunidad === d.id_subunidad);
                  const cat = state.D_CategoriaHacienda.find(c => c.id_categoria === d.id_categoria);
                  const ins = state.D_Insumo.find(i => i.id_insumo === d.id_insumo);
                  const um = ins ? state.D_UM.find(u => u.id_um === ins.id_um_consumo) : null;
                  return (
                    <tr key={d.id_dosis_tecnica} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold">{d.id_dosis_tecnica}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-800">{sub?.nombre}</td>
                      <td className="py-2.5 px-4">{cat?.nombre}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{ins?.nombre}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        {d.dosis_teorica_cab_dia} {um?.codigo}/cab {d.dosis_es_diaria ? '/día' : ''}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {d.dosis_es_diaria ? 'Diaria (Alimento)' : 'Puntual / Anual (Sanidad)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{d.observaciones_protocolo || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: SIMULADOR & PROYECCIÓN ECONÓMICA DE LA TERMINACIÓN */}
      {activeTab === 'proyeccion' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Planificación y Proyección Económica de la Terminación a Corral
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Simule el consumo esperado y margen proyectado a partir de los estándares técnicos, sin sobreescribir la base real.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad a Evaluar</label>
              <select
                value={proySubunidad}
                onChange={e => setProySubunidad(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_Subunidad.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cabezas a Ingresar</label>
              <input
                type="number"
                min="1"
                value={proyCabezas}
                onChange={e => setProyCabezas(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días de Permanencia</label>
              <input
                type="number"
                min="1"
                value={proyDias}
                onChange={e => setProyDias(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Precio Proyectado $/kg Cañuelas</label>
              <input
                type="number"
                min="1"
                value={proyPrecioVentaKilo}
                onChange={e => setProyPrecioVentaKilo(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* Results of Projection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="text-[10px] uppercase font-bold text-emerald-800">Ganancia de Peso Proyectada</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">
                {kgTotalesGanados.toLocaleString()} kg de carne
              </div>
              <p className="text-slate-600 mt-1">
                Basado en ADPV estándar de <strong>{adpvProy} kg/cab/día</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <div className="text-[10px] uppercase font-bold text-blue-800">Ingreso Bruto Estimado</div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                ${ingresoBrutoProy.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-slate-600 mt-1">
                Valorización de los kg agregados al valor de faena proyectado.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs">
              <div className="text-[10px] uppercase font-bold text-purple-800">Margen Bruto Proyectado</div>
              <div className="text-xl font-bold text-purple-900 mt-1">
                ${margenBrutoProy.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-slate-600 mt-1">
                Deducido costo proyectado de ración (${costoAlimentoProy.toLocaleString('es-AR')}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal P_EstandarRinde */}
      {isRindeModalOpen && (
        <ModalRinde
          onClose={() => setIsRindeModalOpen(false)}
          onSaved={() => {
            setIsRindeModalOpen(false);
            setFeedback({ type: 'success', message: 'Meta de rinde guardada con éxito.' });
          }}
        />
      )}

      {/* Modal P_DosisTecnica */}
      {isDosisModalOpen && (
        <ModalDosis
          onClose={() => setIsDosisModalOpen(false)}
          onSaved={() => {
            setIsDosisModalOpen(false);
            setFeedback({ type: 'success', message: 'Dosis técnica guardada con éxito.' });
          }}
        />
      )}
    </div>
  );
};

const ModalRinde: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const state = db.getState();
  const [campana, setCampana] = useState(state.D_Campana[0]?.id_campana || 1);
  const [subunidad, setSubunidad] = useState(4);
  const [adpv, setAdpv] = useState('1.35');
  const [dias, setDias] = useState('90');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adpvNum = Number(adpv);
    const diasNum = Number(dias);
    const kgGanados = Number((adpvNum * diasNum).toFixed(2));

    const res = db.saveEstandarRinde({
      id_param_rinde: 0,
      id_campana: Number(campana),
      id_subunidad: Number(subunidad),
      adpv_estandar_kg_dia: adpvNum,
      dias_permanencia_teoricos: diasNum,
      kg_ganados_proyectados_cab: kgGanados,
    });

    if (!res.success) {
      setError(res.error || 'Error al guardar.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <h4 className="text-base font-bold text-slate-800 mb-1">Nueva Meta de Rendimiento (P_EstandarRinde)</h4>
        <p className="text-xs text-slate-500 mb-4">
          Una única meta física por campaña y subunidad (Regla 1).
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campaña</label>
            <select
              value={campana}
              onChange={e => setCampana(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              {state.D_Campana.map(c => (
                <option key={c.id_campana} value={c.id_campana}>{c.nombre}</option>
              ))}
              {state.D_Campana.length === 0 && <option value="1">Campaña 2025/2026 (Predeterminada)</option>}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subunidad</label>
            <select
              value={subunidad}
              onChange={e => setSubunidad(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              {state.D_Subunidad.map(s => (
                <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ADPV Meta (kg/día)</label>
              <input
                type="number"
                step="0.01"
                required
                value={adpv}
                onChange={e => setAdpv(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días de Permanencia</label>
              <input
                type="number"
                required
                value={dias}
                onChange={e => setDias(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
            >
              Guardar Parámetro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalDosis: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const state = db.getState();
  const [campana, setCampana] = useState(state.D_Campana[0]?.id_campana || 1);
  const [subunidad, setSubunidad] = useState(4);
  const [categoria, setCategoria] = useState(10); // Novillos
  const [insumo, setInsumo] = useState(1); // Maíz
  const [dosis, setDosis] = useState('7.5');
  const [esDiaria, setEsDiaria] = useState(true);
  const [protocolo, setProtocolo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = db.saveDosisTecnica({
      id_dosis_tecnica: 0,
      id_campana: Number(campana),
      id_subunidad: Number(subunidad),
      id_categoria: Number(categoria),
      id_insumo: Number(insumo),
      dosis_teorica_cab_dia: Number(dosis),
      dosis_es_diaria: esDiaria,
      observaciones_protocolo: protocolo,
    });

    if (!res.success) {
      setError(res.error || 'Error al guardar.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <h4 className="text-base font-bold text-slate-800 mb-1">Nueva Dosis Técnica (P_DosisTecnica)</h4>
        <p className="text-xs text-slate-500 mb-4">
          Estándar nutricional o sanitario independiente de consumos reales (Regla 2).
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad</label>
              <select
                value={subunidad}
                onChange={e => setSubunidad(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_Subunidad.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría Animal</label>
              <select
                value={categoria}
                onChange={e => setCategoria(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_CategoriaHacienda.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Insumo</label>
              <select
                value={insumo}
                onChange={e => setInsumo(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_Insumo.map(i => (
                  <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.tipo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dosis Teórica por Cabeza</label>
              <input
                type="number"
                step="0.01"
                required
                value={dosis}
                onChange={e => setDosis(e.target.value)}
                placeholder="Ej: 7.5 kg o 1 dosis"
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Suministro</label>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="esDiaria"
                  checked={esDiaria}
                  onChange={() => setEsDiaria(true)}
                />
                <span>Diaria (kg ración/cab/día - alimentos)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="esDiaria"
                  checked={!esDiaria}
                  onChange={() => setEsDiaria(false)}
                />
                <span>Puntual (dosis por cabeza - vacunas)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observaciones / Protocolo</label>
            <input
              type="text"
              value={protocolo}
              onChange={e => setProtocolo(e.target.value)}
              placeholder="Ej: Suministro en mixer 2 veces por día"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
            >
              Guardar Dosis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
