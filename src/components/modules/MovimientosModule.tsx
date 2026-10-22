/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 5: Movimientos Biológicos y Existencias de Hacienda (F_MovimientosHacienda)
 * Integrado con Google Sheets mediante POST / append con mapeo dinámico de columnas y multi-especie
 */

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import {
  D_Subunidad,
  D_CategoriaHacienda,
  F_MovimientosHacienda,
  TipoMovimientoHacienda,
} from '../../types/database';

interface MovimientosModuleProps {
  selectedUnidadNegId?: number;
  availableSubunidades?: D_Subunidad[];
  availableCategorias?: D_CategoriaHacienda[];
}

export const MovimientosModule: React.FC<MovimientosModuleProps> = ({
  selectedUnidadNegId = 1,
  availableSubunidades,
  availableCategorias,
}) => {
  const state = db.getState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubunidadFilter, setSelectedSubunidadFilter] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const subunidades = availableSubunidades && availableSubunidades.length > 0
    ? availableSubunidades
    : state.D_Subunidad.filter(s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId));

  const categorias = availableCategorias && availableCategorias.length > 0
    ? availableCategorias
    : state.D_CategoriaHacienda.filter(c => Number(c.id_unidad_neg) === Number(selectedUnidadNegId));

  const validSubIds = new Set(subunidades.map(s => s.id_subunidad));

  // Existencias calculadas por categoría y por subunidad
  const existenciasPorSubunidad = subunidades.map(sub => {
    const cabezas = db.getStockHacienda(sub.id_subunidad);
    return { sub, cabezas };
  });

  const totalCabezas = existenciasPorSubunidad.reduce((acc, e) => acc + e.cabezas, 0);

  // Filtrar movimientos
  const movimientosFiltrados = state.F_MovimientosHacienda.filter(m => {
    if (validSubIds.size > 0) {
      const matchAnySub =
        (m.id_subunidad_origen && validSubIds.has(m.id_subunidad_origen)) ||
        (m.id_subunidad_destino && validSubIds.has(m.id_subunidad_destino));
      if (!matchAnySub && (m.id_subunidad_origen || m.id_subunidad_destino)) {
        return false;
      }
    }

    const matchSub =
      selectedSubunidadFilter === 'all' ||
      m.id_subunidad_origen === selectedSubunidadFilter ||
      m.id_subunidad_destino === selectedSubunidadFilter;
    const matchSearch =
      m.tipo_movimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.remito_guia && m.remito_guia.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSub && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Movimientos y Existencias de Hacienda (F_MovimientosHacienda)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E]/10 text-[#1B4D3E] border border-[#1B4D3E]/20">
              POST / append Dinámico
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconstrucción de existencias en tiempo real con validación anti-stocks negativos e impacto directo en la planilla de Google Sheets.
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
          <span>Registrar Movimiento / Evento</span>
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

      {/* Live Inventory Cards by Subunit */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedSubunidadFilter('all')}
          className={`p-4 rounded-xl shadow-xs col-span-2 sm:col-span-1 cursor-pointer transition ${
            selectedSubunidadFilter === 'all'
              ? 'bg-[#1B4D3E] text-white ring-2 ring-emerald-400'
              : 'bg-slate-900 text-white'
          }`}
        >
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Consolidado Especie</div>
          <div className="text-2xl font-bold mt-1">{totalCabezas}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cabezas en campo</div>
        </div>

        {existenciasPorSubunidad.map(({ sub, cabezas }) => (
          <div
            key={sub.id_subunidad}
            onClick={() => setSelectedSubunidadFilter(sub.id_subunidad)}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              selectedSubunidadFilter === sub.id_subunidad
                ? 'bg-emerald-50 border-[#1B4D3E] shadow-xs ring-1 ring-[#1B4D3E]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] text-slate-500 font-bold uppercase truncate">{sub.nombre}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{cabezas}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{sub.rango_peso_referencia || 'Cabezas'}</div>
          </div>
        ))}
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por tipo o remito..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{movimientosFiltrados.length} movimientos registrados</span>
        </div>

        <div className="overflow-x-auto">
          {movimientosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No se encontraron movimientos registrados.</p>
              <p className="mt-1">
                Utilice el botón superior para registrar traslados, nacimientos, compras, destetes o ventas.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1B4D3E]/5 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Tipo Movimiento</th>
                  <th className="py-2.5 px-4">Cabezas</th>
                  <th className="py-2.5 px-4">Origen</th>
                  <th className="py-2.5 px-4">Destino</th>
                  <th className="py-2.5 px-4">Categoría Transición</th>
                  <th className="py-2.5 px-4">Peso Balanza</th>
                  <th className="py-2.5 px-4">Guía / DTe</th>
                  <th className="py-2.5 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movimientosFiltrados.map(m => {
                  const subOrig = state.D_Subunidad.find(s => s.id_subunidad === m.id_subunidad_origen);
                  const subDest = state.D_Subunidad.find(s => s.id_subunidad === m.id_subunidad_destino);
                  const catOrig = state.D_CategoriaHacienda.find(c => c.id_categoria === m.id_categoria_origen);
                  const catDest = state.D_CategoriaHacienda.find(c => c.id_categoria === m.id_categoria_destino);

                  return (
                    <tr key={m.id_movimiento} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium">{m.fecha}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-[#1B4D3E] border border-emerald-200">
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.cantidad_cabezas} cab.</td>
                      <td className="py-2.5 px-4 text-slate-600">{subOrig?.nombre || '-'}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1B4D3E]">{subDest?.nombre || '-'}</td>
                      <td className="py-2.5 px-4 text-[11px]">
                        {catOrig ? catOrig.nombre : '-'} &rarr; {catDest ? catDest.nombre : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {m.peso_total_kg > 0 ? `${m.peso_total_kg} kg` : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">{m.remito_guia || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{m.motivo_observaciones || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ModalMovimiento
          subunidades={subunidades}
          categorias={categorias}
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

const ModalMovimiento: React.FC<{
  subunidades: D_Subunidad[];
  categorias: D_CategoriaHacienda[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ subunidades, categorias, onClose, onSaved }) => {
  const state = db.getState();
  const subList = subunidades.length > 0 ? subunidades : state.D_Subunidad;
  const catList = categorias.length > 0 ? categorias : state.D_CategoriaHacienda;

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoMovimientoHacienda>('Destete');
  const [esIndividual, setEsIndividual] = useState(false);
  const [idHacienda, setIdHacienda] = useState<number | ''>('');
  const [idTropa, setIdTropa] = useState<number | ''>('');
  const [cabezas, setCabezas] = useState('1');
  const [subOrigen, setSubOrigen] = useState<number | ''>(subList[0]?.id_subunidad || 1);
  const [subDestino, setSubDestino] = useState<number | ''>(subList[1]?.id_subunidad || subList[0]?.id_subunidad || 2);
  const [catOrigen, setCatOrigen] = useState<number>(catList[0]?.id_categoria || 1);
  const [catDestino, setCatDestino] = useState<number>(catList[1]?.id_categoria || catList[0]?.id_categoria || 2);
  const [pesoTotal, setPesoTotal] = useState('');
  const [guia, setGuia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cantCab = Number(cabezas) || 1;
    const pTotal = Number(pesoTotal) || 0;
    const pProm = cantCab > 0 ? Number((pTotal / cantCab).toFixed(2)) : 0;

    try {
      const res = await db.addMovimientoHaciendaAsync({
        fecha,
        tipo_movimiento: tipo,
        id_hacienda: esIndividual && idHacienda ? Number(idHacienda) : null,
        id_tropa: !esIndividual && idTropa ? Number(idTropa) : null,
        cantidad_cabezas: cantCab,
        id_subunidad_origen: subOrigen !== '' ? Number(subOrigen) : null,
        id_subunidad_destino: subDestino !== '' ? Number(subDestino) : null,
        id_categoria_origen: Number(catOrigen),
        id_categoria_destino: Number(catDestino),
        peso_total_kg: pTotal,
        peso_promedio_kg: pProm,
        remito_guia: guia,
        motivo_observaciones: observaciones,
      });

      if (!res.success) {
        setError(res.error || 'Error al asentar movimiento.');
        setIsSubmitting(false);
        return;
      }

      const feedbackMsg = res.googleSheetsAppended
        ? `Movimiento registrado y guardado exitosamente en Google Sheets (F_MovimientosHacienda con mapeo dinámico).`
        : `Movimiento registrado exitosamente en el ERP local.`;

      onSaved(feedbackMsg);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-base font-bold text-slate-800">Nuevo Movimiento Biológico (F_MovimientosHacienda)</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
            POST / append
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Control de existencias con validación anti-stocks negativos e impacto automático en Google Sheets.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha de Evento</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Evento</label>
              <select
                value={tipo}
                onChange={e => {
                  const val = e.target.value as TipoMovimientoHacienda;
                  setTipo(val);
                  if (val === 'Nacimiento' || val === 'Compra Externa') {
                    setSubOrigen('');
                  } else if (val === 'Venta' || val === 'Muerte') {
                    setSubDestino('');
                  }
                }}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-[#1B4D3E]"
              >
                <option value="Nacimiento">Nacimiento</option>
                <option value="Destete">Destete</option>
                <option value="Traslado Inter-Subunidad">Traslado Inter-Subunidad</option>
                <option value="Cambio de Categoría">Cambio de Categoría</option>
                <option value="Cambio de Tropa">Cambio de Tropa</option>
                <option value="Compra Externa">Compra Externa</option>
                <option value="Venta">Venta Final</option>
                <option value="Muerte">Baja por Mortandad</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Modalidad de Trazabilidad</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="modalidad"
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
                  name="modalidad"
                  checked={esIndividual}
                  onChange={() => {
                    setEsIndividual(true);
                    setCabezas('1');
                  }}
                />
                <span>Individual por Caravana RFID</span>
              </label>
            </div>
          </div>

          {esIndividual ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Animal Individual</label>
              <select
                value={idHacienda}
                onChange={e => setIdHacienda(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Seleccione Caravana...</option>
                {state.D_HaciendaIndividual.filter(h => h.estado_actual === 'Activo').map(h => (
                  <option key={h.id_hacienda} value={h.id_hacienda}>
                    Caravana {h.caravana_visual} (RFID: {h.caravana_rfid})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lote / Tropa</label>
                <select
                  value={idTropa}
                  onChange={e => setIdTropa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Sin tropa específica</option>
                  {state.D_TropaLote.map(t => (
                    <option key={t.id_tropa} value={t.id_tropa}>{t.codigo_tropa} - {t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cantidad de Cabezas</label>
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

          {/* Subunidades Origen y Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad Origen</label>
              <select
                value={subOrigen}
                onChange={e => setSubOrigen(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                disabled={tipo === 'Nacimiento' || tipo === 'Compra Externa'}
              >
                <option value="">(Ninguno / Nacimiento / Entrada)</option>
                {subList.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad Destino</label>
              <select
                value={subDestino}
                onChange={e => setSubDestino(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                disabled={tipo === 'Venta' || tipo === 'Muerte'}
              >
                <option value="">(Ninguno / Venta / Muerte)</option>
                {subList.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Categorías Origen y Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría Origen</label>
              <select
                value={catOrigen}
                onChange={e => setCatOrigen(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {catList.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría Destino</label>
              <select
                value={catDestino}
                onChange={e => setCatDestino(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {catList.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Peso Total en Balanza (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={pesoTotal}
                onChange={e => setPesoTotal(e.target.value)}
                placeholder="Ej: 15400"
                className="w-full p-2 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remito / Guía / DTe</label>
              <input
                type="text"
                value={guia}
                onChange={e => setGuia(e.target.value)}
                placeholder="Ej: GUIA-SENASA-4412"
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motivo / Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: Traslado a piquete 3 por cambio de ciclo"
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
                  <span>Registrar e Impactar en Sheets</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
