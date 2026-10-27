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
