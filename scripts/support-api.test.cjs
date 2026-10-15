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
