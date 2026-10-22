/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 9: Ventas, Liquidaciones Feriales y Determinación de Venta Neta (RT 22 / RT 54)
 * F_VentasHacienda con discriminación taxativa de deducciones comerciales e impacto directo en Google Sheets
 */

import React, { useState } from 'react';
import { ReceiptText, Plus, CheckCircle2, AlertCircle, Search, RefreshCw, Send } from 'lucide-react';
import { db } from '../../services/dbEngine';
import { D_Subunidad, D_CategoriaHacienda } from '../../types/database';

interface VentasModuleProps {
  selectedUnidadNegId?: number;
  availableSubunidades?: D_Subunidad[];
  availableCategorias?: D_CategoriaHacienda[];
}

export const VentasModule: React.FC<VentasModuleProps> = ({
  selectedUnidadNegId = 1,
  availableSubunidades,
  availableCategorias,
}) => {
  const state = db.getState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const subunidades = availableSubunidades && availableSubunidades.length > 0
    ? availableSubunidades
    : state.D_Subunidad.filter(s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId));

  const categorias = availableCategorias && availableCategorias.length > 0
    ? availableCategorias
    : state.D_CategoriaHacienda.filter(c => Number(c.id_unidad_neg) === Number(selectedUnidadNegId));

  const validSubIds = new Set(subunidades.map(s => s.id_subunidad));

  const ventas = state.F_VentasHacienda.filter(v => {
    if (validSubIds.size > 0 && !validSubIds.has(v.id_subunidad)) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    const cat = state.D_CategoriaHacienda.find(c => c.id_categoria === v.id_categoria);
    return (
      v.fecha.includes(term) ||
      (v.numero_liquidacion_dte && v.numero_liquidacion_dte.toLowerCase().includes(term)) ||
      (cat && cat.nombre.toLowerCase().includes(term)) ||
      (v.consignatario_comprador && v.consignatario_comprador.toLowerCase().includes(term))
    );
  });

  const totalVentasNetas = ventas.reduce((acc, v) => acc + (Number(v.venta_neta) || 0), 0);
  const totalIngresoBruto = ventas.reduce((acc, v) => acc + (Number(v.ingreso_bruto_venta) || 0), 0);
  const totalGastosComerciales = ventas.reduce((acc, v) => acc + (Number(v.total_gastos_comerciales) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Liquidación de Ventas de Hacienda (F_VentasHacienda)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E]/10 text-[#1B4D3E] border border-[#1B4D3E]/20">
              POST / append Dinámico
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Determinación de Venta Neta bajo RT 22 / RT 54 deduciendo comisión, flete, pesaje ferial y aranceles SENASA DTe con impacto en Google Sheets.
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
          <span>Nueva Liquidación de Venta</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ingreso Bruto Liquidado</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">${totalIngresoBruto.toLocaleString('es-AR')}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Precio de remate x Kg vivos</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Deducciones Comerciales</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">-${totalGastosComerciales.toLocaleString('es-AR')}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Comisiones, fletes, pista y SENASA</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-[#1B4D3E]/30 shadow-xs">
          <div className="text-[10px] text-[#1B4D3E] font-bold uppercase tracking-wider">Venta Neta (RT 22 / RT 54)</div>
          <div className="text-2xl font-bold text-[#1B4D3E] mt-1">${totalVentasNetas.toLocaleString('es-AR')}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Ingreso computable en resultado productivo</div>
        </div>
      </div>

      {/* Tabla de Liquidaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por liquidación, comprador o categoría..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{ventas.length} liquidaciones registradas</span>
        </div>

        <div className="overflow-x-auto">
          {ventas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <ReceiptText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No hay ventas registradas para este filtro.</p>
              <p className="mt-1">
                Conforme al principio contable de devengado, cargue las liquidaciones recibidas de consignatarios o frigoríficos.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1B4D3E]/5 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Liquidación / DTe</th>
                  <th className="py-2.5 px-4">Subunidad</th>
                  <th className="py-2.5 px-4">Categoría</th>
                  <th className="py-2.5 px-4">Cabezas</th>
                  <th className="py-2.5 px-4">Kilos Vivos</th>
                  <th className="py-2.5 px-4">Precio $/kg</th>
                  <th className="py-2.5 px-4">Fuente / Auditoría</th>
                  <th className="py-2.5 px-4">Bruto</th>
                  <th className="py-2.5 px-4">Gastos Comerciales</th>
                  <th className="py-2.5 px-4">Venta Neta (RT 22)</th>
                  <th className="py-2.5 px-4">Comprador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ventas.map(v => {
                  const sub = state.D_Subunidad.find(s => s.id_subunidad === v.id_subunidad);
                  const cat = state.D_CategoriaHacienda.find(c => c.id_categoria === v.id_categoria);

                  return (
                    <tr key={v.id_venta} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium">{v.fecha}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{v.numero_liquidacion_dte}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1B4D3E]">{sub?.nombre || '-'}</td>
                      <td className="py-2.5 px-4">{cat?.nombre || '-'}</td>
                      <td className="py-2.5 px-4 font-bold">{v.cabezas} cab.</td>
                      <td className="py-2.5 px-4 font-mono">{Number(v.kilos_vivos_totales).toLocaleString('es-AR')} kg</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">${Number(v.precio_por_kg_real).toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        {v.fuente_precio ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-700">{v.fuente_precio}</span>
                            <span className="text-[9px] text-slate-400">{v.fecha_rueda_remate} ({v.estado_rueda})</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Cañuelas_Claude</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono">${Number(v.ingreso_bruto_venta).toLocaleString('es-AR')}</td>
                      <td className="py-2.5 px-4 font-mono text-rose-700">
                        -${Number(v.total_gastos_comerciales).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-800 bg-emerald-50/50">
                        ${Number(v.venta_neta).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{v.consignatario_comprador || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ModalVenta
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

const ModalVenta: React.FC<{
  subunidades: D_Subunidad[];
  categorias: D_CategoriaHacienda[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ subunidades, categorias, onClose, onSaved }) => {
  const state = db.getState();
  const subList = subunidades.length > 0 ? subunidades : state.D_Subunidad;
  const catList = categorias.length > 0 ? categorias : state.D_CategoriaHacienda;

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [subunidad, setSubunidad] = useState(subList[subList.length - 1]?.id_subunidad || subList[0]?.id_subunidad || 4);
  const [categoria, setCategoria] = useState(catList[0]?.id_categoria || 10); // Novillos
  const [cabezas, setCabezas] = useState('45');
  const [kilos, setKilos] = useState('18900');
  const [precioKilo, setPrecioKilo] = useState('2150.00');
  const [comision, setComision] = useState('1219050');
  const [flete, setFlete] = useState('850000');
  const [pista, setPista] = useState('250000');
  const [arancelDTe, setArancelDTe] = useState('120000');
  const [otrasTasas, setOtrasTasas] = useState('65000');
  const [retenciones, setRetenciones] = useState('609525');
  const [comprobante, setComprobante] = useState('LIQ-CONSIG-2026-01');
  const [consignatario, setConsignatario] = useState('Consignataria del Sur S.A.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cálculos dinámicos
  const kTotales = Number(kilos) || 0;
  const pKilo = Number(precioKilo) || 0;
  const bruto = kTotales * pKilo;
  const comComer = (Number(comision) || 0) + (Number(flete) || 0) + (Number(pista) || 0) + (Number(arancelDTe) || 0) + (Number(otrasTasas) || 0);
  const ventaNeta = bruto - comComer;

  // Cotización dinámica vigente según la subunidad y categoría seleccionadas
  const cotVigente = db.getCotizacionVigente(Number(categoria), Number(subunidad));

  const handleApplyCotizacion = () => {
    if (cotVigente && cotVigente.precio_vigente > 0) {
      setPrecioKilo(cotVigente.precio_vigente.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await db.addVentaHaciendaAsync({
        fecha,
        id_subunidad: Number(subunidad),
        id_categoria: Number(categoria),
        id_cuenta_ingreso: '4.1.01',
        cabezas: Number(cabezas),
        kilos_vivos_totales: kTotales,
        precio_por_kg_real: pKilo,
        comision_consignatario: Number(comision) || 0,
        flete_camion_jaula: Number(flete) || 0,
        derechos_pista_pesaje: Number(pista) || 0,
        aranceles_senasa_dte: Number(arancelDTe) || 0,
        otras_tasas_feriales: Number(otrasTasas) || 0,
        alicuota_iva: 0.105,
        retenciones_fiscales: Number(retenciones) || 0,
        numero_liquidacion_dte: comprobante,
        consignatario_comprador: consignatario,
        fuente_precio: cotVigente?.fuente,
        fecha_rueda_remate: cotVigente?.fecha_rueda_remate,
        estado_rueda: cotVigente?.estado,
        fecha_hora_consulta: cotVigente?.consulta,
        es_ajuste_manual: cotVigente?.es_ajuste_manual || false,
      });

      if (!res.success) {
        setError(res.error || 'Error al guardar liquidación.');
        setIsSubmitting(false);
        return;
      }

      const feedbackMsg = res.googleSheetsAppended
        ? `Liquidación de venta registrada e impactada exitosamente en Google Sheets (F_VentasHacienda con auditoría de cotización).`
        : `Liquidación de venta guardada en el ERP local.`;

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
          <h4 className="text-base font-bold text-slate-800">Cargar Liquidación de Venta (F_VentasHacienda)</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
            POST / append
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Cálculo automático de deducciones comerciales según RT 22 / RT 54 e impacto directo en la planilla.
        </p>

        {/* Live calculated box */}
        <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-600">Ingreso Bruto: </span>
            <strong className="text-slate-900">${bruto.toLocaleString('es-AR')}</strong>
          </div>
          <div>
            <span className="text-slate-600">Venta Neta (RT 22): </span>
            <strong className="text-[#1B4D3E] font-bold">${ventaNeta.toLocaleString('es-AR')}</strong>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha de Remate / Faena</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">N° Liquidación / Guía DTe</label>
              <input
                type="text"
                required
                value={comprobante}
                onChange={e => setComprobante(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subunidad / Etapa Vendedora</label>
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
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría Vendida</label>
              <select
                value={categoria}
                onChange={e => setCategoria(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-[#1B4D3E]"
              >
                {catList.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sugerencia de Cotización Dinámica de Mercado */}
          {cotVigente && cotVigente.precio_vigente > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Cotización de Mercado: {cotVigente.fuente}
                </span>
                <div className="text-slate-700 mt-0.5">
                  <strong>${cotVigente.precio_vigente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong> {cotVigente.unidad_medida} • Rueda {cotVigente.fecha_rueda_remate || 'Reciente'} ({cotVigente.estado})
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyCotizacion}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition cursor-pointer"
              >
                Aplicar ${cotVigente.precio_vigente}
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cabezas</label>
              <input
                type="number"
                min="1"
                required
                value={cabezas}
                onChange={e => setCabezas(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kg Vivos Totales</label>
              <input
                type="number"
                step="0.1"
                required
                value={kilos}
                onChange={e => setKilos(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Precio Real $/kg</label>
              <input
                type="number"
                step="0.01"
                required
                value={precioKilo}
                onChange={e => setPrecioKilo(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
          </div>

          {/* Deducciones Comerciales RT 22 */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
              Deducciones Comerciales Registradas (Cuentas 5.7)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Comisión Consignatario (5.7.01)</label>
                <input
                  type="number"
                  value={comision}
                  onChange={e => setComision(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Flete Camión Jaula (5.7.02)</label>
                <input
                  type="number"
                  value={flete}
                  onChange={e => setFlete(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Pista y Pesaje (5.7.03)</label>
                <input
                  type="number"
                  value={pista}
                  onChange={e => setPista(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Aranceles SENASA / DTe (5.7.04)</label>
                <input
                  type="number"
                  value={arancelDTe}
                  onChange={e => setArancelDTe(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Otras Tasas Feriales</label>
                <input
                  type="number"
                  value={otrasTasas}
                  onChange={e => setOtrasTasas(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
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
