/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 8: Sanidad, Vacunación Oficial SENASA y Costos Veterinarios (F_SanidadReal)
 * Integrado con Google Sheets mediante POST / append y filtrado paramétrico
 */

import React, { useState } from 'react';
import { ShieldCheck, Plus, CheckCircle2, AlertCircle, Search, RefreshCw, Send } from 'lucide-react';
import { db } from '../../services/dbEngine';
import { D_Subunidad } from '../../types/database';

interface SanidadModuleProps {
  selectedUnidadNegId?: number;
  availableSubunidades?: D_Subunidad[];
}

export const SanidadModule: React.FC<SanidadModuleProps> = ({
  selectedUnidadNegId = 1,
  availableSubunidades,
}) => {
  const state = db.getState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const subunidades = availableSubunidades && availableSubunidades.length > 0
    ? availableSubunidades
    : state.D_Subunidad.filter(s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId));

  const validSubIds = new Set(subunidades.map(s => s.id_subunidad));

  // Costos sanitarios por subunidad
  const costosSanitariosPorSub = subunidades.map(sub => {
    const aplicaciones = state.F_SanidadReal.filter(s => s.id_subunidad === sub.id_subunidad);
    const costoTotal = aplicaciones.reduce((acc, s) => {
      const stock = db.getStockInsumo(s.id_insumo);
      const costoInsumo = s.dosis_real_total * stock.precioPromedio;
      return acc + costoInsumo + (Number(s.costo_profesional_honorarios) || 0);
    }, 0);
    return { sub, aplicacionesCount: aplicaciones.length, costoTotal };
  });

  const aplicaciones = state.F_SanidadReal.filter(s => {
    if (validSubIds.size > 0 && !validSubIds.has(s.id_subunidad)) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    const ins = state.D_Insumo.find(i => i.id_insumo === s.id_insumo);
    const animal = state.D_HaciendaIndividual.find(h => h.id_hacienda === s.id_hacienda);
    return (
      (ins && ins.nombre.toLowerCase().includes(term)) ||
      (s.acta_vacunacion_senasa && s.acta_vacunacion_senasa.toLowerCase().includes(term)) ||
      (animal && animal.caravana_visual.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Sanidad, Vacunación Oficial y Protocolos (F_SanidadReal)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E]/10 text-[#1B4D3E] border border-[#1B4D3E]/20">
              POST / append Dinámico
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro de planes sanitarios (aftosa, brucelosis, reproductiva), actas de SENASA e impacto directo en Google Sheets.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#13382c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Aplicación Sanitaria</span>
        </button>
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

      {/* Resumen por Subunidad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {costosSanitariosPorSub.map(({ sub, aplicacionesCount, costoTotal }) => (
          <div key={sub.id_subunidad} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 font-bold uppercase truncate">{sub.nombre}</div>
            <div className="text-xl font-bold text-slate-900 mt-1">${costoTotal.toLocaleString('es-AR')}</div>
            <div className="text-[11px] text-purple-700 font-semibold mt-0.5">{aplicacionesCount} protocolos sanitarios</div>
          </div>
        ))}
      </div>

      {/* Tabla de Aplicaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por vacuna, acta o caravana..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{aplicaciones.length} aplicaciones registradas</span>
        </div>

        <div className="overflow-x-auto">
          {aplicaciones.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay aplicaciones sanitarias registradas.</p>
              <p className="mt-1">
                Presione el botón para registrar vacunas, antiparasitarios o actas oficiales de vacunación.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1B4D3E]/5 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Subunidad</th>
                  <th className="py-2.5 px-4">Producto Sanitario</th>
                  <th className="py-2.5 px-4">Dosis</th>
                  <th className="py-2.5 px-4">Acta SENASA</th>
                  <th className="py-2.5 px-4">Veterinario</th>
                  <th className="py-2.5 px-4">Honorarios ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {aplicaciones.map(s => {
                  const sub = state.D_Subunidad.find(sb => sb.id_subunidad === s.id_subunidad);
                  const ins = state.D_Insumo.find(i => i.id_insumo === s.id_insumo);

                  return (
                    <tr key={s.id_sanidad} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium">{s.fecha}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1B4D3E]">{sub?.nombre || '-'}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{ins?.nombre || `Insumo ${s.id_insumo}`}</td>
                      <td className="py-2.5 px-4 font-semibold text-purple-800">{s.dosis_real_total} dosis</td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">{s.acta_vacunacion_senasa || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{s.profesional_veterinario || '-'}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">
                        ${(Number(s.costo_profesional_honorarios) || 0).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ModalSanidad
          subunidades={subunidades}
          onClose={() => setIsModalOpen(false)}
          onSaved={(msg) => {
            setIsModalOpen(false);
            setFeedback({ type: 'success', message: msg });
          }}
        />
      )}
    </div>
  );
};

const ModalSanidad: React.FC<{
  subunidades: D_Subunidad[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ subunidades, onClose, onSaved }) => {
  const state = db.getState();
  const subList = subunidades.length > 0 ? subunidades : state.D_Subunidad;

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [subunidad, setSubunidad] = useState(subList[0]?.id_subunidad || 1);
  const [esIndividual, setEsIndividual] = useState(false);
  const [idHacienda, setIdHacienda] = useState<number | ''>('');
  const [idTropa, setIdTropa] = useState<number | ''>('');
  const insumosSanitarios = state.D_Insumo.filter(i => i.tipo === 'Sanidad');
  const [insumo, setInsumo] = useState(insumosSanitarios[0]?.id_insumo || 8);
  const [dosis, setDosis] = useState('50');
  const [acta, setActa] = useState('');
  const [veterinario, setVeterinario] = useState('Dr. Veterinario MP 4521');
  const [honorarios, setHonorarios] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = db.getStockInsumo(Number(insumo));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await db.addSanidadRealAsync({
        fecha,
        id_subunidad: Number(subunidad),
        id_hacienda: esIndividual && idHacienda ? Number(idHacienda) : null,
        id_tropa: !esIndividual && idTropa ? Number(idTropa) : null,
        id_insumo: Number(insumo),
        dosis_real_total: Number(dosis),
        acta_vacunacion_senasa: acta,
        profesional_veterinario: veterinario,
        costo_profesional_honorarios: Number(honorarios) || 0,
      });

      if (!res.success) {
        setError(res.error || 'Error al guardar sanidad.');
        setIsSubmitting(false);
        return;
      }

      const feedbackMsg = res.googleSheetsAppended
        ? `Acta sanitaria guardada e impactada exitosamente en Google Sheets (F_SanidadReal con mapeo dinámico).`
        : `Aplicación sanitaria guardada en el ERP local.`;

      onSaved(feedbackMsg);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-base font-bold text-slate-800">Cargar Aplicación Sanitaria (F_SanidadReal)</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
            POST / append
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Suministro sanitario con imputación a centro de costo y sincronización directa con Google Sheets.
        </p>

        {/* Stock status of vaccine */}
        <div className="p-3 mb-4 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
          <span className="text-slate-600">Stock disponible de vacuna/medicamento:</span>
          <span className={`font-bold ${stock.disponible <= 0 ? 'text-rose-600' : 'text-purple-700'}`}>
            {stock.disponible.toFixed(1)} dosis en almacén
          </span>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad / Etapa</label>
              <select
                value={subunidad}
                onChange={e => setSubunidad(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-[#1B4D3E]"
              >
                {subList.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Producto Sanitario</label>
            <select
              value={insumo}
              onChange={e => setInsumo(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-1 focus:ring-[#1B4D3E]"
            >
              {insumosSanitarios.map(i => (
                <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dosis Totales Aplicadas</label>
              <input
                type="number"
                min="1"
                required
                value={dosis}
                onChange={e => setDosis(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Acta SENASA</label>
              <input
                type="text"
                value={acta}
                onChange={e => setActa(e.target.value)}
                placeholder="Ej: ACTA-SENASA-2026-081"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Veterinario Actuante</label>
              <input
                type="text"
                value={veterinario}
                onChange={e => setVeterinario(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Honorarios Directos ($)</label>
              <input
                type="number"
                value={honorarios}
                onChange={e => setHonorarios(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#1B4D3E] hover:bg-[#13382c] text-white font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando al Webhook...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar e Impactar en Sheets</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
