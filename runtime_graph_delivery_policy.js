// Embedded with host-reviewed records. Runtime responses never supply their own
// authority. A complete selected executable graph is verified before execution.
function _alloCreateRuntimeGraphDeliveryPolicy(input, environment) {
  'use strict';
  var env = environment || {}, owns = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var failure = function (message) { var error = new Error('Verified runtime: ' + message); error.code = 'ALLO_RUNTIME_INTEGRITY'; return error; };
  var checkObject = function (value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') throw failure('invalid record');
    Object.values(Object.getOwnPropertyDescriptors(value)).forEach(function (descriptor) { if (!owns(descriptor, 'value')) throw failure('accessors are forbidden'); });
  };
  var pathSafe = function (value) { return typeof value === 'string' && value.length <= 300 && value.split('/').every(function (part) { return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part) && !['__proto__', 'constructor', 'prototype'].includes(part); }); };
  var idSafe = function (value) { return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value) && !['constructor', 'prototype'].includes(value); };
  var hashSafe = function (value) { return typeof value === 'string' && /^[a-f0-9]{96}$/.test(value); };
  var sizeSafe = function (value) { return Number.isSafeInteger(value) && value > 0 && value <= 128 * 1024 * 1024; };
  checkObject(input); checkObject(input.assets); checkObject(input.graphs);
  if (input.schemaVersion !== 1 || Object.keys(input.assets).length > 500 || Object.keys(input.graphs).length > 100) throw failure('unsupported graph manifest');
  var assets = Object.create(null), graphs = Object.create(null), urlRecords = Object.create(null);
  var base;
  try { base = new URL('.', env.baseUrl); } catch (_) { throw failure('invalid base URL'); }
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) throw failure('invalid base URL');
  var desktop = env.isDesktopBundledApp === true;
  if (desktop && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(base.hostname)) throw failure('Desktop requires loopback');
  var validateURL = function (value) {
    if (typeof value !== 'string' || value.length > 4096 || /[\x00-\x20\x7f\\%]/.test(value) || value.slice(0, 2) === '//'
      || /(^|\/)\.{1,2}(\/|[?#]|$)/.test(value.slice(0, 2) === './' ? value.slice(2) : value)) throw failure('invalid asset URL');
    var url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.hash) throw failure('invalid asset URL');
    return url;
  };
  Object.keys(input.assets).forEach(function (id) {
    if (!idSafe(id)) throw failure('invalid asset id');
    var source = input.assets[id]; checkObject(source);
    if (!['script', 'module', 'worker', 'wasm', 'part', 'data'].includes(source.kind)
      || !sizeSafe(source.bytes) || !hashSafe(source.sha384)
      || (source.path !== null && !pathSafe(source.path))) throw failure('invalid executable asset: ' + id);
    ['mirrors', 'parts', 'dependencies', 'aliases'].forEach(function (key) { if (source[key] !== undefined && !Array.isArray(source[key])) throw failure('invalid asset list'); });
    var mirrors = (source.mirrors || []).map(function (mirror) {
      checkObject(mirror); var url = validateURL(mirror.url);
      if (url.protocol !== 'https:' || url.href !== mirror.url || !sizeSafe(mirror.bytes) || !hashSafe(mirror.sha384)
        || /(?:^|[\/@-])(?:main|master|latest)(?:[\/.@-]|$)/i.test(url.pathname)) throw failure('invalid runtime mirror');
      return Object.freeze({ url: url.href, bytes: mirror.bytes, sha384: mirror.sha384 });
    });
    var parts = (source.parts || []).slice(), dependencies = (source.dependencies || []).slice(), aliases = (source.aliases || []).slice();
    if (parts.length > 32 || dependencies.length > 100 || mirrors.length > 12 || aliases.length > 30
      || !parts.every(idSafe) || !dependencies.every(idSafe) || !aliases.every(function (value) { return typeof value === 'string' && value.length <= 4096 && !['__proto__', 'constructor', 'prototype'].includes(value); })) throw failure('invalid asset references');
    if (parts.length && source.kind !== 'wasm') throw failure('only WebAssembly may be composed');
    if (!source.path && !parts.length && !mirrors.length) throw failure('asset has no approved source: ' + id);
    if ((source.kind === 'module' || source.kind === 'worker') && source.closed !== true) throw failure('unclosed executable asset: ' + id);
    assets[id] = Object.freeze({ kind: source.kind, path: source.path, bytes: source.bytes, sha384: source.sha384,
      mirrors: Object.freeze(mirrors), parts: Object.freeze(parts), dependencies: Object.freeze(dependencies), aliases: Object.freeze(aliases) });
  });
  Object.keys(assets).forEach(function (id) {
    var record = assets[id];
    record.parts.concat(record.dependencies).forEach(function (child) { if (!owns(assets, child)) throw failure('unknown child asset: ' + child); });
    record.parts.forEach(function (child) { if (assets[child].kind !== 'part') throw failure('invalid composite part kind'); });
    record.aliases.forEach(function (alias) {
      if (!/^https?:/.test(alias)) return;
      var url = validateURL(alias);
      if (url.protocol !== 'https:' || url.href !== alias) throw failure('invalid runtime alias');
      if (owns(urlRecords, alias) && urlRecords[alias].id !== id) throw failure('ambiguous runtime alias');
      urlRecords[alias] = Object.freeze({ id: id, url: alias, bytes: record.bytes, sha384: record.sha384 });
    });
    record.mirrors.forEach(function (mirror) {
      if (owns(urlRecords, mirror.url) && urlRecords[mirror.url].id !== id) throw failure('ambiguous runtime URL');
      urlRecords[mirror.url] = Object.freeze({ id: id, url: mirror.url, bytes: mirror.bytes, sha384: mirror.sha384 });
    });
    if (record.path) {
      var sources = [new URL(record.path, base).href];
      if (!desktop) sources.push(new URL('/' + record.path, base).href, 'https://alloflow-cdn.pages.dev/' + record.path);
      sources.forEach(function (url) {
        if (owns(urlRecords, url) && urlRecords[url].id !== id) throw failure('ambiguous runtime path');
        urlRecords[url] = Object.freeze({ id: id, url: url, bytes: record.bytes, sha384: record.sha384 });
      });
    }
  });
  Object.keys(input.graphs).forEach(function (name) {
    if (!idSafe(name)) throw failure('invalid graph name');
    var source = input.graphs[name]; checkObject(source);
    if (!Array.isArray(source.assets) || !source.assets.length || source.assets.length > 200) throw failure('invalid selected graph');
    var selected = Array.from(new Set(source.assets));
    selected.forEach(function (id) { if (!owns(assets, id)) throw failure('unknown graph asset'); });
    selected.forEach(function (id) { assets[id].parts.concat(assets[id].dependencies).forEach(function (child) { if (!selected.includes(child)) throw failure('graph omits a dependency'); }); });
    var bindings = Object.create(null); checkObject(source.bindings || {});
    Object.keys(source.bindings || {}).forEach(function (key) { var id = source.bindings[key]; if (!idSafe(key) || !selected.includes(id)) throw failure('invalid graph binding'); bindings[key] = id; });
    if (source.scripts !== undefined && !Array.isArray(source.scripts)) throw failure('invalid graph scripts');
    var scripts = (source.scripts || []).slice();
    if (scripts.some(function (id) { return !selected.includes(id) || !['script', 'worker'].includes(assets[id].kind); })
      || (source.entry && (!selected.includes(source.entry) || assets[source.entry].kind !== 'module'))
      || (source.configureExport && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(source.configureExport))) throw failure('invalid graph execution contract');
    graphs[name] = Object.freeze({ assets: Object.freeze(selected), entry: source.entry || null, scripts: Object.freeze(scripts),
      bindings: Object.freeze(bindings), configureExport: source.configureExport || null });
  });
  Object.freeze(assets); Object.freeze(graphs); Object.freeze(urlRecords);
  var nativeFetch = env.fetch, crypto = env.crypto, NativeBlob = env.Blob, URLApi = env.URL, NativeWorker = env.Worker;
  var schedule = env.setTimeout, cancel = env.clearTimeout;
  var sessions = new Map();
  var integritySupport;
  var integrityOf = function (hex) { return 'sha384-' + env.btoa(hex.match(/../g).map(function (pair) { return String.fromCharCode(parseInt(pair, 16)); }).join('')); };
  var nativeDigest = async function (bytes, expected) {
    // HTTP classroom LAN pages lack SubtleCrypto. Fetch's native SRI verifier
    // can still hash an in-memory Blob. Probe both acceptance and rejection so
    // a browser that ignores the integrity option fails closed.
    if (env.allowNativeIntegrity !== true || !NativeBlob || !URLApi || !env.btoa) throw failure('cryptographic verification unavailable');
    if (!integritySupport) integritySupport = (async function () {
      var probe = URLApi.createObjectURL(new NativeBlob([new Uint8Array([0])], { type: 'application/octet-stream' }));
      try {
        var good = await nativeFetch(probe, { integrity: integrityOf('bec021b4f368e3069134e012c2b4307083d3a9bdd206e24e5f0d86e13d6636655933ec2b413465966817a9c208a11717') });
        if (!good.ok) throw failure('native integrity verifier unavailable');
        await good.arrayBuffer();
        var rejected = false; try { await nativeFetch(probe, { integrity: integrityOf('0'.repeat(96)) }); } catch (_) { rejected = true; }
        if (!rejected) throw failure('browser ignores native integrity verification');
      } finally { URLApi.revokeObjectURL(probe); }
    })();
    await integritySupport;
    var url = URLApi.createObjectURL(new NativeBlob([bytes], { type: 'application/octet-stream' }));
    try {
      var response = await nativeFetch(url, { integrity: integrityOf(expected.sha384) });
      if (!response.ok) throw failure('executable digest differs');
      await response.arrayBuffer(); return bytes;
    } catch (_) { throw failure('executable digest differs'); }
    finally { URLApi.revokeObjectURL(url); }
  };
  var select = function (value, localizeDesktop) {
    var url = validateURL(value), canonical = url.href;
    if (!owns(urlRecords, canonical)) {
      url.search = ''; canonical = url.href;
      if (!owns(urlRecords, canonical) || !assets[urlRecords[canonical].id].path) throw failure('URL is not in a reviewed graph');
    }
    var record = urlRecords[canonical];
    if (desktop && !(new URL(canonical).origin === base.origin && new URL(canonical).pathname.indexOf(base.pathname) === 0)) {
      if (localizeDesktop === true && assets[record.id].path) return urlRecords[new URL(assets[record.id].path, base).href];
      throw failure('Desktop remote runtime code is disabled');
    }
    return record;
  };
  var verify = async function (bytes, expected) {
    if (bytes.byteLength !== expected.bytes) throw failure('executable byte length differs');
    if (!crypto || !crypto.subtle) return nativeDigest(bytes, expected);
    var digest = await crypto.subtle.digest('SHA-384', bytes);
    var actual = Array.from(new Uint8Array(digest), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    if (actual !== expected.sha384) throw failure('executable digest differs');
    return bytes;
  };
  var fetchSelected = async function (expected) {
    if (typeof nativeFetch !== 'function') throw failure('verified fetch unavailable');
    var controller = typeof env.AbortController === 'function' ? new env.AbortController() : null;
    var timer = schedule ? schedule(function () { if (controller) controller.abort(); }, 60000) : null;
    var reader;
    try {
      var response = await nativeFetch(expected.url, { credentials: 'omit', mode: 'cors', cache: 'no-store', signal: controller && controller.signal });
      if (!response || response.status !== 200 || !response.body || !response.body.getReader) throw failure('executable response unavailable');
      reader = response.body.getReader();
      var bytes = new Uint8Array(expected.bytes), offset = 0;
      for (;;) {
        var chunk = await reader.read(); if (chunk.done) break;
        if (offset + chunk.value.byteLength > expected.bytes) throw failure('executable exceeds approved bound');
        bytes.set(chunk.value, offset); offset += chunk.value.byteLength;
      }
      if (offset !== expected.bytes) throw failure('executable length differs');
      return await verify(bytes, expected);
    } catch (error) {
      if (reader) try { await reader.cancel(); } catch (_) {}
      if (error && error.code === 'ALLO_RUNTIME_INTEGRITY') throw error;
      throw failure('executable fetch failed: ' + (error && error.message || 'network error'));
    } finally { if (timer && cancel) cancel(timer); }
  };
  // This function's source is embedded into an already-verified module/worker.
  // It maps executable operations to this session's immutable Blob URLs. Model
  // and document data remain ordinary data fetches; they cannot select JS/WASM.
  function runtimeCapabilities(table, types, original, workerMode, depth) {
    'use strict';
    Object.freeze(table); Object.freeze(types);
    var nativeFetch = globalThis.fetch && globalThis.fetch.bind(globalThis), NativeWorker = globalThis.Worker;
    var nativeScripts = globalThis.importScripts && globalThis.importScripts.bind(globalThis);
    var resolve = function (value, kinds) {
      var raw = String(value), url;
      if (Object.prototype.hasOwnProperty.call(table, raw)) url = table[raw];
      else try { var absolute = new URL(raw, original).href; if (Object.prototype.hasOwnProperty.call(table, absolute)) url = table[absolute]; } catch (_) {}
      if (!url || kinds && !kinds.includes(types[url])) throw new Error('Unreviewed executable runtime dependency');
      return url;
    };
    var guardedFetch = function (value, options) {
      var raw = typeof value === 'string' ? value : value && value.url || String(value);
      try { return nativeFetch(resolve(raw), options); } catch (error) {
        var url; try { url = new URL(raw, original); } catch (_) { return Promise.reject(error); }
        if (/\.(?:m?js|cjs|wasm|data)(?:$|[?#])/i.test(url.pathname) || url.protocol === 'blob:') return Promise.reject(error);
        return nativeFetch(value, options);
      }
    };
    var imported = function (value) { return import(resolve(value, ['module'])); };
    var scripts = function () {
      if (!nativeScripts) throw new Error('Classic worker imports unavailable');
      return nativeScripts.apply(null, Array.from(arguments, function (value) { return resolve(value, ['script', 'worker']); }));
    };
    var worker = function (value, options) {
      if (!NativeWorker || depth >= 4 || options && options.type === 'module') throw new Error('Unreviewed worker execution mode');
      var target = resolve(value, ['worker']);
      // Child workers inherit the complete guard, rather than executing a raw
      // approved body with unrestricted child imports.
      var source = '(' + runtimeCapabilities.toString() + ')(' + JSON.stringify(table) + ',' + JSON.stringify(types)
        + ',' + JSON.stringify(original) + ',true,' + (depth + 1) + ');\n__alloRuntimeImportScripts(' + JSON.stringify(target) + ');';
      var url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' })), instance;
      try { instance = new NativeWorker(url, options); } catch (error) { URL.revokeObjectURL(url); throw error; }
      var terminate = instance.terminate.bind(instance);
      instance.terminate = function () { try { return terminate(); } finally { URL.revokeObjectURL(url); } };
      return instance;
    };
    var capabilities = Object.freeze({ assets: table, imported: imported, scripts: scripts, worker: worker, fetch: guardedFetch, original: original });
    if (workerMode) {
      globalThis.__alloRuntimeAssets = table; globalThis.__alloRuntimeImport = imported;
      globalThis.__alloRuntimeImportScripts = scripts; globalThis.__alloRuntimeWorker = worker;
      globalThis.__alloRuntimeFetch = guardedFetch; globalThis.fetch = guardedFetch;
      globalThis.importScripts = scripts; globalThis.Worker = worker;
    }
    return capabilities;
  }
  function capabilityPrelude(mapping, original, workerMode) {
    var types = Object.create(null);
    Object.keys(assets).forEach(function (id) { if (mapping[id]) types[mapping[id]] = assets[id].kind; });
    var code = '(' + runtimeCapabilities.toString() + ')(' + JSON.stringify(mapping) + ',' + JSON.stringify(types) + ',' + JSON.stringify(original || base.href) + ',' + workerMode + ',0)';
    if (workerMode) return 'const __alloRuntimeCapabilities=' + code + ';\n'
      + 'globalThis.__alloRuntimeAssets=__alloRuntimeCapabilities.assets;globalThis.__alloRuntimeImport=__alloRuntimeCapabilities.imported;'
      + 'globalThis.__alloRuntimeImportScripts=__alloRuntimeCapabilities.scripts;globalThis.__alloRuntimeWorker=__alloRuntimeCapabilities.worker;'
      + 'globalThis.__alloRuntimeFetch=__alloRuntimeCapabilities.fetch;globalThis.fetch=__alloRuntimeCapabilities.fetch;'
      + 'globalThis.importScripts=__alloRuntimeCapabilities.scripts;globalThis.Worker=__alloRuntimeCapabilities.worker;\n';
    return 'const __alloRuntimeCapabilities=' + code + ';\n'
      + 'const __alloRuntimeAssets=__alloRuntimeCapabilities.assets,__alloRuntimeImport=__alloRuntimeCapabilities.imported,'
      + '__alloRuntimeImportScripts=__alloRuntimeCapabilities.scripts,__alloRuntimeWorker=__alloRuntimeCapabilities.worker,'
      + '__alloRuntimeFetch=__alloRuntimeCapabilities.fetch,__alloRuntimeOriginalUrl=__alloRuntimeCapabilities.original;\n';
  }
  var prepare = function (name) {
    if (!owns(graphs, name)) return Promise.reject(failure('unknown runtime graph'));
    if (sessions.has(name)) return sessions.get(name);
    var promise = (async function () {
      var graph = graphs[name], bytePromises = new Map(), urls = Object.create(null), made = [], modules = new Map(), disposed = false;
      var disposalRequested = false, leases = 0;
      var bytesFor = function (id, chain) {
        if ((chain || []).includes(id)) return Promise.reject(failure('cyclic asset composition'));
        if (bytePromises.has(id)) return bytePromises.get(id);
        var record = assets[id];
        var pending = (async function () {
          if (record.parts.length) {
            var parts = [];
            for (var child of record.parts) parts.push(await bytesFor(child, (chain || []).concat(id)));
            var total = parts.reduce(function (sum, bytes) { return sum + bytes.byteLength; }, 0);
            if (total !== record.bytes) throw failure('composite executable length differs');
            var joined = new Uint8Array(total), offset = 0;
            parts.forEach(function (bytes) { joined.set(bytes, offset); offset += bytes.byteLength; });
            return verify(joined, record);
          }
          var candidates = [];
          if (record.path) candidates.push(new URL(record.path, base).href);
          if (!desktop && record.path) candidates.push(new URL('/' + record.path, base).href, 'https://alloflow-cdn.pages.dev/' + record.path);
          if (!desktop) record.mirrors.forEach(function (mirror) { candidates.push(mirror.url); });
          var last;
          for (var candidate of Array.from(new Set(candidates))) {
            try { return await fetchSelected(select(candidate)); } catch (error) {
              last = error;
              // A response that differs from its approved bytes is not a reason
              // to silently choose an unsigned or legacy executable.
              if (/digest differs|length differs|approved bound/.test(error.message || '')) throw error;
            }
          }
          throw last || failure('no approved runtime source available');
        })();
        bytePromises.set(id, pending); return pending;
      };
      var finishDisposal = function () {
        if (!disposalRequested || leases > 0) return;
        if (disposed) return; disposed = true;
        made.forEach(function (url) { try { URLApi.revokeObjectURL(url); } catch (_) {} });
        bytePromises.clear(); modules.clear(); if (sessions.get(name) === promise) sessions.delete(name);
      };
      var dispose = function () {
        disposalRequested = true;
        if (sessions.get(name) === promise) sessions.delete(name);
        finishDisposal();
      };
      var retain = function () {
        if (disposed || disposalRequested) throw failure('runtime session is closing');
        leases++; var released = false;
        return function () { if (released) return; released = true; leases--; finishDisposal(); };
      };
      try {
        for (var id of graph.assets) await bytesFor(id, []);
        var bindings = function () {
          var map = Object.create(null);
          var put = function (key, value) { if (owns(map, key) && map[key] !== value) throw failure('ambiguous runtime binding'); map[key] = value; };
          Object.keys(urls).forEach(function (id) {
            put(id, urls[id]); put(urls[id], urls[id]); var record = assets[id];
            if (record.path) { put(new URL(record.path, base).href, urls[id]); put('https://alloflow-cdn.pages.dev/' + record.path, urls[id]); }
            record.aliases.forEach(function (alias) { put(alias, urls[id]); });
            record.mirrors.forEach(function (mirror) { put(mirror.url, urls[id]); });
          });
          Object.keys(graph.bindings).forEach(function (key) { put(key, urls[graph.bindings[key]]); });
          return Object.freeze(map);
        };
        var buildBlob = function (id, chain) {
          if (urls[id]) return urls[id];
          if (chain.includes(id)) throw failure('cyclic executable dependencies');
          var record = assets[id];
          record.dependencies.forEach(function (child) { buildBlob(child, chain.concat(id)); });
          var type = record.kind === 'wasm' ? 'application/wasm' : ['module', 'script', 'worker'].includes(record.kind) ? 'text/javascript' : 'application/octet-stream';
          var verified = verifiedBytes[id];
          var parts = [verified];
          // Raw classic worker/library bodies are imported under a single full
          // session bootstrap. Prefixing each imported library would replace
          // that bootstrap's complete capability map with a partial map.
          if (record.kind === 'module') parts.unshift(capabilityPrelude(bindings(), record.path ? new URL(record.path, base).href : base.href, false));
          var url = URLApi.createObjectURL(new NativeBlob(parts, { type: type })); made.push(url); urls[id] = url; return url;
        };
        var verifiedBytes = Object.create(null);
        for (var id of graph.assets) verifiedBytes[id] = await bytePromises.get(id);
        graph.assets.filter(function (id) { return !['module', 'script', 'worker'].includes(assets[id].kind); }).forEach(function (id) { buildBlob(id, []); });
        graph.assets.forEach(function (id) { buildBlob(id, []); });
        // Blob storage now owns the verified content. Retaining acquisition
        // promises would keep a second full WASM graph alive for the session.
        bytePromises.clear(); verifiedBytes = null;
        var importAsset = async function (id) {
          if (disposed || disposalRequested || !graph.assets.includes(id) || assets[id].kind !== 'module') throw failure('module not in selected verified graph');
          if (!modules.has(id)) modules.set(id, Promise.resolve().then(function () { return env.importModule(urls[id]); }));
          return modules.get(id);
        };
        var session = Object.freeze({
          assets: bindings(),
          import: importAsset,
          load: async function () {
            if (!graph.entry) throw failure('graph has no module entry');
            var namespace = await importAsset(graph.entry);
            if (graph.configureExport) {
              if (typeof namespace[graph.configureExport] !== 'function') throw failure('runtime configuration export missing');
              await namespace[graph.configureExport](bindings());
            }
            return namespace;
          },
          asset: function (key) {
            var id = graph.bindings[key] || key;
            if (disposed || disposalRequested || !graph.assets.includes(id)) throw failure('asset not in selected verified graph');
            var release = retain(), url = urls[id];
            try {
              if (assets[id].kind === 'worker') {
                var wrapper = capabilityPrelude(bindings(), base.href, true) + '__alloRuntimeImportScripts(' + JSON.stringify(id) + ');\n';
                url = URLApi.createObjectURL(new NativeBlob([wrapper], { type: 'text/javascript' })); made.push(url);
              }
            } catch (error) { release(); throw error; }
            return Object.freeze({ url: url, revoke: release });
          },
          createWorker: function (source, options) {
            if (disposed || disposalRequested || typeof NativeWorker !== 'function' || typeof source !== 'string' || source.length > 2 * 1024 * 1024) throw failure('verified worker unavailable');
            var prelude = capabilityPrelude(bindings(), base.href, true);
            var imports = graph.scripts.length ? '__alloRuntimeImportScripts(' + graph.scripts.map(JSON.stringify).join(',') + ');\n' : '';
            var url = URLApi.createObjectURL(new NativeBlob([prelude, imports, source], { type: 'text/javascript' })); made.push(url);
            var release = retain(), worker;
            try { worker = new NativeWorker(url, options || {}); } catch (error) { release(); throw error; }
            var terminate = worker.terminate.bind(worker);
            worker.terminate = function () { try { return terminate(); } finally { release(); } };
            return worker;
          },
          dispose: dispose
        });
        return session;
      } catch (error) { dispose(); throw error; }
    })();
    sessions.set(name, promise); promise.catch(function () { if (sessions.get(name) === promise) sessions.delete(name); });
    return promise;
  };
  return Object.freeze({
    prepare: prepare,
    isApprovedUrl: function (url) { try { select(url); return true; } catch (_) { return false; } },
    canConfigureScript: function (url) { try { return ['script', 'worker'].includes(assets[select(url, true).id].kind); } catch (_) { return false; } },
    configureScript: function (script, url, key) {
      var record = select(url, true);
      if (!['script', 'worker'].includes(assets[record.id].kind) || key && key !== record.id) throw failure('script kind/key mismatch');
      var binary = record.sha384.match(/../g).map(function (pair) { return String.fromCharCode(parseInt(pair, 16)); }).join('');
      script.integrity = 'sha384-' + env.btoa(binary); script.crossOrigin = 'anonymous'; script.referrerPolicy = 'no-referrer'; script.src = record.url;
      return script;
    },
    fetchText: async function (url, key) {
      var record = select(url, true);
      if (assets[record.id].kind !== 'script' || key && key !== record.id) throw failure('script text kind/key mismatch');
      var bytes = await fetchSelected(record);
      return new env.TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
  });
}
