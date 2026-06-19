/*
 * verapdf_client.js — AlloFlow-side driver for the in-browser veraPDF validator.
 *
 * Manages the companion window/iframe that hosts verapdf_validator.html (CheerpJ +
 * veraPDF), the postMessage handshake, a cold-run watchdog (CheerpJ's first
 * validation is intermittently flaky → timeout, reopen, retry once), and a
 * size-gate (big docs take minutes — warn / longer timeout).
 *
 * Usage in AlloFlow:
 *   const vera = createVeraPdfValidator({ validatorUrl: CDN + '/verapdf_validator.html' });
 *   vera.warmUp();                         // call when remediation STARTS (hides the ~14s boot)
 *   const report = await vera.validate(pdfBytes);   // call after export
 *   // report = { compliant, failedChecks, failedRules:[{clause,testNumber,message,count}], sizeWarn }
 *   vera.teardown();
 *
 * mode: 'window' (default, escapes Canvas's sandboxed iframe like PDF Compare) or
 *       'iframe' (hidden, no popup — only if the validator is same-origin & un-sandboxed).
 */
function createVeraPdfValidator(opts) {
  opts = opts || {};
  var VALIDATOR_URL = opts.validatorUrl;
  var MODE = opts.mode || 'window';
  var SIZE_WARN_BYTES = opts.sizeWarnBytes || 600 * 1024;     // ~600KB → likely multi-minute
  var WARMUP_TIMEOUT = opts.warmupTimeoutMs || 90000;
  if (!VALIDATOR_URL) throw new Error('createVeraPdfValidator: validatorUrl is required');

  var surface = null;       // Window (mode 'window') or HTMLIFrameElement (mode 'iframe')
  var target = null;        // the thing we postMessage to (Window)
  var ready = false;
  var readyPromise = null;

  function _post(msg) { try { target.postMessage(msg, '*'); } catch (e) {} }

  function _spawn() {
    ready = false;
    if (MODE === 'iframe') {
      var ifr = document.createElement('iframe');
      ifr.src = VALIDATOR_URL;
      ifr.setAttribute('title', 'veraPDF validator');
      ifr.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;border:0;';
      document.body.appendChild(ifr);
      surface = ifr; target = ifr.contentWindow;
    } else {
      // small offscreen-ish companion window; some browsers block fully hidden popups.
      surface = window.open(VALIDATOR_URL, 'alloflow-verapdf', 'width=460,height=320');
      target = surface;
      if (!surface) throw new Error('Popup blocked — allow popups to run veraPDF validation, or use iframe mode.');
    }
    readyPromise = new Promise(function (resolve, reject) {
      function onMsg(ev) {
        if (ev && ev.data && ev.data.type === 'verapdf-ready') {
          ready = true; window.removeEventListener('message', onMsg); resolve();
        }
      }
      window.addEventListener('message', onMsg);
      setTimeout(function () {
        if (!ready) { window.removeEventListener('message', onMsg); reject(new Error('veraPDF validator did not warm up within ' + WARMUP_TIMEOUT + 'ms')); }
      }, WARMUP_TIMEOUT);
    });
    return readyPromise;
  }

  function _alive() {
    if (MODE === 'iframe') return !!(surface && surface.isConnected && target);
    return !!(surface && !surface.closed);
  }

  function warmUp() {
    if (_alive() && readyPromise) return readyPromise;
    return _spawn();
  }

  function _validateOnce(bytes, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function cleanup() { clearTimeout(timer); window.removeEventListener('message', onMsg); }
      function onMsg(ev) {
        if (ev && ev.data && ev.data.type === 'verapdf-result') {
          settled = true; cleanup();
          if (ev.data.error) reject(new Error(ev.data.error));
          else resolve(ev.data.result);
        }
      }
      var timer = setTimeout(function () { if (!settled) { cleanup(); reject(new Error('__timeout__')); } }, timeoutMs);
      window.addEventListener('message', onMsg);
      _post({ type: 'verapdf-validate', bytes: bytes });
    });
  }

  // validate with size-gate + cold-run watchdog (one reopen+retry on timeout).
  function validate(bytes, o) {
    o = o || {};
    var sizeWarn = (bytes.byteLength || bytes.length || 0) > SIZE_WARN_BYTES;
    var timeoutMs = o.timeoutMs || (sizeWarn ? 600000 : 60000);
    return warmUp().then(function () {
      return _validateOnce(bytes, timeoutMs);
    }).catch(function (err) {
      if (String(err && err.message) !== '__timeout__') throw err;
      // cold-run flake: reopen a fresh instance and retry once.
      teardown();
      return warmUp().then(function () { return _validateOnce(bytes, timeoutMs); });
    }).then(function (result) {
      return Object.assign({ sizeWarn: sizeWarn }, result || {});
    }).catch(function (err) {
      if (String(err && err.message) === '__timeout__') throw new Error('veraPDF validation timed out (document may be too large for in-browser validation)');
      throw err;
    });
  }

  function teardown() {
    try { if (MODE === 'iframe') { if (surface && surface.parentNode) surface.parentNode.removeChild(surface); } else if (surface && !surface.closed) surface.close(); } catch (e) {}
    surface = null; target = null; ready = false; readyPromise = null;
  }

  return { warmUp: warmUp, validate: validate, teardown: teardown, isReady: function () { return ready; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createVeraPdfValidator: createVeraPdfValidator };
if (typeof window !== 'undefined') window.createVeraPdfValidator = createVeraPdfValidator;
