/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 12: Control de Integridad Referencial y Reglas del Negocio (Sección 4.1)
 * Detecta y audita violaciones a las 35 relaciones y reglas lógicas sin alterar los datos
 */

import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, Database } from 'lucide-react';
import { db } from '../../services/dbEngine';

export const IntegridadModule: React.FC = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const errors = db.runIntegrityAudit();

  const handleReAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Control de Integridad Referencial y Reglas de Negocio
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              errors.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {errors.length === 0 ? 'Base Íntegra' : `${errors.length} Inconsistencias Detectadas`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoría de integridad activa: detecta ediciones manuales en Google Sheets que hayan vulnerado claves foráneas, unicidad o saldos negativos.
          </p>
        </div>

        <button
          onClick={handleReAudit}
          disabled={isAuditing}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span>Ejecutar Auditoría Completa</span>
        </button>
      </div>

      {/* Overview Status Banner */}
      {errors.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 flex items-start gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Todas las tablas respetan las 35 reglas de integridad</h4>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              No se detectaron claves foráneas huérfanas, caravanas duplicadas, parámetros solapados ni existencias negativas. La sincronización con Google Sheets es 100% consistente.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-4">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              Se detectaron {errors.length} registros que violan las reglas de negocio
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Conforme a la especificación de la Sección 4.1, el sistema <strong>no borra ni corrige nada automáticamente</strong>. Revise la lista a continuación y ajuste las celdas directamente en Google Sheets o desde los formularios del sistema.
            </p>
          </div>
        </div>
      )}

      {/* Rules Tested Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Reglas y Mecanismos de Integridad Auditados Activamente:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-800">1. Claves Foráneas (FK)</div>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              Verificación de que todo insumo, subunidad, categoría y cuenta referenciada exista en su tabla madre.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-800">2. Unicidad e Identificadores</div>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              Comprobación de que no existan caravanas visuales ni RFID duplicadas en <code>D_HaciendaIndividual</code>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-800">3. Control Físico de Stock</div>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              Alerta de saldos negativos: Entradas Acumuladas &lt; Salidas en insumos o hacienda.
            </p>
          </div>
        </div>
      </div>

      {/* Error List Table */}
      {errors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
            Detalle de Inconsistencias Detectadas ({errors.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Severidad</th>
                  <th className="py-2.5 px-4">Hoja / Tabla Afectada</th>
                  <th className="py-2.5 px-4">ID Registro</th>
                  <th className="py-2.5 px-4">Regla Violada</th>
                  <th className="py-2.5 px-4">Descripción del Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {errors.map(err => (
                  <tr key={err.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        err.severidad === 'CRITICO' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {err.severidad}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{err.tabla}</td>
                    <td className="py-2.5 px-4 font-mono">{err.id_registro}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{err.regla}</td>
                    <td className="py-2.5 px-4 text-slate-600">{err.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
