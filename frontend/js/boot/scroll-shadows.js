// ============================================
// Sombra de scroll universal (reutilizable)
// ============================================
// Uso: window.enableScrollShadows(containerElement)
window.enableScrollShadows = function(el) {
  if (!el) return;
  function updateShadows() {
    var max = el.scrollWidth - el.clientWidth;
    var atStart = el.scrollLeft <= 4;
    var atEnd = el.scrollLeft >= max - 4;
    if (atStart) el.removeAttribute('data-ss-start');
    else el.setAttribute('data-ss-start', '');
    if (atEnd) el.removeAttribute('data-ss-end');
    else el.setAttribute('data-ss-end', '');
  }
  el.addEventListener('scroll', updateShadows);
  window.addEventListener('resize', updateShadows);
  updateShadows();
};
