/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 6: Control de Pesadas en Balanza y Aumento Diario de Peso Vivo (ADPV)
 * Integrado con Google Sheets (F_PesadasControl) mediante POST / append y filtrado paramétrico
 */

import React, { useState } from 'react';
import { Scale, Plus, Search, TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { db } from '../../services/dbEngine';
import { D_Subunidad, F_PesadasControl } from '../../types/database';

interface PesadasModuleProps {
  selectedUnidadNegId?: number;
  availableSubunidades?: D_Subunidad[];
}

export const PesadasModule: React.FC<PesadasModuleProps> = ({
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

  const validSubunidadIds = new Set(subunidades.map(s => s.id_subunidad));

  const pesadas = state.F_PesadasControl.filter(p => {
    // Si la especie seleccionada tiene subunidades, filtrar por ellas si aplica
    if (validSubunidadIds.size > 0 && !validSubunidadIds.has(p.id_subunidad)) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    const animal = state.D_HaciendaIndividual.find(h => h.id_hacienda === p.id_hacienda);
    const tropa = state.D_TropaLote.find(t => t.id_tropa === p.id_tropa);
    return (
      p.fecha.includes(term) ||
      (animal && animal.caravana_visual.toLowerCase().includes(term)) ||
      (tropa && tropa.codigo_tropa.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Control Periódico de Pesadas en Balanza (F_PesadasControl)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E]/10 text-[#1B4D3E] border border-[#1B4D3E]/20">
              Mapeo Dinámico POST Webhook
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Determinación de ganancias efectivas de peso, control de ADPV real y sincronización directa con Google Sheets.
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
          <span>Registrar Pesada de Balanza</span>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por fecha, caravana o tropa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{pesadas.length} registros en F_PesadasControl</span>
        </div>

        <div className="overflow-x-auto">
          {pesadas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Scale className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay pesadas registradas para esta especie o filtro.</p>
              <p className="mt-1">
                Conforme a la regla de no inventar datos, las pesadas se cargan con balanza de corral o manga e impactan en Google Sheets.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1B4D3E]/5 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Subunidad</th>
                  <th className="py-2.5 px-4">Destino / Identificación</th>
                  <th className="py-2.5 px-4">Cabezas</th>
                  <th className="py-2.5 px-4">Peso Vivo Total</th>
                  <th className="py-2.5 px-4">Peso Promedio</th>
                  <th className="py-2.5 px-4">Días Intervalo</th>
                  <th className="py-2.5 px-4">ADPV Real</th>
                  <th className="py-2.5 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pesadas.map(p => {
                  const sub = state.D_Subunidad.find(s => s.id_subunidad === p.id_subunidad);
                  const animal = state.D_HaciendaIndividual.find(h => h.id_hacienda === p.id_hacienda);
                  const tropa = state.D_TropaLote.find(t => t.id_tropa === p.id_tropa);

                  return (
                    <tr key={p.id_pesada} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium">{p.fecha}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1B4D3E]">{sub?.nombre || `Subunidad ${p.id_subunidad}`}</td>
                      <td className="py-2.5 px-4">
                        {animal ? (
                          <span className="font-bold text-slate-900">Caravana {animal.caravana_visual}</span>
                        ) : tropa ? (
                          <span className="font-semibold text-blue-800">{tropa.codigo_tropa}</span>
                        ) : (
                          <span className="text-slate-400">Pesada general</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">{p.cantidad_cabezas} cab.</td>
                      <td className="py-2.5 px-4 font-bold">{p.peso_vivo_kg} kg</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{p.peso_promedio_kg} kg/cab</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.dias_desde_pesada_anterior || '-'} días</td>
                      <td className="py-2.5 px-4">
                        {p.adpv_registrado_kg_dia ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {p.adpv_registrado_kg_dia} kg/día
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{p.observaciones || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ModalPesada
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

const ModalPesada: React.FC<{
  subunidades: D_Subunidad[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ subunidades, onClose, onSaved }) => {
  const state = db.getState();
  const subunidadList = subunidades.length > 0 ? subunidades : state.D_Subunidad;

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [subunidad, setSubunidad] = useState(subunidadList[0]?.id_subunidad || 1);
  const [esIndividual, setEsIndividual] = useState(false);
  const [idHacienda, setIdHacienda] = useState<number | ''>('');
  const [idTropa, setIdTropa] = useState<number | ''>('');
  const [cabezas, setCabezas] = useState('50');
  const [pesoTotal, setPesoTotal] = useState('');
  const [dias, setDias] = useState('30');
  const [pesoAnterior, setPesoAnterior] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cantCab = Number(cabezas) || 1;
    const pTot = Number(pesoTotal);
    const pAnt = Number(pesoAnterior);
    const dDias = Number(dias);

    let adpv: number | undefined = undefined;
    if (pAnt > 0 && dDias > 0) {
      const gananciaPorCab = (pTot - pAnt) / cantCab;
      adpv = Number((gananciaPorCab / dDias).toFixed(3));
    }

    try {
      const res = await db.addPesadaControlAsync({
        fecha,
        id_subunidad: Number(subunidad),
        id_hacienda: esIndividual && idHacienda ? Number(idHacienda) : null,
        id_tropa: !esIndividual && idTropa ? Number(idTropa) : null,
        peso_vivo_kg: pTot,
        cantidad_cabezas: cantCab,
        dias_desde_pesada_anterior: dDias > 0 ? dDias : undefined,
        adpv_registrado_kg_dia: adpv,
        observaciones,
      });

      if (!res.success) {
        setError(res.error || 'Error al registrar pesada.');
        setIsSubmitting(false);
        return;
      }

      const feedbackMsg = res.googleSheetsAppended
        ? `Pesada registrada y guardada exitosamente en Google Sheets (F_PesadasControl con mapeo dinámico).`
        : `Pesada guardada exitosamente en el ERP local.`;

      onSaved(feedbackMsg);
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-base font-bold text-slate-800">Cargar Pesada de Control (F_PesadasControl)</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
            POST / append
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">Registro en balanza para determinar ganancia diaria (ADPV) y sincronizar con la planilla.</p>

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
                {subunidadList.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>
                    {s.nombre} {s.rango_peso_referencia ? `(${s.rango_peso_referencia})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Pesada</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pesadaModo"
                  checked={!esIndividual}
                  onChange={() => {
                    setEsIndividual(false);
                    setCabezas('50');
                  }}
                />
                <span>Por Lote / Tropa</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pesadaModo"
                  checked={esIndividual}
                  onChange={() => {
                    setEsIndividual(true);
                    setCabezas('1');
                  }}
                />
                <span>Individual (RFID)</span>
              </label>
            </div>
          </div>

          {esIndividual ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Animal</label>
              <select
                value={idHacienda}
                onChange={e => setIdHacienda(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Seleccione Caravana...</option>
                {state.D_HaciendaIndividual.filter(h => h.estado_actual === 'Activo').map(h => (
                  <option key={h.id_hacienda} value={h.id_hacienda}>
                    {h.caravana_visual} ({h.caravana_rfid})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tropa</label>
                <select
                  value={idTropa}
                  onChange={e => setIdTropa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Sin tropa específica</option>
                  {state.D_TropaLote.map(t => (
                    <option key={t.id_tropa} value={t.id_tropa}>{t.codigo_tropa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cabezas</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cabezas}
                  onChange={e => setCabezas(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Peso en Balanza Actual (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={pesoTotal}
                onChange={e => setPesoTotal(e.target.value)}
                placeholder="Ej: 18500"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Peso Anterior (opcional)</label>
              <input
                type="number"
                step="0.1"
                value={pesoAnterior}
                onChange={e => setPesoAnterior(e.target.value)}
                placeholder="Ej: 16250"
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días entre pesadas</label>
              <input
                type="number"
                value={dias}
                onChange={e => setDias(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
              <input
                type="text"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Balanza manga / corral"
                className="w-full p-2 rounded-lg border border-slate-300"
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
