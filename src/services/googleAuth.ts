/**
 * @license
 * Establecimiento: Pozo del Carril
 * Autenticación con Google y Servicio Google Sheets API (Workspace Integration)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('google_sheets_token') : null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user) {
      const storedToken = localStorage.getItem('google_sheets_token');
      if (storedToken) {
        cachedAccessToken = storedToken;
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('google_sheets_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Sheets.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_sheets_token', credential.accessToken);
      if (result.user.email) {
        localStorage.setItem('google_sheets_email', result.user.email);
      }
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google Auth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_sheets_token');
    localStorage.removeItem('google_sheets_email');
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('google_sheets_token');
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  }
  return null;
};

export const getGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

// ============================================================================
// GOOGLE SHEETS API V4 HELPERS (Acceso y modificación con permisos del usuario)
// ============================================================================

export interface SheetRowUser {
  id_usuario: number;
  usuario: string;
  contrasena: string;
  nombre: string;
  rol: string;
  activo: boolean;
}

/**
 * Lee los usuarios de la hoja S_Usuarios directamente a través de la API oficial de Google Sheets
 */
export async function fetchUsersViaSheetsApi(spreadsheetId: string): Promise<SheetRowUser[]> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Se requiere iniciar sesión con Google para acceder a la planilla.');

  const cleanId = spreadsheetId.trim();
  const range = 'S_Usuarios!A1:F100';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error ${res.status} al leer Google Sheets.`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  const userIdx = headers.findIndex(h => /^(usuario|user|username)$/.test(h));
  const passIdx = headers.findIndex(h => /^(contrasena|contraseña|password|clave)$/.test(h));
  const nameIdx = headers.findIndex(h => /^(nombre|name)$/.test(h));
  const roleIdx = headers.findIndex(h => /^(rol|role)$/.test(h));
  const activeIdx = headers.findIndex(h => /^(activo|active)$/.test(h));
  const idIdx = headers.findIndex(h => /^(id|id_usuario)$/.test(h));

  const users: SheetRowUser[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const username = String(row[userIdx >= 0 ? userIdx : 1] ?? '').trim();
    if (!username) continue;

    const rawActive = row[activeIdx >= 0 ? activeIdx : 5];
    let isActivo = true;
    if (rawActive !== undefined && rawActive !== null && String(rawActive).trim() !== '') {
      const v = String(rawActive).trim().toUpperCase();
      if (v === 'FALSO' || v === 'FALSE' || v === '0' || v === 'NO' || v === 'INACTIVO') {
        isActivo = false;
      }
    }

    users.push({
      id_usuario: Number(row[idIdx >= 0 ? idIdx : 0]) || i,
      usuario: username,
      contrasena: String(row[passIdx >= 0 ? passIdx : 2] ?? '').trim(),
      nombre: String(row[nameIdx >= 0 ? nameIdx : 3] ?? username).trim(),
      rol: String(row[roleIdx >= 0 ? roleIdx : 4] ?? 'Operador').trim(),
      activo: isActivo,
    });
  }

  return users;
}

/**
 * Guarda o actualiza un usuario en la hoja S_Usuarios de Google Sheets vía API
 */
export async function saveUserToSheetsApi(
  spreadsheetId: string,
  user: SheetRowUser
): Promise<{ success: boolean; message: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Se requiere iniciar sesión con Google para modificar la planilla.');

  const cleanId = spreadsheetId.trim();
  // Primero leemos para ver si la fila ya existe
  const existingUsers = await fetchUsersViaSheetsApi(cleanId).catch(() => []);
  const existingIdx = existingUsers.findIndex(u => u.usuario.toLowerCase() === user.usuario.toLowerCase());

  const rowValues = [
    user.id_usuario,
    user.usuario,
    user.contrasena,
    user.nombre,
    user.rol,
    user.activo ? 'VERDADERO' : 'FALSO',
  ];

  if (existingIdx >= 0) {
    // Fila en Google Sheets: fila 1 encabezados, fila 2 = index 0 => fila existingIdx + 2
    const targetRow = existingIdx + 2;
    const range = `S_Usuarios!A${targetRow}:F${targetRow}`;
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const res = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error actualizando fila en Google Sheets (${res.status})`);
    }

    return { success: true, message: `Usuario '${user.usuario}' actualizado en la fila ${targetRow} de Google Sheets.` };
  } else {
    // Anexar al final
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent('S_Usuarios!A:F')}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error agregando usuario a Google Sheets (${res.status})`);
    }

    return { success: true, message: `Usuario '${user.usuario}' agregado exitosamente en Google Sheets.` };
  }
}

/**
 * Crea una planilla oficial nueva directamente en la cuenta de Google Drive del usuario con las 20 hojas
 */
export async function createOfficialSpreadsheetViaApi(title = 'ERP Ganadero Pozo del Carril 2026'): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Se requiere iniciar sesión con Google para crear la planilla.');

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'D_UnidadNeg' } },
        { properties: { title: 'D_Subunidad' } },
        { properties: { title: 'D_CategoriaHacienda' } },
        { properties: { title: 'D_UM' } },
        { properties: { title: 'D_Cuenta' } },
        { properties: { title: 'D_Insumo' } },
        { properties: { title: 'D_Campana' } },
        { properties: { title: 'D_HaciendaIndividual' } },
        { properties: { title: 'D_TropaLote' } },
        { properties: { title: 'P_EstandarRinde' } },
        { properties: { title: 'P_DosisTecnica' } },
        { properties: { title: 'F_MovimientosHacienda' } },
        { properties: { title: 'F_ConsumosReales' } },
        { properties: { title: 'F_SanidadReal' } },
        { properties: { title: 'F_ComprasInsumos' } },
        { properties: { title: 'F_PesadasControl' } },
        { properties: { title: 'F_VentasHacienda' } },
        { properties: { title: 'F_CostosIndirectos' } },
        { properties: { title: 'S_Usuarios' } },
        { properties: { title: 'S_Auditoria' } },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error creando planilla (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Inicializar S_Usuarios con encabezados y usuarios iniciales
  try {
    const initUsersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/S_Usuarios!A1:F4?valueInputOption=USER_ENTERED`;
    await fetch(initUsersUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          ['id_usuario', 'usuario', 'contrasena', 'nombre', 'rol', 'activo'],
          [1, 'admin', 'admin2026', 'Administrador Pozo del Carril', 'Administrador', 'VERDADERO'],
          [2, 'operador', 'campo2026', 'Operador de Campo y Balanza', 'Operador', 'VERDADERO'],
          [3, 'auditor', 'auditor2026', 'Auditor Contable y Control de Gestión', 'Consulta', 'VERDADERO'],
        ],
      }),
    });
  } catch (e) {
    console.warn('Initial users write warning:', e);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Agrega ÚNICAMENTE las 5 tablas del módulo Costos Estándar a una planilla existente
 * mediante Google Sheets REST API.
 * Garantía 100% NO DESTRUCTIVA: no borra ni modifica ninguna hoja preexistente.
 */
export async function addCostosEstandarSheetsViaApi(spreadsheetIdOrUrl: string): Promise<{
  success: boolean;
  sheetsCreated: string[];
  alreadyExisting: string[];
  message: string;
}> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Se requiere iniciar sesión con Google para modificar la planilla.');

  const cleanId = spreadsheetIdOrUrl.includes('/spreadsheets/d/')
    ? spreadsheetIdOrUrl.split('/spreadsheets/d/')[1].split('/')[0].split('#')[0]
    : spreadsheetIdOrUrl.trim();

  // 1. Obtener lista de hojas existentes
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties(sheetId,title)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!getRes.ok) {
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al consultar la planilla (${getRes.status})`);
  }

  const meta = await getRes.json();
  const existingSheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties.title);

  const tablasDef = [
    {
      title: 'P_CostosSupuestos',
      headers: ['id_supuesto', 'grupo', 'concepto', 'valor', 'unidad', 'tipo', 'fuente_nota'],
      rows: [
        [1, 'Precios Base', 'Dólar oficial BNA', 1535, '$/US$', 'precio', 'Referencia cambiaria Octubre 2026'],
        [2, 'Precios Base', 'Maíz propio', 287.09, '$/kg tal cual', 'precio', 'FAS / costo propio'],
        [3, 'Precios Base', 'Soja grano', 560, '$/kg tal cual', 'precio', 'FAS / costo propio'],
        [4, 'Precios Base', 'Rollo de alfalfa 1ª', 155, '$/kg tal cual', 'precio', 'Referencia mercado'],
        [5, 'Precios Base', 'Silaje de maíz (US$/t)', 28, 'US$/t verde', 'precio', 'Costo contratista picado'],
        [6, 'Precios Base', 'Silaje de maíz ($/kg verde)', 42.98, '$/kg verde', 'precio', '(US$/t * Dólar)/1000 = (28 * 1535)/1000'],
        [7, 'Precios Base', 'Núcleo mineral con monensina (US$/kg)', 1.2, 'US$/kg', 'precio', 'Insumo formulación corral'],
        [8, 'Precios Base', 'Núcleo mineral ($/kg)', 1842, '$/kg', 'precio', 'US$/kg * Dólar = 1.2 * 1535'],
        [9, 'Pasturas', 'Alfalfa implantación', 475, 'US$/ha', 'costo_implantacion', 'Costo establecimiento pradera'],
        [10, 'Pasturas', 'Alfalfa amortización', 4, 'años', 'vida_util', 'Periodo amortización'],
        [11, 'Pasturas', 'Alfalfa producción', 12000, 'kg MS/ha/año', 'rendimiento', 'Producción forrajera anual'],
        [12, 'Pasturas', 'Alfalfa aprovechamiento', 60, '%', 'eficiencia', 'Eficiencia pastoreo directo'],
        [13, 'Pasturas', 'Alfalfa costo por kg MS consumido', 25.31684, '$/kg MS', 'costo_unitario', '((475 * 1535) / 4) / (12000 * 0.60)'],
        [14, 'Pasturas', 'Otras pasturas implantación', 365, 'US$/ha', 'costo_implantacion', 'Promedio campo natural y consociadas'],
        [15, 'Pasturas', 'Otras pasturas amortización', 4, 'años', 'vida_util', 'Periodo amortización'],
        [16, 'Pasturas', 'Otras pasturas producción', 6000, 'kg MS/ha/año', 'rendimiento', 'Producción anual'],
        [17, 'Pasturas', 'Otras pasturas aprovechamiento', 50, '%', 'eficiencia', 'Eficiencia pastoreo'],
        [18, 'Pasturas', 'Otras pasturas costo por kg MS consumido', 46.68958, '$/kg MS', 'costo_unitario', '((365 * 1535) / 4) / (6000 * 0.50)'],
        [19, 'Materia Seca (% MS)', 'Maíz grano', 88, '% MS', 'porcentaje_ms', 'Materia seca grano'],
        [20, 'Materia Seca (% MS)', 'Soja grano', 90, '% MS', 'porcentaje_ms', 'Materia seca grano'],
        [21, 'Materia Seca (% MS)', 'Rollo de alfalfa', 85, '% MS', 'porcentaje_ms', 'Materia seca fardo/rollo'],
        [22, 'Materia Seca (% MS)', 'Silaje de maíz', 30, '% MS', 'porcentaje_ms', 'Materia seca forraje picado'],
        [23, 'Proceso Productivo', 'Peso inicial recría', 140, 'kg', 'peso', 'Peso destete ingreso a recría'],
        [24, 'Proceso Productivo', 'Peso al pasar a adaptación', 280, 'kg', 'peso', 'Peso fin recría / ingreso corral'],
        [25, 'Proceso Productivo', 'Peso final engorde', 450, 'kg', 'peso', 'Peso faena terminación'],
        [26, 'Proceso Productivo', 'Días recría', 180, 'días', 'tiempo', 'Duración ciclo recría pastoril'],
        [27, 'Proceso Productivo', 'Días adaptación', 50, 'días', 'tiempo', 'Duración transición ruminal'],
        [28, 'Proceso Productivo', 'Días engorde final', 60, 'días', 'tiempo', 'Duración engorde corral'],
        [29, 'Proceso Productivo', 'ADPV en corral', 1.545, 'kg/día', 'ganancia_diaria', 'Aumento diario de peso vivo corral'],
        [30, 'Proceso Productivo', 'Peso al terminar adaptación', 357.25, 'kg', 'peso', '280 + (50 * 1.545)'],
        [31, 'Proceso Productivo', 'Mortalidad esperada', 1.5, '%', 'parametro_sanitario', 'Tasa de mortandad esperada del rodeo'],
        [32, 'Proceso Productivo', 'Mortalidad subtotal previsto', 21035.49, '$/cab', 'costo_contingencia', 'Subtotal previsto por animal'],
        [33, 'Cría', 'Peso vaca', 420, 'kg', 'peso', 'Peso vivo promedio vientre'],
        [34, 'Cría', 'Consumo vaca % PV MS', 2.2, '%', 'consumo', 'Consumo diario en materia seca (% PV)'],
        [35, 'Cría', 'Porcentaje destete', 80, '%', 'eficiencia_reproductiva', 'Terneros logrados por vientre entorado'],
        [36, 'Cría', 'Porcentaje hembras recría', 50, '%', 'reposicion', 'Retención o destino hembras'],
      ],
    },
    {
      title: 'P_CostosDietas',
      headers: ['id_param_dieta', 'concepto', 'recria', 'adaptacion', 'engorde_final', 'cria_vaca_ano'],
      rows: [
        [1, 'Consumo MS (% PV)', '3.0%', '2.8%', '2.5%', '2.2%'],
        [2, 'Peso inicial (kg)', 140, 280, 357.25, 420],
        [3, 'Peso final (kg)', 280, 357.25, 450, 420],
        [4, 'Peso promedio (kg)', 210, 318.625, 403.625, 420],
        [5, 'Días', 180, 50, 60, 180],
        [6, 'Consumo MS/día (kg)', 6.30, 8.9215, 10.0906, 9.24],
        [7, 'Consumo MS total (kg)', 1134, 446.075, 605.4375, 1663.20],
        [8, 'Kg ganados por cabeza', 140, 77.25, 92.75, 0],
        [9, 'Conversión (kg MS/kg ganado)', 8.10, 5.7744, 6.5276, 0],
        [10, 'Maíz propio (% MS)', '10%', '25%', '25%', '0%'],
        [11, 'Soja concentrado (% MS)', '5%', '0%', '0%', '0%'],
        [12, 'Núcleo mineral (% MS)', '5%', '5%', '5%', '0%'],
        [13, 'Silaje de maíz (% MS)', '0%', '25%', '20%', '0%'],
        [14, 'Rollos (% MS)', '0%', '0%', '0%', '10%'],
        [15, 'Alfalfa pastoreo (% MS)', '65%', '45%', '50%', '75%'],
        [16, 'Otras pasturas/rastrojo (% MS)', '15%', '0%', '0%', '15%'],
      ],
    },
    {
      title: 'P_CostosVacunas',
      headers: ['id_vacuna', 'categoria', 'vacuna_nombre', 'dosis_anual', 'precio_dosis', 'total_anual'],
      rows: [
        [1, 'Cría', 'Aftosa (2 aplicaciones)', 2, 1200, 2400],
        [2, 'Cría', 'Carbunclo bacteridiano', 1, 450, 450],
        [3, 'Cría', 'Complejo Reproductivo (IBR, DVB, Lepto)', 1, 1400, 1400],
        [4, 'Cría', 'Clostridial 8 vías polivalente', 1, 650, 650],
        [5, 'Cría', 'Antiparasitario y Cobre/Mineral', 1, 1100, 1100],
        [6, 'Recría', 'Aftosa (2 aplicaciones)', 2, 1200, 2400],
        [7, 'Recría', 'Carbunclo bacteridiano', 1, 450, 450],
        [8, 'Recría', 'Clostridial (Mancha, Gangrena, Enterotoxemia)', 2, 650, 1300],
        [9, 'Recría', 'Queratoconjuntivitis', 2, 800, 1600],
        [10, 'Recría', 'Antiparasitario interno y externo (Ivermectina)', 2, 1500, 3000],
        [11, 'Recría', 'Suplemento mineral (Cu / Se / Zn)', 1, 1100, 1100],
        [12, 'Adaptación', 'Ingreso a corral: Clostridial refuerzo', 1, 700, 700],
        [13, 'Adaptación', 'Ingreso a corral: Neumonías / Respiratorio', 1, 1900, 1900],
        [14, 'Adaptación', 'Antiparasitario amplio espectro', 1, 1500, 1500],
        [15, 'Engorde Final', 'Sin aplicaciones (período de resguardo)', 0, 0, 0],
      ],
    },
    {
      title: 'P_CostosDetalleDesglose',
      headers: ['id_desglose', 'subunidad', 'ingrediente_concepto', 'kg_ms', 'kg_tal_cual', 'precio_unitario', 'costo_total'],
      rows: [
        [1, 'Cría', 'Alfalfa pastoreo (75% MS)', 1247.40, 1247.40, 25.31684, 31580.23],
        [2, 'Cría', 'Otras pasturas/rastrojo (15% MS)', 249.48, 249.48, 46.68958, 11648.12],
        [3, 'Cría', 'Rollos reserva invernal (10% MS)', 166.32, 195.67, 155.00, 30328.93],
        [4, 'Recría', 'Alfalfa pastoreo (65% MS)', 737.10, 737.10, 25.31684, 18661.04],
        [5, 'Recría', 'Otras pasturas (15% MS)', 170.10, 170.10, 46.68958, 7941.90],
        [6, 'Recría', 'Maíz propio (10% MS)', 113.40, 128.86, 287.09, 36995.62],
        [7, 'Recría', 'Soja concentrado (5% MS)', 56.70, 63.00, 560.00, 35280.00],
        [8, 'Recría', 'Núcleo mineral (5% MS)', 56.70, 56.70, 1842.00, 104441.24],
        [9, 'Adaptación', 'Alfalfa pastoreo (45% MS)', 200.73, 200.73, 25.31684, 5081.93],
        [10, 'Adaptación', 'Silaje de maíz (25% MS)', 111.52, 371.73, 42.98, 15976.96],
        [11, 'Adaptación', 'Maíz propio (25% MS)', 111.52, 126.73, 287.09, 36381.82],
        [12, 'Adaptación', 'Núcleo mineral (5% MS)', 22.30, 22.30, 1842.00, 41083.39],
        [13, 'Engorde Final', 'Alfalfa pastoreo (50% MS)', 302.72, 302.72, 25.31684, 7663.89],
        [14, 'Engorde Final', 'Silaje de maíz (20% MS)', 121.09, 403.63, 42.98, 17347.85],
        [15, 'Engorde Final', 'Maíz propio (25% MS)', 151.36, 172.00, 287.09, 49379.48],
        [16, 'Engorde Final', 'Núcleo mineral (5% MS)', 30.27, 30.27, 1842.00, 55760.53],
      ],
    },
    {
      title: 'R_CostosEstandarTotales',
      headers: ['subunidad', 'costo_alimentacion', 'costo_vacunas', 'costo_total_cab', 'costo_por_kg_ganado'],
      rows: [
        ['Cría', 73557.28, 6000.00, 79557.28, 0.00],
        ['Recría', 203319.80, 9850.00, 213169.80, 1522.64],
        ['Adaptación', 98524.10, 4100.00, 102624.10, 1328.47],
        ['Engorde Final', 130151.75, 0.00, 130151.75, 1403.25],
        ['Recría a Faena (Acumulado)', 431995.65, 13950.00, 445945.65, 1438.53],
      ],
    },
  ];

  const sheetsCreated: string[] = [];
  const alreadyExisting: string[] = [];

  for (const t of tablasDef) {
    if (existingSheetTitles.includes(t.title)) {
      alreadyExisting.push(t.title);
      continue;
    }

    // 2. Crear hoja
    const addSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: t.title,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      }),
    });

    if (!addSheetRes.ok) {
      console.warn(`Error al crear hoja ${t.title}:`, await addSheetRes.text());
      continue;
    }

    // 3. Escribir valores (encabezados + filas iniciales)
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(t.title + '!A1')}?valueInputOption=USER_ENTERED`;
    await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [t.headers, ...t.rows],
      }),
    });

    sheetsCreated.push(t.title);
  }

  return {
    success: true,
    sheetsCreated,
    alreadyExisting,
    message: `Operación finalizada: ${sheetsCreated.length} tablas creadas, ${alreadyExisting.length} ya existían. Todos los datos previos fueron preservados.`,
  };
}

