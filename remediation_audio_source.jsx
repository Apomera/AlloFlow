// remediation_audio_source.jsx — Web Audio feedback sounds CDN module
// Extracted from AlloFlowANTI.txt 2026-04-21 (v3 audit — Module G).
//
// Contents:
//   remediationAudio — IIFE returning { chunkGood, chunkMedium, chunkBad,
//     refixStart, refixSuccess, sessionComplete, error } — short Web Audio
//     beeps for live chunk review UI. Respects prefers-reduced-motion + mute.
//
// Dependencies aliased from window: getGlobalAudioContext, isGlobalMuted.
// The monolith-side shim is a Proxy that forwards to window.remediationAudio
// (set below), so all existing remediationAudio.X() call sites continue to work.

var _fallbackAudioCtx = null;
var _isMuted = function () {
    try {
        if (typeof window === 'undefined') return false;
        if (window.__alloMuted === true || window.__alloGlobalMuted === true || window._alloGlobalMute === true) return true;
        if (typeof window.__alloIsGlobalMuted === 'function') return Boolean(window.__alloIsGlobalMuted());
        if (typeof window.isGlobalMuted === 'function') return Boolean(window.isGlobalMuted());
        try {
            if (typeof window.localStorage !== 'undefined' && window.localStorage.getItem('alloflow-global-muted') === 'true') return true;
        } catch (_) {}
        return false;
    } catch (_) {
        return true;
    }
};
var _getAudioCtx = function () {
    if (typeof window !== 'undefined' && typeof window.getGlobalAudioContext === 'function') {
        return window.getGlobalAudioContext();
    }
    if (_fallbackAudioCtx && _fallbackAudioCtx.state !== 'closed') {
        return _fallbackAudioCtx;
    }
    var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    _fallbackAudioCtx = Ctx ? new Ctx() : null;
    return _fallbackAudioCtx;
};

