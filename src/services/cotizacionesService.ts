/**
 * @license
 * Establecimiento: Pozo del Carril
 * Servicio de Cotizaciones Dinámicas de Mercado Ganadero
 * Integración con las 3 hojas de Google Sheets generadas por Claude:
 * - Cañuelas_Claude (Mercado Agroganadero S.A. - HTML)
 * - Invernada_Claude (ROSGAN / Bolsa de Comercio de Rosario - JSON)
 * - Cría_Claude (ROSGAN / Bolsa de Comercio de Rosario - JSON)
 */

import baselineData from '../data/cotizacionesClaudeBaseline.json';
import {
  CotizacionCanuelasRow,
  CotizacionInvernadaRow,
  CotizacionCriaRow,
  CotizacionVigente,
  AuditoriaPrecioUsado,
  ValuacionSubunidad,
  AjustePrecioManual,
  FuenteMercado,
} from '../types/cotizaciones';

const STORAGE_KEY_AJUSTES = 'erp_pozo_carril_ajustes_cotizaciones';

export class CotizacionesService {
  private canuelasRows: CotizacionCanuelasRow[] = [];
  private invernadaRows: CotizacionInvernadaRow[] = [];
  private criaRows: CotizacionCriaRow[] = [];
  private ajustesManuales: Record<string, AjustePrecioManual> = {};
  private lastSyncTime: string | null = null;
  private syncSource = 'Archivo Histórico de Mercado (Claude)';

  constructor() {
    this.cargarBaseline();
    this.cargarAjustesPersistidos();
  }

  private cargarBaseline() {
    try {
      this.canuelasRows = (baselineData.Canuelas_Claude as any[]) || [];
      this.invernadaRows = (baselineData.Invernada_Claude as any[]) || [];
      this.criaRows = (baselineData.Cria_Claude as any[]) || [];
      this.lastSyncTime = new Date().toISOString();
    } catch (e) {
      console.warn('[COTIZACIONES] Error cargando datos baseline:', e);
    }
  }

