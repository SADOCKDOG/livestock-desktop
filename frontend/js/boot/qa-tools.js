if (window.localStorage && localStorage.getItem('lm_qa_tools') === '1') {
  ['js/e2e-test-suite.js?v=7.43', 'js/qa-test-runner.js?v=7.43', 'js/qa-diagnostico.js?v=7.43', 'js/qa-siggan.js?v=7.43', 'js/qa-premium.js?v=7.43', 'js/qa-especie-crotal.js?v=7.43', 'js/qa-plan-siggan.js?v=7.43', 'js/qa-margen-animal.js?v=7.43', 'js/qa-importador-rfid.js?v=7.43', 'tests/test-lacteo-v24.js?v=7.43']
    .forEach((src) => {
      const s = document.createElement('script');
      s.src = src;
      document.body.appendChild(s);
    });
}
