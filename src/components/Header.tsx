/**
 * @license
 * Establecimiento: Pozo del Carril
 * Barra Superior / Header Global con Selector Paramétrico de Unidad de Negocio (Multi-Especie),
 * Subunidad, Campaña y Actualización en Vivo desde Google Sheets (doGet)
 */

import React from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, Calendar, Layers, Sparkles } from 'lucide-react';
import { D_Subunidad, D_Campana, D_UnidadNeg } from '../types/database';

interface HeaderProps {
  title: string;
  subtitle?: string;
  unidadesNeg?: D_UnidadNeg[];
  selectedUnidadNegId?: number;
  onSelectUnidadNeg?: (id: number) => void;
  subunidades: D_Subunidad[];
  selectedSubunidadId: number | 'all';
  onSelectSubunidad: (id: number | 'all') => void;
  campanas: D_Campana[];
  selectedCampanaId: number | 'all';
  onSelectCampana: (id: number | 'all') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  integrityErrorCount: number;
  onOpenIntegrity: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  unidadesNeg = [],
  selectedUnidadNegId = 1,
  onSelectUnidadNeg,
  subunidades,
  selectedSubunidadId,
  onSelectSubunidad,
  campanas,
  selectedCampanaId,
  onSelectCampana,
  onRefresh,
  isRefreshing,
  integrityErrorCount,
  onOpenIntegrity,
}) => {
  const getEspecieIcon = (id: number) => {
    switch (id) {
      case 1:
        return '🐂';
      case 2:
        return '🐖';
      case 3:
        return '🐑';
      case 4:
        return '🌽';
      case 5:
        return '🌱';
      default:
        return '🏷️';
    }
  };

  const currentUnidad = unidadesNeg.find(u => u.id_unidad_neg === selectedUnidadNegId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Module Title */}
        <div className="min-w-56">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{title}</h2>
            {currentUnidad && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1B4D3E]/10 text-[#1B4D3E] border border-[#1B4D3E]/30">
                {getEspecieIcon(currentUnidad.id_unidad_neg)} {currentUnidad.nombre} (id: {currentUnidad.id_unidad_neg})
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">{subtitle}</p>}
        </div>

        {/* Global Controls & Filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Selector Maestro de Unidad de Negocio / Multi-Especie */}
          {unidadesNeg.length > 0 && onSelectUnidadNeg && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1 text-xs shadow-2xs">
              <span className="text-[11px] font-bold text-[#1B4D3E] px-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#1B4D3E]" />
                <span>Especie / U.N.:</span>
              </span>
              <div className="flex items-center gap-0.5">
                {unidadesNeg.map(un => {
                  const isSel = selectedUnidadNegId === un.id_unidad_neg;
                  return (
                    <button
                      key={un.id_unidad_neg}
                      onClick={() => onSelectUnidadNeg(un.id_unidad_neg)}
                      className={`px-2 py-1 rounded-md font-semibold text-xs transition cursor-pointer flex items-center gap-1 ${
                        isSel
                          ? 'bg-[#1B4D3E] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                      title={`${un.nombre} (id_unidad_neg: ${un.id_unidad_neg})`}
                    >
                      <span>{getEspecieIcon(un.id_unidad_neg)}</span>
                      <span>{un.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subunit Filter (Paramétrico dinámico) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-1.5">Etapas:</span>
            <button
              onClick={() => onSelectSubunidad('all')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                selectedSubunidadId === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Consolidado
            </button>
            {subunidades.length > 0 ? (
              subunidades.map(sub => (
                <button
                  key={sub.id_subunidad}
                  onClick={() => onSelectSubunidad(sub.id_subunidad)}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                    selectedSubunidadId === sub.id_subunidad
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                  title={sub.rango_peso_referencia ? `Rango: ${sub.rango_peso_referencia}` : undefined}
                >
                  {sub.nombre}
                </button>
              ))
            ) : (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded italic">
                Próximamente en D_Subunidad
              </span>
            )}
          </div>

          {/* Campaign Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCampanaId}
              onChange={e => onSelectCampana(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Seleccionar Campaña"
              className="bg-transparent text-slate-700 font-medium text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Todas las Campañas</option>
              {campanas.map(c => (
                <option key={c.id_campana} value={c.id_campana}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Integrity Status Pill */}
          <button
            onClick={onOpenIntegrity}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
              integrityErrorCount === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Auditoría de integridad de reglas relacionales y Google Sheets"
          >
            {integrityErrorCount === 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Integridad OK</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{integrityErrorCount} desvíos</span>
              </>
            )}
          </button>

          {/* Sincronizar Google Sheets Button (doGet 20 tablas) */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1B4D3E] hover:bg-[#13382c] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Consumir y sincronizar las 20 tablas de Google Sheets mediante doGet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar datos'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
