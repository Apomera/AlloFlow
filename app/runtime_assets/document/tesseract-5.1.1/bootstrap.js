// Trusted bootstrap for the existing Tesseract 5.1.1 LSTM-only document path.
// The host verifies every graph member before exposing these synchronous hooks.
(function () {
  'use strict';
  if (typeof self.__alloRuntimeImportScripts !== 'function' || !self.__alloRuntimeAssets) {
    throw new Error('Verified Tesseract graph is unavailable');
  }
  var simd = false;
  try {
    // Same SIMD probe as the worker's wasm-feature-detect 1.2.11 dependency.
    simd = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
  } catch (_) {}
  var coreId = simd ? 'tess.core-simd-lstm' : 'tess.core-lstm';
  var wasmBinding = simd ? 'simdLstmWasm' : 'lstmWasm';
  var wasmName = simd ? 'tesseract-core-simd-lstm.wasm' : 'tesseract-core-lstm.wasm';
  var wasmUrl = self.__alloRuntimeAssets[wasmBinding];
  if (typeof wasmUrl !== 'string' || wasmUrl.indexOf('blob:') !== 0) {
    throw new Error('Verified Tesseract WASM is unavailable');
  }
  self.__alloRuntimeImportScripts(coreId);
  var factory = self.TesseractCore;
  if (typeof factory !== 'function') throw new Error('Verified Tesseract core did not initialize');
  self.TesseractCore = function (options) {
    var approved = Object.assign({}, options || {});
    // Executable bytes always come from the graph, including if a caller
    // supplies its own core options or an unapproved locateFile callback.
    delete approved.wasmBinary;
    approved.locateFile = function (name) {
      if (name !== wasmName) throw new Error('Unapproved Tesseract core resource');
      return wasmUrl;
    };
    return factory(approved);
  };
  // getCore observes the preloaded TesseractCore and skips its CDN importer.
  self.__alloRuntimeImportScripts('tess.worker');
})();
