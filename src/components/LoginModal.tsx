/**
 * @license
 * Establecimiento: Pozo del Carril
 * Pantalla de Inicio de Sesión y Autenticación Segura (S_Usuarios)
 * Sincronización activa con Google Sheets y validación en backend
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Shield,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Key,
  HelpCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { db } from '../services/dbEngine';

interface LoginModalProps {
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google Sheets Config on Login Screen
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<
    { usuario: string; nombre: string; rol: string; activo: boolean }[]
  >([]);

  // On mount: cargar configuración guardada (local y backend) y sincronizar usuarios de inmediato
  useEffect(() => {
    const localCfg = db.getSheetsConfig();
    let currentWebhook = localCfg.webhookUrl || '';
    let currentSheet = localCfg.spreadsheetUrl || '';

    setWebhookUrl(currentWebhook);
    setSpreadsheetUrl(currentSheet);
    updateAvailableUsersList();

    // Consultar configuración del servidor backend para sincronizar
    fetch('/api/sheets/config')
      .then(res => res.json())
      .then(serverCfg => {
        const effectiveWebhook = currentWebhook || serverCfg.webhookUrl || '';
        const effectiveSheet = currentSheet || serverCfg.spreadsheetUrl || '';

        if (effectiveWebhook !== currentWebhook || effectiveSheet !== currentSheet) {
          setWebhookUrl(effectiveWebhook);
          setSpreadsheetUrl(effectiveSheet);
          db.saveSheetsConfig({
            webhookUrl: effectiveWebhook,
            spreadsheetUrl: effectiveSheet,
            spreadsheetId: serverCfg.spreadsheetId || '',
          });
        }

        // Si hay una URL configurada, sincronizar usuarios de inmediato en el arranque
        if (effectiveWebhook || effectiveSheet) {
          handleSyncUsers(effectiveWebhook, effectiveSheet, false);
        } else if (Array.isArray(serverCfg.users) && serverCfg.users.length > 0) {
          db.syncUsersFromGoogleSheets(serverCfg.users);
          setAvailableUsers(serverCfg.users);
        }
      })
      .catch(() => {
        if (currentWebhook || currentSheet) {
          handleSyncUsers(currentWebhook, currentSheet, false);
        }
      });
  }, []);

  const updateAvailableUsersList = () => {
    const state = db.getState();
    const userObjs = state.S_Usuarios.map(u => ({
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
    }));
    setAvailableUsers(userObjs);
  };

  const handleSyncUsers = async (
    targetWeb = webhookUrl,
    targetSheet = spreadsheetUrl,
    showFeedback = true
  ) => {
    setIsSyncingSheets(true);
    setSyncFeedback(null);
    setErrorMsg(null);

    const cleanWeb = (targetWeb || '').trim();
    const cleanSheet = (targetSheet || '').trim();

    // Guardar configuración actualizada en el motor
    db.saveSheetsConfig({
      webhookUrl: cleanWeb,
      spreadsheetUrl: cleanSheet,
      spreadsheetId: '',
      lastSync: new Date().toISOString(),
    });

    try {
      // Solicitar al backend que lea la tabla S_Usuarios directamente de Google Sheets
      const res = await fetch('/api/sheets/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: cleanWeb,
          spreadsheetUrl: cleanSheet,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        db.syncUsersFromGoogleSheets(data.users);
        setAvailableUsers(data.users);

        if (showFeedback) {
          const actCount = data.users.filter((u: any) => u.activo).length;
          setSyncFeedback(
            `¡Sincronización exitosa! Se reconocieron ${data.count} usuarios en S_Usuarios (${actCount} activos).`
          );
        }
      } else {
        updateAvailableUsersList();
        if (showFeedback) {
          setSyncFeedback(
            data.warning ||
              data.error ||
              'No se pudo leer la hoja S_Usuarios. Verifique que la planilla esté compartida con acceso de lectura o use el Webhook.'
          );
        }
      }
    } catch (err: any) {
      updateAvailableUsersList();
      if (showFeedback) {
        setSyncFeedback(
          'Error de red al consultar Google Sheets. Verifique la conexión o ingrese la URL del Webhook.'
        );
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = usuario.trim();
    const cleanPass = contrasena.trim();

    if (!cleanUser) {
      setErrorMsg('Por favor ingrese su nombre de usuario.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Por favor ingrese su contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      // Validación en backend (la contraseña se verifica en el servidor y nunca se expone al navegador)
      const res = await db.loginAsync(cleanUser, cleanPass);
      setIsLoading(false);

      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Credenciales no válidas.');
        // Si el usuario no fue encontrado, abrir automáticamente el asistente de sincronización
        if (res.error?.includes('no existe') || res.error?.includes('inexistente')) {
          setShowSheetsConfig(true);
        }
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Error al verificar credenciales con el servidor.');
    }
  };

  const handleQuickDemo = (user: string, pass: string) => {
    setUsuario(user);
    setContrasena(pass);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
        {/* Header Decorator */}
        <div className="bg-linear-to-r from-emerald-800 to-slate-900 p-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center backdrop-blur-xs">
            <Shield className="w-7 h-7 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Establecimiento Pozo del Carril</h2>
          <p className="text-xs text-emerald-300 mt-1 font-medium">
            Activos con cuatro patas — ERP Ganadero Bovino
          </p>
          <div className="text-[11px] text-slate-300 mt-2 bg-slate-800/60 inline-block px-3 py-1 rounded-full border border-slate-700">
            Control de Gestión & Contabilidad Pecuaria
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Ingreso al Sistema</h3>
            <p className="text-xs text-slate-500">
              Validación segura en backend conectada a la tabla <strong className="text-slate-700">S_Usuarios</strong> de Google Sheets.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-800 animate-shake">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Error de autenticación: </span>
                  {errorMsg}
                </div>
              </div>

              {errorMsg.includes('no existe') && (
                <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-[11px] text-slate-700 flex items-center justify-between gap-2 mt-1">
                  <span>¿Agregaste este usuario recién en Google Sheets?</span>
                  <button
                    type="button"
                    onClick={() => handleSyncUsers(webhookUrl, spreadsheetUrl, true)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[10px] shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sincronizar Ahora</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  placeholder="Ej: admin, operador, santigare0"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 mt-1"
            >
              {isLoading ? 'Validando con Google Sheets y Backend...' : 'Ingresar al ERP'}
            </button>
          </form>

          {/* Collapsible Google Sheets Connection Assistant */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={() => setShowSheetsConfig(!showSheetsConfig)}
              className="w-full p-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>¿Agregaste un usuario nuevo en Google Sheets?</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                {availableUsers.length} detectados
                {showSheetsConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showSheetsConfig && (
              <div className="p-3.5 border-t border-slate-200 bg-white space-y-3 text-xs">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Para vincular los usuarios agregados en la hoja <strong>S_Usuarios</strong>, indique el enlace de su planilla o la URL de la aplicación web Apps Script y presione sincronizar:
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      URL de la Planilla Google Sheets o Webhook:
                    </label>
                    <input
                      type="text"
                      value={webhookUrl || spreadsheetUrl}
                      onChange={e => {
                        const val = e.target.value.trim();
                        if (val.includes('/exec')) {
                          setWebhookUrl(val);
                        } else {
                          setSpreadsheetUrl(val);
                        }
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/... o https://script.google.com/..."
                      className="w-full p-2 text-[11px] font-mono rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSyncingSheets}
                    onClick={() => handleSyncUsers(webhookUrl, spreadsheetUrl, true)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Leyendo S_Usuarios en Google Sheets...' : 'Sincronizar Usuarios de la Planilla Ahora'}</span>
                  </button>
                </div>

                {syncFeedback && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                      syncFeedback.includes('¡Sincronización exitosa!')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {syncFeedback.includes('¡Sincronización exitosa!') && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{syncFeedback}</span>
                  </div>
                )}

                {/* Available Users Badge List */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Usuarios disponibles en el sistema ({availableUsers.length}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSyncUsers(webhookUrl, spreadsheetUrl, true)}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Refrescar
                    </button>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {availableUsers.map((u, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setUsuario(u.usuario);
                          setErrorMsg(null);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between cursor-pointer transition ${
                          usuario.toLowerCase() === u.usuario.toLowerCase()
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Haga clic para autocompletar usuario"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{u.usuario}</span>
                          <span className="text-slate-400 text-[10px]">({u.nombre})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {u.rol}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              u.activo ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={u.activo ? 'Usuario Activo' : 'Usuario Inactivo'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2">
                    💡 <strong>Tip:</strong> Si agregaste un usuario en Google Sheets, asegúrate de que la hoja se llame exactamente <code className="text-slate-700">S_Usuarios</code> y que la columna <code className="text-slate-700">activo</code> diga <code className="text-slate-700">VERDADERO</code> o esté en blanco.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Access Helper for demo users */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Usuarios precargados de prueba:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'admin2026')}
                className="py-1.5 px-1 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-md text-[11px] text-slate-700 transition cursor-pointer text-center"
              >
                <div className="font-bold text-emerald-800">Admin</div>
                <div className="text-[10px] text-slate-400 truncate">admin / admin2026</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('operador', 'campo2026')}
                className="py-1.5 px-1 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-md text-[11px] text-slate-700 transition cursor-pointer text-center"
              >
                <div className="font-bold text-slate-800">Operador</div>
                <div className="text-[10px] text-slate-400 truncate">operador / campo2026</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('auditor', 'auditor2026')}
                className="py-1.5 px-1 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-md text-[11px] text-slate-700 transition cursor-pointer text-center"
              >
                <div className="font-bold text-slate-800">Auditor</div>
                <div className="text-[10px] text-slate-400 truncate">auditor / auditor2026</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 text-[11px] text-slate-500 text-center flex items-center justify-between">
          <span>Establecimiento Pozo del Carril</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Conexión Google Sheets Activa
          </span>
        </div>
      </div>
    </div>
  );
};
