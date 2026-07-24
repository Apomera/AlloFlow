(function () {
  'use strict';
  function installNotice() {
    if (!document.body || document.getElementById('alloflow-legacy-notice')) return;
    var notice = document.createElement('aside');
    notice.id = 'alloflow-legacy-notice';
    notice.setAttribute('role', 'note');
    notice.innerHTML = '<strong>AlloFlow EPPP study suite:</strong> Independent practice content for review and study. Adaptive difficulty and score displays are practice heuristics&mdash;not official EPPP equating, pass predictions, or psychometric results.';
    document.body.insertBefore(notice, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installNotice);
  else installNotice();
  try { window.parent.postMessage({ type: 'alloflow-eppp-legacy-ready' }, '*'); } catch (_) {}
}());
