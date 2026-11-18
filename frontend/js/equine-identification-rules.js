const CATEGORIAS_NACIMIENTO_ADMISIBLES = new Set([
  'produccion_reproduccion',
  'pastos',
  'silvestre_semisilvestre',
]);

function parsearFechaISO(fecha) {
  const valor = String(fecha || '').trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(valor)) return null;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const parsed = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    parsed.getUTCFullYear() !== anio ||
    parsed.getUTCMonth() !== mes - 1 ||
    parsed.getUTCDate() !== dia
  ) return null;
  return parsed;
}

function aniversarioDoceMeses(fechaNacimiento) {
  const nacimiento = parsearFechaISO(fechaNacimiento);
  if (!nacimiento) return null;
  const anio = nacimiento.getUTCFullYear() + 1;
  const mes = nacimiento.getUTCMonth();
  const ultimoDiaMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const dia = Math.min(nacimiento.getUTCDate(), ultimoDiaMes);
  return new Date(Date.UTC(anio, mes, dia));
}

function validarFormatoCrotalVisualEquino(valor, fechaNacimiento) {
  const codigo = String(valor || '').trim().toUpperCase();
  const nacimiento = String(fechaNacimiento || '').trim();
  if (!parsearFechaISO(nacimiento)) return { valido: false, motivo: 'Indica una fecha de nacimiento válida para resolver el código visual equino.' };
  const patron = nacimiento >= '2025-06-30'
    ? /^ES21(?:0[1-9]|1[0-9])\d{8}$/
    : /^ES(?:0[1-9]|1[0-9])\d{10}$/;
  return {
    valido: patron.test(codigo),
    motivo: nacimiento >= '2025-06-30'
      ? 'Formato vigente: ES + 21 + comunidad autónoma (2 dígitos) + identificación individual (8 dígitos).'
      : 'Formato anterior: ES + comunidad autónoma (2 dígitos) + identificación individual (10 dígitos).',
  };
}

function validarTranspondedorEquino(valor) {
  const codigo = String(valor || '').trim();
  return /^1[0-7]01\d{2}0072421(?:0[1-9]|1[0-9])\d{8}$/.test(codigo);
}

function evaluarElegibilidadCrotalBoton(contexto = {}) {
  const resultadoCodigo = validarFormatoCrotalVisualEquino(contexto.codigoVisual, contexto.fechaNacimiento);
  if (!resultadoCodigo.valido) {
    contexto = { ...contexto, codigoVisualValido: false };
  }

  const condicionesPendientes = [];
  const destinoDeclarado = String(contexto.destinoDeclarado || '').trim();
  const categoriaNacimiento = String(contexto.categoriaNacimiento || '').trim();
  const regaNacimiento = String(contexto.regaNacimiento || '').trim().toUpperCase();
  const regaOrigen = String(contexto.regaOrigen || '').trim().toUpperCase();
  const regaDestino = String(contexto.regaDestinoMatadero || '').trim().toUpperCase();

  if (!destinoDeclarado) {
    condicionesPendientes.push('Declara el destino a producción de carne.');
  } else if (destinoDeclarado !== 'produccion_carne') {
    condicionesPendientes.push('El crotal electrónico de botón requiere destino declarado a producción de carne.');
  }

  if (!categoriaNacimiento) {
    condicionesPendientes.push('Indica la categoría de la explotación de nacimiento.');
  } else if (!CATEGORIAS_NACIMIENTO_ADMISIBLES.has(categoriaNacimiento)) {
    condicionesPendientes.push('La categoría de nacimiento no está incluida entre las admitidas para este caso.');
  }

  if (!regaNacimiento) {
    condicionesPendientes.push('Indica el REGA de la explotación de nacimiento.');
  }
  if (!regaOrigen) {
    condicionesPendientes.push('Indica el REGA de origen del traslado.');
  } else if (regaNacimiento && regaOrigen !== regaNacimiento) {
    condicionesPendientes.push('El REGA de origen del traslado debe coincidir con la explotación de nacimiento declarada.');
  }
  if (!regaDestino) {
    condicionesPendientes.push('Indica el REGA del matadero de destino.');
  }
  if (contexto.trasladoDirecto !== true) {
    condicionesPendientes.push('Declara que el traslado será directamente desde la explotación de nacimiento al matadero.');
  }

  if (categoriaNacimiento === 'silvestre_semisilvestre') {
    const aniversario = aniversarioDoceMeses(contexto.fechaNacimiento);
    const llegada = parsearFechaISO(contexto.fechaPrevistaLlegada);
    if (!aniversario || !llegada) {
      condicionesPendientes.push('Indica una fecha de nacimiento y una fecha prevista de llegada al matadero válidas.');
    } else if (llegada >= aniversario) {
      condicionesPendientes.push('La llegada prevista al matadero debe ser antes de cumplir 12 meses.');
    }
  }

  return {
    elegible: condicionesPendientes.length === 0,
    condicionesPendientes,
  };
}

const EquineIdentificationRules = {
  evaluarElegibilidadCrotalBoton,
  validarFormatoCrotalVisualEquino,
  validarTranspondedorEquino,
};

if (typeof window !== 'undefined') {
  window.EquineIdentificationRules = EquineIdentificationRules;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EquineIdentificationRules;
}
