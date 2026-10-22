/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 10: Costos Indirectos y Prorrateo hacia Subunidades
 * F_CostosIndirectos (grupos 5.5 y 5.2) con distribución por coeficientes
 */

import React, { useState } from 'react';
import { PieChart, Plus, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { db } from '../../services/dbEngine';

export const CostosIndirectosModule: React.FC = () => {
  const state = db.getState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Totales por subunidad
  const prorrateoPorSub = state.D_Subunidad.map(sub => {
    const costos = state.F_CostosIndirectos.filter(c => c.id_subunidad === sub.id_subunidad);
    const totalAsignado = costos.reduce((acc, c) => acc + (Number(c.importe_asignado_subunidad) || 0), 0);
    return { sub, totalAsignado, cant: costos.length };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Costos Indirectos y Prorrateo (F_CostosIndirectos)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Erogaciones comunes del establecimiento (combustibles, mano de obra compartida, mantenimiento) distribuidas hacia cada etapa.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Costo Indirecto</span>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {prorrateoPorSub.map(({ sub, totalAsignado, cant }) => (
          <div key={sub.id_subunidad} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 font-bold uppercase truncate">{sub.nombre}</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              ${totalAsignado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{cant} erogaciones prorrateadas</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Historial de erogaciones y bases de asignación</span>
          <span>{state.F_CostosIndirectos.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          {state.F_CostosIndirectos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <PieChart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay costos indirectos registrados en F_CostosIndirectos.</p>
              <p className="mt-1">
                Conforme a la regla de no inventar datos, las erogaciones se asientan con su comprobante de gasto real.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Concepto</th>
                  <th className="py-2.5 px-4">Cuenta Costo</th>
                  <th className="py-2.5 px-4">Subunidad Receptora</th>
                  <th className="py-2.5 px-4">Importe Total Erogado</th>
                  <th className="py-2.5 px-4">Coeficiente Prorrateo</th>
                  <th className="py-2.5 px-4">Importe Asignado</th>
                  <th className="py-2.5 px-4">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.F_CostosIndirectos.map(c => {
                  const sub = state.D_Subunidad.find(s => s.id_subunidad === c.id_subunidad);
                  return (
                    <tr key={c.id_costo_indirecto} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono">{c.fecha}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{c.concepto}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{c.id_cuenta_costo}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-800">{sub?.nombre}</td>
                      <td className="py-2.5 px-4 font-mono">${c.importe_total_erogacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-4 font-mono">{(c.coeficiente_prorrateo * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        ${c.importe_asignado_subunidad.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{c.comprobante_factura || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ModalCostoIndirecto
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            setFeedback({ type: 'success', message: 'Costo indirecto asignado correctamente.' });
          }}
        />
      )}
    </div>
  );
};

const ModalCostoIndirecto: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const state = db.getState();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('');
  const [cuenta, setCuenta] = useState('5.5');
  const [subunidad, setSubunidad] = useState(4);
  const [importe, setImporte] = useState('');
  const [coeficiente, setCoeficiente] = useState('0.50');
  const [comprobante, setComprobante] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const impNum = Number(importe);
    const coefNum = Number(coeficiente);

    if (!concepto.trim()) {
      setError('Concepto requerido.');
      return;
    }
    if (impNum <= 0) {
      setError('Importe debe ser mayor a cero.');
      return;
    }

    const res = db.addCostoIndirecto({
      fecha,
      concepto,
      id_cuenta_costo: cuenta,
      importe_total_erogacion: impNum,
      id_subunidad: Number(subunidad),
      coeficiente_prorrateo: coefNum,
      comprobante_factura: comprobante,
    });

    if (!res.success) {
      setError(res.error || 'Error al guardar costo indirecto.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <h4 className="text-base font-bold text-slate-800 mb-1">Cargar Costo Indirecto (F_CostosIndirectos)</h4>
        <p className="text-xs text-slate-500 mb-4">
          Distribución de gastos compartidos con coeficiente hacia la subunidad.
        </p>

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
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad Receptora</label>
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
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Concepto Erogación</label>
            <input
              type="text"
              required
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Ej: Gasoil tractor mixer, Mantenimiento aguadas"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Importe Total Erogado ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={importe}
                onChange={e => setImporte(e.target.value)}
                placeholder="Ej: 450000"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coeficiente Prorrateo (0 a 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                required
                value={coeficiente}
                onChange={e => setCoeficiente(e.target.value)}
                placeholder="Ej: 0.60 para 60%"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Comprobante Factura</label>
            <input
              type="text"
              value={comprobante}
              onChange={e => setComprobante(e.target.value)}
              placeholder="Ej: FAC-B-0002-8812"
              className="w-full p-2 rounded-lg border border-slate-300 font-mono"
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
              Guardar Costo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
