(function () {
  if (!window.__handStudyForceFallback) return;
  window.__handStudyFallbackCalls = [];
  window.__handStudyFallbackFactoryUses = 0;
  window.StemLab.makeBayViewer = function () {
    window.__handStudyFallbackFactoryUses++;
    return {
      attach: function () {}, sync: function () {}, reset: function () {},
      nudge: function () {}, zoom: function () {}, status: function () { return 'failed'; },
      focus: function () { window.__handStudyFallbackCalls.push('focus'); return false; }
    };
  };
})();
