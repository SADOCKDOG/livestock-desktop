'use strict';

// Pruebas de compatibilidad dual del hash de integridad de AuditService (v1 legado / v2 canónico).
// Las fixtures V1_HISTORICOS se generaron ejecutando el AuditService histórico real del commit
// 386bccd (algoritmo de 8 campos, sin hash_version), por lo que no dependen del código nuevo.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const auditSource = fs.readFileSync(
  path.join(__dirname, '..', 'frontend', 'js', 'services', 'audit-service.js'),
  'utf8',
);
const eventBusSource = fs.readFileSync(
  path.join(__dirname, '..', 'frontend', 'js', 'services', 'event-bus.js'),
  'utf8',
);
const animalesSource = fs.readFileSync(
  path.join(__dirname, '..', 'frontend', 'js', 'animales.js'),
  'utf8',
);

const V1_HISTORICOS = Object.freeze([
  {
    fincaId: 7, tipo: 'auditoria', tipo_entidad: 'animal', entidad_id: 'ES0123456789',
    motivo_tarea: 'modificacion_sanitaria', actor_type: 'user', actor_id: 've***@granja.es',
    action: 'UPDATE', resultado: 'SUCCESS', descripcion: 'Tratamiento antibiotico registrado',
    fecha: '2026-10-27', creadoEn: '2026-10-27T23:51:11.013Z',
    fields_modified: ['tratamiento', 'estado'], hash_integridad: '250ecf66',
  },
  {
    fincaId: 'global', tipo: 'auditoria', tipo_entidad: 'general',
    entidad_id: 'livestock_backup_2026-10-27.json', motivo_tarea: 'export_backup',
    actor_type: 'user', actor_id: 'operador', action: 'EXPORT', resultado: 'SUCCESS',
    descripcion: 'Copia exportada', fecha: '2026-10-27', creadoEn: '2026-10-27T23:51:11.016Z',
    hash_integridad: '8154f24e',
  },
  {
    fincaId: 'global', tipo: 'auditoria', tipo_entidad: 'general', entidad_id: 'backup_corrupto.json',
    motivo_tarea: 'import_backup', actor_type: 'system_service', actor_id: 'restore_svc',
    action: 'UPDATE', resultado: 'FAILED', descripcion: 'Fallo en restauracion',
    fecha: '2026-10-27', creadoEn: '2026-10-27T23:51:11.016Z', hash_integridad: '52f3348a',
  },
]);

const clonar = (o) => JSON.parse(JSON.stringify(o));

function crearEntorno() {
  const store = [];
  const llamadas = { add: 0, put: 0, delete: 0, clear: 0 };
  let siguienteId = 1;
  const db = {
    add: async (_s, valor) => { llamadas.add++; const item = { ...clonar(valor), id: siguienteId++ }; store.push(item); return item.id; },
    put: async () => { llamadas.put++; },
    delete: async () => { llamadas.delete++; },
    clear: async () => { llamadas.clear++; },
    getAllFromIndex: async (_s, indice, clave) => store.filter((r) => r[indice] === clave),
  };
  const window = { db };
  const ctx = { window, console: { warn() {}, log() {}, error() {} }, setTimeout, clearTimeout };
  ctx.globalThis = window;
  window.window = window;
  vm.createContext(ctx);
  vm.runInContext(auditSource, ctx);
  const svc = window.AuditService;
  svc._recentOperations.clear();
  return { svc, store, llamadas };
}

const CAMPOS_V1 = ['fincaId', 'creadoEn', 'actor_id', 'action', 'tipo_entidad', 'entidad_id', 'motivo_tarea', 'resultado'];
const CAMPOS_V2 = [...CAMPOS_V1, 'descripcion', 'fields_modified'];
const alterar = (campo) => (campo === 'fields_modified' ? ['campo_inyectado'] : (campo === 'fincaId' ? 999 : 'ALTERADO'));

test('v1: el algoritmo legado reproduce exactamente los hashes históricos de 386bccd', () => {
  const { svc } = crearEntorno();
  for (const r of V1_HISTORICOS) {
    assert.equal(svc.computeIntegrityHashV1(r), r.hash_integridad);
  }
});

