/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Establecimiento: Pozo del Carril
 * Proyecto: "Activos con cuatro patas: contabilidad aplicada a la actividad bovina"
 * Trabajo Práctico: Taller de Práctica II (Año 2026)
 * Integrantes: Aguilera Julieta, Albornoz Milena, Garello Santiago, Lepori Paula, Olmos Santiago, Zabala Micaela.
 *
 * Arquitectura 100% Paramétrica por id_unidad_neg (Multi-Especie: Bovinos, Porcinos, Ovinos)
 * Integración Bidireccional en Vivo con Google Sheets (doGet 20 tablas & POST append con mapeo dinámico)
 */

import React, { useState, useEffect } from 'react';
import { db } from './services/dbEngine';
import { RolUsuario } from './types/database';
import { Sidebar, ActiveModule } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';

// Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { MaestrosModule } from './components/modules/MaestrosModule';
import { HaciendaIndividualModule } from './components/modules/HaciendaIndividualModule';
import { ParametrosModule } from './components/modules/ParametrosModule';
import { MovimientosModule } from './components/modules/MovimientosModule';
import { PesadasModule } from './components/modules/PesadasModule';
import { AlimentacionModule } from './components/modules/AlimentacionModule';
import { SanidadModule } from './components/modules/SanidadModule';
import { VentasModule } from './components/modules/VentasModule';
import { CostosIndirectosModule } from './components/modules/CostosIndirectosModule';
import { CostosEstandarModule } from './components/modules/CostosEstandarModule';
import { ResultadosModule } from './components/modules/ResultadosModule';
import { CotizacionesModule } from './components/modules/CotizacionesModule';
import { IntegridadModule } from './components/modules/IntegridadModule';
import { GoogleSheetsModule } from './components/modules/GoogleSheetsModule';
import { UsuariosAuditoriaModule } from './components/modules/UsuariosAuditoriaModule';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{
    id_usuario: number;
    usuario: string;
    nombre: string;
    rol: RolUsuario;
    activo: boolean;
  } | null>(null);

  const [currentModule, setCurrentModule] = useState<ActiveModule>('dashboard');
  
  // Selector Paramétrico Global de Especie / Unidad de Negocio (1 = Bovinos, 2 = Porcinos, 3 = Ovinos)
  const [selectedUnidadNegId, setSelectedUnidadNegId] = useState<number>(1);
  const [selectedSubunidadId, setSelectedSubunidadId] = useState<number | 'all'>('all');
  const [selectedCampanaId, setSelectedCampanaId] = useState<number | 'all'>('all');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);
  const [refreshToastMsg, setRefreshToastMsg] = useState<string>('Datos sincronizados con Google Sheets correctamente.');
  const [refreshToastType, setRefreshToastType] = useState<'success' | 'warning'>('success');
  const [integrityErrorCount, setIntegrityErrorCount] = useState(0);

  const [state, setState] = useState(db.getState());

  // Subscribe to db state changes
  useEffect(() => {
    const update = () => {
      setState(db.getState());
      const errors = db.runIntegrityAudit();
      setIntegrityErrorCount(errors.length);
    };

    update();
    const unsubscribe = db.subscribe(update);

    // Intentar sincronización en segundo plano al montar si hay URL configurada
    const cfg = db.getSheetsConfig();
    if (cfg.webhookUrl) {
      db.fetchAndSyncAllTables(cfg.webhookUrl).catch(() => {});
    }

    return () => unsubscribe();
  }, []);

  // Actualización manual mediante doGet de las 20 tablas de Google Sheets
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setRefreshToast(true);

    try {
      const res = await db.fetchAndSyncAllTables();
      if (res.success) {
        setRefreshToastType('success');
        setRefreshToastMsg(res.message || '20 tablas sincronizadas desde Google Sheets exitosamente.');
      } else {
        setRefreshToastType('warning');
        setRefreshToastMsg(res.error || 'No se pudo contactar a Google Sheets. Utilizando datos locales.');
      }
    } catch (e: any) {
      setRefreshToastType('warning');
      setRefreshToastMsg('Error de red al consultar el Webhook de Google Sheets.');
    } finally {
      setIsRefreshing(false);
      const errors = db.runIntegrityAudit();
      setIntegrityErrorCount(errors.length);
      setTimeout(() => setRefreshToast(false), 3500);
    }
  };

  const handleSelectUnidadNeg = (id: number) => {
    setSelectedUnidadNegId(id);
    setSelectedSubunidadId('all');
  };

  const handleLoginSuccess = () => {
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user as any);
    }
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
  };

  // Filtrado paramétrico dinámico según id_unidad_neg
  const availableSubunidades = state.D_Subunidad.filter(
    s => Number(s.id_unidad_neg) === Number(selectedUnidadNegId) && s.activo !== false
  );

  const availableCategorias = state.D_CategoriaHacienda.filter(
    c => Number(c.id_unidad_neg) === Number(selectedUnidadNegId) && c.activo !== false
  );

  // Helper titles
  const moduleTitles: Record<ActiveModule, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Tablero de Control - Inicio',
      subtitle: 'Matriz ejecutiva de 11 indicadores clave (KPIs) con metas y semáforos dinámicos',
    },
    maestros: {
      title: 'Catálogos y Tablas Maestras (D_)',
      subtitle: 'Administración de subunidades, categorías, insumos, cuentas contables y unidades de medida',
    },
    hacienda_individual: {
      title: 'Hacienda Individual y Cabaña Angus',
      subtitle: 'Trazabilidad dual por caravana visual y chip RFID, genealogía e historial clínico',
    },
    parametros: {
      title: 'Parámetros Técnicos y Proyección (P_)',
      subtitle: 'Metas técnicas de ADPV, dosis nutricionales independientes y simulador de engorde a corral',
    },
    movimientos: {
      title: 'Movimientos de Hacienda y Existencias (F_MovimientosHacienda)',
      subtitle: 'Planilla automatizada de inventario vacuno con validación anti-stocks negativos',
    },
    pesadas: {
      title: 'Control Periódico de Pesadas en Balanza (F_PesadasControl)',
      subtitle: 'Determinación de ganancias efectivas de peso y cálculo de ADPV real',
    },
    alimentacion: {
      title: 'Alimentación y Stock de Insumos (F_ComprasInsumos & F_ConsumosReales)',
      subtitle: 'Ingreso valorizado de granos/forrajes y suministro físico en mixer con control de saldo',
    },
    sanidad: {
      title: 'Sanidad y Protocolos Veterinarios (F_SanidadReal)',
      subtitle: 'Registro oficial de actas de vacunación SENASA, aplicaciones y honorarios veterinarios',
    },
    ventas: {
      title: 'Liquidación de Ventas de Hacienda (F_VentasHacienda)',
      subtitle: 'Determinación de Venta Neta según RT 22 / RT 54 deduciendo gastos feriales y fletes',
    },
    costos_indirectos: {
      title: 'Costos Indirectos y Prorrateo (F_CostosIndirectos)',
      subtitle: 'Distribución técnica de erogaciones comunes del campo hacia las subunidades productivas',
    },
    costos_estandar: {
      title: 'Costos Estándar por Subunidad',
      subtitle: 'Matriz paramétrica de alimentación, sanidad y costos directos de la actividad bovina',
    },
    cotizaciones: {
      title: 'Cotizaciones de Mercado Ganadero (Precios Dinámicos)',
      subtitle: 'Lectura acumulativa en tiempo real de Cañuelas_Claude, Invernada_Claude y Cría_Claude',
    },
    resultados: {
      title: 'Vistas de Resultados y Control de Gestión (Capa R_)',
      subtitle: 'Márgenes brutos, desvíos físicos y consolidación con neutralización de transferencias internas',
    },
    integridad: {
      title: 'Control de Integridad Referencial (Sección 4.1)',
      subtitle: 'Detección proactiva de inconsistencias, caravanas duplicadas y claves foráneas huérfanas',
    },
    google_sheets: {
      title: 'Integración y Sincronización Google Sheets',
      subtitle: 'Configuración de base de datos única, asistente paso a paso y webhook automatizado',
    },
    usuarios_auditoria: {
      title: 'Usuarios y Bitácora de Auditoría (S_)',
      subtitle: 'Seguridad en backend, control de roles y registro inmutable de transacciones',
    },
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 antialiased font-sans">
      {/* Login Modal Overlay if not logged in */}
      {!currentUser && <LoginModal onSuccess={handleLoginSuccess} />}

      {/* Main Layout if logged in */}
      {currentUser && (
        <>
          {/* Sidebar */}
          <Sidebar
            currentModule={currentModule}
            onSelectModule={setCurrentModule}
            currentUser={currentUser}
            onLogout={handleLogout}
            onRefresh={handleManualRefresh}
            integrityErrorCount={integrityErrorCount}
          />

          {/* Main Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header Global con Selector Paramétrico de Especie / U.N. */}
            <Header
              title={moduleTitles[currentModule].title}
              subtitle={moduleTitles[currentModule].subtitle}
              unidadesNeg={state.D_UnidadNeg}
              selectedUnidadNegId={selectedUnidadNegId}
              onSelectUnidadNeg={handleSelectUnidadNeg}
              subunidades={availableSubunidades}
              selectedSubunidadId={selectedSubunidadId}
              onSelectSubunidad={setSelectedSubunidadId}
              campanas={state.D_Campana}
              selectedCampanaId={selectedCampanaId}
              onSelectCampana={setSelectedCampanaId}
              onRefresh={handleManualRefresh}
              isRefreshing={isRefreshing}
              integrityErrorCount={integrityErrorCount}
              onOpenIntegrity={() => setCurrentModule('integridad')}
            />

            {/* Refresh Toast Notification */}
            {refreshToast && (
              <div
                className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-semibold animate-fade-in ${
                  refreshToastType === 'success'
                    ? 'bg-[#1B4D3E] text-white border-emerald-500'
                    : 'bg-amber-800 text-white border-amber-600'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{refreshToastMsg}</span>
              </div>
            )}

            {/* Scrollable Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto pb-12">
                {currentModule === 'dashboard' && (
                  <DashboardModule
                    selectedSubunidadId={selectedSubunidadId}
                    selectedCampanaId={selectedCampanaId}
                    onNavigate={setCurrentModule}
                    selectedUnidadNegId={selectedUnidadNegId}
                    onSelectUnidadNeg={handleSelectUnidadNeg}
                  />
                )}
                {currentModule === 'maestros' && <MaestrosModule />}
                {currentModule === 'hacienda_individual' && <HaciendaIndividualModule />}
                {currentModule === 'parametros' && <ParametrosModule />}
                {currentModule === 'movimientos' && (
                  <MovimientosModule
                    selectedUnidadNegId={selectedUnidadNegId}
                    availableSubunidades={availableSubunidades}
                    availableCategorias={availableCategorias}
                  />
                )}
                {currentModule === 'pesadas' && (
                  <PesadasModule
                    selectedUnidadNegId={selectedUnidadNegId}
                    availableSubunidades={availableSubunidades}
                  />
                )}
                {currentModule === 'alimentacion' && (
                  <AlimentacionModule
                    selectedUnidadNegId={selectedUnidadNegId}
                    availableSubunidades={availableSubunidades}
                  />
                )}
                {currentModule === 'sanidad' && (
                  <SanidadModule
                    selectedUnidadNegId={selectedUnidadNegId}
                    availableSubunidades={availableSubunidades}
                  />
                )}
                {currentModule === 'ventas' && (
                  <VentasModule
                    selectedUnidadNegId={selectedUnidadNegId}
                    availableSubunidades={availableSubunidades}
                    availableCategorias={availableCategorias}
                  />
                )}
                {currentModule === 'costos_indirectos' && <CostosIndirectosModule />}
                {currentModule === 'costos_estandar' && <CostosEstandarModule />}
                {currentModule === 'cotizaciones' && <CotizacionesModule />}
                {currentModule === 'resultados' && (
                  <ResultadosModule
                    selectedSubunidadId={selectedSubunidadId}
                    selectedCampanaId={selectedCampanaId}
                  />
                )}
                {currentModule === 'integridad' && <IntegridadModule />}
                {currentModule === 'google_sheets' && (
                  <GoogleSheetsModule currentUserRole={currentUser.rol} />
                )}
                {currentModule === 'usuarios_auditoria' && (
                  <UsuariosAuditoriaModule currentUserRole={currentUser.rol} />
                )}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}
