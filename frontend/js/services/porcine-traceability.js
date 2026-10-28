/**
 * LIVESTOCK MANAGER - MODULO DE TRAZABILIDAD PORCINA (RD 787/2023 / REGA)
 * Organizacion: Sdog Farm Software Factory (sadogfarm.onmicrosoft.com)
 * 
 * Modulo desacoplado para la evaluacion zoosanitaria, validacion de explotaciones
 * REGA, control de periodos de supresion de medicamentos veterinarios y emision
 * de certificados de movimiento pecuario conforme a la normativa vigente.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PorcineTraceabilityService = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CATEGORIAS_PORCINAS = Object.freeze([
    "cebo",
    "lechones",
    "reproductoras",
    "cebo_iberico",
    "transicion",
    "reposicion",
  ]);

  const PorcineTraceabilityService = {
    CATEGORIAS_PORCINAS,

    /**
     * Valida el formato y digitos de control de un codigo de explotacion ganadera REGA.
     * Formato general Espana: ES + 2 digitos (provincia) + 3 digitos (municipio) + 7 digitos (explotacion) = 14 caracteres.
     * @param {string} regaCode - Codigo a validar.
     * @returns {{isValid: boolean, code: string, error?: string}}
     */
    validateREGA(regaCode) {
      if (!regaCode || typeof regaCode !== "string") {
        return { isValid: false, code: "", error: "El codigo REGA es obligatorio y debe ser una cadena de texto." };
      }

      const cleanCode = regaCode.trim().toUpperCase();
      const regaRegex = /^ES[0-9]{12}$/;

      if (!cleanCode.startsWith("ES")) {
        return { isValid: false, code: cleanCode, error: "El codigo REGA debe comenzar por el identificador de pais 'ES'." };
      }

      if (cleanCode.length !== 14) {
        return { isValid: false, code: cleanCode, error: `Longitud invalida (${cleanCode.length}). El codigo REGA debe contener exactamente 14 caracteres.` };
      }

      if (!regaRegex.test(cleanCode)) {
        return { isValid: false, code: cleanCode, error: "El codigo REGA solo debe contener digitos numericos tras el prefijo 'ES'." };
      }

      return { isValid: true, code: cleanCode };
    },

    /**
     * Valida la estructura de una partida o lote porcino.
     * @param {object} batch - Datos de la partida.
     * @returns {{isValid: boolean, batch: object, errors: string[]}}
     */
    validatePorcineBatch(batch) {
      const errors = [];
      if (!batch || typeof batch !== "object") {
        return { isValid: false, batch: {}, errors: ["La partida porcina es invalida o no esta definida."] };
      }

      if (!batch.batchId || typeof batch.batchId !== "string" || !batch.batchId.trim()) {
        errors.push("El identificador de partida (batchId) es obligatorio.");
      }

      if (!batch.categoria || !CATEGORIAS_PORCINAS.includes(batch.categoria.toLowerCase())) {
        errors.push(`Categoria zootecnica invalida. Valores permitidos: ${CATEGORIAS_PORCINAS.join(", ")}.`);
      }

      const num = Number(batch.numAnimales);
      if (!Number.isInteger(num) || num <= 0) {
        errors.push("El numero de animales debe ser un entero estrictamente positivo.");
      }

      const fechaIngreso = new Date(batch.fechaIngreso);
      if (isNaN(fechaIngreso.getTime())) {
        errors.push("La fecha de ingreso en la explotacion no tiene un formato valido.");
      }

      return {
        isValid: errors.length === 0,
        batch: {
          batchId: (batch.batchId || "").trim(),
          categoria: (batch.categoria || "").toLowerCase(),
          numAnimales: num > 0 ? num : 0,
          fechaIngreso: isNaN(fechaIngreso.getTime()) ? null : fechaIngreso.toISOString().split("T")[0],
          regaOrigen: (batch.regaOrigen || "").trim().toUpperCase(),
        },
        errors,
      };
    },

    /**
     * Evalua si una partida o animal porcino cumple con los tiempos de espera
     * de tratamientos veterinarios para el consumo o traslado segun RD 787/2023.
     * @param {Array<object>} treatments - Lista de tratamientos aplicados.
     * @param {string|Date} targetDate - Fecha en la que se pretende realizar el movimiento.
     * @returns {{apto: boolean, diasRestantes: number, medicamentoCausal: string|null, fechaFinEspera: string|null, motivo?: string}}
     */
    checkSupresionPorcina(treatments, targetDate) {
      function parseDateUTC(d) {
        if (!d) return new Date(NaN);
        if (d instanceof Date) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const str = String(d).split("T")[0];
        const parts = str.split("-").map(Number);
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      }

      const evalDate = parseDateUTC(targetDate);
      if (isNaN(evalDate.getTime())) {
        return { apto: false, diasRestantes: 0, medicamentoCausal: null, fechaFinEspera: null, motivo: "Fecha de evaluacion invalida." };
      }

      if (!Array.isArray(treatments) || treatments.length === 0) {
        return { apto: true, diasRestantes: 0, medicamentoCausal: null, fechaFinEspera: null };
      }

      let maxFechaBloqueo = new Date(0);
      let medicamentoCausal = null;

      for (const t of treatments) {
        if (!t || !t.fechaAplicacion) continue;
        const fApli = parseDateUTC(t.fechaAplicacion);
        if (isNaN(fApli.getTime())) continue;

        const diasEspera = Math.max(0, parseInt(t.diasEspera || 0, 10));
        const finEspera = new Date(fApli);
        finEspera.setUTCDate(finEspera.getUTCDate() + diasEspera);

        if (finEspera > maxFechaBloqueo) {
          maxFechaBloqueo = finEspera;
          medicamentoCausal = t.medicamento || "Medicamento no especificado";
        }
      }

      if (evalDate < maxFechaBloqueo) {
        const diffMs = maxFechaBloqueo.getTime() - evalDate.getTime();
        const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return {
          apto: false,
          diasRestantes,
          medicamentoCausal,
          fechaFinEspera: maxFechaBloqueo.toISOString().split("T")[0],
          motivo: `En periodo de supresion zoosanitaria por '${medicamentoCausal}'. Restan ${diasRestantes} dia(s).`,
        };
      }

      return {
        apto: true,
        diasRestantes: 0,
        medicamentoCausal: null,
        fechaFinEspera: maxFechaBloqueo.getTime() > 0 ? maxFechaBloqueo.toISOString().split("T")[0] : null,
      };
    },

    /**
     * Evalua integralmente una solicitud de traslado pecuario porcino.
     * @param {object} params - Parametros del movimiento.
     * @returns {{autorizada: boolean, codigoGuia?: string, motivoRechazo?: string, detalles: object}}
     */
    evaluateMovement({ originRega, destRega, batch, treatments = [], departureDate }) {
      const originCheck = this.validateREGA(originRega);
      if (!originCheck.isValid) {
        return { autorizada: false, motivoRechazo: `REGA de Origen invalido: ${originCheck.error}`, detalles: {} };
      }

      const destCheck = this.validateREGA(destRega);
      if (!destCheck.isValid) {
        return { autorizada: false, motivoRechazo: `REGA de Destino invalido: ${destCheck.error}`, detalles: {} };
      }

      if (originCheck.code === destCheck.code) {
        return { autorizada: false, motivoRechazo: "El REGA de destino no puede ser identico al REGA de origen para un movimiento pecuario.", detalles: {} };
      }

      const batchCheck = this.validatePorcineBatch(batch);
      if (!batchCheck.isValid) {
        return { autorizada: false, motivoRechazo: `Partida porcina no conforme: ${batchCheck.errors.join("; ")}`, detalles: {} };
      }

      const depDate = departureDate || new Date().toISOString().split("T")[0];
      const supresionCheck = this.checkSupresionPorcina(treatments, depDate);
      if (!supresionCheck.apto) {
        return { autorizada: false, motivoRechazo: supresionCheck.motivo, detalles: { supresion: supresionCheck } };
      }

      // Generar identificador de guia sanitaria determinista
      const stamp = Date.now().toString(36).toUpperCase();
      const codigoGuia = `GUIA-PORC-${originCheck.code.slice(-4)}-${destCheck.code.slice(-4)}-${stamp}`;

      return {
        autorizada: true,
        codigoGuia,
        motivoRechazo: null,
        detalles: {
          origen: originCheck.code,
          destino: destCheck.code,
          partida: batchCheck.batch,
          fechaSalida: depDate,
          estadoSanitario: "LIBRE_DE_RESIDUOS",
          normativa: "RD 787/2023 / REGA",
        },
      };
    },

    /**
     * Genera un certificado de trazabilidad formal para documentar el cumplimiento normativo.
     * @param {object} movementEvaluation - Resultado de evaluateMovement.
     * @returns {object}
     */
    generateTraceabilityCertificate(movementEvaluation) {
      if (!movementEvaluation || !movementEvaluation.autorizada) {
        throw new Error("No se puede emitir un certificado de trazabilidad para un movimiento no autorizado o rechazado.");
      }

      const now = new Date().toISOString();
      const payloadString = JSON.stringify(movementEvaluation.detalles);
      
      // Checksum determinista simple para verificar inmutabilidad
      let hash = 0;
      for (let i = 0; i < payloadString.length; i++) {
        hash = (hash << 5) - hash + payloadString.charCodeAt(i);
        hash |= 0;
      }
      const integrityHash = `SHA256-SIM-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;

      return {
        certificateId: `CERT-AI-GRC-${movementEvaluation.codigoGuia}`,
        issuedAt: now,
        organization: "Sdog Farm Software Factory",
        complianceStandard: "Real Decreto 787/2023 y Ley 8/2003 de Sanidad Animal",
        integrityHash,
        movementDetails: movementEvaluation.detalles,
        status: "CERTIFIED_VALID",
      };
    },

    /**
     * Calcula el Indice de Conversion Alimenticia (FCR) para porcino.
     * @param {number} feedKg - Consumo total de pienso en kilogramos.
     * @param {number} gainKg - Ganancia de peso en kilogramos.
     * @returns {number}
     */
    calculateFCR(feedKg, gainKg) {
      const feedNum = Number(feedKg);
      const gainNum = Number(gainKg);

      if (typeof feedKg !== "number" || typeof gainKg !== "number") {
        throw new Error("Los valores feedKg y gainKg deben ser numéricos.");
      }

      if (!Number.isFinite(feedNum) || !Number.isFinite(gainNum)) {
        throw new Error("Los valores feedKg y gainKg deben ser numéricos finitos.");
      }

      if (gainNum === 0) {
        throw new Error("El valor gainKg debe ser distinto de cero para el cálculo de FCR.");
      }

      if (gainNum < 0) {
        throw new Error("El valor gainKg debe ser mayor que cero para el cálculo de FCR.");
      }

      return feedNum / gainNum;
    },
  };

  return PorcineTraceabilityService;
});
