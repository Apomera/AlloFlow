// Embedded with the optional vendor policy before any feature can request it.
// Public promises settle on timeout. An outstanding classic script retains its
// dedup slot until its terminal event: removing a tag is not reliable abort.
function _alloCreateOptionalBrowserLoader(environment, policy) {
  'use strict';
  var pending = Object.create(null);
  // Native Window timer functions reject a plain environment object as their
  // receiver. Capture callbacks and invoke them as functions, not methods.
  var schedule = environment.setTimeout, cancel = environment.clearTimeout;
  return function (key, requestedUrls, isReady, options) {
    if (typeof key !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(key)) return Promise.resolve(false);
    var ready = function () { try { return typeof isReady === 'function' && !!isReady(); } catch (_) { return false; } };
    if (ready()) return Promise.resolve(true);
    if (Object.prototype.hasOwnProperty.call(pending, key)) return pending[key].promise;
    var urls;
    try {
      // Validate the key even when a caller supplies its own bounded candidates.
      var defaults = policy.sourcesFor(key);
      urls = requestedUrls === undefined ? defaults : requestedUrls;
      if (!Array.isArray(urls) || urls.length > 12 || typeof isReady !== 'function') return Promise.resolve(false);
      urls = urls.slice();
    } catch (_) { return Promise.resolve(false); }
    var timeout = 15000;
    try {
      var requestedTimeout = options && options.timeoutMs;
      if (Number.isFinite(requestedTimeout)) timeout = Math.max(100, Math.min(30000, requestedTimeout));
    } catch (_) {}
    var job = { promise: null }, settlePromise, index = 0, settled = false;
    job.promise = new Promise(function (resolve) { settlePromise = resolve; });
    pending[key] = job;
    var finish = function (value, release) {
      if (!settled) { settled = true; settlePromise(value); }
      if (release && pending[key] === job) delete pending[key];
    };
    var next = function () {
      if (ready()) { finish(true, true); return; }
      if (index >= urls.length) { finish(false, true); return; }
      var script, url = urls[index++];
      try { script = environment.document.createElement('script'); } catch (_) { finish(false, true); return; }
      try { policy.configureScript(script, url, key); } catch (_) { next(); return; }
      script.async = true;
      script.dataset.alloflowOptional = key;
      if (key === 'vexflow') script.dataset.alloflowVexflow = '5.0.0';
      var ended = false, expired = false;
      var timer = schedule(function () {
        if (ended) return;
        expired = true;
        // Retain the in-flight slot; a late approved response can still run.
        finish(false, false);
      }, timeout);
      var terminal = function () {
        if (ended) return;
        ended = true;
        cancel(timer);
        script.onload = null; script.onerror = null;
        if (expired) { finish(false, true); return; }
        if (ready()) { finish(true, true); return; }
        try { script.remove(); } catch (_) {}
        next();
      };
      script.onload = terminal;
      script.onerror = terminal;
      var parent = environment.document.head || environment.document.documentElement;
      try { parent.appendChild(script); } catch (_) { terminal(); }
    };
    next();
    return job.promise;
  };
}
