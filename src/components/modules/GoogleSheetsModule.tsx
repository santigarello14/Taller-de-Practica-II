/**
 * @license
 * Establecimiento: Pozo del Carril
 * Módulo 13: Centro de Conexión, Guía Paso a Paso y Sincronización Google Sheets
 * Base de Datos Única del ERP - Integración con Google Sheets API y S_Usuarios
 * Sección "Agregar Usuarios" con impacto bidireccional y control estricto de rol Administrador
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle2,
  ExternalLink,
  Code2,
  RefreshCw,
  Key,
  Shield,
  HelpCircle,
  Database,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Users,
  AlertTriangle,
  Info,
  ArrowRight,
  ShieldAlert,
  LogIn,
  LogOut,
  Plus,
  UserPlus,
  Lock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../../services/dbEngine';
import { RolUsuario } from '../../types/database';
import { APPS_SCRIPT_MASTER_CODE } from '../../services/googleAppsScriptTemplate';
import {
  signInWithGoogle,
  signOutGoogle,
  initGoogleAuth,
  getGoogleUser,
  getGoogleAccessToken,
  fetchUsersViaSheetsApi,
  saveUserToSheetsApi,
  createOfficialSpreadsheetViaApi,
} from '../../services/googleAuth';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleSheetsModuleProps {
  currentUserRole?: RolUsuario;
}

export const GoogleSheetsModule: React.FC<GoogleSheetsModuleProps> = ({ currentUserRole }) => {
  const initialCfg = db.getSheetsConfig();
  const currentRole: RolUsuario = currentUserRole || db.getCurrentUser()?.rol || 'Operador';
  const isAdmin = currentRole === 'Administrador';

  const [copiedScript, setCopiedScript] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(initialCfg.spreadsheetUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(initialCfg.webhookUrl || '');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'usuarios' | 'esquema'>('setup');

  // Google OAuth User State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(getGoogleUser());
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleActionMessage, setGoogleActionMessage] = useState<string | null>(null);

  // Diagnostic state for S_Usuarios
  const [isDiagnosingUsers, setIsDiagnosingUsers] = useState(false);
  const [diagnosedUsers, setDiagnosedUsers] = useState<any[]>([]);
  const [diagnoseSource, setDiagnoseSource] = useState<string>('');
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  // Formulario "Agregar Usuarios" con impacto bidireccional
  const [formNombre, setFormNombre] = useState('');
  const [formUsuario, setFormUsuario] = useState('');
  const [formContrasena, setFormContrasena] = useState('');
  const [formRol, setFormRol] = useState<RolUsuario>('Operador');
  const [formActivo, setFormActivo] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSaveFeedback, setUserSaveFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    detail?: string;
  } | null>(null);

  const [isSyncingAllTables, setIsSyncingAllTables] = useState(false);
  const [allTablesSyncResult, setAllTablesSyncResult] = useState<{
    success: boolean;
    message: string;
    rowCounts?: Record<string, number>;
  } | null>(null);

  const handleSyncAll20Tables = async () => {
    setIsSyncingAllTables(true);
    setAllTablesSyncResult(null);

    try {
      const res = await db.fetchAndSyncAllTables(webhookUrl);
      setAllTablesSyncResult({
        success: res.success,
        message: res.message || res.error || '',
        rowCounts: res.rowCounts,
      });
      if (res.success) {
        setConnectionStatus('success');
        setStatusMessage(`¡Sincronización exitosa! Se consumieron las 20 tablas mediante doGet.`);
      } else {
        setConnectionStatus('error');
        setStatusMessage(res.error || 'Error al sincronizar tablas.');
      }
    } catch (err: any) {
      setAllTablesSyncResult({
        success: false,
        message: `Fallo al consumir Web App: ${err.message}`,
      });
      setConnectionStatus('error');
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSyncingAllTables(false);
    }
  };

  const guides = db.generateGoogleSheetsSchemaGuide();

  // Cargar usuarios y listener de Google Auth al montar
  useEffect(() => {
    const state = db.getState();
    setDiagnosedUsers(state.S_Usuarios);

    const unsubscribe = initGoogleAuth(
      user => setGoogleUser(user),
      () => setGoogleUser(null)
    );

    // Sincronizar configuración con el backend
    fetch('/api/sheets/config')
      .then(res => res.json())
      .then(cfg => {
        if (cfg.webhookUrl && !webhookUrl) setWebhookUrl(cfg.webhookUrl);
        if (cfg.spreadsheetUrl && !spreadsheetUrl) setSpreadsheetUrl(cfg.spreadsheetUrl);
        if (Array.isArray(cfg.users) && cfg.users.length > 0) {
          setDiagnosedUsers(cfg.users);
        }
      })
      .catch(() => {});

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_MASTER_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleActionMessage(null);
    try {
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      setGoogleActionMessage(`¡Conectado exitosamente con ${res.user.email}! Permiso concedido para modificar Google Sheets.`);
    } catch (err: any) {
      setGoogleActionMessage(`Error al iniciar sesión con Google: ${err.message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setGoogleActionMessage('Sesión de Google cerrada.');
  };

  const handleCreateSheetViaApi = async () => {
    if (!googleUser) {
      await handleGoogleSignIn();
    }
    setIsGoogleLoading(true);
    setGoogleActionMessage('Creando planilla oficial en tu Google Drive...');
    try {
      const { spreadsheetId, spreadsheetUrl: createdUrl } = await createOfficialSpreadsheetViaApi();
      setSpreadsheetUrl(createdUrl);
      db.saveSheetsConfig({
        webhookUrl,
        spreadsheetUrl: createdUrl,
        spreadsheetId,
        lastSync: new Date().toISOString(),
      });
      setGoogleActionMessage(`¡Planilla creada exitosamente en tu Google Drive! ID: ${spreadsheetId}`);
      handleDiagnoseUsers();
    } catch (err: any) {
      setGoogleActionMessage(`Error al crear planilla con la API: ${err.message}. Puedes usar el botón de 'sheets.new' y pegar el código.`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setStatusMessage('Comprobando enlace y leyendo usuarios de S_Usuarios en Google Sheets...');

    const cleanWeb = webhookUrl.trim();
    const cleanSheet = spreadsheetUrl.trim();

    if (!cleanWeb && !cleanSheet) {
      setConnectionStatus('error');
      setStatusMessage('Por favor ingrese la URL de su Webhook de Apps Script o el enlace de la planilla de Google Sheets.');
      return;
    }

    db.saveSheetsConfig({
      webhookUrl: cleanWeb,
      spreadsheetUrl: cleanSheet,
      spreadsheetId: '',
      lastSync: new Date().toISOString(),
    });

    try {
      const res = await fetch('/api/sheets/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanWeb, spreadsheetUrl: cleanSheet }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        db.syncUsersFromGoogleSheets(data.users);
        setDiagnosedUsers(data.users);
        setDiagnoseSource(data.source || 'Google Sheets');
        setConnectionStatus('success');
        setStatusMessage(
          `¡Conexión exitosa! Se verificó la vinculación con Google Sheets y se reconocieron ${data.count} usuarios en S_Usuarios (${data.source || 'Sincronizado'}).`
        );
      } else {
        setConnectionStatus('success');
        setStatusMessage(data.warning || 'Configuración guardada en backend. El sistema validará los usuarios directamente con Google Sheets.');
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setStatusMessage('Error al contactar con el backend o Google Sheets. Verifique la URL ingresada.');
    }
  };

  const handleDiagnoseUsers = async () => {
    setIsDiagnosingUsers(true);
    setDiagnoseError(null);

    const cleanWeb = webhookUrl.trim();
    const cleanSheet = spreadsheetUrl.trim();

    const sheetIdMatch = cleanSheet.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : '';

    if (googleUser && sheetId) {
      try {
        const apiUsers = await fetchUsersViaSheetsApi(sheetId);
        if (apiUsers.length > 0) {
          db.syncUsersFromGoogleSheets(apiUsers as any);
          setDiagnosedUsers(apiUsers);
          setDiagnoseSource('Google Sheets API v4 (Permiso Directo)');
          setIsDiagnosingUsers(false);
          return;
        }
      } catch (err: any) {
        console.warn('API fetch fallback to backend:', err.message);
      }
    }

    try {
      const res = await fetch('/api/sheets/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanWeb, spreadsheetUrl: cleanSheet }),
      });

      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        db.syncUsersFromGoogleSheets(data.users);
        setDiagnosedUsers(data.users);
        setDiagnoseSource(data.source || (data.cached ? 'Caché persistente local' : 'Google Sheets'));
        if (data.warning) {
          setDiagnoseError(data.warning);
        }
      } else {
        setDiagnoseError(data.error || 'No se pudieron leer los usuarios de Google Sheets.');
      }
    } catch (err: any) {
      setDiagnoseError('Error de red al consultar Google Sheets.');
    } finally {
      setIsDiagnosingUsers(false);
    }
  };

  // Función principal: Agregar Usuario con impacto bidireccional en Google Sheets
  const handleAddUserBidirectional = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaveFeedback(null);

    // Validación de rol estricta: solo Administrador
    if (!isAdmin) {
      setUserSaveFeedback({
        type: 'error',
        message: 'Acceso denegado: Solo los usuarios con rol de Administrador pueden dar de alta usuarios.',
      });
      return;
    }

    const cleanNombre = formNombre.trim();
    const cleanUsuario = formUsuario.trim();
    const cleanPass = formContrasena.trim();

    if (!cleanNombre || !cleanUsuario || !cleanPass) {
      setUserSaveFeedback({
        type: 'error',
        message: 'Todos los campos son obligatorios (Nombre, Usuario y Contraseña).',
      });
      return;
    }

    setIsSavingUser(true);

    const sheetIdMatch = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : '';
    let activeToken = await getGoogleAccessToken();
    let currentGUser = googleUser || getGoogleUser();

    // Si aún no tenemos token de Google para la API de Sheets y la planilla está configurada,
    // solicitar autorización de Google al vuelo para garantizar el impacto directo en la planilla
    if (!activeToken && sheetId && (!webhookUrl || !webhookUrl.includes('/exec'))) {
      try {
        setGoogleActionMessage('Conectando con Google para autorizar la escritura en la planilla...');
        const authRes = await signInWithGoogle();
        activeToken = authRes.accessToken;
        currentGUser = authRes.user;
        setGoogleUser(authRes.user);
        setGoogleActionMessage(`¡Conectado con ${authRes.user.email}! Permiso de escritura concedido.`);
      } catch (authErr: any) {
        setUserSaveFeedback({
          type: 'error',
          message: 'Se requiere autorización de Google para impactar directamente en tu Google Sheets.',
          detail: authErr.message || 'Por favor acepte la ventana de inicio de sesión con Google para conceder permisos.',
        });
        setIsSavingUser(false);
        return;
      }
    }

    const newRecord = {
      id_usuario: diagnosedUsers.length > 0 ? Math.max(...diagnosedUsers.map(u => Number(u.id_usuario) || 0)) + 1 : 1,
      usuario: cleanUsuario,
      contrasena: cleanPass,
      nombre: cleanNombre,
      rol: formRol,
      activo: formActivo,
    };

    let directApiSuccess = false;
    let directApiMessage = '';

    // 1. Escritura directa mediante Google Sheets API v4
    if (activeToken && sheetId) {
      try {
        const apiRes = await saveUserToSheetsApi(sheetId, newRecord);
        if (apiRes.success) {
          directApiSuccess = true;
          directApiMessage = apiRes.message;
        }
      } catch (apiErr: any) {
        console.warn('[Direct API Write Error]:', apiErr.message);
      }
    }

    // 2. Notificación y sincronización en backend Express (que también dispara Webhook a Google Sheets)
    try {
      const backendRes = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          ...newRecord,
          adminRole: currentRole,
          googleAccessToken: activeToken || undefined,
          spreadsheetUrl: spreadsheetUrl.trim(),
          webhookUrl: webhookUrl.trim(),
        }),
      });

      const backendData = await backendRes.json();

      if (!backendRes.ok || !backendData.success) {
        throw new Error(backendData.error || 'Error al guardar usuario en el backend.');
      }

      // 3. Guardar en motor de base de datos local
      db.saveUsuario(newRecord as any);

      const impactOnSheets = directApiSuccess || backendData.googleSheetsUpdated;
      const methodUsed = directApiSuccess
        ? 'Google Sheets API v4 (Escritura Directa)'
        : backendData.syncMethod !== 'none'
        ? backendData.syncMethod
        : null;

      if (impactOnSheets) {
        setUserSaveFeedback({
          type: 'success',
          message: `¡Usuario '${cleanUsuario}' agregado e impactado exitosamente en Google Sheets!`,
          detail: `Se actualizó la hoja S_Usuarios en tu planilla oficial (${methodUsed || 'Sincronización Bidireccional'}). La cuenta ya está habilitada para iniciar sesión.`,
        });
      } else {
        setUserSaveFeedback({
          type: 'warning',
          message: `Usuario '${cleanUsuario}' guardado en el ERP con éxito.`,
          detail: `Para impactar en Google Sheets de forma automática, conecta tu cuenta de Google arriba con el botón 'Conectar con Google' o ingresa la URL del Webhook de Apps Script (/exec).`,
        });
      }

      // Limpiar formulario
      setFormNombre('');
      setFormUsuario('');
      setFormContrasena('');
      setFormRol('Operador');
      setFormActivo(true);

      // Recargar lista de usuarios
      handleDiagnoseUsers();
    } catch (err: any) {
      setUserSaveFeedback({
        type: 'error',
        message: `Error al registrar usuario: ${err.message}`,
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDownloadAllCSVs = () => {
    guides.forEach((g, idx) => {
      setTimeout(() => {
        const csvContent = db.exportTableToCSV(g.sheetName as any);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${g.sheetName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 80);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Centro de Conexión y Permisos Google Sheets
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Fuente Única de Datos
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control de permisos de modificación sobre la hoja <code>S_Usuarios</code> y sincronización bidireccional con el login.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {googleUser ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-900">{googleUser.email}</span>
              <button
                onClick={handleGoogleSignOut}
                className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                title="Desconectar cuenta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isGoogleLoading ? 'Conectando...' : 'Conectar Cuenta de Google'}</span>
            </button>
          )}

          <button
            onClick={handleCopyScript}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md ${
              copiedScript
                ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {copiedScript ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            <span>{copiedScript ? '¡Código Copiado!' : 'Copiar Código Apps Script'}</span>
          </button>
        </div>
      </div>

      {googleActionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{googleActionMessage}</span>
        </div>
      )}

      {/* Tabs Selector: Solapa "Agregar Usuarios" solicitada exactamente */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>1. Permisos & Generador de Planilla</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('usuarios');
            handleDiagnoseUsers();
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Agregar Usuarios</span>
        </button>

        <button
          onClick={() => setActiveTab('esquema')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'esquema'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>3. Estructura Oficial de las 20 Hojas</span>
        </button>
      </div>

      {/* TAB 1: SETUP & PERMISOS */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-linear-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 shadow-md border border-emerald-700/50 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600/40 border border-emerald-400/40 text-emerald-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Permiso Total de Edición y Creación de Planilla
                </span>
              </div>

              <h4 className="text-lg font-bold text-white max-w-2xl">
                Crea tu propia planilla en Google Sheets con permisos 100% de Propietario para modificar usuarios
              </h4>

              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Para que nunca tengas bloqueos ni mensajes de "Necesitas permiso" al editar la tabla <strong>S_Usuarios</strong>, tienes dos opciones directas con permiso total:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/40 space-y-2">
                  <div className="font-bold text-emerald-300 text-xs flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">Opción A (Recomendada)</span>
                    <span>Crear Planilla en tu Google Drive (sheets.new)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Abre <strong>sheets.new</strong> en tu navegador. Al ser creada con tu cuenta de Google, <strong>tú eres el propietario absoluto</strong> con permisos libres para agregar, cambiar contraseñas y editar filas. Luego pegas el script copiado y ejecutas <code>crearYConfigurarTodasLasHojas</code>.
                  </p>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir sheets.new en pestaña nueva</span>
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/90 border border-blue-500/40 space-y-2">
                  <div className="font-bold text-blue-300 text-xs flex items-center gap-2">
                    <span className="p-1 rounded bg-blue-500/20 text-blue-300 font-mono">Opción B</span>
                    <span>Crear Automáticamente con Google Sheets API</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Conecta tu cuenta de Google arriba y presiona el botón inferior: la aplicación creará la planilla en tu Google Drive con las 20 hojas y la tabla <code>S_Usuarios</code> lista.
                  </p>
                  <button
                    onClick={handleCreateSheetViaApi}
                    disabled={isGoogleLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 underline cursor-pointer pt-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Crear Planilla Automática en mi Google Drive</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? '¡Código Copiado al Portapapeles!' : 'Copiar Código de Google Apps Script'}</span>
                </button>

                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md border border-slate-300"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>Crear Mi Planilla con Permiso de Propietario (sheets.new)</span>
                </a>

                <button
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>{showCodePreview ? 'Ocultar Visor de Código' : 'Ver Código Completo'}</span>
                  {showCodePreview ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>
              </div>
            </div>
          </div>

          {showCodePreview && (
            <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-slate-300">
                    Google Apps Script (Script Maestro Oficial: Creación de 20 Hojas & Sincronización Bidireccional)
                  </span>
                </div>
                <button
                  onClick={handleCopyScript}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar Script</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-96 leading-relaxed select-all">
                {APPS_SCRIPT_MASTER_CODE}
              </pre>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Enlace de tu Planilla para Lectura y Escritura Activa</span>
              </h4>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Sincronización Bidireccional
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL del Archivo de Google Sheets (Tu Planilla de Google Drive)
                </label>
                <input
                  type="text"
                  value={spreadsheetUrl}
                  onChange={e => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/TU_PLANILLA_ID/edit"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Pega aquí el enlace de tu planilla creada en tu Google Drive.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL de la Aplicación Web (Apps Script Webhook)
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Generada en Extensiones &gt; Apps Script &gt; Implementar &gt; Nueva implementación.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSyncAll20Tables}
                disabled={isSyncingAllTables}
                className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#13382c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                title="Ejecuta doGet contra la Web App de Apps Script y actualiza las 20 tablas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllTables ? 'animate-spin' : ''}`} />
                <span>{isSyncingAllTables ? 'Descargando 20 tablas...' : 'Consumir 20 Tablas (doGet)'}</span>
              </button>

              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'testing'}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Probar Enlace y Leer Usuarios</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('usuarios');
                  handleDiagnoseUsers();
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ir a Agregar Usuarios ({diagnosedUsers.length})</span>
              </button>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Planilla en Google Drive</span>
                </a>
              )}
            </div>

            {/* Panel de resultado de las 20 tablas */}
            {allTablesSyncResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  allTablesSyncResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    {allTablesSyncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{allTablesSyncResult.message}</span>
                  </div>
                  {allTablesSyncResult.rowCounts && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4D3E] text-white">
                      {Object.keys(allTablesSyncResult.rowCounts).length} Tablas Procesadas
                    </span>
                  )}
                </div>

                {allTablesSyncResult.rowCounts && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2 border-t border-emerald-200">
                    {Object.entries(allTablesSyncResult.rowCounts).map(([sheet, count]) => (
                      <div key={sheet} className="p-2 rounded bg-white/80 border border-emerald-200">
                        <div className="text-[10px] text-slate-500 font-mono truncate" title={sheet}>{sheet}</div>
                        <div className="text-sm font-bold text-slate-900">{count} filas</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  connectionStatus === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : connectionStatus === 'error'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {connectionStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {connectionStatus === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AGREGAR USUARIOS (Nombre exacto solicitado: "Agregar Usuarios") */}
      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Control de Rol: Solo Administrador */}
          {!isAdmin ? (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-xs text-amber-900 space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5 font-bold text-amber-800 text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Acceso Restringido a Administradores</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                Solo los usuarios con rol de <strong>Administrador</strong> tienen autorización para dar de alta nuevos usuarios y sincronizarlos con la tabla <code>S_Usuarios</code> en Google Sheets.
              </p>
              <div className="inline-flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 font-semibold text-amber-900">
                <span>Tu rol actual en el ERP:</span>
                <span className="bg-amber-200/80 px-2 py-0.5 rounded text-[11px] font-bold">{currentRole}</span>
              </div>
              <p className="text-[11px] text-amber-700 pt-1">
                Para gestionar o dar de alta usuarios, inicie sesión con una cuenta administradora (ej: <code>admin</code> / <code>admin2026</code>).
              </p>
            </div>
          ) : (
            /* Formulario de Alta Bidireccional para Administrador */
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Agregar Usuario con Impacto Directo en Google Sheets</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Al completar este formulario, el usuario se guarda en el ERP y se actualiza <strong>en tiempo real en la hoja S_Usuarios de Google Sheets</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-700" />
                    Permisos de Administrador Activos
                  </span>

                  <button
                    onClick={handleDiagnoseUsers}
                    disabled={isDiagnosingUsers}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isDiagnosingUsers ? 'animate-spin' : ''}`} />
                    <span>Recargar Tabla</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {userSaveFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1 ${
                    userSaveFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : userSaveFeedback.type === 'warning'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {userSaveFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {userSaveFeedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                    {userSaveFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{userSaveFeedback.message}</span>
                  </div>
                  {userSaveFeedback.detail && (
                    <p className="text-[11px] opacity-90 pl-6 leading-relaxed">
                      {userSaveFeedback.detail}
                    </p>
                  )}
                </div>
              )}

              {/* Conexión de Google Sheets y Permiso de Escritura */}
              <div className="p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${googleUser ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <div>
                    <div className="font-bold text-slate-800">
                      {googleUser
                        ? `Conectado con Google: ${googleUser.email}`
                        : 'Permiso de Escritura en Google Sheets API: No conectado'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {googleUser
                        ? 'La aplicación tiene permiso concedido para escribir y actualizar filas en la hoja S_Usuarios.'
                        : 'Conecta tu cuenta de Google para otorgar permiso de escritura directa a la planilla.'}
                    </div>
                  </div>
                </div>

                {!googleUser && (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{isGoogleLoading ? 'Conectando...' : 'Conectar con Google (1 clic)'}</span>
                  </button>
                )}
              </div>

              {webhookUrl && (webhookUrl.includes('/edit') || webhookUrl.includes('/projects/')) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold">Aviso sobre Webhook de Apps Script: </span>
                    La URL configurada corresponde al editor de código. Para que el Webhook reciba sincronizaciones sin necesidad de cuenta Google, ve a Apps Script &gt; Implementar &gt; Nueva implementación &gt; Aplicación web (Acceso: Cualquier usuario) y copia la URL terminada en <code>/exec</code>.
                  </div>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleAddUserBidirectional} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formNombre}
                      onChange={e => setFormNombre(e.target.value)}
                      placeholder="Ej: Santiago Garello"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Usuario (Para Login)
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 text-xs absolute left-3 top-2 pointer-events-none">@</span>
                    <input
                      type="text"
                      required
                      value={formUsuario}
                      onChange={e => setFormUsuario(e.target.value)}
                      placeholder="Ej: santigare0"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contraseña de Acceso
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={formContrasena}
                      onChange={e => setFormContrasena(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rol en el Sistema
                    </label>
                    <select
                      value={formRol}
                      onChange={e => setFormRol(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Administrador">Administrador (Total)</option>
                      <option value="Operador">Operador (Campo/Balanza)</option>
                      <option value="Consulta">Consulta (Auditoría/Informes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Estado de la Cuenta
                    </label>
                    <select
                      value={formActivo ? 'true' : 'false'}
                      onChange={e => setFormActivo(e.target.value === 'true')}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="true">Activo (Habilitado)</option>
                      <option value="false">Inactivo (Deshabilitado)</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Impacta de inmediato en <strong>S_Usuarios</strong> de Google Sheets y en el inicio de sesión.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSavingUser ? 'Guardando en Google Sheets...' : 'Guardar e Impactar en Google Sheets'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla de Usuarios Reconocidos en Google Sheets */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Usuarios Registrados en S_Usuarios ({diagnosedUsers.length})</span>
              </h5>

              {diagnoseSource && (
                <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  Vinculación: {diagnoseSource}
                </span>
              )}
            </div>

            {diagnoseError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso de sincronización: </span>
                  {diagnoseError}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Usuario (Login)</th>
                    <th className="p-3">Nombre Completo</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Impacto en Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diagnosedUsers.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-500">{u.id_usuario}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{u.usuario}</td>
                      <td className="p-3 text-slate-700">{u.nombre}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          u.rol === 'Administrador'
                            ? 'bg-purple-100 text-purple-800'
                            : u.rol === 'Operador'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.activo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.activo ? 'VERDADERO' : 'FALSO'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {u.activo ? (
                          <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Inhabilitado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sincronización Bidireccional Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 leading-relaxed">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>¿Cómo funciona la sincronización bidireccional?</span>
              </div>
              <p className="text-[11px]">
                • <strong>De Google Sheets hacia la App:</strong> Si agregas o modificas una fila directamente en la hoja <code>S_Usuarios</code> en Google Sheets, el ERP la lee automáticamente y el usuario puede iniciar sesión de inmediato.
              </p>
              <p className="text-[11px]">
                • <strong>De la App hacia Google Sheets:</strong> Al utilizar el formulario superior como <strong>Administrador</strong>, el usuario se guarda en el ERP y se escribe en la hoja <code>S_Usuarios</code> mediante Google Sheets API o el Webhook de Google Apps Script.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESQUEMA OFICIAL DE LAS 20 HOJAS */}
      {activeTab === 'esquema' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Descarga de Plantillas en Archivos .CSV
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Si prefiere importar las hojas manualmente en Google Sheets o Excel, descargue los 20 archivos CSV estandarizados.
              </p>
            </div>

            <button
              onClick={handleDownloadAllCSVs}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar los 20 Archivos .CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Estructura Oficial de las 20 Hojas en Google Sheets
                </h4>
                <p className="text-xs text-slate-500">
                  Cada pestaña creada por el script contiene exactamente estos nombres técnicos en la Fila 1.
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold">
                20 Hojas Estandarizadas
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {guides.map((g, i) => (
                <div key={i} className="p-4 hover:bg-slate-50/60 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {g.sheetName}
                      </span>
                      <span className="text-xs text-slate-500">({g.columns.length} columnas)</span>
                    </div>
                    <button
                      onClick={() => {
                        const csv = db.exportTableToCSV(g.sheetName as any);
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${g.sheetName}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Descargar {g.sheetName}.csv
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {g.columns.map((col, cIdx) => (
                      <span
                        key={cIdx}
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                          cIdx === 0
                            ? 'bg-slate-800 text-white border-slate-700 font-bold'
                            : col.startsWith('id_')
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
