/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 3: Hacienda Individual y Plantel Reproductor (Cabaña Angus)
 * Trazabilidad individual por Caravana Visual y Caravana Electrónica (RFID)
 * Árbol Genealógico (Padre/Madre) y Propuesta de Indicadores Reproductivos
 */

import React, { useState } from 'react';
import {
  Tag,
  Search,
  Plus,
  GitFork,
  Scale,
  ShieldAlert,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { D_HaciendaIndividual } from '../../types/database';

export const HaciendaIndividualModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState<D_HaciendaIndividual | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const state = db.getState();

  const filteredAnimals = state.D_HaciendaIndividual.filter(animal => {
    const q = searchTerm.trim().toLowerCase();
    return (
      animal.caravana_visual.toLowerCase().includes(q) ||
      animal.caravana_rfid.toLowerCase().includes(q) ||
      animal.raza.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Trazabilidad Individual de Reproductores y Cabaña
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              RFID & Visual
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión genealógica, control de pesadas individuales, legajo clínico e historial biológico completo.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedAnimal(null);
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dar de Alta Reproductor</span>
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

      {/* Main Grid: Search & Table on Left, Pedigree & History Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Animals */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por Caravana Visual o RFID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {filteredAnimals.length} animales
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {filteredAnimals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay animales registrados aún.</p>
                <p className="mt-1">
                  Haga clic en "Dar de Alta Reproductor" para ingresar caravanas visuales y electrónicas.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Visual</th>
                    <th className="py-2.5 px-3">RFID Electrónica</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Sexo</th>
                    <th className="py-2.5 px-3">Subunidad</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAnimals.map(animal => {
                    const cat = state.D_CategoriaHacienda.find(c => c.id_categoria === animal.id_categoria_actual);
                    const sub = state.D_Subunidad.find(s => s.id_subunidad === animal.id_subunidad_actual);
                    const isSelected = selectedAnimal?.id_hacienda === animal.id_hacienda;

                    return (
                      <tr
                        key={animal.id_hacienda}
                        onClick={() => setSelectedAnimal(animal)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/80 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{animal.caravana_visual}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{animal.caravana_rfid}</td>
                        <td className="py-2.5 px-3">{cat?.nombre}</td>
                        <td className="py-2.5 px-3">{animal.sexo}</td>
                        <td className="py-2.5 px-3">{sub?.nombre}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              animal.estado_actual === 'Activo'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {animal.estado_actual}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedAnimal(animal);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]"
                          >
                            Ver Ficha →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Animal File, Pedigree & History */}
        <div className="lg:col-span-5 space-y-4">
          {selectedAnimal ? (
            <AnimalDetailCard animal={selectedAnimal} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
              <GitFork className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-sm">Ficha Genealógica y Clínica</p>
              <p className="mt-1 max-w-xs mx-auto">
                Seleccione un animal del listado izquierdo para ver su árbol genealógico (Padre/Madre), pesadas registradas y tratamientos sanitarios.
              </p>
            </div>
          )}

          {/* Propuesta de Indicadores Reproductivos (Requisito Sección 9.3) */}
          <div className="bg-amber-50/70 rounded-xl border border-amber-200/80 p-4 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Propuesta: Indicadores de Eficiencia Reproductiva</span>
            </div>
            <p className="text-amber-800 leading-relaxed mb-2.5">
              Conforme a la regla de no inventar fórmulas no especificadas, la estructura queda lista en <code>D_HaciendaIndividual</code>. Con los datos capturados se pueden activar:
            </p>
            <ul className="space-y-1 text-slate-700 list-disc list-inside">
              <li><strong>Porcentaje de Preñez (%):</strong> (Vientres Preñados / Vientres en Servicio) × 100.</li>
              <li><strong>Porcentaje de Destete (%):</strong> (Terneros Destetados / Vientres Entorados) × 100.</li>
              <li><strong>Intervalo Entre Partos (IEP):</strong> Días promedio entre nacimientos de una misma madre.</li>
              <li><strong>Kilos de Ternero por Vaca Entorada:</strong> Kg totales de destete / Vientres totales.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Alta de Reproductor */}
      {isModalOpen && (
        <AnimalFormModal
          onClose={() => setIsModalOpen(false)}
          onSaved={(newAnimal) => {
            setIsModalOpen(false);
            setSelectedAnimal(newAnimal);
            setFeedback({ type: 'success', message: 'Reproductor registrado con éxito en D_HaciendaIndividual.' });
          }}
        />
      )}
    </div>
  );
};

const AnimalDetailCard: React.FC<{ animal: D_HaciendaIndividual }> = ({ animal }) => {
  const state = db.getState();
  const padre = state.D_HaciendaIndividual.find(h => h.id_hacienda === animal.id_padre);
  const madre = state.D_HaciendaIndividual.find(h => h.id_hacienda === animal.id_madre);
  const cat = state.D_CategoriaHacienda.find(c => c.id_categoria === animal.id_categoria_actual);
  const sub = state.D_Subunidad.find(s => s.id_subunidad === animal.id_subunidad_actual);

  // Pesadas del animal
  const pesadas = state.F_PesadasControl.filter(p => p.id_hacienda === animal.id_hacienda);
  // Sanidad del animal
  const sanidad = state.F_SanidadReal.filter(s => s.id_hacienda === animal.id_hacienda);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Card */}
      <div className="bg-slate-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Ficha de Cabaña</div>
            <h4 className="text-lg font-bold">Caravana {animal.caravana_visual}</h4>
          </div>
          <span className="font-mono text-xs bg-slate-800 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
            RFID: {animal.caravana_rfid}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
          <span>Raza: <strong>{animal.raza}</strong></span>
          <span>•</span>
          <span>Sexo: <strong>{animal.sexo}</strong></span>
          <span>•</span>
          <span>Categoría: <strong>{cat?.nombre}</strong></span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Árbol Genealógico (Pedigree) */}
        <div>
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-emerald-600" />
            <span>Genealogía (Árbol Padre / Madre)</span>
          </h5>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Padre (Toro)</div>
              {padre ? (
                <div className="font-semibold text-slate-800 mt-1">
                  Caravana: {padre.caravana_visual}
                  <span className="text-[11px] block text-slate-500 font-normal">{padre.raza}</span>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-1">No registrado</div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Madre (Vaca)</div>
              {madre ? (
                <div className="font-semibold text-slate-800 mt-1">
                  Caravana: {madre.caravana_visual}
                  <span className="text-[11px] block text-slate-500 font-normal">{madre.raza}</span>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-1">No registrada</div>
              )}
            </div>
          </div>
        </div>

        {/* Historial de Pesadas Individuales */}
        <div>
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>Historial de Balanza ({pesadas.length} pesadas)</span>
          </h5>
          {pesadas.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sin registros de pesada en F_PesadasControl.</p>
          ) : (
            <div className="space-y-1.5">
              {pesadas.map(p => (
                <div key={p.id_pesada} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">{p.fecha}</span>
                  <span className="font-bold text-slate-800">{p.peso_vivo_kg} kg</span>
                  {p.adpv_registrado_kg_dia && (
                    <span className="text-emerald-700 font-medium">ADPV: {p.adpv_registrado_kg_dia} kg/d</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial de Sanidad */}
        <div>
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            <span>Historial Clínico / Sanitario ({sanidad.length})</span>
          </h5>
          {sanidad.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sin intervenciones sanitarias registradas en F_SanidadReal.</p>
          ) : (
            <div className="space-y-1.5">
              {sanidad.map(s => {
                const ins = state.D_Insumo.find(i => i.id_insumo === s.id_insumo);
                return (
                  <div key={s.id_sanidad} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800">{ins?.nombre}</span>
                      <span className="text-[10px] text-slate-500 block">{s.fecha} - {s.acta_vacunacion_senasa || 'Sin acta'}</span>
                    </div>
                    <span className="font-bold text-purple-700">{s.dosis_real_total} dosis</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AnimalFormModal: React.FC<{
  onClose: () => void;
  onSaved: (animal: D_HaciendaIndividual) => void;
}> = ({ onClose, onSaved }) => {
  const state = db.getState();
  const [visual, setVisual] = useState('');
  const [rfid, setRfid] = useState('');
  const [sexo, setSexo] = useState<'Macho' | 'Hembra'>('Hembra');
  const [raza, setRaza] = useState('Angus Negro');
  const [categoria, setCategoria] = useState(1);
  const [subunidad, setSubunidad] = useState(1);
  const [idPadre, setIdPadre] = useState<number | ''>('');
  const [idMadre, setIdMadre] = useState<number | ''>('');
  const [pesoNacer, setPesoNacer] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const torosDisponibles = state.D_HaciendaIndividual.filter(
    h => h.sexo === 'Macho' && h.estado_actual === 'Activo'
  );
  const vacasDisponibles = state.D_HaciendaIndividual.filter(
    h => h.sexo === 'Hembra' && h.estado_actual === 'Activo'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const animal: D_HaciendaIndividual = {
      id_hacienda: 0,
      caravana_visual: visual.trim(),
      caravana_rfid: rfid.trim(),
      sexo,
      raza,
      id_categoria_actual: Number(categoria),
      id_subunidad_actual: Number(subunidad),
      id_padre: idPadre ? Number(idPadre) : null,
      id_madre: idMadre ? Number(idMadre) : null,
      peso_al_nacer_kg: pesoNacer ? Number(pesoNacer) : undefined,
      estado_actual: 'Activo',
    };

    const res = db.saveHaciendaIndividual(animal);
    if (!res.success) {
      setError(res.error || 'Error al guardar el animal.');
      return;
    }

    const saved = db.getState().D_HaciendaIndividual.find(
      h => h.caravana_visual.toUpperCase() === visual.trim().toUpperCase()
    );
    if (saved) onSaved(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-1">Alta de Reproductor Individual (D_HaciendaIndividual)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Identificación unívoca por Caravana Visual y Chip RFID (Regla 4: UNIQUE independiente).
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Caravana Visual *</label>
              <input
                type="text"
                required
                value={visual}
                onChange={e => setVisual(e.target.value)}
                placeholder="Ej: AR-0145"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Caravana RFID (Electrónica) *</label>
              <input
                type="text"
                required
                value={rfid}
                onChange={e => setRfid(e.target.value)}
                placeholder="Ej: 982000412345678"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
              <select
                value={sexo}
                onChange={e => setSexo(e.target.value as any)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Hembra">Hembra</option>
                <option value="Macho">Macho</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Raza</label>
              <input
                type="text"
                value={raza}
                onChange={e => setRaza(e.target.value)}
                placeholder="Ej: Angus Colorado"
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Peso al nacer (kg)</label>
              <input
                type="number"
                step="0.1"
                value={pesoNacer}
                onChange={e => setPesoNacer(e.target.value)}
                placeholder="Ej: 36.5"
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría Inicial</label>
              <select
                value={categoria}
                onChange={e => setCategoria(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_CategoriaHacienda.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subunidad Inicial</label>
              <select
                value={subunidad}
                onChange={e => setSubunidad(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                {state.D_Subunidad.map(s => (
                  <option key={s.id_subunidad} value={s.id_subunidad}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Genealogía */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Padre (Toro del Maestro)</label>
              <select
                value={idPadre}
                onChange={e => setIdPadre(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Sin Padre Registrado</option>
                {torosDisponibles.map(t => (
                  <option key={t.id_hacienda} value={t.id_hacienda}>
                    {t.caravana_visual} ({t.raza})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Madre (Vaca del Maestro)</label>
              <select
                value={idMadre}
                onChange={e => setIdMadre(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Sin Madre Registrada</option>
                {vacasDisponibles.map(v => (
                  <option key={v.id_hacienda} value={v.id_hacienda}>
                    {v.caravana_visual} ({v.raza})
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              Guardar Reproductor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
