(async () => {
  // Define minimal globals that the worker expects
  var __name = function(obj, name) {
    Object.defineProperty(obj, 'name', { value: name, configurable: true });
  };

  // Mock Hono2 - this is a simplified version
  var Hono2 = class {
    constructor() {
      this.routes = [];
    }
    use(path, middleware) {
      this.routes.push({ path, middleware, type: 'use' });
      return this;
    }
    post(path, handler) {
      this.routes.push({ path, handler, type: 'post' });
      return this;
    }
    get(path, handler) {
      this.routes.push({ path, handler, type: 'get' });
      return this;
    }
    route(path, handler) {
      this.routes.push({ path, handler, type: 'route' });
      return this;
    }
  };

  // Mock crypto.subtle
  var crypto = {
    subtle: {
      digest: async (algorithm, data) => {
        // Simple mock - return a fixed hash
        return new ArrayBuffer(32); // 256 bits
      },
      importKey: async (format, keyData, algorithm, extractable, keyUsages) => {
        return {};
      },
      sign: async (algorithm, key, data) => {
        return new ArrayBuffer(64); // Mock signature
      }
    }
  };

  // Mock jwtVerify and SignJWT
  var jwtVerify = async (token, secret, options) => {
    return { payload: { sub: "test-user", email: "test@example.com", plataforma: "android" } };
  };

  var SignJWT = class {
    constructor(payload) {
      this.payload = payload;
    }
    setProtectedHeader(header) {
      this.header = header;
      return this;
    }
    setSubject(subject) {
      this.subject = subject;
      return this;
    }
    setIssuedAt() {
      this.issuedAt = Date.now();
      return this;
    }
    setExpirationTime(time) {
      this.expirationTime = time;
      return this;
    }
    sign(secret) {
      return "mock-jwt-token";
    }
  };

  // Now load the worker script
  const script = "// src/services/msStoreBilling.ts\nvar PRODUCTO_SOPORTE_MS = \"support_unlock\";\nvar URL_COLECCIONES = \"https://collections.mp.microsoft.com/v6.0/collections/query\";\nvar REFERENCIA = \"soporte\";\nvar MAX_PAGINAS = 20;\nvar AUDIENCIA_SERVICIO = \"https://onestore.microsoft.com\";\nvar AUDIENCIA_CLAVE_COLECCIONES = \"https://onestore.microsoft.com/b2b/keys/create/collections\";\nfunction vacia(motivo) {\n  return {\n    activa: false,\n    expira: null,\n    motivo,\n    es_suscripcion: true,\n    renovacion_automatica: null,\n    // Microsoft no expone nada equivalente a linkedPurchaseToken.\n    token_anterior: null,\n    order_id: null,\n    instalacion_declarada: null\n  };\n}\n__name(vacia, \"vacia\");\nfunction licenciaVivaSegunAlmacen(usuario, ahora = Date.now()) {\n  if (!usuario || !usuario.licencia_soporte_activa) return { activa: false };\n  if (!usuario.licencia_expira) return { activa: true };\n  const expira = Date.parse(usuario.licencia_expira);\n  if (Number.isNaN(expira)) return { activa: true };\n  return { activa: expira > ahora };\n}\n__name(licenciaVivaSegunAlmacen, \"licenciaVivaSegunAlmacen\");\nfunction interpretarColeccion(items, ahoraMs = Date.now()) {\n  const nuestros = (items ?? []).filter((i) => i && i.inAppOfferToken === PRODUCTO_SOPORTE_MS);\n  if (nuestros.length === 0) {\n    return vacia(\"No hay ninguna compra del soporte\");\n  }\n  const ordenados = [...nuestros].sort(\n    (a, b) => (Date.parse(b.endDate ?? \"\") || 0) - (Date.parse(a.endDate ?? \"\") || 0)\n  );\n  const item = ordenados.find((i) => i.status === \"Active\" || i.status === \"PUR-UserAlreadyOwnsContent\") ?? ordenados[0];\n  if (!item) {\n    return vacia(\"No hay ninguna compra del soporte\");\n  }\n  const finMs = item.endDate ? Date.parse(item.endDate) : NaN;\n  const base = {\n    activa: false,\n    expira: Number.isFinite(finMs) ? new Date(finMs).toISOString() : null,\n    es_suscripcion: true,\n    renovacion_automatica: null,\n    token_anterior: null,\n    order_id: item.orderId ?? null,\n    instalacion_declarada: item.purchaser?.identityValue ?? null\n  };\n  if (item.status === \"Revoked\" || item.status === \"Banned\") {\n    return { ...base, motivo: \"La compra fue revocada o reembolsada\" };\n  }\n  if (item.status !== \"Active\" && item.status !== \"PUR-UserAlreadyOwnsContent\") {\n    return { ...base, motivo: \"La suscripcion no esta activa\" };\n  }\n  if (!Number.isFinite(finMs)) {\n    return { ...base, motivo: \"La suscripcion no tiene fecha de caducidad\" };\n  }\n  if (finMs <= ahoraMs) {\n    return { ...base, motivo: \"La suscripcion ha caducado\" };\n  }\n  return { ...base, activa: true };\n}\n__name(interpretarColeccion, \"interpretarColeccion\");\nvar tokensCacheados = /* @__PURE__ */ new Map();\nasync function tokenDeAcceso2(tenantId, clientId, clientSecret, audiencia = AUDIENCIA_SERVICIO) {\n  if (!tenantId || !clientId || !clientSecret) {\n    throw new Error(\n      \"Faltan MS_ENTRA_TENANT_ID, MS_ENTRA_CLIENT_ID o MS_ENTRA_CLIENT_SECRET: cargalos con wrangler secret put --env production\"\n    );\n  }\n  const vivo = tokensCacheados.get(audiencia);\n  if (vivo && vivo.expira > Date.now() + 6e4) {\n    return vivo.token;\n  }\n  const respuesta = await fetch(\n    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,\n    {\n      method: \"POST\",\n      headers: { \"content-type\": \"application/x-www-form-urlencoded\" },\n      body: new URLSearchParams({\n        grant_type: \"client_credentials\",\n        client_id: clientId,\n        client_secret: clientSecret,\n        scope: `${audiencia}/.default`\n      })\n    }\n  );\n  if (!respuesta.ok) {\n    const texto = (await respuesta.text().catch(() => \"\")).slice(0, 300);\n    throw new Error(`Entra ID rechazo la autenticacion (${respuesta.status}): ${texto}`);\n  }\n  const datos = await respuesta.json();\n  if (!datos.access_token) throw new Error(\"Entra ID no devolvio access_token\");\n  if (datos.expires_in) {\n    tokensCacheados.set(audiencia, {\n      token: datos.access_token,\n      expira: Date.now() + datos.expires_in * 1e3\n    });\n  }\n  return datos.access_token;\n}\n__name(tokenDeAcceso2, \"tokenDeAcceso\");\nasync function verificarLicenciaWindows(tenantId, clientId, clientSecret, storeIdKey) {\n  const token = await tokenDeAcceso2(tenantId, clientId, clientSecret);\n  const acumulados = [];\n  let continuacion;\n  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {\n    const respuesta = await fetch(URL_COLECCIONES, {\n      method: \"POST\",\n      headers: {\n        Authorization: `Bearer ${token}`,\n        \"content-type\": \"application/json\"\n      },\n      body: JSON.stringify({\n        maxPageSize: 100,\n        ...continuacion ? { continuationToken: continuacion } : {},\n        beneficiaries: [\n          { identityType: \"b2b\", identityValue: storeIdKey, localTicketReference: REFERENCIA }\n        ],\n        // Obligatorio: sin el la API responde 400. 'Durable' es lo que devuelve\n        // un complemento de suscripcion; 'UnmanagedConsumable' se incluye por si\n        // el add-on cambiara de tipo. No se pide 'Application' porque solo\n        // traeria la propia app, que aqui no interesa.\n        productTypes: [\"Durable\", \"UnmanagedConsumable\"],\n        // Imprescindible: por defecto la API solo devuelve lo vigente. Sin esto\n        // una licencia caducada seria indistinguible de no haber comprado nunca,\n        // y se perderia el ancla de identidad que reencuentra el historial.\n        validityType: \"All\"\n      })\n    });\n    if (!respuesta.ok) {\n      const texto = (await respuesta.text().catch(() => \"\")).slice(0, 300);\n      throw new Error(`La API de colecciones respondio ${respuesta.status}: ${texto}`);\n    }\n    const datos = await respuesta.json();\n    acumulados.push(...datos.items ?? []);\n    if (!datos.continuationToken) {\n      return interpretarColeccion(acumulados);\n    }\n    continuacion = datos.continuationToken;\n  }\n  throw new Error(`La API de colecciones no dejo de paginar tras ${MAX_PAGINAS} paginas`);\n}\n__name(verificarLicenciaWindows, \"verificarLicenciaWindows\");\n\n// Minimal worker for testing\nvar app = new Hono2();\napp.get(\"/\", (c) => c.json({ servicio: \"livestock-manager-support-api\", ok: true }));\napp.notFound((c) => c.json({ error: \"Ruta no encontrada\" }, 404));\napp.onError((err, c) => {\n  console.error(\"[error]\", err);\n  return c.json({ error: \"Error interno\" }, 500);\n});\nvar index_default = app;\nexport {\n  index_default as default\n};";

  return cloudflare.request({
    method: "PUT",
    path: "/accounts/3fb23c4a20ab113350d8ee4fa7be0acb/workers/scripts/interpretar-coleccion",
    body: script,
    rawBody: true,
    contentType: "application/javascript"
  });
})();