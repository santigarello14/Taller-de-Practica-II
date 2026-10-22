/**
 * @license
 * Establecimiento: Pozo del Carril
 * Navegación Lateral y Menú de Módulos ERP
 */

import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Tag,
  Sliders,
  ArrowLeftRight,
  Scale,
  Wheat,
  ShieldCheck,
  ReceiptText,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  AlertOctagon,
  Users,
  LogOut,
  RefreshCw,
  TrendingUp,
  Calculator,
} from 'lucide-react';
import { RolUsuario } from '../types/database';

export type ActiveModule =
  | 'dashboard'
  | 'maestros'
  | 'hacienda_individual'
  | 'parametros'
  | 'movimientos'
  | 'pesadas'
  | 'alimentacion'
  | 'sanidad'
  | 'ventas'
  | 'costos_indirectos'
  | 'costos_estandar'
  | 'cotizaciones'
  | 'resultados'
  | 'integridad'
  | 'google_sheets'
  | 'usuarios_auditoria';

interface SidebarProps {
  currentModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  currentUser: { nombre: string; usuario: string; rol: RolUsuario } | null;
  onLogout: () => void;
  onRefresh: () => void;
  integrityErrorCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  onLogout,
  onRefresh,
  integrityErrorCount,
}) => {
  const menuSections = [
    {
      title: 'OPERACIONES PRINCIPALES',
      items: [
        { id: 'dashboard' as ActiveModule, label: 'Inicio', icon: LayoutDashboard },
        { id: 'movimientos' as ActiveModule, label: 'Movimientos y Existencias', icon: ArrowLeftRight },
        { id: 'pesadas' as ActiveModule, label: 'Control de Pesadas', icon: Scale },
        { id: 'alimentacion' as ActiveModule, label: 'Alimentación y Stock', icon: Wheat },
        { id: 'sanidad' as ActiveModule, label: 'Sanidad y Protocolos', icon: ShieldCheck },
        { id: 'ventas' as ActiveModule, label: 'Liquidación de Ventas', icon: ReceiptText },
      ],
    },
    {
      title: 'GESTIÓN Y CABAÑA',
      items: [
        { id: 'hacienda_individual' as ActiveModule, label: 'Hacienda Individual (RFID)', icon: Tag },
        { id: 'parametros' as ActiveModule, label: 'Estándares y Proyección', icon: Sliders },
        { id: 'costos_indirectos' as ActiveModule, label: 'Costos Indirectos', icon: PieChart },
      ],
    },
    {
      title: 'ANÁLISIS Y CONTROL',
      items: [
        { id: 'costos_estandar' as ActiveModule, label: 'Costos Estándar', icon: Calculator },
        { id: 'cotizaciones' as ActiveModule, label: 'Cotizaciones de Mercado', icon: TrendingUp },
        { id: 'resultados' as ActiveModule, label: 'Márgenes y Desvíos (R_)', icon: BarChart3 },
        {
          id: 'integridad' as ActiveModule,
          label: 'Control de Integridad',
          icon: AlertOctagon,
          badge: integrityErrorCount > 0 ? integrityErrorCount : undefined,
        },
      ],
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { id: 'maestros' as ActiveModule, label: 'Tablas Maestras (D_)', icon: Layers },
        { id: 'google_sheets' as ActiveModule, label: 'Conexión Google Sheets', icon: FileSpreadsheet },
        { id: 'usuarios_auditoria' as ActiveModule, label: 'Usuarios y Auditoría', icon: Users },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen shrink-0 border-r border-slate-800 select-none">
      {/* Brand & Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-900/40">
            PC
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-white text-sm tracking-wide">Pozo del Carril</h1>
            <p className="text-xs text-emerald-400 font-medium">Activos con cuatro patas</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Unidad: <strong className="text-slate-200">Bovinos</strong></span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">Ciclo Completo</span>
        </div>
      </div>

      {/* Manual Refresh Button */}
      <div className="p-3">
        <button
          onClick={onRefresh}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/40 text-xs font-semibold transition cursor-pointer"
          title="Lee la información actualizada de Google Sheets"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {menuSections.map((sec, i) => (
          <div key={i}>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sec.title}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectModule(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {currentUser?.nombre || 'Usuario'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{currentUser?.rol || 'Operador'}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
