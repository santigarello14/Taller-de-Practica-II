/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 7: Alimentación, Raciones y Stock de Insumos
 * F_ComprasInsumos y F_ConsumosReales con regla anti-stock negativo y transferencias agrícolas internas
 */

import React, { useState } from 'react';
import {
  Wheat,
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Send,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { D_Subunidad } from '../../types/database';

interface AlimentacionModuleProps {
  selectedUnidadNegId?: number;
  availableSubunidades?: D_Subunidad[];
}

export const AlimentacionModule: React.FC<AlimentacionModuleProps> = ({
  selectedUnidadNegId = 1,
  availableSubunidades,
}) => {
  const state = db.getState();
  const subunidades = availableSubunidades && availableSubunidades.length > 0
    ? availableSubunidades
    : state.D_Subunidad.filter(s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId));
  const [activeTab, setActiveTab] = useState<'stock' | 'consumos' | 'compras'>('stock');
  const [isConsumoModalOpen, setIsConsumoModalOpen] = useState(false);
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Alimentación y Control de Stock de Insumos
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de ingresos (compras externas o transferencias agrícolas de maíz/soja propios) y suministros reales en corral.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsCompraModalOpen(true);
              setFeedback(null);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingreso de Insumo / Transferencia</span>
          </button>
          <button
            onClick={() => {
              setIsConsumoModalOpen(true);
              setFeedback(null);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Consumo Real</span>
          </button>
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
          onClick={() => setActiveTab('stock')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock Físico y Saldos de Almacén</span>
        </button>
        <button
          onClick={() => setActiveTab('consumos')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'consumos'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Suministros Reales (F_ConsumosReales)</span>
        </button>
        <button
          onClick={() => setActiveTab('compras')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'compras'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Compras y Transferencias (F_ComprasInsumos)</span>
        </button>
      </div>

      {/* TAB 1: STOCK FISICO */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Saldo = <code className="bg-white px-2 py-0.5 rounded font-mono font-bold">Σ Entradas − (Σ Consumos + Σ Sanidad)</code>
            </span>
            <span className="text-slate-500">Regla 6: Imposibilidad de stocks negativos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Insumo</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">U. Medida</th>
                  <th className="py-2.5 px-4">Entradas Acumuladas</th>
                  <th className="py-2.5 px-4">Salidas Reales</th>
                  <th className="py-2.5 px-4">Stock Disponible</th>
                  <th className="py-2.5 px-4">Precio Promedio Ponderado</th>
                  <th className="py-2.5 px-4">Valorización Inventario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_Insumo.map(ins => {
                  const um = state.D_UM.find(u => u.id_um === ins.id_um_consumo);
                  const st = db.getStockInsumo(ins.id_insumo);
                  const valorInventario = st.disponible > 0 ? st.disponible * st.precioPromedio : 0;

                  return (
                    <tr key={ins.id_insumo} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{ins.nombre}</td>
                      <td className="py-2.5 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded">{ins.tipo}</span></td>
                      <td className="py-2.5 px-4 font-mono">{um?.codigo}</td>
                      <td className="py-2.5 px-4 font-mono">{st.entradas.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono">{st.salidas.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={st.disponible < 0 ? 'text-rose-600' : st.disponible === 0 ? 'text-slate-400' : 'text-emerald-700'}>
                          {st.disponible.toFixed(2)} {um?.codigo}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        ${st.precioPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        ${valorInventario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONSUMOS REALES */}
      {activeTab === 'consumos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              Historial de extracción física de stock por remito / comprobante
            </span>
            <span className="text-xs text-slate-500">{state.F_ConsumosReales.length} suministros</span>
          </div>

          <div className="overflow-x-auto">
            {state.F_ConsumosReales.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Wheat className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay suministros reales registrados en F_ConsumosReales.</p>
                <p className="mt-1">
                  Cargue consumos con el botón "Registrar Consumo Real" (el sistema validará que haya stock disponible).
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Subunidad</th>
                    <th className="py-2.5 px-4">Tropa / Lote</th>
                    <th className="py-2.5 px-4">Insumo</th>
                    <th className="py-2.5 px-4">Cantidad Real Suministrada</th>
                    <th className="py-2.5 px-4">Vale / Remito</th>
                    <th className="py-2.5 px-4">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {state.F_ConsumosReales.map(c => {
                    const sub = state.D_Subunidad.find(s => s.id_subunidad === c.id_subunidad);
                    const tropa = state.D_TropaLote.find(t => t.id_tropa === c.id_tropa);
                    const ins = state.D_Insumo.find(i => i.id_insumo === c.id_insumo);
                    const um = ins ? state.D_UM.find(u => u.id_um === ins.id_um_consumo) : null;

                    return (
                      <tr key={c.id_consumo} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono">{c.fecha}</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-800">{sub?.nombre}</td>
                        <td className="py-2.5 px-4">{tropa ? tropa.codigo_tropa : <span className="text-slate-400">General</span>}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{ins?.nombre}</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-800">
                          {c.cantidad_fisica_real} {um?.codigo}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{c.comprobante_remito}</td>
                        <td className="py-2.5 px-4 text-slate-500">{c.observaciones || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPRAS E INGRESOS */}
      {activeTab === 'compras' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              Registro de compras a proveedores o transferencias agrícolas de maíz y soja propios
            </span>
            <span className="text-xs text-slate-500">{state.F_ComprasInsumos.length} compras</span>
          </div>

          <div className="overflow-x-auto">
            {state.F_ComprasInsumos.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay compras cargadas en F_ComprasInsumos.</p>
                <p className="mt-1">
                  Cargue ingresos de insumos para habilitar stock disponible y determinar precios reales devengados.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Insumo</th>
                    <th className="py-2.5 px-4">Origen</th>
                    <th className="py-2.5 px-4">Cantidad</th>
                    <th className="py-2.5 px-4">Precio Real Unitario</th>
                    <th className="py-2.5 px-4">Importe Total Devengado</th>
                    <th className="py-2.5 px-4">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {state.F_ComprasInsumos.map(c => {
                    const ins = state.D_Insumo.find(i => i.id_insumo === c.id_insumo);
                    const um = ins ? state.D_UM.find(u => u.id_um === ins.id_um_consumo) : null;

                    return (
                      <tr key={c.id_compra} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono">{c.fecha}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{ins?.nombre}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            c.tipo_origen.includes('Transferencia')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.tipo_origen}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">{c.cantidad} {um?.codigo}</td>
                        <td className="py-2.5 px-4 font-mono font-bold">${c.precio_unitario_real.toFixed(2)}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          ${c.importe_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{c.numero_comprobante}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Cargar Consumo Real */}
      {isConsumoModalOpen && (
        <ModalConsumo
          subunidades={subunidades}
          onClose={() => setIsConsumoModalOpen(false)}
          onSaved={(msg) => {
            setIsConsumoModalOpen(false);
            setFeedback({ type: 'success', message: msg });
          }}
        />
      )}

      {/* Modal Cargar Compra Insumo */}
      {isCompraModalOpen && (
        <ModalCompra
          onClose={() => setIsCompraModalOpen(false)}
          onSaved={() => {
            setIsCompraModalOpen(false);
            setFeedback({ type: 'success', message: 'Ingreso de insumo registrado con precio real devengado.' });
          }}
        />
      )}
    </div>
  );
};

const ModalConsumo: React.FC<{
  subunidades: D_Subunidad[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ subunidades, onClose, onSaved }) => {
  const state = db.getState();
  const subList = subunidades.length > 0 ? subunidades : state.D_Subunidad;

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [subunidad, setSubunidad] = useState(subList[0]?.id_subunidad || 4);
  const [tropa, setTropa] = useState<number | ''>('');
  const [insumo, setInsumo] = useState(1);
  const [cantidad, setCantidad] = useState('');
  const [remito, setRemito] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = db.getStockInsumo(Number(insumo));
  const insumoSel = state.D_Insumo.find(i => i.id_insumo === Number(insumo));
  const um = insumoSel ? state.D_UM.find(u => u.id_um === insumoSel.id_um_consumo) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cantNum = Number(cantidad);

    try {
      const res = await db.addConsumoRealAsync({
        fecha,
        id_subunidad: Number(subunidad),
        id_tropa: tropa ? Number(tropa) : null,
        id_insumo: Number(insumo),
        cantidad_fisica_real: cantNum,
        comprobante_remito: remito,
        observaciones,
      });

      if (!res.success) {
        setError(res.error || 'Error al guardar consumo.');
        setIsSubmitting(false);
        return;
      }

      const feedbackMsg = res.googleSheetsAppended
        ? `Consumo registrado y guardado exitosamente en Google Sheets (F_ConsumosReales con mapeo dinámico).`
        : `Consumo físico registrado exitosamente en el ERP local.`;

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
          <h4 className="text-base font-bold text-slate-800">Registrar Consumo Real (F_ConsumosReales)</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
            POST / append
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Suministro físico con validación estricta de stock disponible en almacén e impacto en Google Sheets.
        </p>

        {/* Stock info box */}
        <div className="p-3 mb-4 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
          <span className="text-slate-600">Stock disponible actual:</span>
          <span className={`font-bold ${stock.disponible <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {stock.disponible.toFixed(2)} {um?.codigo}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Insumo Consumido</label>
              <select
                value={insumo}
                onChange={e => setInsumo(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-1 focus:ring-[#1B4D3E]"
              >
                {state.D_Insumo.map(i => (
                  <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tropa (Opcional, para ICA)</label>
              <select
                value={tropa}
                onChange={e => setTropa(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Consumo general subunidad</option>
                {state.D_TropaLote.map(t => (
                  <option key={t.id_tropa} value={t.id_tropa}>{t.codigo_tropa}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cantidad Física Real ({um?.codigo})</label>
              <input
                type="number"
                step="0.01"
                required
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="Ej: 375.5"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remito / Vale Mixer</label>
              <input
                type="text"
                required
                value={remito}
                onChange={e => setRemito(e.target.value)}
                placeholder="Ej: VALE-1045"
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Suministro de la mañana"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
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
                  <span>Asentar e Impactar en Sheets</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalCompra: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const state = db.getState();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [insumo, setInsumo] = useState(1);
  const [tipoOrigen, setTipoOrigen] = useState<'Compra Externa a Proveedor' | 'Transferencia Agrícola Interna (Maíz/Soja)'>('Compra Externa a Proveedor');
  const [cantidad, setCantidad] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [comprobante, setComprobante] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [error, setError] = useState<string | null>(null);

  const insumoSel = state.D_Insumo.find(i => i.id_insumo === Number(insumo));
  const um = insumoSel ? state.D_UM.find(u => u.id_um === insumoSel.id_um_consumo) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = db.addCompraInsumo({
      fecha,
      id_insumo: Number(insumo),
      cantidad: Number(cantidad),
      precio_unitario_real: Number(precioUnitario),
      tipo_origen: tipoOrigen,
      numero_comprobante: comprobante,
      proveedor_o_unidad_origen: proveedor,
    });

    if (!res.success) {
      setError(res.error || 'Error al guardar ingreso.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <h4 className="text-base font-bold text-slate-800 mb-1">Ingreso de Insumo (F_ComprasInsumos)</h4>
        <p className="text-xs text-slate-500 mb-4">
          Compras externas o transferencias de maíz/soja de propia producción a precio FAS de pizarra.
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
              <label className="block font-semibold text-slate-700 mb-1">Insumo</label>
              <select
                value={insumo}
                onChange={e => setInsumo(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                {state.D_Insumo.map(i => (
                  <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Origen del Insumo</label>
            <select
              value={tipoOrigen}
              onChange={e => setTipoOrigen(e.target.value as any)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="Compra Externa a Proveedor">Compra Externa a Proveedor</option>
              <option value="Transferencia Agrícola Interna (Maíz/Soja)">Transferencia Agrícola Interna (Maíz/Soja)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cantidad Ingresada ({um?.codigo})</label>
              <input
                type="number"
                step="0.01"
                required
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="Ej: 10000"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Precio Unitario Real ($/{um?.codigo})</label>
              <input
                type="number"
                step="0.01"
                required
                value={precioUnitario}
                onChange={e => setPrecioUnitario(e.target.value)}
                placeholder="Ej: 185.50"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Número de Factura / Remito</label>
              <input
                type="text"
                required
                value={comprobante}
                onChange={e => setComprobante(e.target.value)}
                placeholder="Ej: FAC-A-0001-4412"
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proveedor / Campo Origen</label>
              <input
                type="text"
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                placeholder="Ej: Cooperativa / Lote Maíz 2"
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
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
            >
              Registrar Ingreso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
