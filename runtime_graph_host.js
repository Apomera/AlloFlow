// Installed from the host's lexical, reviewed graph inventory. Tool messages
// select a named graph or data input; they never supply executable authority.
function _alloInstallRuntimeGraphHost(manifest, target) {
  'use strict';
  // Canvas blob pages resolve reviewed runtime assets from the CDN.
  var pageHref = String((target.location && target.location.href) || '');
  var desktop = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(target.location.hostname || '')
    && (target.location.pathname || '').indexOf('/app/') === 0;
  var policy = _alloCreateRuntimeGraphDeliveryPolicy(manifest, {
    baseUrl: /^https?:\/\//i.test(pageHref) ? pageHref : 'https://alloflow-cdn.pages.dev/', isDesktopBundledApp: desktop,
    fetch: typeof target.fetch === 'function' ? target.fetch.bind(target) : null, crypto: target.crypto, Blob: target.Blob, allowNativeIntegrity: true,
    URL: target.URL, Worker: target.Worker, AbortController: target.AbortController,
    setTimeout: target.setTimeout.bind(target), clearTimeout: target.clearTimeout.bind(target),
    btoa: target.btoa.bind(target), TextDecoder: target.TextDecoder,
    importModule: function (url) { return import(/* webpackIgnore: true */ url); }
  });
  var open = new Map(), closing = new Map();
  var prepare = function (name) {
    if (!open.has(name)) {
      var barrier = closing.get(name);
      var pending = barrier ? barrier.then(function () { return policy.prepare(name); }) : policy.prepare(name);
      open.set(name, pending);
      pending.then(function (session) { pending.runtimeSession = session; }, function () {});
      pending.catch(function () { if (open.get(name) === pending) open.delete(name); });
    }
    return open.get(name);
  };
  var dispose = function (name, session) {
    var pending = open.get(name);
    if (session) {
      // A late lease from an older session must not dispose its replacement.
      if (pending && pending.runtimeSession === session) { pending.runtimeClosing = true; open.delete(name); }
      session.dispose(); return;
    }
    open.delete(name);
    if (pending) {
      pending.runtimeClosing = true;
      var barrier = pending.then(function (current) { current.dispose(); }, function () {});
      closing.set(name, barrier);
      barrier.then(function () { if (closing.get(name) === barrier) closing.delete(name); });
    }
  };
  var assertPendingOpen = function (pending) {
    if (pending.runtimeClosing) {
      var error = new Error('Verified runtime: runtime session is closing'); error.code = 'ALLO_RUNTIME_INTEGRITY'; throw error;
    }
  };
  var define = function (name, value) { Object.defineProperty(target, name, { value: value, writable: false, configurable: true }); };
  define('__alloFetchTrustedScriptText', function (url, key) { return policy.fetchText(url, key); });
  define('__alloLoadVerifiedRuntime', function (name) { var pending = prepare(name); return pending.then(function (session) {
    assertPendingOpen(pending);
    return Promise.resolve().then(function () { assertPendingOpen(pending); return session.load(); }).catch(function (error) { dispose(name, session); throw error; });
  }); });
  define('__alloDisposeVerifiedRuntime', function (name) { dispose(name); });
  define('__alloGetVerifiedRuntimeAsset', function (name, binding) {
    var pending = prepare(name);
    return pending.then(function (session) {
      assertPendingOpen(pending);
      var asset; try { asset = session.asset(binding); } catch (error) { dispose(name, session); throw error; }
      var released = false;
      return Object.freeze({ url: asset.url, revoke: function () {
        if (released) return; released = true; asset.revoke(); dispose(name, session);
      } });
    });
  });
  define('__alloCreateVerifiedWorker', function (name, source, options) {
    var pending = prepare(name);
    return pending.then(function (session) {
      assertPendingOpen(pending);
      var worker; try { worker = session.createWorker(source, options); } catch (error) { dispose(name, session); throw error; }
      var terminate = worker.terminate.bind(worker);
      worker.terminate = function () { try { return terminate(); } finally { dispose(name, session); } };
      return worker;
    });
  });
  return policy;
}
