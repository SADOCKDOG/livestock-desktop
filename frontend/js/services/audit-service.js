/**
 * LIVESTOCK MANAGER - AUDIT SERVICE v1.0.0
 * Subsistema transversal de auditoría offline-first y trazabilidad de actividad.
 * Implementa persistencia append-only en IndexedDB ('registro_eventos'), lista blanca estricta,
 * saneamiento de secretos, modo tolerante ante fallos y deduplicación por ventana temporal.
 */

(function (global) {
  'use strict';

  // Lista blanca de entidades y acciones autorizadas
  const ALLOWED_ENTITIES = new Set([
    'animal',
    'botiquin',
    'pesaje',
    'config',
    'sesion',
    'sistema',
    'backup',
    'tratamiento',
    'venta',
    'gasto',
    'finca',
    'comprador',
    'proveedor',
    'contrato',
    'saneamiento',
    'vacunacion',
    'movimiento',
    'general'
  ]);

  const ALLOWED_ACTIONS = new Set([
    'CREATE',
    'UPDATE',
    'DELETE_LOGICAL',
    'CONFIG_CHANGE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT'
  ]);

  // Patrón para detectar y redactar posibles secretos (tokens, hashes >32 hex, jwt, passwords)
  const SENSITIVE_PATTERN = /(Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)|([A-Za-z0-9_-]{32,})|(password|token|secret|clave|jwt)[\s:=]+([^\s,;]+)/gi;

  const AuditService = {
    _failureCount: 0,
    _recentFailures: [],
    _recentOperations: new Map(), // Clave de idempotencia -> { timestamp, id }
    _listenersInitialized: false,

    /**
     * Escapa caracteres especiales HTML para prevenir ataques XSS al renderizar en la vista.
     */
    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * Calcula un hash de integridad determinista sobre campos invariantes.
     * NOTA DE LIMITACIÓN DE SEGURIDAD:
     * Este hash es una comprobación de integridad a nivel de aplicación (permite detectar
     * corrupciones o modificaciones locales accidentales en el almacenamiento del cliente).
     * NO constituye una garantía criptográfica WORM de hardware ni una firma digital PKI de servidor.
     */
    computeIntegrityHash(record) {
      const canonicalStr = [
        record.fincaId ?? 'null',
        record.creadoEn ?? '',
        record.actor_id ?? '',
        record.action ?? '',
        record.tipo_entidad ?? '',
        record.entidad_id ?? '',
        record.motivo_tarea ?? '',
        record.resultado ?? ''
      ].join('|');

      let hash = 0x811c9dc5;
      for (let i = 0; i < canonicalStr.length; i++) {
        hash ^= canonicalStr.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    },

    /**
     * Sanea el actor_id minimizando identificadores personales (PII).
     * Evita almacenar direcciones de correo completas o identificadores crudos no autorizados.
     */
    _sanitizeActorId(actorId, actorType) {
      if (actorType === 'system_service') {
        const clean = String(actorId || 'servicio_interno').replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 40);
        return clean || 'servicio_interno';
      }
      if (!actorId) return 'operador_local';

      const str = String(actorId).trim();
      // Si parece un correo electrónico, enmascarar la parte local
      if (str.includes('@')) {
        const parts = str.split('@');
        const user = parts[0];
        const domain = parts[1] || 'local';
        const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user + '***';
        return (maskedUser + '@' + domain).slice(0, 40);
      }

      // Alfanumérico limpio
      const clean = str.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 40);
      return clean || 'operador_local';
    },

    /**
     * Sanea y minimiza la descripción textual, eliminando secretos potenciales.
     */
    _sanitizeDescription(desc) {
      if (!desc) return 'Operación de sistema registrada';
      let clean = String(desc).replace(SENSITIVE_PATTERN, '[REDACTED]').trim();
      return clean.slice(0, 120);
    },

    /**
     * Sanea y valida la lista blanca de campos modificados (fields_modified).
     * REGLA DE INTEGRIDAD: No inventa campos si no se suministran explícitamente.
     */
    _sanitizeFieldsModified(fields) {
      if (!Array.isArray(fields) || fields.length === 0) return undefined;
      const cleanList = fields
        .filter(f => typeof f === 'string' && f.trim().length > 0)
        .map(f => f.trim().replace(/[^a-zA-Z0-9_\.]/g, '').slice(0, 30))
        .slice(0, 10);
      return cleanList.length > 0 ? cleanList : undefined;
    },

    /**
     * Registra un evento de auditoría de forma tolerante (no bloqueante para el negocio).
     * @param {Object} opts Parámetros de auditoría conformes con la lista blanca.
     * @returns {Promise<{success: boolean, id?: number, reason?: string, deduplicated?: boolean}>}
     */
    async record(opts) {
      if (!opts || typeof opts !== 'object') {
        return { success: false, reason: 'INVALID_OPTIONS' };
      }

      try {
        const now = new Date();
        const fechaLocal = now.toISOString().split('T')[0];
        const creadoEnIso = now.toISOString();

        // 1. Normalización de campos conforme a la lista blanca
        const actorType = opts.actor_type === 'system_service' ? 'system_service' : 'user';
        const actorId = this._sanitizeActorId(opts.actor_id, actorType);
        const action = ALLOWED_ACTIONS.has(opts.action) ? opts.action : 'UPDATE';
        const tipoEntidad = ALLOWED_ENTITIES.has(opts.tipo_entidad) ? opts.tipo_entidad : 'general';
        const entidadId = opts.entidad_id != null ? String(opts.entidad_id).slice(0, 64) : 'general';
        const motivoTarea = String(opts.motivo_tarea || 'operacion_sistema').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
        const resultado = ['SUCCESS', 'WARNING', 'FAILED'].includes(opts.resultado) ? opts.resultado : 'SUCCESS';
        const descripcion = this._sanitizeDescription(opts.descripcion);
        const fieldsModified = this._sanitizeFieldsModified(opts.fields_modified);
        const fincaId = (opts.fincaId !== undefined && opts.fincaId !== null) ? opts.fincaId : 'global';

        // 2. Control de Idempotencia y Deduplicación Inteligente
        // Clave unívoca: finca + tipo_entidad + entidad_id + action + motivo_tarea
        // No descarta operaciones si la entidad_id es diferente (evita descartar altas legítimas continuas)
        const idempotencyKey = `${fincaId}:${tipoEntidad}:${entidadId}:${action}:${motivoTarea}`;
        const lastOp = this._recentOperations.get(idempotencyKey);
        const nowMs = Date.now();

        if (lastOp && (nowMs - lastOp.timestamp) < 1500) {
          // Operación duplicada por rebote dentro de la ventana de 1.5s
          return { success: true, deduplicated: true, id: lastOp.id };
        }

        // 3. Construcción del registro canónico auditado
        const record = {
          fincaId,
          tipo: 'auditoria',
          tipo_entidad: tipoEntidad,
          entidad_id: entidadId,
          motivo_tarea: motivoTarea,
          actor_type: actorType,
          actor_id: actorId,
          action,
          resultado,
          descripcion,
          fecha: fechaLocal,
          creadoEn: creadoEnIso
        };

        if (fieldsModified) {
          record.fields_modified = fieldsModified;
        }

        // Sellar con hash de integridad local
        record.hash_integridad = this.computeIntegrityHash(record);

        // 4. Persistencia en IndexedDB (modo tolerante)
        const db = global.db || (global.window && global.window.db);
        if (!db || typeof db.add !== 'function') {
          this._registerFailure(action, 'DB_UNAVAILABLE');
          return { success: false, reason: 'DB_UNAVAILABLE' };
        }

        const insertedId = await db.add('registro_eventos', record);

        // Actualizar caché de idempotencia
        this._recentOperations.set(idempotencyKey, { timestamp: nowMs, id: insertedId });
        if (this._recentOperations.size > 50) {
          const firstKey = this._recentOperations.keys().next().value;
          this._recentOperations.delete(firstKey);
        }

        return { success: true, id: insertedId };
      } catch (err) {
        // MODO TOLERANTE: Nunca re-lanzar la excepción para no romper la operación principal.
        // Nunca invocar a ErrorHandler para evitar riesgo de recursión infinita.
        // Nunca exponer datos del payload en consola.
        this._registerFailure(opts.action, err && err.name);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[AuditService] AUDIT_WRITE_FAILED: No se pudo persistir el registro de auditoría local.');
        }
        return { success: false, reason: 'AUDIT_WRITE_FAILED' };
      }
    },

    /**
     * Registra internamente un fallo en memoria para telemetría y visualización diagnóstica.
     */
    _registerFailure(action, errorName) {
      this._failureCount++;
      this._recentFailures.push({
        timestamp: new Date().toISOString(),
        action: String(action || 'UNKNOWN').slice(0, 20),
        error: String(errorName || 'PersistenceError').slice(0, 30)
      });
      if (this._recentFailures.length > 5) {
        this._recentFailures.shift();
      }
    },

    /**
     * Consulta los registros de auditoría aplicando filtrado por explotación y sistema global.
     * LIMITACIÓN DOCUMENTADA: db.js carece de cursores inversos o paginación nativa;
     * la lectura se realiza sobre los índices disponibles y la presentación se limita a los últimos N registros.
     * @param {Object} params { fincaId, limit = 50 }
     */
    async list(params) {
      const p = params || {};
      const limit = typeof p.limit === 'number' && p.limit > 0 ? p.limit : 50;
      const fincaId = p.fincaId !== undefined ? p.fincaId : null;

      const db = global.db || (global.window && global.window.db);
      if (!db || typeof db.getAllFromIndex !== 'function') {
        return [];
      }

      try {
        let eventos = [];
        if (fincaId !== null && fincaId !== undefined) {
          const eventosFinca = await db.getAllFromIndex('registro_eventos', 'fincaId', fincaId).catch(() => []);
          eventos.push(...eventosFinca);
        }

        // Recuperar también eventos de sistema global para que no queden huérfanos
        const eventosGlobales = await db.getAllFromIndex('registro_eventos', 'fincaId', 'global').catch(() => []);
        eventos.push(...eventosGlobales);

        // Deduplicar por id si existieran solapes
        const vistos = new Set();
        const unicos = [];
        for (const e of eventos) {
          if (!vistos.has(e.id)) {
            vistos.add(e.id);
            unicos.push(e);
          }
        }

        // Filtrar exclusivamente eventos de auditoría y mutaciones críticas de negocio (altas, modificaciones, pesajes, movimientos)
        const logs = unicos.filter(e =>
          e.tipo === 'auditoria' ||
          e.tipo === 'alta' ||
          e.tipo === 'baja' ||
          e.tipo === 'movimiento' ||
          e.tipo === 'pesaje' ||
          e.rectificado ||
          e.anulado ||
          (e.valor_neto != null && e.tipo_entidad === 'animal') ||
          (e.motivo_tarea && (
            e.motivo_tarea.includes('anulacion') ||
            e.motivo_tarea.includes('rectificacion') ||
            e.motivo_tarea.includes('alta') ||
            e.motivo_tarea.includes('baja') ||
            e.motivo_tarea.includes('entrada') ||
            e.motivo_tarea.includes('salida') ||
            e.motivo_tarea.includes('control') ||
            e.motivo_tarea.includes('movimiento') ||
            e.motivo_tarea.includes('modificacion') ||
            e.motivo_tarea.includes('rebano')
          ))
        );

        // Ordenar cronológicamente descendente
        logs.sort((a, b) => new Date(b.creadoEn || b.fecha || 0) - new Date(a.creadoEn || a.fecha || 0));

        // Presentación limitada a los últimos N
        return logs.slice(0, limit);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[AuditService] AUDIT_QUERY_FAILED: Error al consultar registros de auditoría.');
        }
        return [];
      }
    },

    /**
     * Devuelve el estado de salud y diagnóstico del subsistema de auditoría.
     */
    getHealth() {
      return {
        failureCount: this._failureCount,
        recentFailures: [...this._recentFailures],
        isHealthy: this._failureCount === 0
      };
    },

    /**
     * Inicializa adaptadores para suscribir eventos transversales del EventBus global.
     * Evita duplicar eventos generados de forma nativa por módulos transaccionales (ej. animales.js).
     */
    initEventBusListeners() {
      if (this._listenersInitialized) return;
      const bus = global.EventBus || (global.window && global.window.EventBus);
      if (!bus || typeof bus.on !== 'function') return;

      this._listenersInitialized = true;

      // Tratamientos sanitarios
      bus.on('tratamiento:added', async (data) => {
        const t = data && data.tratamiento ? data.tratamiento : data;
        if (!t) return;
        await this.record({
          fincaId: t.fincaId || null,
          tipo_entidad: 'botiquin',
          entidad_id: t.id || t.productoId || 'tratamiento',
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'tratamiento_sanitario',
          descripcion: `Tratamiento registrado sobre animal/lote ${t.animalId || t.loteId || ''}`.trim()
        });
      });

      // Registro de ventas
      bus.on('venta:created', async (data) => {
        if (!data) return;
        const vId = data.ventaId || (data.venta && data.venta.id) || 'venta';
        await this.record({
          fincaId: data.fincaId || null,
          tipo_entidad: 'venta',
          entidad_id: vId,
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'registro_venta',
          descripcion: `Venta de ganado o producción registrada #${vId}`
        });
      });

      // Gastos operativos
      bus.on('gasto:created', async (data) => {
        const g = data && data.gasto ? data.gasto : data;
        if (!g) return;
        await this.record({
          fincaId: g.fincaId || null,
          tipo_entidad: 'gasto',
          entidad_id: g.id || 'gasto',
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'registro_gasto',
          descripcion: `Gasto de explotación registrado: ${g.categoria || 'general'}`
        });
      });

      // Cambio de contexto de explotación
      bus.on('finca:changed', async (data) => {
        const id = data && (data.id || data.fincaId);
        if (!id) return;
        await this.record({
          fincaId: id,
          tipo_entidad: 'finca',
          entidad_id: id,
          actor_type: 'user',
          action: 'UPDATE',
          motivo_tarea: 'cambio_finca_activa',
          descripcion: `Contexto cambiado a explotación #${id}`
        });
      });

      // Anulación de animal: evitar duplicar si animales.js ya registró directamente en registro_eventos
      bus.on('animal:deleted', async (data) => {
        if (!data || data.anulacion) {
          // Ya registrado directamente por animales.js con motivo_tarea 'anulacion_registro'
          return;
        }
        await this.record({
          tipo_entidad: 'animal',
          entidad_id: data.id || 'animal',
          actor_type: 'user',
          action: 'DELETE_LOGICAL',
          motivo_tarea: 'anulacion_animal',
          descripcion: `Baja/anulación de animal #${data.id || ''}`
        });
      });

      // Modificaciones y traslados de animales
      bus.on('animal:updated', async (data) => {
        const a = data && (data.animal || data);
        if (!a || a.estado === 'baja') return;
        await this.record({
          fincaId: a.fincaId || null,
          tipo_entidad: 'animal',
          entidad_id: a.id || a.numero_identificacion || 'animal',
          actor_type: 'user',
          action: 'UPDATE',
          motivo_tarea: 'modificacion_animal',
          descripcion: `Ficha de animal actualizada · crotal ${a.numero_identificacion || '#' + a.id}`
        });
      });

      bus.on('animal:moved', async (data) => {
        const a = data && (data.animal || data);
        if (!a) return;
        await this.record({
          fincaId: a.fincaId || null,
          tipo_entidad: 'animal',
          entidad_id: a.id || a.numero_identificacion || 'animal',
          actor_type: 'user',
          action: 'UPDATE',
          motivo_tarea: 'cambio_rebano',
          descripcion: `Traslado de rebaño para animal ${a.numero_identificacion || '#' + a.id} (de #${data.rebanoOrigen} a #${data.rebanoDestino})`
        });
      });

      // Compradores comerciales
      bus.on('comprador:created', async (data) => {
        const c = data && (data.comprador || data);
        if (!c) return;
        await this.record({
          fincaId: c.fincaId || null,
          tipo_entidad: 'comprador',
          entidad_id: c.id || c.nombre || 'comprador',
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'alta_comprador',
          descripcion: `Comprador comercial registrado: ${c.nombre || '#' + (c.id || '')}`
        });
      });

      bus.on('comprador:deleted', async (data) => {
        const id = data && (data.id || data);
        if (!id) return;
        await this.record({
          tipo_entidad: 'comprador',
          entidad_id: id,
          actor_type: 'user',
          action: 'DELETE_LOGICAL',
          motivo_tarea: 'baja_comprador',
          descripcion: `Baja de comprador comercial #${id}`
        });
      });

      // Proveedores
      bus.on('proveedor:created', async (data) => {
        const p = data && (data.proveedor || data);
        if (!p) return;
        await this.record({
          fincaId: p.fincaId || null,
          tipo_entidad: 'proveedor',
          entidad_id: p.id || p.nombre || 'proveedor',
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'alta_proveedor',
          descripcion: `Proveedor registrado: ${p.nombre || '#' + (p.id || '')}`
        });
      });

      bus.on('proveedor:deleted', async (data) => {
        const id = data && (data.id || data);
        if (!id) return;
        await this.record({
          tipo_entidad: 'proveedor',
          entidad_id: id,
          actor_type: 'user',
          action: 'DELETE_LOGICAL',
          motivo_tarea: 'baja_proveedor',
          descripcion: `Baja de proveedor #${id}`
        });
      });

      // Contratos
      bus.on('contrato:created', async (data) => {
        const ct = data && (data.contrato || data);
        if (!ct) return;
        await this.record({
          fincaId: ct.fincaId || null,
          tipo_entidad: 'contrato',
          entidad_id: ct.id || 'contrato',
          actor_type: 'user',
          action: 'CREATE',
          motivo_tarea: 'alta_contrato',
          descripcion: `Contrato mercantil registrado #${ct.id || ''}`
        });
      });

      // Anulaciones sanitarias y vacunaciones
      bus.on('saneamiento:anulado', async (data) => {
        const id = data && (data.id || data);
        if (!id) return;
        await this.record({
          tipo_entidad: 'saneamiento',
          entidad_id: id,
          actor_type: 'user',
          action: 'DELETE_LOGICAL',
          motivo_tarea: 'anulacion_saneamiento',
          descripcion: `Anulación de campaña de saneamiento #${id}`
        });
      });

      bus.on('vacunacion:anulada', async (data) => {
        const id = data && (data.id || data);
        if (!id) return;
        await this.record({
          tipo_entidad: 'vacunacion',
          entidad_id: id,
          actor_type: 'user',
          action: 'DELETE_LOGICAL',
          motivo_tarea: 'anulacion_vacunacion',
          descripcion: `Anulación de orden de vacunación #${id}`
        });
      });
    }
  };

  // Exportación para entornos navegador / Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditService;
  }
  if (typeof window !== 'undefined') {
    window.AuditService = AuditService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
