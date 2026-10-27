// Bounded city discovery and approach loading. No network work runs at module load.
// Embedded verbatim in SkySchool; independent of React, THREE, and Node.
var FLIGHT_CITY_ONLINE_LIMITS = { bytes: 4 * 1024 * 1024, timeout: 25000, cooldown: 60000,
  cacheAge: 7 * 86400000, cacheEntries: 3, approachNm: 18 };
var FLIGHT_CITY_SEARCH_TIMEOUT = 8000;
var flightCitySearchMemo = new Map();
var flightCitySearchNext = 0;
function flightCityText(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
}
function flightCityTarget(value) {
  if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat) > 90 || Math.abs(value.lon) > 180) return null;
  var name = flightCityText(value.name, 160);
  if (!name) return null;
  return { id: flightCityText(value.id, 160) || 'city-' + value.lat.toFixed(5) + '-' + value.lon.toFixed(5),
    name: name, label: flightCityText(value.label, 240) || name, lat: value.lat, lon: value.lon,
    popK: 100, capital: false, code: 'CITY', isCity: true };
}
function flightCityDistance(a, b) {
  var rad = Math.PI / 180, dy = (b.lat - a.lat) * rad, dx = (b.lon - a.lon) * rad;
  var h = Math.sin(dy / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dx / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
function flightCityAbortError() { var error = new Error('City request cancelled.'); error.name = 'AbortError'; return error; }
function flightCityEndpoint(value, fallback) {
  try { var url = new URL(value || fallback); return url.protocol === 'https:' ? url.href : null; } catch (_) { return null; }
}
async function flightCityReadJson(response, signal, limit) {
  if (!response || !response.ok) throw new Error('City service is temporarily unavailable.');
  var length = Number(response.headers && response.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit) throw new Error('City response exceeds the download limit.');
  var text = '';
  if (response.body && typeof response.body.getReader === 'function') {
    var reader = response.body.getReader(), decoder = new TextDecoder(), bytes = 0;
    function cancel() { Promise.resolve(reader.cancel()).catch(function() {}); }
    if (signal) signal.addEventListener('abort', cancel, { once: true });
    try {
      while (true) {
        if (signal && signal.aborted) throw flightCityAbortError();
        var chunk = await reader.read();
        if (signal && signal.aborted) throw flightCityAbortError();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > limit) { cancel(); throw new Error('City response exceeds the download limit.'); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { if (signal) signal.removeEventListener('abort', cancel); try { reader.releaseLock(); } catch (_) {} }
  } else {
    // Without a reader, a misleading Content-Length could force an unbounded allocation.
    throw new Error('This browser cannot safely stream city details.');
  }
  if (signal && signal.aborted) throw flightCityAbortError();
  try { return JSON.parse(text); } catch (_) { throw new Error('City service returned unreadable data.'); }
}
function flightCityRequest(fetcher, url, externalSignal, limit, timeoutMs) {
  var controller = new AbortController(), timer, aborted;
  var abortedPromise = new Promise(function(_, reject) { aborted = reject; });
  function cancel() { controller.abort(); aborted(flightCityAbortError()); }
  if (externalSignal) {
    if (externalSignal.aborted) cancel();
    else externalSignal.addEventListener('abort', cancel, { once: true });
  }
  var deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, FLIGHT_CITY_ONLINE_LIMITS.timeout) : FLIGHT_CITY_ONLINE_LIMITS.timeout;
  timer = setTimeout(function() { controller.abort(); aborted(new Error('City service timed out.')); }, deadline);
  var work = Promise.resolve().then(function() {
    if (controller.signal.aborted) throw flightCityAbortError();
    return fetcher(url, { method: 'GET', signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
  }).then(function(response) { return flightCityReadJson(response, controller.signal, limit); });
  return Promise.race([work, abortedPromise]).finally(function() {
    controller.abort(); clearTimeout(timer); if (externalSignal) externalSignal.removeEventListener('abort', cancel);
  });
}
function flightCityWait(ms, signal) {
  return new Promise(function(resolve, reject) {
    if (signal && signal.aborted) { reject(flightCityAbortError()); return; }
    var timer = setTimeout(done, ms);
    function done() { if (signal) signal.removeEventListener('abort', cancel); resolve(); }
    function cancel() { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(flightCityAbortError()); }
    if (signal) signal.addEventListener('abort', cancel, { once: true });
  });
}
async function searchFlightCities(query, options) {
  options = options || {};
  query = flightCityText(query, 160);
  if (options.signal && options.signal.aborted) throw flightCityAbortError();
  if (!query) return [];
  var coordinates = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinates) {
    var manual = flightCityTarget({ name: 'Custom location', label: query, lat: Number(coordinates[1]), lon: Number(coordinates[2]) });
    return manual ? [manual] : [];
  }
  var cities = options.cities || (typeof REAL_CITIES !== 'undefined' ? REAL_CITIES : []);
  function offline() {
    var needle = query.toLocaleLowerCase(), groups = new Map(), results = [];
    cities.filter(function(city) { return Array.isArray(city) && typeof city[0] === 'string' && city[0].toLocaleLowerCase().includes(needle); })
      .sort(function(a, b) { return Number(a[0].toLocaleLowerCase() !== needle) - Number(b[0].toLocaleLowerCase() !== needle) || (b[3] || 0) - (a[3] || 0); })
      .forEach(function(city) {
        var target = flightCityTarget({ name: city[0], lat: city[1], lon: city[2] });
        if (!target) return;
        var name = target.name.toLocaleLowerCase(), group = groups.get(name);
        if (!group) { group = new Map(); groups.set(name, group); }
        // The planner identifies destinations to five decimals. Repeated source rows
        // for that same place must not consume slots or produce identical buttons.
        var key = target.lat.toFixed(5) + ',' + (Math.abs(target.lon) === 180 ? '-180.00000' : target.lon.toFixed(5));
        if (group.has(key)) return;
        group.set(key, target); results.push(target);
      });
    function coordinates(target, precision) {
      return Math.abs(target.lat).toFixed(precision) + '° ' + (target.lat < 0 ? 'S' : 'N') + ', ' +
        Math.abs(target.lon).toFixed(precision) + '° ' + (target.lon < 0 ? 'W' : 'E');
    }
    groups.forEach(function(group) {
      if (group.size < 2) return;
      var places = Array.from(group.values()), precision = 2;
      while (precision < 5 && new Set(places.map(function(target) { return coordinates(target, precision); })).size < places.length) precision++;
      places.forEach(function(target) { target.label = target.name + ' · ' + coordinates(target, precision); });
    });
    return results.slice(0, 5);
  }
  var services = options.endpoints || {}, endpoint = flightCityEndpoint(services.searchUrl, 'https://photon.komoot.io/api/');
  var fetcher = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (options.enabled === false || services.enabled === false || !fetcher || !endpoint) return offline();
  var key = endpoint + '|' + query.toLocaleLowerCase(), memo = flightCitySearchMemo.get(key);
  if (memo) { flightCitySearchMemo.delete(key); flightCitySearchMemo.set(key, memo); return memo.map(function(item) { return Object.assign({}, item); }); }
  var localResults = offline();
  // Make bundled matches usable immediately, including while waiting for our next request slot.
  // Send an empty list too, so a new search cannot leave the previous city's suggestions visible.
  if (typeof options.onResults === 'function' && !(options.signal && options.signal.aborted)) {
    try { options.onResults(localResults.map(function(item) { return Object.assign({}, item); }), { source: 'offline', pending: true }); } catch (_) {}
  }
  var now = options.now || Date.now;
  // Reserve a slot only when starting. Cancelled searches never accumulate a queue.
  while (flightCitySearchNext > now()) await flightCityWait(flightCitySearchNext - now(), options.signal);
  if (options.signal && options.signal.aborted) throw flightCityAbortError();
  flightCitySearchNext = now() + 1000;
  try {
    var url = new URL(endpoint);
    url.searchParams.set('q', query); url.searchParams.set('limit', '5'); url.searchParams.set('lang', 'en');
    url.searchParams.delete('layer'); url.searchParams.append('layer', 'city'); url.searchParams.append('layer', 'locality');
    var raw = await flightCityRequest(fetcher, url.href, options.signal, 256 * 1024, FLIGHT_CITY_SEARCH_TIMEOUT);
    if (!raw || !Array.isArray(raw.features)) throw new Error('Invalid city search results.');
    var seen = new Set(), results = [];
    for (var feature of raw.features.slice(0, 50)) {
      var p = feature && feature.properties, geometry = feature && feature.geometry;
      if (!p || !geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) continue;
      if (p.osm_key && p.osm_key !== 'place' || p.osm_value && !['city', 'town', 'village', 'hamlet', 'locality', 'municipality', 'borough'].includes(p.osm_value)) continue;
      var name = flightCityText(p.name || p.city, 160), label = [name, p.state, p.country].filter(Boolean).filter(function(v, i, list) { return list.indexOf(v) === i; }).join(', ');
      var osmId = typeof p.osm_id === 'number' && Number.isSafeInteger(p.osm_id) && p.osm_id > 0 ? String(p.osm_id)
        : typeof p.osm_id === 'string' && /^\d{1,20}$/.test(p.osm_id) ? p.osm_id : '';
      var target = flightCityTarget({ id: osmId ? 'osm-' + flightCityText(String(p.osm_type || 'place'), 12) + '-' + osmId : '',
        name: name, label: label, lat: geometry.coordinates[1], lon: geometry.coordinates[0] });
      if (!target) continue;
      var identity = target.lat.toFixed(5) + ',' + target.lon.toFixed(5);
      if (seen.has(identity)) continue;
      seen.add(identity); results.push(target); if (results.length === 5) break;
    }
    flightCitySearchMemo.set(key, results);
    while (flightCitySearchMemo.size > 16) flightCitySearchMemo.delete(flightCitySearchMemo.keys().next().value);
    return results.map(function(item) { return Object.assign({}, item); });
  } catch (error) {
    if (options.signal && options.signal.aborted || error && error.name === 'AbortError') throw error;
    // A failed online lookup is different from a successful empty search.
    // Keep bundled matches usable without changing the array return contract.
    if (typeof options.onUnavailable === 'function') { try { options.onUnavailable(); } catch (_) {} }
    return localResults;
  }
}
function validateFlightCityPack(pack) {
  if (!pack || typeof pack !== 'object') return null;
  var target = flightCityTarget(pack), bbox = pack.bbox;
  if (!target || !Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite) || bbox[0] < -90 || bbox[2] > 90 ||
      bbox[1] < -540 || bbox[3] > 540 || bbox[2] <= bbox[0] || bbox[2] - bbox[0] > 4 || bbox[3] <= bbox[1] || bbox[3] - bbox[1] > 4 ||
      !Array.isArray(pack.buildings) || pack.buildings.length > 2500 || !Array.isArray(pack.roads) || pack.roads.length > 1200) return null;
  var middle = (bbox[1] + bbox[3]) / 2, coordinates = 0;
  function point(value) {
    if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) return null;
    var lon = value[0]; while (lon - middle > 180) lon -= 360; while (lon - middle < -180) lon += 360;
    return lon >= bbox[1] - 1e-6 && lon <= bbox[3] + 1e-6 && value[1] >= bbox[0] - 1e-6 && value[1] <= bbox[2] + 1e-6 ? value.slice() : null;
  }
  if (!point([target.lon, target.lat])) return null;
  function line(value, min, max) {
    if (!Array.isArray(value) || value.length < min || value.length > max || (coordinates += value.length) > 30000) return null;
    var points = value.map(point); return points.every(Boolean) ? points : null;
  }
  var buildings = [], roads = [];
  for (var building of pack.buildings) {
    if (!building || !Number.isFinite(building.heightM) || building.heightM <= 0 || building.heightM > 300 ||
        !Number.isInteger(building.style) || building.style < 0 || building.style > 3 || !Array.isArray(building.rings) || building.rings.length < 1 || building.rings.length > 32) return null;
    var rings = building.rings.map(function(ring) { return line(ring, 3, 96); });
    if (rings.some(function(ring) { return !ring; })) return null;
    buildings.push({ id: flightCityText(building.id, 160), heightM: building.heightM, style: building.style,
      heightSource: ['height', 'levels', 'estimated'].includes(building.heightSource) ? building.heightSource : 'estimated', rings: rings });
  }
  for (var road of pack.roads) {
    if (!road || !Number.isFinite(road.widthM) || road.widthM <= 0 || road.widthM > 40) return null;
    var points = line(road.points, 2, 256); if (!points) return null;
    roads.push({ id: flightCityText(road.id, 160), widthM: road.widthM, points: points });
  }
  var meta = pack.metadata || {}, timestamp = typeof meta.osmBaseTimestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(meta.osmBaseTimestamp) ? meta.osmBaseTimestamp : null;
  return { id: target.id, name: target.name, lat: target.lat, lon: target.lon, bbox: bbox.slice(), buildings: buildings, roads: roads,
    metadata: { format: 'skyschool-city-footprints-v1', source: flightCityText(meta.source, 500), osmBaseTimestamp: timestamp,
      attribution: meta.source === 'OpenStreetMap via OpenFreeMap' ? '© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap' : '© OpenStreetMap contributors', license: 'ODbL-1.0',
      counts: { buildings: buildings.length, roads: roads.length, coordinates: coordinates } } };
}
function createFlightCityCache(indexedDB, options) {
  options = options || {}; var now = options.now || Date.now, memory = new Map(), opening, disabled = !indexedDB;
  function valid(record) { return record && Number.isFinite(record.savedAt) && record.savedAt <= now() && now() - record.savedAt < FLIGHT_CITY_ONLINE_LIMITS.cacheAge; }
  function remember(key, record) {
    memory.delete(key); memory.set(key, record);
    while (memory.size > FLIGHT_CITY_ONLINE_LIMITS.cacheEntries) memory.delete(memory.keys().next().value);
  }
  function db() {
    if (disabled) return Promise.resolve(null);
    if (opening) return opening;
    opening = new Promise(function(resolve) {
      var request, done = false, timer = setTimeout(function() { finish(null); }, 2000);
      function finish(value) { if (done) { if (value) value.close(); return; } done = true; clearTimeout(timer); if (!value) disabled = true; resolve(value); }
      try { request = indexedDB.open('SkySchool-city-details-v1', 1); } catch (_) { finish(null); return; }
      request.onupgradeneeded = function() { if (!request.result.objectStoreNames.contains('packs')) request.result.createObjectStore('packs', { keyPath: 'key' }); };
      request.onsuccess = function() { request.result.onversionchange = function() { request.result.close(); disabled = true; }; finish(request.result); };
      request.onerror = request.onblocked = function() { finish(null); };
    }); return opening;
  }
  async function operation(mode, callback) {
    var database = await db(); if (!database) return null;
    return new Promise(function(resolve) {
      var tx, result = null, done = false, timer = setTimeout(function() { try { tx.abort(); } catch (_) {} finish(null); }, 2000);
      function finish(value) { if (done) return; done = true; clearTimeout(timer); resolve(value); }
      try {
        tx = database.transaction('packs', mode);
        tx.oncomplete = function() { finish(result); };
        tx.onabort = tx.onerror = function() { disabled = true; finish(null); };
        callback(tx.objectStore('packs'), function(value) { result = value; });
      } catch (_) { disabled = true; finish(null); }
    });
  }
  return {
    get: async function(key) {
      var record = memory.get(key);
      if (!valid(record)) { memory.delete(key); record = await operation('readonly', function(store, set) { var request = store.get(key); request.onsuccess = function() { set(request.result); }; }); }
      if (!valid(record)) return null;
      var pack = validateFlightCityPack(record.pack); if (!pack) { memory.delete(key); return null; }
      record = { key: key, savedAt: record.savedAt, touchedAt: now(), pack: pack };
      remember(key, record);
      await operation('readwrite', function(store) { store.put(record); }); return validateFlightCityPack(pack);
    },
    put: async function(key, value) {
      var pack = validateFlightCityPack(value); if (!pack) return false;
      var record = { key: key, savedAt: now(), touchedAt: now(), pack: pack }; remember(key, record);
      await operation('readwrite', function(store) {
        store.put(record);
        var request = store.getAll();
        request.onsuccess = function() {
          var records = request.result.filter(function(item) { if (!valid(item)) { store.delete(item.key); return false; } return true; });
          records.sort(function(a, b) { return b.touchedAt - a.touchedAt || b.savedAt - a.savedAt; });
          records.slice(FLIGHT_CITY_ONLINE_LIMITS.cacheEntries).forEach(function(item) { store.delete(item.key); });
        };
      }); return true;
    }
  };
}
function createFlightCityLoader(options) {
  options = options || {};
  var now = options.now || Date.now, services = options.endpoints || {}, provider = getFlightCityProvider(services), endpoint = provider.url;
  // OpenFreeMap city packs stay in this loader's memory. Never persist these tiles or packs in IndexedDB.
  var fetcher = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  var cache = provider.kind === 'vector' ? createFlightCityCache(null, { now: now }) : options.cache || createFlightCityCache(null, { now: now });
  var converter = options.convert || (typeof convertFlightCityData === 'function' ? convertFlightCityData : null);
  var vectorConverter = options.convertVector || (typeof convertFlightCityVectorTilesAsync === 'function' ? convertFlightCityVectorTilesAsync :
    typeof convertFlightCityVectorTiles === 'function' ? convertFlightCityVectorTiles : null);
  var generation = 0, controller = null, disposed = false, target = null, enabled = false, cachePending = false, position = null, failures = new Map();
  var state = { phase: 'idle', target: null, pack: null, source: null, retryAt: 0, message: '' };
  function snapshot() { return Object.assign({}, state); }
  function publish(patch) { if (disposed) return snapshot(); state = Object.assign({}, state, patch); if (options.onChange) { try { options.onChange(snapshot()); } catch (_) {} } return snapshot(); }
  function cancel() { generation++; if (controller) controller.abort(); controller = null; cachePending = false; }
  function key() { return 'v1|' + provider.id + '|' + target.id + '|' + target.lat.toFixed(5) + ',' + target.lon.toFixed(5); }
  function nearby() { return target && position && flightCityDistance(target, position) <= FLIGHT_CITY_ONLINE_LIMITS.approachNm; }
  function failed(cacheKey, phase, message) {
    var failure = { phase: phase, retryAt: now() + FLIGHT_CITY_ONLINE_LIMITS.cooldown, message: message };
    failures.delete(cacheKey); failures.set(cacheKey, failure);
    while (failures.size > 8) failures.delete(failures.keys().next().value);
    return failure;
  }
  function launch() {
    if (disposed || cachePending || !enabled || state.phase !== 'waiting' || !nearby()) return;
    var failure = failures.get(key()); if (failure) { publish(failure); return; }
    var selected = target, token = generation, cacheKey = key(), latSpan = 900 / 111320;
    var lonSpan = Math.min(1.9, latSpan / Math.max(.000001, Math.cos(selected.lat * Math.PI / 180)));
    var bbox = [Math.max(-90, selected.lat - latSpan), selected.lon - lonSpan, Math.min(90, selected.lat + latSpan), selected.lon + lonSpan];
    var boxes = bbox[1] < -180 ? [[bbox[0], bbox[1] + 360, bbox[2], 180], [bbox[0], -180, bbox[2], bbox[3]]]
      : bbox[3] > 180 ? [[bbox[0], bbox[1], bbox[2], 180], [bbox[0], -180, bbox[2], bbox[3] - 360]] : [bbox];
    var clauses = boxes.map(function(box) { var bounds = box.map(function(value) { return value.toFixed(6); }).join(','); return 'way["building"](' + bounds + ');relation["building"]["type"="multipolygon"](' + bounds + ');way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian)$"](' + bounds + ');'; }).join('');
    // Overpass maxsize limits server working RAM, separately from our 4 MiB download cap.
    var query = '[out:json][timeout:20][maxsize:33554432];(' + clauses + ');out geom;';
    controller = new AbortController();
    var signal = controller.signal;
    publish({ phase: 'loading', message: 'Loading mapped city details…', retryAt: 0 });
    var request;
    if (provider.kind === 'vector') request = fetchFlightCityVectorPack(selected, { fetch: fetcher, signal: signal, provider: provider, convert: vectorConverter });
    else {
      var url = new URL(endpoint); url.searchParams.set('data', query);
      request = flightCityRequest(fetcher, url.href, signal, FLIGHT_CITY_ONLINE_LIMITS.bytes).then(function(raw) {
        if (disposed || generation !== token || signal.aborted) return null;
        if (!raw || !Array.isArray(raw.elements) || raw.remark) throw new Error('City service could not finish this district.');
        return validateFlightCityPack(converter(raw, { id: selected.id, name: selected.name, lat: selected.lat, lon: selected.lon, bbox: bbox, source: 'OpenStreetMap via ' + endpoint }));
      });
    }
    request.then(function(pack) {
      if (disposed || generation !== token || signal.aborted) return;
      if (!pack) throw new Error('City details failed validation.');
      controller = null;
      if (!pack.buildings.length && !pack.roads.length) { publish(Object.assign({ pack: null, source: 'network' }, failed(cacheKey, 'empty', 'No mapped detail was found in this district.'))); return; }
      publish({ phase: 'ready', pack: pack, source: 'network', message: 'Mapped district ready.' });
      Promise.resolve().then(function() { return cache.put(cacheKey, pack); }).catch(function() {});
    }).catch(function(error) {
      if (disposed || generation !== token || signal.aborted && error.name === 'AbortError') return;
      controller = null;
      publish(Object.assign({ pack: null, source: null }, failed(cacheKey, 'error', 'City details are unavailable. The standard scenery remains available.')));
    });
  }
  return {
    select: function(value, online) {
      if (disposed) return snapshot();
      var next = flightCityTarget(value), nextEnabled = online !== false && options.enabled !== false && services.enabled !== false && !!fetcher &&
        (provider.kind === 'vector' ? !!vectorConverter : provider.kind === 'overpass' && !!converter);
      if (target && next && target.id === next.id && target.lat === next.lat && target.lon === next.lon && enabled === nextEnabled) return snapshot();
      cancel(); target = next; position = null; enabled = nextEnabled;
      state = { phase: target ? 'waiting' : 'idle', target: target, pack: null, source: null, retryAt: 0, message: target ? 'Details load when you approach this city.' : '' };
      if (!target) return publish({});
      var builtin = (options.builtinPacks || []).find(function(pack) { return pack.id === target.id || Number.isFinite(pack.lat) && Number.isFinite(pack.lon) && flightCityDistance(target, pack) < 1; });
      if (builtin) { var validated = validateFlightCityPack(builtin); if (validated) return publish({ phase: 'ready', pack: validated, source: 'builtin', message: 'Offline mapped district ready.' }); }
      var token = generation, cacheKey = key(); cachePending = true; publish({});
      Promise.resolve().then(function() { return cache.get(cacheKey); }).catch(function() { return null; }).then(function(value) {
        if (disposed || generation !== token) return;
        cachePending = false; var pack = validateFlightCityPack(value);
        if (pack && Math.abs(pack.lat - target.lat) < .00001 && Math.abs(pack.lon - target.lon) < .00001) {
          publish({ phase: 'ready', pack: pack, source: 'cache', message: 'Saved mapped district ready.' });
        } else if (!enabled) publish({ phase: 'offline', message: provider.reason === 'invalid' ? 'The configured city data service is invalid. Standard scenery is available.' : 'Online city details are off. Standard scenery is available.' });
        else launch();
      }); return snapshot();
    },
    approach: function(lat, lon) {
      if (!disposed && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { position = { lat: lat, lon: lon }; launch(); }
      return snapshot();
    },
    retry: function() {
      if (!disposed && target && enabled && (state.phase === 'error' || state.phase === 'empty') && now() >= state.retryAt) {
        failures.delete(key());
        publish({ phase: 'waiting', retryAt: 0, message: 'Details load when you approach this city.' }); launch();
      } return snapshot();
    },
    dispose: function() { cancel(); disposed = true; target = null; state = { phase: 'idle', target: null, pack: null, source: null, retryAt: 0, message: '' }; },
    getState: snapshot,
    getPack: function() { return state.pack; }
  };
}
