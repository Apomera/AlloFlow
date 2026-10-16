// Bounded OpenFreeMap vector downloads for the selected city only.
// No network work runs at module load. Shared with the browser test harness.
var FLIGHT_CITY_VECTOR_LIMITS = { zoom: 14, tiles: 9, concurrency: 2,
  tileBytes: 4 * 1024 * 1024, bytes: 12 * 1024 * 1024, timeout: 45000 };
function getFlightCityProvider(services) {
  services = services || {};
  var requested = services.provider;
  if (requested === 'none') return { kind: 'none', id: 'none', name: '', reason: 'disabled' };
  if (requested !== undefined && requested !== 'openfreemap' && requested !== 'overpass') {
    return { kind: 'none', id: 'invalid', name: '', reason: 'invalid' };
  }
  if (Object.prototype.hasOwnProperty.call(services, 'overpassUrl') || requested === 'overpass') {
    var endpoint = flightCityEndpoint(services.overpassUrl);
    if (!endpoint) return { kind: 'none', id: 'invalid', name: '', reason: 'invalid' };
    return { kind: 'overpass', id: 'overpass-v1|' + endpoint, name: 'OpenStreetMap', url: endpoint };
  }
  return { kind: 'vector', id: 'openfreemap-v1|https://tiles.openfreemap.org/planet/latest/', name: 'OpenFreeMap',
    template: 'https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf' };
}
function getFlightCityTilePlan(value) {
  var target = flightCityTarget(value);
  if (!target || Math.abs(target.lat) > 85) throw new Error('City is outside the supported map area.');
  var z = FLIGHT_CITY_VECTOR_LIMITS.zoom, count = Math.pow(2, z), rad = Math.PI / 180;
  function tileX(lon) { return (lon + 180) / 360 * count; }
  function tileY(lat) { return (1 - Math.asinh(Math.tan(lat * rad)) / Math.PI) / 2 * count; }
  function latitude(y) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / count))) / rad; }
  function longitude(x) { return x / count * 360 - 180; }
  var centerX = Math.floor(tileX(target.lon)), centerY = Math.floor(tileY(target.lat));
  var minX = centerX - 1, maxX = centerX + 1, minY = Math.max(0, centerY - 1), maxY = Math.min(count - 1, centerY + 1);
  var latSpan = 900 / 111320, lonSpan = latSpan / Math.cos(target.lat * rad);
  // Keep building-level zoom at high latitudes; reduce coverage to a three-tile envelope.
  var bbox = [Math.max(target.lat - latSpan, latitude(maxY + 1)), Math.max(target.lon - lonSpan, longitude(minX)),
    Math.min(target.lat + latSpan, latitude(minY)), Math.min(target.lon + lonSpan, longitude(maxX + 1))];
  minX = Math.max(minX, Math.floor(tileX(bbox[1]) + 1e-9));
  maxX = Math.min(maxX, Math.ceil(tileX(bbox[3]) - 1e-9) - 1);
  minY = Math.max(minY, Math.floor(tileY(bbox[2]) + 1e-9));
  maxY = Math.min(maxY, Math.ceil(tileY(bbox[0]) - 1e-9) - 1);
  var tiles = [];
  for (var y = minY; y <= maxY; y++) for (var x = minX; x <= maxX; x++) {
    tiles.push({ z: z, x: (x % count + count) % count, y: y });
  }
  if (!tiles.length || tiles.length > FLIGHT_CITY_VECTOR_LIMITS.tiles) throw new Error('City tile budget exceeded.');
  return { z: z, bbox: bbox, tiles: tiles };
}
async function flightCityReadVector(response, signal, budget) {
  if (!response || !response.ok) throw new Error('City map service is temporarily unavailable.');
  var declared = Number(response.headers && response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > FLIGHT_CITY_VECTOR_LIMITS.tileBytes) throw new Error('City tile exceeds the download limit.');
  if (!response.body || typeof response.body.getReader !== 'function') throw new Error('This browser cannot safely stream city details.');
  var reader = response.body.getReader(), chunks = [], length = 0;
  function cancel() { Promise.resolve(reader.cancel()).catch(function() {}); }
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw flightCityAbortError();
      var chunk = await reader.read();
      if (signal.aborted) throw flightCityAbortError();
      if (chunk.done) break;
      if (!chunk.value || !ArrayBuffer.isView(chunk.value)) throw new Error('City tile data is invalid.');
      var bytes = chunk.value.byteLength;
      length += bytes; budget.bytes += bytes;
      if (length > FLIGHT_CITY_VECTOR_LIMITS.tileBytes || budget.bytes > FLIGHT_CITY_VECTOR_LIMITS.bytes) {
        cancel(); throw new Error('City scenery exceeds the download limit.');
      }
      chunks.push(new Uint8Array(chunk.value.buffer, chunk.value.byteOffset, bytes));
    }
  } finally { signal.removeEventListener('abort', cancel); try { reader.releaseLock(); } catch (_) {} }
  var result = new Uint8Array(length), offset = 0;
  chunks.forEach(function(chunk) { result.set(chunk, offset); offset += chunk.length; });
  return result;
}
function fetchFlightCityVectorPack(target, options) {
  options = options || {};
  var provider = options.provider || getFlightCityProvider(), fetcher = options.fetch;
  var converter = options.convert || (typeof convertFlightCityVectorTilesAsync === 'function' ? convertFlightCityVectorTilesAsync :
    typeof convertFlightCityVectorTiles === 'function' ? convertFlightCityVectorTiles : null);
  if (provider.kind !== 'vector' || !fetcher || !converter) return Promise.reject(new Error('City map provider is unavailable.'));
  var plan;
  try { plan = getFlightCityTilePlan(target); } catch (error) { return Promise.reject(error); }
  var controller = new AbortController(), signal = controller.signal, external = options.signal, rejectCancelled;
  var cancelled = new Promise(function(_, reject) { rejectCancelled = reject; });
  function cancel() { controller.abort(); rejectCancelled(flightCityAbortError()); }
  if (external) { if (external.aborted) cancel(); else external.addEventListener('abort', cancel, { once: true }); }
  var timer = setTimeout(function() { controller.abort(); rejectCancelled(new Error('City map service timed out.')); }, FLIGHT_CITY_VECTOR_LIMITS.timeout);
  var next = 0, result = new Array(plan.tiles.length), budget = { bytes: 0 };
  async function worker() {
    while (next < plan.tiles.length) {
      if (signal.aborted) throw flightCityAbortError();
      var index = next++, tile = plan.tiles[index];
      var url = provider.template.replace('{z}', tile.z).replace('{x}', tile.x).replace('{y}', tile.y);
      var response = await fetcher(url, { method: 'GET', signal: signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/vnd.mapbox-vector-tile,application/x-protobuf,application/octet-stream' } });
      if (signal.aborted) throw flightCityAbortError();
      result[index] = { z: tile.z, x: tile.x, y: tile.y, data: await flightCityReadVector(response, signal, budget) };
    }
  }
  var work = Promise.all(Array.from({ length: Math.min(FLIGHT_CITY_VECTOR_LIMITS.concurrency, plan.tiles.length) }, worker)).then(async function() {
    if (signal.aborted) throw flightCityAbortError();
    var converted = await converter(result, { id: target.id, name: target.name, lat: target.lat, lon: target.lon,
      bbox: plan.bbox, source: 'OpenStreetMap via OpenFreeMap', attribution: '© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap' }, { signal: signal });
    if (signal.aborted) throw flightCityAbortError();
    var pack = validateFlightCityPack(converted);
    if (!pack) throw new Error('City details failed validation.');
    return pack;
  });
  return Promise.race([work, cancelled]).finally(function() {
    controller.abort(); clearTimeout(timer); if (external) external.removeEventListener('abort', cancel);
  });
}