test('v1: registros históricos sin hash_version se validan como VERIFIED_V1_LEGACY', () => {
  const { svc } = crearEntorno();
  for (const r of V1_HISTORICOS) {
    const res = svc.verifyRecordIntegrity(clonar(r));
    assert.equal(res.valid, true);
    assert.equal(res.status, 'VERIFIED_V1_LEGACY');
    assert.equal(res.version, 1);
  }
});

test('v1: alterar cualquiera de los 8 campos cubiertos produce CORRUPTED', () => {
  const { svc } = crearEntorno();
  for (const campo of CAMPOS_V1) {
    const r = { ...clonar(V1_HISTORICOS[0]), [campo]: alterar(campo) };
    const res = svc.verifyRecordIntegrity(r);
    assert.equal(res.valid, false, campo);
    assert.equal(res.status, 'CORRUPTED', campo);
  }
});

test('v1 (limitación documentada): descripcion y fields_modified NO están protegidos por el hash legado', () => {
  const { svc } = crearEntorno();
  const desc = { ...clonar(V1_HISTORICOS[0]), descripcion: 'Texto alterado sin detección posible en v1' };
  const campos = { ...clonar(V1_HISTORICOS[0]), fields_modified: ['campo_inyectado'] };
  assert.equal(svc.verifyRecordIntegrity(desc).status, 'VERIFIED_V1_LEGACY');
  assert.equal(svc.verifyRecordIntegrity(campos).status, 'VERIFIED_V1_LEGACY');
});

test('v2: record() persiste hash_version 2 y el registro se valida como VERIFIED_V2', async () => {
  const { svc, store } = crearEntorno();
  const res = await svc.record({
    fincaId: 10, actor_id: 'operador', action: 'CREATE', tipo_entidad: 'animal',
    entidad_id: 'ES0987654321', motivo_tarea: 'alta_nacimiento', resultado: 'SUCCESS',
    descripcion: 'Parto normal', fields_modified: ['peso', 'estado'],
  });
  assert.equal(res.success, true);
  const r = store[0];
  assert.equal(r.hash_version, 2);
  assert.equal(r.hash_integridad, svc.computeIntegrityHash(r));
  assert.deepEqual({ ...svc.verifyRecordIntegrity(r) }, { valid: true, status: 'VERIFIED_V2', version: 2 });
});

test('v2: alterar cualquiera de los 10 campos cubiertos produce CORRUPTED', async () => {
  const { svc, store } = crearEntorno();
  await svc.record({
    fincaId: 10, actor_id: 'operador', action: 'UPDATE', tipo_entidad: 'animal', entidad_id: 'A1',
    motivo_tarea: 'modificacion_ficha', resultado: 'SUCCESS', descripcion: 'Original', fields_modified: ['peso'],
  });
  for (const campo of CAMPOS_V2) {
    const res = svc.verifyRecordIntegrity({ ...clonar(store[0]), [campo]: alterar(campo) });
    assert.equal(res.status, 'CORRUPTED', campo);
    assert.equal(res.version, 2, campo);
  }
});

test('v2 explícito no aplica fallback a v1 aunque el hash almacenado coincida con v1', () => {
  const { svc } = crearEntorno();
  const r = { ...clonar(V1_HISTORICOS[0]), hash_version: 2 };
  const res = svc.verifyRecordIntegrity(r);
  assert.equal(res.valid, false);
  assert.equal(res.status, 'CORRUPTED');
});

test('versión desconocida: UNSUPPORTED_VERSION sin fallback aunque el hash coincida con v1 o v2', () => {
  const { svc } = crearEntorno();
  const baseV1 = clonar(V1_HISTORICOS[1]);
  for (const version of [99, 3, 0, '2', 'v2']) {
    const conHashV1 = { ...baseV1, hash_version: version };
    const conHashV2 = { ...baseV1, hash_version: version };
    conHashV2.hash_integridad = svc.computeIntegrityHash(conHashV2);
    for (const r of [conHashV1, conHashV2]) {
      const res = svc.verifyRecordIntegrity(r);
      assert.equal(res.valid, false, String(version));
      assert.equal(res.status, 'UNSUPPORTED_VERSION', String(version));
    }
  }
});

