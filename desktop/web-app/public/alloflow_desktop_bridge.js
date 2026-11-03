(function () {
  'use strict';

  var CHANNEL = 'alloflow-desktop-bridge';
  var VERSION = 1;
  var MAX_CONFIG_BYTES = 128 * 1024;
  var active = /^\/app(?:\/|$)/.test(window.location.pathname || '')
    && /^(?:localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(window.location.hostname || '')
    && window.parent !== window;
  if (!active) return;

  function isAllowedParentOrigin(value) {
    try {
      var parsed = new URL(String(value || ''));
      return parsed.protocol === 'http:'
        && /^(?:localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(parsed.hostname)
        && parsed.origin !== window.location.origin;
    } catch (_) {
      return false;
    }
  }

  function isNativeImageParentOrigin(value) {
    try {
      var app = new URL(window.location.origin);
      return app.protocol === 'http:' && app.hostname === 'localhost'
        && value === 'http://127.0.0.1' + (app.port ? ':' + app.port : '');
    } catch (_) { return false; }
  }

  var imageDocumentId = '';
  try {
    var randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    imageDocumentId = Array.from(randomBytes, function (value) { return value.toString(16).padStart(2, '0'); }).join('');
  } catch (_) { /* No native image capability without secure randomness. */ }
  var imageSessionId = '';
  var imageParentOrigin = '';
  var imagePending = null;
  var imageSequence = 0;
  var MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  function imageError(message, aborted) {
    var error = new Error(message);
    error.name = aborted ? 'AbortError' : 'Error';
    error.code = 'allo/local-image-connection';
    return error;
  }

  function imageRecord(value, allowed, required) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var keys = Reflect.ownKeys(value);
    return keys.every(function (key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      return typeof key === 'string' && allowed.indexOf(key) >= 0 && descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value');
    }) && required.every(function (key) { return Object.prototype.hasOwnProperty.call(value, key); });
  }

  function validImageBytes(value, result) {
    if (typeof value !== 'string' || !value || value.length > MAX_IMAGE_BYTES) return false;
    if (result) return /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    return /^(?:data:image\/(?:png|jpeg|webp);base64,)?[A-Za-z0-9+/]+={0,2}$/.test(value);
  }

  function nativeImagesAllowed() {
    try {
      if (window.__alloQrStudentMode || window.__alloStudentAiDisabled === true) return false;
      var controls = window.AlloImageGeneration;
      return !controls || (typeof controls.isEnabled === 'function' && controls.isEnabled() === true);
    } catch (_) { return false; }
  }

  function finishImage(error, result, cancel) {
    var pending = imagePending;
    if (!pending) return;
    imagePending = null;
    clearTimeout(pending.timer);
    if (pending.signal) pending.signal.removeEventListener('abort', pending.abort);
    if (cancel) post(pending.origin, { kind: 'image-cancel', sessionId: pending.sessionId, requestId: pending.requestId });
    if (error) pending.reject(error);
    else pending.resolve(result);
  }

  function configureImages(event, payload) {
    if (!isNativeImageParentOrigin(event.origin)) throw imageError('Native images require the matching AlloFlow Desktop window.');
    if (!imageRecord(payload, ['enabled', 'sessionId'], ['enabled']) || typeof payload.enabled !== 'boolean'
      || (payload.enabled && (!imageDocumentId || typeof payload.sessionId !== 'string' || !/^[a-f0-9]{32}$/.test(payload.sessionId)))) {
      throw imageError('Invalid native image configuration.');
    }
    finishImage(imageError('Local image connection changed. The previous result will be discarded.', true), null, true);
    imageSessionId = payload.enabled ? payload.sessionId : '';
    imageParentOrigin = event.origin;
    return { enabled: Boolean(imageSessionId), documentId: imageDocumentId };
  }

  function requestImage(operation, payload, options) {
    return new Promise(function (resolve, reject) {
      if (!nativeImagesAllowed()) {
        var blocked = imageError('Image generation is disabled for this app session.', true);
        finishImage(blocked, null, true);
        throw blocked;
      }
      if (!imageSessionId || !imageParentOrigin) throw imageError('Enable local images in AlloFlow Desktop first.');
      if (imagePending) throw imageError('A local image request is already waiting for a result.');
      var fields = operation === 'edit' ? ['prompt', 'width', 'image'] : ['prompt', 'width'];
      if (!imageRecord(payload, fields, operation === 'edit' ? ['prompt', 'image'] : ['prompt'])
        || typeof payload.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 4000) {
        throw imageError('Use an image prompt between 1 and 4,000 characters.');
      }
      var width = payload.width === undefined ? 512 : payload.width;
      if (!Number.isInteger(width) || width < 64 || width > 1024) throw imageError('Choose an image size between 64 and 1024 pixels.');
      if (operation === 'edit' && !validImageBytes(payload.image, false)) throw imageError('Choose a PNG, JPEG or WebP source image no larger than 8 MiB.');
      var signal = options && options.signal;
      if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw imageError('Invalid image cancellation signal.');
      if (signal && signal.aborted) throw imageError('Image request cancelled.', true);
      var body = { prompt: payload.prompt, width: width };
      if (operation === 'edit') body.image = payload.image;
      var pending = { resolve: resolve, reject: reject, origin: imageParentOrigin, sessionId: imageSessionId,
        requestId: imageDocumentId + '_' + (++imageSequence).toString(16), signal: signal };
      pending.abort = function () { finishImage(imageError('Image request cancelled. Its result will be discarded.', true), null, true); };
      imagePending = pending;
      pending.timer = setTimeout(function () {
        finishImage(imageError('The image request timed out. The server may still be finishing it.'), null, true);
      }, 120000);
      if (signal) signal.addEventListener('abort', pending.abort, { once: true });
      post(pending.origin, { kind: 'image-request', sessionId: pending.sessionId, requestId: pending.requestId,
        operation: operation, payload: body });
    });
  }

  function receiveImage(event, data) {
    var pending = imagePending;
    if (!pending || event.origin !== pending.origin || data.sessionId !== pending.sessionId || data.requestId !== pending.requestId) return;
    if (!nativeImagesAllowed()) {
      finishImage(imageError('Image generation is disabled for this app session. Its result will be discarded.', true), null, true); return;
    }
    if (!imageRecord(data, ['channel', 'version', 'kind', 'sessionId', 'requestId', 'ok', 'result', 'error'],
      ['channel', 'version', 'kind', 'sessionId', 'requestId', 'ok']) || typeof data.ok !== 'boolean') {
      finishImage(imageError('The desktop image response was invalid.'), null, false); return;
    }
    if (!data.ok) {
      finishImage(imageError(typeof data.error === 'string' ? data.error.slice(0, 500) : 'The desktop image request failed.'), null, false); return;
    }
    if (!imageRecord(data.result, ['image'], ['image']) || !validImageBytes(data.result.image, true)) {
      finishImage(imageError('The desktop image response was invalid.'), null, false); return;
    }
    finishImage(null, { image: data.result.image }, false);
  }

  window.AlloDesktopImages = Object.freeze({
    isEnabled: function () { return Boolean(imageSessionId) && nativeImagesAllowed(); },
    generate: function (payload, options) { return requestImage('generate', payload, options); },
    edit: function (payload, options) { return requestImage('edit', payload, options); },
  });
  window.addEventListener('pagehide', function () {
    finishImage(imageError('The app page closed. Its image result will be discarded.', true), null, true);
    imageSessionId = '';
    imageParentOrigin = '';
  });

  function normalizeProgress(progress) {
    var value = progress && typeof progress === 'object' ? progress : {};
    var pct = Number(value.pct);
    return {
      pct: Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0,
      stage: String(value.stage || '').slice(0, 160),
    };
  }

  function post(targetOrigin, message) {
    try {
      window.parent.postMessage(Object.assign({
        channel: CHANNEL,
        version: VERSION,
      }, message || {}), targetOrigin);
    } catch (_) {}
  }

  function respond(event, id, ok, result, error) {
    post(event.origin, {
      kind: 'response',
      id: id,
      ok: Boolean(ok),
      result: ok ? result : undefined,
      error: ok ? undefined : String(error || 'Desktop app bridge request failed.').slice(0, 500),
    });
  }

  function reportProgress(event, id, progress) {
    post(event.origin, {
      kind: 'progress',
      id: id,
      progress: normalizeProgress(progress),
    });
  }

  async function cacheCount(cacheName, includesText) {
    try {
      if (!window.caches) return 0;
      var cache = await window.caches.open(cacheName);
      var keys = await cache.keys();
      return keys.filter(function (request) {
        return !includesText || String(request.url || '').indexOf(includesText) >= 0;
      }).length;
    } catch (_) {
      return 0;
    }
  }

  async function webGpuReady() {
    try {
      return Boolean(navigator.gpu && await navigator.gpu.requestAdapter());
    } catch (_) {
      return false;
    }
  }

  async function statusSnapshot() {
    var kokoro = window._kokoroTTS || null;
    var sdTurbo = window._sdTurbo || null;
    var voicePreference = '';
    try { voicePreference = localStorage.getItem('allo_voice_preference') || ''; } catch (_) {}
    return {
      href: window.location.href,
      origin: window.location.origin,
      kokoro: {
        available: Boolean(kokoro || typeof window.__loadKokoroTTS === 'function'),
        ready: Boolean(kokoro && kokoro.ready),
        downloading: Boolean(window.__kokoroTTSDownloading),
        quality: kokoro && kokoro.quality ? String(kokoro.quality).slice(0, 40) : '',
        voices: kokoro && Array.isArray(kokoro.voices) ? kokoro.voices.length : 0,
        cacheEntries: await cacheCount('transformers-cache', 'Kokoro-82M'),
        lastRoute: window.__ttsLastRoute || null,
        voicePreference: voicePreference,
      },
      sdTurbo: {
        available: Boolean(sdTurbo || typeof window.__loadSdTurbo === 'function'),
        ready: Boolean(sdTurbo && sdTurbo.ready),
        downloading: Boolean(window.__sdTurboDownloading),
        cacheEntries: await cacheCount('allo-sd-turbo', ''),
        webGpuReady: await webGpuReady(),
      },
    };
  }

  function saveConfig(key, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var clone = JSON.parse(JSON.stringify(value));
    if (key === 'alloflow_ai_config') {
      // The shell's config push never carries a credential (its payload sends
      // apiKey '') — blanking unconditionally erased any key the user pasted
      // into the in-app AI settings on EVERY sync, silently locking out cloud
      // providers (empty generations, keyless 403 vision calls, "my key won't
      // save"). Preserve the stored key when the incoming one is empty; a
      // non-empty incoming key (future secure-storage delivery) still wins.
      var incomingKey = typeof clone.apiKey === 'string' ? clone.apiKey.trim() : '';
      if (!incomingKey) {
        var existingKey = '';
        try { existingKey = String((JSON.parse(localStorage.getItem(key) || 'null') || {}).apiKey || ''); } catch (_) {}
        clone.apiKey = existingKey;
      }
    }
    var serialized = JSON.stringify(clone);
    if (serialized.length > MAX_CONFIG_BYTES) throw new Error('Desktop configuration message is too large.');
    localStorage.setItem(key, serialized);
    return true;
  }

  async function handleAction(event, id, action, payload) {
    if (action === 'images.configure') return configureImages(event, payload);
    if (action === 'config.apply') {
      var applied = [];
      if (saveConfig('alloflow_ai_config', payload && payload.aiConfig)) applied.push('ai');
      if (saveConfig('alloflow_live_session_config', payload && payload.liveSessionConfig)) applied.push('live-session');
      try {
        window.dispatchEvent(new CustomEvent('alloflow:desktop-config-changed', { detail: { applied: applied } }));
      } catch (_) {}
      return { applied: applied };
    }

    if (action === 'status.get') return statusSnapshot();

    if (action === 'kokoro.download') {
      if (typeof window.__loadKokoroTTS !== 'function') throw new Error('Kokoro voice loader is not ready.');
      window.__kokoroTTSDownloading = true;
      try {
        var voiceOk = await window.__loadKokoroTTS(function (progress) {
          reportProgress(event, id, progress);
        });
        return { ready: Boolean(voiceOk), status: await statusSnapshot() };
      } finally {
        window.__kokoroTTSDownloading = false;
      }
    }

    if (action === 'sd.download') {
      if (typeof window.__loadSdTurbo !== 'function') throw new Error('Local image loader is not ready.');
      window.__sdTurboDownloading = true;
      try {
        var imageOk = await window.__loadSdTurbo(function (progress) {
          reportProgress(event, id, progress);
        });
        return { ready: Boolean(imageOk), status: await statusSnapshot() };
      } finally {
        window.__sdTurboDownloading = false;
      }
    }

    if (action === 'kokoro.test') {
      if (!(window._kokoroTTS && window._kokoroTTS.ready)) throw new Error('Kokoro voice is not ready.');
      var requestedVoice = String(payload && payload.voice || '');
      var voice = /^[a-z0-9_-]{1,40}$/i.test(requestedVoice) ? requestedVoice : 'af_heart';
      var audioUrl = await window._kokoroTTS.speakStreaming(
        'Hello! This is the local Kokoro voice speaking on this computer.',
        voice,
        1
      );
      if (!audioUrl) throw new Error('Kokoro returned no audio.');
      var audio = new Audio(audioUrl);
      await audio.play();
      return { playing: true, voice: voice, lastRoute: window.__ttsLastRoute || null };
    }

    throw new Error('Unsupported desktop app bridge action.');
  }

  window.addEventListener('message', function (event) {
    var data = event && event.data;
    if (event.source !== window.parent || !isAllowedParentOrigin(event.origin)) return;
    if (!data || data.channel !== CHANNEL || data.version !== VERSION) return;
    if (data.kind === 'image-response') {
      if (isNativeImageParentOrigin(event.origin)) receiveImage(event, data);
      return;
    }
    if (data.kind !== 'request') return;
    var id = String(data.id || '');
    var action = String(data.action || '');
    if (!/^[A-Za-z0-9_-]{8,96}$/.test(id)) return;
    Promise.resolve(handleAction(event, id, action, data.payload || {})).then(
      function (result) { respond(event, id, true, result, ''); },
      function (error) { respond(event, id, false, null, error && error.message ? error.message : error); }
    );
  });

  function announceReady() {
    post('*', { kind: 'ready', nativeImages: imageDocumentId ? 1 : 0, documentId: imageDocumentId });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceReady, { once: true });
  } else {
    announceReady();
  }
  setTimeout(announceReady, 750);
  setTimeout(announceReady, 2500);
})();
