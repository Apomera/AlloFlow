(function () {
  'use strict';
  var contract = /* load or inline contract.json */ null;
  var adapter = window.AlloFlowToolIntegration.createAdapter({
    contract: contract,
    buildCapture: function (payload) {
      return { title: payload.title, summary: payload.summary, data: { derivedResults: payload.derivedResults }, reproducibilityReceipt: payload.reproducibilityReceipt };
    },
    sanitizeCapture: function (capture) { if (capture.data) delete capture.data.fullText; return capture; }
  });
  window.ExampleTextToolAdapter = adapter;
})();
