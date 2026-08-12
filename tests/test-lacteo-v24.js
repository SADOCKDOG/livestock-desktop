/**
 * Livestock Manager - Pruebas Automatizadas Módulo Lácteo v24
 * Suite de pruebas para verificar funcionalidad láctea completa
 */

(function() {
  'use strict';

  const TestResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

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

  async function testDatosDemo() {
    console.log('\n🧪 === PRUEBA 1: DATOS DEMO LÁCTEOS ===\n');

    const fincaId = await window.Fincas.getActiveId();
    assert(fincaId != null, 'Finca activa existe');

    const finca = await window.Fincas.getActive();
    assert(finca != null, 'Objeto finca cargado');
    assert(finca.codigo_letra_q === 'TIT-21-00456', `Código Letra Q finca: ${finca.codigo_letra_q}`);
    assert(finca.clasificacion_zootecnica_leche === 'produccion_leche', `Clasificación zootécnica: ${finca.clasificacion_zootecnica_leche}`);
    assert(finca.plazas_vacuno_leche === 50, `Plazas vacuno leche: ${finca.plazas_vacuno_leche}`);
    assert(finca.superficie_descanso_m2 === 300, `Superficie descanso: ${finca.superficie_descanso_m2}`);
    assert(finca.metros_lineales_comedero === 3500, `Metros comedero: ${finca.metros_lineales_comedero}`);
    assert(finca.num_cubiculos === 45, `Cubículos: ${finca.num_cubiculos}`);

    // Tanques
    const tanques = await window.TanquesLeche.getAll(fincaId);
    assert(tanques.length === 3, `Número de tanques: ${tanques.length} (esperado: 3)`);
    
    const tanquePrincipal = tanques.find(t => t.nombre === 'TANQUE PRINCIPAL');
    assert(tanquePrincipal != null, 'Tanque Principal existe');
    assert(tanquePrincipal.codigo_letra_q === 'T-21-001234', `Código Letra Q tanque: ${tanquePrincipal.codigo_letra_q}`);
    assert(tanquePrincipal.capacidad_litros === 6000, `Capacidad tanque: ${tanquePrincipal.capacidad_litros}L`);
    assert(tanquePrincipal.temperatura_actual === 3.5, `Temperatura tanque: ${tanquePrincipal.temperatura_actual}°C`);

    const tanqueAuxiliar = tanques.find(t => t.nombre === 'TANQUE AUXILIAR');
    assert(tanqueAuxiliar != null, 'Tanque Auxiliar existe');
    assert(tanqueAuxiliar.capacidad_litros === 3000, `Capacidad tanque auxiliar: ${tanqueAuxiliar.capacidad_litros}L`);

    const cantaraOvino = tanques.find(t => t.nombre === 'CÁNTARA OVINO');
    assert(cantaraOvino != null, 'Cántara Ovino existe');
    assert(cantaraOvino.tipo === 'cantara', `Tipo cántara: ${cantaraOvino.tipo}`);

    // Balance lácteo
    const balanceMovs = await window.db.getAllFromIndex('balance_lacteo', 'fincaId', fincaId);
    assert(balanceMovs.length === 9, `Movimientos balance: ${balanceMovs.length} (esperado: 9)`);

    const stockPrincipal = await window.BalanceLacteo.getStockTanque(tanquePrincipal.id);
    assert(stockPrincipal >= 0, `Stock tanque principal: ${stockPrincipal}L (>= 0)`);

    // Analíticas
    const analiticas = await window.AnaliticasLeche.getAll(fincaId);
    assert(analiticas.length === 5, `Analíticas: ${analiticas.length} (esperado: 5)`);

    const analiticaVacuno = analiticas.find(a => a.especie === 'vacuno' && a.grasa === 3.8);
    assert(analiticaVacuno != null, 'Analítica vacuno con grasa 3.8% existe');
    assert(analiticaVacuno.germenes_30C === 35000, `Gérmenes analítica: ${analiticaVacuno.germenes_30C} UFC/mL`);
    assert(analiticaVacuno.celulas_somaticas === 180000, `Somáticas analítica: ${analiticaVacuno.celulas_somaticas} cel/mL`);
    assert(analiticaVacuno.aflatoxina_m1 === 12, `Aflatoxina M1: ${analiticaVacuno.aflatoxina_m1} ng/kg`);

    const analiticaOvino = analiticas.find(a => a.especie === 'ovino');
    assert(analiticaOvino != null, 'Analítica ovino existe');
    assert(analiticaOvino.grasa === 7.1, `Grasa ovino: ${analiticaOvino.grasa}%`);

    // Control lechero
    const controlLechero = await window.db.getAllFromIndex('control_lechero', 'fincaId', fincaId);
    assert(controlLechero.length === 2, `Controles lecheros: ${controlLechero.length} (esperado: 2)`);

    const controlConafe = controlLechero.find(c => c.organismo_control === 'CONAFE');
    assert(controlConafe != null, 'Control CONAFE existe');
    assert(controlConafe.media_rebano_litros === 27.5, `Media litros CONAFE: ${controlConafe.media_rebano_litros}L`);
  }

  async function testUmbralesEspecie() {
    console.log('\n🧪 === PRUEBA 2: UMBRALES POR ESPECIE ===\n');

    const umbralesVacuno = window.ComunidadesService.getUmbralesCalidadEspecie('vacuno');
    assert(umbralesVacuno.germenes_30C.max === 100000, `Gérmenes vacuno: ${umbralesVacuno.germenes_30C.max} UFC/mL`);
    assert(umbralesVacuno.celulas_somaticas.max === 400000, `Somáticas vacuno: ${umbralesVacuno.celulas_somaticas.max} cel/mL`);
    assert(umbralesVacuno.aflatoxina_m1.max === 50, `Aflatoxina M1 vacuno: ${umbralesVacuno.aflatoxina_m1.max} ng/kg`);

    const umbralesOvino = window.ComunidadesService.getUmbralesCalidadEspecie('ovino');
    assert(umbralesOvino.germenes_30C.max === 1500000, `Gérmenes ovino: ${umbralesOvino.germenes_30C.max} UFC/mL`);
    assert(umbralesOvino.celulas_somaticas.max === null, `Somáticas ovino: sin límite legal`);

    const umbralesCaprino = window.ComunidadesService.getUmbralesCalidadEspecie('caprino');
    assert(umbralesCaprino.germenes_30C.max === 1500000, `Gérmenes caprino: ${umbralesCaprino.germenes_30C.max} UFC/mL`);
  }

  async function testValidacionesLetraQ() {
    console.log('\n🧪 === PRUEBA 3: VALIDACIONES LETRA Q ===\n');

    const clasificaciones = window.ComunidadesService.getClasificacionZootecnicaLetraQ();
    assert(clasificaciones.length === 6, `Clasificaciones Letra Q: ${clasificaciones.length}`);

    const produccionLeche = clasificaciones.find(c => c.value === 'produccion_leche');
    assert(produccionLeche != null, 'Clasificación "produccion_leche" existe');
    assert(produccionLeche.compatible_letra_q === true, 'produccion_leche es compatible con Letra Q');

    const carne = clasificaciones.find(c => c.value === 'carne');
    assert(carne != null, 'Clasificación "carne" existe');
    assert(carne.compatible_letra_q === false, 'carne NO es compatible con Letra Q');

    assert(window.ComunidadesService.esCompatibleLetraQ('produccion_leche') === true, 'esCompatibleLetraQ(produccion_leche) = true');
    assert(window.ComunidadesService.esCompatibleLetraQ('carne') === false, 'esCompatibleLetraQ(carne) = false');
  }

  async function testMotorLacteo() {
    console.log('\n🧪 === PRUEBA 4: MOTOR LÁCTEO VALIDACIONES ===\n');

    const fincaId = await window.Fincas.getActiveId();
    const finca = await window.Fincas.getActive();

    // Validación bienestar animal
    const alertasBienestar = await window.MotorLacteo.validarBienestarAnimal(finca);
    assert(Array.isArray(alertasBienestar), 'validarBienestarAnimal retorna array');
    
    // Con 50 vacas y 300m², debería haber alerta (50 * 5 = 250m² necesarios, tenemos 300m² OK)
    // Con 3500cm comedero y 50 vacas (50 * 60 = 3000cm necesarios, tenemos 3500cm OK)
    // Con 45 cubículos y 50 vacas, debería haber alerta
    const alertaCubiculos = alertasBienestar.find(a => a.codigo === 'CUBICULOS_INSUFICIENTES');
    assert(alertaCubiculos != null, 'Alerta cubículos insuficientes detectada (45 < 50)');

    // Validación ambiental (50 plazas < 300, no debería haber alerta)
    const alertaAmbiental = window.MotorLacteo.validarAmbiental(finca);
    assert(alertaAmbiental === null, 'Sin alerta ambiental (50 plazas < 300)');

    // Validación trazabilidad Letra Q
    const alertasTrazabilidad = await window.MotorLacteo.validarTrazabilidadLetraQ(fincaId);
    assert(Array.isArray(alertasTrazabilidad), 'validarTrazabilidadLetraQ retorna array');
    assert(alertasTrazabilidad.length === 0, `Sin alertas trazabilidad (finca y tanques tienen Letra Q)`);

    // Validación comercialización
    const tanquePrincipal = (await window.TanquesLeche.getAll(fincaId)).find(t => t.nombre === 'TANQUE PRINCIPAL');
    const validacionOK = await window.MotorLacteo.validarComercializacion({
      fincaId,
      tanqueId: tanquePrincipal.id,
      cantidad: 100,
      especie_leche: 'vacuno',
      temperatura: 4.0
    });
    assert(validacionOK.valido === true, 'Validación comercialización OK con stock suficiente');

    const validacionStockInsuficiente = await window.MotorLacteo.validarComercializacion({
      fincaId,
      tanqueId: tanquePrincipal.id,
      cantidad: 999999,
      especie_leche: 'vacuno',
      temperatura: 4.0
    });
    assert(validacionStockInsuficiente.valido === false, 'Validación bloquea por stock insuficiente');
  }

  async function testBalanceLacteo() {
    console.log('\n === PRUEBA 5: BALANCE LÁCTEO ===\n');

    const fincaId = await window.Fincas.getActiveId();
    const tanques = await window.TanquesLeche.getAll(fincaId);
    const tanquePrincipal = tanques.find(t => t.nombre === 'TANQUE PRINCIPAL');

    const stock = await window.BalanceLacteo.getStockTanque(tanquePrincipal.id);
    assert(typeof stock === 'number', `Stock es número: ${stock}`);
    assert(stock >= 0, `Stock no negativo: ${stock}`);

    const produccionHoy = await window.BalanceLacteo.getProduccionDiaria(fincaId);
    assert(typeof produccionHoy === 'number', `Producción hoy es número: ${produccionHoy}`);

    const resumen = await window.BalanceLacteo.getResumenPeriodo(fincaId);
    assert(resumen.totalEntradas >= 0, `Total entradas: ${resumen.totalEntradas}`);
    assert(resumen.totalSalidas >= 0, `Total salidas: ${resumen.totalSalidas}`);
    assert(resumen.stockDisponible >= 0, `Stock disponible: ${resumen.stockDisponible}`);

    const validacion = await window.BalanceLacteo.validarStockSuficiente(tanquePrincipal.id, 100);
    assert(typeof validacion.valido === 'boolean', 'validarStockSuficiente retorna boolean');
    assert(typeof validacion.stockActual === 'number', 'stockActual es número');
  }

  async function testLaboratorios() {
    console.log('\n🧪 === PRUEBA 6: LABORATORIOS HOMOLOGADOS ===\n');

    const laboratorios = window.ComunidadesService.getLaboratoriosLeche();
    assert(laboratorios.length === 5, `Laboratorios: ${laboratorios.length} (esperado: 5)`);

    const cicap = laboratorios.find(l => l.codigo === 'CICAP');
    assert(cicap != null, 'CICAP existe');
    assert(cicap.default === true, 'CICAP es laboratorio por defecto');

    const lpsa = laboratorios.find(l => l.codigo === 'LPSA_CORDOBA');
    assert(lpsa != null, 'LPSA Córdoba existe');
    assert(lpsa.oficial === true, 'LPSA Córdoba es laboratorio oficial');

    const defaultLab = window.ComunidadesService.getLaboratorioDefault();
    assert(defaultLab.codigo === 'CICAP', `Laboratorio default: ${defaultLab.codigo}`);
  }

  async function testEvaluarCalidadLeche() {
    console.log('\n🧪 === PRUEBA 7: EVALUAR CALIDAD LECHE POR ESPECIE ===\n');

    // Vacuno óptimo
    const evalVacunoOK = window.ComunidadesService.evaluarCalidadLecheEspecie({
      grasa: 3.8,
      proteina: 3.3,
      germenes_30C: 50000,
      celulas_somaticas: 200000,
      inhibidores: false,
      aflatoxina_m1: 15
    }, 'vacuno');
    assert(evalVacunoOK.apto === true, 'Vacuno óptimo es apto');
    assert(evalVacunoOK.bloqueante === false, 'Vacuno óptimo no bloqueante');
    assert(evalVacunoOK.alertas.length === 0, `Vacuno óptimo sin alertas: ${evalVacunoOK.alertas.length}`);

    // Vacuno con gérmenes elevados (bloqueante)
    const evalVacunoGermenes = window.ComunidadesService.evaluarCalidadLecheEspecie({
      grasa: 3.8,
      proteina: 3.3,
      germenes_30C: 150000, // > 100000 límite vacuno
      celulas_somaticas: 200000,
      inhibidores: false
    }, 'vacuno');
    assert(evalVacunoGermenes.bloqueante === true, 'Vacuno con gérmenes elevados es bloqueante');
    assert(evalVacunoGermenes.alertas.length > 0, 'Vacuno con gérmenes tiene alertas');

    // Vacuno con inhibidores (bloqueante absoluto)
    const evalInhibidores = window.ComunidadesService.evaluarCalidadLecheEspecie({
      grasa: 3.8,
      proteina: 3.3,
      germenes_30C: 50000,
      celulas_somaticas: 200000,
      inhibidores: true
    }, 'vacuno');
    assert(evalInhibidores.bloqueante === true, 'Inhibidores siempre bloqueante');
    assert(evalInhibidores.alertas.some(a => a.includes('INHIBIDORES')), 'Alerta de inhibidores presente');

    // Ovino con gérmenes altos (NO bloqueante, límite 1.5M)
    const evalOvinoGermenes = window.ComunidadesService.evaluarCalidadLecheEspecie({
      grasa: 7.0,
      proteina: 5.5,
      germenes_30C: 1200000, // < 1500000 límite ovino
      celulas_somaticas: 1000000, // sin límite legal
      inhibidores: false
    }, 'ovino');
    assert(evalOvinoGermenes.bloqueante === false, 'Ovino con 1.2M gérmenes NO bloqueante');
  }

  async function testIntegracionVistas() {
    console.log('\n🧪 === PRUEBA 8: INTEGRACIÓN VISTAS ===\n');

    // Verificar que ProduccionView existe
    assert(typeof ProduccionView !== 'undefined', 'ProduccionView existe');
    assert(typeof ProduccionView.render === 'function', 'ProduccionView.render es función');
    assert(typeof ProduccionView._cambiarTab === 'function', 'ProduccionView._cambiarTab es función');
    assert(typeof ProduccionView._cambiarLecheSubTab === 'function', 'ProduccionView._cambiarLecheSubTab es función');
    assert(typeof ProduccionView._renderLecheDashboard === 'function', '_renderLecheDashboard existe');
    assert(typeof ProduccionView._renderLecheTanques === 'function', '_renderLecheTanques existe');
    assert(typeof ProduccionView._renderLecheControl === 'function', '_renderLecheControl existe');
    assert(typeof ProduccionView._renderLecheBalance === 'function', '_renderLecheBalance existe');

    // Verificar que wizards existen
    assert(typeof window.OrdeñoWizard !== 'undefined', 'OrdeñoWizard existe');
    assert(typeof window.OrdeñoWizard.open === 'function', 'OrdeñoWizard.open es función');
    assert(typeof window.TanqueWizard !== 'undefined', 'TanqueWizard existe');
    assert(typeof window.TanqueWizard.open === 'function', 'TanqueWizard.open es función');

    // Verificar que servicios existen
    assert(typeof window.TanquesLeche !== 'undefined', 'TanquesLeche existe');
    assert(typeof window.BalanceLacteo !== 'undefined', 'BalanceLacteo existe');
    assert(typeof window.AnaliticasLeche !== 'undefined', 'AnaliticasLeche existe');
    assert(typeof window.MotorLacteo !== 'undefined', 'MotorLacteo existe');
  }

  async function runAllTests() {
    console.log(' === INICIANDO PRUEBAS MÓDULO LÁCTEO v24 ===\n');

    // Reset: evita arrastrar fallos de una ejecución anterior (p.ej. el auto-run
    // al cargar el script, antes de que exista finca activa).
    TestResults.passed = 0;
    TestResults.failed = 0;
    TestResults.errors = [];

    try {
      await testDatosDemo();
      await testUmbralesEspecie();
      await testValidacionesLetraQ();
      await testMotorLacteo();
      await testBalanceLacteo();
      await testLaboratorios();
      await testEvaluarCalidadLeche();
      await testIntegracionVistas();

      console.log('\n📊 === RESULTADOS FINALES ===\n');
      console.log(`✅ Aprobadas: ${TestResults.passed}`);
      console.log(`❌ Fallidas: ${TestResults.failed}`);
      console.log(`📈 Total: ${TestResults.passed + TestResults.failed}`);
      
      if (TestResults.errors.length > 0) {
        console.log('\n⚠️  Fallos detectados:');
        TestResults.errors.forEach((err, idx) => {
          console.log(`  ${idx + 1}. ${err}`);
        });
      }

      console.log('\n✨ Pruebas completadas\n');
      
      return TestResults;
    } catch (error) {
      console.error('💥 Error ejecutando pruebas:', error);
      return TestResults;
    }
  }

  // Exportar para uso en consola
  window.runLacteoTests = runAllTests;

  // Auto-ejecutar si se carga directamente
  if (document.readyState === 'complete') {
    setTimeout(runAllTests, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(runAllTests, 2000));
  }

})();