test('hash ausente o entrada inválida: MISSING_HASH / INVALID_INPUT sin excepciones', () => {
  const { svc } = crearEntorno();
  for (const h of [undefined, null, '', '   ', 12345678]) {
    const r = { ...clonar(V1_HISTORICOS[0]), hash_integridad: h };
    assert.equal(svc.verifyRecordIntegrity(r).status, 'MISSING_HASH', String(h));
  }
  for (const entrada of [null, undefined, 'texto', 42]) {
    assert.equal(svc.verifyRecordIntegrity(entrada).status, 'INVALID_INPUT');
  }
});

test('list(): clasifica v1/v2/discrepancia/versión desconocida sin reescribir IndexedDB', async () => {
  const { svc, store, llamadas } = crearEntorno();
  await svc.record({ fincaId: 7, actor_id: 'op', action: 'CREATE', tipo_entidad: 'animal', entidad_id: 'N1', motivo_tarea: 'alta', resultado: 'SUCCESS', descripcion: 'Nuevo' });
  store.push({ ...clonar(V1_HISTORICOS[0]), id: 100 });
  store.push({ ...clonar(V1_HISTORICOS[0]), id: 101, actor_id: 'manipulado' });
  store.push({ ...clonar(V1_HISTORICOS[1]), id: 102, hash_version: 99 });
  store.push({ ...clonar(V1_HISTORICOS[2]), id: 103, hash_integridad: undefined });

  const antes = JSON.stringify(store);
  const addAntes = llamadas.add;
  const logs = await svc.list({ fincaId: 7, limit: 50 });

  assert.equal(JSON.stringify(store), antes, 'list() no debe mutar los objetos almacenados');
  assert.equal(llamadas.add, addAntes);
  assert.equal(llamadas.put, 0);
  assert.equal(llamadas.delete, 0);
  assert.equal(llamadas.clear, 0);
  for (const r of store) {
    assert.equal('integrity_status' in r, false, 'no se persisten campos de verificación');
    if ([100, 101, 103].includes(r.id)) assert.equal('hash_version' in r, false, 'no se migra hash_version');
  }

  const porId = Object.fromEntries(logs.map((l) => [l.id, l]));
  assert.equal(porId[1].integrity_status, 'VERIFIED_V2');
  assert.equal(porId[100].integrity_status, 'VERIFIED_V1_LEGACY');
  assert.equal(porId[100].integrity_version, 1);
  assert.equal(porId[101].integrity_status, 'CORRUPTED');
  assert.equal(porId[101].integrity_corrupted, true);
  assert.equal(porId[102].integrity_status, 'UNSUPPORTED_VERSION');
  assert.equal(porId[102].integrity_corrupted, false);
  assert.equal(porId[103].integrity_status, 'MISSING_HASH');
});

test('regresión EXPORT/RESTORE: SUCCESS y FAILED persisten clasificación correcta con hash v2', async () => {
  const casos = [
    { action: 'EXPORT', entidad_id: 'backup_ok.json', motivo_tarea: 'export_backup', resultado: 'SUCCESS' },
    { action: 'EXPORT', entidad_id: 'export_failed', motivo_tarea: 'export_backup', resultado: 'FAILED' },
    { action: 'RESTORE', entidad_id: 'backup_granja.json', motivo_tarea: 'import_backup', resultado: 'SUCCESS' },
    { action: 'RESTORE', entidad_id: 'backup_corrupto.json', motivo_tarea: 'import_backup', resultado: 'FAILED' },
  ];
  for (const c of casos) {
    const { svc, store } = crearEntorno();
    const res = await svc.record({ fincaId: 'global', actor_id: 'admin', tipo_entidad: 'copia_seguridad', descripcion: 'Backup', ...c });
    assert.equal(res.success, true);
    const r = store[0];
    assert.equal(r.action, c.action);
    assert.equal(r.tipo_entidad, 'copia_seguridad');
    assert.equal(r.resultado, c.resultado);
    assert.equal(r.entidad_id, c.entidad_id);
    assert.equal(r.motivo_tarea, c.motivo_tarea);
    assert.equal(r.fincaId, 'global');
    assert.equal(r.hash_version, 2);
    assert.equal(svc.verifyRecordIntegrity(r).status, 'VERIFIED_V2');
  }
});

