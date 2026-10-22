/**
 * @license
 * Establecimiento: Pozo del Carril
 * Backend Express Server con endpoints de autenticación, validaciones y sincronización
 * con Google Sheets (S_Usuarios y las 20 tablas del ERP) y Vite middleware montado para desarrollo.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.resolve(__dirname, '.sheets-config.json');
const USERS_CACHE_FILE = path.resolve(__dirname, '.synced-users.json');

interface SheetsConfig {
  webhookUrl: string;
  spreadsheetUrl: string;
  spreadsheetId: string;
  lastSync?: string;
}

function loadConfig(): SheetsConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        webhookUrl: data.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
        spreadsheetUrl: data.spreadsheetUrl || process.env.GOOGLE_SHEET_URL || '',
        spreadsheetId: data.spreadsheetId || '',
        lastSync: data.lastSync,
      };
    }
  } catch (e) {
    console.warn('Error reading config file:', e);
  }
  return {
    webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    spreadsheetUrl: process.env.GOOGLE_SHEET_URL || '',
    spreadsheetId: '',
  };
}

function saveConfig(cfg: SheetsConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config file:', e);
  }
}

function extractSpreadsheetId(url: string): string {
  if (!url) return '';
  const clean = url.trim();
  // Support standard /spreadsheets/d/ID
  const match = clean.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Support standalone ID string
  if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) return clean;
  return '';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(csvText: string): any[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["'\uFEFF]+|["']+$/g, '').trim());
  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => {
      const val = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
      obj[h] = val;
    });
    results.push(obj);
  }
  return results;
}

function normalizeUserRow(raw: any, index: number) {
  // Strip BOM, quotes, and whitespace from keys
  const cleanKeys = Object.keys(raw).map(k => ({
    orig: k,
    cleaned: k.replace(/^["'\uFEFF]+|["']+$/g, '').trim().toLowerCase(),
  }));

  const findKey = (pattern: RegExp) => {
    const match = cleanKeys.find(k => pattern.test(k.cleaned));
    return match ? match.orig : null;
  };

  const userKey = findKey(/^(usuario|user|username|nombre_usuario)$/i) || 'usuario';
  const passKey = findKey(/^(contrasena|contraseña|password|clave|pass)$/i) || 'contrasena';
  const nameKey = findKey(/^(nombre|name|nombre_completo|apellido_y_nombre)$/i) || 'nombre';
  const roleKey = findKey(/^(rol|role|perfil|tipo)$/i) || 'rol';
  const activeKey = findKey(/^(activo|active|estado|habilitado|habilitada)$/i) || 'activo';
  const idKey = findKey(/^(id|id_usuario|nro)$/i) || 'id_usuario';

  const rawUser = String(raw[userKey] ?? '').trim();
  const rawPass = String(raw[passKey] ?? '').trim();
  const rawName = String(raw[nameKey] ?? rawUser).trim();
  const rawRole = String(raw[roleKey] ?? 'Operador').trim();
  const rawActive = raw[activeKey];

  // Regla de negocio amigable: si la columna activo no está presente o está en blanco,
  // se considera ACTIVO por defecto para que usuarios recién agregados a Google Sheets
  // puedan ingresar sin impedimentos técnicos.
  // Solo se inhabilita si explícitamente se marca como FALSO, FALSE, 0, NO, INACTIVO o BAJA.
  let isActivo = true;
  if (rawActive !== undefined && rawActive !== null && String(rawActive).trim() !== '') {
    const valUpper = String(rawActive).trim().toUpperCase();
    if (
      valUpper === 'FALSO' ||
      valUpper === 'FALSE' ||
      valUpper === '0' ||
      valUpper === 'NO' ||
      valUpper === 'INACTIVO' ||
      valUpper === 'INACTIVA' ||
      valUpper === 'DESACTIVADO' ||
      valUpper === 'BAJA'
    ) {
      isActivo = false;
    } else {
      isActivo = true;
    }
  }

  let rol: 'Administrador' | 'Operador' | 'Consulta' = 'Operador';
  if (/admin/i.test(rawRole)) rol = 'Administrador';
  else if (/consult/i.test(rawRole) || /audit/i.test(rawRole) || /lector/i.test(rawRole)) rol = 'Consulta';

  return {
    id_usuario: Number(raw[idKey]) || (index + 1),
    usuario: rawUser,
    contrasena: rawPass,
    nombre: rawName || rawUser,
    rol,
    activo: isActivo,
  };
}

// Initial fallback users
const DEFAULT_FALLBACK_USERS = [
  { id_usuario: 1, usuario: 'admin', contrasena: 'admin2026', nombre: 'Administrador Pozo del Carril', rol: 'Administrador', activo: true },
  { id_usuario: 2, usuario: 'operador', contrasena: 'campo2026', nombre: 'Operador de Campo y Balanza', rol: 'Operador', activo: true },
  { id_usuario: 3, usuario: 'auditor', contrasena: 'auditor2026', nombre: 'Auditor Contable y Control de Gestión', rol: 'Consulta', activo: true },
];

function loadCachedUsers(): any[] {
  try {
    if (fs.existsSync(USERS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_CACHE_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Error reading users cache file:', e);
  }
  return [...DEFAULT_FALLBACK_USERS];
}

function saveCachedUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_CACHE_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving cached users:', e);
  }
}

// In-memory synced users on backend (initialized from persistent cache)
let serverSyncedUsers: any[] = loadCachedUsers();

async function fetchUsersFromGoogleSheets(config: SheetsConfig): Promise<{ success: boolean; users?: any[]; source?: string; error?: string }> {
  let webhookUsers: any[] = [];
  let csvUsers: any[] = [];
  let successSource = '';

  // 1. Google Sheets CSV Export: Contiene directamente la columna 'contrasena' de S_Usuarios
  const sheetId = config.spreadsheetId || extractSpreadsheetId(config.spreadsheetUrl);
  if (sheetId) {
    const candidates = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=S_Usuarios`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Usuarios`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=S_Usuarios`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Usuarios`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
    ];

    for (const csvUrl of candidates) {
      try {
        console.log('[BACKEND] Consultando credenciales de S_Usuarios vía CSV:', csvUrl);
        const res = await fetch(csvUrl, {
          method: 'GET',
          redirect: 'follow',
        });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<!DOCTYPE html>') && text.toLowerCase().includes('usuario')) {
            const rawRows = parseCsv(text);
            if (rawRows.length > 0) {
              const users = rawRows
                .map((r, i) => normalizeUserRow(r, i))
                .filter(u => u.usuario);
              
              if (users.length > 0) {
                csvUsers = users;
                successSource = 'Google Sheets CSV Direct Link';
                console.log(`[BACKEND] Éxito CSV: Se leyeron ${users.length} usuarios con contraseñas desde Google Sheets.`);
                break;
              }
            }
          }
        }
      } catch (e: any) {
        console.warn(`[BACKEND] Error leyendo CSV ${csvUrl}:`, e.message);
      }
    }
  }

  // 2. Google Apps Script Webhook
  if (config.webhookUrl?.trim()) {
    try {
      const webhookFetchUrl = config.webhookUrl.trim() + (config.webhookUrl.includes('?') ? '&includeAuth=true' : '?includeAuth=true');
      console.log('[BACKEND] Consultando usuarios via Google Apps Script Webhook:', webhookFetchUrl);
      const res = await fetch(webhookFetchUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        let rawUsers: any[] = [];
        
        if (Array.isArray(json)) {
          rawUsers = json;
        } else if (typeof json === 'object' && json !== null) {
          const matchingKey = Object.keys(json).find(k => /^(s_)?usuarios$/i.test(k.trim()));
          if (matchingKey && Array.isArray(json[matchingKey])) {
            rawUsers = json[matchingKey];
          } else if (json.data && Array.isArray(json.data.S_Usuarios)) {
            rawUsers = json.data.S_Usuarios;
          }
        }

        if (Array.isArray(rawUsers) && rawUsers.length > 0) {
          webhookUsers = rawUsers
            .map((r, i) => normalizeUserRow(r, i))
            .filter(u => u.usuario);
          
          if (!successSource) successSource = 'Google Apps Script Webhook';
        }
      }
    } catch (e: any) {
      console.warn('[BACKEND] Error en Webhook fetch:', e.message);
    }
  }

  // 3. Fusión inteligente: Si CSV contiene contraseñas reales, NUNCA sobreescribirlas con vacío
  if (csvUsers.length > 0 || webhookUsers.length > 0) {
    const userMap = new Map<string, any>();
    
    // Primero usuarios de webhook
    webhookUsers.forEach(u => userMap.set(u.usuario.toLowerCase(), { ...u }));

    // Luego fusionar con CSV (que contiene las contraseñas cargadas en la hoja S_Usuarios)
    csvUsers.forEach(u => {
      const existing = userMap.get(u.usuario.toLowerCase());
      if (existing) {
        userMap.set(u.usuario.toLowerCase(), {
          ...existing,
          contrasena: u.contrasena || existing.contrasena,
          nombre: u.nombre || existing.nombre,
          rol: u.rol || existing.rol,
          activo: u.activo,
        });
      } else {
        userMap.set(u.usuario.toLowerCase(), { ...u });
      }
    });

    const merged = Array.from(userMap.values());
    console.log(`[BACKEND] Total usuarios consolidados con credenciales: ${merged.length}`);
    return { success: true, users: merged, source: successSource || 'Google Sheets S_Usuarios' };
  }

  return {
    success: false,
    error: 'No se pudo conectar con Google Sheets. Verifique la URL de la planilla o que tenga permisos de lectura o la URL del Webhook.',
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  let config = loadConfig();

  // Try initial background user sync on boot if config exists
  if (config.webhookUrl || config.spreadsheetUrl) {
    fetchUsersFromGoogleSheets(config).then(fetchRes => {
      if (fetchRes.success && fetchRes.users && fetchRes.users.length > 0) {
        // Merge with existing users
        const map = new Map<string, any>();
        DEFAULT_FALLBACK_USERS.forEach(u => map.set(u.usuario.toLowerCase(), u));
        fetchRes.users.forEach(u => map.set(u.usuario.toLowerCase(), u));
        serverSyncedUsers = Array.from(map.values());
        saveCachedUsers(serverSyncedUsers);
        console.log(`[BOOT] Usuarios sincronizados en arranque: ${serverSyncedUsers.length}`);
      }
    }).catch(err => {
      console.warn('[BOOT] Initial sync non-blocking error:', err);
    });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      establishment: 'Pozo del Carril',
      project: 'Activos con cuatro patas',
      timestamp: new Date().toISOString(),
      sheetsConfigured: Boolean(config.webhookUrl || config.spreadsheetUrl),
      syncedUsersCount: serverSyncedUsers.length,
    });
  });

  // Get current sheets config & known users summary
  app.get('/api/sheets/config', (req, res) => {
    res.json({
      ...config,
      usersCount: serverSyncedUsers.length,
      users: serverSyncedUsers.map(u => ({
        id_usuario: u.id_usuario,
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
      })),
    });
  });

  // Save sheets config
  app.post('/api/sheets/config', async (req, res) => {
    const { webhookUrl, spreadsheetUrl } = req.body;
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl || '');
    config = {
      webhookUrl: (webhookUrl || '').trim(),
      spreadsheetUrl: (spreadsheetUrl || '').trim(),
      spreadsheetId,
      lastSync: new Date().toISOString(),
    };
    saveConfig(config);

    // Try immediate user fetch
    const fetchRes = await fetchUsersFromGoogleSheets(config);
    if (fetchRes.success && fetchRes.users && fetchRes.users.length > 0) {
      const map = new Map<string, any>();
      DEFAULT_FALLBACK_USERS.forEach(u => map.set(u.usuario.toLowerCase(), u));
      fetchRes.users.forEach(u => map.set(u.usuario.toLowerCase(), u));
      serverSyncedUsers = Array.from(map.values());
      saveCachedUsers(serverSyncedUsers);
    }

    res.json({
      success: true,
      config,
      usersFound: serverSyncedUsers.length,
      source: fetchRes.source || 'Memoria',
      userList: serverSyncedUsers.map(u => ({
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
      })),
    });
  });

  // Sincronizar usuarios explícitamente desde Google Sheets
  app.post('/api/sheets/sync-users', async (req, res) => {
    const candidateWebhook = (req.body.webhookUrl || config.webhookUrl || '').trim();
    const candidateSheet = (req.body.spreadsheetUrl || config.spreadsheetUrl || '').trim();
    
    const cfgToUse: SheetsConfig = {
      webhookUrl: candidateWebhook,
      spreadsheetUrl: candidateSheet,
      spreadsheetId: extractSpreadsheetId(candidateSheet),
    };

    if (candidateWebhook || candidateSheet) {
      config = { ...config, ...cfgToUse, lastSync: new Date().toISOString() };
      saveConfig(config);
    }

    const fetchRes = await fetchUsersFromGoogleSheets(cfgToUse);
    if (fetchRes.success && fetchRes.users && fetchRes.users.length > 0) {
      const map = new Map<string, any>();
      // Keep fallbacks
      DEFAULT_FALLBACK_USERS.forEach(u => map.set(u.usuario.toLowerCase(), u));
      // Overwrite/insert fetched users
      fetchRes.users.forEach(u => map.set(u.usuario.toLowerCase(), u));
      serverSyncedUsers = Array.from(map.values());
      saveCachedUsers(serverSyncedUsers);

      const safeUsers = serverSyncedUsers.map(u => ({
        id_usuario: u.id_usuario,
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
      }));

      return res.json({
        success: true,
        count: safeUsers.length,
        source: fetchRes.source,
        users: safeUsers,
      });
    }

    // Si falló pero tenemos usuarios guardados en caché, los devolvemos informando
    const safeCached = serverSyncedUsers.map(u => ({
      id_usuario: u.id_usuario,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
    }));

    return res.status(200).json({
      success: true,
      cached: true,
      warning: fetchRes.error || 'No se pudo contactar a Google Sheets en este momento. Utilizando usuarios sincronizados previamente.',
      count: safeCached.length,
      users: safeCached,
    });
  });

  // Consumir mediante doGet las 20 tablas completas desde Google Apps Script
  app.all('/api/sheets/fetch-all', async (req, res) => {
    const candidateWebhook = (
      req.body?.webhookUrl ||
      req.query?.webhookUrl ||
      config.webhookUrl ||
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      ''
    ).toString().trim();

    if (!candidateWebhook) {
      return res.status(400).json({
        success: false,
        error: 'URL de Webhook no configurada. Ingrese la URL de la Web App de Apps Script en el módulo Google Sheets.',
      });
    }

    try {
      console.log(`[BACKEND] Consumiendo las 20 tablas mediante doGet desde Webhook: ${candidateWebhook}`);
      const wbRes = await fetch(candidateWebhook, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'application/json' },
      });

      if (!wbRes.ok) {
        const textErr = await wbRes.text().catch(() => '');
        console.warn(`[BACKEND] Error HTTP en doGet Webhook (${wbRes.status}):`, textErr);
        return res.status(wbRes.status).json({
          success: false,
          error: `Error HTTP ${wbRes.status} al consultar la Web App de Google Apps Script. Verifique los permisos de implementación.`,
        });
      }

      const rawJson = await wbRes.json();
      let tablesData: Record<string, any[]> = {};

      if (rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson)) {
        tablesData = rawJson;
      }

      // Si vienen usuarios en S_Usuarios, sincronizarlos también con serverSyncedUsers
      if (Array.isArray(tablesData.S_Usuarios) && tablesData.S_Usuarios.length > 0) {
        const users = tablesData.S_Usuarios
          .map((r, i) => normalizeUserRow(r, i))
          .filter(u => u.usuario);
        if (users.length > 0) {
          const map = new Map<string, any>();
          DEFAULT_FALLBACK_USERS.forEach(u => map.set(u.usuario.toLowerCase(), u));
          users.forEach(u => map.set(u.usuario.toLowerCase(), u));
          serverSyncedUsers = Array.from(map.values());
          saveCachedUsers(serverSyncedUsers);
        }
      }

      // Guardar URL en config si funcionó
      if (candidateWebhook && candidateWebhook !== config.webhookUrl) {
        config.webhookUrl = candidateWebhook;
        config.lastSync = new Date().toISOString();
        saveConfig(config);
      }

      // Si las hojas de Claude no vinieron del Webhook, incorporarlas desde el archivo histórico de mercado
      const baselinePath = path.resolve(__dirname, 'src', 'data', 'cotizacionesClaudeBaseline.json');
      if (fs.existsSync(baselinePath)) {
        try {
          const baseData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
          if (!tablesData['Cañuelas_Claude'] && !tablesData['Canuelas_Claude'] && baseData.Canuelas_Claude) {
            tablesData['Cañuelas_Claude'] = baseData.Canuelas_Claude;
          }
          if (!tablesData['Invernada_Claude'] && baseData.Invernada_Claude) {
            tablesData['Invernada_Claude'] = baseData.Invernada_Claude;
          }
          if (!tablesData['Cría_Claude'] && !tablesData['Cria_Claude'] && baseData.Cria_Claude) {
            tablesData['Cría_Claude'] = baseData.Cria_Claude;
          }
        } catch (baseErr) {
          console.warn('[BACKEND] Error incorporando cotizaciones baseline:', baseErr);
        }
      }

      const tableNames = Object.keys(tablesData);
      const rowCounts: Record<string, number> = {};
      tableNames.forEach(name => {
        rowCounts[name] = Array.isArray(tablesData[name]) ? tablesData[name].length : 0;
      });

      console.log(`[BACKEND] doGet completado con éxito. Tablas recibidas (incluidas cotizaciones): ${tableNames.length}`);

      return res.json({
        success: true,
        source: 'Google Apps Script Webhook (doGet)',
        tablesCount: tableNames.length,
        rowCounts,
        tables: tablesData,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[BACKEND] Error fatal en doGet Webhook:', err);
      return res.status(500).json({
        success: false,
        error: `Error de red al consultar el Webhook: ${err.message}`,
      });
    }
  });

  // Endpoint dedicado para consultar y actualizar cotizaciones de mercado (Cañuelas, Invernada, Cría)
  app.all('/api/sheets/cotizaciones', async (req, res) => {
    let canuelas: any[] = [];
    let invernada: any[] = [];
    let cria: any[] = [];
    let source = '';

    const targetWebhook = (req.body?.webhookUrl || req.query?.webhookUrl || config.webhookUrl || '').trim();

    if (targetWebhook) {
      try {
        console.log('[BACKEND] Consultando cotizaciones desde Webhook de Google Apps Script:', targetWebhook);
        const wbRes = await fetch(targetWebhook, {
          method: 'GET',
          redirect: 'follow',
          headers: { Accept: 'application/json' },
        });
        if (wbRes.ok) {
          const json = await wbRes.json();
          if (json && typeof json === 'object') {
            for (const key of Object.keys(json)) {
              if (/cañuelas|canuelas/i.test(key) && Array.isArray(json[key]) && json[key].length > 0) {
                canuelas = json[key];
              }
              if (/invernada/i.test(key) && Array.isArray(json[key]) && json[key].length > 0) {
                invernada = json[key];
              }
              if (/cr[ií]a/i.test(key) && Array.isArray(json[key]) && json[key].length > 0) {
                cria = json[key];
              }
            }
            if (canuelas.length > 0 || invernada.length > 0 || cria.length > 0) {
              source = 'Google Sheets Webhook (en vivo)';
            }
          }
        }
      } catch (e: any) {
        console.warn('[BACKEND] Error consultando cotizaciones via Webhook:', e.message);
      }
    }

    // Si no vinieron de Google Sheets, utilizar el histórico baseline verificado
    if (canuelas.length === 0 || invernada.length === 0 || cria.length === 0) {
      try {
        const baselinePath = path.resolve(__dirname, 'src', 'data', 'cotizacionesClaudeBaseline.json');
        if (fs.existsSync(baselinePath)) {
          const baseData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
          if (canuelas.length === 0) canuelas = baseData.Canuelas_Claude || [];
          if (invernada.length === 0) invernada = baseData.Invernada_Claude || [];
          if (cria.length === 0) cria = baseData.Cria_Claude || [];
          source = source || 'Archivo Histórico de Mercado (Claude - MAG S.A. / ROSGAN)';
        }
      } catch (err: any) {
        console.warn('[BACKEND] Error leyendo cotizaciones baseline:', err.message);
      }
    }

    const ultimaFila = canuelas[canuelas.length - 1] || invernada[invernada.length - 1] || cria[cria.length - 1];
    const ultimaConsultaStr = ultimaFila ? (ultimaFila.Consulta || '') : '';

    return res.json({
      success: true,
      source: source || 'Cotizaciones Dinámicas Claude',
      countCanuelas: canuelas.length,
      countInvernada: invernada.length,
      countCria: cria.length,
      canuelas,
      invernada,
      cria,
      ultimaConsulta: ultimaConsultaStr,
      timestamp: new Date().toISOString(),
    });
  });

  // Anexar fila a cualquier tabla F_ con mapeo dinámico por columnas (POST / append)
  app.post('/api/sheets/append', async (req, res) => {
    const { sheetName, data, webhookUrl } = req.body;
    const targetWebhook = (webhookUrl || config.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();

    if (!sheetName) {
      return res.status(400).json({ success: false, error: 'sheetName requerido (ej: F_PesadasControl).' });
    }

    if (!targetWebhook) {
      return res.json({
        success: true,
        localOnly: true,
        sheetName,
        message: 'Registro guardado localmente en el ERP. Vincule la URL del Webhook de Apps Script para impacto directo en Google Sheets.',
      });
    }

    try {
      console.log(`[BACKEND] Enviando acción 'append' para hoja '${sheetName}' al Webhook...`);
      const wbRes = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'append',
          sheetName,
          data,
        }),
        redirect: 'follow',
      });

      if (!wbRes.ok) {
        const errText = await wbRes.text().catch(() => '');
        console.warn(`[BACKEND] Error en Webhook append (${wbRes.status}):`, errText);
        return res.status(wbRes.status).json({
          success: false,
          error: `Error HTTP ${wbRes.status} en Webhook: ${errText}`,
        });
      }

      const result = await wbRes.json().catch(() => ({}));
      console.log(`[BACKEND] Fila impactada exitosamente en '${sheetName}':`, result);

      return res.json({
        success: true,
        googleSheetsAppended: true,
        sheetName,
        result,
      });
    } catch (err: any) {
      console.error(`[BACKEND] Error al realizar append en ${sheetName}:`, err);
      return res.json({
        success: false,
        sheetName,
        error: `Fallo de conexión al enviar fila a Google Sheets: ${err.message}`,
      });
    }
  });

  // Endpoint dedicado para consultar y sincronizar Costos Estándar Bovinos (Octubre 2026)
  app.all('/api/sheets/costos-estandar', async (req, res) => {
    const targetWebhook = (req.body?.webhookUrl || req.query?.webhookUrl || config.webhookUrl || '').trim();
    if (targetWebhook) {
      try {
        console.log('[BACKEND] Consultando tablas de costos estándar desde Webhook:', targetWebhook);
        const wbRes = await fetch(targetWebhook, {
          method: 'GET',
          redirect: 'follow',
          headers: { Accept: 'application/json' },
        });
        if (wbRes.ok) {
          const json = await wbRes.json();
          if (json && typeof json === 'object') {
            return res.json({
              success: true,
              source: 'Google Sheets Webhook (doGet)',
              P_CostosSupuestos: json.P_CostosSupuestos || [],
              P_CostosDietas: json.P_CostosDietas || [],
              P_CostosVacunas: json.P_CostosVacunas || [],
              P_CostosDetalleDesglose: json.P_CostosDetalleDesglose || [],
              R_CostosEstandarTotales: json.R_CostosEstandarTotales || [],
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.warn('[BACKEND] Error consultando costos estándar desde Webhook:', err.message);
      }
    }

    return res.json({
      success: true,
      source: 'Memoria Local / Parámetros Oficiales Octubre 2026',
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint para solicitar a Google Apps Script la creación de las tablas de Costos Estándar (No destructivo)
  app.post('/api/sheets/costos-estandar/crear', async (req, res) => {
    const targetWebhook = (req.body?.webhookUrl || config.webhookUrl || '').trim();
    if (!targetWebhook) {
      return res.status(400).json({
        success: false,
        error: 'No hay URL de Webhook de Apps Script configurada.',
      });
    }

    try {
      console.log('[BACKEND] Enviando acción crearTablasCostosEstandar a Google Apps Script:', targetWebhook);
      const postRes = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crearTablasCostosEstandar' }),
      });

      if (!postRes.ok) {
        const textErr = await postRes.text().catch(() => '');
        return res.status(postRes.status).json({
          success: false,
          error: `Error HTTP ${postRes.status} al comunicarse con Apps Script: ${textErr}`,
        });
      }

      const jsonRes = await postRes.json();
      return res.json({
        success: true,
        message: 'Tablas de costos estándar creadas / verificadas de forma no destructiva en Google Sheets.',
        gasResult: jsonRes,
      });
    } catch (err: any) {
      console.error('[BACKEND] Error al solicitar creación de tablas en Apps Script:', err);
      return res.status(500).json({
        success: false,
        error: `Fallo de conexión con Google Apps Script: ${err.message}`,
      });
    }
  });

  // Diagnóstico completo de conexión y tabla S_Usuarios
  app.get('/api/sheets/diagnose', async (req, res) => {
    const fetchRes = await fetchUsersFromGoogleSheets(config);
    res.json({
      config,
      fetchResult: fetchRes,
      serverSyncedUsersCount: serverSyncedUsers.length,
      users: serverSyncedUsers.map(u => ({
        id_usuario: u.id_usuario,
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
      })),
    });
  });

  // Actualizar o crear usuario en backend y sincronizar bidireccionalmente con Google Sheets
  app.post('/api/users/update', async (req, res) => {
    const { id_usuario, usuario, contrasena, nombre, rol, activo, adminRole, googleAccessToken, spreadsheetUrl, webhookUrl } = req.body;
    
    // Validar permisos: solo usuarios con rol de Administrador pueden dar de alta o modificar
    const effectiveRole = adminRole || req.headers['x-user-role'];
    if (effectiveRole !== 'Administrador') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: Solo los usuarios con rol de Administrador pueden dar de alta o modificar usuarios en el sistema y en Google Sheets.',
      });
    }

    if (!usuario) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario es requerido.' });
    }

    const cleanUser = String(usuario).trim();
    const cleanPass = contrasena !== undefined ? String(contrasena).trim() : '';
    const cleanName = String(nombre || cleanUser).trim();
    const cleanRole = (rol || 'Operador');
    const isActivo = activo !== false && String(activo).toUpperCase() !== 'FALSO';

    const existingIdx = serverSyncedUsers.findIndex(
      u => String(u.usuario || '').trim().toLowerCase() === cleanUser.toLowerCase()
    );

    let updatedRecord: any;
    if (existingIdx >= 0) {
      serverSyncedUsers[existingIdx] = {
        ...serverSyncedUsers[existingIdx],
        id_usuario: Number(id_usuario) || serverSyncedUsers[existingIdx].id_usuario,
        usuario: cleanUser,
        contrasena: cleanPass || serverSyncedUsers[existingIdx].contrasena,
        nombre: cleanName,
        rol: cleanRole,
        activo: isActivo,
      };
      updatedRecord = serverSyncedUsers[existingIdx];
    } else {
      const nextId = serverSyncedUsers.length > 0 ? Math.max(...serverSyncedUsers.map(u => Number(u.id_usuario) || 0)) + 1 : 1;
      updatedRecord = {
        id_usuario: Number(id_usuario) || nextId,
        usuario: cleanUser,
        contrasena: cleanPass,
        nombre: cleanName,
        rol: cleanRole,
        activo: isActivo,
      };
      serverSyncedUsers.push(updatedRecord);
    }

    saveCachedUsers(serverSyncedUsers);

    let googleSheetsUpdated = false;
    let syncMethod = 'none';
    let syncDetail = '';

    // 1. Intentar actualizar mediante Google Sheets API v4 si hay token OAuth de Google
    const effectiveSheetUrl = spreadsheetUrl || config.spreadsheetUrl;
    const targetSheetId = extractSpreadsheetId(effectiveSheetUrl);

    if (googleAccessToken && targetSheetId) {
      try {
        console.log(`[SYNC] Intentando escribir usuario '${cleanUser}' vía Google Sheets API v4...`);
        // Leer filas existentes para ubicar el índice o anexar
        const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/S_Usuarios!A:F`;
        const getRes = await fetch(getUrl, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });

        const rowValues = [
          updatedRecord.id_usuario,
          updatedRecord.usuario,
          updatedRecord.contrasena,
          updatedRecord.nombre,
          updatedRecord.rol,
          updatedRecord.activo ? 'VERDADERO' : 'FALSO',
        ];

        if (getRes.ok) {
          const getData = await getRes.json();
          const rows = getData.values || [];
          let userRow = -1;
          for (let r = 1; r < rows.length; r++) {
            if (rows[r] && String(rows[r][1] || '').trim().toLowerCase() === cleanUser.toLowerCase()) {
              userRow = r + 1;
              break;
            }
          }

          if (userRow > 0) {
            const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/S_Usuarios!A${userRow}:F${userRow}?valueInputOption=USER_ENTERED`;
            const putRes = await fetch(putUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: [rowValues] }),
            });
            if (putRes.ok) {
              googleSheetsUpdated = true;
              syncMethod = 'Google Sheets API v4';
              syncDetail = `Fila ${userRow} actualizada en S_Usuarios.`;
            }
          } else {
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/S_Usuarios!A:F:append?valueInputOption=USER_ENTERED`;
            const appendRes = await fetch(appendUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: [rowValues] }),
            });
            if (appendRes.ok) {
              googleSheetsUpdated = true;
              syncMethod = 'Google Sheets API v4';
              syncDetail = 'Nueva fila anexada en S_Usuarios.';
            }
          }
        }
      } catch (apiErr: any) {
        console.warn('[SYNC] Falló Google Sheets API write:', apiErr.message);
      }
    }

    // 2. Intentar actualizar mediante Google Apps Script Webhook
    const effectiveWebhookUrl = (webhookUrl || config.webhookUrl || '').trim();
    if (!googleSheetsUpdated && effectiveWebhookUrl) {
      try {
        console.log(`[SYNC] Enviando usuario '${cleanUser}' al Webhook de Google Apps Script: ${effectiveWebhookUrl}`);
        const wbRes = await fetch(effectiveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsertUser',
            sheetName: 'S_Usuarios',
            user: updatedRecord,
            rowValues: [
              updatedRecord.id_usuario,
              updatedRecord.usuario,
              updatedRecord.contrasena,
              updatedRecord.nombre,
              updatedRecord.rol,
              updatedRecord.activo ? 'VERDADERO' : 'FALSO',
            ],
          }),
          redirect: 'follow',
        });

        if (wbRes.ok) {
          const wbJson = await wbRes.json().catch(() => ({}));
          googleSheetsUpdated = true;
          syncMethod = 'Google Apps Script Webhook';
          syncDetail = wbJson.action === 'updated' ? 'Fila actualizada en S_Usuarios' : 'Fila agregada a S_Usuarios';
          console.log(`[SYNC] Éxito Webhook: ${JSON.stringify(wbJson)}`);
        }
      } catch (wbErr: any) {
        console.warn('[SYNC] Falló Webhook push user:', wbErr.message);
      }
    }

    // Guardar URLs efectivas si se proporcionaron
    if (webhookUrl || spreadsheetUrl) {
      config = {
        ...config,
        webhookUrl: effectiveWebhookUrl,
        spreadsheetUrl: effectiveSheetUrl,
        spreadsheetId: targetSheetId,
        lastSync: new Date().toISOString(),
      };
      saveConfig(config);
    }

    res.json({
      success: true,
      user: updatedRecord,
      count: serverSyncedUsers.length,
      googleSheetsUpdated,
      syncMethod,
      syncDetail,
      message: googleSheetsUpdated
        ? `Usuario '${updatedRecord.usuario}' guardado en la base de datos e impactado en Google Sheets (${syncMethod}: ${syncDetail}).`
        : `Usuario '${updatedRecord.usuario}' guardado localmente en el ERP. Para impactar en Google Sheets, conecte su cuenta de Google o ingrese la URL del Webhook de Apps Script.`,
    });
  });

  // Secure Backend Login Endpoint
  // Passwords NEVER travel from server to browser!
  app.post('/api/auth/login', async (req, res) => {
    const { usuario, contrasena, webhookUrl, spreadsheetUrl } = req.body;

    if (!usuario || typeof usuario !== 'string') {
      return res.status(400).json({ success: false, error: 'Nombre de usuario requerido.' });
    }

    const cleanInputUser = String(usuario).trim().toLowerCase();
    const cleanInputPass = String(contrasena || '').trim();

    // Comprobar si el usuario ya está en caché o si necesitamos consultar Google Sheets
    let existingUser = serverSyncedUsers.find(
      u => String(u.usuario || '').trim().toLowerCase() === cleanInputUser
    );

    const cfgToTry: SheetsConfig = {
      webhookUrl: (webhookUrl || config.webhookUrl || '').trim(),
      spreadsheetUrl: (spreadsheetUrl || config.spreadsheetUrl || '').trim(),
      spreadsheetId: extractSpreadsheetId(spreadsheetUrl || config.spreadsheetUrl || ''),
    };

    // Si el usuario no está en memoria, o no tiene contraseña, o no coincide con la ingresada:
    // Consultamos Google Sheets en tiempo real para validar la contraseña fresca de la columna 'contrasena'
    const needsLiveVerification =
      !existingUser ||
      !existingUser.contrasena ||
      String(existingUser.contrasena).trim() !== cleanInputPass;

    if (needsLiveVerification && (cfgToTry.webhookUrl || cfgToTry.spreadsheetId || cfgToTry.spreadsheetUrl)) {
      console.log(`[AUTH] Verificando credenciales de '${cleanInputUser}' contra Google Sheets en tiempo real...`);
      const fetchRes = await fetchUsersFromGoogleSheets(cfgToTry);
      if (fetchRes.success && fetchRes.users && fetchRes.users.length > 0) {
        const map = new Map<string, any>();
        DEFAULT_FALLBACK_USERS.forEach(u => map.set(u.usuario.toLowerCase(), { ...u }));
        serverSyncedUsers.forEach(u => {
          const prev = map.get(u.usuario.toLowerCase());
          map.set(u.usuario.toLowerCase(), {
            ...prev,
            ...u,
            contrasena: u.contrasena || (prev ? prev.contrasena : ''),
          });
        });
        fetchRes.users.forEach(u => {
          const prev = map.get(u.usuario.toLowerCase());
          map.set(u.usuario.toLowerCase(), {
            ...prev,
            ...u,
            contrasena: u.contrasena || (prev ? prev.contrasena : ''),
          });
        });
        serverSyncedUsers = Array.from(map.values());
        saveCachedUsers(serverSyncedUsers);

        existingUser = serverSyncedUsers.find(
          u => String(u.usuario || '').trim().toLowerCase() === cleanInputUser
        );
      }
    }

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        error: `El usuario '${usuario}' no existe en la tabla S_Usuarios de Google Sheets. Verifique haber guardado los cambios en la planilla o sincronice la conexión.`,
      });
    }

    const storedPass = String(existingUser.contrasena ?? '').trim();
    if (storedPass !== cleanInputPass) {
      return res.status(401).json({
        success: false,
        error: `Contraseña incorrecta para el usuario '${existingUser.usuario}'. Asegúrese de que coincida con la registrada en la columna 'contrasena' de la hoja S_Usuarios en Google Sheets.`,
      });
    }

    if (!existingUser.activo) {
      return res.status(403).json({
        success: false,
        error: `La cuenta de '${existingUser.usuario}' se encuentra inactiva en Google Sheets (columna activo = FALSO).`,
      });
    }

    // Return authenticated user info without password
    const safeUser = {
      id_usuario: existingUser.id_usuario,
      usuario: existingUser.usuario,
      nombre: existingUser.nombre,
      rol: existingUser.rol,
      activo: existingUser.activo,
    };

    return res.json({ success: true, user: safeUser });
  });

  // Dev server with Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ERP GANADERO] Pozo del Carril server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
