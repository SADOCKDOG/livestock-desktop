function identificadorCompartido(data) {
  // En el porcino ordinario el código identifica la explotación de nacimiento,
  // por lo que puede aparecer en varios animales de esa explotación.
  return Number(data?.especieId) === 2 && Number(data?.tipoIdentificadorId) === 16;
}

function debeComprobarUnicidadIdentificador(data, esEdicion, actual, crotal) {
  if (identificadorCompartido(data)) return false;
  if (!esEdicion) return true;
  if (!actual) return false;

  return actual.numero_identificacion !== crotal ||
    Number(actual.especieId) !== Number(data?.especieId) ||
    Number(actual.tipoIdentificadorId) !== Number(data?.tipoIdentificadorId);
}

function identificadorYContextoSinCambios(data, actual) {
  if (!actual) return false;
  const valorNuevo = String(data?.numero_identificacion ?? '').trim().toUpperCase();
  const valorActual = String(actual.numero_identificacion ?? '').trim().toUpperCase();
  if (!valorNuevo || valorNuevo !== valorActual) return false;

  const especieIgual = actual.especieId != null && data?.especieId != null
    ? Number(actual.especieId) === Number(data.especieId)
    : !data?.especie || !actual.especie || String(data.especie).trim() === String(actual.especie).trim();
  const tipoIgual = data?.tipoIdentificadorId == null
    ? actual.tipoIdentificadorId == null
    : actual.tipoIdentificadorId != null && Number(actual.tipoIdentificadorId) === Number(data.tipoIdentificadorId);

  return especieIgual && tipoIgual;
}

function validarContratoIdentificacionAnimal(data) {
  const tiposIdentificador = new Set([
    "codigo_nacional",
    "marca_explotacion",
    "transpondedor_iso",
    "ueln",
    "otro",
  ]);
  const estadosIdentificador = new Set([
    "vigente",
    "historico",
    "legado",
    "pendiente",
  ]);

  if (data.identificadores !== undefined) {
    if (!Array.isArray(data.identificadores)) {
      throw new Error("identificadores debe ser una lista");
    }

    for (const [indice, identificador] of data.identificadores.entries()) {
      if (!identificador || typeof identificador !== "object" || Array.isArray(identificador)) {
        throw new Error(`identificadores[${indice}] debe ser un objeto`);
      }
      if (!tiposIdentificador.has(identificador.tipo)) {
        throw new Error(`identificadores[${indice}] tiene un tipo de identificador no admitido`);
      }
      if (typeof identificador.valor !== "string" || !identificador.valor.trim()) {
        throw new Error(`identificadores[${indice}].valor debe ser un texto no vacío`);
      }
      if (typeof identificador.principal !== "boolean") {
        throw new Error(`identificadores[${indice}].principal debe ser booleano`);
      }
      if (!estadosIdentificador.has(identificador.estado)) {
        throw new Error(`identificadores[${indice}] tiene un estado no admitido`);
      }
      if (
        identificador.tipoIdentificadorId !== undefined &&
        (!Number.isInteger(Number(identificador.tipoIdentificadorId)) || Number(identificador.tipoIdentificadorId) <= 0)
      ) {
        throw new Error(`identificadores[${indice}].tipoIdentificadorId debe ser un entero positivo`);
      }
      for (const campo of ["medio", "valorLeido", "fechaAplicacion", "fechaFin", "asignador", "verificadoPor", "fechaVerificacion", "referenciaVerificacion"]) {
        if (identificador[campo] !== undefined && typeof identificador[campo] !== "string") {
          throw new Error(`identificadores[${indice}].${campo} debe ser texto`);
        }
      }
      if (identificador.representacion !== undefined) {
        const representaciones = new Set(["nacional", "iso_completa"]);
        if (identificador.tipo !== "transpondedor_iso" || !representaciones.has(identificador.representacion)) {
          throw new Error(`identificadores[${indice}].representacion no admitida`);
        }
      }
    }

    if (data.identificadores.length > 0) {
      const principales = data.identificadores.filter((identificador) => identificador.principal);
      if (principales.length > 1) {
        throw new Error("identificadores puede contener como máximo un identificador principal");
      }
      if (principales.length === 1 && (
        typeof data.numero_identificacion !== "string" ||
        principales[0].valor !== data.numero_identificacion
      )) {
        throw new Error("El identificador principal debe coincidir exactamente con numero_identificacion");
      }
    }
  }

  if (data.documentos_identificacion !== undefined) {
    if (!Array.isArray(data.documentos_identificacion)) {
      throw new Error("documentos_identificacion debe ser una lista");
    }

    const tiposDocumento = new Set(["DIE", "PASAPORTE", "OTRO"]);
    for (const [indice, documento] of data.documentos_identificacion.entries()) {
      if (!documento || typeof documento !== "object" || Array.isArray(documento)) {
        throw new Error(`documentos_identificacion[${indice}] debe ser un objeto`);
      }
      if (!tiposDocumento.has(documento.tipo)) {
        throw new Error(`documentos_identificacion[${indice}] tiene un tipo de documento no admitido`);
      }
      if (typeof documento.numero !== "string" || !documento.numero.trim()) {
        throw new Error(`documentos_identificacion[${indice}].numero debe ser un texto no vacío`);
      }
      for (const campo of ["emisor", "fechaEmision", "estado", "referenciaAutorizacion", "verificadoPor", "fechaVerificacion", "referenciaVerificacion"]) {
        if (documento[campo] !== undefined && typeof documento[campo] !== "string") {
          throw new Error(`documentos_identificacion[${indice}].${campo} debe ser texto`);
        }
      }
    }
  }
}

