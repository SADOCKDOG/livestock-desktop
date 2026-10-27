'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const supportApiSource = fs.readFileSync(
  path.join(__dirname, '..', 'frontend', 'js', 'services', 'support-api.js'),
  'utf8',
);

function crearSupportAPI(sesion, respuestaServidor) {
  const almacenamiento = new Map([
    ['livestock_support_session', JSON.stringify(sesion)],
  ]);
  const window = { SUPPORT_API_BASE: 'https://support-api.test' };
  const localStorage = {
    getItem: (clave) => almacenamiento.get(clave) || null,
    setItem: (clave, valor) => almacenamiento.set(clave, valor),
    removeItem: (clave) => almacenamiento.delete(clave),
  };

  vm.runInNewContext(supportApiSource, {
    window,
    localStorage,
    fetch: async () => ({
      status: 200,
      ok: true,
      json: async () => respuestaServidor,
    }),
    console: { warn() {}, error() {}, log() {} },
  });

  return {
    api: window.SupportAPI,
    sesionGuardada: () => JSON.parse(almacenamiento.get('livestock_support_session')),
  };
}

test('estadoLicencia sincroniza y persiste el correo canónico de /auth/me', async () => {
  const { api, sesionGuardada } = crearSupportAPI(
    {
      token: 'sesion-de-prueba',
      expira: '2099-01-01T00:00:00.000Z',
      email: '',
      licencia: { activa: false },
    },
    {
      email: 'usuario@example.test',
      licencia: { activa: true, expira: '2099-02-01T00:00:00.000Z' },
    },
  );

  await api.estadoLicencia();

  assert.equal(api.correoGuardado(), 'usuario@example.test');
  assert.equal(api.licenciaGuardada().activa, true);
  assert.equal(sesionGuardada().email, 'usuario@example.test');
});

test('estadoLicencia no borra el correo guardado si la respuesta no lo incluye', async () => {
  const { api } = crearSupportAPI(
    {
      token: 'sesion-de-prueba',
      expira: '2099-01-01T00:00:00.000Z',
      email: 'usuario@example.test',
      licencia: { activa: false },
    },
    { licencia: { activa: true } },
  );

  await api.estadoLicencia();

  assert.equal(api.correoGuardado(), 'usuario@example.test');
});

test('estadoLicencia acepta que el servidor confirme el correo vacío', async () => {
  const { api } = crearSupportAPI(
    {
      token: 'sesion-de-prueba',
      expira: '2099-01-01T00:00:00.000Z',
      email: 'anterior@example.test',
      licencia: { activa: true },
    },
    { email: '', licencia: { activa: true } },
  );

  await api.estadoLicencia();

  assert.equal(api.correoGuardado(), '');
});

test('validarSuscripcionExpirada: licencia activa con fecha futura -> false', () => {
  const { api } = crearSupportAPI(null, {});
  const lic = { estado: 'activo', expira: '2099-12-31T23:59:59.000Z' };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, false);
});

test('validarSuscripcionExpirada: licencia activa con fecha pasada -> true', () => {
  const { api } = crearSupportAPI(null, {});
  const lic = { estado: 'activo', expira: '2000-01-01T00:00:00.000Z' };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, true);
});

test('validarSuscripcionExpirada: licencia activa con fecha igual a ahora -> true', () => {
  const { api } = crearSupportAPI(null, {});
  const ahoraIso = new Date().toISOString();
  const lic = { estado: 'activo', expira: ahoraIso };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, true);
});

test('validarSuscripcionExpirada: licencia activa sin fecha (undefined) -> false (vitalicia)', () => {
  const { api } = crearSupportAPI(null, {});
  const lic = { estado: 'activo' };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, false);
});

test('validarSuscripcionExpirada: licencia activa con expira null -> false (vitalicia)', () => {
  const { api } = crearSupportAPI(null, {});
  const lic = { estado: 'activo', expira: null };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, false);
});

test('validarSuscripcionExpirada: licencia activa con expira vacío -> false (vitalicia)', () => {
  const { api } = crearSupportAPI(null, {});
  const lic = { estado: 'activo', expira: '' };
  const res = api.validarSuscripcionExpirada(lic);
  assert.equal(typeof res, 'boolean');
  assert.equal(res, false);
});

test('validarSuscripcionExpirada: entradas inválidas o nulas -> false', () => {
  const { api } = crearSupportAPI(null, {});
  assert.equal(typeof api.validarSuscripcionExpirada(null), 'boolean');
  assert.equal(api.validarSuscripcionExpirada(null), false);
  assert.equal(typeof api.validarSuscripcionExpirada(undefined), 'boolean');
  assert.equal(api.validarSuscripcionExpirada(undefined), false);
  assert.equal(typeof api.validarSuscripcionExpirada({}), 'boolean');
  assert.equal(api.validarSuscripcionExpirada({}), false);
  assert.equal(typeof api.validarSuscripcionExpirada({ estado: 'inactivo', expira: '2099-01-01T00:00:00.000Z' }), 'boolean');
  assert.equal(api.validarSuscripcionExpirada({ estado: 'inactivo', expira: '2099-01-01T00:00:00.000Z' }), false);
  assert.equal(typeof api.validarSuscripcionExpirada('texto'), 'boolean');
  assert.equal(api.validarSuscripcionExpirada('texto'), false);
  assert.equal(typeof api.validarSuscripcionExpirada(123), 'boolean');
  assert.equal(api.validarSuscripcionExpirada(123), false);
  assert.equal(typeof api.validarSuscripcionExpirada([]), 'boolean');
  assert.equal(api.validarSuscripcionExpirada([]), false);
  assert.equal(typeof api.validarSuscripcionExpirada({ estado: 'activo', expira: 'fecha-invalida' }), 'boolean');
  assert.equal(api.validarSuscripcionExpirada({ estado: 'activo', expira: 'fecha-invalida' }), false);
});