const remediationAudio = (() => {
  let lastChunkSoundAt = 0;
  const DEBOUNCE_MS = 150;
  const MAX_PENDING_TIMERS = 24;
  const ALLOWED_TYPES = ['sine', 'triangle', 'square', 'sawtooth'];
  const pendingTimers = new Set();
  const activeNodes = new Set();
  const stopActiveNodes = () => {
    activeNodes.forEach((entry) => {
      try { if (entry.osc && typeof entry.osc.stop === 'function') entry.osc.stop(); } catch (_) {}
      try { if (entry.osc && typeof entry.osc.disconnect === 'function') entry.osc.disconnect(); } catch (_) {}
      try { if (entry.g && typeof entry.g.disconnect === 'function') entry.g.disconnect(); } catch (_) {}
    });
    activeNodes.clear();
  };
  const clearPendingTimers = () => {
    pendingTimers.forEach((id) => { try { clearTimeout(id); } catch (_) {} });
    pendingTimers.clear();
  };
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('alloflow-mute-changed', (ev) => {
        if ((ev && ev.detail && ev.detail.muted === true) || _isMuted()) {
          clearPendingTimers();
          stopActiveNodes();
        }
      });
    } catch (_) {}
  }
  const prefersReducedMotion = () => {
    try {
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  };
  const canPlay = () => !_isMuted() && !prefersReducedMotion();

  const scheduleTone = (fn, delayMs) => {
    if (!canPlay() || pendingTimers.size >= MAX_PENDING_TIMERS) return;
    const ms = Number.isFinite(delayMs) && delayMs >= 0 ? Math.min(2000, delayMs) : 0;
    const id = setTimeout(() => {
      pendingTimers.delete(id);
      if (canPlay()) fn();
    }, ms);
    pendingTimers.add(id);
  };

  // Generic tone generator: frequency (Hz), duration (s), type, gain, attack, release
  const playTone = (freq, duration = 0.12, type = 'sine', gain = 0.12, attack = 0.005, release = 0.08) => {
    if (!canPlay()) return;
    const safeFreq = Number.isFinite(freq) ? Math.max(20, Math.min(20000, freq)) : 440;
    const safeDur = Number.isFinite(duration) ? Math.max(0.01, Math.min(5, duration)) : 0.12;
    const safeGain = Number.isFinite(gain) ? Math.max(0.0002, Math.min(0.5, gain)) : 0.12;
    const safeAttack = Number.isFinite(attack) ? Math.max(0.001, Math.min(1, attack)) : 0.005;
    const safeRelease = Number.isFinite(release) ? Math.max(0.005, Math.min(2, release)) : 0.08;
    const safeType = ALLOWED_TYPES.indexOf(type) !== -1 ? type : 'sine';
    let osc = null;
    let g = null;
    let nodeEntry = null;
    try {
      const ctx = _getAudioCtx();
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        try { Promise.resolve(ctx.resume()).catch(() => {}); } catch (e) {}
        return;
      }
      if (ctx.state && ctx.state !== 'running') return;
      osc = ctx.createOscillator();
      g = ctx.createGain();
      nodeEntry = { osc, g };
      activeNodes.add(nodeEntry);
      osc.type = safeType;
      osc.frequency.value = safeFreq;
      const now = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
      const endAt = Math.max(now + safeAttack + 0.005, now + safeDur + safeRelease);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(safeGain, now + safeAttack);
      g.gain.exponentialRampToValueAtTime(0.0001, endAt);
      osc.connect(g); g.connect(ctx.destination);
      osc.onended = () => { activeNodes.delete(nodeEntry); try { osc.disconnect(); } catch (_) {} try { g.disconnect(); } catch (_) {} };
      osc.start(now);
      osc.stop(endAt + 0.02);
    } catch(e) {
      if (nodeEntry) activeNodes.delete(nodeEntry);
      try { if (osc) osc.disconnect(); } catch (_) {}
      try { if (g) g.disconnect(); } catch (_) {}
    }
  };

  // Play a chord: array of frequencies, layered
  const playChord = (freqs, duration = 0.5, type = 'triangle', gain = 0.08) => {
    if (!canPlay() || !Array.isArray(freqs)) return;
    freqs.slice(0, 8).forEach((f, i) => scheduleTone(() => playTone(f, duration, type, gain, 0.01, 0.25), i * 50));
  };

  return Object.freeze({
    // Chunk completed — good score (≥80): soft high tick, debounced
    chunkGood: () => {
      if (!canPlay()) return;
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(1760, 0.06, 'sine', 0.08, 0.002, 0.04); // A6
    },
    // Chunk completed — borderline score (60-79): medium tick
    chunkMedium: () => {
      if (!canPlay()) return;
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(880, 0.08, 'sine', 0.09, 0.003, 0.05); // A5
    },
    // Chunk completed — bad score (<60) or fell back to original: low thud
    chunkBad: () => {
      if (!canPlay()) return;
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(220, 0.18, 'triangle', 0.12, 0.005, 0.12); // A3
    },
    // Re-fix starts — quick ascending whoosh
    refixStart: () => {
      if (!canPlay()) return;
      playTone(440, 0.08, 'sine', 0.07, 0.005, 0.05);
      scheduleTone(() => playTone(660, 0.08, 'sine', 0.07, 0.005, 0.05), 60);
    },
    // Re-fix succeeded — short rising tone
    refixSuccess: () => {
      if (!canPlay()) return;
      playTone(523, 0.1, 'sine', 0.09, 0.005, 0.08);  // C5
      scheduleTone(() => playTone(784, 0.12, 'sine', 0.09, 0.005, 0.1), 90); // G5
    },
    // Session complete — triumphant chord (C major → G major)
    sessionComplete: () => {
      if (!canPlay()) return;
      playChord([523.25, 659.25, 783.99], 0.5, 'triangle', 0.08); // C E G
      scheduleTone(() => playChord([587.33, 739.99, 880], 0.6, 'triangle', 0.08), 300); // D F# A
    },
    // Error / pipeline failure — descending minor tone
    error: () => {
      if (!canPlay()) return;
      playTone(440, 0.15, 'sawtooth', 0.1, 0.005, 0.1);
      scheduleTone(() => playTone(311, 0.25, 'sawtooth', 0.1, 0.005, 0.2), 130);
    },
  });
})();


// ─── Registration ───────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.RemediationAudio = remediationAudio;
  window.remediationAudio = remediationAudio;
}
console.log('[RemediationAudioModule] remediationAudio registered.');
