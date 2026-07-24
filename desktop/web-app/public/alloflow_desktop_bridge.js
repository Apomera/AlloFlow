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
    if (key === 'alloflow_ai_config') clone.apiKey = '';
    var serialized = JSON.stringify(clone);
    if (serialized.length > MAX_CONFIG_BYTES) throw new Error('Desktop configuration message is too large.');
    localStorage.setItem(key, serialized);
    return true;
  }

  async function handleAction(event, id, action, payload) {
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
    if (!data || data.channel !== CHANNEL || data.version !== VERSION || data.kind !== 'request') return;
    var id = String(data.id || '');
    var action = String(data.action || '');
    if (!/^[A-Za-z0-9_-]{8,96}$/.test(id)) return;
    Promise.resolve(handleAction(event, id, action, data.payload || {})).then(
      function (result) { respond(event, id, true, result, ''); },
      function (error) { respond(event, id, false, null, error && error.message ? error.message : error); }
    );
  });

  function announceReady() {
    post('*', { kind: 'ready' });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceReady, { once: true });
  } else {
    announceReady();
  }
  setTimeout(announceReady, 750);
  setTimeout(announceReady, 2500);
})();
