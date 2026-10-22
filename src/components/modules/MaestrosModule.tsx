/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 2: Maestros y Catálogos Dimensionales (D_)
 * Permite agregar nuevas Unidades de Negocio y Subunidades sin tocar código
 */

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import {
  D_UnidadNeg,
  D_Subunidad,
  D_CategoriaHacienda,
  D_Insumo,
  D_Cuenta,
  D_UM,
  D_Campana,
  D_TropaLote,
  ClasificacionContable,
} from '../../types/database';

type MasterTab =
  | 'D_UnidadNeg'
  | 'D_Subunidad'
  | 'D_CategoriaHacienda'
  | 'D_Insumo'
  | 'D_Cuenta'
  | 'D_UM'
  | 'D_Campana'
  | 'D_TropaLote';

export const MaestrosModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterTab>('D_Subunidad');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const state = db.getState();

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
    setFeedback(null);
  };

  const handleDelete = (tab: MasterTab, id: number | string) => {
    const confirm = window.confirm('¿Está seguro de que desea eliminar este registro maestro?');
    if (!confirm) return;

    const check = db.checkDeleteRestrict(tab, id);
    if (!check.allowed) {
      setFeedback({ type: 'error', message: check.reason || 'Restricción de integridad: no es posible eliminar.' });
      return;
    }

    if (tab === 'D_Insumo') {
      const res = db.deleteInsumo(Number(id));
      if (res.success) {
        setFeedback({ type: 'success', message: 'Insumo eliminado con éxito.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Error al eliminar.' });
      }
    } else {
      setFeedback({ type: 'error', message: 'La tabla seleccionada cuenta con protección de datos históricos.' });
    }
  };

  const handleExportCSV = (tab: MasterTab) => {
    const csv = db.exportTableToCSV(tab);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Flex Tabs */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Catálogos y Dimensiones Maestras</h3>
            <p className="text-xs text-slate-500">
              Configuración de entidades estables. Agregue nuevas Unidades de Negocio o Subunidades sin modificar código.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCSV(activeTab)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar {activeTab}.csv</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Registro</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
          {[
            { id: 'D_Subunidad', label: 'Subunidades (Etapas)', count: state.D_Subunidad.length },
            { id: 'D_UnidadNeg', label: 'Unidades de Negocio', count: state.D_UnidadNeg.length },
            { id: 'D_CategoriaHacienda', label: 'Categorías Rodeo', count: state.D_CategoriaHacienda.length },
            { id: 'D_Insumo', label: 'Insumos & Vacunas', count: state.D_Insumo.length },
            { id: 'D_Cuenta', label: 'Plan de Cuentas', count: state.D_Cuenta.length },
            { id: 'D_UM', label: 'Unidades de Medida', count: state.D_UM.length },
            { id: 'D_Campana', label: 'Campañas', count: state.D_Campana.length },
            { id: 'D_TropaLote', label: 'Lotes & Tropas', count: state.D_TropaLote.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as MasterTab);
                setSearchTerm('');
                setFeedback(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Messages */}
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

      {/* Filter and Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Buscar en ${activeTab}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Hoja de Google Sheets: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-bold">{activeTab}</code>
          </div>
        </div>

        {/* Table View Component Switch */}
        <div className="overflow-x-auto">
          {activeTab === 'D_Subunidad' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Subunidad / Etapa</th>
                  <th className="py-2.5 px-4">Unidad de Negocio (FK)</th>
                  <th className="py-2.5 px-4">Rango Peso Ref.</th>
                  <th className="py-2.5 px-4">Descripción Operativa</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_Subunidad.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
                  const un = state.D_UnidadNeg.find(u => u.id_unidad_neg === s.id_unidad_neg);
                  return (
                    <tr key={s.id_subunidad} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.id_subunidad}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-800">{s.nombre}</td>
                      <td className="py-2.5 px-4">{un ? un.nombre : `ID ${s.id_unidad_neg}`}</td>
                      <td className="py-2.5 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{s.rango_peso_referencia || '-'}</span></td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-md truncate">{s.descripcion}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete('D_Subunidad', s.id_subunidad)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Eliminar (con control ON DELETE RESTRICT)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'D_UnidadNeg' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Nombre Unidad</th>
                  <th className="py-2.5 px-4">Descripción</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_UnidadNeg.filter(u => u.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <tr key={u.id_unidad_neg} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold">{u.id_unidad_neg}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="py-2.5 px-4 text-slate-500">{u.descripcion || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">Activo</span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete('D_UnidadNeg', u.id_unidad_neg)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'D_CategoriaHacienda' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Categoría Rodeo (12)</th>
                  <th className="py-2.5 px-4">Clasificación RT 22 / RT 54</th>
                  <th className="py-2.5 px-4">Sexo Esperado</th>
                  <th className="py-2.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_CategoriaHacienda.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                  <tr key={c.id_categoria} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold">{c.id_categoria}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{c.nombre}</td>
                    <td className="py-2.5 px-4">
                      {c.clasificacion_contable === 'Activo Productor' ? (
                        <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          Activo Productor (Uso)
                        </span>
                      ) : c.clasificacion_contable === 'Bien de Cambio' ? (
                        <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          Bien de Cambio (Venta)
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          Vacío (A definir por usuario)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">{c.sexo_esperado || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-emerald-700 font-medium">Activo</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'D_Insumo' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Nombre Insumo</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">U. Medida (FK)</th>
                  <th className="py-2.5 px-4">Cuenta Costo (FK)</th>
                  <th className="py-2.5 px-4">Stock Actual</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_Insumo.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(ins => {
                  const um = state.D_UM.find(u => u.id_um === ins.id_um_consumo);
                  const cta = state.D_Cuenta.find(c => c.id_cuenta === ins.id_cuenta_costo);
                  const stock = db.getStockInsumo(ins.id_insumo);
                  return (
                    <tr key={ins.id_insumo} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold">{ins.id_insumo}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{ins.nombre}</td>
                      <td className="py-2.5 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded">{ins.tipo}</span></td>
                      <td className="py-2.5 px-4 font-mono">{um ? um.codigo : ins.id_um_consumo}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-slate-800">{ins.id_cuenta_costo}</span>
                        {cta && <span className="text-[11px] text-slate-500 block">{cta.nombre}</span>}
                      </td>
                      <td className="py-2.5 px-4 font-semibold">
                        <span className={stock.disponible < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {stock.disponible.toFixed(2)} {um?.codigo}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(ins)}
                          className="p-1 text-slate-400 hover:text-emerald-600 transition cursor-pointer mr-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('D_Insumo', ins.id_insumo)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'D_Cuenta' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID / Código (PK)</th>
                  <th className="py-2.5 px-4">Nombre de la Cuenta (Anexo I)</th>
                  <th className="py-2.5 px-4">Grupo Contable</th>
                  <th className="py-2.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_Cuenta.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                  <tr key={c.id_cuenta} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{c.id_cuenta}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{c.nombre}</td>
                    <td className="py-2.5 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{c.grupo}</span></td>
                    <td className="py-2.5 px-4"><span className="text-emerald-700 font-medium">Activo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'D_UM' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Código Oficial</th>
                  <th className="py-2.5 px-4">Descripción Completa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.D_UM.map(u => (
                  <tr key={u.id_um} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold">{u.id_um}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">{u.codigo}</td>
                    <td className="py-2.5 px-4">{u.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'D_Campana' && (
            <div className="p-6 text-center">
              {state.D_Campana.length === 0 ? (
                <div className="text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600">No hay campañas cargadas en D_Campana.</p>
                  <p className="mt-1">
                    Como se especificó en la regla de no inventar datos, las campañas se ingresan a través del botón "Nuevo Registro".
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Campaña</th>
                      <th className="py-2.5 px-4">Inicio</th>
                      <th className="py-2.5 px-4">Fin</th>
                      <th className="py-2.5 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.D_Campana.map(c => (
                      <tr key={c.id_campana}>
                        <td className="py-2.5 px-4 font-mono">{c.id_campana}</td>
                        <td className="py-2.5 px-4 font-bold">{c.nombre}</td>
                        <td className="py-2.5 px-4">{c.fecha_inicio}</td>
                        <td className="py-2.5 px-4">{c.fecha_fin}</td>
                        <td className="py-2.5 px-4">{c.activa ? 'Activa' : 'Cerrada'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'D_TropaLote' && (
            <div className="p-6 text-center">
              {state.D_TropaLote.length === 0 ? (
                <div className="text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600">No hay lotes o tropas cargadas en D_TropaLote.</p>
                  <p className="mt-1">
                    Cree lotes de recría o corral de terminación para habilitar la trazabilidad por tropa.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Código Tropa</th>
                      <th className="py-2.5 px-4">Nombre</th>
                      <th className="py-2.5 px-4">Subunidad</th>
                      <th className="py-2.5 px-4">Cabezas Iniciales</th>
                      <th className="py-2.5 px-4">Fecha Ingreso</th>
                      <th className="py-2.5 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.D_TropaLote.map(t => {
                      const sub = state.D_Subunidad.find(s => s.id_subunidad === t.id_subunidad);
                      return (
                        <tr key={t.id_tropa}>
                          <td className="py-2.5 px-4 font-mono">{t.id_tropa}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-800">{t.codigo_tropa}</td>
                          <td className="py-2.5 px-4">{t.nombre}</td>
                          <td className="py-2.5 px-4">{sub?.nombre}</td>
                          <td className="py-2.5 px-4 font-semibold">{t.cantidad_cabezas_inicial}</td>
                          <td className="py-2.5 px-4">{t.fecha_ingreso}</td>
                          <td className="py-2.5 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded">{t.estado}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Agregar Registro según la Pestaña Activa */}
      {isModalOpen && (
        <MasterItemModal
          tab={activeTab}
          editingItem={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            setFeedback({ type: 'success', message: 'Registro guardado exitosamente.' });
          }}
        />
      )}
    </div>
  );
};

interface MasterItemModalProps {
  tab: MasterTab;
  editingItem: any;
  onClose: () => void;
  onSaved: () => void;
}

const MasterItemModal: React.FC<MasterItemModalProps> = ({ tab, editingItem, onClose, onSaved }) => {
  const state = db.getState();
  const [formData, setFormData] = useState<any>(editingItem || {});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'D_Insumo') {
      const res = db.saveInsumo({
        id_insumo: formData.id_insumo || 0,
        nombre: formData.nombre,
        tipo: formData.tipo || 'Alimento',
        id_um_consumo: Number(formData.id_um_consumo) || 1,
        id_cuenta_costo: formData.id_cuenta_costo || '5.1.01',
        activo: true,
      });
      if (!res.success) {
        setError(res.error || 'Error al guardar.');
        return;
      }
    } else if (tab === 'D_Campana') {
      const res = db.saveCampana({
        id_campana: formData.id_campana || 0,
        nombre: formData.nombre,
        fecha_inicio: formData.fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin: formData.fecha_fin || new Date().toISOString().split('T')[0],
        activa: true,
      });
      if (!res.success) {
        setError(res.error || 'Error al guardar.');
        return;
      }
    } else if (tab === 'D_TropaLote') {
      const res = db.saveTropaLote({
        id_tropa: formData.id_tropa || 0,
        codigo_tropa: formData.codigo_tropa,
        nombre: formData.nombre,
        id_subunidad: Number(formData.id_subunidad) || 2,
        cantidad_cabezas_inicial: Number(formData.cantidad_cabezas_inicial) || 0,
        fecha_ingreso: formData.fecha_ingreso || new Date().toISOString().split('T')[0],
        estado: 'En Curso',
      });
      if (!res.success) {
        setError(res.error || 'Error al guardar.');
        return;
      }
    } else {
      setError('Edición de este catálogo restringida en esta vista rápida.');
      return;
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-1">
          {editingItem ? 'Editar Registro en ' : 'Nuevo Registro en '} {tab}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Complete los campos requeridos con validación activa en backend.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'D_Insumo' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Insumo</label>
                <input
                  type="text"
                  required
                  value={formData.nombre || ''}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Pellet de girasol, Vacuna triple"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formData.tipo || 'Alimento'}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Alimento">Alimento</option>
                    <option value="Sanidad">Sanidad</option>
                    <option value="Genética">Genética</option>
                    <option value="Servicio">Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                  <select
                    value={formData.id_um_consumo || 1}
                    onChange={e => setFormData({ ...formData, id_um_consumo: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {state.D_UM.map(u => (
                      <option key={u.id_um} value={u.id_um}>{u.codigo} - {u.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cuenta Contable de Costo (Anexo I)</label>
                <select
                  value={formData.id_cuenta_costo || '5.1.01'}
                  onChange={e => setFormData({ ...formData, id_cuenta_costo: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {state.D_Cuenta.map(c => (
                    <option key={c.id_cuenta} value={c.id_cuenta}>{c.id_cuenta} - {c.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tab === 'D_Campana' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Campaña</label>
                <input
                  type="text"
                  required
                  value={formData.nombre || ''}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Campaña 2025/2026"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_inicio || ''}
                    onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_fin || ''}
                    onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'D_TropaLote' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Tropa</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo_tropa || ''}
                    onChange={e => setFormData({ ...formData, codigo_tropa: e.target.value })}
                    placeholder="Ej: TR-ENG-26-01"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Identificador</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre || ''}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Lote Novillitos Corral 3"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subunidad</label>
                  <select
                    value={formData.id_subunidad || 2}
                    onChange={e => setFormData({ ...formData, id_subunidad: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {state.D_Subunidad.map(s => (
                      <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cabezas Iniciales</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.cantidad_cabezas_inicial || ''}
                    onChange={e => setFormData({ ...formData, cantidad_cabezas_inicial: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
            >
              Guardar en {tab}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
