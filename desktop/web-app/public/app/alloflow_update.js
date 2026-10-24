/* Shared update lifecycle for the hosted and /app/ shells. */
(function (window) {
  'use strict';
  if (window.__alloAppUpdates) return;

  var scriptUrl = document.currentScript && document.currentScript.src;
  var scope = new URL('./', scriptUrl || new URL('./alloflow_update.js', window.location.href)).href;
  var storageKey = 'alloflow:dismissed-updates:' + scope;
  var dismissed = new Set();
  try {
    var saved = JSON.parse(window.sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) saved.filter(function (id) { return typeof id === 'string'; }).forEach(function (id) { dismissed.add(id); });
  } catch (_) { /* Storage may be unavailable in an embedded browser. */ }

  var listeners = new Set();
  var watchedRegistrations = new WeakSet();
  var watchedWorkers = new WeakSet();
  var releases = new WeakMap();
  var queries = new WeakMap();
  var registration = null;
  var candidate = null;
  var started = false;
  var checking = null;
  var checkAgain = false;
  var applying = null;
  var reloading = false;
  var state = { ready: false, applying: false, releaseId: null, error: null };

  function snapshot() { return Object.assign({}, state); }

  function publish(next) {
    var changed = Object.keys(next).some(function (key) { return state[key] !== next[key]; });
    state = Object.assign({}, state, next);
    window.__alloUpdateReady = state.ready;
    if (changed) listeners.forEach(function (listener) {
      try { listener(snapshot()); } catch (_) { /* One view cannot break other subscribers. */ }
    });
  }

  function validRelease(value) {
    return value && typeof value.releaseId === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(value.releaseId)
      && Number.isFinite(value.releaseBuiltAt) && value.releaseBuiltAt > 0;
  }

  function pageRelease() {
    var value = { releaseId: window.__alloReleaseId, releaseBuiltAt: window.__alloReleaseBuiltAt };
    return validRelease(value) ? value : null;
  }

  function isUpdate(release) {
    var page = pageRelease();
    // A newer document can be served by an older worker's background-refreshed
    // shell. Different IDs alone do not establish an available update.
    return !!(page && validRelease(release) && release.releaseId !== page.releaseId
      && release.releaseBuiltAt >= page.releaseBuiltAt);
  }

  function readRelease(worker) {
    if (!worker || worker.state === 'redundant') return Promise.resolve(null);
    if (releases.has(worker)) return Promise.resolve(releases.get(worker));
    if (queries.has(worker)) return queries.get(worker);
    var query = new Promise(function (resolve) {
      var channel;
      var timer;
      var finished = false;
      function finish(value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (channel) { channel.port1.close(); channel.port2.close(); }
        if (value) releases.set(worker, value);
        resolve(value);
      }
      try {
        channel = new MessageChannel();
        channel.port1.onmessage = function (event) {
          var reply = event.data;
          finish(reply && reply.type === 'ALLOFLOW_RELEASE' && validRelease(reply) ? reply : null);
        };
        timer = setTimeout(function () { finish(null); }, 1500);
        worker.postMessage({ type: 'ALLOFLOW_GET_RELEASE' }, [channel.port2]);
      } catch (_) { finish(null); }
    });
    queries.set(worker, query);
    query.then(function () { queries.delete(worker); });
    return query;
  }

  function watchWorker(worker) {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    worker.addEventListener('statechange', function () { check(); });
  }

  function acceptRegistration(reg) {
    // An old root worker must not impersonate the /app/ shell's registration.
    if (!reg || reg.scope !== scope) return null;
    registration = reg;
    if (!watchedRegistrations.has(reg)) {
      watchedRegistrations.add(reg);
      reg.addEventListener('updatefound', function () {
        watchWorker(reg.installing);
        check();
      });
    }
    watchWorker(reg.installing);
    watchWorker(reg.waiting);
    watchWorker(reg.active);
    return reg;
  }

  async function inspect() {
    var next = null;
    if (pageRelease() && 'serviceWorker' in navigator) {
      var reg = acceptRegistration(registration || await navigator.serviceWorker.getRegistration(scope));
      if (reg) {
        var waiting = reg.waiting;
        if (waiting && waiting.state === 'installed') {
          var waitingRelease = await readRelease(waiting);
          if (reg.waiting === waiting && waiting.state === 'installed' && isUpdate(waitingRelease)) {
            next = { worker: waiting, registration: reg, release: waitingRelease, phase: 'waiting' };
          }
        }
        if (!next) {
          var active = reg.active;
          if (active && active.state === 'activated') {
            var activeRelease = await readRelease(active);
            if (reg.active === active && active.state === 'activated' && isUpdate(activeRelease)) {
              next = { worker: active, registration: reg, release: activeRelease, phase: 'active' };
            }
          }
        }
      }
    }
    candidate = next;
    var id = next ? next.release.releaseId : null;
    publish({ ready: !!id && !dismissed.has(id), releaseId: id });
    return snapshot();
  }

  function check() {
    if (checking) { checkAgain = true; return checking; }
    checking = (async function () {
      do {
        checkAgain = false;
        try { await inspect(); } catch (_) {
          // A denied SW API, an offline check, or an old worker with no
          // release protocol is not evidence of an available update.
          candidate = null;
          publish({ ready: false, releaseId: null });
        }
      } while (checkAgain);
      return snapshot();
    })().finally(function () { checking = null; });
    return checking;
  }

  function watchRegistration(reg) {
    acceptRegistration(reg);
    return check();
  }

  function refreshRegistration() {
    check();
    if (registration) {
      try { registration.update().catch(function () {}); } catch (_) {}
    }
  }

  function start() {
    if (started) return check();
    started = true;
    if (!('serviceWorker' in navigator)) return Promise.resolve(snapshot());
    navigator.serviceWorker.addEventListener('controllerchange', function () { check(); });
    window.addEventListener('online', refreshRegistration);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') refreshRegistration();
    });
    acceptRegistration(window.__alloSWRegistration);
    return check().then(function () {
      if (registration) {
        try { registration.update().catch(function () {}); } catch (_) {}
      }
      return snapshot();
    });
  }

  function dismiss() {
    if (state.applying || !candidate) return;
    dismissed.add(candidate.release.releaseId);
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(dismissed).slice(-20))); } catch (_) {}
    publish({ ready: false, error: null });
  }

  function waitForActivation(target) {
    return new Promise(function (resolve, reject) {
      var reg = target.registration;
      var worker = target.worker;
      var done = false;
      var busy = false;
      var rerun = false;
      var timer = setTimeout(function () { finish(new Error('activation-timeout')); }, 10000);
      function finish(error) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('controllerchange', verify);
        worker.removeEventListener('statechange', verify);
        if (error) reject(error); else resolve();
      }
      async function verify() {
        if (done) return;
        if (busy) { rerun = true; return; }
        busy = true;
        do {
          rerun = false;
          if (worker.state === 'redundant') { finish(new Error('update-replaced')); break; }
          var active = reg.active;
          if (active && active.state === 'activated' && navigator.serviceWorker.controller === active) {
            var release = await readRelease(active);
            if (release && release.releaseId === target.release.releaseId && isUpdate(release)) finish();
          }
        } while (rerun && !done);
        busy = false;
      }
      navigator.serviceWorker.addEventListener('controllerchange', verify);
      worker.addEventListener('statechange', verify);
      // Install listeners before sending: a different tab can activate it
      // between the user's click and this request.
      if (target.phase === 'waiting' && reg.waiting === worker && worker.state === 'installed') {
        try { worker.postMessage({ type: 'ALLOFLOW_ACTIVATE_UPDATE' }); }
        catch (error) { finish(error); }
      }
      verify();
    });
  }

  function apply() {
    if (applying) return applying;
    if (reloading) return Promise.resolve(true);
    applying = (async function () {
      await check();
      if (!candidate || !state.ready) return false;
      var target = candidate;
      publish({ applying: true, error: null });
      try {
        await waitForActivation(target);
        reloading = true;
        window.location.reload();
        return true;
      } catch (_) {
        reloading = false;
        publish({ applying: false, error: 'AlloFlow could not finish the update. Your current page is still open. Please try again.' });
        await check();
        return false;
      }
    })().finally(function () { applying = null; });
    return applying;
  }

  window.__alloAppUpdates = {
    start: start,
    watchRegistration: watchRegistration,
    check: check,
    getState: snapshot,
    dismiss: dismiss,
    apply: apply,
    subscribe: function (listener) {
      listeners.add(listener);
      listener(snapshot());
      return function () { listeners.delete(listener); };
    }
  };
  start();
})(window);