function crearEntornoAnimales({ failAuditWrite = false, activeFincaId = 7 } = {}) {
  const stores = {
    animales: new Map(),
    produccion_carne: [],
    comercializacion_carne: [],
    registro_eventos: [],
  };
  const avisos = [];
  let siguienteEventoId = 1000;

  const db = {
    get: async (storeName, key) => {
      if (storeName === 'animales') {
        const item = stores.animales.get(Number(key));
        return item ? clonar(item) : undefined;
      }
      return undefined;
    },
    put: async (storeName, valor) => {
      if (storeName === 'animales') {
        stores.animales.set(Number(valor.id), clonar(valor));
        return valor.id;
      }
      return undefined;
    },
    add: async (storeName, valor) => {
      if (storeName === 'registro_eventos') {
        if (failAuditWrite && valor && valor.tipo === 'auditoria') {
          const err = new Error('Simulated IndexedDB QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
        const item = { ...clonar(valor), id: siguienteEventoId++ };
        stores.registro_eventos.push(item);
        return item.id;
      }
      return undefined;
    },
    delete: async () => {
      throw new Error('Prohibido borrar físicamente registros en anulación lógica');
    },
    getAllFromIndex: async (storeName, indexName, key) => {
      const lista = stores[storeName] || [];
      return lista.filter((r) => r[indexName] === key).map(clonar);
    },
  };

  const Fincas = {
    getActiveId: async () => activeFincaId,
  };
  const ErrorHandler = {
    tryAsync: async (fn) => await fn(),
  };

  const window = { db, Fincas, ErrorHandler, addEventListener() {} };
  const ctx = {
    window,
    Fincas,
    ErrorHandler,
    console: {
      warn: (...args) => avisos.push(args.join(' ')),
      log() {},
      error() {},
    },
    setTimeout,
    clearTimeout,
    Date,
    Map,
    Set,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Promise,
    Error,
  };
  ctx.globalThis = window;
  window.window = window;

  vm.createContext(ctx);
  vm.runInContext(eventBusSource, ctx);
  vm.runInContext(auditSource, ctx);
  vm.runInContext(animalesSource, ctx);

  const svc = window.AuditService;
  svc._recentOperations.clear();
  svc.initEventBusListeners();

  return {
    svc,
    Animales: window.Animales,
    EventBus: window.EventBus,
    stores,
    avisos,
  };
}

test('Animales.delete(): persiste anulacion_registro (DELETE_LOGICAL) y rectificacion_historico (UPDATE) con hash v2 VERIFIED_V2, sin duplicar por EventBus y preservando animal e histórico', async () => {
  const { svc, Animales, stores } = crearEntornoAnimales({ activeFincaId: 7 });

  // Sembrar animal activo con histórico previo (1 alta en registro_eventos y 2 pesajes en produccion_carne)
  stores.animales.set(42, {
    id: 42,
    fincaId: 7,
    numero_identificacion: 'ES010203040506',
    especie: 'Bovino',
    estado: 'activo',
    creadoEn: '2026-01-10T08:00:00.000Z',
  });
  stores.registro_eventos.push({
    id: 1,
    fincaId: 7,
    entidad_id: 42,
    tipo_entidad: 'animal',
    tipo: 'alta',
    motivo_tarea: 'alta_nacimiento',
    fecha: '2026-01-10',
    descripcion: 'Alta en censo (Nacimiento) · crotal ES010203040506',
    creadoEn: '2026-01-10T08:00:00.000Z',
  });
  stores.produccion_carne.push(
    { id: 10, animalId: 42, peso: 45, fecha: '2026-01-10' },
    { id: 11, animalId: 42, peso: 120, fecha: '2026-03-10' },
  );

  const resultado = await Animales.delete(42, 'error_identificacion_crotal');

  // 1. Verificar retorno de estado de auditoría
  assert.equal(resultado.id, 42);
  assert.equal(resultado.anulado, true);
  assert.equal(resultado.audit.anulacion.success, true);
  assert.equal(resultado.audit.historico.success, true);

  // 2. Verificar que el animal y su histórico se conservan sin borrado físico
  const animalPersistido = stores.animales.get(42);
  assert.ok(animalPersistido, 'El animal debe seguir existiendo en el almacén animales');
  assert.equal(animalPersistido.estado, 'baja');
  assert.equal(animalPersistido.anulado, true);
  assert.equal(animalPersistido.anuladoMotivo, 'error_identificacion_crotal');
  assert.equal(animalPersistido.motivo_baja, 'error_identificacion_crotal');
  assert.ok(animalPersistido.fecha_baja);
  assert.equal(stores.produccion_carne.length, 2, 'Los pesajes históricos deben conservarse intactos');
  assert.equal(stores.registro_eventos[0].motivo_tarea, 'alta_nacimiento', 'El evento de alta original debe conservarse intacto');

  // 3. Verificar que solo se crearon exactamente los 2 eventos de auditoría (sin duplicado de EventBus animal:deleted)
  const auditorias = stores.registro_eventos.filter((e) => e.tipo === 'auditoria');
  assert.equal(auditorias.length, 2, 'Deben existir exactamente 2 eventos de auditoría (sin duplicación por EventBus)');

  const evAnulacion = auditorias.find((e) => e.motivo_tarea === 'anulacion_registro');
  const evHistorico = auditorias.find((e) => e.motivo_tarea === 'rectificacion_historico');
  assert.ok(evAnulacion, 'Debe persistirse anulacion_registro');
  assert.ok(evHistorico, 'Debe persistirse rectificacion_historico');

  // 4. Verificar esquema canónico v2, acciones, identificación, explotación, motivo y descripción
  assert.equal(evAnulacion.action, 'DELETE_LOGICAL');
  assert.equal(evAnulacion.fincaId, 7);
  assert.equal(evAnulacion.tipo_entidad, 'animal');
  assert.equal(evAnulacion.entidad_id, '42');
  assert.equal(evAnulacion.hash_version, 2);
  assert.ok(evAnulacion.descripcion.includes('ES010203040506'), 'La descripción debe incluir el crotal del animal');
  assert.ok(evAnulacion.descripcion.includes('error_identificacion_crotal'), 'La descripción debe incluir el motivo de anulación');
  assert.deepEqual(evAnulacion.fields_modified, ['estado', 'motivo_baja', 'fecha_baja', 'anulado']);
  assert.equal(evAnulacion.hash_integridad, svc.computeIntegrityHash(evAnulacion));
  assert.deepEqual({ ...svc.verifyRecordIntegrity(evAnulacion) }, { valid: true, status: 'VERIFIED_V2', version: 2 });

  assert.equal(evHistorico.action, 'UPDATE');
  assert.equal(evHistorico.fincaId, 7);
  assert.equal(evHistorico.tipo_entidad, 'animal');
  assert.equal(evHistorico.entidad_id, '42');
  assert.equal(evHistorico.hash_version, 2);
  assert.ok(evHistorico.descripcion.includes('Conservación histórica aplicada (sin borrado físico)'));
  assert.ok(evHistorico.descripcion.includes('ES010203040506'));
  assert.ok(evHistorico.descripcion.includes('1 eventos, 2 pesajes'));
  assert.equal(evHistorico.hash_integridad, svc.computeIntegrityHash(evHistorico));
  assert.deepEqual({ ...svc.verifyRecordIntegrity(evHistorico) }, { valid: true, status: 'VERIFIED_V2', version: 2 });

  // 5. Verificar que AuditService.list() clasifica ambos como VERIFIED_V2 (nunca MISSING_HASH)
  const listados = await svc.list({ fincaId: 7, limit: 50 });
  const listAnulacion = listados.find((l) => l.motivo_tarea === 'anulacion_registro');
  const listHistorico = listados.find((l) => l.motivo_tarea === 'rectificacion_historico');
  assert.equal(listAnulacion.integrity_status, 'VERIFIED_V2');
  assert.equal(listAnulacion.integrity_verified, true);
  assert.equal(listHistorico.integrity_status, 'VERIFIED_V2');
  assert.equal(listHistorico.integrity_verified, true);
  assert.equal(listados.some((l) => l.integrity_status === 'MISSING_HASH'), false);
});

test('Animales.delete(): gestiona expresamente fallos de persistencia en auditoría sin destruir la anulación lógica', async () => {
  const { svc, Animales, stores, avisos } = crearEntornoAnimales({ failAuditWrite: true, activeFincaId: 7 });

  stores.animales.set(55, {
    id: 55,
    fincaId: 7,
    numero_identificacion: 'ES099988877766',
    especie: 'Ovino',
    estado: 'activo',
  });
  stores.produccion_carne.push({ id: 20, animalId: 55, peso: 32, fecha: '2026-04-01' });

  const resultado = await Animales.delete(55, 'baja_administrativa');

  assert.equal(resultado.anulado, true);
  assert.equal(resultado.audit.anulacion.success, false);
  assert.equal(resultado.audit.anulacion.reason, 'AUDIT_WRITE_FAILED');
  assert.equal(resultado.audit.historico.success, false);
  assert.equal(resultado.audit.historico.reason, 'AUDIT_WRITE_FAILED');

  // El animal queda anulado lógicamente y la salud de persistencia refleja los 2 fallos
  assert.equal(stores.animales.get(55).anulado, true);
  const health = svc.getHealth();
  assert.equal(health.isHealthy, false);
  assert.equal(health.failureCount, 2);
  assert.ok(avisos.some((a) => a.includes('anulacion_registro') && a.includes('AUDIT_WRITE_FAILED')));
  assert.ok(avisos.some((a) => a.includes('rectificacion_historico') && a.includes('AUDIT_WRITE_FAILED')));
});

test('Animales.delete(): no borra ni reescribe registros históricos previos sin hash (siguen como MISSING_HASH)', async () => {
  const { svc, Animales, stores } = crearEntornoAnimales({ activeFincaId: 7 });

  // Dos registros históricos previos sin hash_integridad ni hash_version
  const legadosSinHash = [
    {
      id: 500,
      fincaId: 7,
      entidad_id: 10,
      tipo_entidad: 'animal',
      tipo: 'auditoria',
      motivo_tarea: 'anulacion_registro',
      fecha: '2026-10-20',
      descripcion: 'Anulación de ficha animal ES000011112222',
      observaciones: 'rectificacion_censo',
      creadoEn: '2026-10-20T10:00:00.000Z',
    },
    {
      id: 501,
      fincaId: 7,
      entidad_id: 10,
      tipo_entidad: 'animal',
      tipo: 'auditoria',
      motivo_tarea: 'rectificacion_historico',
      fecha: '2026-10-20',
      descripcion: 'Conservación histórica aplicada (sin borrado físico)',
      observaciones: 'Histórico protegido: 1 eventos, 0 pesajes',
      creadoEn: '2026-10-20T10:00:01.000Z',
    },
  ];
  stores.registro_eventos.push(clonar(legadosSinHash[0]), clonar(legadosSinHash[1]));
  const copiaAntes = JSON.stringify(stores.registro_eventos.slice(0, 2));

  // Anular un nuevo animal con histórico
  stores.animales.set(77, {
    id: 77,
    fincaId: 7,
    numero_identificacion: 'ES077777777777',
    especie: 'Bovino',
    estado: 'activo',
  });
  stores.produccion_carne.push({ id: 30, animalId: 77, peso: 210, fecha: '2026-10-25' });

  await Animales.delete(77, 'rectificacion_censo');

  // Los dos registros históricos siguen intactos sin hash retroactivo inventado
  assert.equal(JSON.stringify(stores.registro_eventos.slice(0, 2)), copiaAntes);
  assert.equal('hash_integridad' in stores.registro_eventos[0], false);
  assert.equal('hash_integridad' in stores.registro_eventos[1], false);

  const listados = await svc.list({ fincaId: 7, limit: 50 });
  const porId = Object.fromEntries(listados.map((l) => [l.id, l]));
  assert.equal(porId[500].integrity_status, 'MISSING_HASH');
  assert.equal(porId[501].integrity_status, 'MISSING_HASH');

  const nuevos = listados.filter((l) => l.entidad_id === '77');
  assert.equal(nuevos.length, 2);
  for (const n of nuevos) {
    assert.equal(n.hash_version, 2);
    assert.equal(n.integrity_status, 'VERIFIED_V2');
  }
});
