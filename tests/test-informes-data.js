/**
 * Livestock Manager - Pruebas para los nuevos loaders de informes-data.js /
 * informes-analytics.js (conexión Lácteo/Margen Animal a Informes).
 *
 * Sigue el mismo patrón que tests/test-lacteo-v24.js (assert/console propios,
 * sin dependencias externas — este proyecto no usa Jest). No se auto-ejecuta;
 * invocar manualmente con: await window.runInformesDataTests()
 */
(function () {
  'use strict';

  const TestResults = { passed: 0, failed: 0, errors: [] };

  function assert(condition, message) {
    if (condition) {
      TestResults.passed++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      TestResults.failed++;
      TestResults.errors.push(message);
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      TestResults.passed++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      TestResults.failed++;
      const detalle = `${message}. Esperado: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`;
      TestResults.errors.push(detalle);
      console.error(`❌ [FAIL] ${detalle}`);
    }
  }

  // --- InformesAnalytics.calcularRendimientoLecheDesdeRegistros (función pura) ---

  function test_rendimiento_leche_exitoso() {
    console.log('\n🧪 === PRUEBA: calcularRendimientoLecheDesdeRegistros - Éxito ===\n');
    const controles = [
      { id: 1, registros: [{ produccion_leche: 20 }, { produccion_leche: 18 }] },
      { id: 2, registros: [{ produccion_leche: 22 }, { produccion_leche: 19 }] }
    ];
    // Total litros: 20+18+22+19 = 79. Total animal-día: 4 registros. Promedio: 79/4 = 19.75
    const r = window.InformesAnalytics.calcularRendimientoLecheDesdeRegistros(controles);
    assertEquals(r.totalLitros, 79, 'Total de litros calculado correctamente');
    assertEquals(r.totalAnimalesDias, 4, 'Total de animal-día calculado correctamente');
    assertEquals(r.promedio, 19.75, 'Promedio de rendimiento leche por animal calculado correctamente');
  }

  function test_rendimiento_leche_campo_alternativo() {
    console.log('\n🧪 === PRUEBA: calcularRendimientoLecheDesdeRegistros - fallback a .litros ===\n');
    // Registros sin produccion_leche deben usar .litros como fallback (comportamiento documentado del loader original)
    const controles = [{ id: 1, registros: [{ litros: 15 }, { litros: 25 }] }];
    const r = window.InformesAnalytics.calcularRendimientoLecheDesdeRegistros(controles);
    assertEquals(r.totalLitros, 40, 'Usa el campo .litros cuando falta produccion_leche');
  }

  function test_rendimiento_leche_sin_datos() {
    console.log('\n🧪 === PRUEBA: calcularRendimientoLecheDesdeRegistros - Sin datos ===\n');
    const r1 = window.InformesAnalytics.calcularRendimientoLecheDesdeRegistros([]);
    assertEquals(r1, { promedio: 0, totalLitros: 0, totalAnimalesDias: 0 }, 'Array vacío devuelve todo a 0');
    const r2 = window.InformesAnalytics.calcularRendimientoLecheDesdeRegistros(null);
    assertEquals(r2, { promedio: 0, totalLitros: 0, totalAnimalesDias: 0 }, 'null devuelve todo a 0 sin lanzar error');
  }

  // --- InformesAnalytics.sumarCostosSanidadSobreLitros (función pura) ---

  function test_costo_produccion_leche_exitoso() {
    console.log('\n🧪 === PRUEBA: sumarCostosSanidadSobreLitros - Éxito ===\n');
    // Forma real de MargenAnimal.calcularParaFinca(): array de {costeSanidad, litrosLeche, ...}
    const animales = [
      { costeSanidad: 50, litrosLeche: 100 },
      { costeSanidad: 30, litrosLeche: 150 },
      { costeSanidad: 20, litrosLeche: 50 }
    ];
    // Total sanidad: 100. Total litros: 300. €/L: 100/300 = 0.3333
    const r = window.InformesAnalytics.sumarCostosSanidadSobreLitros(animales);
    assertEquals(r.totalCostosSanidad, 100, 'Total costes de sanidad calculado correctamente');
    assertEquals(r.totalLitrosLeche, 300, 'Total litros de leche calculado correctamente');
    assertEquals(r.costoPorLitro, 0.3333, 'Coste por litro calculado correctamente');
  }

  function test_costo_produccion_leche_ignora_coste_compra() {
    console.log('\n🧪 === PRUEBA: sumarCostosSanidadSobreLitros - no usa costeCompra ===\n');
    // costeCompra es un coste de adquisición puntual, no debe entrar en el €/L de producción.
    const animales = [{ costeSanidad: 10, costeCompra: 5000, litrosLeche: 100 }];
    const r = window.InformesAnalytics.sumarCostosSanidadSobreLitros(animales);
    assertEquals(r.costoPorLitro, 0.1, 'costeCompra no distorsiona el coste por litro de producción');
  }

  function test_costo_produccion_leche_sin_litros() {
    console.log('\n🧪 === PRUEBA: sumarCostosSanidadSobreLitros - Sin litros (evita división por cero) ===\n');
    const animales = [{ costeSanidad: 40, litrosLeche: 0 }];
    const r = window.InformesAnalytics.sumarCostosSanidadSobreLitros(animales);
    assertEquals(r.costoPorLitro, 0, 'Sin litros producidos, el coste por litro es 0 (no Infinity/NaN)');
  }

  function test_costo_produccion_leche_sin_datos() {
    console.log('\n🧪 === PRUEBA: sumarCostosSanidadSobreLitros - Sin datos ===\n');
    const r = window.InformesAnalytics.sumarCostosSanidadSobreLitros([]);
    assertEquals(r, { costoPorLitro: 0, totalCostosSanidad: 0, totalLitrosLeche: 0 }, 'Array vacío devuelve todo a 0');
  }

  // --- Loaders de informes-data.js: prueba de integración contra datos reales de la finca activa ---
  // (Igual que test-lacteo-v24.js: se prueba contra la finca demo/activa ya cargada, no con mocks de IndexedDB.)

  async function test_loaders_integracion_finca_activa() {
    console.log('\n🧪 === PRUEBA: loaders de Informes contra la finca activa (integración) ===\n');

    const fincaId = await window.Fincas.getActiveId().catch(() => null);
    if (!fincaId) {
      console.log('⚠️  Sin finca activa — se omite la prueba de integración.');
      return;
    }
    assert(typeof window.InformesView._obtenerRendimientoLechePorAnimal === 'function', '_obtenerRendimientoLechePorAnimal existe');
    assert(typeof window.InformesView._obtenerIndiceRenuevo === 'function', '_obtenerIndiceRenuevo existe');
    assert(typeof window.InformesView._obtenerCostoProduccionLeche === 'function', '_obtenerCostoProduccionLeche existe');

    const rendimiento = await window.InformesView._obtenerRendimientoLechePorAnimal(fincaId);
    assert(typeof rendimiento.promedio === 'number' && !Number.isNaN(rendimiento.promedio), 'Rendimiento leche/animal devuelve un número válido');

    const indiceRenuevo = await window.InformesView._obtenerIndiceRenuevo(fincaId);
    assert(typeof indiceRenuevo.promedio === 'number' && indiceRenuevo.promedio >= 0, 'Índice de renovación devuelve un porcentaje no negativo');

    const costoLeche = await window.InformesView._obtenerCostoProduccionLeche(fincaId);
    assert(typeof costoLeche.costoPorLitro === 'number' && costoLeche.costoPorLitro >= 0, 'Costo producción leche devuelve un €/L no negativo');
  }

  async function runAllTests() {
    console.log('🧪 INICIANDO PRUEBAS DE LOS LOADERS DE INFORMES-DATA.JS / INFORMES-ANALYTICS.JS\n');
    TestResults.passed = 0;
    TestResults.failed = 0;
    TestResults.errors = [];

    try {
      test_rendimiento_leche_exitoso();
      test_rendimiento_leche_campo_alternativo();
      test_rendimiento_leche_sin_datos();

      test_costo_produccion_leche_exitoso();
      test_costo_produccion_leche_ignora_coste_compra();
      test_costo_produccion_leche_sin_litros();
      test_costo_produccion_leche_sin_datos();

      await test_loaders_integracion_finca_activa();

      console.log('\n📊 RESUMEN DE PRUEBAS:');
      console.log(`✅ Pasadas: ${TestResults.passed}`);
      console.log(`❌ Fallidas: ${TestResults.failed}`);
      if (TestResults.errors.length > 0) {
        console.log('\n🚨 ERRORES:');
        TestResults.errors.forEach((error, index) => console.log(`${index + 1}. ${error}`));
      }
      return TestResults.failed === 0;
    } catch (error) {
      console.error('💥 Error ejecutando pruebas:', error);
      return false;
    }
  }

  // Exportar para uso manual en consola: await window.runInformesDataTests()
  // (No se auto-ejecuta al cargar el fichero, a diferencia de test-lacteo-v24.js —
  // requiere que InformesAnalytics/InformesView ya estén cargados.)
  window.runInformesDataTests = runAllTests;
})();