const Animales = {
  async list(rebanoId = null) {
    if (rebanoId) {
      const rows = await window.db.getAllFromIndex(
        "animales",
        "rebanoId",
        Number(rebanoId)
      );
      return (rows || []).filter(a => !a?.anulado);
    } else {
      const rebanos = await Rebanos.list();
      let todosLosAnimales = [];
      for (let r of rebanos) {
        const animales = await window.db.getAllFromIndex(
          "animales",
          "rebanoId",
          r.id
        );
        todosLosAnimales = todosLosAnimales.concat(animales);
      }
      const animalesSinRebano = await window.db.getAll("animales").then(all =>
        all.filter(a => a.rebanoId == null || a.rebanoId === undefined)
      ).catch(() => []);
      return [...todosLosAnimales, ...animalesSinRebano].filter(a => !a?.anulado);
    }
  },

  async get(id) {
    return window.db.get("animales", Number(id));
  },

  async save(data, options = {}) {
    return await ErrorHandler.tryAsync(
      async () => {
        const esEdicion =
          data.id !== undefined && data.id !== null && data.id !== "";
        const actual = esEdicion ? await this.get(data.id) : null;
        const conservaIdentificador = identificadorYContextoSinCambios(data, actual);
        // Fichas históricas pueden conservar códigos emitidos con regímenes
        // anteriores. Solo se omite su revalidación si valor, especie y tipo
        // siguen iguales; cualquier cambio pasa por la regla vigente.
        const crotal = conservaIdentificador
          ? actual.numero_identificacion
          : await ErrorHandler.validateCrotal(
              data.numero_identificacion,
              data.especieId,
              data.tipoIdentificadorId,
              data
            );
        validarContratoIdentificacionAnimal({ ...data, numero_identificacion: crotal });
        // El rebaño ya no es obligatorio según las nuevas reglas

        // Validación opcional de DIB (único)
        // DIB es opcional. Omitir el campo vacio para que IndexedDB no
        // indexe "" como una clave real en el indice unico `dib`.
        const dibValue = String(data.dib ?? "").trim().toUpperCase();
        if (dibValue) {
          const existenteDib = await window.db.getFromIndex(
            "animales",
            "dib",
            dibValue
          ).catch(() => null);
          if (existenteDib && (!esEdicion || existenteDib.id !== Number(data.id))) {
            throw new Error(
              `Ya existe un animal con el DIB/Nº Pasaporte "${dibValue}"`
            );
          }
        }

        // Límite de animales en versión gratuita
        if (!esEdicion && window.PremiumManager && window.PremiumManager.isFree()) {
          const todos = await window.db.getAll('animales');
          const noDemo = todos.filter(a => !a.demo && !a?.anulado);
          if (noDemo.length >= window.PremiumManager.maxAnimals()) {
            throw new Error('Has alcanzado el límite de animales en la versión gratuita (máx. ' + window.PremiumManager.maxAnimals() + '). Actualiza a Premium para añadir más.');
          }
        }

        if (esEdicion) {
          if (actual && window.PremiumManager && window.PremiumManager.isFree() && actual.demo && !data.demo) {
            throw new Error('No puedes modificar animales de demostración en la versión gratuita');
          }
        }

        // La marca ordinaria porcina identifica la explotación, no al animal.
        // Para los identificadores individuales se conserva el control duplicado.
        const debeComprobarDuplicado = debeComprobarUnicidadIdentificador(
          data,
          esEdicion,
          actual,
          crotal
        );
        if (debeComprobarDuplicado) {
          const existentes = await window.db.getAllFromIndex(
            "animales",
            "caravana",
            crotal
          );
          const otroAnimal = existentes.find((existente) =>
            !esEdicion || Number(existente.id) !== Number(data.id)
          );
          if (otroAnimal) {
            const mensaje = esEdicion
              ? `No se puede cambiar al crotal ${crotal} porque ya está asignado a otro animal`
              : `Ya existe un animal registrado con el crotal ${crotal}`;
            throw new Error(mensaje);
          }
        }

        const animalData = {
          ...data,
          numero_identificacion: crotal,
          rebanoId: data.rebanoId ? Number(data.rebanoId) : null,
          especie: data.especie || null,
          especieId: data.especieId ? Number(data.especieId) : null,
          tipoIdentificadorId: data.tipoIdentificadorId ? Number(data.tipoIdentificadorId) : null,
          tipo: data.tipo || "Sin Clasificar",
          estado: data.estado || "activo",
          fecha_nacimiento: data.fecha_nacimiento || null,
          // Nuevos campos para compra de animal
          precio_compra: data.precio_compra ? Number(data.precio_compra) : null,
          proveedor_id: data.proveedor_id ? Number(data.proveedor_id) : null,
          factura_compra: data.factura_compra || null,
          pago_pendiente: data.pago_pendiente !== undefined ? Boolean(data.pago_pendiente) : false,
          actualizadoEn: new Date().toISOString(),
        };

        if (dibValue) {
          animalData.dib = dibValue;
        } else {
          delete animalData.dib;
        }

        // Gap 7: Mapear motivo_baja a categoría SANDACH
        if (data.motivo_baja && window.ComunidadesService) {
          animalData.sandach_categoria = ComunidadesService.getSANDACHCategoria(data.motivo_baja);
        }

        // Validar datos de compra si tipoAlta es "Compra"
        if (data.tipoAlta === "Compra") {
          if (data.precio_compra === undefined || data.precio_compra === null || data.precio_compra === '' || isNaN(parseFloat(data.precio_compra)) || parseFloat(data.precio_compra) <= 0) {
            throw new Error('Precio de compra requerido y debe ser mayor a cero');
          }
          if (data.proveedor_id === undefined || data.proveedor_id === null || data.proveedor_id === '' || isNaN(parseInt(data.proveedor_id)) || parseInt(data.proveedor_id) <= 0) {
            throw new Error('Proveedor requerido para compra de animal');
          }
          if (!data.factura_compra || data.factura_compra.trim() === '') {
            throw new Error('Factura de compra requerida');
          }
          // Validar pago_pendiente (opcional, pero si se proporciona debe ser boolean)
          if (data.pago_pendiente !== undefined && typeof data.pago_pendiente !== 'boolean' && ![0, 1, 'true', 'false'].includes(data.pago_pendiente)) {
            throw new Error('pago_pendiente debe ser un valor booleano');
          }
        }

        const animalAnterior = esEdicion ? await this.get(Number(data.id)) : null;
        const rebanoAnterior = animalAnterior ? animalAnterior.rebanoId : null;
        const rebanoNuevo = animalData.rebanoId;

        let animalId;
        if (esEdicion) {
          animalData.id = Number(data.id);
          await window.db.put("animales", animalData);
          animalId = animalData.id;
        } else {
          delete animalData.id;
          animalData.creadoEn = new Date().toISOString();
          animalId = await window.db.add("animales", animalData);
        }
        animalData.id = animalId;

        if (typeof options.afterPersist === 'function') {
          const compensaciones = [];
          const registrarCompensacion = (compensar) => {
            if (typeof compensar !== 'function') throw new TypeError('La compensación debe ser una función');
            compensaciones.push(compensar);
          };
          try {
            await options.afterPersist(animalId, animalData, registrarCompensacion);
          } catch (error) {
            for (const compensar of compensaciones.reverse()) {
              try {
                await compensar();
              } catch (errorCompensacion) {
                console.error('[Animales] Falló una compensación de persistencia', errorCompensacion);
              }
            }
            if (esEdicion) {
              await window.db.put('animales', actual);
            } else {
              await window.db.delete('animales', animalId);
            }
            throw error;
          }
        }

        // 2. Registrar Peso Inicial si se proporciona
        if (data.peso_inicial && Number(data.peso_inicial) > 0) {
          await Pesajes.registrar({
            entidad_id: animalId,
            tipo_entidad: "animal",
            valor_neto: Number(data.peso_inicial),
            fecha:
              animalData.fecha_nacimiento ||
              new Date().toISOString().split("T")[0],
            motivo_tarea: "control",
          });
        }

        // 3. Notificar al sistema via EventBus
        if (window.EventBus) {
          if (esEdicion) {
            window.EventBus.emit('animal:updated', { animal: animalData });
            // Detectar cambio de rebaño (movimiento)
            if (rebanoAnterior !== null && rebanoNuevo !== null && rebanoAnterior !== rebanoNuevo) {
              window.EventBus.emit('animal:moved', {
                animal: animalData,
                rebanoOrigen: rebanoAnterior,
                rebanoDestino: rebanoNuevo,
              });
            }
          } else {
            window.EventBus.emit('animal:created', { animal: animalData });
          }
        }

        // 4. Libro de registro SIGGAN: eventos de alta y baja (trazabilidad)
        await this._registrarEventoCenso(esEdicion, animalData, animalAnterior);



        return animalId;
      },
      { entity: "Animales", action: "save" }
    );
  },

  /**
   * Libro de registro SIGGAN: escribe en registro_eventos un evento de ALTA
   * al crear el animal (motivo según tipoAlta) y de BAJA cuando pasa a estado "baja".
   * Best-effort: no interrumpe el guardado del animal si falla.
   */
  async _registrarEventoCenso(esEdicion, animal, anterior) {
    try {
      if (!window.db || !animal || animal.id == null) return;
      const hoy = new Date().toISOString().split("T")[0];
      let fincaId = animal.fincaId || null;
      if (!fincaId && window.Fincas && typeof Fincas.getActiveId === "function") {
        fincaId = await Fincas.getActiveId().catch(() => null);
      }
      const crotal = animal.numero_identificacion || "#" + animal.id;

      if (!esEdicion) {
        // ALTA en el censo
        const mapAlta = {
          Nacimiento: "alta_nacimiento",
          Compra: "alta_compra",
          Traslado: "alta_traslado",
          Importación: "alta_importacion",
        };
        const motivo = mapAlta[animal.tipoAlta] || "alta";
        await window.db.add("registro_eventos", {
          fincaId,
          entidad_id: animal.id,
          tipo_entidad: "animal",
          tipo: "alta",
          motivo_tarea: motivo,
          fecha: animal.fecha_alta || animal.fecha_nacimiento || hoy,
          descripcion: `Alta en censo (${animal.tipoAlta || "alta"}) · crotal ${crotal}`,
          origen_rega: animal.rega_origen || null,
          creadoEn: new Date().toISOString(),
        });
        return;
      }

      // BAJA: sólo en la transición a estado "baja" (la venta se registra como expedición)
      const estadoAnt = anterior?.estado || "activo";
      const estadoNue = animal.estado || "activo";
      if (estadoNue === "baja" && estadoAnt !== "baja") {
        await window.db.add("registro_eventos", {
          fincaId,
          entidad_id: animal.id,
          tipo_entidad: "animal",
          tipo: "baja",
          motivo_tarea: "baja",
          motivo_baja: animal.motivo_baja || null,
          fecha: animal.fecha_baja || hoy,
          descripcion: `Baja del censo (${animal.motivo_baja || "sin motivo"}) · crotal ${crotal}`,
          creadoEn: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("[Animales] No se pudo registrar el evento de censo:", e?.message);
    }
  },

  /**
   * Registra un evento de auditoría a través de AuditService.record() aplicando
   * el esquema canónico v2 (hash_version: 2 y hash_integridad FNV-1a).
   * Comprueba expresamente el resultado de la escritura y gestiona los fallos
   * de persistencia sin interrumpir la transacción principal.
   *
   * @param {Object} opts Opciones canónicas para AuditService.record()
   * @returns {Promise<{success: boolean, id?: number, reason?: string, deduplicated?: boolean}>}
   */
  async _registrarAuditoria(opts) {
    const auditSvc =
      (typeof window !== "undefined" && window.AuditService) ||
      (typeof AuditService !== "undefined" ? AuditService : null);

    if (!auditSvc || typeof auditSvc.record !== "function") {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[Animales] AUDIT_SERVICE_UNAVAILABLE: No se pudo registrar auditoría (${opts?.motivo_tarea || "operacion"}).`
        );
      }
      return { success: false, reason: "AUDIT_SERVICE_UNAVAILABLE" };
    }

    try {
      const res = await auditSvc.record(opts);
      if (!res || res.success !== true) {
        const reason = (res && res.reason) || "AUDIT_WRITE_FAILED";
        if (
          reason === "INVALID_OPTIONS" &&
          typeof auditSvc._registerFailure === "function"
        ) {
          auditSvc._registerFailure(opts?.action || "UNKNOWN", reason);
        }
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            `[Animales] Fallo de persistencia en auditoría (${opts?.motivo_tarea || "operacion"}): ${reason}`
          );
        }
        return { success: false, reason };
      }
      return res;
    } catch (err) {
      if (typeof auditSvc._registerFailure === "function") {
        auditSvc._registerFailure(opts?.action || "UNKNOWN", err && err.name);
      }
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[Animales] Excepción al persistir auditoría (${opts?.motivo_tarea || "operacion"}): ${err?.message || "Error"}`
        );
      }
      return { success: false, reason: "AUDIT_WRITE_FAILED" };
    }
  },

  async delete(id, motivo = "") {
    return await ErrorHandler.tryAsync(
      async () => {
        const numId = Number(id);
        const animal = await this.get(numId);

        if (!animal) return;
        if (window.PremiumManager && window.PremiumManager.isFree() && animal.demo) {
          throw new Error('No puedes eliminar animales de demostración en la versión gratuita');
        }

        // Proteger integridad referencial comercial
        const [prodCarne, comCarne, eventos] = await Promise.all([
          window.db.getAllFromIndex("produccion_carne", "animalId", numId),
          window.db.getAllFromIndex(
            "comercializacion_carne",
            "animalId",
            numId
          ),
          window.db.getAllFromIndex("registro_eventos", "entidad_id", numId),
        ]);

        if (comCarne.length > 0)
          throw new Error(
            "No se puede eliminar: ya tiene registros de venta/comercialización."
          );

        // 2. Bloquear si está vendido
        if (animal.estado === "vendido") {
          throw new Error(
            "No se puede eliminar un animal que ya ha sido vendido."
          );
        }

        const marcaTemporal = new Date().toISOString();
        const fechaBaja = animal.fecha_baja || marcaTemporal.split("T")[0];
        const motivoAnulacion = (motivo || "").trim() || "anulacion_registro";
        const animalAnulado = {
          ...animal,
          estado: "baja",
          motivo_baja: animal.motivo_baja || motivoAnulacion,
          fecha_baja: fechaBaja,
          anulado: true,
          anuladoEn: marcaTemporal,
          anuladoMotivo: motivoAnulacion,
          actualizadoEn: marcaTemporal,
        };
        const camposCandidatos = [
          "estado",
          "motivo_baja",
          "fecha_baja",
          "anulado",
          "anuladoEn",
          "anuladoMotivo",
          "actualizadoEn",
        ];
        const fieldsModified = camposCandidatos.filter(
          (campo) => animal[campo] !== animalAnulado[campo]
        );
        await window.db.put("animales", animalAnulado);

        const activeFincaId =
          typeof Fincas !== "undefined" && typeof Fincas.getActiveId === "function"
            ? await Fincas.getActiveId().catch(() => null)
            : null;
        const fincaId = animal.fincaId ?? activeFincaId ?? null;
        const identificadorAnimal = animal.numero_identificacion || "#" + numId;

        const auditAnulacion = await this._registrarAuditoria({
          fincaId,
          entidad_id: numId,
          tipo_entidad: "animal",
          actor_type: "user",
          action: "DELETE_LOGICAL",
          motivo_tarea: "anulacion_registro",
          resultado: "SUCCESS",
          // El motivo libre se conserva en el registro ganadero, pero no se replica
          // en la descripción de auditoría para evitar duplicar datos personales.
          descripcion: `Anulación de ficha animal ${identificadorAnimal}`,
          fields_modified: fieldsModified,
        });

        let auditHistorico = null;
        if (eventos.length > 0 || prodCarne.length > 0) {
          auditHistorico = await this._registrarAuditoria({
            fincaId,
            entidad_id: numId,
            tipo_entidad: "animal",
            actor_type: "user",
            action: "UPDATE",
            motivo_tarea: "rectificacion_historico",
            resultado: "SUCCESS",
            descripcion: `Conservación histórica aplicada (sin borrado físico) para ${identificadorAnimal}: ${eventos.length} eventos, ${prodCarne.length} pesajes`,
          });
        }

        // 3. Notificar al sistema via EventBus
        if (window.EventBus) {
          window.EventBus.emit('animal:deleted', {
            id: numId,
            crotal: animal.numero_identificacion,
            anulacion: true,
          });
        }

        return {
          id: numId,
          anulado: true,
          audit: {
            anulacion: auditAnulacion,
            historico: auditHistorico,
          },
        };
      },
      { entity: "Animales", action: "delete" }
    );
  },

  /**
   * Comentario libre sobre el animal (gap "Histórico Comentarios Animal" de
   * docs/AUDITAR/AUDITORIA-BASEDEDATOS-LEGACY.md — no es un dato SIGGAN,
   * es una nota de manejo). Se guarda en registro_eventos como cualquier
   * otro evento de trazabilidad, motivo_tarea: 'comentario_animal'.
   */
  async agregarComentario(animalId, texto) {
    return await ErrorHandler.tryAsync(async () => {
      const comentario = (texto || "").trim();
      if (!comentario) throw new Error("El comentario no puede estar vacío.");
      const numId = Number(animalId);
      const animal = await this.get(numId);
      if (!animal) throw new Error("Animal no encontrado.");
      const fincaId = await Fincas.getActiveId().catch(() => null);
      const id = await window.db.add("registro_eventos", {
        fincaId,
        entidad_id: numId,
        tipo_entidad: "animal",
        tipo: "comentario",
        motivo_tarea: "comentario_animal",
        fecha: new Date().toISOString().split("T")[0],
        descripcion: comentario,
        creadoEn: new Date().toISOString(),
      });
      if (window.EventBus) {
        window.EventBus.emit("animal:comentario", { animalId: numId, id });
      }
      return id;
    }, { entity: "Animales", action: "agregarComentario" });
  },
};

window.Animales = Animales;
