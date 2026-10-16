// Dense city topology work runs in a short-lived, locally bundled worker. The
// embed script builds FLIGHT_CITY_WORKER_SOURCE; no remote code is downloaded.
function flightCityVectorWorkerMain() {
  self.onmessage = function(event) {
    var request = event.data;
    if (!request || request.type !== 'flight-city-vector-convert') return;
    try {
      var pack = validateFlightCityPack(convertFlightCityVectorTiles(request.tiles, request.identity));
      if (!pack) throw new Error('City details failed validation.');
      self.postMessage({ type: 'flight-city-vector-result', pack: pack });
    } catch (error) {
      self.postMessage({ type: 'flight-city-vector-error', message: error && typeof error.message === 'string' ? error.message.slice(0, 240) : 'City details could not be prepared.' });
    }
    self.close();
  };
  self.postMessage({ type: 'flight-city-vector-ready' });
}
function convertFlightCityVectorTilesAsync(tiles, identity, options) {
  options = options || {};
  var signal = options.signal;
  var fallback = options.convert || (typeof convertFlightCityVectorTiles === 'function' ? convertFlightCityVectorTiles : null);
  var has = Object.prototype.hasOwnProperty;
  var WorkerClass = has.call(options, 'Worker') ? options.Worker : typeof Worker === 'function' ? Worker : null;
  var BlobClass = has.call(options, 'Blob') ? options.Blob : typeof Blob === 'function' ? Blob : null;
  var urlApi = has.call(options, 'URL') ? options.URL : typeof URL !== 'undefined' ? URL : null;
  var source = has.call(options, 'source') ? options.source : typeof FLIGHT_CITY_WORKER_SOURCE === 'string' ? FLIGHT_CITY_WORKER_SOURCE : '';
  function abortError() { var error = new Error('City request cancelled.'); error.name = 'AbortError'; return error; }
  function convertHere() {
    return Promise.resolve().then(function() {
      if (signal && signal.aborted) throw abortError();
      if (!fallback) throw new Error('City map conversion is unavailable.');
      return fallback(tiles, identity);
    }).then(function(pack) { if (signal && signal.aborted) throw abortError(); return pack; });
  }
  if (signal && signal.aborted) return Promise.reject(abortError());
  if (!WorkerClass || !BlobClass || !urlApi || typeof urlApi.createObjectURL !== 'function' || typeof urlApi.revokeObjectURL !== 'function' || !source) return convertHere();
  return new Promise(function(resolve, reject) {
    var worker, objectUrl, timer, finished = false, transferred = false;
    var timeout = Number.isFinite(options.timeout) ? Math.max(1, Math.min(20000, options.timeout)) : 20000;
    function cleanup() {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', cancel);
      if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); worker = null; }
      if (objectUrl) { urlApi.revokeObjectURL(objectUrl); objectUrl = null; }
    }
    function finish(error, pack) {
      if (finished) return;
      finished = true; cleanup();
      if (error) reject(error); else resolve(pack);
    }
    function cancel() { finish(abortError()); }
    function useFallback() {
      if (finished) return;
      finished = true; cleanup();
      // Only startup failures may fall back: after transfer the input buffers
      // belong to the worker and conversion errors must not block the cockpit.
      convertHere().then(resolve, reject);
    }
    try {
      objectUrl = urlApi.createObjectURL(new BlobClass([source], { type: 'text/javascript' }));
      worker = new WorkerClass(objectUrl, { name: 'SkySchool city scenery' });
    } catch (_) { useFallback(); return; }
    if (signal) signal.addEventListener('abort', cancel, { once: true });
    if (signal && signal.aborted) { cancel(); return; }
    timer = setTimeout(function() { finish(new Error('City scenery preparation timed out.')); }, timeout);
    worker.onerror = function(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (!transferred) useFallback(); else finish(new Error('City scenery preparation failed.'));
    };
    worker.onmessageerror = function() { finish(new Error('City scenery returned invalid data.')); };
    worker.onmessage = function(event) {
      if (finished) return;
      var message = event.data;
      if (!message || typeof message.type !== 'string') { finish(new Error('City scenery returned invalid data.')); return; }
      if (message.type === 'flight-city-vector-ready' && !transferred) {
        try {
          if (!Array.isArray(tiles) || !tiles.length || tiles.length > 9) throw new Error('City vector tile count exceeds its budget.');
          var transfer = [], seen = new Set(), bytes = 0;
          var payload = tiles.map(function(tile) {
            if (!tile || !(tile.data instanceof Uint8Array)) throw new Error('City vector tile data is invalid.');
            var data = tile.data;
            bytes += data.byteLength;
            if (!data.byteLength || data.byteLength > 4 * 1024 * 1024 || bytes > 12 * 1024 * 1024) throw new Error('City scenery exceeds the conversion limit.');
            // A caller's view may share a larger buffer. Transfer only its bytes,
            // and never place the same ArrayBuffer twice in the transfer list.
            if (!(data.buffer instanceof ArrayBuffer) || data.byteOffset || data.byteLength !== data.buffer.byteLength || seen.has(data.buffer)) data = new Uint8Array(data);
            seen.add(data.buffer); transfer.push(data.buffer);
            return { z: tile.z, x: tile.x, y: tile.y, data: data };
          });
          transferred = true;
          worker.postMessage({ type: 'flight-city-vector-convert', tiles: payload, identity: identity }, transfer);
        } catch (error) { finish(error); }
      } else if (message.type === 'flight-city-vector-result' && transferred) {
        finish(null, message.pack);
      } else if (message.type === 'flight-city-vector-error' && transferred) {
        finish(new Error(typeof message.message === 'string' ? message.message.slice(0, 240) : 'City details could not be prepared.'));
      } else { finish(new Error('City scenery returned invalid data.')); }
    };
  });
}
