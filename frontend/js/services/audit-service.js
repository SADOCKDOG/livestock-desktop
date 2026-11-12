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
    'copia_seguridad',
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
    'censo',
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
    'IMPORT',
    'RESTORE'
  ]);

  // Redacta secretos y datos personales previsibles antes de persistir descripciones auditadas.
  const SENSITIVE_PATTERN = /(Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)|([A-Za-z0-9_-]{32,})|(password|token|secret|clave|jwt)[\s:=]+([^\s,;]+)/gi;
  const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const SPANISH_PHONE_PATTERN = /(^|[^\w])((?:\+?34[\s().-]*)?[6789](?:[\s().-]*\d){8})(?=$|[^\w])/g;
  const INTERNATIONAL_PHONE_PATTERN = /(^|[^\w])(\+[1-9](?:[\s().-]*\d){7,14})(?=$|[^\w])/g;
  const IDENTITY_DOCUMENT_PATTERN = /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-HJ-NP-TV-Z])\b/gi;
  const IBAN_PATTERN = /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/gi;
  const ADDRESS_PATTERN = /(^|[^\p{L}])((?:calle|c\/|c\.|avenida|avda\.?|plaza|pza\.?|paseo|camino|carretera|traves[ií]a|r[uú]a)\s+[^,;\n]{1,80}(?:,\s*\d{5})?)/giu;

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
     * Calcula el hash de integridad del algoritmo legado v1 (8 campos canónicos invariantes).
     * Campos canónicos cubiertos por v1:
     * - fincaId
     * - creadoEn
     * - actor_id
     * - action
     * - tipo_entidad
     * - entidad_id
     * - motivo_tarea
     * - resultado
     *
     * LIMITACIÓN EXPRESA DE SEGURIDAD Y AUDITORÍA:
     * El algoritmo v1 NO cubre ni incluye los campos 'descripcion' ni 'fields_modified'.
     * Por diseño histórico, cualquier alteración en el texto descriptivo o en los campos modificados
     * de un registro generado bajo v1 no alterará el hash resultante de esta función.
     */
    computeIntegrityHashV1(record) {
      if (!record || typeof record !== 'object') return '';
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
     * Calcula el hash de integridad determinista FNV-1a (32 bits, 8 caracteres hexadecimales) v2.
     * Campos canónicos cubiertos por el hash v2:
     * - fincaId
     * - creadoEn
     * - actor_id
     * - action
     * - tipo_entidad
     * - entidad_id
     * - motivo_tarea
     * - resultado
     * - descripcion
     * - fields_modified (ordenados canónicamente)
     *
     * NOTA DE LIMITACIÓN DE SEGURIDAD:
     * Este hash implementa el algoritmo no criptográfico FNV-1a (Fowler-Noll-Vo) como una comprobación
     * de integridad a nivel de aplicación (permite detectar corrupciones o modificaciones locales accidentales
     * en el almacenamiento del cliente). NO es una función hash criptográfica SHA-256, NO constituye una
     * garantía inmutable WORM de hardware ni firma digital PKI de servidor, y NO previene alteraciones deliberadas
     * de un usuario con acceso directo a las herramientas de desarrollo o al almacenamiento IndexedDB.
     */
    computeIntegrityHash(record) {
      if (!record || typeof record !== 'object') return '';
      const fieldsModStr = Array.isArray(record.fields_modified)
        ? record.fields_modified.slice().sort().join(',')
        : '';
      const canonicalStr = [
        record.fincaId ?? 'null',
        record.creadoEn ?? '',
        record.actor_id ?? '',
        record.action ?? '',
        record.tipo_entidad ?? '',
        record.entidad_id ?? '',
        record.motivo_tarea ?? '',
        record.resultado ?? '',
        record.descripcion ?? '',
        fieldsModStr
      ].join('|');

      let hash = 0x811c9dc5;
      for (let i = 0; i < canonicalStr.length; i++) {
        hash ^= canonicalStr.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    },

    /**
     * Alias explícito de computeIntegrityHash para algoritmos versión 2.
     */
    computeIntegrityHashV2(record) {
      return this.computeIntegrityHash(record);
    },

    /**
     * Verifica la integridad de un registro auditado según su versión de hash (v1 legado o v2 canónico).
     * Reglas de verificación:
     * - Si hash_version === 2: verifica exclusivamente mediante el algoritmo v2 (10 campos canónicos).
     * - Si hash_version no existe (undefined/null): prueba primero v2; si no coincide, recurre al algoritmo legado v1 exacto.
     * - Si hash_version === 1: verifica mediante el algoritmo v1 legado exacto (8 campos).
     * - Si hash_version existe con un valor no soportado (ej. 3, 99): NO aplica fallback y retorna UNSUPPORTED_VERSION.
     * - Si ningún algoritmo aplicable coincide: retorna CORRUPTED.
     * - Si el hash no existe o es inválido: retorna MISSING_HASH o INVALID_INPUT.
     * Comprobación tolerante: no lanza excepciones ante entradas nulas o malformadas.
     *
     * @param {Object} record Registro a auditar
     * @returns {{ valid: boolean, status: 'VERIFIED_V2'|'VERIFIED_V1_LEGACY'|'CORRUPTED'|'UNSUPPORTED_VERSION'|'MISSING_HASH'|'INVALID_INPUT', version: number|null }}
     */
    verifyRecordIntegrity(record) {
      if (!record || typeof record !== 'object') {
        return { valid: false, status: 'INVALID_INPUT', version: null };
      }
      if (!record.hash_integridad || typeof record.hash_integridad !== 'string' || record.hash_integridad.trim() === '') {
        return { valid: false, status: 'MISSING_HASH', version: null };
      }

      const hashAlmacenado = record.hash_integridad.trim();
      const version = record.hash_version;

      try {
        // Caso A: hash_version === 2 -> Verificación exclusiva con algoritmo v2
        if (version === 2) {
          const recalculatedV2 = this.computeIntegrityHash(record);
          if (hashAlmacenado === recalculatedV2) {
            return { valid: true, status: 'VERIFIED_V2', version: 2 };
          }
          return { valid: false, status: 'CORRUPTED', version: 2 };
        }

        // Caso B: hash_version === 1 -> Verificación con algoritmo v1 legado
        if (version === 1) {
          const recalculatedV1 = this.computeIntegrityHashV1(record);
          if (hashAlmacenado === recalculatedV1) {
            return { valid: true, status: 'VERIFIED_V1_LEGACY', version: 1 };
          }
          return { valid: false, status: 'CORRUPTED', version: 1 };
        }

        // Caso C: hash_version ausente (undefined o null) -> Probar v2 primero; fallback a v1 si mismatch
        if (version === undefined || version === null) {
          const recalculatedV2 = this.computeIntegrityHash(record);
          if (hashAlmacenado === recalculatedV2) {
            return { valid: true, status: 'VERIFIED_V2', version: 2 };
          }
          const recalculatedV1 = this.computeIntegrityHashV1(record);
          if (hashAlmacenado === recalculatedV1) {
            return { valid: true, status: 'VERIFIED_V1_LEGACY', version: 1 };
          }
          return { valid: false, status: 'CORRUPTED', version: null };
        }

        // Caso D: hash_version existe con valor no soportado -> Sin fallback, marcar versión no válida
        return { valid: false, status: 'UNSUPPORTED_VERSION', version: version };
      } catch (e) {
        return { valid: false, status: 'CORRUPTED', version: null };
      }
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
     * Sanea y minimiza descripciones auditadas. El texto libre no debe utilizarse
     * como almacén de datos personales: se redactan secretos, datos de contacto,
     * documentos identificativos, IBAN y direcciones previsibles.
     */
    _sanitizeDescription(desc) {
      if (!desc) return 'Operación de sistema registrada';
      let clean = String(desc)
        .replace(SENSITIVE_PATTERN, '[REDACTED]')
        .replace(EMAIL_PATTERN, '[REDACTED]')
        .replace(IDENTITY_DOCUMENT_PATTERN, '[REDACTED]')
        .replace(IBAN_PATTERN, '[REDACTED]')
        .replace(SPANISH_PHONE_PATTERN, '$1[REDACTED]')
        .replace(INTERNATIONAL_PHONE_PATTERN, '$1[REDACTED]')
        .replace(ADDRESS_PATTERN, '$1[REDACTED]')
        .trim();
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
          creadoEn: creadoEnIso,
          hash_version: 2
        };

        if (fieldsModified) {
          record.fields_modified = fieldsModified;
        }

        // Sellar con hash de integridad local v2
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
        // Clonar cada objeto para garantizar inmutabilidad estricta respecto a los datos persistidos en IndexedDB
        const logs = unicos
          .filter(e =>
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
          )
          .map(e => ({ ...e }));

        // Ordenar cronológicamente descendente
        logs.sort((a, b) => new Date(b.creadoEn || b.fecha || 0) - new Date(a.creadoEn || a.fecha || 0));

        // Verificar integridad de cada registro consultado contra su hash FNV-1a almacenado (v1 legado o v2 canónico)
        for (const log of logs) {
          if (log.tipo === 'auditoria') {
            const check = this.verifyRecordIntegrity(log);
            log.integrity_verified = check.valid;
            log.integrity_status = check.status;
            log.integrity_version = check.version;
            log.integrity_corrupted = (check.status === 'CORRUPTED');
          } else {
            log.integrity_verified = null;
            log.integrity_status = null;
            log.integrity_version = null;
            log.integrity_corrupted = false;
          }
        }

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
