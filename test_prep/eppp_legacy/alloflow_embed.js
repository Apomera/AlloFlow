(function () {
  'use strict';
  function installNotice() {
    if (!document.body || document.getElementById('alloflow-legacy-notice')) return;
    var notice = document.createElement('aside');
    notice.id = 'alloflow-legacy-notice';
    notice.setAttribute('role', 'note');
    notice.innerHTML = '<strong>AlloFlow legacy workspace:</strong> The complete Pass the EPPP Part 1 study app is available here without its former access gate. Its content is pending item-by-item expert review. Adaptive difficulty and score displays are practice heuristics—not official EPPP equating, pass predictions, or psychometric results.';
    document.body.insertBefore(notice, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installNotice);
  else installNotice();
  try { window.parent.postMessage({ type: 'alloflow-eppp-legacy-ready' }, '*'); } catch (_) {}
}());