  private cargarAjustesPersistidos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AJUSTES);
      if (saved) {
        this.ajustesManuales = JSON.parse(saved);
      }
    } catch (e) {
      this.ajustesManuales = {};
    }
  }

  private persistirAjustes() {
    try {
      localStorage.setItem(STORAGE_KEY_AJUSTES, JSON.stringify(this.ajustesManuales));
    } catch (e) {}
  }

  /**
   * Carga datos actualizados desde Google Sheets
   */
  public updateFromSheets(sheetsData: {
    canuelas?: any[];
    invernada?: any[];
    cria?: any[];
    source?: string;
  }) {
    if (Array.isArray(sheetsData.canuelas) && sheetsData.canuelas.length > 0) {
      this.canuelasRows = sheetsData.canuelas;
    }
    if (Array.isArray(sheetsData.invernada) && sheetsData.invernada.length > 0) {
      this.invernadaRows = sheetsData.invernada;
    }
    if (Array.isArray(sheetsData.cria) && sheetsData.cria.length > 0) {
      this.criaRows = sheetsData.cria;
    }
    this.lastSyncTime = new Date().toISOString();
    if (sheetsData.source) {
      this.syncSource = sheetsData.source;
    }
  }

  public getRawCanuelas(): CotizacionCanuelasRow[] {
    return this.canuelasRows;
  }

  public getRawInvernada(): CotizacionInvernadaRow[] {
    return this.invernadaRows;
  }

  public getRawCria(): CotizacionCriaRow[] {
    return this.criaRows;
  }

  public getLastSync(): { time: string | null; source: string } {
    return { time: this.lastSyncTime, source: this.syncSource };
  }

  /**
   * Parsea fechas de formato "DD/MM/YYYY HH:mm" a timestamp
   */
  public parseConsultaTimestamp(str: string): number {
    if (!str) return 0;
    const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{1,2})/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const h = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      return new Date(y, mo, d, h, min).getTime();
    }
    const t = Date.parse(str);
    return isNaN(t) ? 0 : t;
  }

  /**
   * Comprueba si una fecha corresponde al día de hoy
   */
  public esFechaHoy(strConsulta: string): boolean {
    if (!strConsulta) return false;
    const ts = this.parseConsultaTimestamp(strConsulta);
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  /**
   * Obtiene la cotización más reciente de una categoría en Cañuelas_Claude
   * Si hay PROVISORIOS y DEFINITIVOS de la misma rueda, prefiere DEFINITIVOS.
   */
  public getVigenteCanuelas(categoriaBusqueda: string): CotizacionCanuelasRow | null {
    const term = categoriaBusqueda.trim().toLowerCase();
    const rows = this.canuelasRows.filter(r =>
      String(r.Categoría || '').trim().toLowerCase().includes(term)
    );
    if (rows.length === 0) return null;

    // Ordenar por Consulta desc
    rows.sort((a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta));

    // Si el primero es PROVISORIOS, buscar si hay DEFINITIVOS para la misma fecha de rueda
    const top = rows[0];
    if (String(top.Estado).toUpperCase().includes('PROVISORIO')) {
      const def = rows.find(
        r => r['Fecha rueda'] === top['Fecha rueda'] && String(r.Estado).toUpperCase().includes('DEFINITIVO')
      );
      if (def) return def;
    }

    return top;
  }

  /**
   * Obtiene la cotización más reciente de Invernada_Claude (ROSGAN $/kg)
   */
  public getVigenteInvernada(categoriaBusqueda: string): CotizacionInvernadaRow | null {
    const term = categoriaBusqueda.trim().toLowerCase();
    const rows = this.invernadaRows.filter(r =>
      String(r.Categoría || '').trim().toLowerCase().includes(term)
    );
    if (rows.length === 0) return null;

    rows.sort((a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta));
    return rows[0];
  }

  /**
   * Obtiene la cotización más reciente de Cría_Claude (ROSGAN $/animal)
   */
  public getVigenteCria(categoriaBusqueda: string): CotizacionCriaRow | null {
    const term = categoriaBusqueda.trim().toLowerCase();
    const rows = this.criaRows.filter(r =>
      String(r.Categoría || '').trim().toLowerCase().includes(term)
    );
    if (rows.length === 0) return null;

    rows.sort((a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta));
    return rows[0];
  }

  /**
   * Obtiene los indicadores generales de mercado
   */
  public getIndicadoresMercado(): {
    inmagCanuelas: number;
    indiceTerneroRosgan: number;
    piriRosgan: number;
    pircRosgan: number;
    vientresPrendadosCria: number;
    novilloGordoCanuelas: number;
    ultimaConsulta: string;
    desactualizado: boolean;
    estadoCanuelas: string;
  } {
    // INMAG de la última rueda de Cañuelas
    const canuelasSort = [...this.canuelasRows].sort(
      (a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta)
    );
    const topCanuelas = canuelasSort[0];
    const inmag = topCanuelas ? Number(topCanuelas['INMAG rueda']) || 0 : 0;
    const estadoCanuelas = topCanuelas ? String(topCanuelas.Estado) : 'DEFINITIVOS';

    // Novillo gordo Cañuelas
    const novillo = this.getVigenteCanuelas('NOVILLOS Esp.Joven + 430');
    const novilloPrice = novillo ? Number(novillo['Precio Prom.']) || 0 : 0;

    // Invernada Rosgan
    const invSort = [...this.invernadaRows].sort(
      (a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta)
    );
    const topInv = invSort[0];
    const indiceTernero = topInv ? Number(topInv['Índice ternero']) || 0 : 0;
    const piri = topInv ? Number(topInv.PIRI) || 0 : 0;

    // Cría Rosgan
    const criaSort = [...this.criaRows].sort(
      (a, b) => this.parseConsultaTimestamp(b.Consulta) - this.parseConsultaTimestamp(a.Consulta)
    );
    const topCria = criaSort[0];
    const pirc = topCria ? Number(topCria.PIRC) || 0 : 0;

    const vientre = this.getVigenteCria('Vientres con garantía de preñez');
    const vientrePrice = vientre ? Number(vientre['Precio $/animal']) || 0 : 0;

    const ultimaConsulta = topCanuelas?.Consulta || topInv?.Consulta || topCria?.Consulta || '';
    const desactualizado = !this.esFechaHoy(ultimaConsulta);

    return {
      inmagCanuelas: inmag,
      indiceTerneroRosgan: indiceTernero,
      piriRosgan: piri,
      pircRosgan: pirc,
      vientresPrendadosCria: vientrePrice,
      novilloGordoCanuelas: novilloPrice,
      ultimaConsulta,
      desactualizado,
      estadoCanuelas,
    };
  }

  /**
   * Resuelve la cotización VIGENTE para una categoría en una subunidad específica,
   * respetando el árbol de asignación de fuentes oficiales:
   * - Cría: Cría_Claude ($/animal) para vientres/reproductores y/o Invernada_Claude para ternero ($/kg)
   * - Recría / Adaptación: Invernada_Claude ($/kg)
   * - Engorde / Venta terminada: Cañuelas_Claude ($/kg vivo)
   */
  public getCotizacionParaCategoria(
    id_categoria: number,
    nombre_categoria: string,
    id_subunidad: number,
    nombre_subunidad: string
  ): CotizacionVigente | null {
    // 1. Verificar si existe ajuste manual activo
    const keyAjuste = `${id_categoria}_${id_subunidad}`;
    const ajuste = this.ajustesManuales[keyAjuste];

    const nomCat = nombre_categoria.trim().toLowerCase();

    // Mapeo dinámico según la etapa / subunidad:
    let fuente: FuenteMercado = 'Cañuelas_Claude';
    let catFuente = '';
    let unidad_medida: '$/kg' | '$/animal' = '$/kg';
    let precio = 0;
    let min: number | undefined;
    let max: number | undefined;
    let prom: number | undefined;
    let med: number | undefined;
    let fechaRueda = '';
    let estado: 'DEFINITIVOS' | 'PROVISORIOS' = 'DEFINITIVOS';
    let consulta = '';

    // A. SUBUNIDAD 1: CRÍA (Terneros/as, Vacas, Vaquillonas, Toros)
    if (id_subunidad === 1) {
      if (nomCat.includes('ternero') && !nomCat.includes('ternera')) {
        // Ternero macho destete
        fuente = 'Invernada_Claude';
        catFuente = 'Terneros';
        unidad_medida = '$/kg';
        const row = this.getVigenteInvernada('Terneros');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('ternera')) {
        // Ternera hembra destete
        fuente = 'Invernada_Claude';
        catFuente = 'Terneras';
        unidad_medida = '$/kg';
        const row = this.getVigenteInvernada('Terneras');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('destete')) {
        fuente = 'Invernada_Claude';
        catFuente = 'Terneros/as';
        unidad_medida = '$/kg';
        const row = this.getVigenteInvernada('Terneros/as');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('preñada') || nomCat.includes('prenada')) {
        // Vientre con garantía de preñez (Cría_Claude $/animal)
        fuente = 'Cría_Claude';
        catFuente = 'Vientres con garantía de preñez';
        unidad_medida = '$/animal';
        const row = this.getVigenteCria('Vientres con garantía de preñez');
        if (row) {
          precio = Number(row['Precio $/animal']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaca') && nomCat.includes('seca')) {
        // Vaca seca / invernada
        fuente = 'Invernada_Claude';
        catFuente = 'Vacas de invernada';
        unidad_medida = '$/kg';
        const row = this.getVigenteInvernada('Vacas de invernada');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaca')) {
        // Vaca adulta de cría (vientre con garantía o con cría al pie)
        fuente = 'Cría_Claude';
        catFuente = 'Vientres con garantía de preñez';
        unidad_medida = '$/animal';
        const row = this.getVigenteCria('Vientres con garantía de preñez') || this.getVigenteCria('Vacas con cría al pie');
        if (row) {
          precio = Number(row['Precio $/animal']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaquillon')) {
        // Vaquillona de reposición / cría
        fuente = 'Cría_Claude';
        catFuente = 'Vientres con garantía de preñez';
        unidad_medida = '$/animal';
        const rowCria = this.getVigenteCria('Vientres con garantía de preñez');
        if (rowCria && Number(rowCria['Precio $/animal']) > 0) {
          precio = Number(rowCria['Precio $/animal']) || 0;
          fechaRueda = rowCria['Fecha remate'] || '';
          consulta = rowCria.Consulta || '';
        } else {
          fuente = 'Invernada_Claude';
          catFuente = 'Vaquillonas de invernada';
          unidad_medida = '$/kg';
          const rowInv = this.getVigenteInvernada('Vaquillonas de invernada');
          if (rowInv) {
            precio = Number(rowInv['Precio $/kg']) || 0;
            fechaRueda = rowInv['Fecha remate'] || '';
            consulta = rowInv.Consulta || '';
          }
        }
      } else if (nomCat.includes('toro')) {
        // Toro reproductor: referencia de Cañuelas TOROS Esp. ($/kg)
        fuente = 'Cañuelas_Claude';
        catFuente = 'TOROS Esp.';
        unidad_medida = '$/kg';
        const row = this.getVigenteCanuelas('TOROS Esp.');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      }
    }
    // B. SUBUNIDAD 2: RECRÍA & SUBUNIDAD 3: ADAPTACIÓN (Invernada ROSGAN $/kg)
    else if (id_subunidad === 2 || id_subunidad === 3) {
      fuente = 'Invernada_Claude';
      unidad_medida = '$/kg';

      if (nomCat.includes('novillito') || nomCat.includes('novillo 1')) {
        catFuente = 'Novillos 1 a 2 años';
        const row = this.getVigenteInvernada('Novillos 1 a 2 años');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('novillo')) {
        catFuente = 'Novillos 2 a 3 años';
        const row = this.getVigenteInvernada('Novillos 2 a 3 años') || this.getVigenteInvernada('Novillos 1 a 2 años');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaquillon')) {
        catFuente = 'Vaquillonas de invernada';
        const row = this.getVigenteInvernada('Vaquillonas de invernada');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('ternero') && !nomCat.includes('ternera')) {
        catFuente = 'Terneros';
        const row = this.getVigenteInvernada('Terneros');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('ternera')) {
        catFuente = 'Terneras';
        const row = this.getVigenteInvernada('Terneras');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      } else {
        catFuente = 'Novillos 1 a 2 años';
        const row = this.getVigenteInvernada('Novillos 1 a 2 años');
        if (row) {
          precio = Number(row['Precio $/kg']) || 0;
          fechaRueda = row['Fecha remate'] || '';
          consulta = row.Consulta || '';
        }
      }
    }
    // C. SUBUNIDAD 4: ENGORDE / TERMINACIÓN (Venta terminada - Cañuelas $/kg vivo)
    else {
      fuente = 'Cañuelas_Claude';
      unidad_medida = '$/kg';

      if (nomCat.includes('novillo') && !nomCat.includes('novillito')) {
        catFuente = 'NOVILLOS Esp.Joven + 430';
        const row = this.getVigenteCanuelas('NOVILLOS Esp.Joven + 430');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('novillito')) {
        catFuente = 'NOVILLITOS Esp. h 390';
        const row = this.getVigenteCanuelas('NOVILLITOS Esp. h 390');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaquillon')) {
        catFuente = 'VAQUILLONAS Esp. h 390';
        const row = this.getVigenteCanuelas('VAQUILLONAS Esp. h 390');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('vaca')) {
        catFuente = 'VACAS Regular';
        const row = this.getVigenteCanuelas('VACAS Regular');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      } else if (nomCat.includes('toro')) {
        catFuente = 'TOROS Esp.';
        const row = this.getVigenteCanuelas('TOROS Esp.');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      } else {
        catFuente = 'NOVILLITOS Esp. h 390';
        const row = this.getVigenteCanuelas('NOVILLITOS Esp. h 390');
        if (row) {
          precio = Number(row['Precio Prom.']) || 0;
          min = Number(row['Precio Mín.']) || 0;
          max = Number(row['Precio Máx.']) || 0;
          prom = precio;
          med = Number(row.Mediana) || 0;
          fechaRueda = row['Fecha rueda'] || '';
          estado = String(row.Estado).toUpperCase().includes('PROVISORIO') ? 'PROVISORIOS' : 'DEFINITIVOS';
          consulta = row.Consulta || '';
        }
      }
    }

    // Si hay un ajuste manual vigente para esta categoría y subunidad:
    let esAjusteManual = false;
    let motivoAjuste: string | undefined;
    let usuarioAjuste: string | undefined;

    if (ajuste && ajuste.precio_nuevo > 0) {
      precio = ajuste.precio_nuevo;
      fuente = 'Ajuste Manual';
      esAjusteManual = true;
      motivoAjuste = ajuste.motivo;
      usuarioAjuste = ajuste.usuario;
    }

    // Determinar si el precio está desactualizado respecto al día actual
    const desactualizado = !esAjusteManual && !this.esFechaHoy(consulta);
    const alerta_desactualizado = desactualizado
      ? `Precio desactualizado, última consulta: ${consulta}`
      : undefined;

    return {
      categoria_erp: nombre_categoria,
      id_categoria,
      subunidad_nombre: nombre_subunidad,
      id_subunidad,
      fuente,
      categoria_fuente: catFuente,
      unidad_medida,
      precio_vigente: precio,
      precio_minimo: min,
      precio_maximo: max,
      precio_promedio: prom,
      mediana: med,
      fecha_rueda_remate: fechaRueda,
      estado,
      consulta,
      es_ajuste_manual: esAjusteManual,
      motivo_ajuste: motivoAjuste,
      usuario_ajuste: usuarioAjuste,
      desactualizado,
      alerta_desactualizado,
    };
  }

  /**
   * Establece un reemplazo manual de cotización
   */
  public setAjusteManual(
    id_categoria: number,
    id_subunidad: number,
    precio: number,
    motivo: string,
    usuario = 'admin'
  ) {
    const key = `${id_categoria}_${id_subunidad}`;
    this.ajustesManuales[key] = {
      id_categoria,
      id_subunidad,
      precio_nuevo: precio,
      motivo,
      usuario,
      fecha: new Date().toISOString(),
    };
    this.persistirAjustes();
  }

  /**
   * Elimina un ajuste manual para volver a la cotización automática de mercado
   */
  public revertirAjusteManual(id_categoria: number, id_subunidad: number) {
    const key = `${id_categoria}_${id_subunidad}`;
    delete this.ajustesManuales[key];
    this.persistirAjustes();
  }

  /**
   * Genera el objeto de auditoría para guardar en tablas de hechos (F_)
   */
  public buildAuditoria(cot: CotizacionVigente): AuditoriaPrecioUsado {
    return {
      precio_usado: cot.precio_vigente,
      unidad_medida: cot.unidad_medida,
      fuente: cot.fuente,
      categoria_mercado: cot.categoria_fuente,
      fecha_rueda_remate: cot.fecha_rueda_remate,
      estado: cot.estado,
      fecha_hora_consulta: cot.consulta,
      es_ajuste_manual: cot.es_ajuste_manual,
      motivo_ajuste: cot.motivo_ajuste,
      timestamp_calculo: new Date().toISOString(),
    };
  }
}

export const cotizacionesService = new CotizacionesService();
