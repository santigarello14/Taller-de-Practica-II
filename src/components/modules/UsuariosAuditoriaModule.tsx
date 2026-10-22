/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 14: Gestión de Usuarios (S_Usuarios) y Registro Inmutable de Auditoría (S_Auditoria)
 * Permite agregar, editar y modificar usuarios y contraseñas con impacto inmediato en el login
 */

import React, { useState } from 'react';
import {
  Users,
  History,
  Plus,
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  Edit2,
  Lock,
  User,
  Key,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { S_Usuarios, RolUsuario } from '../../types/database';
import { getGoogleAccessToken, saveUserToSheetsApi } from '../../services/googleAuth';

export const UsuariosAuditoriaModule: React.FC<{
  currentUserRole: RolUsuario;
}> = ({ currentUserRole }) => {
  const state = db.getState();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria'>('usuarios');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<S_Usuarios | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  const isAdmin = currentUserRole === 'Administrador';

  const auditLogs = state.S_Auditoria.filter(a => {
    const q = auditSearch.toLowerCase();
    return (
      a.usuario.toLowerCase().includes(q) ||
      a.tabla_afectada.toLowerCase().includes(q) ||
      a.accion.toLowerCase().includes(q) ||
      (a.detalle && a.detalle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Seguridad, Usuarios y Trazabilidad de Auditoría (S_)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gestión completa de cuentas y contraseñas con impacto inmediato en el inicio de sesión.
          </p>
        </div>

        {isAdmin && activeTab === 'usuarios' && (
          <button
            onClick={() => {
              setEditingUser(null);
              setIsUserModalOpen(true);
              setFeedback(null);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Usuario de Sistema</span>
          </button>
        )}
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
          onClick={() => setActiveTab('usuarios')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cuentas de Usuarios (S_Usuarios)</span>
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-2.5 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'auditoria'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Bitácora de Auditoría (S_Auditoria)</span>
        </button>
      </div>

      {/* TAB 1: S_Usuarios */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Cualquier cambio guardado aquí o en Google Sheets se actualiza <strong>en tiempo real en el backend</strong>.
            </span>
            <span>{state.S_Usuarios.length} usuarios registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID (PK)</th>
                  <th className="py-2.5 px-4">Nombre Completo</th>
                  <th className="py-2.5 px-4">Usuario (Login)</th>
                  <th className="py-2.5 px-4">Rol Asignado</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {state.S_Usuarios.map(u => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold">{u.id_usuario}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-800 font-bold">{u.usuario}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                        u.rol === 'Administrador'
                          ? 'bg-purple-100 text-purple-800'
                          : u.rol === 'Operador'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setIsUserModalOpen(true);
                              setFeedback(null);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                          >
                            Editar
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => {
                              const res = db.saveUsuario({ ...u, activo: !u.activo });
                              if (res.success) {
                                setFeedback({
                                  type: 'success',
                                  message: `Usuario ${u.usuario} ${!u.activo ? 'activado' : 'desactivado'}.`,
                                });
                              }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            {u.activo ? 'Inhabilitar' : 'Habilitar'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: S_Auditoria */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por usuario, tabla o acción..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500">{auditLogs.length} eventos auditados</span>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay registros de auditoría aún.</p>
                <p className="mt-1">
                  Cada alta, modificación o baja realizada en el ERP queda asentada automáticamente en S_Auditoria.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Fecha y Hora</th>
                    <th className="py-2.5 px-4">Usuario</th>
                    <th className="py-2.5 px-4">Tabla Afectada</th>
                    <th className="py-2.5 px-4">Acción</th>
                    <th className="py-2.5 px-4">ID Registro</th>
                    <th className="py-2.5 px-4">Detalle de la Operación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(a.fecha_hora).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{a.usuario}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-emerald-800">{a.tabla_afectada}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.accion === 'ALTA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.accion === 'BAJA'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {a.accion}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">{a.id_registro}</td>
                      <td className="py-2.5 px-4 text-slate-600">{a.detalle || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Nuevo o Edición de Usuario */}
      {isUserModalOpen && (
        <ModalUsuario
          initialUser={editingUser}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSaved={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
            setFeedback({
              type: 'success',
              message: editingUser
                ? `Usuario ${editingUser.usuario} actualizado con éxito.`
                : 'Nuevo usuario registrado exitosamente en S_Usuarios.',
            });
          }}
        />
      )}
    </div>
  );
};

const ModalUsuario: React.FC<{
  initialUser: S_Usuarios | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ initialUser, onClose, onSaved }) => {
  const [nombre, setNombre] = useState(initialUser ? initialUser.nombre : '');
  const [usuario, setUsuario] = useState(initialUser ? initialUser.usuario : '');
  const [contrasena, setContrasena] = useState(initialUser ? initialUser.contrasena : '');
  const [rol, setRol] = useState<RolUsuario>(initialUser ? initialUser.rol : 'Operador');
  const [activo, setActivo] = useState<boolean>(initialUser ? initialUser.activo : true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !nombre.trim() || (!initialUser && !contrasena.trim())) {
      setError('Por favor complete los campos obligatorios.');
      return;
    }

    const cleanUser = usuario.trim();
    const cleanPass = contrasena.trim();
    const cleanName = nombre.trim();

    const recordToSave = {
      id_usuario: initialUser ? initialUser.id_usuario : 0,
      nombre: cleanName,
      usuario: cleanUser,
      contrasena: cleanPass,
      rol,
      activo,
    };

    // 1. Guardar en motor de datos local
    const res = db.saveUsuario(recordToSave);
    if (!res.success) {
      setError(res.error || 'Error al guardar.');
      return;
    }

    // 2. Impacto directo en Google Sheets API si hay sesión de Google activa
    try {
      const token = await getGoogleAccessToken();
      const cfg = db.getSheetsConfig();
      const sheetId = cfg.spreadsheetId || (cfg.spreadsheetUrl ? cfg.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] : '');

      if (token && sheetId) {
        await saveUserToSheetsApi(sheetId, {
          id_usuario: recordToSave.id_usuario || 1,
          usuario: cleanUser,
          contrasena: cleanPass,
          nombre: cleanName,
          rol,
          activo,
        });
      }

      // 3. Notificar al backend con permisos de Administrador
      await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'Administrador',
        },
        body: JSON.stringify({
          ...recordToSave,
          adminRole: 'Administrador',
          googleAccessToken: token || undefined,
          spreadsheetUrl: cfg.spreadsheetUrl,
          webhookUrl: cfg.webhookUrl,
        }),
      });
    } catch (syncErr) {
      console.warn('[Sync warning]:', syncErr);
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <h4 className="text-base font-bold text-slate-800 mb-1">
          {initialUser ? `Modificar Usuario: ${initialUser.usuario}` : 'Nuevo Usuario (S_Usuarios)'}
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Los cambios impactan directamente en el inicio de sesión del ERP y se sincronizan con Google Sheets.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nombre y Apellido</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Usuario de Acceso</label>
              <input
                type="text"
                required
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Ej: jperez"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contraseña {initialUser && '(Dejar igual o cambiar)'}
              </label>
              <input
                type="text"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rol y Permisos</label>
              <select
                value={rol}
                onChange={e => setRol(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Administrador">Administrador</option>
                <option value="Operador">Operador</option>
                <option value="Consulta">Consulta</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado de la Cuenta</label>
              <select
                value={activo ? 'true' : 'false'}
                onChange={e => setActivo(e.target.value === 'true')}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="true">Activo (Habilitado)</option>
                <option value="false">Inactivo (Bloqueado)</option>
              </select>
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
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
            >
              {initialUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
