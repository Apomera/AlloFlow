/**
 * One explicit, bounded on-device dictation attempt. Transcripts are input only:
 * callers must retain their separate typed preview and confirmation workflow.
 */
function createSchoolStoreVoiceCapture(options) {
  'use strict';

  const settings = options || {};
  const environment = settings.environment;
  let epoch = 0;
  let active = null;
  let destroyed = false;

  function notify(code) {
    try {
      if (typeof settings.onState === 'function') settings.onState(code);
    } catch (_) {
      // A host UI callback must not leave recognition running.
    }
  }

  function isCurrent() {
    try {
      return typeof settings.isCurrent === 'function' && settings.isCurrent() === true;
    } catch (_) {
      return false;
    }
  }

  function owns(session) {
    return !destroyed && active === session && epoch === session.epoch;
  }

  function cleanup(session, captured) {
    session.endCheck();
    if (session.timer !== null) {
      try { environment.clearTimeout(session.timer); } catch (_) { /* Best effort after invalidation. */ }
      session.timer = null;
    }
    const recognition = session.recognition;
    if (!recognition) return true;
    // Invalidate handlers before stopping: some implementations dispatch end or
    // error synchronously from stop/abort, and queued events may still arrive.
    for (const name of ['onstart', 'onresult', 'onerror', 'onend', 'onnomatch']) {
      try { recognition[name] = null; } catch (_) { /* Epoch checks also reject queued handlers. */ }
    }
    try {
      if (captured) recognition.stop();
      else recognition.abort();
      return true;
    } catch (_) {
      if (captured) {
        try { recognition.abort(); } catch (_) { /* No restart or alternate recognizer. */ }
      }
      return false;
    }
  }

  function finish(session, code, transcript) {
    if (!owns(session)) return false;
    active = null;
    const completedEpoch = ++epoch;
    const cleaned = cleanup(session, code === 'CAPTURED');
    if (destroyed || epoch !== completedEpoch) return false;
    if (code === 'CAPTURED' && !cleaned) code = 'ERROR';
    if (code === 'CAPTURED') {
      const current = isCurrent();
      if (destroyed || epoch !== completedEpoch) return false;
      if (!current) code = 'CANCELLED';
    }
    session.captured = code === 'CAPTURED';
    notify(code);
    if (code === 'CAPTURED') {
      const current = isCurrent();
      if (destroyed || epoch !== completedEpoch || !current) return false;
      try {
        if (typeof settings.onTranscript === 'function') settings.onTranscript(transcript);
      } catch (_) {
        // Recognition is already detached and stopped; never echo callback data.
      }
    }
    return session.captured;
  }

  function live(session) {
    if (!owns(session)) return false;
    const current = isCurrent();
    if (!owns(session)) return false;
    if (!current) {
      finish(session, 'CANCELLED');
      return false;
    }
    let elapsed;
    try { elapsed = session.now() - session.startedAt; } catch (_) {
      finish(session, 'ERROR');
      return false;
    }
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 15000) {
      finish(session, 'TIMEOUT');
      return false;
    }
    return owns(session);
  }

  function errorCode(error) {
    let name;
    try { name = error && (error.error || error.name); } catch (_) { return 'ERROR'; }
    if (name === 'not-allowed' || name === 'service-not-allowed' || name === 'NotAllowedError' || name === 'SecurityError') return 'DENIED';
    if (name === 'language-not-supported') return 'LANGUAGE_NOT_READY';
    if (name === 'no-speech') return 'NO_SPEECH';
    if (name === 'aborted' || name === 'AbortError') return 'CANCELLED';
    if (name === 'NotSupportedError') return 'UNAVAILABLE';
    return 'ERROR';
  }

  function cancel() {
    ++epoch;
    const previous = active;
    active = null;
    if (!previous) return;
    const cancelledEpoch = epoch;
    cleanup(previous, false);
    if (!destroyed && epoch === cancelledEpoch) notify('CANCELLED');
  }

  async function start(lang) {
    if (destroyed) return false;
    // Reserve this invocation before cleanup callbacks, which may reenter start.
    const requestEpoch = ++epoch;
    const previous = active;
    active = null;
    if (previous) {
      cleanup(previous, false);
      if (!destroyed && epoch === requestEpoch) notify('CANCELLED');
    }
    if (destroyed || epoch !== requestEpoch) return false;

    let endCheck;
    const ended = new Promise(resolve => { endCheck = () => resolve(null); });
    const session = { epoch: requestEpoch, recognition: null, timer: null, endCheck, captured: false };
    active = session;
    try {
      if (!isCurrent()) {
        finish(session, 'CANCELLED');
        return false;
      }
      if (!owns(session)) return false;
      if (lang !== 'en-US' && lang !== 'es-ES') {
        finish(session, 'UNSUPPORTED_LANGUAGE');
        return false;
      }
      if (!environment || environment.isSecureContext !== true) {
        finish(session, 'INSECURE_CONTEXT');
        return false;
      }
      const Recognition = environment.SpeechRecognition;
      if (typeof Recognition !== 'function' || typeof Recognition.available !== 'function' ||
          typeof environment.setTimeout !== 'function' || typeof environment.clearTimeout !== 'function') {
        finish(session, 'UNAVAILABLE');
        return false;
      }
      session.now = environment.performance && typeof environment.performance.now === 'function'
        ? () => environment.performance.now() : () => Date.now();
      session.startedAt = session.now();
      session.timer = environment.setTimeout(() => {
        if (owns(session)) finish(session, isCurrent() ? 'TIMEOUT' : 'CANCELLED');
      }, 15000);
      if (!live(session)) return false;

      const recognition = new Recognition();
      session.recognition = recognition;
      // Check BEFORE assignment: an old implementation may accept a writable
      // expando called processLocally while still sending speech to a server.
      if (!('processLocally' in recognition) || typeof recognition.processLocally !== 'boolean' ||
          typeof recognition.start !== 'function' || typeof recognition.stop !== 'function' ||
          typeof recognition.abort !== 'function') {
        finish(session, 'UNAVAILABLE');
        return false;
      }
      recognition.processLocally = true;
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      if (recognition.processLocally !== true || recognition.lang !== lang ||
          recognition.continuous !== false || recognition.interimResults !== false || recognition.maxAlternatives !== 1) {
        finish(session, 'UNAVAILABLE');
        return false;
      }
      if (!live(session)) return false;
      notify('CHECKING');
      if (!live(session)) return false;

      // Both cancel and the deadline release start() even if availability hangs.
      // Attach rejection handling immediately so a late rejection stays private.
      const checked = Promise.resolve(Recognition.available({ langs: [lang], processLocally: true }))
        .then(status => ({ status }), error => ({ error }));
      const result = await Promise.race([checked, ended]);
      if (!live(session) || !result) return false;
      if ('error' in result) {
        finish(session, errorCode(result.error));
        return false;
      }
      if (result.status !== 'available') {
        finish(session, ['downloadable', 'downloading', 'unavailable'].includes(result.status) ? 'LANGUAGE_NOT_READY' : 'UNAVAILABLE');
        return false;
      }

      recognition.onstart = () => {
        if (live(session)) {
          notify('LISTENING');
          live(session);
        }
      };
      recognition.onresult = event => {
        if (!live(session)) return;
        let transcript;
        try {
          const results = event && event.results;
          const result = results && results[0];
          const alternative = result && result[0];
          if (!event || event.resultIndex !== 0 || !results || results.length !== 1 ||
              !result || result.isFinal !== true || result.length !== 1 ||
              !alternative || typeof alternative.transcript !== 'string') {
            finish(session, 'INVALID_TRANSCRIPT');
            return;
          }
          transcript = alternative.transcript;
          if (!transcript.trim() || transcript.length > 512) {
            finish(session, 'INVALID_TRANSCRIPT');
            return;
          }
        } catch (_) {
          finish(session, 'INVALID_TRANSCRIPT');
          return;
        }
        if (live(session)) finish(session, 'CAPTURED', transcript);
      };
      recognition.onerror = event => { if (live(session)) finish(session, errorCode(event)); };
      recognition.onend = () => { if (live(session)) finish(session, 'NO_SPEECH'); };
      recognition.onnomatch = () => { if (live(session)) finish(session, 'NO_SPEECH'); };

      if (!live(session)) return false;
      // Recheck immediately before microphone start, after the asynchronous gate.
      if (recognition.processLocally !== true || recognition.lang !== lang ||
          recognition.continuous !== false || recognition.interimResults !== false || recognition.maxAlternatives !== 1) {
        finish(session, 'UNAVAILABLE');
        return false;
      }
      recognition.start();
      return owns(session) || session.captured;
    } catch (error) {
      finish(session, errorCode(error));
      return false;
    }
  }

  function destroy() {
    destroyed = true;
    ++epoch;
    const previous = active;
    active = null;
    if (previous) cleanup(previous, false);
  }

  return { start, cancel, destroy };
}
